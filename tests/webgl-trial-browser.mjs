import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import * as E from '../engine.js';
import {unit} from '../data.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TEST_URL||'http://localhost:4173';
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
mkdirSync('test-results',{recursive:true});
const rows=[],reference=new Map();
const onlyCase=Number(process.argv.find(a=>a.startsWith('--case='))?.split('=')[1]||0);let caseNumber=0;

function fixture(id){
 const s=E.createGame(id);s.units=[];
 const free=p=>Number.isFinite(E.terrain(s,p)?.cost)&&!E.at(s,p);
 let origin;
 for(let y=s.map.camp.y-2;y>=s.map.camp.y-6&&!origin;y--)for(let x=2;x<s.map.w-3;x++)if([0,-1,-2].every(dy=>free({x,y:y+dy}))){origin={x,y};break;}
 assert.ok(origin);const enemy={x:origin.x,y:origin.y-2},dest={x:origin.x,y:origin.y-1};
 s.units=[unit({id:'a',name:'先鋒',type:'sword',...origin},'ally'),unit({id:'e',name:'敵賊',type:'bandit',...enemy,ai:'hold'},'enemy')];
 let mage,patient;
 for(let y=origin.y;y>=origin.y-2&&!mage;y--)for(let x=origin.x+2;x<s.map.w-1;x++)if(free({x,y})&&free({x:x+1,y})){mage={x,y};patient={x:x+1,y};break;}
 assert.ok(mage);
 s.units.push(unit({id:'m',name:'治療役',type:'mage',...mage},'ally'),unit({id:'p',name:'負傷兵',type:'shield',...patient},'ally'));s.units[3].hp=4;
 return {s,origin,enemy,dest};
}
async function ready(page,url){await page.goto(url);await page.waitForFunction(()=>!!window.srpgDebug);}
async function point(page,cell){return page.evaluate(cell=>window.srpgDebug.cellToScreen(cell),cell);}
async function gesture(page,cdp,from,to,via=null){
 const a=await point(page,from),b=await point(page,to),points=[];
 if(via)points.push(await point(page,via));points.push(b);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:1,radiusX:2,radiusY:2,force:1}]});
 for(const q of points)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...q,id:1,radiusX:2,radiusY:2,force:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForFunction(()=>!window.srpgDebug.busy());
}
async function battle(page,cdp,id){
 const f=fixture(id);await page.evaluate(s=>window.srpgDebug.loadTrial(s),f.s);
 const initial=await page.evaluate(()=>window.srpgDebug.snapshot()),expected=structuredClone(initial);
 await page.evaluate(()=>window.srpgDebug.beginTrace());
 await gesture(page,cdp,f.origin,f.enemy,f.dest);
 assert.ok(E.act(expected,'a',f.dest,'attack','e').ok);
 assert.deepEqual(await page.evaluate(()=>window.srpgDebug.snapshot()),expected,'real flick uses the same route/damage/counter as the 2D engine');
 const trace=await page.evaluate(()=>window.srpgDebug.endTrace());
 const stages=[],indices=[];for(const f of trace){if(f.effect?.crystal&&!stages.includes('number'))stages.push('number');if(f.jewel?.zoom&&!stages.includes('gems'))stages.push('gems');if(f.jewel?.id==='e'&&!f.jewel.hitStop&&indices.at(-1)!==f.jewel.index)indices.push(f.jewel.index);}
 await page.locator('#rosterBtn').click();await page.locator('#rosterList button').filter({hasText:'治療役'}).click();
 await page.locator('#waitOrder').click();await page.waitForFunction(()=>!window.srpgDebug.busy());
 assert.ok(E.act(expected,'m',expected.units.find(u=>u.id==='m'),'wait').ok);
 await page.locator('#endTurn').click();if(await page.locator('#endConfirm button').count())await page.locator('#endConfirm button').first().click();
 await page.waitForFunction(()=>!window.srpgDebug.busy()&&window.srpgDebug.snapshot().turn===2);
 E.endTurn(expected);
 const final=await page.evaluate(()=>window.srpgDebug.snapshot());assert.deepEqual(final,expected,'P2/P3 heal, supplies and turn match the shared engine');
 assert.equal(final.units.find(u=>u.id==='p').hp,6);
 assert.deepEqual(indices,[5,4],'only the two HP actually lost shatter, in order');return {final,stages,indices};
}
async function sortie(page,cdp,id){
 await page.evaluate(s=>window.srpgDebug.loadTrial(s),E.createGame(id));
 let expected=await page.evaluate(()=>window.srpgDebug.snapshot());
 for(let i=0;i<2;i++){
  const id=E.reserves(expected)[0].id,actor=E.sortieUnit(expected,id),dest=E.reachable(expected,actor).find(p=>E.dist(p,actor)===1&&!E.at(expected,p));assert.ok(dest);
  await page.locator('#orders button').filter({hasText:'出撃'}).click();
  await page.locator('#deploymentList button').first().click();
  await gesture(page,cdp,expected.map.camp,dest);
  assert.ok(E.deployAndAct(expected,id,dest,'wait').ok);
  assert.deepEqual(await page.evaluate(()=>window.srpgDebug.snapshot()),expected,'T1 successive sorties preserve slots and committed state');
 }
}
try{
 // A real 2D baseline per scene/mode, then the exact same orders in both 3D themes.
 for(const id of [0,3])for(const mode of ['normal','fast','reduced']){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:mode==='reduced'?'reduce':'no-preference'}),page=await context.newPage();
  await context.addInitScript(fast=>localStorage.setItem('field-command-fast',String(fast)),mode==='fast');
  await ready(page,`${base}/?sample=${id===0?'01':'04'}&style=original&music=fixed&debug=1`);
  const result=await battle(page,await context.newCDPSession(page),id);reference.set(`${id}/${mode}`,result.final);await context.close();
 }
 for(const [width,height]of [[320,568],[360,740],[390,844],[844,390]])for(const id of [0,3])for(const theme of ['industrial','fantasy'])for(const mode of ['normal','fast','reduced']){
  caseNumber++;if(onlyCase&&onlyCase!==caseNumber)continue;console.log(JSON.stringify({startingCase:caseNumber,width,id,theme,mode}));
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:mode==='reduced'?'reduce':'no-preference'});
  await context.addInitScript(fast=>{localStorage.setItem('field-command-fast',String(fast));localStorage.setItem('field-command-save-v1','campaign sentinel');},mode==='fast');
  const page=await context.newPage(),cdp=await context.newCDPSession(page),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await ready(page,`${base}/?sample=${id===0?'01':'04'}&style=${theme}&renderer=webgl&music=fixed&debug=1`);
  assert.equal(await page.evaluate(()=>window.srpgDebug.renderer().mode),'webgl','actual WebGL, not a silent fallback');
  const dock=await page.locator('#commandDock').boundingBox(),result=await battle(page,cdp,id);
  assert.deepEqual(result.final,reference.get(`${id}/${mode}`),'2D / industrial 3D / fantasy 3D final state equality');
  if(mode==='normal')assert.deepEqual(result.stages,['number','gems'],'shared number-first clock');
  else assert.ok(!result.stages.includes('gems'),'fast/reduced keep the quiet shared sequence');
  assert.deepEqual(await page.locator('#commandDock').boundingBox(),dock,'no dock changes');
  await sortie(page,cdp,id);
  assert.equal(await page.evaluate(()=>localStorage.getItem('field-command-save-v1')),'campaign sentinel');
  const stats=await page.evaluate(()=>window.srpgDebug.renderer());assert.equal(stats.programs,1);assert.equal(stats.buffers,2);assert.equal(stats.drawCalls,2);
  assert.ok(stats.triangles<=120000&&stats.gpuBytes<=12960000);
  assert.ok(stats.framebufferPixels<=2097152,'bounded non-MSAA backing surface');
  if(width===390&&mode==='normal')await page.screenshot({path:`test-results/webgl-${id}-${theme}.png`});
  const edgeCenter=await page.evaluate(()=>window.srpgDebug.center());
  await page.evaluate(()=>window.srpgDebug.setRenderer('2d'));await page.evaluate(()=>window.srpgDebug.setRenderer('webgl'));
  const returnedCenter=await page.evaluate(()=>window.srpgDebug.center());
  assert.ok(Math.abs(returnedCenter.x-edgeCenter.x)<.05&&Math.abs(returnedCenter.y-edgeCenter.y)<.05,'edge camera centre survives a 2D/3D round trip');
  rows.push({width,height,id,theme,mode,...stats});console.log(JSON.stringify({webglCase:rows.length,width,id,theme,mode}));await context.close();
 }
 // Class actions use the same observer clock: horse travel, shield defence, bow
 // release, stationary artillery, and lethal collapse (healing is in all 48 cases).
 for(const theme of ['industrial','fantasy'])for(const type of ['horse','shield','bow','shooter']){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'}),page=await context.newPage();
  await ready(page,`${base}/?sample=01&style=${theme}&renderer=webgl&debug=1`);
  const f=fixture(0),actor=unit({id:'a',name:'演習隊',type,...f.origin},'ally'),enemy=unit({id:'e',name:'敵重装',type:'shield',...f.enemy,ai:'hold'},'enemy');
  if(type==='horse')enemy.hp=1;
  f.s.units=[actor,enemy];await page.evaluate(s=>window.srpgDebug.loadTrial(s),f.s);
  const expected=await page.evaluate(()=>window.srpgDebug.snapshot());
  if(type==='shooter'){
   await page.locator('#rosterBtn').click();await page.locator('#rosterList button').first().click();
   await page.locator('#mapViewport').focus();await page.keyboard.press('Enter');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'waitOrder','specialist keyboard choice focuses Wait without an Attack button');
   await page.locator('#waitOrder').click();await page.waitForFunction(()=>!window.srpgDebug.busy());
   assert.ok(E.act(expected,'a',actor,'wait').ok);
   await page.locator('#endTurn').click();await page.waitForFunction(()=>!window.srpgDebug.busy()&&window.srpgDebug.snapshot().turn===2);E.endTurn(expected);
  }else{
   const dest=type==='bow'?f.origin:f.dest;
   await gesture(page,await context.newCDPSession(page),f.origin,f.enemy,type==='bow'?null:dest);
   assert.ok(E.act(expected,'a',dest,'attack','e').ok);
  }
  assert.deepEqual(await page.evaluate(()=>window.srpgDebug.snapshot()),expected,theme+'/'+type+' action and final HP');
  await context.close();
 }
 // Resource lifecycle, preserved draft and camera, loss/restore, unavailable fallback.
 for(const [width,height]of [[320,568],[360,740],[390,844],[844,390]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();
  await context.addInitScript(()=>{
   const buffers=new Set(),programs=new Set(),contexts=new Set();let audioContexts=0;
   for(const [create,del,set]of [['createBuffer','deleteBuffer',buffers],['createProgram','deleteProgram',programs]]){
    const make=WebGLRenderingContext.prototype[create],remove=WebGLRenderingContext.prototype[del];
    WebGLRenderingContext.prototype[create]=function(...args){const value=make.apply(this,args);if(value)set.add(value);return value;};
    WebGLRenderingContext.prototype[del]=function(value){set.delete(value);return remove.call(this,value);};
   }
   const get=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(type,...args){const result=get.call(this,type,...args);if(type==='webgl'&&result)contexts.add(result);return result;};
   if(window.AudioContext)window.AudioContext=new Proxy(window.AudioContext,{construct(target,args,newTarget){audioContexts++;return Reflect.construct(target,args,newTarget);}});
   document.addEventListener('webglcontextlost',()=>{buffers.clear();programs.clear();},true);
   window.gpuAudit=()=>({buffers:buffers.size,programs:programs.size,contexts:contexts.size,audioContexts});
  });
  await ready(page,`${base}/?sample=04&style=fantasy&renderer=webgl&debug=1`);
  await page.evaluate(s=>window.srpgDebug.loadTrial(s),fixture(3).s);await page.evaluate(()=>window.srpgDebug.select('a'));
  // A held real gesture cannot switch the renderer or consume a command.
  const cdp=await context.newCDPSession(page),f=fixture(3);
  const start=await point(page,f.origin),end=await point(page,f.dest);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1,radiusX:2,radiusY:2,force:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...end,id:1,radiusX:2,radiusY:2,force:1}]});
  assert.equal(await page.evaluate(()=>window.srpgDebug.setRenderer('2d')),false);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  assert.equal((await page.evaluate(()=>window.srpgDebug.snapshot())).metrics.commands,0);
  await page.locator('#minimap').click({position:{x:22,y:44}});
  const snapshot=await page.evaluate(()=>window.srpgDebug.snapshot()),draft=await page.evaluate(()=>window.srpgDebug.draft()),music=await page.evaluate(()=>window.srpgDebug.music());
  const center=await page.evaluate(()=>window.srpgDebug.center());
  const audioCount=await page.evaluate(()=>window.gpuAudit().audioContexts);
  for(let i=0;i<8;i++){
   await page.evaluate(()=>window.srpgDebug.setRenderer('2d'));assert.equal(await page.evaluate(()=>window.srpgDebug.renderer().buffers),0);
   assert.equal(await page.evaluate(()=>window.gpuAudit().buffers),0,'actual WebGL buffers were deleted');
   assert.equal(await page.evaluate(()=>window.gpuAudit().programs),0,'actual program was deleted');
   await page.evaluate(()=>window.srpgDebug.setRenderer('webgl'));
   const now=await page.evaluate(()=>window.srpgDebug.renderer());assert.equal(now.buffers,2);assert.equal(now.programs,1);assert.equal(now.contexts,1);
   assert.deepEqual(await page.evaluate(()=>window.gpuAudit()),{buffers:2,programs:1,contexts:1,audioContexts:audioCount},'native GPU/audio allocations stay bounded');
  }
  assert.deepEqual(await page.evaluate(()=>window.srpgDebug.snapshot()),snapshot);assert.deepEqual(await page.evaluate(()=>window.srpgDebug.draft()),draft);
  assert.deepEqual(await page.evaluate(()=>window.srpgDebug.music()),music,'renderer switching creates no audio sources');
  const after=await page.evaluate(()=>window.srpgDebug.center());assert.ok(Math.abs(after.x-center.x)<.05&&Math.abs(after.y-center.y)<.05,'same logical camera centre');
  await page.evaluate(()=>{const gl=document.querySelector('#battlefield3d').getContext('webgl');window.loss=gl.getExtension('WEBGL_lose_context');window.loss.loseContext();});
  await page.waitForFunction(()=>window.srpgDebug.renderer().mode==='2d');
  assert.ok(await page.locator('#rendererNotice').isVisible());assert.deepEqual(await page.evaluate(()=>window.srpgDebug.snapshot()),snapshot);
  await page.evaluate(()=>window.loss.restoreContext());await page.waitForFunction(()=>!window.srpgDebug.renderer().lost);
  assert.equal(await page.evaluate(()=>window.srpgDebug.renderer().mode),'2d','restore does not change view without consent');
  await page.evaluate(()=>window.srpgDebug.setRenderer('webgl'));assert.equal(await page.evaluate(()=>window.srpgDebug.renderer().buffers),2);
  await cdp.send('Page.setWebLifecycleState',{state:'frozen'});await cdp.send('Page.setWebLifecycleState',{state:'active'});
  assert.deepEqual(await page.evaluate(()=>window.srpgDebug.snapshot()),snapshot,'background/foreground preserves the battle');
  await context.close();
 }
 const fault=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'}),faultPage=await fault.newPage();
 await ready(faultPage,`${base}/?sample=01&style=industrial&renderer=webgl&debug=1`);
 const f=fixture(0);await faultPage.evaluate(s=>window.srpgDebug.loadTrial(s),f.s);
 const expectedFault=await faultPage.evaluate(()=>window.srpgDebug.snapshot()),faultCdp=await fault.newCDPSession(faultPage);
 const flight=gesture(faultPage,faultCdp,f.origin,f.enemy,f.dest);
 await faultPage.waitForFunction(()=>window.srpgDebug.busy());
 assert.equal(await faultPage.evaluate(()=>window.srpgDebug.setRenderer('2d')),false,'a running battle rejects manual switching');
 await faultPage.evaluate(()=>document.querySelector('#battlefield3d').getContext('webgl').getExtension('WEBGL_lose_context').loseContext());
 await flight;assert.ok(E.act(expectedFault,'a',f.dest,'attack','e').ok);
 assert.deepEqual(await faultPage.evaluate(()=>window.srpgDebug.snapshot()),expectedFault,'context loss during attack converges to the resolved final state');
 assert.equal(await faultPage.evaluate(()=>window.srpgDebug.renderer().mode),'2d');await fault.close();
 const unavailable=await browser.newContext();await unavailable.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'?null:get.call(this,type,...args);};});
 const page=await unavailable.newPage();await ready(page,`${base}/?sample=01&renderer=webgl&debug=1`);
 assert.equal(await page.evaluate(()=>window.srpgDebug.renderer().mode),'2d');assert.ok(await page.locator('#rendererNotice').isVisible());await unavailable.close();
 const campaign=await browser.newContext(),campaignPage=await campaign.newPage();await ready(campaignPage,`${base}/?renderer=webgl&debug=1`);assert.equal(await campaignPage.locator('#battlefield3d').count(),0,'campaign always uses 2D');await campaign.close();
 writeFileSync('test-results/webgl102-performance.json',JSON.stringify(rows,null,2));
 console.log(`WebGL: ${rows.length} scene/theme/viewport/mode cases, 2D state references, T1 sorties, lifecycle and explicit fallback passed`);
}finally{await browser.close();}
