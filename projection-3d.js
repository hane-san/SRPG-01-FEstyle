// Presentation coordinates only. No movement, terrain costs or combat calculations.
export const TILT=Math.PI/6;
const C=Math.cos(TILT),S=Math.sin(TILT);
// CSS-size guide, shared by models, labels and silhouette picking. Not a rule stat.
export function unitScale(type,tile){
 const silhouette={shield:.91,bow:.98,mage:1.09,sword:1.1,shooter:.93,bandit:.87,spear:1.4,horse:1.6}[type]||1.1;
 return Math.min(1.25,Math.max(.25,(type==='horse'?35:30)/(tile*silhouette)));
}
export const headHeight=(type,tile)=>(type==='horse'?1.9:1.45)*unitScale(type,tile);
export function surfaceHeight(map,p){
 const t=map.tiles[Math.floor(p.y)]?.[Math.floor(p.x)];
 return t==='+'?.18:t==='~'?-.14:0;
}
export function transform(m,p){
 const v=[p[0],p[1],p[2],p[3]??1];
 return [0,1,2,3].map(r=>v.reduce((n,x,c)=>n+m[c*4+r]*x,0));
}
export function inverse(m){
 const a=Array.from({length:4},(_,r)=>[...Array.from({length:4},(_,c)=>m[c*4+r]),...Array.from({length:4},(_,c)=>Number(c===r))]);
 for(let c=0;c<4;c++){
  let pivot=c;for(let r=c+1;r<4;r++)if(Math.abs(a[r][c])>Math.abs(a[pivot][c]))pivot=r;
  [a[c],a[pivot]]=[a[pivot],a[c]];
  const div=a[c][c];if(Math.abs(div)<1e-12)throw Error('Singular projection');
  a[c]=a[c].map(v=>v/div);
  for(let r=0;r<4;r++)if(r!==c){const k=a[r][c];a[r]=a[r].map((v,i)=>v-k*a[c][i]);}
 }
 return Float32Array.from(Array.from({length:16},(_,i)=>a[i%4][4+Math.floor(i/4)]));
}
export function createProjection(map,tile){
 const width=map.w*tile,height=map.h*tile*C+64,depth=map.h*S+8;
 const matrix=Float32Array.from([2*tile/width,0,0,0, 0,2*tile*S/height,-2*C/depth,0, 0,-2*tile*C/height,-2*S/depth,0, -1,1-96/height,.8,1]);
 const inv=inverse(matrix);
 const project=(x,y,z)=>{const v=transform(matrix,[x,y,z]);return {x:(v[0]/v[3]+1)*width/2,y:(1-v[1]/v[3])*height/2,depth:v[2]/v[3]};};
 const ray=(x,y)=>[-1,1].map(z=>{const v=transform(inv,[2*x/width-1,1-2*y/height,z]);return v.slice(0,3).map(n=>n/v[3]);});
 const intersect=(x,y,h)=>{const [a,b]=ray(x,y),t=(h-a[1])/(b[1]-a[1]);return {x:a[0]+(b[0]-a[0])*t,y:a[2]+(b[2]-a[2])*t,t};};
 const cellToScreen=(p,h=surfaceHeight(map,p))=>project(p.x+.5,h,p.y+.5);
 function screenToCell(x,y,units=[]){
  // A narrow silhouette target, not overlapping 44px rectangles on every tile.
  const bodies=units.filter(u=>u.alive&&u.deployed!==false).map(u=>{
   const foot=cellToScreen(u),head=cellToScreen(u,surfaceHeight(map,u)+headHeight(u.type,tile));
   return {u,foot,head,d:Math.hypot(x-head.x,y-(head.y+foot.y)/2)};
  }).filter(({foot,head})=>Math.abs(x-foot.x)<tile*.34&&y>=head.y-13&&y<=foot.y+3).sort((a,b)=>a.d-b.d||a.foot.depth-b.foot.depth);
  if(bodies.length)return {x:bodies[0].u.x,y:bodies[0].u.y};
  const hits=[];
  for(let cy=0;cy<map.h;cy++)for(let cx=0;cx<map.w;cx++){
   const p=intersect(x,y,surfaceHeight(map,{x:cx,y:cy}));
   if(p.t>=0&&p.t<=1&&p.x>=cx&&p.x<cx+1&&p.y>=cy&&p.y<cy+1)hits.push({x:cx,y:cy,t:p.t});
  }
  hits.sort((a,b)=>a.t-b.t);
  return hits.length?{x:hits[0].x,y:hits[0].y}:{x:-1,y:-1};
 }
 return {width,height,tile,matrix,inverse:inv,project,ray,intersect,cellToScreen,screenToCell};
}
