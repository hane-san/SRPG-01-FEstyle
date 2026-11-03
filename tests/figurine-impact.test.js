import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {unit} from '../data.js';
import {Mesh,MESH_STRIDE,MESH_BYTES,surface} from '../polygon-mesh.js';
import {unitPose} from '../polygon-models.js';
import {pickProjectedMesh,projectPoint} from '../polygon-space.js';
import {impactSchedule,impactInterval} from '../trial-profiles.js';
import {gemPlan,gemSchedule} from '../gem-effects.js';
import {createPlayback} from '../playback.js';

test('curved figurine surfaces carry normalized smooth normals, material finish and independent fade',()=>{
 const m=new Mesh(),metal=surface('#aabbcc',.25,.85);m.alpha=.4;
 m.push({ry:.7,rz:.2,scale:.65});m.ellipsoid(0,0,0,.3,.5,.2,metal,12,8);m.pop();
 assert.equal(MESH_BYTES,MESH_STRIDE*4);assert.equal(m.length%MESH_STRIDE,0);
 const normals=new Set();
 for(let i=0;i<m.length;i+=MESH_STRIDE){
  assert(Math.abs(Math.hypot(...m.data.subarray(i+3,i+6))-1)<1e-5);
  assert(Math.abs(m.data[i+9]-.4)<1e-6);assert(Math.abs(m.data[i+10]-.25)<1e-6);assert(Math.abs(m.data[i+11]-.85)<1e-6);
  normals.add(Array.from(m.data.subarray(i+3,i+6)).map(n=>n.toFixed(3)).join(','));
 }
 assert(normals.size>50,'curves interpolate many surface normals instead of six box faces');
 assert.equal(m.stack.length,0);assert.deepEqual(surface('#aabbcc').slice(4),[.8,0]);
});

test('overlapping figures pick the frontmost actual triangle and ignore unpickable route previews',()=>{
 const m=new Mesh();
 // Same projected triangle at two different elevations/depths.
 const tri=h=>[[3,h,4+h*1.02],[4,h,4+h*1.02],[3.5,h,5+h*1.02]];
 m.tri(...tri(.2),'#ffffff');const end=m.length;m.tri(...tri(.7),'#ffffff');
 const groups=[{unit:{id:'back',x:3,y:4},start:0,end,pickable:true},{unit:{id:'front',x:3,y:5},start:end,end:m.length,pickable:true}];
 const p=projectPoint({x:3.5,y:0,z:4.4});
 assert.deepEqual(pickProjectedMesh(p,32,m.data,MESH_STRIDE,groups),{x:3,y:5});
 groups[1].pickable=false;assert.deepEqual(pickProjectedMesh(p,32,m.data,MESH_STRIDE,groups),{x:3,y:4});
 assert.equal(pickProjectedMesh({x:0,y:0},32,m.data,MESH_STRIDE,groups),null);
});

test('contact-first schedule has no number-only delay and keeps reduced/fast/healing timing',()=>{
 for(let count=1;count<=6;count++){
  const p=gemPlan(6,6-count,count,{}),base=gemSchedule(p),s=impactSchedule(p,base);
  assert.equal(s.firstDelayMs,0);assert(s.impact&&s.crystal);assert.equal(s.intervalMs,impactInterval(count));
  assert(s.hitStopMs<s.intervalMs);assert(count*s.intervalMs+s.finishMs<500,'damage count does not add a long wait');
  for(const mode of [{fast:true},{reduced:true},{heal:true}]){
   const q=impactSchedule(p,base,mode);assert.equal(q.impact,false);assert.equal(q.crystal,false);
   for(const key of ['firstDelayMs','hitStopMs','intervalMs','finishMs'])assert.equal(q[key],base[key]);
  }
 }
});

test('new contact, number, first crack and SE share a beat; every observer keeps actual HP, counters and cleanup',async()=>{
 const keys=['document','performance','requestAnimationFrame','cancelAnimationFrame'],saved=keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]);
 let clock=0,id=0;
 try{
  const doc={hidden:false};Object.defineProperty(globalThis,'document',{configurable:true,value:doc});
  Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>clock}});
  globalThis.requestAnimationFrame=fn=>{const n=++id;queueMicrotask(()=>{clock+=10;fn(clock);});return n;};globalThis.cancelAnimationFrame=()=>{};
  for(const kind of ['normal','armour','overkill','heavy','horse','bow','spear','support','heal'])for(const mode of ['normal','slow-render','fast','reduced','hidden']){
   doc.hidden=mode==='hidden';
   const s=E.createGame(),type=kind==='support'?'shooter':kind==='heal'?'mage':['horse','bow','spear'].includes(kind)?kind:'sword';
   const a=unit({id:'a',type,x:4,y:16},'ally'),t=unit({id:'t',type:kind==='armour'?'shield':'sword',x:4,y:['support','bow'].includes(kind)?14:15,ai:'hold'},kind==='heal'?'ally':'enemy');
   if(kind==='heavy')a.atk=20;if(kind==='overkill')t.hp=1;if(kind==='heal')t.hp=5;s.units=[a,t];
   let shown=structuredClone(s);const frames=[],trace=[],view={};
   const observe=(state,_actor,event)=>frames.push({state:structuredClone(state),event});
   if(['support','heal'].includes(kind)){assert(E.act(s,'a',a,'wait').ok);E.supportPhase(s,observe);}
   else assert(E.act(s,'a',a,'attack','t',observe).ok);
   const resolved=structuredClone(s);
   const pb=createPlayback({hitProfile:()=>'impact',getState:()=>shown,setState:state=>{shown=state;},view,isFast:()=>mode==='fast',isReduced:()=>mode==='reduced',
    sound:{play:(cue,amount,_lethal,options)=>trace.push({cue,amount,options,time:clock})},
    draw:()=>{if(view.effect?.crystal&&view.jewel?.zoom)trace.push({contact:true,time:clock,index:view.jewel.index,hp:view.jewel.hp,actor:view.animation.actor,target:view.jewel.id});if(mode==='slow-render')clock+=35;},
    onCombat:(before,after,event,stage)=>trace.push({stage,event,hp:after.units.find(u=>u.id===event.target).hp,start:before.units.find(u=>u.id===event.target).hp,time:clock})});
   await pb.play(frames);assert.deepEqual(shown.units,resolved.units);assert.deepEqual(s,resolved);assert(Object.values(view).every(v=>v===null));
   let start=0;
   for(const hit of trace.filter(e=>e.stage==='impact')){
    const end=trace.indexOf(hit),segment=trace.slice(start,end+1);start=end+1;
    const count=Math.abs(hit.hp-hit.start),heal=hit.event.kind==='heal',shards=segment.filter(e=>e.stage==='shard');
    assert.equal(shards.length,count);assert.deepEqual(shards.map(e=>e.hp),Array.from({length:count},(_,i)=>hit.start+(heal?1:-1)*(i+1)));
    const chain=segment.find(e=>e.cue==='gem-chain');assert.equal(chain?.amount,count);
    if(['normal','slow-render'].includes(mode)&&!heal){
     const contact=segment.find(e=>e.contact),impact=segment.find(e=>e.cue==='combat-impact');
     assert(contact&&impact);assert.equal(contact.time,impact.time);assert.equal(chain.time,impact.time);
     assert.equal(contact.hp,hit.start-1);assert.equal(contact.index,hit.start-1);assert.equal(chain.options.impact,true);
     assert(segment.find(e=>e.cue==='combat-windup').time<impact.time);
     if(mode==='slow-render')assert(hit.time-impact.time<=count*impactInterval(count)+100,'slow geometry cannot add a fresh delay to each audio beat');
    }else assert.equal(segment.some(e=>e.contact),false,'fast/reduced/hidden/heal add no enlarged crack');
   }
   assert(frames.some(f=>['hit','heal'].includes(f.event.kind)));
   if(kind==='normal')assert(frames.some(f=>f.event.counter),'separate legal counter is still replayed');
  }
 }finally{for(const [key,d]of saved){if(d)Object.defineProperty(globalThis,key,d);else delete globalThis[key];}}
});

test('figurines hold their contact pose before following through, instead of snapping idle',()=>{
 const s=E.createGame(),a=s.units[0],t=s.units[1];
 const pose=(stage,progress,index=1)=>unitPose(a,s,{animation:{kind:'hit',actor:a.id,target:t.id,stage,progress,index}},0,false);
 assert(pose('windup',.5).attack<0);assert.equal(pose('windup',1).attack,1);
 assert.equal(pose('hitstop',0).attack,1);assert.equal(pose('shatter',.5).attack,.5);assert.equal(pose('shatter',1).attack,0);
 assert.equal(pose('shatter',.5,2).attack,0);
});
