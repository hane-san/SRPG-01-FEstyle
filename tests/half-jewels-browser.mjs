import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {launch,base} from './browser-helpers.mjs';
const browser=await launch(),report=[];mkdirSync('test-results',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'no-preference'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?debug=1');await page.waitForFunction(()=>!!window.srpgDebug);
 const baseline=await page.evaluate(()=>localStorage.getItem('field-command-save-v1'));
 for(const [width,height]of [[320,740],[390,844],[844,390]])for(const theme of [null,'industrial','fantasy']){
  await page.setViewportSize({width,height});
  const result=await page.evaluate(async({theme,width})=>{
   const [{createLabScenario},{render},{createPlayback},{combatHpLayout},{releasePolygon}]=await Promise.all([import('./tactical-lab.js'),import('./render.js'),import('./playback.js'),import('./hp-jewels.js'),import('./polygon-renderer.js')]);
   const canvas=document.createElement('canvas');canvas.style.cssText='position:fixed;left:0;top:0;z-index:999;background:#201d29';document.body.append(canvas);
   const samples=[];
   try{
    for(const kind of ['normal','overkill','heal']){
     const fixture=createLabScenario(kind);let shown=fixture.initial;const view={tile:32,sampleTheme:theme,polygonReduced:false,polygonVisible:{x:0,y:0,w:Math.min(8,width/32),h:7}};
     const trace=[],shots={},seen=new Set();
     const draw=()=>{
      const before=JSON.stringify(shown);render(canvas,shown,view);if(JSON.stringify(shown)!==before)throw Error('renderer mutated HP/state');
      const stage=view.animation?.stage;
      if(stage&&!seen.has(stage)){
       seen.add(stage);trace.push({stage,hp:shown.units.map(u=>u.hp),jewel:view.jewel?{...view.jewel}:null,ghost:!!view.ghost});
       if(['damage','shatter','defeat-hold','collapse'].includes(stage))shots[stage]=canvas.toDataURL();
      }
      if(view.combatHp){
       const cards=combatHpLayout(shown,view,view.combatHp.units),[a,b]=cards;
       if(a&&b&&a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y)throw Error('overlapping combat HP');
       for(const r of cards)if(r.x<0||r.y<0||r.x+r.w>Math.min(256,width)+.01||r.y+r.h>224)throw Error('clipped combat HP');
      }
     };
     // Hide only the participants' small bars; an unrelated unit keeps its HP.
     if(kind==='normal'){
      const third={...shown.units[0],id:'other',name:'第三部隊',x:6,y:5};shown={...shown,units:[...shown.units,third]};
      view.combatHp={units:shown.units.slice(0,2),target:shown.units[1].id,pendingEnd:null};draw();
      const c=canvas.getContext('2d'),pixel=u=>Array.from(c.getImageData((u.x*32+2)*devicePixelRatio,(u.y*32+30)*devicePixelRatio,1,1).data).slice(0,3).join(',');
      if(pixel(third)!=='21,32,42')throw Error('unrelated small HP disappeared');
      for(const u of shown.units.slice(0,2))if(pixel(u)==='21,32,42')throw Error('participant small HP duplicated');
      view.combatHp=null;shown=fixture.initial;
     }
     const sound=[],player=createPlayback({hitProfile:()=>'halves',getState:()=>shown,setState:s=>shown=s,view,draw,isFast:()=>false,isReduced:()=>false,sound:{play:(cue,n)=>sound.push({cue,n,t:performance.now()})}});
     const start=performance.now();await player.play(fixture.frames);draw();
     if(JSON.stringify(shown.units)!==JSON.stringify(fixture.frames.at(-1).state.units))throw Error('engine result mismatch');
     if(Object.entries(view).some(([key,value])=>!['tile','sampleTheme','polygonReduced','polygonVisible'].includes(key)&&value!==null))throw Error('transient survived');
     const stages=trace.map(e=>e.stage);
     if(kind!=='heal'&&(!stages.includes('damage')||stages.indexOf('damage')>=stages.indexOf('shatter')))throw Error('pending must precede fracture');
     if(kind==='overkill'){
      if(stages.indexOf('defeat-hold')<=stages.indexOf('shatter')||stages.indexOf('collapse')<=stages.indexOf('defeat-hold'))throw Error('defeat order');
      if(trace.find(e=>e.stage==='defeat-hold').hp[1]!==0)throw Error('hold without HP0');
      const charge=sound.find(e=>e.cue==='gem-charge'),burst=sound.find(e=>e.cue==='gem-finish');if(burst.t-charge.t<140)throw Error('missing defeat hold');
     }
     samples.push({kind,stages,elapsed:Math.round(performance.now()-start),shots:width===390?shots:{}});
    }
    return samples;
   }finally{releasePolygon(canvas);canvas.remove();}
  },{theme,width});
  for(const sample of result){
   for(const [stage,data]of Object.entries(sample.shots))writeFileSync(`test-results/half113-${theme||'2d'}-${sample.kind}-${stage}.png`,Buffer.from(data.split(',')[1],'base64'));
   delete sample.shots;
  }
  report.push({width,height,theme,result});
 }
 assert.equal(await page.evaluate(()=>localStorage.getItem('field-command-save-v1')),baseline,'isolated render/replay does not write main save');
 assert.deepEqual(errors,[]);console.log(JSON.stringify(report));
}finally{await browser.close();}
