// Mobile audit: real opening orders, then explicit forecast/cancel/attack and an edge battle.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import * as E from '../engine.js';
import {unit} from '../data.js';
import {launch,setup} from './browser-helpers.mjs';
let browser;const results=[];
try{
 for(const [width,height] of [[360,740],[390,844],[430,932],[390,568]]){
  browser=await launch();const t=await setup(browser,width,height),{page}=t;
  // Main chapter 1, zero allies deployed. No fixture is used for this playthrough.
  if(!await page.locator('#modal').evaluate(e=>e.open))await page.locator('#menuBtn').click();await page.getByRole('button',{name:'第1〜3章を連戦（離脱を引き継ぐ）',exact:true}).click();
  let state=await t.state();assert.equal(E.alive(state,'ally').length,0);
  const camp=state.map.camp,camera=await t.camera();
  await t.tap(camp);await page.waitForFunction(()=>document.querySelector('#modal').open);
  const labels=await page.locator('#deploymentList button').allTextContents();assert.equal(labels.length,9);
  await page.locator('#deploymentList button').first().click();
  assert((await page.locator('#commandHint').innerText()).includes('リオ'),'reserve identity stays visible');
  const firstBefore=await t.state();await t.slide(camp,{x:5,y:14});await t.settled();
  const firstExpected=structuredClone(firstBefore);assert(E.deployAndAct(firstExpected,'a1',{x:5,y:14},'wait').ok);assert.deepEqual(await t.state(),firstExpected);assert.deepEqual(await t.camera(),camera);
  await t.tap(camp);await page.waitForFunction(()=>document.querySelector('#modal').open);await page.locator('#deploymentList button').first().click();
  await t.slide(camp,{x:4,y:15});await t.settled();state=await t.state();assert.equal(state.deployedThisTurn,2);
  assert(state.units.find(u=>u.id==='a1').acted&&state.units.find(u=>u.id==='a2').acted);
  await t.endTurn();state=await t.state();assert.equal(state.phase,1);assert.equal(state.turn,2);assert.equal(state.units.find(u=>u.id==='a1').acted,false);
  // The first troop can be reached through the normal Next control, and an empty-tile tap is immediate wait.
  await page.locator('#nextUnit').click();assert((await t.draft()).selected);
  await t.tap({x:4,y:15});const quietBefore=await t.state();await t.tap({x:3,y:15});await t.settled();
  const quietExpected=structuredClone(quietBefore);assert(E.act(quietExpected,'a2',{x:3,y:15},'wait').ok);assert.deepEqual(await t.state(),quietExpected);
  await t.tap({x:5,y:14});const before=await t.state(),stable=await t.camera();
  const aim=async()=>{await t.slide({x:5,y:14},{x:4,y:13},{end:false});await t.touch('touchMove',[await t.point({x:4,y:12})]);await t.touch('touchEnd',[]);};
  await aim();assert.deepEqual(await t.state(),before,'release is a forecast, never an attack');assert(await page.locator('#attackOrder').isEnabled());
  const preview=await page.locator('#actionPreview').innerText();assert(preview.includes('6')&&preview.includes('反撃'));
  const forecastGeometry=await page.locator('#actionPreview').evaluate(e=>{const r=e.getBoundingClientRect();return [...e.querySelectorAll('.forecast-side > *')].map(c=>{const q=c.getBoundingClientRect();return {text:c.textContent,inside:q.left>=r.left&&q.right<=r.right+.1&&q.top>=r.top-.1&&q.bottom<=r.bottom+.1};});});
  assert(forecastGeometry.every(c=>c.inside),JSON.stringify({width,height,forecastGeometry}));
  await page.screenshot({path:`test-results/mobile-audit-${width}-${height}-forecast.png`});
  await page.locator('#orders button').getByText('戻る',{exact:true}).click();assert.deepEqual(await t.state(),before,'closing forecast consumes nothing');assert.deepEqual(await t.camera(),stable);
  await t.tap({x:5,y:14});await aim();assert.deepEqual(await t.state(),before);
  await page.locator('#attackOrder').evaluate(e=>{e.click();e.click();});await t.settled();
  const expected=structuredClone(before);assert(E.act(expected,'a1',{x:4,y:13},'attack','e1').ok);assert.deepEqual(await t.state(),expected,'double click resolves one full attack/counter');assert.deepEqual(await t.camera(),stable);
  assert.equal(expected.units.find(u=>u.id==='a1').hp,5);assert.equal(expected.units.find(u=>u.id==='e1').hp,4);
  await page.screenshot({path:`test-results/mobile-audit-${width}-${height}-return.png`});
  // Current save and mute survive reload; dialogs must stay independently operable at each portrait size.
  await page.locator('#soundBtn').click();await page.reload();await page.waitForFunction(()=>!!window.srpgDebug);assert.deepEqual(await t.state(),expected);assert.equal((await page.evaluate(()=>srpgDebug.audio())).enabled,false);
  await page.locator('#menuBtn').click();await page.locator('#closeModal').click();assert.equal(await page.locator('#modal').evaluate(e=>e.open),false);
  const targets=await page.locator('footer button,#battleHeader button').evaluateAll(nodes=>nodes.filter(e=>!e.hidden).map(e=>({text:e.textContent,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right})));
  assert(targets.every(r=>r.w>=44&&r.h>=44&&r.left>=0&&r.right<=width),JSON.stringify(targets));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(t.errors,[]);results.push({width,height,naturalOpening:true,attackCounter:true,saveMute:true,targets});await browser.close();browser=null;
 }
 // A short reproduction on the west edge of map04; regular stats/rules are untouched.
 browser=await launch();const t=await setup(browser,390,568),{page}=t,s=E.createGame(3);
 let edge=null;for(let y=2;y<s.map.h-2;y++){const a={x:0,y},e={x:1,y};if([a,e,{x:0,y:y+1}].every(p=>Number.isFinite(E.terrain(s,p)?.cost))){edge={a,e};break;}}
 assert(edge);s.units=[unit({id:'a',name:'左端の味方',type:'sword',...edge.a},'ally'),unit({id:'e',name:'左端の敵',type:'sword',...edge.e,ai:'hold'},'enemy'),unit({id:'b',name:'隣の味方',type:'shield',x:0,y:edge.a.y+1},'ally')];
 await t.reset(s);await t.select('a');const view=await t.draft(),saved=await page.evaluate(()=>localStorage.getItem('field-command-save-v1'));
 await t.slide(edge.a,edge.e,{end:false});await t.touch('touchCancel',[]);assert.deepEqual(await t.state(),s);assert.deepEqual(await t.draft(),view);
 await t.slide(edge.a,edge.e,{end:false});await t.touch('touchStart',[await t.point(edge.e),{x:20,y:20}]);await t.touch('touchEnd',[]);assert.deepEqual(await t.state(),s);assert.equal(await page.evaluate(()=>localStorage.getItem('field-command-save-v1')),saved);
 await t.slide(edge.a,edge.e);assert.deepEqual(await t.state(),s);await page.locator('#attackOrder').click();await t.settled();const end=structuredClone(s);assert(E.act(end,'a',edge.a,'attack','e').ok);assert.deepEqual(await t.state(),end);assert.deepEqual(t.errors,[]);
 await page.screenshot({path:'test-results/mobile-audit-map04-edge.png'});await t.context.close();
 await browser.close();browser=null;
 // The next P1 follows separate P2 hit / P3 heal+artillery / announced P4 damage, with one stable save.
 browser=await launch();const support=await setup(browser,390,844),sp=support.page,phaseState=E.createGame();
 phaseState.units=[unit({id:'m',name:'治療役',type:'mage',x:4,y:16},'ally'),unit({id:'p',name:'負傷味方',type:'shield',x:4,y:15},'ally'),unit({id:'g',name:'砲兵',type:'shooter',x:6,y:16},'ally'),unit({id:'e',name:'敵弓兵',type:'bow',x:6,y:14,ai:'hold'},'enemy')];
 phaseState.units[1].hp=2;phaseState.units[1].acted=true;assert(E.act(phaseState,'m',phaseState.units[0],'wait').ok);assert(E.act(phaseState,'g',phaseState.units[2],'wait').ok);
 phaseState.warnings=[{kind:'cannon',turn:1,cells:[{x:6,y:16}]}];await support.reset(phaseState);
 const phaseExpected=structuredClone(phaseState);E.endTurn(phaseExpected);
 await sp.evaluate(()=>{window.auditPhases=[1];const rail=document.querySelector('#phaseRail');window.auditObserver=new MutationObserver(records=>{for(const record of records)if(record.attributeName==='data-phase'){window.auditPhases.push(Number(record.oldValue),Number(rail.dataset.phase));}});auditObserver.observe(rail,{attributes:true,attributeOldValue:true});});
 await support.endTurn();assert.deepEqual(await support.state(),phaseExpected,'all phases preserve engine hit/heal/event results');const phaseTrace=await sp.evaluate(()=>{auditObserver.disconnect();return [...new Set(auditPhases)];});assert([1,2,3,4].every(phase=>phaseTrace.includes(phase)),phaseTrace);
 assert.equal(phaseExpected.metrics.supports,2);assert.deepEqual(support.errors,[]);results.push({phaseTrace,supports:phaseExpected.metrics.supports,hp:phaseExpected.units.map(u=>({id:u.id,hp:u.hp}))});await support.context.close();
 writeFileSync('test-results/mobile-play-audit.json',JSON.stringify(results,null,2));console.log('mobile play audit: natural campaign sortie/wait/forecast/cancel/attack/counter, targets, reload/mute, map04 edge and interruptions passed',JSON.stringify(results));
}finally{if(browser?.isConnected())await browser.close();}
