// Real WebGL/OfflineAudio checks; neither software rendering nor waveform peaks
// prove iPhone performance, perceived realism or the quality heard by a person.
import assert from 'node:assert/strict';
import {launch,base} from './browser-helpers.mjs';
let browser;
try{
 browser=await launch();const report={};
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?sample=04&style=fantasy&debug=1');await page.waitForFunction(()=>!!window.srpgDebug);
 const before=await page.evaluate(()=>window.srpgDebug.snapshot());
 await page.locator('#toolsToggle').click();await page.locator('#zoomIn').click();await page.locator('#zoomIn').click();
 const top=await page.evaluate(async()=>{
  const e=document.querySelector('#mapViewport');e.scrollTop=0;
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return window.srpgDebug.polygon();
 });
 const bottom=await page.evaluate(async()=>{
  const e=document.querySelector('#mapViewport');e.scrollTop=e.scrollHeight;
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return window.srpgDebug.polygon();
 });
 assert.equal(top.active,1);assert.equal(bottom.active,1);assert(top.shadows&&bottom.shadows);
 assert.equal(bottom.staticBuilds,top.staticBuilds,'scroll reuses complete terrain cache');
 assert.notEqual(top.unitTriangles,bottom.unitTriangles,'offscreen figures are culled when scrolling');
 assert.equal(bottom.buffers,2);assert.equal(bottom.programs,1);assert.equal(bottom.drawCalls,2);
 assert(top.width<=1024&&top.height<=2048);assert(bottom.width<=1024&&bottom.height<=2048);
 assert.deepEqual(await page.evaluate(()=>window.srpgDebug.snapshot()),before);
 report.viewport={top,bottom};
 report.picking=[];
 for(const [width,height]of [[320,740],[360,800],[390,844],[844,390]])for(const map of ['01','04'])for(const style of ['industrial','fantasy']){
  await page.setViewportSize({width,height});await page.goto(`${base}/?sample=${map}&style=${style}&debug=1`);await page.waitForFunction(()=>!!window.srpgDebug);
  const hit=await page.evaluate(async()=>{
   const [{Mesh,MESH_STRIDE},{unitMesh,unitPose},{projectPoint}]=await Promise.all([import('./polygon-mesh.js'),import('./polygon-models.js'),import('./polygon-space.js')]);
   const s=window.srpgDebug.snapshot(),view=window.srpgDebug.draft(),u=s.units.filter(u=>u.alive&&u.deployed!==false&&u.team==='enemy').sort((a,b)=>b.y-a.y)[0];
   const m=new Mesh();unitMesh(m,u,view.sampleTheme,unitPose(u,s,view,0,true));
   let best=null;
   for(let i=0;i<m.length;i+=MESH_STRIDE*3){
    const y=(m.data[i+1]+m.data[i+MESH_STRIDE+1]+m.data[i+MESH_STRIDE*2+1])/3;
    if(!best||y>best.y)best={x:(m.data[i]+m.data[i+MESH_STRIDE]+m.data[i+MESH_STRIDE*2])/3,y,z:(m.data[i+2]+m.data[i+MESH_STRIDE+2]+m.data[i+MESH_STRIDE*2+2])/3};
   }
   const e=document.querySelector('#mapViewport'),c=document.querySelector('#battlefield'),tile=c.getBoundingClientRect().width/s.map.w;
   e.scrollLeft=(u.x+.5)*tile-e.clientWidth/2;e.scrollTop=(u.y+.1)*tile-e.clientHeight/2;
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   const r=c.getBoundingClientRect(),head=projectPoint(best,tile);
   return {id:u.id,head:{x:r.left+head.x,y:r.top+head.y},foot:{x:r.left+(u.x+.5)*tile,y:r.top+(u.y+.7)*tile}};
  });
  for(const kind of ['head','foot']){
   await page.touchscreen.tap(hit[kind].x,hit[kind].y);
   assert.equal(await page.evaluate(()=>window.srpgDebug.draft().selected),hit.id,`${width}/${map}/${style}/${kind} selects the visible figure`);
  }
  report.picking.push({width,height,map,style,head:true,foot:true});
 }
 report.audio=await page.evaluate(async()=>{
  const {createAudio}=await import('./audio.js');const original=window.AudioContext,rows=[];
  try{
   for(const type of ['sword','shield','spear','horse','bow','mage','shooter'])for(const armoured of [false,true]){
    const context=new OfflineAudioContext(1,44100,44100);
    window.AudioContext=function(){return context;};
    const audio=createAudio({getItem:()=>null});audio.unlock();
    // Worst-case overlap: contact and the first of six real jewel cracks.
    audio.play('combat-impact',6,true,{type,armoured,heavy:true});
    audio.play('gem-chain',6,true,{intervalMs:65,armoured,impact:true});
    const buffer=await context.startRendering(),data=buffer.getChannelData(0);let peak=0,energy=0,hash=0;
    for(let i=0;i<data.length;i++){if(!Number.isFinite(data[i]))throw Error('non-finite audio');peak=Math.max(peak,Math.abs(data[i]));energy+=data[i]*data[i];if(i%31===0)hash=(Math.imul(hash,31)+Math.round(data[i]*1000000))|0;}
    rows.push({type,armoured,peak,rms:Math.sqrt(energy/data.length),hash,played:audio.snapshot().played});
   }
   let created=0;window.AudioContext=function(){created++;throw Error('device unavailable');};
   const muted=createAudio({getItem:()=> 'false'});muted.unlock();muted.play('combat-impact');
   if(created!==0||muted.snapshot().played!==0)throw Error('muted audio must stay silent');
   const failed=createAudio({getItem:()=>null});failed.unlock();failed.play('combat-impact');
   if(created!==1||failed.snapshot().played!==0)throw Error('audio failure must be contained');
   return rows;
  }finally{window.AudioContext=original;}
 });
 for(const row of report.audio){assert(row.peak>.01&&row.peak<.8,`headroom for ${row.type}/${row.armoured}: ${row.peak}`);assert.equal(row.played,2);}
 const samples=report.audio.filter(r=>!r.armoured);assert(new Set(samples.map(r=>r.hash)).size>=4,'weapon families differ beyond one volume change');
 assert.deepEqual(errors,[]);console.log(JSON.stringify(report));
}finally{if(browser?.isConnected())await browser.close();}
