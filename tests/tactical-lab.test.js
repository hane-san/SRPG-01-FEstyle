import test from 'node:test';
import assert from 'node:assert/strict';
import {createLabScenario} from '../tactical-lab.js';
import {paintFantasyTerrain,paintFantasyCamp,paintThemedUnit} from '../fantasy-theme.js';
import {MAPS} from '../data.js';

test('lab scenarios use engine damage, counter, armour and stationary finite P3',()=>{
 const hp=kind=>createLabScenario(kind).resolved.units.map(u=>u.hp);
 assert.deepEqual(hp('normal'),[4,4]);
 assert.deepEqual(hp('armour'),[4,5]);
 assert.deepEqual(hp('overkill'),[6,0]);
 assert.deepEqual(hp('support'),[6,5]);
 assert.deepEqual(hp('heal'),[6,5]);
 assert.deepEqual(hp('moved'),[6,6]);
 for(const kind of ['support','heal','moved']){
  const {initial,resolved}=createLabScenario(kind);
  assert.equal(resolved.units[0].charges,initial.units[0].charges-(kind==='moved'?0:1));
  assert.equal(resolved.metrics.commands,1);
 }
 assert.throws(()=>createLabScenario('unknown'));
});
test('fantasy terrain and both alternate class bodies preserve game data',()=>{
 const c=new Proxy({},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 for(const id of [0,3]){
  const map=structuredClone(MAPS[id]),before=structuredClone(map);
  paintFantasyTerrain(c,map);paintFantasyCamp(c,32,32);assert.deepEqual(map,before);
 }
 for(const theme of ['fantasy','industrial'])for(const type of ['sword','shield','spear','bow','horse','mage','shooter','bandit']){
  const u={type,x:1,y:1,team:'ally',hp:6},before=structuredClone(u);
  assert.equal(paintThemedUnit(c,u,theme),true);assert.deepEqual(u,before);
 }
 assert.equal(paintThemedUnit(c,{},'original'),false);
});
