import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {unit} from '../data.js';
import {launch,setup,base} from './browser-helpers.mjs';
const browser=await launch(),results=[];
const fixture=()=>{const s=E.createGame();s.units=[unit({id:'a',name:'先鋒',type:'sword',x:4,y:16},'ally'),unit({id:'e',name:'敵弓兵',type:'bow',x:5,y:13,ai:'hold'},'enemy')];return s;};
const origin={x:4,y:16},step={x:4,y:15},other={x:3,y:15};
async function center(page,p){await page.locator('#mapViewport').evaluate((e,p)=>{const s=window.srpgDebug.snapshot(),tile=document.querySelector('#battlefield').getBoundingClientRect().width/s.map.w;e.scrollLeft=(p.x+.5)*tile-e.clientWidth/2;e.scrollTop=(p.y+.5)*tile-e.clientHeight/2;},p);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
try{
 for(const [width,height]of [[320,740],[360,800],[390,844],[844,390]]){
  const t=await setup(browser,width,height),{page}=t;
  await t.reset(fixture());await page.locator('#toolsToggle').click();await page.locator('#zoomIn').click();await page.locator('#zoomIn').click();await center(page,step);
  const before=await t.state(),camera=await t.camera(),at=await t.point(step);await t.touch('touchStart',[await t.point(origin)]);
  for(let i=0;i<5;i++){await t.touch('touchMove',[{x:at.x-18+i*9,y:at.y}]);await page.waitForTimeout(60);}
  assert.equal((await t.draft()).moveArmed,false,'slow motion inside one enlarged cell is not a stop');
  for(const dx of [1,-1,2,-2]){await t.touch('touchMove',[{x:at.x+18+dx,y:at.y+1}]);await page.waitForTimeout(45);}
  await page.waitForFunction(()=>window.srpgDebug.draft().moveArmed===true);
  assert.deepEqual(await t.state(),before,'holding only changes the draft');
  await t.touch('touchEnd',[]);await t.settled();const expected=structuredClone(before);assert(E.act(expected,'a',step,'wait').ok);assert.deepEqual(await t.state(),expected);
  assert.deepEqual(await t.camera(),camera);await page.locator('#moveUndo').click();assert.deepEqual(await t.state(),before);
  // Corrections require another deliberate stop. A pass-through is still fixed.
  await t.reset(fixture());await center(page,step);const beforeCorrection=await t.state(),stableCamera=await t.camera();
  await t.slide(origin,step,{end:false});await page.waitForFunction(()=>window.srpgDebug.draft().moveArmed===true);
  await t.touch('touchMove',[await t.point(other)]);assert.deepEqual((await t.draft()).dest,step);
  await page.waitForFunction(()=>{const v=window.srpgDebug.draft();return v.moveArmed&&v.dest.x===3&&v.dest.y===15;});
  assert.deepEqual(await t.state(),beforeCorrection);assert.match(await page.locator('#commandHint').innerText(),/止め直し/);
  await t.touch('touchEnd',[]);await t.settled();const corrected=structuredClone(beforeCorrection);assert(E.act(corrected,'a',other,'wait').ok);assert.deepEqual(await t.state(),corrected);
  assert.equal((await t.state()).metrics.commands,1);assert.deepEqual(await t.camera(),stableCamera);await page.locator('#moveUndo').click();assert.deepEqual(await t.state(),beforeCorrection);
  // Cancel while the second stop is pending; its callback and queued paint cannot return.
  for(const cancel of ['pointer','multitouch','blur']){
   await t.reset(fixture());await center(page,step);const saved=await page.evaluate(()=>localStorage.getItem('field-command-save-v1'));
   await t.slide(origin,step,{end:false});await page.waitForFunction(()=>window.srpgDebug.draft().moveArmed===true);
   await t.touch('touchMove',[await t.point(other)]);
   if(cancel==='pointer')await t.touch('touchCancel',[]);
   else if(cancel==='multitouch'){await t.touch('touchStart',[await t.point(other),await t.point({x:7,y:15})]);await t.touch('touchEnd',[]);}
   else{await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await t.touch('touchEnd',[]);}
   await page.waitForTimeout(280);assert.deepEqual(await t.state(),fixture());assert.equal((await t.draft()).dragging??false,false);assert.equal((await t.draft()).moveArmed??false,false);
   assert.equal(await page.evaluate(()=>localStorage.getItem('field-command-save-v1')),saved,'cancel never changes the durable state');
  }
  if(width===390){
   const bow=fixture();bow.units[0]=unit({id:'a',name:'弓兵',type:'bow',x:4,y:16},'ally');
   const firing={x:4,y:14},passing={x:3,y:14};await t.reset(bow);await center(page,step);
   await t.slide(origin,firing);assert.deepEqual((await t.draft()).dest,firing);
   await t.slide(firing,passing,{end:false});await page.waitForTimeout(320);
   assert.deepEqual((await t.draft()).dest,firing,'continuing an already drawn route keeps its explicit firing point, even during a pause');
   await t.touch('touchMove',[await t.point({x:5,y:13})]);await t.touch('touchEnd',[]);await t.settled();
   const fired=structuredClone(bow);assert(E.act(fired,'a',firing,'attack','e').ok);assert.deepEqual(await t.state(),fired);
  }
  assert.deepEqual(t.errors,[]);results.push({width,height,slowSlide:true,tremor:true,correction:true,undo:true,cancel:true});await t.context.close();
 }
 // Actual sample sessions: sortie, enemy phase, held correction, then the next command.
 for(const map of ['01','04'])for(const style of ['industrial','fantasy']){
  const t=await setup(browser),{page}=t;await page.goto(`${base}/?sample=${map}&style=${style}&debug=1`);await page.waitForFunction(()=>!!window.srpgDebug);
  assert.equal((await page.evaluate(()=>window.srpgDebug.polygon())).active,1);
  const initial=await t.state(),first=E.reserves(initial).find(u=>u.type==='sword'),actor=E.sortieUnit(initial,first.id),exit=E.reachable(initial,actor).find(p=>E.dist(actor,p)===1&&!E.at(initial,p));assert(exit);
  await page.locator('#orders button').filter({hasText:'出撃可'}).click();await page.locator('#deploymentList button').filter({hasText:first.name}).click();await center(page,initial.map.camp);
  await t.slide(initial.map.camp,exit);await t.settled();await t.endTurn();
  const before=await t.state(),u=before.units.find(u=>u.id===first.id);assert(u.alive&&!u.acted);
  const choices=E.reachable(before,u).filter(p=>E.dist(u,p)===1&&!E.at(before,p));assert(choices.length>=2);
  const [one,two]=choices;await center(page,u);const camera=await t.camera();
  await t.slide(u,one,{end:false});await page.waitForFunction(()=>window.srpgDebug.draft().moveArmed===true);
  await t.touch('touchMove',[await t.point(two)]);await page.waitForFunction(p=>{const v=window.srpgDebug.draft();return v.dest.x===p.x&&v.dest.y===p.y;},two);
  await t.touch('touchEnd',[]);await t.settled();const expected=structuredClone(before);assert(E.act(expected,u.id,two,'wait').ok);assert.deepEqual(await t.state(),expected);
  assert.deepEqual(await t.camera(),camera);assert.equal((await page.evaluate(()=>window.srpgDebug.polygon())).active,1);assert.equal(await page.locator('#endTurn').isEnabled(),true);assert.deepEqual(t.errors,[]);
  results.push({map,style,actualWebGL:true,sortieAndEnemyPhase:true,correction:true,nextCommand:true});await t.context.close();
 }
 console.log(JSON.stringify(results));
}finally{await browser.close();}
