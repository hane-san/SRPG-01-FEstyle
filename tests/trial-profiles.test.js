import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {AI_PROFILES,LURE_WAKE,weightySchedule,WEIGHTY_HOLD_MS,WEIGHTY_LINGER_MS} from '../trial-profiles.js';
import {gemPlan,gemSchedule} from '../gem-effects.js';

// A board where allies stand a few steps in front of the enemy line on map 04.
function contact(ai){
 const s=E.createGame(3),enemies=E.alive(s,'enemy'),allies=s.units.filter(u=>u.team==='ally');
 const lead=[...enemies].sort((a,b)=>b.y-a.y)[0];
 const spots=[];for(let dy=3;dy<=6&&spots.length<2;dy++)for(const dx of [0,1,-1,2,-2])
  {const p={x:lead.x+dx,y:lead.y+dy};if(spots.length<2&&E.terrain(s,p)&&!E.at(s,p)&&!spots.some(q=>q.x===p.x&&q.y===p.y))spots.push(p);}
 spots.forEach((p,i)=>Object.assign(allies[i],{deployed:true,...p}));
 if(ai)s.trial={ai};
 s.phase=2;E.enemyPhase(s);
 return s;
}
const where=s=>E.alive(s,'enemy').map(e=>`${e.id}:${e.x},${e.y}`).join(' ');

test('without a trial the enemy phase is the campaign one',()=>{
 assert.equal(where(contact(null)),where(contact('current')));
});

test('each profile is deterministic from the same snapshot',()=>{
 for(const ai of Object.keys(AI_PROFILES))assert.equal(where(contact(ai)),where(contact(ai)),ai);
});

test('line and lure give a different enemy turn from the same contact',()=>{
 const current=where(contact('current'));
 assert.notEqual(where(contact('line')),current,'line holds posts');
 assert.notEqual(where(contact('lure')),current,'lure waits');
});

test('line keeps melee within two tiles of their posts',()=>{
 const s=contact('line');
 for(const e of E.alive(s,'enemy')){
  if(['hold','raid'].includes(e.ai))continue;
  const home=s.map.enemies.find(a=>a.id===e.id);
  assert.ok(E.dist(e,home)<=(e.range[1]>1?3:2),e.id);
 }
});

test('lure: an enemy with no ally near its post stays put',()=>{
 const s=contact('lure');
 for(const e of E.alive(s,'enemy')){
  if(['hold','raid'].includes(e.ai))continue;
  const home=s.map.enemies.find(a=>a.id===e.id);
  const near=E.alive(s,'ally').some(a=>E.dist(a,home)<=LURE_WAKE);
  if(!near)assert.deepEqual({x:e.x,y:e.y},{x:home.x,y:home.y},e.id);
 }
});

test('hit-feel B adds a short hold and linger to ordinary hits only',()=>{
 const plan=gemPlan(6,4,2,{}),base=gemSchedule(plan),b=weightySchedule(plan,base);
 assert.equal(b.hitStopMs,Math.max(base.hitStopMs,WEIGHTY_HOLD_MS));
 assert.equal(b.finishMs,base.finishMs+WEIGHTY_LINGER_MS);
 assert.ok(b.hitStopMs+b.finishMs-(base.hitStopMs+base.finishMs)<=60,'about 60ms at most');
 assert.deepEqual(weightySchedule(plan,base,{fast:true}),base);
 assert.deepEqual(weightySchedule(plan,base,{reduced:true}),base);
 const heavy=gemPlan(6,3,3,{heavy:true});
 if(heavy.heavy)assert.deepEqual(weightySchedule(heavy,gemSchedule(heavy)),gemSchedule(heavy));
});

// Issue #101: number first, then one gem per beat; more damage is denser, not longer.
import {crystalSchedule,enemyBeat,lowHpPulse,DEFAULT_HIT,HIT_PROFILES} from '../trial-profiles.js';
test('crystal: a 2-damage hit settles in about half to seven tenths of a second',()=>{
 assert.equal(DEFAULT_HIT,'halves','latest owner direction changes the default; legacy crystal remains testable');assert.ok(HIT_PROFILES.crystal&&HIT_PROFILES.current&&HIT_PROFILES.weighty&&HIT_PROFILES.impact&&HIT_PROFILES.halves);
 const plan=gemPlan(6,4,2,{}),s=crystalSchedule(plan,gemSchedule(plan));
 const total=s.hitStopMs+s.firstDelayMs+s.intervalMs*plan.count+s.finishMs;
 assert.ok(s.crystal&&total>=450&&total<=700,`2 damage: ${total}ms`);
 for(const [start,end,amount] of [[6,5,1],[6,3,3],[6,2,4],[6,0,6]]){
  const p=gemPlan(start,end,amount,{}),t=crystalSchedule(p,gemSchedule(p));
  const ms=t.hitStopMs+t.firstDelayMs+t.intervalMs*p.count+t.finishMs;
  assert.ok(ms<=800,`${amount} damage stays bounded: ${ms}ms`);
 }
});
test('crystal leaves Fast, Reduced Motion and heals on their own timing',()=>{
 const plan=gemPlan(6,4,2,{}),fast=gemSchedule(plan,true),reduced=gemSchedule(plan,false,true);
 assert.equal(crystalSchedule(plan,fast,{fast:true}).crystal,false);
 assert.equal(crystalSchedule(plan,fast,{fast:true}).intervalMs,fast.intervalMs);
 assert.equal(crystalSchedule(plan,reduced,{reduced:true}).finishMs,reduced.finishMs);
 const heal=gemPlan(2,4,2,{heal:true});assert.equal(crystalSchedule(heal,gemSchedule(heal),{heal:true}).crystal,false);
});
test('the enemy-phase beat is short and absent in Fast/Reduced Motion or the ally phase',()=>{
 assert.ok(enemyBeat({enemyPhase:true})>=120&&enemyBeat({enemyPhase:true})<=220);
 assert.equal(enemyBeat({enemyPhase:true,fast:true}),0);assert.equal(enemyBeat({enemyPhase:true,reduced:true}),0);
 assert.equal(enemyBeat({enemyPhase:false}),0);
});
test('the HP1 pulse is gentle and becomes a still ring under Reduced Motion',()=>{
 for(let t=0;t<3000;t+=125){const p=lowHpPulse(t);assert.ok(p.amount>=0&&p.amount<=1&&!p.static);}
 assert.deepEqual(lowHpPulse(400,true),{static:true,amount:0});
});
