import assert from 'node:assert/strict';
import {RELEASE} from '../config.js';
import {createGame} from '../engine.js';
import * as E from '../engine.js';
import {mkdirSync} from 'node:fs';
import {base,launch} from './browser-helpers.mjs';
import {INDUSTRIAL_COLORS} from '../sample-theme.js';

let browser;
try{
 browser=await launch();
 mkdirSync('test-results',{recursive:true});
 for(const [width,height] of [[320,568],[360,740],[390,844],[844,390]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  // Product links intentionally omit debug. Enable observation before every
  // document's modules run, including navigation through the real menu links.
  await context.addInitScript(()=>{
   const url=new URL(location.href);url.searchParams.set('debug','1');
   history.replaceState(null,'',url.href);
  });
  const page=await context.newPage(),errors=[];
  const cdp=await context.newCDPSession(page);
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/?debug=1');
  await page.waitForFunction(()=>!!window.srpgDebug);
  const original={release:RELEASE,state:createGame(1),campaign:true};
  original.state.turn=3;
  Object.assign(original.state.units.find(u=>u.id==='a1'),{deployed:true,x:7,y:16,hp:4});
  const raw=JSON.stringify(original);
  await page.evaluate(value=>localStorage.setItem('field-command-save-v1',value),raw);
  async function checkMinimap(industrial){
   // Sample an actual terrain pixel away from units and the viewport outline.
   const check=async label=>{
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const result=await page.locator('#minimap').evaluate(c=>{
     const s=window.srpgDebug.snapshot(),x=Math.floor(32/s.map.w),y=Math.floor(60/s.map.h);
     return {map:s.map.id,tile:s.map.tiles[0][0],rgb:[...c.getContext('2d').getImageData(x,y,1,1).data].slice(0,3)};
    });
    // The saved main fixture is map02; its ordinary ground keeps its old ochre.
    if(!industrial){assert.equal(result.map,1);assert.equal(result.tile,'.');}
    const hex=industrial?INDUSTRIAL_COLORS[result.tile]:'#aa9d6e';
    const expected=hex.match(/[a-f\d]{2}/gi).map(s=>parseInt(s,16));
    assert.deepEqual(result.rgb,expected,`${industrial?'sample':'main'} ${label} minimap ${width}`);
    assert.equal(await page.evaluate(()=>localStorage.getItem('field-command-save-v1')),raw);
   };
   const state=await page.evaluate(()=>window.srpgDebug.snapshot());
   const camera=await page.locator('#mapViewport').evaluate(e=>[e.scrollLeft,e.scrollTop,e.clientWidth,e.clientHeight]);
   await check('initial');
   await page.locator('#mapViewport').evaluate(e=>e.scrollTop=e.scrollTop>50?e.scrollTop-50:50);
   await check('scroll');
   assert.deepEqual(await page.evaluate(()=>window.srpgDebug.snapshot()),state,'pan changes no battle state');
   await page.locator('#toolsToggle').click();await page.locator('#homeBtn').click();
   await check('home');
   assert.deepEqual(await page.locator('#mapViewport').evaluate(e=>[e.clientWidth,e.clientHeight]),camera.slice(2),'home preserves map geometry');
   await page.locator('#zoomIn').click();await check('zoom');
   await page.locator('#zoomOut').click();await check('zoom back');
   await page.locator('#toolsToggle').click();
  }
  await page.goto(base+'/?sample=01&debug=1');
  await page.waitForFunction(()=>window.srpgDebug?.snapshot().map?.id===0);
  assert.match((await page.locator('#objective').getAttribute('aria-label'))||'',/勝利/);
  assert.equal((await page.evaluate(()=>window.srpgDebug.snapshot())).map.title,'01 外縁工業地帯');
  assert.equal(await page.evaluate(()=>localStorage.getItem('field-command-save-v1')),raw);
  await checkMinimap(true);
  async function actInSample(){
   const before=await page.evaluate(()=>window.srpgDebug.snapshot());
   await page.locator('#orders button').filter({hasText:'出撃'}).click();
   await page.locator('#deploymentList button').first().click();
   const actor=E.sortieUnit(before,E.reserves(before)[0].id);
   const dest=E.reachable(before,actor).find(p=>E.dist(p,actor)===1&&!E.alive(before,'enemy').some(e=>E.inRange({...actor,...p},e)));
   assert.ok(dest);
   const point=p=>page.locator('#battlefield').evaluate((e,p)=>{
    const r=e.getBoundingClientRect(),t=r.width/window.srpgDebug.snapshot().map.w;
    return {x:r.left+(p.x+.5)*t,y:r.top+(p.y+.5)*t};
   },p);
   const from=await point(before.map.camp),to=await point(dest);
   const touch=(type,p)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:p?[{...p,id:1,radiusX:2,radiusY:2,force:1}]:[]});
   await touch('touchStart',from);
   for(let i=1;i<=8;i++)await touch('touchMove',{x:from.x+(to.x-from.x)*i/8,y:from.y+(to.y-from.y)*i/8});
   await touch('touchEnd');
   await page.waitForFunction(()=>!window.srpgDebug.busy()&&window.srpgDebug.snapshot().metrics.commands===1);
   assert.equal((await page.evaluate(()=>window.srpgDebug.snapshot())).deployedThisTurn,1);
   await page.locator('#endTurn').click();
   if(await page.locator('#endConfirm button').count())await page.locator('#endConfirm button').click();
   await page.waitForFunction(()=>!window.srpgDebug.busy()&&window.srpgDebug.snapshot().turn===2);
   assert.equal(await page.evaluate(()=>localStorage.getItem('field-command-save-v1')),raw,'commands and turn resolution must not overwrite campaign');
  }
  await actInSample();
  await checkMinimap(true);
  await page.screenshot({path:`test-results/sample01-${width}.png`});
  await page.reload();
  await page.waitForFunction(()=>window.srpgDebug?.snapshot().map?.id===0);
  assert.equal((await page.evaluate(()=>window.srpgDebug.snapshot())).metrics.commands,0,'sample reload starts fresh');
  assert.equal(await page.evaluate(()=>localStorage.getItem('field-command-save-v1')),raw);
  await page.locator('#menuBtn').click();
  await page.getByRole('button',{name:'04 三橋水路戦',exact:true}).click();
  await page.waitForFunction(()=>window.srpgDebug?.snapshot().map?.id===3);
  assert.equal((await page.evaluate(()=>window.srpgDebug.snapshot())).map.title,'04 三橋水路戦');
  assert.equal(await page.evaluate(()=>localStorage.getItem('field-command-save-v1')),raw);
  await checkMinimap(true);
  await actInSample();
  await checkMinimap(true);
  await page.screenshot({path:`test-results/sample04-${width}.png`});
  await page.locator('#menuBtn').click();
  await page.getByRole('button',{name:/このサンプルを再試行/}).click();
  assert.equal((await page.evaluate(()=>window.srpgDebug.snapshot())).metrics.commands,0);
  assert.equal(await page.evaluate(()=>localStorage.getItem('field-command-save-v1')),raw,'sample restart must not write campaign');
  await page.locator('#menuBtn').click();
  await page.getByRole('button',{name:/本編へ戻る/}).click();
  await page.waitForFunction(()=>window.srpgDebug?.snapshot().map?.id===1);
  assert.deepEqual(await page.evaluate(()=>window.srpgDebug.snapshot()),original.state,'original campaign progress is restored');
  assert.equal(await page.evaluate(()=>localStorage.getItem('field-command-save-v1')),raw);
  await checkMinimap(false);
  assert.deepEqual(errors,[]);
  await context.close();
 }
 console.log('Sample 01/04 previews, separate session, reload and original saved battle restoration passed');
}finally{await browser?.close();}
