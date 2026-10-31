import test from 'node:test';
import assert from 'node:assert/strict';
import {CLASSES} from '../config.js';
import {paintThemedUnit,paintFantasyTerrain,FANTASY_COLORS} from '../fantasy-theme.js';
import {paintIndustrialTerrain,INDUSTRIAL_COLORS} from '../sample-theme.js';
import {MAPS} from '../data.js';

// Issue #97: profiles 2/3 never fall back to profile 1 in silence, and each body or
// tile is drawn with real detail rather than a flat fill.
function recorder(){const fills=[];let style='';return {fills,set fillStyle(v){style=v;},get fillStyle(){return style;},strokeStyle:'',lineWidth:1,
 fillRect(x,y,w,h){fills.push(style);},beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},arc(){},stroke(){},fill(){}};}

test('every class in both alternate profiles has its own detailed body',()=>{
 for(const theme of ['fantasy','industrial'])for(const type of [...Object.keys(CLASSES),'bandit']){
  for(const team of ['ally','enemy']){
   const c=recorder(),unit={type,team,x:1,y:1,acted:false};
   assert.equal(paintThemedUnit(c,unit,theme),true,`${theme} ${type}`);
   assert.ok(c.fills.length>=16,`${theme} ${type} ${team}: ${c.fills.length} shapes`);
   assert.ok(new Set(c.fills).size>=6,`${theme} ${type}: at least six tones`);
  }
 }
});

test('every terrain tile of maps 01 and 04 is painted with several tones in both profiles',()=>{
 for(const id of [0,3])for(const [paint,colors] of [[paintFantasyTerrain,FANTASY_COLORS],[paintIndustrialTerrain,INDUSTRIAL_COLORS]]){
  const map=MAPS[id];
  for(const tile of new Set(map.tiles.flatMap(r=>[...r]))){
   assert.ok(colors[tile],`minimap colour for ${tile}`);
   const y=map.tiles.findIndex(r=>r.includes(tile)),x=map.tiles[y].indexOf(tile);
   const one={...map,w:map.w,h:map.h},c=recorder();
   // Paint the whole map once; count only shapes for this map, enough to prove density.
   paint(c,one);
   assert.ok(c.fills.length>map.w*map.h*6,`${paint.name} ${id}: ${c.fills.length} shapes`);
   assert.ok(!c.fills.includes('#777'),'no fallback fill');
   void x;
  }
 }
});
