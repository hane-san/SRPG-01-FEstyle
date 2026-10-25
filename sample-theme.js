// Visual-only 32px terrain treatment for Issue #76.
// Geometry, unit positions, costs, phases and combat remain owned by data.js/engine.js.
export const INDUSTRIAL_COLORS = Object.freeze({
  '.':'#667078', '=':'#a08f7b', f:'#45515b', '~':'#254c59',
  '#':'#3b4852', '+':'#987d62', c:'#796e67', v:'#7a635a'
});
const brick=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
const line=(c,x,y,x2,y2,color,width=1)=>{
 c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();
};
function pipes(c,x,y,n){
 // Dense upright insulated pipe bundle: visually difficult terrain, never a new obstacle.
 for(const [dx,offset] of [[3,0],[13,5],[24,1]]){
  brick(c,x+dx,y+1,5,30,dx===13?'#987b5b':'#273844');
  brick(c,x+dx+1,y+1,2,28,'#778b8c');
  for(const by of [7,23])brick(c,x+dx-1,y+by+offset%3,7,3,'#b09b73');
 }
 brick(c,x+1,y+25,29,4,'#253a43');
 brick(c,x+3,y+25,22,1,'#bda477');
 if(n%3===0){brick(c,x+20,y+6,9,5,'#b5875a');brick(c,x+23,y+3,3,12,'#26363d');}
}
function dock(c,x,y,n){
 brick(c,x+1,y+2,30,27,'#827466');
 for(let i=4;i<29;i+=6)line(c,x+2,y+i,x+30,y+i,'#554d4a');
 for(const dx of [4,27])for(const dy of [5,27]){brick(c,x+dx,y+dy,3,3,'#dfbf81');}
 if(n%5===0){
  brick(c,x+7,y+8,18,3,'#404f56');
  brick(c,x+9,y+14,15,3,'#ba9d69');
 }
}
function channel(c,x,y,n){
 brick(c,x,y,32,32,'#22434f');
 for(const k of [0,1,2]){
  const yy=(n*3+k*12)%31;
  brick(c,x+(k*11+n*2)%19,y+yy,9,1,k%2?'#5c8c93':'#336574');
 }
 if(n%5===0){line(c,x+4,y+22,x+15,y+22,'#6fa2a6');}
}
function drawBridge(c,x,y,n,which){
 const wood=which===1?'#886b52':which===2?'#746c69':'#98836b';
 brick(c,x,y+2,32,28,wood);
 for(let i=4;i<29;i+=8){
  line(c,x+2,y+i,x+30,y+i,which===1?'#baa179':'#514e4c',2);
 }
 for(const xx of [3,28]){
  brick(c,x+xx,y,2,32,'#273945');
  for(const yy of [4,16,27])brick(c,x+xx-1,y+yy,4,3,'#d2b481');
 }
 if(which===2){ // Weathered but entirely traversable: do not depict a physical gap.
  line(c,x+7,y+3,x+13,y+17,'#3d4449');
  line(c,x+13,y+17,x+21,y+27,'#3d4449');
 }
 if(n%3===0)brick(c,x+15,y+9,3,3,'#e0b66d');
}
function yard(c,x,y,n){
 const tone=n%4===0?'#70777b':'#626970';
 brick(c,x,y,32,32,tone);
 for(let v=0;v<4;v++){
  const yy=v*9+(v%2?2:0);
  line(c,x,y+yy,x+32,y+yy,'#4d5c65');
  const off=v%2?4:17;
  line(c,x+off,y+yy,x+off,y+yy+9,'#84908d');
 }
 if(n%7===0){brick(c,x+2,y+26,14,3,'#98856e');}
}
function wall(c,x,y,n){
 brick(c,x,y,32,32,'#303f48');
 brick(c,x+2,y+3,28,26,'#57616a');
 for(let i=0;i<3;i++){line(c,x+2,y+9+i*9,x+30,y+9+i*9,'#293842');}
 line(c,x+17,y+3,x+17,y+11,'#293842');
 line(c,x+9,y+12,x+9,y+20,'#293842');
 line(c,x+21,y+21,x+21,y+29,'#293842');
 brick(c,x+5,y+2,4,4,'#ad8d5c');
 brick(c,x+25,y+24,4,4,'#ad8d5c');
}
function gate(c,x,y,n,inner){
 // Keep the complete underlying tile usable as original castle tile.
 yard(c,x,y,n);
 brick(c,x+2,y+7,28,22,'#314550');
 brick(c,x+4,y+4,8,17,'#a0896b');
 brick(c,x+20,y+4,8,17,'#a0896b');
 brick(c,x+5,y+2,6,4,'#caac75');
 brick(c,x+21,y+2,6,4,'#caac75');
 brick(c,x+12,y+13,8,15,'#142e3c');
 for(const xx of [13,16,19])line(c,x+xx,y+14,x+xx,y+27,'#ac966f');
 brick(c,x+11,y+10,10,3,'#dfad63');
 brick(c,x+14,y+4,4,3,inner?'#9fe6e4':'#ffc878');
}
function workshop(c,x,y,n){
 yard(c,x,y,n);
 brick(c,x+5,y+11,22,17,'#5a4e46');
 brick(c,x+3,y+8,26,5,'#9e785e');
 brick(c,x+7,y+15,8,7,'#f0ad61');
 brick(c,x+18,y+15,6,7,'#264b54');
 brick(c,x+15,y+18,2,10,'#c2a87c');
 line(c,x+7,y+16,x+13,y+21,'#604c40');
 if(n%2===0){brick(c,x+23,y+4,5,6,'#34424b');}
}
export function paintIndustrialCamp(c,x,y){gate(c,x,y,3,true);}
export function paintIndustrialTerrain(c,map){
 const is04=map.id===3;
 for(let y=0;y<map.h;y++)for(let x=0;x<map.w;x++){
  const tile=map.tiles[y][x],px=x*32,py=y*32,n=(x*17+y*29+map.id*11)%31;
  if(tile==='~')channel(c,px,py,n);
  else if(tile==='+'){
   // Map04: west/centre/east crossings get distinct finishes; gameplay unchanged.
   const which=is04?(x<=3?1:x>=9?2:0):0;
   drawBridge(c,px,py,n,which);
  }else if(tile==='#')wall(c,px,py,n);
  else if(tile==='f'){yard(c,px,py,n);pipes(c,px,py,n);}
  else if(tile==='=')dock(c,px,py,n);
  else if(tile==='c')gate(c,px,py,n,is04);
  else if(tile==='v')workshop(c,px,py,n);
  else yard(c,px,py,n);
  // Delicate overhead mechanical details always align to the underlying square.
  if(tile==='.'&&n%11===0){
   brick(c,px+23,py+2,6,6,'#42505a');
   brick(c,px+24,py+3,4,4,'#c0a16c');
  }
  if(tile==='='&&n%13===0){
   brick(c,px+3,py+3,3,8,'#363e42');
   brick(c,px+4,py+2,2,2,'#f2b765');
  }
 }
}
