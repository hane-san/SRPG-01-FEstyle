// Real application full-width map: canvas labels must stay legible at 20px tiles,
// and a counter must not swap the paired HP plates. Isolated tile32 render tests miss both.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import * as E from '../engine.js';
import {unit} from '../data.js';
import {launch,setup} from './browser-helpers.mjs';
let browser;const results=[];
try{
 for(const [width,height] of [[360,740],[390,844],[430,932],[390,568]]){
  browser=await launch();const t=await setup(browser,width,height,{reducedMotion:'no-preference'}),{page}=t;
  await page.evaluate(()=>{localStorage.setItem('field-command-fast','false');localStorage.setItem('field-command-sound','false');});
  for(const kind of ['six-five','three-two','two-zero','counter','no-counter','counter-death','edge','wide-map','warning','enemy-phase']){
   console.log('HP case',width,height,kind);
   const state=E.createGame(kind==='edge'?3:kind==='wide-map'?1:0),edge=kind==='edge';
   const a=unit({id:'hp-ally',name:'指揮官',type:kind==='no-counter'?'bow':'sword',x:edge?0:5,y:edge?3:13},'ally');
   const b=unit({id:'hp-enemy',name:'敵前衛',type:['six-five','three-two'].includes(kind)?'shield':'sword',x:a.x,y:a.y-(kind==='no-counter'?2:1),ai:'hold'},'enemy');
   if(kind==='three-two')b.hp=3;if(kind==='two-zero')b.hp=2;if(kind==='counter-death')a.hp=2;
   if(kind==='warning'){a.x=10;a.y=3;b.x=10;b.y=2;state.warnings=[{kind:'cannon',turn:3,cells:[{x:10,y:2}]}];}
   state.units=[a,b];const expected=structuredClone(state);if(kind==='enemy-phase')E.endTurn(expected);else assert(E.act(expected,a.id,a,'attack',b.id).ok);
   await t.reset(state);assert.equal((await page.evaluate(()=>srpgDebug.audio())).enabled,false,'HP remains readable muted');await t.select(a.id);
   const camera=await t.camera(),sampler=page.evaluate(()=>new Promise(resolve=>{
    const traces=[],shots={};let seen=false;
    const tick=()=>{
     const debug=window.srpgDebug,v=debug.draft();seen||=debug.busy();
     if(v.combatHp){
      const data={stage:v.animation?.stage,counter:!!v.animation?.counter,target:v.combatHp.target,units:v.combatHp.units.map(u=>({id:u.id,hp:u.hp})),tile:v.tile,visible:v.combatVisible||v.polygonVisible,navHidden:getComputedStyle(document.querySelector('#minimap')).visibility==='hidden'};
      if(!traces.some(p=>p.stage===data.stage&&p.counter===data.counter))traces.push(data);
      const key=data.counter?'counter-'+data.stage:data.stage;
      if(['damage','shatter','defeat-hold'].includes(data.stage)&&!shots[key])shots[key]=document.querySelector('#battlefield').toDataURL();
     }
     if(seen&&!debug.busy()){resolve({traces,shots});return;}requestAnimationFrame(tick);
    };tick();
   }));
   sampler.catch(()=>{});
   if(kind==='enemy-phase'){await page.locator('#endTurn').click();if(await page.locator('#endConfirm button').count())await page.locator('#endConfirm button').first().click();}else await page.locator('#attackOrder').click();await t.settled();const sampled=await sampler;
   assert.deepEqual((await t.state()).units,expected.units,`${width}/${kind}: actual HP/defeat remain the engine result`);
   assert.deepEqual(await t.camera(),camera,`${width}/${kind}: playback does not move the map`);
   assert(sampled.traces.length,`${width}/${kind}: actualapp enlarged HP appears`);
   const layout=await page.evaluate(async({traces})=>{const {combatHpLayout}=await import('./hp-jewels.js');const s=window.srpgDebug.snapshot();return traces.map(t=>{
    const units=t.units.map(u=>({...s.units.find(p=>p.id===u.id),hp:u.hp})),cards=combatHpLayout(s,{tile:t.tile,polygonVisible:t.visible},units);
    return {...t,cards,css:cards.map(c=>({id:c.id,name:12*c.scale*t.tile/32,hp:14*c.scale*t.tile/32,w:c.w*t.tile/32,h:c.h*t.tile/32}))};
   });},{traces:sampled.traces});
   for(const frame of layout){
    assert(frame.navHidden,'minimap cannot hide enlarged HP during playback');
    const [p,q]=frame.cards;assert(p.x+p.w<=q.x||q.x+q.w<=p.x||p.y+p.h<=q.y||q.y+q.h<=p.y,`${width}/${kind}: no overlapping HP cards`);
    for(const c of frame.css){assert(c.name>=11.99&&c.hp>=13.99,`${width}/${kind}: readable labels at tile${frame.tile}`);}
    const v=frame.visible;
    for(const c of frame.cards){assert(c.x>=v.x*32&&c.y>=v.y*32&&c.x+c.w<=(v.x+v.w)*32+.01&&c.y+c.h<=(v.y+v.h)*32+.01,'cards stay in visible map');}
   }
   const first=layout.find(f=>f.stage==='windup'&&!f.counter),counter=layout.find(f=>f.stage==='windup'&&f.counter);
   if(counter)for(const c of first.cards)assert.deepEqual(counter.cards.find(p=>p.id===c.id),c,`${width}/${kind}: counter preserves identity/position`);
   const firstDamage=layout.find(f=>f.stage==='damage'&&!f.counter);
   const damaged=kind==='enemy-phase'?a:b;assert.equal(firstDamage.units.find(u=>u.id===damaged.id).hp,damaged.hp,'contact begins from initial HP before the half-shard count');
   assert.equal((await t.draft()).combatHp,null,'final board resumes normal HP');assert.equal(await page.locator('#minimap').evaluate(e=>getComputedStyle(e).visibility),'visible','navigation restored');
   const save=await page.evaluate(()=>localStorage.getItem('field-command-save-v1'));await page.reload();await page.waitForFunction(()=>!!window.srpgDebug);
   assert.deepEqual((await t.state()).units,expected.units,'resolved HP survives reload');assert.equal(await page.evaluate(()=>localStorage.getItem('field-command-save-v1')),save);
   if(width===390&&height===844)for(const [stage,data]of Object.entries(sampled.shots))writeFileSync(`test-results/mobile-hp-${kind}-${stage}.png`,Buffer.from(data.split(',')[1],'base64'));
   results.push({width,height,kind,initial:[a.hp,b.hp],final:expected.units.map(u=>u.hp),tile:first.tile,counter:!!counter,css:first.css});
  }
  assert.deepEqual(t.errors,[]);await browser.close();browser=null;
 }
 writeFileSync('test-results/combat-hp-browser.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{if(browser?.isConnected())await browser.close();}
