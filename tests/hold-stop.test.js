import test from 'node:test';
import assert from 'node:assert/strict';
import {createHoldLock} from '../ui-input.js';

function clocked(run){
 const saved=[globalThis.setTimeout,globalThis.clearTimeout];let now=0,id=0;const timers=new Map();
 globalThis.setTimeout=(fn,delay)=>{timers.set(++id,{fn,at:now+delay});return id;};globalThis.clearTimeout=n=>timers.delete(n);
 const clock={advance(ms){const end=now+ms;for(;;){const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();}now=end;},pending:()=>[...timers.values()].map(t=>t.fn)};
 try{run(clock);}finally{[globalThis.setTimeout,globalThis.clearTimeout]=saved;}
}

test('sliding inside a large tile does not arm; a real stop with small tremor does',()=>clocked(c=>{
 const fired=[],h=createHoldLock(200,k=>fired.push(k));h.enter('4,15',{x:0,y:0});
 for(let x=8;x<=32;x+=8){c.advance(60);h.move(x,0);assert.equal(h.armed,false);}
 c.advance(100);h.move(33,1);c.advance(90);h.move(31,-1);assert.equal(h.armed,false);
 c.advance(10);assert.equal(h.armed,true);assert.deepEqual(fired,['4,15']);
 h.move(100,100);c.advance(500);assert.deepEqual(fired,['4,15'],'an armed firing point stays fixed during the following flick');
}));

test('a cancelled callback cannot arm a new visit to the very same cell',()=>clocked(c=>{
 const fired=[],h=createHoldLock(200,k=>fired.push(k));h.enter('4,15',{x:10,y:20});const stale=c.pending()[0];
 c.advance(190);h.reset();h.enter('4,15',{x:10,y:20});stale();assert.equal(h.armed,false);
 c.advance(199);assert.deepEqual(fired,[]);c.advance(1);assert.deepEqual(fired,['4,15']);
 h.reset();h.enter('4,14',{x:20,y:20});const cancelled=c.pending()[0];h.reset();cancelled();c.advance(1000);assert.deepEqual(fired,['4,15']);
}));

test('changing destination restarts the complete dwell and never inherits motion or armed state',()=>clocked(c=>{
 const fired=[],h=createHoldLock(200,k=>fired.push(k));h.enter('4,15',{x:0,y:0});c.advance(190);
 h.enter('3,15',{x:30,y:0});c.advance(190);assert.equal(h.armed,false);c.advance(10);assert.equal(h.armed,true);
 h.enter('2,15',{x:60,y:0});assert.equal(h.armed,false);c.advance(200);assert.deepEqual(fired,['3,15','2,15']);
 h.enter(null);assert.equal(h.cell,null);assert.equal(h.armed,false);assert.equal(c.pending().length,0);
}));
