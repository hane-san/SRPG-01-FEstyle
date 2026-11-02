// Issues #92-#94: the trial screen switches enemy AI from the turn checkpoint and hit
// feel without touching the battle, and never writes the campaign save.
import assert from 'node:assert/strict';
import {launch,base} from './browser-helpers.mjs';
let browser;const results=[];
try{
 browser=await launch();
 for(const [width,height] of [[320,740],[360,800],[390,844],[844,390]]){
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
  // World theme music (#104): follows the style by default; the toggle fixes the map's music.
  assert.match(await page.locator('#themeMusicToggle').innerText(),/画風に連動/);
  await page.locator('#themeMusicToggle').click();assert.match(page.url(),/music=fixed/);
  assert.match(await page.locator('#themeMusicToggle').innerText(),/固定/);
  await page.locator('#themeMusicToggle').click();assert.doesNotMatch(page.url(),/music=fixed/);
  assert.equal((await page.evaluate(()=>window.srpgDebug.music())).enabled,false,'switching never turns BGM on');
  await page.locator('#closeModal').click();
  // Every profile plays enemy turns without errors.
  for(const ai of ['line','lure','mixed','current']){
   await page.locator('#menuBtn').click();await page.locator(`#aiChoices [data-ai="${ai}"]`).click();
   if(ai==='mixed'){
    await page.locator('#menuBtn').click();await page.locator('#enemyRoles summary').click();
    assert.equal(await page.locator('#enemyRoles [data-enemy-id]').count(),13);
    assert.match(await page.locator('#enemyRoles [data-enemy-id="extra-3-0-2"]').innerText(),/進軍/);
    assert.match(await page.locator('#enemyRoles [data-enemy-id="extra-3-0-0"]').innerText(),/局所守備/);
    assert.match(await page.locator('#enemyRoles [data-enemy-id="extra-3-0-1"]').innerText(),/縄張り迎撃/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'roles do not widen the phone layout');
    await page.locator('#closeModal').click();
   }
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
  // The short 01 trial exposes the same roles before its first P2, including
  // original hold enemies now explicitly assigned to advance.
  await page.goto(base+'/?sample=01&ai=mixed&debug=1');await page.waitForFunction(()=>!!window.srpgDebug);
  assert.equal((await state()).trial.ai,'mixed');
  await page.locator('#menuBtn').click();await page.locator('#enemyRoles summary').click();
  assert.equal(await page.locator('#enemyRoles [data-enemy-id]').count(),6);
  assert.match(await page.locator('#enemyRoles [data-enemy-id="e1"]').innerText(),/進軍/);
  assert.match(await page.locator('#enemyRoles [data-enemy-id="boss"]').innerText(),/0マス/);
  await page.locator('#closeModal').click();
  await page.reload();await page.waitForFunction(()=>!!window.srpgDebug);
  assert.equal((await state()).trial.ai,'mixed');assert.equal((await state()).turn,1);
  // Trial profile query strings cannot change the saved campaign AI.
  await page.goto(base+'/?ai=mixed&debug=1');await page.waitForFunction(()=>!!window.srpgDebug);
  assert.equal((await state()).trial,undefined);
  assert.equal(await page.evaluate(()=>localStorage.getItem('field-command-save-v1')),'{"campaign":"untouched"}');
  assert.deepEqual(errors,[]);results.push({width,height,ai:true,hit:true,save:'untouched'});await context.close();
 }
 console.log(JSON.stringify(results));
}finally{if(browser?.isConnected())await browser.close();}
