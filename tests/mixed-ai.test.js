import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {MIXED_ROLES,mixedRole} from '../trial-profiles.js';
import {buildThreatIndex,indexedThreat} from '../tactical-ui.js';

function fixture(map=0){const s=E.createGame(map);s.trial={ai:'mixed'};return s;}
const enemy=(s,id)=>s.units.find(u=>u.id===id);
function place(s,x,y){const u=s.units.find(u=>u.id==='a1');Object.assign(u,{x,y,deployed:true});return u;}
function phase(s){s.phase=2;E.enemyPhase(s);s.phase=1;}

test('same P2 mixes advance, sleeping territory and anchored guards without changing specs',()=>{
 for(const [map,attacker,guard,territory,p] of [[0,'e1','e3','e5',{x:6,y:17}],[3,'extra-3-0-2','extra-3-0-0','extra-3-1-1',{x:6,y:34}]]){
  const s=fixture(map),before=structuredClone(s),target=place(s,p.x,p.y);
  const start=E.dist(enemy(s,attacker),target);phase(s);
  assert(E.dist(enemy(s,attacker),target)<start,'attackers approach');
  for(const id of [guard,territory])assert.deepEqual([enemy(s,id).x,enemy(s,id).y],[enemy(before,id).x,enemy(before,id).y],id);
  assert.deepEqual(s.map,before.map);assert.deepEqual(s.units.map(u=>[u.id,u.type,u.atk,u.def,u.move,u.maxHp,u.ai]),before.units.map(u=>[u.id,u.type,u.atk,u.def,u.move,u.maxHp,u.ai]));
 }
});

test('territory wakes, pursues inside its leash, then returns and sleeps',()=>{
 const s=fixture(),e=enemy(s,'e5'),home={x:e.x,y:e.y};
 s.units=s.units.filter(u=>u.team==='ally'||u.id===e.id);
 const a=place(s,9,7);phase(s);assert.equal(e.trialAwake,true);assert(E.dist(e,home)>0);
 Object.assign(a,{x:0,y:19});
 for(let i=0;i<5;i++){phase(s);assert(E.dist(e,home)<=6);}
 assert.equal(E.dist(e,home),0);assert.equal(e.trialAwake,false);
});

test('guard respects its post even when an attacker is in range outside the guard zone',()=>{
 const s=fixture(),e=enemy(s,'e3'),home={x:e.x,y:e.y};
 s.units=s.units.filter(u=>u.team==='ally'||u.id===e.id);
 place(s,3,9);phase(s);assert.equal(E.dist(e,home),0,'does not chase');
 place(s,3,8);phase(s);assert(E.dist(e,home)<=1);assert(s.units.find(u=>u.id==='a1').hp<6,'intercepts inside zone');
});

test('a guard far outside its zone walks back; occupied or isolated posts do not hang',()=>{
 for(const blocked of [false,true]){
  const s=fixture(),e=enemy(s,'e3'),home={x:e.x,y:e.y};
  s.units=s.units.filter(u=>u.team==='ally'||u.id===e.id);Object.assign(e,{x:3,y:16});
  if(blocked){const friend={...e,id:'unassigned',...home,ai:'hold'};s.units.push(friend);}
  for(let i=0;i<6;i++)phase(s);
  assert(E.dist(e,home)<=1,'returns near occupied post too');
  if(blocked)assert(E.dist(e,home)>0,'never shares an occupied endpoint');
 }
 const s=fixture(),e=enemy(s,'e3');s.map.tiles=s.map.tiles.map(row=>row.split(''));
 for(const [dx,dy] of [[0,-1],[-1,0],[1,0],[0,1]])s.map.tiles[e.y+dy][e.x+dx]='~';
 s.map.tiles=s.map.tiles.map(row=>row.join(''));phase(s);assert.deepEqual([e.x,e.y],[3,6]);
});

test('roles follow exact IDs independently of class, order and unregistered enemies',()=>{
 const s=fixture(),e=enemy(s,'e1'),r=mixedRole(s,e);
 e.type='horse';s.units.reverse();assert.equal(mixedRole(s,e),r);
 assert.equal(mixedRole(s,{...e,id:'unknown'}),null);
 assert.equal(mixedRole(s,{...e,id:'constructor'}),null);
 assert.equal(mixedRole(s,{...e,team:'ally'}),null);
 s.trial.ai='current';assert.equal(mixedRole(s,e),null);
 assert(Object.isFrozen(MIXED_ROLES[0]));
});

test('a sleeping territory unit displaced by a checkpoint returns to its post',()=>{
 const s=fixture(),e=enemy(s,'e5'),home={x:e.x,y:e.y};
 s.units=s.units.filter(u=>u.team==='ally'||u.id===e.id);Object.assign(e,{x:9,y:17});
 for(let i=0;i<8;i++)phase(s);
 assert.equal(E.dist(e,home),0);
 assert(!e.trialAwake);
});

test('all six campaign maps match current profile exactly through multiple phases',()=>{
 for(let map=0;map<6;map++){
  const original=E.createGame(map),current=structuredClone(original);current.trial={ai:'current'};
  for(let turn=0;turn<3;turn++){
   E.endTurn(original);E.endTurn(current);const compared=structuredClone(current);delete compared.trial;
   assert.deepEqual(compared,original,`map ${map} turn ${turn}`);
  }
 }
});

test('mixed movement uses legal routes and rain; unknown IDs retain their old AI',()=>{
 for(const weather of ['clear','heavy']){
  const s=fixture(3);s.map.weatherCycle=[weather];place(s,6,34);
  const unknown={...enemy(s,'extra-3-0-3'),id:'unknown',x:0,y:35,ai:'hold'};s.units.push(unknown);
  const expected=structuredClone(s),paths=[];
  s.phase=2;E.enemyPhase(s,(state,u,event)=>{if(event.kind==='move'){
   paths.push(event.path);let cost=0;
   for(let i=1;i<event.path.length;i++){assert.equal(E.dist(event.path[i-1],event.path[i]),1);cost+=E.terrain(state,event.path[i]).cost;}
   assert(cost<=E.movement(state,u));
   assert.equal(E.alive(state).filter(a=>E.dist(a,u)===0).length,1);
  }});
  expected.phase=2;E.enemyPhase(expected);assert.deepEqual(s,expected,'deterministic complete state');
  assert(paths.length>0);assert.deepEqual([unknown.x,unknown.y],[0,35]);
 }
});

test('mixed mobilisation is included in danger/indexed risk, while campaign hold is stationary',()=>{
 const s=fixture(),u=place(s,6,15),e=enemy(s,'e1');
 s.units=s.units.filter(a=>a.team==='ally'||a.id===e.id);
 const index=buildThreatIndex(s,E),risk=indexedThreat(s,index,u,u,E);
 assert(risk>0);assert.equal(risk,E.threatAt(s,u,u));
 delete s.trial;assert.equal(E.threatAt(s,u,u),0);
});
