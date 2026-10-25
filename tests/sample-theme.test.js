import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MAPS} from '../data.js';
import {INDUSTRIAL_COLORS,paintIndustrialTerrain,paintIndustrialCamp} from '../sample-theme.js';

function fakeCanvas(){
 const rects=[];
 const ctx={
  fillRect:(...args)=>rects.push(args),beginPath(){},moveTo(){},lineTo(){},stroke(){},
  set fillStyle(value){this._fill=value;},get fillStyle(){return this._fill;},
  set strokeStyle(value){this._stroke=value;},get strokeStyle(){return this._stroke;},
  set lineWidth(value){this._width=value;},get lineWidth(){return this._width;}
 };
 return {ctx,rects};
}
test('sample painter supports both maps without changing tile geometry or data',()=>{
 for(const id of [0,3]){
  const map=MAPS[id],before=structuredClone(map),{ctx,rects}=fakeCanvas();
  paintIndustrialTerrain(ctx,map);
  assert.ok(rects.length>map.w*map.h,'each square should be painted');
  assert.deepEqual(map,before,'the painter must not mutate game data');
  assert.deepEqual(Object.keys(INDUSTRIAL_COLORS).sort(),['.','=','f','~','#','+','c','v'].sort());
  const {ctx:spawn,rects:spawnRects}=fakeCanvas();
  paintIndustrialCamp(spawn,32,64);
  assert.ok(spawnRects.length>0);
 }
});
test('preview wiring guards ordinary save, campaign advancement, and changes canvas only',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const render=readFileSync(new URL('../render.js',import.meta.url),'utf8');
 assert.match(app,/if\(!sampleMode\)stored=readSave/);
 assert.match(app,/function save\(state=s\)\{if\(sampleMode\)return;/);
 assert.match(app,/if\(!sampleMode&&s\.status==='victory'/);
 assert.match(app,/\.\/\?sample=01/);
 assert.match(app,/\.\/\?sample=04/);
 assert.match(render,/view\.sampleTheme==='industrial'/);
 assert.match(render,/view\.sampleTheme\|\|null/);
});
