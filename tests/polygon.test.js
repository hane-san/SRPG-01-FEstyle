import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh,MESH_STRIDE} from '../polygon-mesh.js';
import {terrainMesh,unitMesh,unitPose} from '../polygon-models.js';
import {projectPoint,groundPoint,cellToScreen,screenToCell,pickProjectedMesh} from '../polygon-space.js';
import {createGame} from '../engine.js';
import {unit,MAPS} from '../data.js';

test('camera rays roundtrip ground and elevated points at all tactical zooms',()=>{
 for(const tile of [26,32,44.8,60.8])for(const x of [0,.001,5.5,11.999])for(const z of [0,.001,20.5,39.999])for(const y of [0,.1,1.2]){
  const a={x,y,z},b=groundPoint(projectPoint(a,tile),tile,y);
  assert(Math.abs(a.x-b.x)<1e-9&&Math.abs(a.z-b.z)<1e-9);
 }
 for(const tile of [26,32,60.8])for(const cell of [{x:0,y:0},{x:11,y:39},{x:4,y:12}])assert.deepEqual(screenToCell(cellToScreen(cell,tile),tile),cell);
});
test('projected mesh picking follows visible figures and leaves empty neighbouring cells free',()=>{
 const s=createGame(),u=unit({id:'horse',x:3,y:5,type:'horse'},'enemy'),mesh=new Mesh();s.units=[u];
 unitMesh(mesh,u,'fantasy',unitPose(u,s,{},0,true));const group={unit:u,start:0,end:mesh.length,pickable:true};
 assert.deepEqual(pickProjectedMesh(cellToScreen(u),32,mesh.data,MESH_STRIDE,[group]),{x:3,y:5});
 assert.equal(pickProjectedMesh(cellToScreen({x:2,y:5}),32,mesh.data,MESH_STRIDE,[group]),null);
 let head=null;
 for(let i=0;i<mesh.length;i+=MESH_STRIDE)if(mesh.data[i+1]>1.25){const p=projectPoint({x:mesh.data[i],y:mesh.data[i+1],z:mesh.data[i+2]});if(pickProjectedMesh(p,32,mesh.data,MESH_STRIDE,[group])){head=p;break;}}
 assert(head,'actual projected head triangles remain selectable');
 assert.deepEqual(pickProjectedMesh(head,32,mesh.data,MESH_STRIDE,[group]),{x:3,y:5});
});
test('both terrain meshes are finite 3D solids with distinct geometry and real normals',()=>{
 for(const map of [MAPS[0],MAPS[3]]){
  const meshes=['industrial','fantasy'].map(theme=>terrainMesh(map,theme));
  assert.notEqual(meshes[0].triangles,meshes[1].triangles);
  for(const m of meshes){
   assert(m.triangles>map.w*map.h*20);assert(m.triangles<150000);
   let high=0,low=0,side=0;
   for(let i=0;i<m.length;i+=MESH_STRIDE){for(let j=0;j<MESH_STRIDE;j++)assert(Number.isFinite(m.data[i+j]));high=Math.max(high,m.data[i+1]);low=Math.min(low,m.data[i+1]);if(Math.abs(m.data[i+4])<.5)side++;}
   assert(high>.8&&low<-.2&&side>100,'height, depth and lit side faces exist');
  }
 }
});
test('all classes/ranks/teams have equipment-led geometry and animation changes no game state',()=>{
 for(const theme of ['industrial','fantasy'])for(const type of ['sword','shield','spear','bow','horse','mage','shooter','bandit'])for(const rank of ['lower','advanced'])for(const team of type==='bandit'?['enemy']:['ally','enemy']){
  const s=createGame(),u=unit({id:'actor',type,rank,x:2,y:3},team),target=unit({id:'target',type:'sword',x:3,y:3},'enemy');s.units=[u,target];
  const before=structuredClone(s),idle=new Mesh(),active=new Mesh();
  unitMesh(idle,u,theme,unitPose(u,s,{},0,true));
  const view={animation:{kind:'hit',actor:u.id,target:target.id,stage:'windup',progress:.7}};
  unitMesh(active,u,theme,unitPose(u,s,view,300,false));
  assert(idle.triangles>300&&active.triangles>300);assert.notDeepEqual(active.data.subarray(0,active.length),idle.data.subarray(0,idle.length));
  assert.deepEqual(s,before);for(let i=0;i<active.length;i++)assert(Number.isFinite(active.data[i]));
 }
});
test('move direction, healing, cannon recoil, death and reduced motion follow shared observations',()=>{
 const s=createGame(),u=s.units[0],target=s.units[1];
 const move={motion:{id:u.id,x:2,y:3.25},animation:{kind:'move',actor:u.id,path:[{x:2,y:3},{x:2,y:4}],segment:1,progress:.25}};
 const p=unitPose(u,s,move,0,false);assert.equal(p.facing,0);assert.equal(p.walking,true);assert(p.step>0);assert.equal(p.x,2);
 const v={animation:{kind:'heal',actor:u.id,target:target.id,stage:'windup',progress:.7}};
 assert(unitPose(u,s,v,0,false).heal);assert(unitPose(u,s,v,0,false).attack>0);
 assert.equal(unitPose(u,s,v,0,true).attack,0);assert.equal(unitPose(u,s,{},600,true).breath,0);
 assert.equal(unitPose(u,s,{animation:{kind:'hit',actor:u.id,stage:'hitstop'}},0,false).fire,1);
 assert.equal(unitPose(u,s,{ghost:{unit:u,progress:.5}},0,false).death,.5);
});
