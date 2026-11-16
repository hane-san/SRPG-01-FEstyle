import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayback} from '../playback.js';
import {combatHpLayout} from '../hp-jewels.js';
import {createLabScenario} from '../tactical-lab.js';

// A vertically adjacent attack/counter used to reverse the left/right plates,
// because the next windup recreated [actor,target] in the opposite order.
test('attack and counter keep each participant on the same HP plate with the correct current value',async()=>{
 const globals=['document','performance','requestAnimationFrame','cancelAnimationFrame'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]);
 let clock=0;
 try{
  Object.defineProperty(globalThis,'document',{configurable:true,value:{hidden:false}});
  Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>clock}});
  globalThis.requestAnimationFrame=fn=>{queueMicrotask(()=>{clock+=10;fn(clock);});return 1;};
  globalThis.cancelAnimationFrame=()=>{};
  for(const enemyFirst of [false,true]){
   const fixture=createLabScenario('normal');
   // The same observer pair also occurs when an enemy attacks and an ally counters.
   if(enemyFirst)for(const state of [fixture.initial,...fixture.frames.map(f=>f.state)])for(const u of state.units)u.team=u.team==='ally'?'enemy':'ally';
   let shown=fixture.initial;const view={tile:32,polygonVisible:{x:0,y:0,w:8,h:7}},windups=[];
   const player=createPlayback({hitProfile:()=>'halves',getState:()=>shown,setState:s=>shown=s,view,isFast:()=>false,isReduced:()=>false,sound:{play:()=>{}},draw:()=>{
    if(view.animation?.stage==='windup'&&view.animation.progress===0){
     windups.push({counter:!!view.animation.counter,cards:combatHpLayout(shown,view,view.combatHp.units),units:structuredClone(view.combatHp.units),target:view.combatHp.target});
    }
   }});
   await player.play(fixture.frames);
   const first=windups.find(x=>!x.counter),counter=windups.find(x=>x.counter);
   assert(first&&counter,'both distinct strikes are visible');
   assert.notEqual(first.target,counter.target,'the receiving participant changes');
   for(const u of first.units){
    assert.deepEqual(first.cards.find(c=>c.id===u.id),counter.cards.find(c=>c.id===u.id),'plate stays anchored to '+u.id);
    const expected=fixture.frames.find(f=>f.event.kind==='hit'&&!f.event.counter).state.units.find(p=>p.id===u.id).hp;
    assert.equal(counter.units.find(p=>p.id===u.id).hp,expected,'counter begins from the first strike result');
   }
   assert.deepEqual(shown.units,fixture.frames.at(-1).state.units,'presentation leaves the deterministic result intact');
   assert.equal(view.combatHp,null,'the map HP returns at the end');
  }
 }finally{for(const [key,d]of globals){if(d)Object.defineProperty(globalThis,key,d);else delete globalThis[key];}}
});
