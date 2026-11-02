import {createProjection,surfaceHeight,headHeight} from './projection-3d.js?v=webgl102';
import {LIMITS} from './mesh-3d.js?v=webgl102';
import {terrainMesh,unitsMesh} from './models-3d.js?v=webgl102';
import {drawGemCloseUp,drawDamageNumber,drawGemFragments} from './render.js?v=webgl102';
import {alive,reachable,movement,waitCommand,supportTargets} from './engine.js?v=0.8.0-trial92';
import {tacticalRanges} from './ui-model.js?v=webgl102';
import {buildThreatIndex} from './tactical-ui.js?v=webgl102';
import {RULES} from './config.js?v=webgl102';

const VS=`attribute vec3 position;attribute vec3 normal;attribute vec3 color;
uniform mat4 camera;varying vec3 tint;
void main(){float light=.52+.48*max(0.,dot(normalize(normal),normalize(vec3(-.4,.85,-.3))));
tint=color*light;gl_Position=camera*vec4(position,1.);}`;
const FS=`precision mediump float;varying vec3 tint;void main(){gl_FragColor=vec4(tint,1.);}`;

// One reusable context, no rule state, timers, audio or network requests.
export class TrialRenderer3D{
 constructor(overlay,onFallback){
  this.overlay=overlay;this.onFallback=onFallback;this.canvas=null;this.gl=null;this.program=null;this.buffers=[];this.lost=false;this.projection=null;
  this.staticKey=null;this.staticData=null;this.rangeKey=null;this.ranges=null;
  this.metrics={programs:0,buffers:0,contexts:0,drawCalls:0,triangles:0,gpuBytes:0,initialMs:0,frameMs:[],frames:0,builds:0};
 }
 ensure(){
  if(this.lost)throw Error('WebGLの接続が失われました');
  if(!this.canvas){
   this.canvas=document.createElement('canvas');this.canvas.id='battlefield3d';this.canvas.setAttribute('aria-hidden','true');
   Object.assign(this.canvas.style,{position:'absolute',left:'0',top:'0',pointerEvents:'none'});
   this.overlay.before(this.canvas);
   this.canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();this.lost=true;this.program=null;this.buffers=[];this.staticKey=null;
    Object.assign(this.metrics,{programs:0,buffers:0,gpuBytes:0});this.onFallback('WebGLの接続が失われたため2Dへ戻りました');
   });
   this.canvas.addEventListener('webglcontextrestored',()=>{this.lost=false;this.staticKey=null;});
   this.gl=this.canvas.getContext('webgl',{alpha:false,antialias:false,depth:true,preserveDrawingBuffer:false});
   if(!this.gl)throw Error('この環境ではWebGLを使用できません');
   this.metrics.contexts=1;
  }
  if(!this.gl)throw Error('この環境ではWebGLを使用できません');
  if(this.program)return;
  const gl=this.gl,shaders=[];
  try{
   for(const [type,source]of [[gl.VERTEX_SHADER,VS],[gl.FRAGMENT_SHADER,FS]]){
    const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('3Dシェーダーを準備できません');
   }
   const program=gl.createProgram();this.program=program;
   for(const shader of shaders)gl.attachShader(program,shader);gl.linkProgram(program);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('3D描画を準備できません');
   this.camera=gl.getUniformLocation(program,'camera');
   this.attributes=['position','normal','color'].map(name=>gl.getAttribLocation(program,name));
   this.buffers=[gl.createBuffer(),gl.createBuffer()];
   if(this.buffers.some(b=>!b))throw Error('3Dバッファを確保できません');
   Object.assign(this.metrics,{programs:1,buffers:2});this.staticKey=null;
  }catch(error){this.suspend();throw error;}
  finally{for(const shader of shaders)gl.deleteShader(shader);}
 }
 suspend(){
  if(this.gl&&!this.lost){for(const buffer of this.buffers)this.gl.deleteBuffer(buffer);if(this.program)this.gl.deleteProgram(this.program);}
  this.buffers=[];this.program=null;this.staticKey=null;this.staticData=null;this.rangeKey=null;this.ranges=null;
  Object.assign(this.metrics,{programs:0,buffers:0,gpuBytes:0,drawCalls:0,triangles:0});
  if(this.canvas)this.canvas.hidden=true;
 }
 stats(){
  const times=[...this.metrics.frameMs].sort((a,b)=>a-b);
  return {...this.metrics,frameMs:undefined,frameMedianMs:times[Math.floor(times.length/2)]||0,frameP95Ms:times[Math.floor(times.length*.95)]||0,
   width:this.projection?.width,height:this.projection?.height,lost:this.lost};
 }
 draw(state,view,options={}){
  const begin=performance.now(),initial=!this.program;this.ensure();
  const gl=this.gl,projection=createProjection(state.map,view.tile);this.projection=projection;
  const dpr=Math.min(devicePixelRatio||1,LIMITS.dpr,LIMITS.maxSide/projection.width,LIMITS.maxSide/projection.height,Math.sqrt(LIMITS.maxPixels/(projection.width*projection.height)));
  for(const canvas of [this.canvas,this.overlay]){
   const w=Math.floor(projection.width*dpr),h=Math.floor(projection.height*dpr);
   if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;
   canvas.style.width=projection.width+'px';canvas.style.height=projection.height+'px';
  }
  this.canvas.hidden=false;
  const route=view.animation?.kind==='move'?view.animation.path:view.route||[];
  const key=JSON.stringify([state.map.id,state.map.tiles,view.sampleTheme,state.units.map(u=>[u.x,u.y,u.alive,u.deployed]),route]);
  if(key!==this.staticKey){this.staticData=terrainMesh(state.map,view.sampleTheme,[...state.units,...route.map(p=>({...p,alive:true}))]);this.staticKey=key;this.metrics.builds++;
   gl.bindBuffer(gl.ARRAY_BUFFER,this.buffers[0]);gl.bufferData(gl.ARRAY_BUFFER,this.staticData,gl.STATIC_DRAW);
  }
  const dynamic=unitsMesh(state,view,options);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.buffers[1]);gl.bufferData(gl.ARRAY_BUFFER,dynamic,gl.DYNAMIC_DRAW);
  gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(.08,.12,.15,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.useProgram(this.program);gl.uniformMatrix4fv(this.camera,false,projection.matrix);
  for(let i=0;i<2;i++){
   gl.bindBuffer(gl.ARRAY_BUFFER,this.buffers[i]);
   this.attributes.forEach((location,k)=>{gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,3,gl.FLOAT,false,36,k*12);});
   gl.drawArrays(gl.TRIANGLES,0,(i===0?this.staticData:dynamic).length/9);
  }
  const error=gl.getError();if(error!==gl.NO_ERROR)throw Error('WebGL描画を継続できませんでした');
  const c=this.overlay.getContext('2d');c.setTransform(this.overlay.width/projection.width,0,0,this.overlay.height/projection.height,0,0);c.clearRect(0,0,projection.width,projection.height);c.imageSmoothingEnabled=true;
  this.drawOverlay(c,state,view,projection);
  const elapsed=performance.now()-begin;
  Object.assign(this.metrics,{drawCalls:2,triangles:(this.staticData.length+dynamic.length)/27,gpuBytes:(this.staticData.length+dynamic.length)*4,framebufferPixels:this.canvas.width*this.canvas.height});
  this.metrics.frames++;this.metrics.frameMs.push(elapsed);if(this.metrics.frameMs.length>180)this.metrics.frameMs.shift();
  if(initial)this.metrics.initialMs=elapsed;
 }
 drawOverlay(c,s,view,p){
  const selected=view.sortie?view.sortieUnit:s.units.find(u=>u.id===view.selected);
  const rangeKey=JSON.stringify([s.map.id,s.map.tiles,s.turn,view.selected,!!view.sortie,view.danger,s.units.map(u=>[u.id,u.x,u.y,u.alive,u.acted,u.deployed,u.range,u.move,u.ai]),s.trial]);
  if(rangeKey!==this.rangeKey){
   this.rangeKey=rangeKey;this.ranges=selected?.team==='ally'&&!selected.acted?tacticalRanges(s,selected,reachable(s,selected)):{moves:new Set(),attacks:new Set()};
   const threats=view.danger||selected?.team==='enemy'?buildThreatIndex(s,{alive,reachable,movement}).filter(e=>selected?.team!=='enemy'||e.enemy.id===selected.id):[];
   this.danger=new Set(threats.flatMap(e=>[...e.cells]));
  }
  const cell=(q,color,fill=null)=>{
   const h=surfaceHeight(s.map,q)+.01,points=[[q.x,q.y],[q.x+1,q.y],[q.x+1,q.y+1],[q.x,q.y+1]].map(([x,z])=>p.project(x,h,z));
   c.beginPath();points.forEach((v,i)=>i?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));c.closePath();
   if(fill){c.fillStyle=fill;c.fill();}if(color){c.strokeStyle=color;c.lineWidth=1.5;c.stroke();}
  };
  for(const k of this.danger){const [x,y]=k.split(',').map(Number);cell({x,y},null,'#cd526640');}
  for(const k of this.ranges.moves){const [x,y]=k.split(',').map(Number);cell({x,y},'#b8d4ff55','#2768c348');}
  if(view.target)for(const k of this.ranges.attacks){const [x,y]=k.split(',').map(Number);cell({x,y},null,'#73dded35');}
  for(const warning of s.warnings)for(const q of warning.cells){
   cell(q,warning.kind==='cannon'?'#ffc7a0':'#dcc5f5');const a=p.cellToScreen(q);
   c.font='bold 9px sans-serif';c.textAlign='center';c.fillStyle='#fff5db';c.fillText(warning.kind==='cannon'?`P4 −${RULES.barrageDamage}`:`T${warning.turn}`,a.x,a.y-2);
  }
  if(view.route?.length>1){c.beginPath();view.route.forEach((q,i)=>{const a=p.cellToScreen(q);i?c.lineTo(a.x,a.y):c.moveTo(a.x,a.y);});c.lineWidth=3;c.strokeStyle='#ffe2a0';c.stroke();}
  if(view.dest&&selected)cell(view.dest,view.moveArmed?'#fff5d3':'#ffe2a0');
  if(view.cursor&&view.keyboard)cell(view.cursor,'#fff1c4');
  const target=s.units.find(u=>u.id===view.target);if(target)cell(target,'#ffce88');
  if(target&&view.dest){const a=p.cellToScreen(view.dest),b=p.cellToScreen(target);c.save();c.setLineDash([4,3]);c.strokeStyle='#ffe2a0';c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.restore();}
  for(const u of alive(s)){
   const motion=view.motion?.id===u.id?view.motion:u;
   const head=p.cellToScreen(motion,surfaceHeight(s.map,u)+headHeight(u.type,p.tile));head.x=Math.max(18,Math.min(p.width-18,head.x));
   const jewel=view.jewel?.id===u.id?view.jewel:null,hp=jewel?.hp??u.hp;
   c.textAlign='center';c.font='bold 10px sans-serif';c.fillStyle='#12202aee';c.fillRect(head.x-17,head.y-13,34,24);
   c.fillStyle=u.team==='ally'?'#b8deff':'#ffb9ad';c.fillText(`${u.glyph}${u.acted?' ✓':''}`,head.x,head.y-3);
   for(let i=0;i<6;i++){
    c.fillStyle=i<hp?(hp<=2?'#ffd078':u.team==='ally'?'#bdeac7':'#ffc3a8'):'#4c5661';
    const x=head.x-14+i*4.8,y=head.y+3;c.beginPath();c.moveTo(x,y-2);c.lineTo(x+2,y);c.lineTo(x,y+3);c.lineTo(x-2,y);c.closePath();c.fill();
   }
   if(u.hp===1&&view.lowHp){c.strokeStyle='#fff4cd';c.lineWidth=1;c.globalAlpha=view.lowHp.static?1:.4+.6*view.lowHp.amount;c.strokeRect(head.x-17,head.y,7,10);c.globalAlpha=1;}
  }
  if(selected&&!selected.acted&&selected.spend&&!view.sortie&&view.dest&&waitCommand(selected,view.dest))for(const u of supportTargets(s,selected)){
   const q=p.cellToScreen(u);c.font='bold 10px sans-serif';c.textAlign='center';c.fillStyle='#e7d8ff';c.fillText(selected.skill==='heal'?'P3+':'P3',q.x+12,q.y);
  }
  // Reuse the exact #101 painters, in CSS-screen coordinates above the 3D head.
  const screenState={map:{w:p.width/32}};
  if(view.jewel){const u=s.units.find(u=>u.id===view.jewel.id);if(u){
   const q=p.cellToScreen(u,surfaceHeight(s.map,u)+headHeight(u.type,p.tile)),fake={...u,x:(q.x-16)/32,y:q.y/32};
   if(view.jewel.zoom)drawGemCloseUp(c,screenState,fake,view.jewel);else if(!view.jewel.hitStop)drawGemFragments(c,fake,view.jewel);
  }}
  if(view.effect){const e=view.effect,u=s.units.find(u=>u.id===view.animation?.target),q=p.cellToScreen(e,surfaceHeight(s.map,e)+headHeight(u?.type,p.tile));drawDamageNumber(c,screenState,{...e,x:(q.x-16)/32,y:q.y/32});}
 }
}
