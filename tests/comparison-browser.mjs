// Issues #92-#94: the trial screen switches enemy AI from the turn checkpoint and hit
// feel without touching the battle, and never writes the campaign save.
import assert from 'node:assert/strict';
import {launch,base} from './browser-helpers.mjs';
let browser;const results=[];
try{
 browser=await launch();
 for(const [width,height] of [[390,844],[844,390]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/?debug=1');await page.waitForFunction(()=>!!window.srpgDebug);
  await page.evaluate(()=>localStorage.setItem('field-command-save-v1','{"campaign":"untouched"}'));
  await page.goto(base+'/?sample=04&debug=1');await page.waitForFunction(()=>!!window.srpgDebug);
  const state=()=>page.evaluate(()=>window.srpgDebug.snapshot());
  assert.equal((await state()).trial.ai,'current');
  const opening=await state();
  // Enemy AI: restart from the T1 checkpoint with the line profile.
  await page.locator('#menuBtn').click();
  await page.locator('#aiChoices [data-ai="line"]').click();
  const line=await state();
  assert.equal(line.trial.ai,'line');assert.equal(line.turn,1);
  assert.deepEqual({...line,trial:null},{...opening,trial:null},'same board, only the profile differs');
  assert.match(page.url(),/ai=line/);
  // Hit feel: presentation only, the battle state does not move.
  await page.locator('#menuBtn').click();
  await page.locator('#hitChoices [data-hit="weighty"]').click();
  assert.deepEqual(await state(),line);assert.match(page.url(),/hit=weighty/);
  await page.locator('#closeModal').click();
  // Every profile plays enemy turns without errors.
  for(const ai of ['line','lure','current']){
   await page.locator('#menuBtn').click();await page.locator(`#aiChoices [data-ai="${ai}"]`).click();
   for(let i=0;i<2;i++){
    const turn=(await state()).turn;await page.locator('#endTurn').click();
    if(await page.locator('#endConfirm button').count())await page.locator('#endConfirm button').first().click();
    await page.waitForFunction(t=>!window.srpgDebug.busy()&&window.srpgDebug.snapshot().turn>t,turn,{timeout:20000});
   }
   assert.equal((await state()).trial.ai,ai);
   // Back to the checkpoint of the current turn keeps the turn and the profile.
   const turn=(await state()).turn;await page.locator('#menuBtn').click();
   await page.locator('#comparisonControls button').filter({hasText:'同じ状態からやり直す'}).click();
   assert.equal((await state()).turn,turn);
  }
  assert.equal(await page.evaluate(()=>localStorage.getItem('field-command-save-v1')),'{"campaign":"untouched"}','campaign save untouched');
  assert.deepEqual(errors,[]);results.push({width,height,ai:true,hit:true,save:'untouched'});await context.close();
 }
 console.log(JSON.stringify(results));
}finally{if(browser?.isConnected())await browser.close();}
