// One original diamond holds two HP: indices 0/1 are its left/right half.
// Presentation only. Never round the engine's HP to a number of full diamonds.
export function hpHalves(hp,pendingEnd=hp){
 const n=Math.max(0,Math.min(6,Math.floor(Number(hp)||0)));
 const end=Math.max(0,Math.min(n,Math.floor(Number(pendingEnd)||0)));
 return Array.from({length:6},(_,index)=>({index,gem:Math.floor(index/2),side:index%2?'right':'left',filled:index<n,pending:index<n&&index>=end}));
}

export function paintHpJewels(c,{x,y,hp,pendingEnd=hp,size=7,gap=1,ally=false,lowHp=null}){
 const halves=hpHalves(hp,pendingEnd),height=size;
 c.save();
 for(let gem=0;gem<3;gem++){
  const left=x+gem*(size+gap),mid=left+size/2,cy=y+height/2;
  for(const half of halves.slice(gem*2,gem*2+2)){
   c.beginPath();c.moveTo(mid,y);c.lineTo(half.side==='left'?left:left+size,cy);c.lineTo(mid,y+height);c.closePath();
   c.fillStyle=!half.filled?'#303945':half.pending?'#aeb6bf':hp<=2?'#ffd078':ally?'#bfe9dc':'#ffc1a3';c.fill();
   if(half.filled&&!half.pending){c.strokeStyle='#fff5d7';c.globalAlpha=.48;c.lineWidth=.55;c.stroke();c.globalAlpha=1;}
  }
  c.strokeStyle='#81909b';c.lineWidth=.65;c.beginPath();c.moveTo(mid,y);c.lineTo(left+size,cy);c.lineTo(mid,y+height);c.lineTo(left,cy);c.closePath();c.stroke();
 }
 // Only the surviving LEFT half pulses at HP1; empty halves never light up.
 if(lowHp&&hp===1){
  c.beginPath();c.moveTo(x+size/2,y);c.lineTo(x,y+height/2);c.lineTo(x+size/2,y+height);c.closePath();
  if(lowHp.static){c.strokeStyle='#fff3d0';c.lineWidth=1;c.stroke();}
  else{c.fillStyle=`rgba(255,246,214,${.12+.5*lowHp.amount})`;c.fill();}
 }
 c.restore();
}

// Rectangles are in map pixels, bounded to the VISIBLE viewport, not only the map.
// Reposition cards when adjacent actors would overlap; never move the camera.
export function combatHpLayout(s,view,units){
 const v=view.polygonVisible||{x:0,y:0,w:s.map.w,h:s.map.h};
 const left=Math.max(0,v.x*32)+2,top=Math.max(0,v.y*32)+2;
 const right=Math.min(s.map.w*32,(v.x+v.w)*32)-2,bottom=Math.min(s.map.h*32,(v.y+v.h)*32)-2;
 const w=Math.min(88,right-left),h=36,gap=5;
 const clamp=(n,a,b)=>Math.max(a,Math.min(Math.max(a,b),n));
 const cards=units.map(u=>({id:u.id,x:clamp(u.x*32+16-w/2,left,right-w),y:clamp(u.y*32-(view.sampleTheme&&view.sampleTheme!=='original'?56:6)-h,top,bottom-h),w,h}));
 if(cards.length===2){
  const [a,b]=cards;
  if(a.x<b.x+b.w+gap&&a.x+a.w+gap>b.x&&a.y<b.y+b.h+gap&&a.y+a.h+gap>b.y){
   if(right-left>=w*2+gap){
    const start=clamp((a.x+b.x+w)/2-w-gap/2,left,right-w*2-gap),y=Math.min(a.y,b.y);
    const order=units[0].x<=units[1].x?[a,b]:[b,a];
    Object.assign(order[0],{x:start,y});Object.assign(order[1],{x:start+w+gap,y});
   }else{
    a.y=clamp(Math.min(a.y,b.y),top,bottom-h*2-gap);b.y=a.y+h+gap;
   }
  }
 }
 return cards;
}
