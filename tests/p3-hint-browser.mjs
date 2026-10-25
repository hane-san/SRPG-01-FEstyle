// Issues #79/#81: a still specialist marks today's P3 candidate on the map, an empty
// specialist says why P3 is off, and map 01 coaches with one idle line, not a modal.
import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {launch,setup} from './browser-helpers.mjs';
let browser;const results=[];
// Reads the painted battlefield pixel inside a tile, in map pixels (32 per tile).
const pixel=(page,mx,my)=>page.locator('#battlefield').evaluate((c,[mx,my])=>{
 const w=window.srpgDebug.snapshot().map.w,k=c.width/(w*32);
 return [...c.getContext('2d').getImageData(Math.round(mx*k),Math.round(my*k),1,1).data].slice(0,3);
},[mx,my]);
// The mark is a translucent plum badge; scaling and blending shift it a few levels.
const isMark=([r,g,b])=>Math.abs(r-0x6b)<=16&&Math.abs(g-0x45)<=16&&Math.abs(b-0x92)<=16;
try{
 for(const [width,height]of [[320,568],[390,844],[844,390]]){
  browser=await launch();
  const t=await setup(browser,width,height),{page}=t;
  const s=E.createGame(),shooter=s.units.find(u=>u.team==='ally'&&u.type==='shooter'),sword=s.units.find(u=>u.team==='ally'&&u.type==='sword');
  const enemy=E.alive(s,'enemy').sort((a,b)=>b.y-a.y)[0];
  // A free tile two or three steps from the enemy keeps it inside artillery range.
  const spot=[[0,3],[0,2],[1,2],[-1,2],[2,1],[-2,1],[3,0],[-3,0]].map(([dx,dy])=>({x:enemy.x+dx,y:enemy.y+dy}))
   .find(p=>E.terrain(s,p)&&!E.at(s,p)&&E.inRange(p,enemy,E.supportRange(shooter)));
  assert.ok(spot,'test needs a free tile in artillery range');
  Object.assign(shooter,{deployed:true,...spot});
  await t.reset(s);
  // Idle dock on map 01: the first useful gesture is the specialist's P3, said in one line.
  assert.match(await page.locator('#orders').innerText(),/動かずに待機すると、P3で支援/);
  await t.select(shooter.id);
  assert.ok(isMark(await pixel(page,enemy.x*32+3,enemy.y*32+23)),'P3 candidate mark on the enemy');
  // No ammo: no mark, and the command line names the reason.
  const empty=E.createGame();Object.assign(empty.units.find(u=>u.id===shooter.id),{deployed:true,...spot,charges:0});
  Object.assign(empty.units.find(u=>u.id===sword.id),{deployed:true,...empty.map.camp});
  await t.reset(empty);
  assert.match(await page.locator('#orders').innerText(),/敵へスライドして離すと、そのまま攻撃/);
  await t.select(shooter.id);
  assert.ok(!isMark(await pixel(page,enemy.x*32+3,enemy.y*32+23)),'no P3 mark without ammo');
  assert.match(await page.locator('#commandDock').innerText(),/弾薬0・P3なし/);
  assert.deepEqual(t.errors,[]);results.push({width,height,mark:true,empty:true});
  await browser.close();browser=null;
 }
 console.log(JSON.stringify(results));
}finally{if(browser?.isConnected())await browser.close();}
