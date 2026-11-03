import {Mesh,MESH_BYTES,MESH_STRIDE} from './polygon-mesh.js?v=polygon109-figure111';
import {terrainMesh,unitMesh,unitPose} from './polygon-models.js?v=polygon109-figure111';
import {CAMERA,pickProjectedMesh} from './polygon-space.js?v=polygon109-figure111';
const scenes=new WeakMap(),failures=new WeakMap();
export const polygonTheme=theme=>theme==='industrial'||theme==='fantasy';
const vertex=`attribute vec3 position;attribute vec3 normal;attribute vec4 color;attribute vec2 material;
uniform vec2 mapSize;uniform vec2 mapOrigin;uniform vec2 boardSize;uniform mediump float shadow;varying vec3 n;varying vec4 tint;varying float fog;varying vec2 finish;varying float elevation;
void main(){vec3 p=position;elevation=p.y;if(shadow>0.5)p=vec3(p.x+p.y*0.45,0.008,p.z-p.y*0.3);
float screenY=p.z-p.y*${CAMERA.slope.toFixed(2)};
gl_Position=vec4((p.x-mapOrigin.x)/mapSize.x*2.0-1.0,1.0-(screenY-mapOrigin.y)/mapSize.y*2.0,-(p.z*0.714+p.y*0.7)/(boardSize.y+4.0),1.0);
n=normal;tint=color;finish=material;fog=clamp((1.0-p.z/boardSize.y)*0.035,0.0,0.035);}`;
const fragment=`precision mediump float;uniform mediump float shadow;varying vec3 n;varying vec4 tint;varying float fog;varying vec2 finish;varying float elevation;
void main(){if(shadow>0.5){if(elevation<0.055)discard;gl_FragColor=vec4(0.09,0.12,0.16,0.23*tint.a);return;}
vec3 N=normalize(n),L=normalize(vec3(-0.45,1.0,0.3)),V=normalize(vec3(0.08,0.7,0.714)),H=normalize(L+V);
float rough=clamp(finish.x,0.16,1.0),metal=clamp(finish.y,0.0,1.0),nl=max(0.0,dot(N,L));
vec3 base=pow(max(tint.rgb,vec3(0.0)),vec3(2.2)),sky=mix(vec3(0.23,0.28,0.36),vec3(0.62,0.67,0.72),N.y*0.5+0.5);
vec3 F=mix(vec3(0.04),base,metal);float power=mix(110.0,7.0,rough*rough);
vec3 diffuse=base*(1.0-metal*0.62)*(sky*0.58+vec3(1.05,1.01,0.92)*nl*1.05);
vec3 spec=F*pow(max(0.0,dot(N,H)),power)*mix(2.1,0.12,rough);
vec3 rim=sky*pow(1.0-max(0.0,dot(N,V)),3.0)*mix(0.035,0.16,metal)*(1.0-rough*0.6);
vec3 lit=(diffuse+spec+rim)*mix(0.78,1.0,smoothstep(-0.2,0.65,N.y));
gl_FragColor=vec4(mix(pow(max(lit,vec3(0.0)),vec3(1.0/2.2)),vec3(0.7,0.76,0.75),fog),tint.a);}`;
function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(message);}return s;}
function create(canvas){
 const surface=document.createElement('canvas'),gl=surface.getContext('webgl',{alpha:true,antialias:true,stencil:true,premultipliedAlpha:false,preserveDrawingBuffer:true});
 if(!gl)throw Error('WebGLを利用できません');
 const shaders=[],program=gl.createProgram();
 try{shaders.push(shader(gl,gl.VERTEX_SHADER,vertex));shaders.push(shader(gl,gl.FRAGMENT_SHADER,fragment));for(const s of shaders)gl.attachShader(program,s);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));}
 catch(e){gl.deleteProgram(program);for(const s of shaders)gl.deleteShader(s);gl.getExtension('WEBGL_lose_context')?.loseContext();throw e;}
 for(const s of shaders){gl.detachShader(program,s);gl.deleteShader(s);}
 const scene={surface,gl,program,staticBuffer:gl.createBuffer(),dynamicBuffer:gl.createBuffer(),staticImage:document.createElement('canvas'),
  dynamic:new Mesh(),key:null,lost:false,staticBuilds:0,frames:0,staticVertices:0,dynamicVertices:0,gpuDynamicBytes:0,frameMs:0,drawCalls:0};
 scene.attributes=['position','normal','color','material'].map(n=>gl.getAttribLocation(program,n));scene.mapSize=gl.getUniformLocation(program,'mapSize');scene.shadow=gl.getUniformLocation(program,'shadow');scene.mapOrigin=gl.getUniformLocation(program,'mapOrigin');scene.boardSize=gl.getUniformLocation(program,'boardSize');
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
 gpuBytes:s.staticVertices*MESH_BYTES+s.gpuDynamicBytes,width:s.surface.width,height:s.surface.height,frameMs:s.frameMs,lost:s.lost,shadows:!!s.gl.getContextAttributes()?.stencil,
 context:s.gl.getParameter(s.gl.VERSION)
 }:{active:0,buffers:0,programs:0};}
export function polygonContext(canvas){return scenes.get(canvas)?.gl??null;}
export function pickPolygon(canvas,point,tile,ignoreId=null){const s=scenes.get(canvas);return s&&!s.lost?pickProjectedMesh(point,tile,s.dynamic.data,MESH_STRIDE,(s.pickUnits||[]).filter(g=>g.unit.id!==ignoreId)):null;}
function configure(s,map,clip={x:0,y:0,w:map.w,h:map.h}){
 const gl=s.gl;gl.useProgram(s.program);gl.viewport(0,0,s.surface.width,s.surface.height);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
 gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.uniform2f(s.mapSize,clip.w,clip.h);gl.uniform2f(s.mapOrigin,clip.x,clip.y);gl.uniform2f(s.boardSize,map.w,map.h);
 gl.disable(gl.STENCIL_TEST);gl.uniform1f(s.shadow,0);
}
function paint(s,buffer,vertices){
 const gl=s.gl;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 for(const [i,size,offset] of [[0,3,0],[1,3,12],[2,4,24],[3,2,40]]){const a=s.attributes[i];gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,MESH_BYTES,offset);}
 gl.drawArrays(gl.TRIANGLES,0,vertices);s.drawCalls++;
}
function shadow(s,buffer,vertices,depth=true){
 const gl=s.gl;if(!gl.getContextAttributes()?.stencil)return;
 gl.clearStencil(0);gl.clear(gl.STENCIL_BUFFER_BIT);gl.enable(gl.STENCIL_TEST);gl.stencilFunc(gl.EQUAL,0,255);gl.stencilOp(gl.KEEP,gl.KEEP,gl.INCR);
 if(!depth)gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.uniform1f(s.shadow,1);paint(s,buffer,vertices);
 gl.uniform1f(s.shadow,0);gl.depthMask(true);gl.enable(gl.DEPTH_TEST);gl.disable(gl.STENCIL_TEST);
}
export function polygonFrame(canvas,state,view){
 if(!polygonTheme(view.sampleTheme)){releasePolygon(canvas);return null;}
 const started=performance.now();let s;
 try{
  s=scenes.get(canvas)||create(canvas);if(s.lost)throw Error('WebGL context lost');
  const tile=view.tile,ratio=Math.min(devicePixelRatio||1,1.5,2048/(state.map.h*tile),1024/(state.map.w*tile)),width=Math.max(1,Math.round(state.map.w*tile*ratio)),height=Math.max(1,Math.round(state.map.h*tile*ratio));
  s.drawCalls=0;
  const terrainKey=JSON.stringify([view.sampleTheme,state.map.tiles,state.map.camp,width,height]);
  if(s.key!==terrainKey){
   s.surface.width=width;s.surface.height=height;configure(s,state.map);
   if(s.meshKey!==JSON.stringify([view.sampleTheme,state.map.tiles,state.map.camp])){
    const mesh=terrainMesh(state.map,view.sampleTheme);s.staticVertices=mesh.vertices;
    s.gl.bindBuffer(s.gl.ARRAY_BUFFER,s.staticBuffer);s.gl.bufferData(s.gl.ARRAY_BUFFER,mesh.data.subarray(0,mesh.length),s.gl.STATIC_DRAW);
    s.meshKey=JSON.stringify([view.sampleTheme,state.map.tiles,state.map.camp]);
   }
   s.gl.clearColor(.16,.22,.24,1);s.gl.clear(s.gl.COLOR_BUFFER_BIT|s.gl.DEPTH_BUFFER_BIT);paint(s,s.staticBuffer,s.staticVertices);shadow(s,s.staticBuffer,s.staticVertices);
   s.staticImage.width=width;s.staticImage.height=height;s.staticImage.getContext('2d').drawImage(s.surface,0,0);
   s.key=terrainKey;s.staticBuilds++;
  }
  // Only the visible viewport plus a two-cell silhouette/shadow margin needs a
  // dynamic framebuffer. The cached terrain still covers the complete board.
  const v=view.polygonVisible||{x:0,y:0,w:state.map.w,h:state.map.h};
  const x=Math.max(0,Math.floor(v.x)-2),y=Math.max(0,Math.floor(v.y)-2);
  const clip={x,y,w:Math.min(state.map.w,Math.ceil(v.x+v.w)+2)-x,h:Math.min(state.map.h,Math.ceil(v.y+v.h)+2)-y};
  const scale=Math.min(devicePixelRatio||1,1.5,1024/(clip.w*tile),2048/(clip.h*tile));
  const dw=Math.max(1,Math.round(clip.w*tile*scale)),dh=Math.max(1,Math.round(clip.h*tile*scale));
  if(s.surface.width!==dw||s.surface.height!==dh){s.surface.width=dw;s.surface.height=dh;}
  configure(s,state.map,clip);
  const reduced=!!view.polygonReduced,time=reduced?0:performance.now(),mesh=s.dynamic.reset();
  const units=state.units.filter(u=>u.alive&&u.deployed!==false);
  if(view.sortieUnit)units.push(view.sortieUnit);
  if(view.ghost?.unit&&!units.some(u=>u.id===view.ghost.unit.id))units.push(view.ghost.unit);
  const selected=units.find(u=>u.id===view.selected);
  if(selected&&view.dest&&(selected.x!==view.dest.x||selected.y!==view.dest.y))units.push({...selected,...view.dest,id:'preview-'+selected.id,preview:true});
  s.pickUnits=[];
  for(const u of units){
   const pose=unitPose(u,state,view,time,reduced);
   if(pose.x<clip.x-1||pose.x>clip.x+clip.w+1||pose.z<clip.y-1||pose.z>clip.y+clip.h+2)continue;
   const start=mesh.length;mesh.alpha=u.preview?.4:view.ghost?.unit.id===u.id?view.ghost.alpha:1;
   unitMesh(mesh,u,view.sampleTheme,pose);
   s.pickUnits.push({unit:u,start,end:mesh.length,pickable:!u.preview&&view.ghost?.unit.id!==u.id});
  }mesh.alpha=1;
  s.dynamicVertices=mesh.vertices;const bytes=mesh.length*4;
  s.gl.bindBuffer(s.gl.ARRAY_BUFFER,s.dynamicBuffer);
  if(bytes>s.gpuDynamicBytes){s.gpuDynamicBytes=Math.max(bytes,s.gpuDynamicBytes*2,262144);s.gl.bufferData(s.gl.ARRAY_BUFFER,s.gpuDynamicBytes,s.gl.DYNAMIC_DRAW);}
  if(bytes)s.gl.bufferSubData(s.gl.ARRAY_BUFFER,0,mesh.data.subarray(0,mesh.length));
  s.gl.clearColor(0,0,0,0);s.gl.clear(s.gl.COLOR_BUFFER_BIT|s.gl.DEPTH_BUFFER_BIT);shadow(s,s.dynamicBuffer,s.dynamicVertices,false);paint(s,s.dynamicBuffer,s.dynamicVertices);
  if(s.gl.getError()!==s.gl.NO_ERROR)throw Error('WebGL描画エラー');
  s.frames++;s.frameMs=performance.now()-started;
  return {terrain:s.staticImage,units:s.surface,unitsRect:{x:clip.x*32,y:clip.y*32,w:clip.w*32,h:clip.h*32}};
 }catch(error){failures.set(canvas,error.message);view.polygonError=error.message;releasePolygon(canvas);return null;}
}
