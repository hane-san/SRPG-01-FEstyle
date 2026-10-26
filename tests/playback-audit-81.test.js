// Issue #81 H/I: fixed engine scenarios exercise sound/HP causality without a
// second battle model or a new game mode. This checks scheduling, not sound quality.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {unit} from '../data.js';
import {createPlayback} from '../playback.js';

function scenario(kind){
 const state=E.createGame();
 const actor=unit({id:'a',name:'味方',type:kind==='heal'?'mage':kind==='support'?'shooter':'sword',x:4,y:16},'ally');
 const target=unit({id:'e',name:'対象',type:kind==='armour'?'shield':'sword',x:4,y:kind==='support'?14:15,ai:'hold'},kind==='heal'?'ally':'enemy');
 if(kind==='overkill')target.hp=1;
 if(kind==='heal')target.hp=5;
 state.units=[actor,target];
 const initial=structuredClone(state),frames=[];
 const observe=(s,_actor,event)=>frames.push({state:structuredClone(s),event});
 if(kind==='heal'||kind==='support'){
  assert.ok(E.act(state,'a',actor,'wait').ok);
  E.supportPhase(state,observe);
 }else assert.ok(E.act(state,'a',actor,'attack','e',observe).ok);
 return {initial,frames,state};
}

test('weapon impacts, actual HP shards and support/heal sounds stay ordered in every playback mode',async()=>{
 const keys=['document','performance','requestAnimationFrame','cancelAnimationFrame'];
 const saved=keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]);
 let clock=0,frameId=0;
 try{
  Object.defineProperty(globalThis,'document',{configurable:true,value:{hidden:false}});
  Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>clock}});
  globalThis.requestAnimationFrame=fn=>{const id=++frameId;queueMicrotask(()=>{clock+=1000;fn(clock);});return id;};
  globalThis.cancelAnimationFrame=()=>{};
  for(const kind of ['normal','armour','overkill','support','heal']){
   for(const mode of ['normal','fast','reduced'])for(const audible of [true,false]){
    const {initial,frames,state}=scenario(kind),view={},trace=[],resolved=structuredClone(state);
    let shown=initial;
    const playback=createPlayback({getState:()=>shown,setState:s=>{shown=s;},view,
     draw:()=>{if(view.animation?.stage==='windup'&&view.animation.progress===1)trace.push({kind:'windup-end'});},
     sound:{play:(cue,amount,lethal,options)=>{if(audible)trace.push({kind:'sound',cue,amount,lethal,options});}},
     isFast:()=>mode==='fast',isReduced:()=>mode==='reduced',
     onCombat:(before,after,event,stage)=>trace.push({kind:stage,event,before:before.units.find(u=>u.id===event.target).hp,after:after.units.find(u=>u.id===event.target).hp})
    });
    await playback.play(frames);
    // The caller restores final phase/metrics after replay; playback owns the
    // visual units only and must never mutate the authoritative resolved result.
    assert.deepEqual(shown.units,state.units,`${kind}/${mode}/${audible}: visual units match the engine result`);
    assert.deepEqual(state,resolved,'presentation cannot change the resolved rules or metrics');
    assert.ok(Object.values(view).every(value=>value===null),'all effects clear');
    const impacts=trace.filter(e=>e.kind==='impact');
    assert.equal(impacts.length,frames.filter(f=>['hit','heal'].includes(f.event.kind)).length);
    let start=0;
    for(const impact of impacts){
     const end=trace.indexOf(impact),segment=trace.slice(start,end+1);start=end+1;
     const count=Math.abs(impact.after-impact.before),shards=segment.filter(e=>e.kind==='shard');
     assert.equal(shards.length,count,`${kind}: one shard per real HP change, including armour and overkill`);
     assert.deepEqual(shards.map(e=>e.after),Array.from({length:count},(_,i)=>impact.before+(impact.event.kind==='heal'?1:-1)*(i+1)));
     if(audible){
      const chain=segment.find(e=>e.cue==='gem-chain');
      assert.equal(chain?.amount,count,'audio uses actual HP change, not raw attack or requested healing');
      if(impact.event.kind==='hit'){
       const hit=segment.findIndex(e=>e.cue==='gem-impact');
       if(mode==='normal')assert.ok(segment.findIndex(e=>e.kind==='windup-end')<hit,'weapon finishes before impact');
       assert.ok(hit>=0&&hit<segment.indexOf(chain),'impact sound precedes the shard chain');
      }
     }
    }
    assert.equal(trace.filter(e=>e.cue==='gem-finish').length,audible&&kind==='overkill'?1:0,'only lethal damage has a finishing sound');
   }
  }
 }finally{
  for(const [key,descriptor]of saved){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
 }
});
