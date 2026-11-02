import assert from 'node:assert/strict';
import {launch,base} from './browser-helpers.mjs';
import * as E from '../engine.js';
let browser;const results=[];
try{
 browser=await launch();
 for(const [width,height] of [[320,740],[360,800],[390,844],[844,390]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const page=await context.newPage(),cdp=await context.newCDPSession(page),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const snapshot=()=>page.evaluate(()=>window.srpgDebug.snapshot());
  for(const map of ['01','04']){
   let expected=null;
   for(const style of ['original','industrial','fantasy']){
    await page.goto(`${base}/?sample=${map}&style=${style}&debug=1`);await page.waitForFunction(()=>!!window.srpgDebug);
    await page.evaluate(()=>localStorage.setItem('field-command-save-v1','unchanged-campaign'));
    const before=await snapshot(),stats=await page.evaluate(()=>window.srpgDebug.polygon());
    assert.equal(stats.active,style==='original'?0:1,`${map}/${style} must really use WebGL`);
    if(stats.active){assert.match(stats.context,/WebGL/);assert(stats.triangles>1000);assert.equal(stats.buffers,2);assert.equal(stats.programs,1);}
    await page.locator('#orders button').filter({hasText:'出撃可'}).click();await page.locator('#deploymentList button').first().click();
    const actor=E.sortieUnit(before,E.reserves(before)[0].id),dest=E.reachable(before,actor).find(p=>E.dist(p,actor)===1&&!E.alive(before,'enemy').some(e=>E.inRange({...actor,...p},e)));
    assert(dest);
    const point=p=>page.locator('#battlefield').evaluate((c,p)=>{const r=c.getBoundingClientRect(),t=r.width/window.srpgDebug.snapshot().map.w;return {x:r.left+(p.x+.5)*t,y:r.top+(p.y+.5)*t};},p);
    const from=await point(before.map.camp),to=await point(dest);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...from,id:1,radiusX:2,radiusY:2,force:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...to,id:1,radiusX:2,radiusY:2,force:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForFunction(()=>!window.srpgDebug.busy()&&window.srpgDebug.snapshot().metrics.commands===1);
    for(let i=0;i<2;i++){
     const turn=(await snapshot()).turn;await page.locator('#endTurn').click();
     if(await page.locator('#endConfirm button').count())await page.locator('#endConfirm button').first().click();
     await page.waitForFunction(t=>!window.srpgDebug.busy()&&window.srpgDebug.snapshot().turn===t+1,turn);
    }
    const after=await snapshot();if(!expected)expected=after;else assert.deepEqual(after,expected,'same commands resolve identically in all three renderers');
    const camera=await page.locator('#mapViewport').evaluate(e=>[e.scrollLeft,e.scrollTop,e.clientWidth,e.clientHeight]);
    const draft=await page.evaluate(()=>window.srpgDebug.draft());
    for(const next of ['industrial','fantasy','original',style]){
     await page.locator('#menuBtn').click();await page.locator(`#styleChoices [data-style="${next}"]`).click();
     assert.deepEqual(await snapshot(),after);assert.deepEqual(await page.locator('#mapViewport').evaluate(e=>[e.scrollLeft,e.scrollTop,e.clientWidth,e.clientHeight]),camera);
     const now=await page.evaluate(()=>window.srpgDebug.draft());assert.deepEqual(now.dest,draft.dest);assert.equal(now.selected,draft.selected);
     const r=await page.evaluate(()=>window.srpgDebug.polygon());assert.equal(r.active,next==='original'?0:1);assert(r.buffers<=2&&r.programs<=1);
    }
    assert.equal(await page.evaluate(()=>localStorage.getItem('field-command-save-v1')),'unchanged-campaign');
    if(style!=='original')results.push({width,height,map,style,triangles:stats.triangles,gpuBytes:stats.gpuBytes,initialFrameMs:stats.frameMs,stateEqual:true});
   }
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 // Abrupt context loss keeps the battle and leaves the P1 controls usable.
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();
 await page.goto(base+'/?sample=01&style=industrial&debug=1');await page.waitForFunction(()=>!!window.srpgDebug);
 const before=await page.evaluate(()=>window.srpgDebug.snapshot());
 await page.evaluate(()=>window.srpgDebug.losePolygon());
 await page.waitForFunction(()=>window.srpgDebug.draft().sampleTheme==='original');
 assert.deepEqual(await page.evaluate(()=>window.srpgDebug.snapshot()),before);assert.equal(await page.evaluate(()=>window.srpgDebug.busy()),false);
 assert.match(await page.locator('#orders').innerText(),/2Dへ復帰/);assert.equal(await page.locator('#endTurn').isEnabled(),true);
 assert.equal((await page.evaluate(()=>window.srpgDebug.polygon())).active,0);
 await page.locator('#menuBtn').click();await page.locator('#styleChoices [data-style="fantasy"]').click();
 assert.equal((await page.evaluate(()=>window.srpgDebug.polygon())).active,1);assert.deepEqual(await page.evaluate(()=>window.srpgDebug.snapshot()),before);
 await context.close();
 // No WebGL is an explicit playable fallback, never a silent 2D "3D" pass.
 const unavailable=await browser.newContext();await unavailable.addInitScript(()=>{
  const original=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(kind,...rest){return kind==='webgl'?null:original.call(this,kind,...rest);};
 });
 const failed=await unavailable.newPage();await failed.goto(base+'/?sample=04&style=fantasy&debug=1');
 await failed.waitForFunction(()=>window.srpgDebug?.draft().sampleTheme==='original');
 assert.match(await failed.locator('#orders').innerText(),/2Dへ復帰/);assert.equal((await failed.evaluate(()=>window.srpgDebug.snapshot())).turn,1);
 assert.equal(await failed.locator('#endTurn').isEnabled(),true);await unavailable.close();
 // Normal-speed 3D attacks actually change their vertex stream. Lab close
 // deletes its buffers/program, rather than leaving resource cleanup to GC.
 const animated=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
 await animated.addInitScript(()=>{
  const buffers=new Set(),programs=new Set(),seen=new WeakSet(),writes=[];
  window.polygonProbe={live:()=>({buffers:buffers.size,programs:programs.size}),writes};
  const get=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(kind,...args){
   const gl=get.call(this,kind,...args);if(kind!=='webgl'||!gl||seen.has(gl))return gl;seen.add(gl);
   for(const [create,remove,set] of [['createBuffer','deleteBuffer',buffers],['createProgram','deleteProgram',programs]]){
    const add=gl[create].bind(gl),del=gl[remove].bind(gl);gl[create]=(...args)=>{const p=add(...args);if(p)set.add(p);return p;};gl[remove]=p=>{set.delete(p);del(p);};
   }
   const upload=gl.bufferSubData.bind(gl);gl.bufferSubData=(...args)=>{upload(...args);const data=args[2];let hash=0;for(let i=0;i<data.length;i+=97)hash=(Math.imul(hash,31)+Math.round(data[i]*10000))|0;if(writes.length<1000)writes.push(hash);};
   return gl;
  };
 });
 const moving=await animated.newPage();await moving.goto(base+'/?sample=01&style=industrial&debug=1');await moving.waitForFunction(()=>!!window.srpgDebug);
 const untouched=await moving.evaluate(()=>window.srpgDebug.snapshot());
 await moving.locator('#menuBtn').click();await moving.locator('#openTacticalLab').click();
 const startWrites=await moving.evaluate(()=>window.polygonProbe.writes.length);
 for(const spec of ['normal','armour','overkill','support','heal','moved']){
  await moving.locator(`[data-lab-case="${spec}"]`).click();
  await moving.waitForFunction(()=>[...document.querySelectorAll('[data-lab-case]')].every(b=>!b.disabled),null,{timeout:20000});
  assert.match(await moving.locator('#tacticalLabStatus').innerText(),/HP/);
 }
 assert((await moving.evaluate(n=>new Set(window.polygonProbe.writes.slice(n)).size,startWrites))>10,'normal-speed articulated geometry changes');
 assert.deepEqual(await moving.evaluate(()=>window.polygonProbe.live()),{buffers:4,programs:2});
 await moving.locator('#closeModal').click();await moving.waitForFunction(()=>window.polygonProbe.live().buffers===2&&window.polygonProbe.live().programs===1);
 assert.deepEqual(await moving.evaluate(()=>window.polygonProbe.live()),{buffers:2,programs:1});
 assert.deepEqual(await moving.evaluate(()=>window.srpgDebug.snapshot()),untouched);
 // An actual sortie + hit is resolving when WebGL is lost: the result still
 // completes, clears the lock and equals the shared engine's resolved command.
 const first=E.reserves(untouched)[0],actor=E.sortieUnit(untouched,first.id),target=E.alive(untouched,'enemy').find(e=>e.id==='e1');
 const dest=E.reachable(untouched,actor).filter(p=>E.inRange({...actor,...p},target)).sort((a,b)=>a.cost-b.cost||a.y-b.y||a.x-b.x)[0];assert(dest);
 const resolved=structuredClone(untouched);assert(E.deployAndAct(resolved,first.id,dest,'attack',target.id).ok);
 await moving.locator('#orders button').filter({hasText:'出撃可'}).click();await moving.locator('#deploymentList button').first().click();
 const cdp=await animated.newCDPSession(moving),point=p=>moving.locator('#battlefield').evaluate((c,p)=>{const r=c.getBoundingClientRect(),t=r.width/window.srpgDebug.snapshot().map.w;return {x:r.left+(p.x+.5)*t,y:r.top+(p.y+.5)*t};},p);
 const touch=(type,p)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:p?[{...p,id:1,radiusX:2,radiusY:2,force:1}]:[]});
 await touch('touchStart',await point(untouched.map.camp));await touch('touchMove',await point(dest));await moving.waitForTimeout(250);
 await touch('touchMove',await point(target));await touch('touchEnd'); // Releasing over the enemy commits directly (#77).
 await moving.waitForFunction(()=>window.srpgDebug.busy());await moving.evaluate(()=>window.srpgDebug.losePolygon());
 await moving.waitForFunction(()=>!window.srpgDebug.busy(),null,{timeout:20000});
 assert.deepEqual(await moving.evaluate(()=>window.srpgDebug.snapshot()),resolved,'context loss cannot lose a committed attack');
 assert.equal(await moving.evaluate(()=>window.srpgDebug.draft().sampleTheme),'original');await animated.close();
 console.log(JSON.stringify({results,contextLoss:true,noWebGL:true}));
}finally{if(browser?.isConnected())await browser.close();}
