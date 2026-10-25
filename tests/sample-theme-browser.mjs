import assert from 'node:assert/strict';
import {RELEASE} from '../config.js';
import {createGame} from '../engine.js';
import {base,launch} from './browser-helpers.mjs';

let browser;
try{
 browser=await launch();
 for(const [width,height] of [[320,568],[390,844]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/?debug=1');
  await page.waitForFunction(()=>!!window.srpgDebug);
  const original={release:RELEASE,state:createGame(1),campaign:false};
  const raw=JSON.stringify(original);
  await page.evaluate(value=>localStorage.setItem('field-command-save-v1',value),raw);
  await page.goto(base+'/?sample=01&debug=1');
  await page.waitForFunction(()=>window.srpgDebug?.snapshot().map?.id===0);
  assert.match((await page.locator('#objective').getAttribute('aria-label'))||'',/勝利/);
  assert.equal((await page.evaluate(()=>window.srpgDebug.snapshot())).map.title,'01 外縁工業地帯');
  assert.equal(await page.evaluate(()=>localStorage.getItem('field-command-save-v1')),raw);
  await page.reload();
  await page.waitForFunction(()=>window.srpgDebug?.snapshot().map?.id===0);
  assert.equal(await page.evaluate(()=>localStorage.getItem('field-command-save-v1')),raw);
  await page.locator('#menuBtn').click();
  await page.getByRole('button',{name:'04 三橋水路戦',exact:true}).click();
  await page.waitForFunction(()=>window.srpgDebug?.snapshot().map?.id===3);
  assert.equal((await page.evaluate(()=>window.srpgDebug.snapshot())).map.title,'04 三橋水路戦');
  assert.equal(await page.evaluate(()=>localStorage.getItem('field-command-save-v1')),raw);
  await page.locator('#menuBtn').click();
  await page.getByRole('button',{name:/本編へ戻る/}).click();
  await page.waitForFunction(()=>window.srpgDebug?.snapshot().map?.id===1);
  assert.equal(await page.evaluate(()=>localStorage.getItem('field-command-save-v1')),raw);
  assert.deepEqual(errors,[]);
  await context.close();
 }
 console.log('Sample 01/04 previews, separate session, reload and original saved battle restoration passed');
}finally{await browser?.close();}
