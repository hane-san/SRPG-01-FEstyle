import test from 'node:test';
import assert from 'node:assert/strict';
import {MAPS,unit} from '../data.js';
import {createProjection,surfaceHeight,transform} from '../projection-3d.js';
import {terrainMesh,unitsMesh,unitPose} from '../models-3d.js';
import {LIMITS} from '../mesh-3d.js';
import * as E from '../engine.js';

test('3D projection rays round trip all cells and shared bridge heights at phone scales',()=>{
 for(const id of [0,3])for(const width of [320,360,390,544]){
  const map=MAPS[id],p=createProjection(map,Math.floor(width/map.w));
  for(let y=0;y<map.h;y++)for(let x=0;x<map.w;x++){
   const cell={x,y},screen=p.cellToScreen(cell);
   assert.deepEqual(p.screenToCell(screen.x,screen.y),cell,`${id}/${width}/${x},${y}`);
   const world=p.intersect(screen.x,screen.y,surfaceHeight(map,cell));
   assert.ok(Math.abs(world.x-x-.5)<1e-4&&Math.abs(world.y-y-.5)<1e-4);
  }
  const identity=transform(p.inverse,transform(p.matrix,[3,1,6]));
  assert.ok(identity.every((v,i)=>Math.abs(v-[3,1,6,1][i])<1e-4));
  assert.deepEqual(p.screenToCell(-30,-30),{x:-1,y:-1});
 }
});
test('both themes build bounded different terrain and class silhouettes without mutating rules',()=>{
 for(const id of [0,3]){
  const s=E.createGame(id),before=structuredClone(s),themes=[];
  for(const theme of ['industrial','fantasy']){
   const terrain=terrainMesh(s.map,theme,s.units),models=[];
   assert.ok(terrain.length/9<=LIMITS.staticVertices);assert.ok(terrain.every(Number.isFinite));themes.push(terrain);
   for(const type of ['sword','shield','spear','horse','bow','mage','shooter','bandit']){
    const u=unit({id:type,name:type,type,x:4,y:16},type==='bandit'?'enemy':'ally');
    const data=unitsMesh({...s,units:[u]},{sampleTheme:theme},{reduced:true});
    assert.ok(data.length/9<LIMITS.dynamicVertices);assert.ok(data.every(Number.isFinite));models.push(data.length);
   }
   assert.ok(new Set(models).size>=6,'class-specific construction, not identical colored tokens');
  }
  assert.notDeepEqual(themes[0],themes[1]);assert.deepEqual(s,before);
 }
});
test('poses use observer path segment and common animation progress; reduced motion has no sway',()=>{
 const u=unit({id:'a',name:'歩兵',type:'sword',x:5,y:14},'ally');
 const view={motion:{id:'a',x:4.25,y:14},animation:{kind:'move',stage:'move',actor:'a',segment:1,progress:.25,path:[{x:4,y:14},{x:5,y:14}]},idleTime:450};
 const copy=structuredClone(view),pose=unitPose(u,view);
 assert.equal(pose.x,4.25);assert.equal(pose.angle,Math.PI/2);assert.notEqual(pose.walk,0);
 const quiet=unitPose(u,view,{reduced:true});assert.equal(quiet.walk,0);assert.equal(quiet.breath,0);assert.deepEqual(view,copy);
});
test('representative idle polygon silhouettes stay readable at tactical phone and landscape scales',()=>{
 for(const tile of [26,31,44])for(const type of ['sword','shield','horse','bow','mage','shooter','bandit']){
  const s=E.createGame();s.units=[unit({id:'a',name:type,type,x:5,y:15},type==='bandit'?'enemy':'ally')];
  const data=unitsMesh(s,{tile,sampleTheme:'fantasy'},{reduced:true}),p=createProjection(s.map,tile),ys=[];
  for(let i=0;i<data.length;i+=9)ys.push(p.project(data[i],data[i+1],data[i+2]).y);
  const height=Math.max(...ys)-Math.min(...ys);
  assert.ok(height>=24&&height<=39,`${type}/${tile}: ${height.toFixed(1)} CSS px`);
 }
});
