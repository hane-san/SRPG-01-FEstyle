// Original, top-down 32px art. The same tiles and class rules power every style.
// Issue #97: profile 3 (classic fantasy) draws each material with three to four tones,
// a single top-left light, edge transitions between neighbours and ground shadows.
// FANTASY_COLORS stays the flat minimap/base colour of each tile.
export const FANTASY_COLORS=Object.freeze({'.':'#799166','=':'#c6b58b',f:'#314f45','~':'#39647d','#':'#5b6370','+':'#9e7c55',c:'#989b98',v:'#a08770'});
const box=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
const hash=(x,y,k=0)=>{let n=Math.imul(x+374+k*31,668265263)^Math.imul(y+911,374761393);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;};
const GRASS=['#6c8659','#799166','#86a070','#98b07c'],ROAD=['#a89670','#bba982','#c6b58b','#d8c8a0'];
const WATER=['#2c536b','#39647d','#4b7a90','#8fb6bf'],STONE=['#3b4250','#4f5765','#68717d','#a3a99f'];
const WOOD=['#5d4535','#7b5c42','#9e7c55','#c3a273'];

export function paintFantasyCamp(c,x,y){
 // A small keep: two towers with merlons, a curtain wall, an arched gate and a banner.
 box(c,x+1,y+28,30,4,'#2b3343');
 box(c,x+3,y+12,26,18,STONE[1]);box(c,x+3,y+12,26,3,STONE[3]);
 for(let k=0;k<4;k++)box(c,x+4,y+17+k*3,24,1,STONE[0]);
 for(const dx of [1,21]){
  box(c,x+dx,y+5,10,24,STONE[2]);box(c,x+dx,y+5,2,24,STONE[3]);box(c,x+dx+8,y+5,2,24,STONE[0]);
  for(const k of [0,4,8])box(c,x+dx+k,y+2,2,4,STONE[3]);
  box(c,x+dx+4,y+11,2,4,'#1f2836');box(c,x+dx+4,y+11,2,1,'#e8c97a');
 }
 box(c,x+11,y+18,10,12,'#1b2433');box(c,x+12,y+17,8,2,STONE[3]);
 for(const dx of [13,16,19])box(c,x+dx,y+20,1,10,'#8d7d5c');
 box(c,x+15,y+1,1,12,'#d9c89c');box(c,x+16,y+2,7,5,'#865d89');box(c,x+16,y+2,7,1,'#b48cb6');
}

function grass(c,px,py,x,y,map){
 box(c,px,py,32,32,GRASS[1]);
 // Soft dither of two tones gives a living field, never a flat fill.
 for(let i=0;i<14;i++){const h=hash(x,y,i);box(c,px+Math.floor(h*30),py+Math.floor(hash(y,x,i)*30),2,1,h>.5?GRASS[2]:GRASS[0]);}
 for(let i=0;i<3;i++){const h=hash(x,y,20+i),tx=px+3+Math.floor(h*24),ty=py+4+Math.floor(hash(y,x,20+i)*22);
  box(c,tx,ty,1,3,GRASS[0]);box(c,tx+1,ty-1,1,4,GRASS[3]);box(c,tx+2,ty+1,1,2,GRASS[2]);}
 if(hash(x,y,40)>.82){const fx=px+6+Math.floor(hash(x,y,41)*18),fy=py+8+Math.floor(hash(x,y,42)*16);box(c,fx,fy,2,2,hash(x,y,43)>.5?'#e8d9a0':'#d9a6b8');box(c,fx,fy+2,1,2,GRASS[0]);}
 edges(c,px,py,x,y,map);
}
function road(c,px,py,x,y,map){
 box(c,px,py,32,32,ROAD[2]);
 for(let i=0;i<10;i++){const h=hash(x,y,i);box(c,px+Math.floor(h*30),py+Math.floor(hash(y,x,i)*30),2,1,h>.55?ROAD[3]:ROAD[1]);}
 // Two cart ruts follow the road's long axis.
 const vertical=['=','+','c'].includes(map.tiles[y-1]?.[x])||['=','+','c'].includes(map.tiles[y+1]?.[x]);
 if(vertical){box(c,px+9,py,2,32,ROAD[0]);box(c,px+21,py,2,32,ROAD[0]);box(c,px+10,py,1,32,ROAD[1]);}
 else{box(c,px,py+10,32,2,ROAD[0]);box(c,px,py+21,32,2,ROAD[0]);}
 if(hash(x,y,9)>.6){box(c,px+14,py+15,3,2,'#8e8166');box(c,px+14,py+15,2,1,ROAD[3]);}
 edges(c,px,py,x,y,map);
}
// Grass fringes spill over a road edge; banks darken where land meets water.
function edges(c,px,py,x,y,map){
 const here=map.tiles[y][x];
 for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
  const n=map.tiles[y+dy]?.[x+dx];if(!n||n===here)continue;
  const ex=dx===1?px+29:px,ey=dy===1?py+29:py,w=dx?3:32,h=dy?3:32;
  if(n==='~')box(c,ex,ey,w,h,'#4d5f45');
  else if(here==='='&&n==='.'){for(let i=0;i<8;i++){const h=hash(x,y,60+i+dx*7+dy*13);box(c,dx?ex+(dx===1?1:0):px+Math.floor(h*30),dy?ey+(dy===1?1:0):py+Math.floor(h*30),dx?2:2,dy?2:2,GRASS[h>.5?2:0]);}}
 }
}
function water(c,px,py,x,y,map){
 // Deeper away from any bank, lighter and foamy along it.
 const land=[[0,-1],[0,1],[-1,0],[1,0]].filter(([dx,dy])=>{const n=map.tiles[y+dy]?.[x+dx];return n&&n!=='~';});
 box(c,px,py,32,32,land.length?WATER[1]:WATER[0]);
 for(let k=0;k<4;k++){const h=hash(x,y,k),wx=px+Math.floor(h*20),wy=py+4+k*7;box(c,wx,wy,9,1,WATER[2]);box(c,wx+3,wy+1,5,1,WATER[0]);if(h>.7)box(c,wx+2,wy-1,3,1,WATER[3]);}
 for(const [dx,dy] of land){
  const ex=dx===1?px+28:px,ey=dy===1?py+28:py,w=dx?4:32,h=dy?4:32;
  box(c,ex,ey,w,h,WATER[2]);
  for(let i=0;i<6;i++){const hh=hash(x,y,80+i+dx*5+dy*9);box(c,dx?ex+(dx===1?2:0):px+Math.floor(hh*30),dy?ey+(dy===1?2:0):py+Math.floor(hh*30),2,2,'#cfe0dc');}
 }
}
function forest(c,px,py,x,y,map){
 grass(c,px,py,x,y,map);box(c,px,py,32,32,'#4f6d4a88');
 // Three crowns of two kinds; each has a lit top-left, a dark lower right and a trunk.
 const trees=[[3,3,hash(x,y,1)>.5],[16,1,hash(x,y,2)>.4],[9,13,hash(x,y,3)>.55]];
 for(const [dx,dy,conifer] of trees){
  const tx=px+dx,ty=py+dy;
  box(c,tx+5,ty+15,9,3,'#24392f88');
  box(c,tx+7,ty+11,3,7,'#5a4434');box(c,tx+7,ty+11,1,7,'#7a5c45');
  if(conifer){for(let i=0;i<3;i++){box(c,tx+1+i*2,ty+i*4,13-i*4,6,'#1f3d36');box(c,tx+2+i*2,ty+i*4,6-i*2,2,'#4f7a5a');box(c,tx+9-i*2,ty+3+i*4,3,2,'#162b27');}}
  else{box(c,tx,ty+2,15,10,'#24443a');box(c,tx+2,ty,11,13,'#24443a');box(c,tx+2,ty+2,7,5,'#3f6b4f');box(c,tx+3,ty+2,3,2,'#6f9568');box(c,tx+10,ty+8,4,4,'#173129');}
 }
}
function rock(c,px,py,x,y,map){
 // Dressed stone walls: coursed blocks, a lit top and a shadowed foot.
 box(c,px,py,32,32,STONE[1]);
 for(let row=0;row<4;row++){const off=row%2?8:0;
  for(let col=-1;col<3;col++){const bx=px+off+col*16,by=py+row*8;if(bx+15<px||bx>px+31)continue;
   const l=Math.max(px,bx),r=Math.min(px+32,bx+15);box(c,l,by,r-l,7,hash(x*4+col,y*4+row)>.5?STONE[2]:STONE[1]);box(c,l,by,r-l,1,STONE[3]);}
  box(c,px,py+row*8+7,32,1,STONE[0]);}
 if(map.tiles[y+1]?.[x]!=='#')box(c,px,py+29,32,3,'#2c323d');
}
function bridge(c,px,py,x,y,map){
 box(c,px,py,32,32,WOOD[1]);
 const vertical=map.tiles[y-1]?.[x]==='+'||map.tiles[y+1]?.[x]==='+'||map.tiles[y-1]?.[x]==='='||map.tiles[y+1]?.[x]==='=';
 for(let k=0;k<6;k++){
  if(vertical){const by=py+k*5+1;box(c,px+4,by,24,4,k%2?WOOD[2]:WOOD[3]);box(c,px+4,by+4,24,1,WOOD[0]);box(c,px+6,by+1,1,1,'#3d2f25');box(c,px+25,by+1,1,1,'#3d2f25');}
  else{const bx=px+k*5+1;box(c,bx,py+4,4,24,k%2?WOOD[2]:WOOD[3]);box(c,bx+4,py+4,1,24,WOOD[0]);box(c,bx+1,py+6,1,1,'#3d2f25');box(c,bx+1,py+25,1,1,'#3d2f25');}
 }
 // Rails with posts and their shadows.
 if(vertical){for(const dx of [0,28]){box(c,px+dx,py,4,32,WOOD[0]);box(c,px+dx+1,py,2,32,WOOD[3]);box(c,px+dx,py+2,4,4,WOOD[0]);}}
 else{for(const dy of [0,28]){box(c,px,py+dy,32,4,WOOD[0]);box(c,px,py+dy+1,32,2,WOOD[3]);box(c,px+2,py+dy,4,4,WOOD[0]);}}
}
function village(c,px,py,x,y,map){
 grass(c,px,py,x,y,map);
 box(c,px+4,py+27,26,3,'#2f3b2c88');
 box(c,px+5,py+14,23,14,'#d2c29a');box(c,px+5,py+14,2,14,'#e6d8b2');box(c,px+26,py+14,2,14,'#a99872');
 for(const dx of [9,16,23])box(c,px+dx,py+14,1,14,'#6e5340');
 // Tiled roof in three tones and a chimney with a wisp of smoke.
 for(let r=0;r<4;r++){box(c,px+3+r*2,py+4+r*3,27-r*4,3,r%2?'#8e5a5f':'#a5686c');box(c,px+3+r*2,py+6+r*3,27-r*4,1,'#5f3a44');}
 box(c,px+22,py+1,4,6,'#6c5a50');box(c,px+23,py,2,1,'#c8c2b6');
 box(c,px+10,py+19,5,9,'#3b3341');box(c,px+19,py+18,5,5,'#f6d990');box(c,px+19,py+18,5,1,'#c79a52');
}

export function paintFantasyTerrain(c,map){
 for(let y=0;y<map.h;y++)for(let x=0;x<map.w;x++){
  const t=map.tiles[y][x],px=x*32,py=y*32;
  if(t==='.')grass(c,px,py,x,y,map);
  else if(t==='=')road(c,px,py,x,y,map);
  else if(t==='~')water(c,px,py,x,y,map);
  else if(t==='f')forest(c,px,py,x,y,map);
  else if(t==='#')rock(c,px,py,x,y,map);
  else if(t==='+')bridge(c,px,py,x,y,map);
  else if(t==='c'){road(c,px,py,x,y,map);paintFantasyCamp(c,px,py);}
  else if(t==='v')village(c,px,py,x,y,map);
  else box(c,px,py,32,32,FANTASY_COLORS[t]||'#777');
 }
}

// Body only: allegiance/class badges and HP jewels are shared in render.js.
// Fantasy units have natural proportions, a cloak, shaded armour and a class-true
// silhouette; healers carry a staff with a soft light, never a casting wind-up.
function fantasyUnit(c,u){
 const x=u.x*32,y=u.y*32,spent=u.team==='ally'&&u.acted;
 const team=u.team==='ally'?['#2c4f86','#3f6db0','#6d97d6']:['#7e2f3d','#b04757','#d9727f'];
 const [dark,mid,light]=spent?['#59605e','#7c8581','#a6aea9']:team;
 const steel=spent?['#6f7470','#9aa09a','#c7cbc4']:['#56606b','#9aa4ad','#dfe4e3'],skin='#e3c3a0',ink='#1d2430',gold='#c9a660';
 const b=(dx,dy,w,h,color)=>box(c,x+dx,y+dy,w,h,color);
 b(5,26,22,4,'#13202e66');
 if(u.type==='horse'){
  // Horse: long body, arched neck, mane, tail and four legs; rider above.
  b(3,16,22,8,'#6b4f38');b(4,16,20,2,'#8c6a4c');b(4,23,20,1,'#4a3526');
  b(21,9,5,10,'#6b4f38');b(23,7,6,5,'#7a5a40');b(27,9,2,2,ink);b(21,8,2,8,'#2e2420');
  b(1,15,3,8,'#2e2420');
  for(const dx of [5,9,18,22]){b(dx,24,2,5,'#4a3526');b(dx,28,2,1,ink);}
  b(8,14,10,3,mid);b(8,14,10,1,light);
  b(10,5,8,10,mid);b(10,5,2,10,light);b(16,5,2,10,dark);
  b(11,0,6,6,steel[1]);b(11,0,6,1,steel[2]);b(12,3,4,2,skin);b(17,0,2,1,'#c4505c');
  b(19,0,1,16,gold);b(20,1,5,3,mid);
  return;
 }
 // Foot soldiers: legs, torso, cloak, head.
 const robes=['mage','healer','medic'].includes(u.type);
 if(robes){
  b(9,12,14,15,dark);b(10,12,12,14,mid);b(10,12,3,14,light);b(15,13,1,13,gold);
  b(11,4,10,9,dark);b(12,5,8,7,mid);b(13,7,6,5,skin);b(13,6,6,1,dark);
  // Healing staff: wood shaft and a pale light, held still.
  b(25,3,2,25,'#8a6a46');b(23,1,6,4,'#f3e7b0');b(24,0,4,1,'#fff6d0');b(22,3,1,1,'#f3e7b088');b(29,3,1,1,'#f3e7b088');
  b(10,25,12,1,dark);b(11,26,4,2,'#3b3228');b(17,26,4,2,'#3b3228');b(22,15,3,3,skin);b(10,18,12,1,gold);
  return;
 }
 b(11,20,4,8,dark);b(18,20,4,8,dark);b(11,27,4,1,ink);b(18,27,4,1,ink);
 b(8,10,17,4,dark);b(8,12,3,13,dark);// cloak behind shoulders
 b(10,10,13,11,steel[1]);b(10,10,13,2,steel[2]);b(10,10,2,11,steel[2]);b(21,10,2,11,steel[0]);
 b(13,13,7,7,mid);b(13,13,7,1,light);b(10,20,13,2,'#5b4433');b(15,20,3,2,gold);
 b(12,2,9,9,steel[0]);b(12,2,9,2,steel[2]);b(13,5,7,5,skin);b(13,6,7,1,steel[0]);b(16,0,2,3,'#c4505c');
 if(u.type==='shield'){
  // Heavy infantry: a tall kite shield with a boss and rim.
  b(2,9,11,17,ink);b(3,10,9,14,steel[1]);b(3,10,9,2,steel[2]);b(4,12,7,9,mid);b(6,14,3,3,gold);b(5,24,5,2,steel[0]);
  b(26,2,2,24,'#7a5a40');b(25,1,4,4,steel[2]);
 }else if(u.type==='spear'){
  b(26,0,2,28,'#7a5a40');b(25,0,4,5,steel[2]);b(26,5,2,1,steel[0]);b(28,6,3,3,mid);
 }else if(u.type==='bow'){
  c.strokeStyle='#7a5a40';c.lineWidth=2;c.beginPath();c.moveTo(x+26,y+5);c.quadraticCurveTo(x+33,y+15,x+26,y+26);c.stroke();
  c.strokeStyle='#efe6c9';c.lineWidth=1;c.beginPath();c.moveTo(x+26,y+5);c.lineTo(x+26,y+26);c.stroke();
  b(6,12,4,10,'#7a5a40');b(6,10,1,4,steel[2]);b(8,10,1,4,steel[2]);
 }else if(u.type==='shooter'){
  // Artillery crew beside a small field piece.
  b(1,20,16,6,'#3b3226');b(2,18,14,3,steel[1]);b(2,18,14,1,steel[2]);b(1,24,5,5,ink);b(12,24,5,5,ink);b(2,25,3,3,'#8a6a46');b(13,25,3,3,'#8a6a46');
 }else if(u.type==='bandit'){
  b(12,2,9,4,'#5b4433');b(26,12,2,12,steel[2]);b(25,22,4,2,'#5b4433');
 }else{
  // Light infantry: a straight sword with crossguard.
  b(26,6,2,17,steel[2]);b(27,6,1,17,steel[1]);b(23,22,8,2,gold);b(26,24,2,4,'#5b4433');
 }
}
// Industrial-fantasy units: leather and brass work kit, goggles or a respirator, and
// machine-made weapons. Same skeleton as the fantasy figures so classes read alike.
function industrialUnit(c,u){
 const x=u.x*32,y=u.y*32,spent=u.team==='ally'&&u.acted;
 const team=u.team==='ally'?['#24476e','#3b6a9c','#6f9fcb']:['#6f2a33','#a54450','#d27580'];
 const [dark,mid,light]=spent?['#59605e','#7c8581','#a6aea9']:team;
 const brass=spent?['#6e6a5c','#99927d','#bdb6a0']:['#6d5532','#b08a4f','#e2c27d'],leather=['#3c2c22','#5f4636','#86664d'],ink='#1a2128',skin='#dcbc98';
 const b=(dx,dy,w,h,color)=>box(c,x+dx,y+dy,w,h,color);
 b(5,26,22,4,'#10191f77');
 if(u.type==='horse'){
  // A real horse in brass-studded barding; the rider wears a riveted cap.
  b(3,16,22,8,'#5a4434');b(4,16,20,2,'#7a5d46');b(6,17,16,5,dark);b(6,17,16,1,light);
  for(const dx of [8,13,18])b(dx,19,1,1,brass[2]);
  b(21,9,5,10,'#5a4434');b(23,7,6,5,'#6b5140');b(23,8,6,2,brass[1]);b(27,10,2,1,ink);
  b(1,15,3,8,'#2a201b');
  for(const dx of [5,9,18,22]){b(dx,24,2,5,'#3e2f25');b(dx,28,2,1,ink);}
  b(10,5,8,10,mid);b(10,5,2,10,light);b(16,5,2,10,dark);b(10,10,8,2,leather[1]);
  b(11,0,6,6,brass[1]);b(11,0,6,1,brass[2]);b(12,3,4,2,skin);b(12,2,4,1,'#86d4d8');
  b(19,0,1,16,brass[1]);b(20,1,5,3,mid);
  return;
 }
 const robes=['mage','healer','medic'].includes(u.type);
 if(robes){
  // Field medic: long coat, satchel and a lantern-staff with a cool light.
  b(9,12,14,15,dark);b(10,12,12,14,mid);b(10,12,3,14,light);b(10,19,12,2,leather[1]);b(18,18,4,4,leather[2]);
  b(11,4,10,9,leather[0]);b(12,5,8,7,leather[1]);b(13,7,6,5,skin);b(13,7,6,2,'#86d4d8');
  b(25,3,2,25,brass[0]);b(25,3,1,25,brass[1]);b(23,1,6,5,brass[1]);b(24,2,4,3,'#a6efe8');b(24,2,4,1,'#e6fffb');
  b(11,26,4,2,leather[0]);b(17,26,4,2,leather[0]);b(22,15,3,3,skin);b(19,19,2,2,brass[2]);
  return;
 }
 b(11,20,4,8,leather[0]);b(18,20,4,8,leather[0]);b(11,26,4,2,ink);b(18,26,4,2,ink);
 b(9,10,15,11,dark);b(10,10,13,10,mid);b(10,10,13,2,light);b(10,10,2,10,light);
 b(10,13,13,3,leather[1]);b(15,13,3,3,brass[2]);// cross-strap buckle
 b(10,20,13,2,leather[1]);b(8,10,3,4,brass[1]);b(22,10,3,4,brass[1]);// pauldrons
 b(12,2,9,9,leather[0]);b(13,5,7,5,skin);b(12,2,9,3,brass[1]);b(12,2,9,1,brass[2]);
 b(13,5,3,2,'#86d4d8');b(17,5,3,2,'#86d4d8');b(16,5,1,1,brass[0]);// goggles
 if(u.type==='shield'){
  // Heavy: a riveted tower plate with a viewing slit.
  b(2,8,11,19,ink);b(3,9,9,17,'#66737a');b(3,9,9,2,'#9aa6a6');b(3,9,2,17,'#9aa6a6');b(5,13,5,1,ink);
  for(const [rx,ry] of [[4,11],[9,11],[4,23],[9,23]])b(rx,ry,1,1,brass[2]);
  b(26,2,2,24,'#4f5a62');b(25,1,4,4,brass[2]);
 }else if(u.type==='spear'){
  b(26,0,2,28,'#4f5a62');b(26,0,1,28,'#8a979c');b(25,0,4,5,'#cfd6d6');b(25,10,4,3,brass[1]);
 }else if(u.type==='bow'){
  // Crank crossbow held across the body.
  b(17,13,13,3,leather[2]);b(17,13,13,1,'#a8865f');b(28,8,2,13,'#4f5a62');b(28,8,1,13,'#9aa6a6');
  b(19,16,3,3,brass[1]);b(20,17,1,1,brass[2]);
 }else if(u.type==='shooter'){
  // Artillerist with a brass field gun on two spoked wheels.
  b(1,19,17,5,'#4f5a62');b(1,19,17,1,'#9aa6a6');b(14,18,5,3,brass[1]);
  for(const wx of [2,12]){c.strokeStyle=brass[1];c.lineWidth=2;c.beginPath();c.arc(x+wx+3,y+27,3,0,Math.PI*2);c.stroke();b(wx+2,26,2,2,brass[2]);}
 }else if(u.type==='bandit'){
  b(12,2,9,3,'#5b4433');b(13,5,7,2,'#4a3a32');b(26,12,2,12,'#9aa6a6');b(25,22,4,2,leather[1]);
 }else{
  // Light infantry: a cutlass with a brass basket hilt.
  b(26,6,2,16,'#cfd6d6');b(27,6,1,16,'#8a979c');b(23,21,8,3,brass[1]);b(23,21,8,1,brass[2]);b(26,24,2,4,leather[1]);
 }
}
export function paintThemedUnit(c,u,theme){
 if(theme==='fantasy'){fantasyUnit(c,u);return true;}
 if(theme==='industrial'){industrialUnit(c,u);return true;}
 return false;
}
