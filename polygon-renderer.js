import {Mesh} from './polygon-mesh.js?v=polygon109';
import {terrainMesh,unitMesh,unitPose} from './polygon-models.js?v=polygon109';
import {CAMERA} from './polygon-space.js?v=polygon109';
const scenes=new WeakMap(),failures=new WeakMap();
export const polygonTheme=theme=>theme==='industrial'||theme==='fantasy';
const vertex=`attribute vec3 position;attribute vec3 normal;attribute vec4 color;
uniform vec2 mapSize;varying vec3 n;varying vec4 tint;varying float fog;
void main(){float screenY=position.z-position.y*${CAMERA.slope.toFixed(2)};
gl_Position=vec4(position.x/mapSize.x*2.0-1.0,1.0-screenY/mapSize.y*2.0,-(position.z*0.6+position.y*0.8)/(mapSize.y+4.0),1.0);
n=normal;tint=color;fog=clamp((1.0-position.z/mapSize.y)*0.045,0.0,0.045);}`;
const fragment=`precision mediump float;varying vec3 n;varying vec4 tint;varying float fog;
void main(){vec3 normal=normalize(n);float light=0.52+0.42*max(0.0,dot(normal,normalize(vec3(-0.5,0.9,0.65))));
float edge=pow(max(0.0,dot(normal,normalize(vec3(-0.25,0.7,0.65)))),14.0)*0.07;
gl_FragColor=vec4(mix(tint.rgb*light+edge,vec3(0.7,0.76,0.75),fog),tint.a);}`;
function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(message);}return s;}
function create(canvas){
 const surface=document.createElement('canvas'),gl=surface.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:true});
 if(!gl)throw Error('WebGLを利用できません');
 const shaders=[],program=gl.createProgram();
 try{shaders.push(shader(gl,gl.VERTEX_SHADER,vertex));shaders.push(shader(gl,gl.FRAGMENT_SHADER,fragment));for(const s of shaders)gl.attachShader(program,s);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));}
 catch(e){gl.deleteProgram(program);for(const s of shaders)gl.deleteShader(s);gl.getExtension('WEBGL_lose_context')?.loseContext();throw e;}
 for(const s of shaders){gl.detachShader(program,s);gl.deleteShader(s);}
 const scene={surface,gl,program,staticBuffer:gl.createBuffer(),dynamicBuffer:gl.createBuffer(),staticImage:document.createElement('canvas'),
  dynamic:new Mesh(),key:null,lost:false,staticBuilds:0,frames:0,staticVertices:0,dynamicVertices:0,gpuDynamicBytes:0,frameMs:0,drawCalls:0};
 scene.attributes=['position','normal','color'].map(n=>gl.getAttribLocation(program,n));scene.mapSize=gl.getUniformLocation(program,'mapSize');
 scene.onLost=e=>{e.preventDefault();scene.lost=true;failures.set(canvas,'3D描画が中断されました');canvas.dispatchEvent(new Event('polygonfailure'));};
 scene.onRestore=()=>{scene.lost=true;};
 surface.addEventListener('webglcontextlost',scene.onLost);surface.addEventListener('webglcontextrestored',scene.onRestore);
 scenes.set(canvas,scene);return scene;
}
export function releasePolygon(canvas){
 const s=scenes.get(canvas);if(!s)return;
 const gl=s.gl;gl.deleteBuffer(s.staticBuffer);gl.deleteBuffer(s.dynamicBuffer);gl.deleteProgram(s.program);
 s.surface.removeEventListener('webglcontextlost',s.onLost);s.surface.removeEventListener('webglcontextrestored',s.onRestore);
 // Remove callbacks before explicitly losing the unused context.
 s.surface.width=1;s.surface.height=1;s.staticImage.width=1;s.staticImage.height=1;
 scenes.delete(canvas);s.gl.getExtension('WEBGL_lose_context')?.loseContext();
}
export function polygonStats(canvas){const s=scenes.get(canvas);return s?{
 active:1,buffers:2,programs:1,staticBuilds:s.staticBuilds,frames:s.frames,triangles:(s.staticVertices+s.dynamicVertices)/3,
 terrainTriangles:s.staticVertices/3,unitTriangles:s.dynamicVertices/3,drawCalls:s.drawCalls,
 gpuBytes:s.staticVertices*40+s.gpuDynamicBytes,width:s.surface.width,height:s.surface.height,frameMs:s.frameMs,lost:s.lost,
 context:s.gl.getParameter(s.gl.VERSION)
 }:{active:0,buffers:0,programs:0};}
export function polygonContext(canvas){return scenes.get(canvas)?.gl??null;}
function configure(s,map){
 const gl=s.gl;gl.useProgram(s.program);gl.viewport(0,0,s.surface.width,s.surface.height);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
 gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.uniform2f(s.mapSize,map.w,map.h);
}
function paint(s,buffer,vertices){
 const gl=s.gl;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 for(const [i,size,offset] of [[0,3,0],[1,3,12],[2,4,24]]){const a=s.attributes[i];gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,40,offset);}
 gl.drawArrays(gl.TRIANGLES,0,vertices);s.drawCalls++;
}
export function polygonFrame(canvas,state,view){
 if(!polygonTheme(view.sampleTheme)){releasePolygon(canvas);return null;}
 const started=performance.now();let s;
 try{
  s=scenes.get(canvas)||create(canvas);if(s.lost)throw Error('WebGL context lost');
  const tile=view.tile,ratio=Math.min(devicePixelRatio||1,1.5,2048/(state.map.h*tile),1024/(state.map.w*tile)),width=Math.max(1,Math.round(state.map.w*tile*ratio)),height=Math.max(1,Math.round(state.map.h*tile*ratio));
  // Board dimensions are bounded by the two adopted maps and the existing zoom.
  if(width>4096||height>8192)throw Error('3Dの描画寸法を超えました');
  const resized=s.surface.width!==width||s.surface.height!==height;
  if(resized){s.surface.width=width;s.surface.height=height;}
  configure(s,state.map);s.drawCalls=0;
  const terrainKey=JSON.stringify([view.sampleTheme,state.map.tiles,state.map.camp,width,height]);
  if(s.key!==terrainKey){
   if(s.meshKey!==JSON.stringify([view.sampleTheme,state.map.tiles,state.map.camp])){
    const mesh=terrainMesh(state.map,view.sampleTheme);s.staticVertices=mesh.vertices;
    s.gl.bindBuffer(s.gl.ARRAY_BUFFER,s.staticBuffer);s.gl.bufferData(s.gl.ARRAY_BUFFER,mesh.data.subarray(0,mesh.length),s.gl.STATIC_DRAW);
    s.meshKey=JSON.stringify([view.sampleTheme,state.map.tiles,state.map.camp]);
   }
   s.gl.clearColor(.16,.22,.24,1);s.gl.clear(s.gl.COLOR_BUFFER_BIT|s.gl.DEPTH_BUFFER_BIT);paint(s,s.staticBuffer,s.staticVertices);
   s.staticImage.width=width;s.staticImage.height=height;s.staticImage.getContext('2d').drawImage(s.surface,0,0);
   s.key=terrainKey;s.staticBuilds++;
  }
  const reduced=!!view.polygonReduced,time=reduced?0:performance.now(),mesh=s.dynamic.reset();
  const units=state.units.filter(u=>u.alive&&u.deployed!==false);
  if(view.sortieUnit)units.push(view.sortieUnit);
  if(view.ghost?.unit&&!units.some(u=>u.id===view.ghost.unit.id))units.push(view.ghost.unit);
  const selected=units.find(u=>u.id===view.selected);
  if(selected&&view.dest&&(selected.x!==view.dest.x||selected.y!==view.dest.y))units.push({...selected,...view.dest,id:'preview-'+selected.id,preview:true});
  for(const u of units){mesh.alpha=u.preview?.4:view.ghost?.unit.id===u.id?view.ghost.alpha:1;unitMesh(mesh,u,view.sampleTheme,unitPose(u,state,view,time,reduced));}mesh.alpha=1;
  s.dynamicVertices=mesh.vertices;const bytes=mesh.length*4;
  s.gl.bindBuffer(s.gl.ARRAY_BUFFER,s.dynamicBuffer);
  if(bytes>s.gpuDynamicBytes){s.gpuDynamicBytes=Math.max(bytes,s.gpuDynamicBytes*2,262144);s.gl.bufferData(s.gl.ARRAY_BUFFER,s.gpuDynamicBytes,s.gl.DYNAMIC_DRAW);}
  if(bytes)s.gl.bufferSubData(s.gl.ARRAY_BUFFER,0,mesh.data.subarray(0,mesh.length));
  s.gl.clearColor(0,0,0,0);s.gl.clear(s.gl.COLOR_BUFFER_BIT|s.gl.DEPTH_BUFFER_BIT);paint(s,s.dynamicBuffer,s.dynamicVertices);
  if(s.gl.getError()!==s.gl.NO_ERROR)throw Error('WebGL描画エラー');
  s.frames++;s.frameMs=performance.now()-started;
  return {terrain:s.staticImage,units:s.surface};
 }catch(error){failures.set(canvas,error.message);view.polygonError=error.message;releasePolygon(canvas);return null;}
}
