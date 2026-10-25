import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {launch,setup} from './browser-helpers.mjs';

const browser=await launch(),results=[];
try{
 for(const [width,height]of [[320,568],[360,740],[390,844],[844,390]]){
  const t=await setup(browser,width,height),{page}=t;
  const state=E.createGame(2);
  state.warnings=[{kind:'spawn',turn:3,cells:[{x:2,y:1}]},{kind:'cannon',turn:3,cells:[{x:6,y:22},{x:6,y:21}]}];
  await t.reset(state);
  await page.locator('#toolsToggle').click();
  await page.locator('#zoomIn').click();await page.locator('#zoomIn').click();
  await page.locator('#mapViewport').evaluate(e=>{e.scrollTop=0;e.scrollLeft=0;});
  const forecast=page.locator('#forecast');
  await page.waitForFunction(()=>document.querySelector('#forecast')?.dataset.jump==='1');
  const before=await t.camera(),dock=await page.locator('#commandDock').boundingBox();
  const saved=await page.evaluate(()=>localStorage.getItem('field-command-save-v1'));
  assert.ok((await forecast.boundingBox()).height>=44,'touch target height');
  await forecast.tap();
  await page.waitForSelector('.forecast-return');
  assert.notDeepEqual(await t.camera(),before,'go to the announced cannon');
  assert.deepEqual(await page.locator('#commandDock').boundingBox(),dock,'dock stays put');
  await forecast.focus();await page.keyboard.press('Enter');
  assert.deepEqual(await t.camera(),before,'Enter restores exact scroll offsets');
  await forecast.focus();await page.keyboard.press('Space');
  await page.waitForSelector('.forecast-return');
  await forecast.tap();
  assert.deepEqual(await t.camera(),before,'tap restores exact scroll offsets');
  assert.deepEqual(await t.state(),state,'no command or sortie consumed');
  assert.equal(await page.evaluate(()=>localStorage.getItem('field-command-save-v1')),saved,'save unchanged');

  // Explicit navigation invalidates an old return location.
  await forecast.tap();await page.waitForSelector('.forecast-return');
  await page.locator('#homeBtn').evaluate(e=>e.click());
  assert.equal(await page.locator('.forecast-return').count(),0,'home clears the return');
  await page.locator('#mapViewport').evaluate(e=>{e.scrollTop=0;});
  await page.waitForFunction(()=>document.querySelector('#forecast')?.dataset.jump==='1');
  await forecast.tap();await page.waitForSelector('.forecast-return');
  await page.locator('#zoomOut').evaluate(e=>e.click());
  assert.equal(await page.locator('.forecast-return').count(),0,'zoom clears the return');
  await page.locator('#mapViewport').evaluate(e=>{e.scrollTop=0;});
  await page.waitForFunction(()=>document.querySelector('#forecast')?.dataset.jump==='1');
  await forecast.tap();await page.waitForSelector('.forecast-return');
  await page.setViewportSize({width:width+1,height});
  await page.waitForFunction(()=>!document.querySelector('.forecast-return'));
  await page.setViewportSize({width,height});

  // Holding and cancelling an actual unit gesture cannot trigger warning navigation.
  const held=E.createGame(2),u=held.units.find(u=>u.team==='ally'&&u.type==='sword');
  const near=[[1,0],[-1,0],[0,-1]].map(([dx,dy])=>({x:held.map.camp.x+dx,y:held.map.camp.y+dy})).find(p=>E.terrain(held,p)&&!E.at(held,p));
  assert.ok(near);Object.assign(u,{deployed:true,...near});held.warnings=state.warnings;
  await t.reset(held);await t.select(u.id);
  const camera=await t.camera(),point=await t.point(u);
  await t.touch('touchStart',[point]);
  assert.equal((await t.draft()).dragging,true);
  await forecast.evaluate(e=>e.click());
  assert.deepEqual(await t.camera(),camera,'held finger blocks jump');
  await t.touch('touchCancel',[]);
  assert.deepEqual(await t.camera(),camera,'cancel never jumps');
  assert.deepEqual(await t.state(),held);

  await t.reset(E.createGame());
  assert.equal(await forecast.isVisible(),false,'no warning means no new UI');
  assert.equal(await forecast.getAttribute('tabindex'),'-1');
  assert.deepEqual(t.errors,[]);results.push({width,height,return:true,saveUnchanged:true});
  await t.context.close();
 }
 console.log(JSON.stringify(results));
}finally{await browser.close();}
