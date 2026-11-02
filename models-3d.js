import {mesh,LIMITS,rgb} from './mesh-3d.js?v=webgl102';
import {surfaceHeight} from './projection-3d.js?v=webgl102';
const steel=rgb('#586575'),brass=rgb('#c19a55'),stone=rgb('#85847c'),dark=rgb('#26313e'),wood=rgb('#634a35'),skin=rgb('#dbb99a');
// Different silhouettes and construction, rather than two palettes on one mesh.
export function terrainMesh(map,theme,units=[]){
 const m=mesh(),industrial=theme==='industrial',near=(x,y)=>units.some(u=>u.alive&&u.deployed!==false&&Math.abs(u.x-x)+Math.abs(u.y-y)<=1);
 for(let z=0;z<map.h;z++)for(let x=0;x<map.w;x++){
  const t=map.tiles[z][x],h=surfaceHeight(map,{x,y:z}),a=x+.5,b=z+.5,n=(x*31+z*17)%9;
  const ground=rgb(industrial?(t==='~'?'#305d68':t==='f'?'#4e6660':t==='='?'#a6a08e':'#656e72'):(t==='~'?'#3c7e94':t==='f'?'#53705a':t==='='?'#b2a17a':'#7c8b61'));
  m.box(a,h-.22,b,1,.22,1,ground);
  if(t!=='~')for(const [dx,dz]of [[-1,0],[1,0],[0,-1],[0,1]])if(map.tiles[z+dz]?.[x+dx]==='~'){
   m.box(a+dx*.46,h-.1,b+dz*.46,dx?.08:1,.24,dz?.08:1,industrial?steel:stone);
   if(industrial)m.box(a+dx*.46,h+.14,b+dz*.46,dx?.1:1,.025,dz?.1:1,brass);
  }
  if(industrial){
   if(t!=='~'){
    m.box(a,h+.004,z+.06,.88,.012,.025,dark);m.box(x+.06,h+.004,b,.025,.012,.88,dark);
    if(t==='=')for(const dz of [-.3,.3])m.box(a,h+.012,b+dz,.74,.014,.035,brass);
   }else for(const dz of [-.3,.2])m.box(a,h+.005,b+dz,.3+n*.03,.008,.018,rgb('#74a0a8'));
   if(t==='f'){
    m.tube([a-.24,h,b+.22],[a-.24,h+.72,b+.22],.07,steel);
    m.tube([a-.24,h+.72,b+.22],[a+.2,h+.72,b+.22],.07,brass);
    m.tube([a+.2,h+.72,b+.22],[a+.2,h+.42,b+.22],.07,steel);
    for(const y of [.17,.57])m.tube([a-.24,h+y-.025,b+.22],[a-.24,h+y+.025,b+.22],.1,brass);
    m.box(a+.2,h+.4,b+.2,.19,.18,.22,brass);
   }
   if(t==='+'){
    for(const side of [-.42,.42]){
     m.box(a+side,h-.14,b,.06,.44,1,steel);
     for(const dz of [-.38,.38])m.tube([a+side,h+.18,b+dz],[a+side,h-.12,b-dz],.025,brass,4);
    }
   }
   if(t==='#'){
    m.box(a,h,b,.85,near(x,z)?.35:1.0,.8,steel);
    m.box(a,h+.15,b-.4,.7,.04,.06,brass);
    for(const dx of [-.3,.3])m.rock(a+dx,h+.28,b-.43,.035,.035,.02,brass);
   }
  }else{
   if(t==='.'&&n%3===0){
    m.rock(a-.32,h+.015,b+.3,.23,.045,.18,rgb('#8c9272'),n);
    m.rock(a+.32,h+.012,b-.3,.17,.035,.2,rgb('#778560'),n+2);
   }
   if(t==='f'){
    const compact=near(x,z),height=compact?.3:1.05;
    m.tube([a,h,b],[a-.07,h+height,b+.05],.09,wood,7,.05);
    for(const [dx,dz,dy]of [[-.18,0,.05],[.18,.1,.15],[0,-.18,.32]])m.rock(a+dx,h+height*.65+dy*(compact?.3:1),b+dz,.34,compact?.12:.35,.32,rgb(n%2?'#365846':'#497257'),n);
   }
   if(t==='#')for(let k=0;k<3;k++)m.rock(a+(k-1)*.2,h,b+(k%2)*.18,.36,near(x,z)?.28:.7,.32,k%2?stone:rgb('#6f776f'),n+k);
   if(t==='+'){
    for(const side of [-.43,.43]){
     for(let k=0;k<4;k++)m.box(a+side,h,b-.375+k*.25,.13,.2,.23,stone);
     m.tube([a+side,h-.12,b-.46],[a+side,h-.12,b+.46],.05,wood);
    }
   }
   if(t==='=')for(let k=0;k<3;k++)m.rock(a-.3+k*.3,h+.01,b+(k%2?.2:-.15),.11,.02,.08,rgb('#c4b38c'),k);
  }
  if(t==='c'||t==='v'||(map.camp?.x===x&&map.camp?.y===z)){
   const low=near(x,z),color=industrial?steel:stone;
   m.box(a,h,b,.76,.27,.72,color);
   if(!industrial){
    for(const dy of [.07,.19])for(const dx of [-.27,-.08,.12,.3])m.box(a+dx,h+dy,b-.365,.15,.015,.012,rgb('#b5afa0'));
   }else for(const dx of [-.28,.28])m.rock(a+dx,h+.18,b-.37,.025,.025,.02,brass);
   if(t==='v'){
    m.box(a,h+.27,b,.55,.32,.5,industrial?steel:rgb('#c6b18c'));
    if(industrial){m.box(a,h+.59,b,.65,.09,.6,steel);m.tube([a+.16,h+.6,b],[a+.16,h+.9,b],.05,brass);}
    else{
     const l=[a-.38,h+.57,b-.33],r=[a+.38,h+.57,b-.33],l2=[a-.38,h+.57,b+.33],r2=[a+.38,h+.57,b+.33],q=[a,h+.88,b-.33],q2=[a,h+.88,b+.33];
     m.tri(l,r,q,wood);m.tri(l2,q2,r2,wood);m.tri(l,q,q2,wood);m.tri(l,q2,l2,wood);m.tri(r,r2,q2,wood);m.tri(r,q2,q,wood);
    }
   }else{
    for(const dx of [-.3,.3]){
     m.box(a+dx,h+.27,b,.18,low?.2:.65,.65,color);
     for(const dz of [-.24,0,.24])m.box(a+dx,h+(low?.47:.92),b+dz,.2,.1,.12,industrial?brass:stone);
    }
    // A gate with visible jambs and lintel, not a closed block over the cell.
    m.box(a,h+.48,b-.26,.46,.12,.15,industrial?brass:stone);
    for(const dx of [-.19,.19])m.box(a+dx,h+.28,b-.26,.07,.2,.16,dark);
    m.rock(a+.3,h+.56,b-.34,.045,.07,.04,rgb(industrial?'#efbb57':'#d8cdad'));
   }
  }
 }
 return m.vertices();
}

export function unitPose(u,view,{fast=false,reduced=false,target=null}={}){
 const a=view.animation,move=view.motion?.id===u.id&&a?.stage==='move',p=a?.progress??0;
 const motion=view.motion?.id===u.id&&(!reduced||move)?view.motion:u;
 const from=view.strike?.from?.id===u.id?view.strike.from:view.projectile?.from?.id===u.id?view.projectile.from:null;
 const to=from?(view.strike?.to||view.projectile?.to):a?.actor===u.id?target:null;
 let angle=u.team==='ally'?Math.PI:0;
 if(move){const route=a.path||[],i=a.segment||1,b=route[i],q=route[i-1];if(b&&q)angle=Math.atan2(b.x-q.x,b.y-q.y);}
 if(to)angle=Math.atan2(to.x-u.x,to.y-u.y);
 const phase=move?(a.segment-1+p)*Math.PI*2:0;
 const windup=a?.actor===u.id&&a.stage==='windup';
 const recovery=a?.actor===u.id&&['hitstop','shatter','reform'].includes(a.stage);
 const attack=windup?(fast||reduced?.4:p<.28?-.2*Math.sin(p/.28*Math.PI/2):(p-.28)/.72):recovery?(fast||reduced?.4:a.stage==='hitstop'?1:1-.8*Math.min(1,(a.index-1+p)/Math.max(1,view.jewel?.count||1))):0;
 const hit=view.impact?.id===u.id&&!reduced?Math.sin(Math.PI*view.impact.progress)*.12:0;
 const collapse=view.ghost?.unit.id===u.id?(reduced?1:view.ghost.progress):0;
 return {x:motion.x,z:motion.y,angle,walk:move&&!fast&&!reduced?Math.sin(phase)*.45:0,
  attack,hit,collapse,
  breath:!a&&!u.acted&&!fast&&!reduced?Math.sin((view.idleTime||0)/700+u.x)*.013:0};
}
export function unitsMesh(state,view,options={}){
 const m=mesh(LIMITS.dynamicVertices),industrial=view.sampleTheme==='industrial';
 const units=state.units.filter(u=>u.alive&&u.deployed!==false);
 if(view.sortieUnit)units.push(view.sortieUnit);
 if(view.ghost)units.push(view.ghost.unit);
 const chosen=state.units.find(u=>u.id===view.selected);
 if(chosen?.alive&&view.dest&&(view.dest.x!==chosen.x||view.dest.y!==chosen.y))units.push({...chosen,...view.dest,id:'draft'});
 for(const u of units){
  const p=unitPose(u,view,{...options,target:state.units.find(t=>t.id===view.animation?.target)}),base=surfaceHeight(state.map,u),co=Math.cos(p.angle),si=Math.sin(p.angle),fall=1-p.collapse*.75;
  const tint=u.acted?rgb('#7c8183'):u.team==='ally'?rgb(industrial?'#467d9e':'#386d94'):rgb(industrial?'#a65e49':'#a64550');
  const metal=industrial?steel:rgb('#b0b6b7'),trim=industrial?brass:rgb('#bbae83');
  const point=(x,y,z)=>[p.x+.5+x*co+z*si,base+y*fall+p.breath,p.z+.5-x*si+z*co];
  const box=(x,y,z,w,h,d,c,angle=0)=>{const a=point(x,y,z);m.box(...a,w,h*fall,d,c,p.angle+angle);};
  const bone=(a,b,r,c,sides=7)=>m.tube(point(...a),point(...b),r,c,sides);
  const orb=(x,y,z,rx,ry,rz,c,n=0)=>m.rock(...point(x,y,z),rx,ry*fall,rz,c,n);
  // Grounded, flattened footprint; depth-tested along with the model.
  orb(0,.015,0,.3,.012,.25,dark);
  let seat=0;
  if(u.type==='horse'){
   seat=.58;orb(0,.58,0,.26,.36,.44,industrial?rgb('#5e6967'):rgb('#7f5541'));
   for(const [x,z]of [[-.18,-.25],[.18,-.25],[-.18,.25],[.18,.25]]){
    const step=p.walk*(x*z>0?1:-1);bone([x,.6,z],[x,.25,z+step*.22],.065,industrial?steel:wood);
    bone([x,.25,z+step*.22],[x,.06,z+step*.4],.045,dark);
   }
   bone([0,.65,.25],[0,1.02,.43],.13,industrial?metal:wood);orb(0,1.03,.5,.13,.22,.21,industrial?steel:wood);
   bone([0,.72,-.36],[0,.37,-.5],.035,dark);box(0,.78,-.04,.32,.1,.28,trim);
  }
  if(u.type==='shooter'){
   for(const x of [-.28,.28])bone([x,.18,-.22],[x,.18,.25],.17,industrial?steel:wood,10);
   box(0,.2,0,.48,.18,.57,industrial?steel:wood);
   bone([0,.5,-.26-p.attack*.08],[0,.64,.45-p.attack*.12],industrial?.14:.1,industrial?steel:rgb('#5f6967'),10);
   bone([0,.61,.4],[0,.64,.47],.15,trim,10);
   if(industrial){box(0,.32,-.14,.3,.19,.22,brass);bone([-.18,.4,-.1],[-.18,.64,-.1],.025,brass);}
   // Gunner beside the carriage, with both arms bracing it.
   orb(-.22,.84,-.25,.11,.19,.11,skin);box(-.22,.4,-.25,.24,.3,.2,tint);
   bone([-.3,.6,-.2],[-.2,.52,.07],.04,metal);continue;
  }
  const legTop=.45+seat,bodyTop=.96+seat;
  for(const side of [-1,1]){
   const stride=p.walk*side;
   bone([side*.105,legTop,0],[side*.13,.22+seat,stride*.22],u.type==='shield'?.085:.065,dark);
   bone([side*.13,.22+seat,stride*.22],[side*.13,.06+seat,-stride*.28],.055,industrial?steel:wood);
   box(side*.13,.04+seat,-stride*.28,.13,.07,.22,dark);
  }
  if(u.type==='mage'){
   bone([0,.25,0],[0,.84,0],.25,tint,8);box(0,.6,0,.12,.3,.28,industrial?brass:rgb('#d8d2c2'));
  }else{
   orb(0,.62+seat,-p.hit,.22,.32,.16,tint,2);
   if(u.type==='shield'||industrial)box(0,.55+seat,.07,.34,.27,.13,metal);
   box(0,.47+seat,0,.36,.06,.27,trim);
  }
  orb(0,1.02+seat,-p.hit,.12,.21,.13,u.type==='bandit'?dark:skin,2);
  if(u.type==='shield'){box(0,1.09+seat,0,.28,.12,.27,metal);box(0,1.19+seat,-.01,.04,.1,.18,trim);}
  else if(industrial){box(0,1.14+seat,0,.27,.07,.28,dark);for(const x of [-.055,.055])orb(x,1.11+seat,.12,.035,.035,.03,brass);}
  else if(u.type==='mage')m.tube(point(0,1.08,0),point(0,1.4,0),.17,tint,7,.01);
  else if(u.type==='bandit')box(0,1.09,.02,.27,.07,.29,rgb('#876e49'));
  const reach=p.attack*.32,armY=bodyTop-.15;
  for(const side of [-1,1]){
   const elbow=[side*.28,armY-.14+reach*.7,.03+reach*.4],hand=[side*.28,armY-.17+reach,.12+reach];
   bone([side*.2,armY,0],elbow,.06,tint);bone(elbow,hand,.048,metal);
  }
  if(u.type==='shield'){
   box(-.28,.49+seat+p.hit,.23,.28,.49,.09,industrial?steel:tint);
   orb(-.28,.73+seat,.3,.07,.07,.035,trim);
   box(-.28,.7+seat,.29,.22,.04,.03,trim);bone([.27,.6+seat,.12],[.3,1.12+seat,reach],.025,metal,4);
  }else if(u.type==='bow'){
   const bowColor=industrial?brass:wood;
   bone([-.26,.48+seat,.3],[.02,.76+seat,.42],.026,bowColor);
   bone([.02,.76+seat,.42],[-.26,1.03+seat,.3],.026,bowColor);
   bone([-.26,.48+seat,.3],[-.26,1.03+seat,.3],.008,skin,3);
   bone([-.26,.75+seat,.3-reach],[.14,.75+seat,.43],.012,metal,4);
   bone([.2,armY,0],[-.15,armY,.25-reach],.04,tint);
  }else if(u.type==='mage'){
   bone([.27,.12,.22],[.27,1.27+p.attack*.16,.22+reach],.025,industrial?brass:wood);
   orb(.27,1.3+p.attack*.16,.22+reach,.08,.12,.08,rgb('#b1eed2'));
   bone([-.22,.8,0],[-.24,.9+p.attack*.23,.2+reach],.045,tint);
  }else{
   const spear=u.type==='spear'||u.type==='horse';
   bone([.27,.58+seat,.1],[.27,.95+seat+reach,(spear?1.03:.5)+reach],spear?.025:.045,industrial?brass:metal,4);
   if(u.type==='bandit')bone([.27,.9,.42],[.42,.99,.56],.04,metal,4);
  }
  if(u.rank==='upper')orb(0,bodyTop+.04,-.01,.25,.07,.19,trim);
 }
 if(view.projectile){
  const {from,to,progress,heal,type}=view.projectile;
  const x=from.x+.5+(to.x-from.x)*progress,z=from.y+.5+(to.y-from.y)*progress,
   y=surfaceHeight(state.map,from)+.9+(type==='bow'?Math.sin(progress*Math.PI)*.35:0);
  if(heal)m.rock(x,y,z,.09,.12,.09,rgb('#c6ffdd'));
  else{
   const dx=to.x-from.x,dz=to.y-from.y,len=Math.hypot(dx,dz)||1;
   m.tube([x-dx/len*.3,y,z-dz/len*.3],[x,y,z],type==='shooter'?.055:.018,brass,5,0);
  }
 }
 return m.vertices();
}
