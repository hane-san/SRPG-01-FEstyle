// North-up orthographic camera. Ground stays aligned with the tactical grid;
// height is genuine world Y, not a skew applied to a 2D picture.
export const CAMERA=Object.freeze({slope:1.02,depthSlope:.714});
export function projectPoint({x,y=0,z},tile=32){return {x:x*tile,y:(z-y*CAMERA.slope)*tile};}
// Inverse camera ray intersected with the walk plane Y=height. Bridge decks
// share height zero; their thickness, water and foundations extend below it.
export function groundPoint({x,y},tile=32,height=0){return {x:x/tile,y:height,z:y/tile+height*CAMERA.slope};}
export const cellToScreen=(p,tile=32)=>projectPoint({x:p.x+.5,y:0,z:p.y+.5},tile);
export function screenToCell(p,tile=32){const q=groundPoint(p,tile);return {x:Math.floor(q.x),y:Math.floor(q.z)};}
export function silhouetteCell(p,tile,units){
 // The HP strip and feet belong to the ground cell. Only upper silhouettes
 // extend outside it. Pick the nearest visible body, never an overlapping 44px disk.
 const candidates=units.filter(u=>u.alive&&u.deployed!==false).map(u=>{
  const foot=projectPoint({x:u.x+.5,z:u.y+.9},tile),height=(u.type==='horse'?1.65:1.45)*CAMERA.slope*tile;
  return {u,foot,height};
 }).filter(({foot,height})=>Math.abs(p.x-foot.x)<tile*.32&&p.y<foot.y-tile*.18&&p.y>foot.y-height);
 candidates.sort((a,b)=>Math.abs(p.x-a.foot.x)-Math.abs(p.x-b.foot.x)||b.u.y-a.u.y||a.u.id.localeCompare(b.u.id));
 return candidates.length?{x:candidates[0].u.x,y:candidates[0].u.y}:screenToCell(p,tile);
}
// CPU ray hit against the exact projected triangles sent to WebGL. The camera's
// depth ordering is shared with the shader; tall figures can cover a cell above.
export function pickProjectedMesh(point,tile,data,stride,groups){
 const px=point.x/tile,py=point.y/tile;let best=null,depth=-Infinity;
 for(const g of groups){
  const u=g.unit;if(!g.pickable||Math.abs(px-u.x-.5)>1||py<u.y-1.5||py>u.y+1.3)continue;
  for(let i=g.start;i<g.end;i+=stride*3){
   const ax=data[i],ay=data[i+2]-data[i+1]*CAMERA.slope,bx=data[i+stride],by=data[i+stride+2]-data[i+stride+1]*CAMERA.slope,cx=data[i+stride*2],cy=data[i+stride*2+2]-data[i+stride*2+1]*CAMERA.slope;
   const den=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(Math.abs(den)<1e-10)continue;
   const a=((by-cy)*(px-cx)+(cx-bx)*(py-cy))/den,b=((cy-ay)*(px-cx)+(ax-cx)*(py-cy))/den,c=1-a-b;
   if(a<-.000001||b<-.000001||c<-.000001)continue;
   const d=a*(data[i+2]*.714+data[i+1]*.7)+b*(data[i+stride+2]*.714+data[i+stride+1]*.7)+c*(data[i+stride*2+2]*.714+data[i+stride*2+1]*.7);
   if(d>depth){depth=d;best={x:u.x,y:u.y};}
  }
 }
 return best;
}
