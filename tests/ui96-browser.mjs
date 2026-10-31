// Issue #96: specialists show no Attack they cannot use, the end-turn button names the
// enemy phase and offers a way back, and trial A moves on release / waits on a still hold.
import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {attackTargets} from '../ui-model.js';
import {launch,setup} from './browser-helpers.mjs';
let browser;const results=[];
// Two free tiles above the castle: the start of each unit and a quiet destination.
function board(){
 const s=E.createGame(),camp=s.map.camp,sword=s.units.find(u=>u.team==='ally'&&u.type==='sword'),mage=s.units.find(u=>u.team==='ally'&&u.skill==='heal');
 const free=[];for(let y=camp.y-1;y>=camp.y-6&&free.length<4;y--)for(const x of [camp.x,camp.x-1,camp.x+1])if(E.terrain(s,{x,y})&&!E.at(s,{x,y})&&free.length<4)free.push({x,y});
 Object.assign(sword,{deployed:true,...free[0]});Object.assign(mage,{deployed:true,...free[1]});
 return {s,sword,mage,free};
}
try{
 for(const [width,height]of [[390,844],[844,390]]){
  browser=await launch();
  const t=await setup(browser,width,height),{page}=t;
  const {s,sword,mage}=board();await t.reset(s);
  // Healing mage: no Attack control at all, and a moved wait says P3 is off this turn.
  await t.select(mage.id);
  assert.equal(await page.locator('#attackOrder').count(),0,'mage has no Attack button');
  assert.ok(await page.locator('#waitOrder').isVisible());
  // End turn names the enemy phase with the count of board units still to act.
  assert.match(await page.locator('#endTurn').innerText(),/敵フェーズへ（未行動2）/);
  await page.locator('#endTurn').click();
  assert.match(await page.locator('#modalBody').innerText(),/盤上の未行動 2部隊/);
  await page.locator('#endConfirm button').filter({hasText:'未行動の部隊へ戻る'}).click();
  assert.equal(await page.locator('#modal').evaluate(d=>d.open),false);
  assert.ok((await t.draft()).selected,'going back selects an unacted unit');
  assert.equal((await t.state()).phase,1,'nothing was consumed');
  // Trial A: release on an empty legal tile moves and waits at once.
  await page.evaluate(()=>localStorage.setItem('field-command-direct-move','true'));
  const again=board();await t.reset(again.s);
  const from={x:again.sword.x,y:again.sword.y},route=E.reachable(again.s,again.sword).find(p=>E.dist(p,from)===2&&!attackTargets(again.s,again.sword,p).length);
  assert.ok(route,'a quiet destination exists');
  await t.slide(from,route);await t.settled();
  let after=(await t.state()).units.find(u=>u.id===again.sword.id);
  assert.deepEqual({x:after.x,y:after.y,acted:after.acted},{x:route.x,y:route.y,acted:true},'release moves and waits');
  // A still 0.2s hold on the mage waits in place.
  const m={x:again.mage.x,y:again.mage.y},a=await t.point(m);
  await t.touch('touchStart',[a]);await page.waitForTimeout(320);await t.touch('touchEnd',[]);await t.settled();
  after=(await t.state()).units.find(u=>u.id===again.mage.id);
  assert.deepEqual({x:after.x,y:after.y,acted:after.acted},{...m,acted:true},'still hold waits in place');
  await page.evaluate(()=>localStorage.removeItem('field-command-direct-move'));
  assert.deepEqual(t.errors,[]);results.push({width,height,mage:true,endTurn:true,trialA:true});
  await browser.close();browser=null;
 }
 console.log(JSON.stringify(results));
}finally{if(browser?.isConnected())await browser.close();}
