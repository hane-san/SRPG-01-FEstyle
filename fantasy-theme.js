// Original, top-down 32px art. The same tiles and class rules power every style.
export const FANTASY_COLORS=Object.freeze({'.':'#799166','=':'#c6b58b',f:'#314f45','~':'#39647d','#':'#5b6370','+':'#9e7c55',c:'#989b98',v:'#a08770'});
const box=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
export function paintFantasyCamp(c,x,y){
 box(c,x+2,y+10,28,20,'#303d52');
 for(const dx of [2,22]){
  box(c,x+dx,y+4,8,23,'#8c97a0');box(c,x+dx+1,y+5,2,20,'#c8c8b2');
  for(const k of [0,3,6])box(c,x+dx+k,y+1,2,5,'#b7bbb3');
  box(c,x+dx+3,y+11,2,5,'#263646');
 }
 box(c,x+11,y+16,10,14,'#1b2d3d');box(c,x+12,y+14,8,3,'#c9bf9e');
 for(const dx of [12,15,18])box(c,x+dx,y+18,1,12,'#b9ab85');
 box(c,x+14,y+3,1,10,'#d9c89c');box(c,x+15,y+3,7,5,'#865d89');
}
export function paintFantasyTerrain(c,map){
 for(let y=0;y<map.h;y++)for(let x=0;x<map.w;x++){
  const t=map.tiles[y][x],px=x*32,py=y*32,n=(x*17+y*29)%31;
  box(c,px,py,32,32,FANTASY_COLORS[t]);
  if(t==='.'||t==='f'){
   for(let i=0;i<6;i++)box(c,px+(n+i*7)%30,py+(n*3+i*11)%30,2,1,i%2?'#92a477':'#536d56');
   if(t==='f')for(const [dx,dy] of [[2,4],[17,2],[9,14]]){
    box(c,px+dx+5,py+dy+9,3,10,'#584a42');
    for(let i=0;i<3;i++){box(c,px+dx+i*2,py+dy+i*4,13-i*4,6,'#1d3f3b');box(c,px+dx+i*2+1,py+dy+i*4,5-i,2,'#5c7a57');}
   }
  }else if(t==='~'){
   for(let k=0;k<4;k++){box(c,px+(n+k*9)%22,py+k*8+2,10,1,'#77a1ac');box(c,px+(n+k*9+3)%22,py+k*8+4,7,1,'#274d6c');}
  }else if(t==='='){
   for(let k=0;k<4;k++){box(c,px+(k%2?1:6),py+k*8,23,1,'#a59778');box(c,px+(n+k*9)%29,py+k*8+3,2,1,'#dfcfab');}
  }else if(t==='+'){
   for(let k=0;k<6;k++)box(c,px+1,py+k*5+2,30,1,'#574e49');
   for(const dx of [1,28]){box(c,px+dx,py,3,32,'#d1c4a0');box(c,px+dx,py,1,32,'#f0dfb6');}
  }else if(t==='#'){
   for(const [dx,dy,w,h] of [[1,14,30,18],[5,6,23,22],[11,0,12,20]]){
    box(c,px+dx,py+dy,w,h,'#3e4b5e');box(c,px+dx,py+dy,w-4,3,'#a2a79b');box(c,px+dx,py+dy,3,h-3,'#7f8b8b');
   }
  }else if(t==='c')paintFantasyCamp(c,px,py);
  else if(t==='v'){
   box(c,px+5,py+14,23,15,'#c7b88d');box(c,px+3,py+10,27,5,'#744f5b');box(c,px+7,py+6,19,5,'#98656d');
   box(c,px+12,py+2,9,5,'#b27b76');box(c,px+10,py+19,5,6,'#393d49');box(c,px+20,py+18,5,5,'#f6d990');
  }
 }
}
// Body only: allegiance/class badges and HP jewels are shared in render.js.
export function paintThemedUnit(c,u,theme){
 if(theme!=='fantasy'&&theme!=='industrial')return false;
 const x=u.x*32,y=u.y*32,spent=u.team==='ally'&&u.acted,industrial=theme==='industrial';
 const ink='#202b3b',coat=spent?'#7c8581':u.team==='ally'?'#447ac1':'#b94d5c',bright=spent?'#b6beb5':'#e0e0c3',gold='#c0a36e';
 const b=(dx,dy,w,h,color)=>box(c,x+dx,y+dy,w,h,color);
 b(6,25,22,3,'#182b3f77');
 if(u.type==='horse'){
  b(2,18,25,8,ink);b(4,18,21,6,'#a79679');b(23,11,6,12,'#c4b18a');
  for(const dx of [5,11,21,26])b(dx,25,2,4,ink);
  b(10,11,11,10,coat);b(11,11,3,7,bright);b(12,3,8,9,ink);b(13,3,7,4,bright);b(13,8,6,3,'#e7cfb1');
  b(23,0,1,21,gold);b(24,1,6,5,coat);
 }else if(u.type==='shooter'){
  b(3,19,26,7,ink);b(4,18,21,3,gold);b(5,13,23,4,bright);
  for(const dx of [5,23]){b(dx,23,5,7,ink);b(dx+1,24,3,4,gold);}
  b(14,7,9,13,coat);b(15,3,7,7,'#e7cfb1');b(14,1,10,4,industrial?gold:bright);
  b(3,10,3,14,gold);b(25,10,3,14,gold);
 }else{
  const robes=['mage','healer','medic'].includes(u.type);
  b(11,19,3,9,ink);b(20,19,3,9,ink);b(9,10,15,12,ink);b(11,10,11,12,coat);
  if(robes){b(8,19,17,7,coat);b(14,11,2,14,gold);b(24,4,2,22,gold);b(22,2,6,5,industrial?'#90d3cb':'#e4c8fb');}
  else {b(10,10,4,11,bright);b(9,20,15,2,gold);}
  b(12,2,9,8,ink);b(13,4,7,5,'#e7cfb1');
  if(industrial){b(11,0,12,5,gold);b(14,5,8,3,'#86d4d8');b(8,11,4,8,'#596a75');}
  else {b(12,1,9,3,robes?coat:bright);b(18,0,5,2,coat);b(20,3,2,7,bright);}
  if(u.type==='shield'){b(3,11,11,15,ink);b(4,12,9,12,bright);b(7,12,3,12,coat);b(26,4,2,21,gold);}
  else if(u.type==='spear'){b(26,0,2,25,gold);b(25,0,4,6,bright);}
  else if(u.type==='bow'){b(27,6,2,20,gold);b(29,10,2,12,gold);b(26,7,1,18,bright);b(18,13,9,3,'#e7cfb1');}
  else if(!robes){b(26,8,2,16,bright);b(23,22,7,2,gold);}
 }
 return true;
}
