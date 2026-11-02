// North-up orthographic camera. Ground stays aligned with the tactical grid;
// height is genuine world Y, not a skew applied to a 2D picture.
export const CAMERA=Object.freeze({slope:.72,depthSlope:.6});
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
  const foot=projectPoint({x:u.x+.5,z:u.y+.82},tile),height=(u.type==='horse'?1.6:1.3)*CAMERA.slope*tile;
  return {u,foot,height};
 }).filter(({foot,height})=>Math.abs(p.x-foot.x)<tile*.31&&p.y<foot.y-tile*.18&&p.y>foot.y-height);
 candidates.sort((a,b)=>Math.abs(p.x-a.foot.x)-Math.abs(p.x-b.foot.x)||b.u.y-a.u.y||a.u.id.localeCompare(b.u.id));
 return candidates.length?{x:candidates[0].u.x,y:candidates[0].u.y}:screenToCell(p,tile);
}
