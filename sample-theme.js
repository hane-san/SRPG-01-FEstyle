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
// Issue #97: profile 2 (industrial fantasy) uses rolled steel, brass, soot and wet stone
// in three to four tones under one top-left light. Collision and costs never change.
const STEEL=['#2a353d','#46535c','#66737a','#9aa6a6'],BRASS=['#6d5532','#9c7a45','#c9a463','#ecd39a'];
const rivet=(c,x,y)=>{brick(c,x,y,2,2,BRASS[2]);brick(c,x,y,1,1,BRASS[3]);brick(c,x+1,y+1,1,1,BRASS[0]);};
function pipes(c,x,y,n){
 // Dense upright insulated pipe bundle: visually difficult terrain, never a new obstacle.
 brick(c,x+1,y+27,30,4,'#1d2830');
 for(const [dx,offset,w] of [[2,0,7],[12,5,6],[22,1,7]]){
  const brassy=dx===12;
  brick(c,x+dx,y+1,w,28,brassy?BRASS[1]:STEEL[1]);
  brick(c,x+dx+1,y+1,2,28,brassy?BRASS[3]:STEEL[3]);brick(c,x+dx+w-2,y+1,2,28,brassy?BRASS[0]:STEEL[0]);
  for(const by of [6,20]){const yy=y+by+offset%3;brick(c,x+dx-1,yy,w+2,3,BRASS[2]);brick(c,x+dx-1,yy,w+2,1,BRASS[3]);brick(c,x+dx-1,yy+2,w+2,1,BRASS[0]);}
 }
 // A valve wheel and a faint wisp of steam above every third bundle.
 if(n%3===0){for(const [gx,gy,w,h] of [[23,8,6,2],[23,15,6,2],[22,10,2,5],[28,10,2,5]])brick(c,x+gx,y+gy,w,h,BRASS[2]);brick(c,x+25,y+11,2,2,BRASS[3]);
  brick(c,x+13,y,4,2,'#d9e2e077');brick(c,x+11,y-1,3,1,'#d9e2e055');}
}
function dock(c,x,y,n){
 // Timber walkway on iron straps, worn pale along the middle.
 brick(c,x,y,32,32,'#5b5048');
 for(let i=0;i<5;i++){const yy=y+1+i*6;brick(c,x+1,yy,30,5,i%2?'#8a7a67':'#9a8a74');brick(c,x+1,yy,30,1,'#b8a68a');brick(c,x+1,yy+4,30,1,'#4f463f');}
 brick(c,x+11,y,10,32,'#a8977e55');
 for(const dx of [3,26]){brick(c,x+dx,y,3,32,STEEL[0]);brick(c,x+dx,y,1,32,STEEL[2]);for(const dy of [4,16,28])rivet(c,x+dx,y+dy);}
 if(n%5===0){brick(c,x+8,y+9,16,3,STEEL[1]);brick(c,x+8,y+9,16,1,STEEL[3]);brick(c,x+10,y+14,12,3,BRASS[1]);brick(c,x+10,y+14,12,1,BRASS[3]);}
}
function channel(c,x,y,n){
 brick(c,x,y,32,32,'#1d3c47');
 brick(c,x,y,32,4,'#284d59');
 for(const k of [0,1,2,3]){
  const yy=(n*3+k*8)%28+2;
  brick(c,x+(k*11+n*2)%19,y+yy,10,1,k%2?'#5c8c93':'#336574');
  if(k===1)brick(c,x+(k*11+n*2)%19+3,y+yy-1,4,1,'#9cc3c4');
 }
 // Oil sheen: a short warm streak on some tiles.
 if(n%5===0){brick(c,x+5,y+21,10,1,'#7a8f6a');brick(c,x+9,y+22,6,1,'#a07d5b');}
}
function drawBridge(c,x,y,n,which){
 const wood=which===1?['#6b513c','#886b52','#a98a6a']:which===2?['#55504d','#746c69','#968d88']:['#7a6650','#98836b','#b9a283'];
 brick(c,x,y,32,32,STEEL[0]);
 for(let i=0;i<4;i++){const yy=y+2+i*7;brick(c,x+5,yy,22,6,wood[i%2]);brick(c,x+5,yy,22,1,wood[2]);brick(c,x+5,yy+5,22,1,'#3b3430');}
 for(const xx of [1,27]){
  brick(c,x+xx,y,4,32,STEEL[1]);brick(c,x+xx,y,1,32,STEEL[3]);brick(c,x+xx+3,y,1,32,STEEL[0]);
  for(const yy of [3,15,27])rivet(c,x+xx+1,y+yy);
 }
 if(which===2){ // Weathered but entirely traversable: do not depict a physical gap.
  line(c,x+8,y+3,x+13,y+17,'#3d4449');
  line(c,x+13,y+17,x+21,y+27,'#3d4449');
 }
 if(n%3===0){brick(c,x+15,y+9,3,3,BRASS[2]);brick(c,x+15,y+9,1,1,BRASS[3]);}
}
function yard(c,x,y,n){
 // Riveted floor plates with grime in the seams and a lit top-left edge.
 const tone=n%4===0?'#6b7276':'#5f666b';
 brick(c,x,y,32,32,tone);
 for(const [px,py] of [[0,0],[16,0],[0,16],[16,16]]){
  brick(c,x+px,y+py,16,1,'#7e878a');brick(c,x+px,y+py,1,16,'#7e878a');
  brick(c,x+px+15,y+py,1,16,'#454c51');brick(c,x+px,y+py+15,16,1,'#454c51');
 }
 if(n%2===0){brick(c,x+2,y+2,1,1,'#9aa3a3');brick(c,x+29,y+29,1,1,'#3a4146');}
 if(n%7===0){brick(c,x+3,y+24,13,3,'#7d6b57');brick(c,x+5,y+25,9,1,'#4f4339');}
 if(n%9===0){brick(c,x+19,y+5,8,6,'#4f565b');brick(c,x+20,y+6,6,1,'#8a9394');}
}
function wall(c,x,y,n){
 // Heavy riveted bulkhead with a soot-dark foot.
 brick(c,x,y,32,32,STEEL[0]);
 for(const [px,py,w,h] of [[1,1,14,14],[17,1,14,14],[1,17,14,14],[17,17,14,14]]){
  brick(c,x+px,y+py,w,h,STEEL[1]);brick(c,x+px,y+py,w,2,STEEL[2]);brick(c,x+px,y+py,2,h,STEEL[2]);
  rivet(c,x+px+2,y+py+3);rivet(c,x+px+w-4,y+py+h-4);
 }
 brick(c,x,y+28,32,4,'#1b2329');
 if(n%4===0){brick(c,x+12,y+8,8,3,BRASS[1]);brick(c,x+12,y+8,8,1,BRASS[3]);}
}
function gate(c,x,y,n,inner){
 // Keep the complete underlying tile usable as original castle tile.
 yard(c,x,y,n);
 brick(c,x+1,y+28,30,3,'#1b2329');
 brick(c,x+2,y+7,28,22,'#2b3b44');brick(c,x+2,y+7,28,2,STEEL[2]);
 for(const dx of [3,20]){
  brick(c,x+dx,y+3,9,20,BRASS[1]);brick(c,x+dx,y+3,2,20,BRASS[3]);brick(c,x+dx+7,y+3,2,20,BRASS[0]);
  brick(c,x+dx+1,y+1,7,3,BRASS[2]);rivet(c,x+dx+3,y+8);rivet(c,x+dx+3,y+17);
 }
 brick(c,x+12,y+12,8,16,'#10232d');
 for(const xx of [13,16,19])brick(c,x+xx,y+13,1,15,'#9c8862');
 // A gear crest over the gate and a lamp that glows cool inside the canal fortress.
 for(const [gx,gy,w,h] of [[13,6,6,1],[13,12,6,1],[13,6,1,7],[18,6,1,7]])brick(c,x+gx,y+gy,w,h,BRASS[2]);
 for(const [gx,gy] of [[16,4],[16,13],[11,9],[21,9]])brick(c,x+gx-1,y+gy-1,2,2,BRASS[2]);
 brick(c,x+15,y+8,2,2,inner?'#9fe6e4':'#ffc878');
}
function workshop(c,x,y,n){
 yard(c,x,y,n);
 brick(c,x+4,y+27,25,3,'#1d272d');
 brick(c,x+5,y+11,22,17,'#5a4e46');brick(c,x+5,y+11,2,17,'#7a6a5c');brick(c,x+25,y+11,2,17,'#3f3631');
 for(let r=0;r<3;r++){brick(c,x+3+r,y+7+r*2,26-r*2,2,r%2?'#86654f':'#a37b5f');}
 brick(c,x+7,y+15,8,7,'#f0ad61');brick(c,x+7,y+15,8,2,'#ffd28d');brick(c,x+10,y+15,1,7,'#5a4e46');
 brick(c,x+18,y+15,6,13,'#22414a');brick(c,x+18,y+15,6,1,'#4c7480');
 // Chimney with a lit cap and a short smoke plume.
 brick(c,x+22,y+1,5,8,STEEL[1]);brick(c,x+22,y+1,1,8,STEEL[3]);brick(c,x+21,y+1,7,2,BRASS[2]);
 if(n%2===0){brick(c,x+23,y-2,3,2,'#c9cfcc66');brick(c,x+25,y-4,3,2,'#c9cfcc44');}
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
