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
