// Issue #101: the HP1 gem breathes (or holds a still ring under Reduced Motion) only while
// an HP1 unit is on the board. Issue #111 starts number + first crack together.
import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {unit} from '../data.js';
import {launch,setup} from './browser-helpers.mjs';
let browser;const results=[];
const board=hp=>{const s=E.createGame();s.units=[unit({id:'a',name:'剣士',type:'sword',x:5,y:13},'ally'),unit({id:'e',name:'敵兵',type:'sword',x:5,y:12},'enemy'),unit({id:'w',name:'負傷兵',type:'bow',x:7,y:14},'ally')];s.units[2].hp=hp;return s;};
try{
 for(const motion of ['reduce','no-preference']){
  browser=await launch();
  const t=await setup(browser,390,844,{reducedMotion:motion}),{page}=t;
  await t.reset(board(1));await page.waitForTimeout(400);
  const low=(await t.draft()).lowHp;
  assert.ok(low,'an HP1 unit on the board turns the pulse on');
  assert.equal(low.static,motion==='reduce','Reduced Motion uses a still ring');
  await t.reset(board(2));await page.waitForTimeout(400);
  assert.equal((await t.draft()).lowHp??null,null,'no HP1 unit, no pulse');
  // Latest direction: anticipation, then number and first crack on one frame.
  await t.select('a');
  const seen=page.evaluate(()=>new Promise(resolve=>{let numberAt=null,gemsAt=null,anticipation=false;const tick=()=>{const v=window.srpgDebug.draft(),now=performance.now();
   if(v.animation?.stage==='windup'&&v.animation.progress<.62)anticipation=true;
   if(v.effect?.crystal&&numberAt===null)numberAt=now;if(v.jewel?.zoom&&gemsAt===null)gemsAt=now;
   if(numberAt!==null&&gemsAt!==null||now>start+4000)resolve({numberAt,gemsAt,anticipation});else requestAnimationFrame(tick);};const start=performance.now();tick();}));
  const begin=Date.now();await t.slide({x:5,y:13},{x:5,y:12});await t.settled();const elapsed=Date.now()-begin;
  const order=await seen;
  if(motion==='no-preference'){assert(order.anticipation);assert.notEqual(order.numberAt,null);assert.equal(order.numberAt,order.gemsAt,'contact shows damage and first crack on the same frame');assert.ok(elapsed>=450&&elapsed<=3500,`attack took ${elapsed}ms`);}
  else assert.equal(order.gemsAt,null,'Reduced Motion keeps the quiet sequence');
  assert.equal((await t.state()).units.find(u=>u.id==='e').hp,4,'damage is the engine result');
  assert.deepEqual(t.errors,[]);results.push({motion,pulse:true,order,elapsed});
  await browser.close();browser=null;
 }
 console.log(JSON.stringify(results));
}finally{if(browser?.isConnected())await browser.close();}
