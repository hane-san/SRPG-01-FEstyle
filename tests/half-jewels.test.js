import test from 'node:test';
import assert from 'node:assert/strict';
import {hpHalves,combatHpLayout} from '../hp-jewels.js';
import {gemPlan,gemSchedule} from '../gem-effects.js';
import {halfSchedule,DEFAULT_HIT} from '../trial-profiles.js';
import {createPlayback} from '../playback.js';
import {unitPose} from '../polygon-models.js';
import {createLabScenario} from '../tactical-lab.js';

const hp=s=>s.units.map(u=>u.hp);
test('HP0–6 uses three diamonds, consuming the right half before the left; pending never invents damage',()=>{
 const expected=['------','L-----','LR----','LRL---','LRLR--','LRLRL-','LRLRLR'];
 for(let n=0;n<=6;n++)assert.equal(hpHalves(n).map(h=>h.filled?(h.side==='left'?'L':'R'):'-').join(''),expected[n]);
 assert.deepEqual(hpHalves(5,3).filter(h=>h.pending).map(h=>[h.gem,h.side]),[[1,'right'],[2,'left']],'odd-HP two-point hit straddles two diamonds');
 assert.equal(hpHalves(2,-4).filter(h=>h.pending).length,2,'overkill only marks what remains');
 assert.equal(hpHalves(6).filter(h=>h.pending).length,0);
});

test('paired enlarged HP cards fit visible map bounds and never overlap at corners/zoom',()=>{
 const state={map:{w:20,h:30}};
 for(const v of [{x:0,y:0,w:8,h:7},{x:5,y:8,w:6,h:9},{x:17,y:26,w:3,h:4}])for(const sampleTheme of [null,'industrial','fantasy']){
  for(const [a,b]of [[{x:v.x,y:v.y},{x:v.x,y:v.y+1}],[{x:v.x+v.w-1,y:v.y+v.h-1},{x:v.x+v.w-2,y:v.y+v.h-1}],[{x:0,y:0},{x:19,y:29}]]){
   const [p,q]=combatHpLayout(state,{polygonVisible:v,sampleTheme},[{id:'a',...a},{id:'b',...b}]);
   for(const r of [p,q]){assert(r.x>=v.x*32&&r.y>=v.y*32);assert(r.x+r.w<=(v.x+v.w)*32);assert(r.y+r.h<=(v.y+v.h)*32);}
   assert(p.x+p.w<=q.x||q.x+q.w<=p.x||p.y+p.h<=q.y||q.y+q.h<=p.y);
  }
 }
});

test('new normal timing replaces excess waits; fast/reduced/healing keep their existing short schedule',()=>{
 assert.equal(DEFAULT_HIT,'halves');
 for(let damage=1;damage<=6;damage++){
  const plan=gemPlan(6,6-damage,damage),base=gemSchedule(plan),s=halfSchedule(plan,base);
  assert.equal(s.firstDelayMs,120);assert.equal(s.defeatHoldMs,150);assert.equal(s.defeatBurstMs,250);
  assert(s.firstDelayMs+damage*s.intervalMs+s.finishMs<=740);
  for(const options of [{fast:true},{reduced:true},{heal:true}]){
   const short=halfSchedule(plan,base,options);assert.equal(short.halves,false);assert.equal(short.crystal,false);
   for(const key of Object.keys(base))assert.equal(short[key],base[key]);
  }
 }
});

test('contact→pending→half shards→HP0→charge→burst preserves actual observers, counter, P3 and cleanup',async()=>{
 const keys=['document','performance','requestAnimationFrame','cancelAnimationFrame'],saved=keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]);
 let clock=0,id=0;
 try{
  const doc={hidden:false};Object.defineProperty(globalThis,'document',{configurable:true,value:doc});
  Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>clock}});
  globalThis.requestAnimationFrame=fn=>{const n=++id;queueMicrotask(()=>{clock+=10;fn(clock);});return n;};globalThis.cancelAnimationFrame=()=>{};
  for(const kind of ['normal','armour','overkill','support','heal','moved'])for(const mode of ['normal','slow','fast','reduced','hidden','background']){
   const {initial,frames,resolved}=createLabScenario(kind),unchanged=structuredClone(resolved),view={},trace=[];let shown=initial;
   doc.hidden=mode==='hidden';
   const player=createPlayback({hitProfile:()=>'halves',getState:()=>shown,setState:s=>{shown=s;},view,
    isFast:()=>mode==='fast',isReduced:()=>mode==='reduced',
    sound:{play:(cue,count)=>trace.push({cue,count,t:clock})},
    draw:()=>{
     if(view.animation){const a=view.animation;trace.push({stage:a.stage,t:clock,actor:a.actor,target:a.target,index:a.index,jewel:view.jewel?{...view.jewel}:null,ghost:view.ghost?{...view.ghost}:null,hp:hp(shown),pair:view.combatHp?.units.map(u=>u.id)});}
     if(mode==='slow')clock+=35;
     if(mode==='background'&&view.animation?.stage==='damage')doc.hidden=true;
    },onCombat:(_before,after,event,stage)=>trace.push({combat:stage,target:event.target,after:after.units.find(u=>u.id===event.target).hp,t:clock})});
   await player.play(frames);assert.deepEqual(shown.units,(frames.at(-1)?.state??initial).units);assert.deepEqual(hp(shown),hp(resolved));assert.deepEqual(resolved,unchanged);assert(Object.values(view).every(v=>v===null));
   for(const f of frames.filter(f=>['hit','heal'].includes(f.event.kind))){
    const target=f.event.target,prior=frames.indexOf(f)?frames[frames.indexOf(f)-1].state:initial;
    const start=prior.units.find(u=>u.id===target).hp,end=f.state.units.find(u=>u.id===target).hp;
    const shards=trace.filter(e=>e.combat==='shard'&&e.target===target);
    assert.equal(shards.length,Math.abs(start-end));assert.deepEqual(shards.map(e=>e.after),Array.from({length:Math.abs(start-end)},(_,i)=>start+(end>start?1:-1)*(i+1)));
    if(['normal','slow'].includes(mode)&&f.event.kind==='hit'){
     const pending=trace.find(e=>e.stage==='damage'&&e.target===target),first=trace.find(e=>e.stage==='shatter'&&e.target===target);
     assert.equal(pending.jewel.hp,start);assert.equal(pending.jewel.pendingEnd,end);assert.equal(pending.jewel.index,-1);assert.equal(pending.pair.length,2);
     assert(first.t-pending.t>=100);assert.equal(first.jewel.hp,start-1);
     const zero=trace.find(e=>e.combat==='impact'&&e.target===target&&e.after===0),hold=trace.find(e=>e.stage==='defeat-hold'&&e.target===target),burst=trace.find(e=>e.stage==='collapse'&&e.target===target);
     if(end===0){
      assert(zero&&hold&&burst);assert(hold.t>=zero.t);assert(burst.t-hold.t>=150);assert.equal(hold.ghost.unit.hp,0);assert.equal(hold.ghost.shatter,false);assert.equal(burst.ghost.burstOnly,true);
      const charge=trace.find(e=>e.cue==='gem-charge'),finish=trace.find(e=>e.cue==='gem-finish');assert(finish.t-charge.t>=150);
     }else assert.equal(hold,undefined);
    }
   }
   if(['fast','reduced','hidden'].includes(mode))assert(!trace.some(e=>e.pair||e.stage==='defeat-hold'));
  }
  // A rendering callback failure clears every transient, allowing app finalization.
  const fixture=createLabScenario('normal'),view={};let shown=fixture.initial;
  const pb=createPlayback({hitProfile:()=>'halves',getState:()=>shown,setState:s=>shown=s,view,isFast:()=>false,isReduced:()=>false,sound:{play:()=>{}},draw:()=>{if(view.animation?.stage==='damage')throw Error('draw failure');}});
  await assert.rejects(pb.play(fixture.frames),/draw failure/);assert(Object.values(view).every(v=>v===null));
 }finally{for(const [key,d]of saved){if(d)Object.defineProperty(globalThis,key,d);else delete globalThis[key];}}
});

test('3D defeat holds upright and compresses before any collapse; reduced motion stays still',()=>{
 const u={id:'e',x:3,y:3,team:'enemy'},s={units:[u]},view={ghost:{unit:u,stage:'charge',progress:1}};
 const pose=unitPose(u,s,view,0);assert.equal(pose.death,0);assert.equal(pose.charge,1);assert.equal(pose.breath,0);
 assert.equal(unitPose(u,s,view,0,true).charge,0);
});
