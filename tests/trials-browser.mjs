import assert from 'node:assert/strict';
import {setup,launch} from './browser-helpers.mjs';
import {createGame} from '../engine.js';
import * as E from '../engine.js';
import {FANTASY_COLORS} from '../fantasy-theme.js';
import {LAB_CASES} from '../tactical-lab.js';
let browser;
try{
 browser=await launch();
 for(const [width,height] of [[320,568],[360,740],[390,844],[844,390]]){
  const t=await setup(browser,width,height),{page}=t;
  await t.reset();
  const raw=await page.evaluate(()=>localStorage.getItem('field-command-save-v1'));
  // A real continuous touch starts on a reserve icon and ends on the map.
  async function begin(){
   await page.locator('#orders button').filter({hasText:'出撃'}).click();
   const box=await page.locator('#deploymentList button').first().boundingBox();
   const p={x:box.x+box.width/2,y:box.y+box.height/2};
   await t.touch('touchStart',[p]);return p;
  }
  const before=await t.state(),cam=await t.camera(),from=await begin();
  const actor=E.sortieUnit(before,E.reserves(before)[0].id);
  const dest=E.reachable(before,actor).find(p=>p.x===actor.x&&p.y===actor.y-2);
  assert.ok(dest);const to=await t.point(dest);
  await t.touch('touchMove',[{x:from.x+12,y:from.y-12}]);
  await t.touch('touchMove',[to]);
  assert.equal((await t.draft()).dragging,true);
  assert.deepEqual(await t.state(),before,'holding a reserve never changes the engine');
  assert.equal(await page.evaluate(()=>localStorage.getItem('field-command-save-v1')),raw);
  await t.touch('touchEnd',[]);await t.settled();
  assert.equal((await t.state()).deployedThisTurn,1,'icon release deploys directly');
  assert.equal((await t.state()).metrics.commands,1);
  assert.deepEqual(await t.camera(),cam,'direct sortie never pans to the castle');
  // A second sortie still works and survives storage restoration.
  const b2=await t.state(),f2=await begin(),a2=E.sortieUnit(b2,E.reserves(b2)[0].id);
  const d2=E.reachable(b2,a2).find(p=>p.x===a2.x-1&&p.y===a2.y-1);
  await t.touch('touchMove',[{x:f2.x+12,y:f2.y-12}]);await t.touch('touchMove',[await t.point(d2)]);await t.touch('touchEnd',[]);await t.settled();
  assert.equal((await t.state()).deployedThisTurn,2);await page.reload();await page.waitForFunction(()=>!!window.srpgDebug);assert.equal((await t.state()).deployedThisTurn,2);
  // pointercancel, a second finger and outside release are all atomic cancels.
  for(const kind of ['cancel','multi','outside']){
   await t.reset();const state=await t.state(),camera=await t.camera(),saved=await page.evaluate(()=>localStorage.getItem('field-command-save-v1'));
   const f=await begin();await t.touch('touchMove',[{x:f.x+12,y:f.y-12}]);
   const p=await t.point(dest);await t.touch('touchMove',[p]);
   if(kind==='cancel')await t.touch('touchCancel',[]);
   else if(kind==='multi'){await t.touch('touchStart',[p,{x:15,y:15}]);await t.touch('touchEnd',[]);}
   else{await t.touch('touchMove',[{x:5,y:5}]);await t.touch('touchEnd',[]);}
   assert.deepEqual(await t.state(),state,kind);assert.deepEqual(await t.camera(),camera,kind+' camera');
   assert.equal(await page.evaluate(()=>localStorage.getItem('field-command-save-v1')),saved);
   assert.equal((await t.draft()).dragging,false);
  }
  // A returned reserve has acted=true in saves, but a new sortie must still
  // obtain a usable virtual actor (the command resets acted atomically).
  const returned=createGame();returned.turn=2;returned.units[0].acted=true;
  await t.reset(returned);const rf=await begin();
  await t.touch('touchMove',[{x:rf.x+12,y:rf.y-12}]);
  await t.touch('touchMove',[await t.point(dest)]);await t.touch('touchEnd',[]);await t.settled();
  assert.equal((await t.state()).deployedThisTurn,1,'returned reserve can sortie again');
  await t.reset();
  // Old two-step interaction remains available through a real menu switch.
  await page.locator('#menuBtn').click();await page.locator('#directSortieToggle').click();
  await page.locator('#closeModal').click();await begin();await t.touch('touchEnd',[]);
  assert.equal(await page.locator('#deploymentList .direct-sortie').count(),0);
  await page.locator('#deploymentList button').first().click();assert.equal((await t.draft()).sortie,true);
  await page.locator('#menuBtn').click();await page.locator('#directSortieToggle').click();await page.locator('#closeModal').click();
  await page.goto(t.page.url().split('?')[0]+'?sample=01&debug=1');await page.waitForFunction(()=>!!window.srpgDebug);
  const sample=await t.state(),camera=await t.camera(),save=await page.evaluate(()=>localStorage.getItem('field-command-save-v1'));
  const images=[];
  for(const style of ['original','fantasy','industrial']){
   await page.locator('#menuBtn').click();await page.locator(`[data-style="${style}"]`).click();
   assert.equal((await t.draft()).sampleTheme,style);assert.deepEqual(await t.state(),sample);assert.deepEqual(await t.camera(),camera);
   images.push(await page.locator('#battlefield').evaluate(c=>c.toDataURL()));
   if(style==='fantasy'){
    const rgb=await page.locator('#minimap').evaluate(c=>[...c.getContext('2d').getImageData(2,2,1,1).data].slice(0,3));
    assert.deepEqual(rgb,FANTASY_COLORS['.'].match(/[a-f\d]{2}/gi).map(h=>parseInt(h,16)));
   }
   await page.screenshot({path:`test-results/trial-${style}-${width}.png`});
  }
  assert.equal(new Set(images).size,3,'three distinct rendered worlds');
  // Every lab uses actual playback yet preserves the sample and main save.
  await page.locator('#menuBtn').click();await page.locator('#openTacticalLab').click();
  for(const spec of LAB_CASES){
   await page.locator(`[data-lab-case="${spec.id}"]`).click();
   await page.waitForFunction(()=>[...document.querySelectorAll('[data-lab-case]')].every(b=>!b.disabled));
   assert.deepEqual(await t.state(),sample);
   assert.equal(await page.evaluate(()=>localStorage.getItem('field-command-save-v1')),save);
  }
  await page.locator('#closeModal').click();assert.deepEqual(await t.camera(),camera);
  assert.deepEqual(t.errors,[]);await t.context.close();
 }
 console.log('3 live styles, 6 lab cases, continuous reserve input/cancellation/legacy switch/storage passed at 4 sizes');
}finally{await browser?.close();}
