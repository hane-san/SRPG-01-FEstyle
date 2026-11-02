// Original meshes for the two playable worlds. No downloaded models/textures.
import {Mesh,rgba} from './polygon-mesh.js?v=polygon109';
export const WORLD_PALETTES=Object.freeze({
 industrial:{ground:'#8b968d',road:'#a69b85',water:'#477580',stone:'#697780',dark:'#293e49',metal:'#aabdba',brass:'#c49b58',wood:'#78634f',roof:'#49616b',leaf:'#6a8580',lamp:'#ffcf7d'},
 fantasy:{ground:'#8eaa7d',road:'#c0b193',water:'#669baf',stone:'#a3a69a',dark:'#475a59',metal:'#d2d9ce',brass:'#d1b36a',wood:'#80654c',roof:'#84665e',leaf:'#466e58',lamp:'#e8d8b2'}
});
function wheel(m,x,y,z,r,spin,p,industrial){
 m.push({x,y,z,rz:Math.PI/2,ry:spin});m.cylinder(0,0,0,r,.075,p.dark,12);
 m.cylinder(0,0,0,r*.79,.09,industrial?p.brass:p.wood,12);m.cylinder(0,0,0,.055,.13,p.metal,8);
 for(let i=0;i<6;i++){const a=i*Math.PI/3;m.beam([0,.06,0],[Math.cos(a)*r*.74,.06,Math.sin(a)*r*.74],.012,p.dark);}
 m.pop();
}
function roof(m,x,y,z,w,h,d,p,industrial){
 if(industrial){m.bevel(x,y,z,w,.1,d,p.roof);for(let i=-1;i<=1;i++)m.box(x+i*w*.27,y+.06,z,.025,.025,d,p.brass);return;}
 const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],e=[x-w/2,y,z+d/2],f=[x,y+h,z-d/2],g=[x,y+h,z+d/2];
 m.quad(a,e,g,f,p.roof);m.quad(f,g,c,b,p.roof);m.tri(a,f,b,p.wood);m.tri(e,c,g,p.wood);
 for(let i=1;i<4;i++){const yy=y+h*i/4,ww=w*(1-i/4);m.beam([x-ww/2,yy,z-d/2],[x-ww/2,yy,z+d/2],.012,p.wood);m.beam([x+ww/2,yy,z-d/2],[x+ww/2,yy,z+d/2],.012,p.wood);}
}
export function terrainMesh(map,theme,mesh=new Mesh()){
 const p=WORLD_PALETTES[theme],industrial=theme==='industrial';mesh.reset();
 for(let z=0;z<map.h;z++)for(let x=0;x<map.w;x++){
  const tile=map.tiles[z][x],n=(x*17+z*31)%11,cx=x+.5,cz=z+.5;
  const ground=tile==='~'?p.water:tile==='='||tile==='+'?p.road:p.ground;
  // Ground needs its top/side faces, not dozens of subpixel bevel triangles.
  // Keep bevel detail on armour/architecture where the silhouette can show it.
  mesh.box(cx,tile==='~'?-.34:-.13,cz,1,.2,1,p.dark);mesh.box(cx,tile==='~'?-.12:-.025,cz,.98,.05,.98,ground);
  if(tile==='~'){
   for(let i=0;i<3;i++)mesh.box(x+.15+(n+i*3)%7*.1,-.086,z+.2+i*.25,.23,.005,.018,industrial?'#79a4a6':'#a3c8c7');
  }else if(tile==='='){
   for(let i=0;i<3;i++){mesh.box(cx,.005,z+.16+i*.32,.83,.018,.022,industrial?p.metal:p.stone);}
   if(industrial){for(const xx of [x+.08,x+.92])mesh.box(xx,.018,cz,.035,.03,.95,p.brass);}
   else if(n%3===0)mesh.bevel(x+.1,.03,z+.1,.09,.06,.08,p.stone,.01);
  }else if(tile==='+'){
   // Walk deck is Y=0. Structural beams/arches sit below it; rails stay low.
   for(let i=0;i<5;i++)mesh.bevel(cx,.018,z+.1+i*.19,.86,.045,.15,industrial?p.metal:p.wood,.012);
   for(const xx of [x+.04,x+.96]){
    mesh.box(xx,-.15,cz,.09,.28,.98,p.stone);mesh.box(xx,.16,cz,.045,.045,1,industrial?p.brass:p.wood);
    for(const zz of [z+.12,z+.87])mesh.bevel(xx,.08,zz,.1,.22,.1,p.stone,.015);
    if(industrial)for(let i=0;i<4;i++)mesh.cylinder(xx,.19,z+.12+i*.25,.025,.035,p.lamp,6);
   }
  }else if(tile==='f'){
   mesh.cylinder(cx,.012,cz,.44,.012,rgba(p.dark,.17),12);
   if(industrial&&n%3===0){
    mesh.bevel(cx,.28,cz,.78,.55,.71,p.dark,.045);roof(mesh,cx,.58,cz,.86,.04,.8,p,true);
    for(const xx of [x+.25,x+.5,x+.75]){mesh.box(xx,.27,z+.865,.12,.17,.02,p.lamp);mesh.box(xx,.27,z+.88,.018,.18,.025,p.metal);}
    mesh.cylinder(x+.72,.86,z+.28,.11,.65,p.stone,10,.085);mesh.cylinder(x+.72,1.2,z+.28,.13,.06,p.brass,10);
    mesh.beam([x+.1,.35,z+.05],[x+.1,.35,z+.8],.05,p.brass);
    continue;
   }
   for(let i=0;i<2;i++){
    const tx=x+.25+i*.48,tz=z+.28+((n+i)%3)*.2;
    if(industrial){
     mesh.bevel(tx,.16,tz,.24,.3,.28,p.dark);mesh.cylinder(tx,.45,tz,.09,.34,p.stone,8,.07);mesh.cylinder(tx,.63,tz,.12,.05,p.brass,10);
     mesh.box(tx,.25,tz+.145,.11,.12,.015,p.lamp);mesh.beam([tx,.2,tz],[tx+.2,.2,tz],.04,p.brass);
    }else{
     mesh.cylinder(tx,.23,tz,.055,.46,p.wood,7,.035);
     mesh.ellipsoid(tx,.54,tz,.29,.36,.28,p.leaf,8,5);mesh.ellipsoid(tx-.08,.78,tz-.04,.23,.27,.23,'#71916b',8,4);
    }
   }
  }else if(tile==='#'){
   mesh.ellipsoid(cx,.16,cz,.43,.27,.4,p.stone,7,3);mesh.ellipsoid(x+.3,.11,z+.3,.24,.18,.19,p.dark,6,3);
   if(industrial){mesh.cylinder(cx,.27,cz,.11,.15,p.brass,8);mesh.box(cx,.37,cz,.17,.035,.19,p.metal);}
  }else if(tile==='c'){
   mesh.bevel(cx,.1,cz,.94,.2,.91,p.stone);mesh.bevel(cx,.4,cz-.08,.6,.57,.5,p.stone);
   // Gate, buttresses, individual courses and battlements keep the fortress legible.
   mesh.box(cx,.27,z+.78,.22,.48,.025,p.dark);
   for(const xx of [x+.15,x+.85]){
    mesh.bevel(xx,.49,cz,.23,.85,.67,p.stone);
    for(let i=0;i<3;i++)mesh.box(xx,.97,z+.25+i*.24,.23,.14,.1,industrial?p.metal:p.stone);
   }
   for(let j=0;j<5;j++)for(let i=0;i<4;i++)mesh.box(x+.22+i*.17,.15+j*.12,z+.755,.015,.016,.025,p.dark);
   if(industrial){
    mesh.beam([x+.18,.65,z+.81],[x+.82,.65,z+.81],.045,p.brass);
    for(const xx of [x+.2,x+.8]){mesh.cylinder(xx,.27,z+.8,.05,.14,p.brass);mesh.box(xx,.42,z+.8,.07,.13,.05,p.lamp);}
    mesh.cylinder(cx,.79,z+.28,.18,.15,p.dark,12);mesh.cylinder(cx,.88,z+.28,.12,.05,p.brass,12);
   }else{roof(mesh,cx,.74,z+.36,.4,.3,.35,p,false);mesh.beam([cx,.96,z+.25],[cx,1.33,z+.25],.014,p.wood);mesh.tri([cx,1.33,z+.25],[cx+.26,1.25,z+.25],[cx,1.08,z+.25],p.roof);}
  }else if(tile==='v'){
   for(const [dx,dz] of [[.3,.34],[.7,.68]]){
    mesh.bevel(x+dx,.16,z+dz,.38,.33,.35,p.stone);roof(mesh,x+dx,.33,z+dz,.45,.19,.43,p,industrial);
    mesh.box(x+dx,.15,z+dz+.18,.08,.18,.02,p.wood);mesh.box(x+dx-.11,.22,z+dz+.18,.065,.075,.025,p.lamp);
    if(industrial){mesh.cylinder(x+dx+.1,.47,z+dz-.07,.045,.22,p.dark,7);mesh.beam([x+dx-.19,.15,z+dz],[x+dx+.19,.15,z+dz],.02,p.brass);}
   }
  }else{
   // Sparse reeds/grass/metal drains vary the ground without covering legal cells.
   if(n%3===0)for(let i=0;i<3;i++)mesh.beam([x+.12+i*.065,0,z+.2],[x+.1+i*.09,.055,z+.2],.009,industrial?p.stone:p.leaf,4);
   if(industrial&&n===2){mesh.bevel(x+.82,.02,z+.82,.23,.04,.23,p.dark,.02);for(let i=0;i<3;i++)mesh.box(x+.75+i*.065,.045,z+.82,.025,.012,.19,p.metal);}
  }
 }
 // The actual camp can lie on road, not on a castle tile.
 if(map.camp&&map.tiles[map.camp.y][map.camp.x]!=='c'){
  const {x,y:z}=map.camp;mesh.bevel(x+.5,.05,z+.5,.82,.1,.82,p.stone);
  for(const xx of [x+.12,x+.88]){mesh.bevel(xx,.23,z+.2,.12,.45,.14,p.stone);mesh.cylinder(xx,.49,z+.2,.05,.09,p.lamp,6);}
  mesh.beam([x+.12,.44,z+.2],[x+.88,.44,z+.2],.035,p.brass);
 }
 return mesh;
}

export function unitPose(u,s,view,time=0,reduced=false){
 const a=view.animation,moving=view.motion?.id===u.id?view.motion:null;
 let facing=u.team==='ally'?Math.PI:0,step=0,attack=0,hit=0,heal=false,death=0;
 if(moving&&a?.kind==='move'){
  const prev=a.path[Math.max(0,(a.segment||1)-1)],next=a.path[a.segment||1];
  if(next&&prev)facing=Math.atan2(next.x-prev.x,next.y-prev.y);
  step=((a.segment||1)-1+(a.progress||0))*Math.PI;
 }
 if(a?.actor===u.id&&['hit','heal'].includes(a.kind)){
  const target=s.units.find(t=>t.id===a.target);if(target)facing=Math.atan2(target.x-u.x,target.y-u.y);
  if(a.stage==='windup'){attack=Math.sin((a.progress||0)*Math.PI/2);heal=a.kind==='heal';}
 }
 if(view.impact?.id===u.id&&view.impact.kind!=='heal')hit=Math.sin(Math.PI*view.impact.progress)*.18;
 if(view.ghost?.unit.id===u.id)death=view.ghost.progress;
 const fire=a?.actor===u.id&&(a.stage==='hitstop'||a.stage==='shatter'&&a.index===1)?(a.stage==='hitstop'?1:1-a.progress):0;
 return {x:moving?.x??u.x,z:moving?.y??u.y,facing,step:reduced?0:step,walking:!!moving&&a?.kind==='move',attack:reduced?0:attack,fire:reduced?0:fire,heal,hit:reduced?0:hit,death:reduced?0:death,
  breath:reduced||u.acted?0:Math.sin(time*.002+u.id.length)*.012};
}

export function unitMesh(mesh,u,theme,pose){
 const p=WORLD_PALETTES[theme],industrial=theme==='industrial',ally=u.team==='ally',spent=ally&&u.acted;
 const coat=spent?'#7e8886':ally?(industrial?'#416b85':'#496fb2'):(industrial?'#99564e':'#af4e63');
 const light=spent?'#adb6ad':ally?'#a6c6d7':'#dfb29e',metal=industrial?p.metal:'#d8ded5',skin='#dfc5a5';
 const leather=industrial?'#534d43':'#705341',armour=u.type==='shield',mounted=u.type==='horse',gun=u.type==='shooter';
 const walk=pose.walking?Math.sin(pose.step)*.55:0,heavy=armour?.9:1;
 mesh.push({x:pose.x+.5,y:0,z:pose.z+.82,ry:pose.facing,scale:pose.z<.1&&mounted?.75:1});
 mesh.cylinder(0,.008,0,mounted||gun?.36:.26,.01,rgba('#21353d',.2),12);
 mesh.push({y:-pose.hit*.08,z:-pose.hit*.2,rx:pose.death*1.35-pose.hit*.6,scale:1-pose.death*.55});
 let torso=.66;
 if(mounted){
  const horse=industrial?'#727b76':'#857567';
  mesh.ellipsoid(0,.48,-.02,.23,.22,.43,horse,10,5);
  mesh.push({x:0,y:.55,z:.33,rx:-.4});mesh.bevel(0,.08,.04,.18,.38,.21,horse);mesh.ellipsoid(0,.27,.14,.12,.14,.23,horse,8,4);mesh.pop();
  for(const x of [-.15,.15])for(const z of [-.28,.24]){
   mesh.push({x,y:.42,z,rx:((x>0)===(z>0)?walk:-walk)});mesh.bevel(0,-.18,0,.07,.35,.09,horse,.015);mesh.bevel(0,-.35,.025,.09,.09,.14,leather,.012);mesh.pop();
  }
  mesh.bevel(0,.68,-.04,.32,.08,.26,leather);mesh.bevel(0,.76,-.1,.25,.12,.18,coat);
  mesh.beam([-.11,.84,.03],[-.1,.76,.52],.012,p.brass);mesh.beam([.11,.84,.03],[.1,.76,.52],.012,p.brass);
  mesh.beam([0,.57,-.42],[0,.3,-.55],.045,p.dark);torso=.96;
  // Rider's thighs/boots straddle the saddle; the torso must not float above it.
  for(const side of [-1,1]){
   mesh.bevel(side*.245,.62,-.08,.12,.31,.14,leather,.02);
   mesh.bevel(side*.26,.43,-.015,.14,.13,.22,p.dark,.018);
   mesh.beam([side*.28,.39,-.08],[side*.28,.39,.12],.012,p.brass);
  }
 }else if(gun){
  mesh.bevel(0,.19,.06,.55,.14,.62,leather);mesh.beam([-.3,.18,0],[.3,.18,0],.035,p.metal);
  for(const x of [-.3,.3])wheel(mesh,x,.2,0,.2,pose.walking?pose.step:0,p,industrial);
  mesh.push({x:0,y:.33,z:.1-pose.fire*.14,rx:pose.fire*.1});
  if(industrial){mesh.push({rx:Math.PI/2});mesh.cylinder(0,.12,0,.09,.6,p.dark,12,.07);mesh.cylinder(0,.43,0,.1,.08,p.brass,12);mesh.pop();mesh.bevel(0,.1,-.1,.26,.19,.21,p.metal);}
  else{mesh.bevel(0,.13,0,.12,.28,.56,p.wood);for(const x of [-.27,.27])mesh.beam([x,.18,.22],[0,.22,-.13],.04,p.wood);mesh.beam([-.27,.18,.22],[.27,.18,.22],.012,p.metal);}
  mesh.pop();torso=.64;
 }
 if(!mounted){
  for(const side of [-1,1]){
   mesh.push({x:side*.095,y:torso-.31,z:gun?-.19:0,rx:side*walk*heavy});
   mesh.bevel(0,-.13,0,.13,.29,.14,leather,.02);mesh.bevel(0,-.29,.055,.15,.12,.23,p.dark,.02);mesh.pop();
  }
 }
 torso+=pose.breath;
 // Torso silhouette, cuirass/coat seams, shoulder armour and cloak are distinct.
 mesh.bevel(0,torso,gun?-.18:0,armour?.43:.31,.35,.23,armour?metal:coat,.035);
 mesh.bevel(0,torso-.16,0,.32,.07,.25,leather,.015);mesh.box(0,torso-.16,.139,.065,.065,.02,p.brass);
 if(industrial){
  mesh.bevel(0,torso+.02,.13,.18,.19,.055,p.dark,.015);
  for(const xx of [-.06,.06])mesh.cylinder(xx,torso+.06,.17,.025,.04,p.brass,6);
  mesh.bevel(0,torso,-.18,.23,.24,.12,p.dark,.02);mesh.cylinder(.1,torso+.11,-.2,.04,.23,p.brass,8);
 }else{
  mesh.box(0,torso,.127,.06,.3,.025,light);
  mesh.quad([-.17,torso+.14,-.13],[.17,torso+.14,-.13],[.23,torso-.37,-.21-pose.breath],[ -.23,torso-.37,-.21-pose.breath],coat);
  mesh.beam([-.14,torso+.14,-.14],[-.23,torso-.37,-.22],.012,p.brass);mesh.beam([.14,torso+.14,-.14],[.23,torso-.37,-.22],.012,p.brass);
 }
 const headY=torso+.31;
 mesh.ellipsoid(0,headY,.01,.13,.15,.125,skin,10,5);
 if(u.type==='mage'){
  if(industrial){mesh.bevel(0,headY+.08,0,.29,.12,.28,p.dark,.025);mesh.box(0,headY+.01,.13,.23,.055,.035,p.brass);mesh.box(0,headY+.01,.153,.16,.035,.012,p.lamp);}
  else{mesh.cylinder(0,headY+.09,0,.18,.05,coat,10);mesh.cylinder(0,headY+.23,0,.145,.29,coat,10,.025);}
  mesh.cylinder(0,torso-.13,0,.2,.28,coat,8,.15);
 }else if(u.type==='bandit'){
  mesh.ellipsoid(0,headY+.06,-.025,.155,.14,.14,leather,8,4);mesh.box(0,headY-.02,.13,.23,.09,.035,p.dark);
 }else{
  mesh.ellipsoid(0,headY+.07,-.015,.15,.135,.14,industrial?p.dark:metal,10,4);
  mesh.box(0,headY+.005,.137,.23,.045,.025,p.dark);
  if(armour){mesh.bevel(0,headY-.06,.14,.22,.15,.06,metal,.015);mesh.box(0,headY,.18,.05,.14,.015,p.brass);}
  if(industrial){for(const x of [-.07,.07])mesh.ellipsoid(x,headY+.01,.15,.04,.04,.035,p.brass,6,3);}
  else mesh.bevel(0,headY+.2,-.025,.06,.2,.17,coat,.018);
 }
 if(u.rank==='advanced')for(const x of [-.14,.14])mesh.ellipsoid(x,torso+.17,0,.11,.075,.15,p.brass,7,3);
 // Arms pivot with the actual shared windup. Shield braces, bow draws, mage raises.
 for(const side of [-1,1]){
  const arm=pose.attack*(u.type==='bow'?(side>0?-.9:.4):u.type==='mage'?-.8:side>0?-1.45:-.2);
  mesh.push({x:side*(armour?.24:.2),y:torso+.12,z:gun?-.15:0,rx:arm-pose.hit*.5});
  mesh.bevel(0,-.11,0,armour?.17:.115,.25,.14,armour?metal:coat,.02);mesh.ellipsoid(0,-.25,.025,.065,.07,.065,skin,7,3);
  if(side===1){
   if(u.type==='mage'){
    mesh.beam([.04,-.49,.06],[.04,.2,.06],.025,industrial?p.brass:p.wood);mesh.ellipsoid(.04,.25,.06,.075,.09,.075,pose.heal?'#b4efd2':p.lamp,8,4);
    if(industrial)mesh.bevel(.04,.25,.06,.17,.14,.15,p.brass,.018);
   }else if(u.type==='bow'){
    if(industrial){mesh.bevel(0,-.23,.14,.14,.13,.36,p.dark,.02);mesh.beam([-.24,-.23,.25],[.24,-.23,.25],.025,p.brass);mesh.beam([-.24,-.23,.25],[.02,-.23,-.03-pose.attack*.09],.01,p.metal);mesh.beam([.24,-.23,.25],[.02,-.23,-.03-pose.attack*.09],.01,p.metal);}
    else{mesh.beam([.03,.02,.13],[.08,-.25,.23],.018,p.wood);mesh.beam([.08,-.25,.23],[.03,-.5,.13],.018,p.wood);mesh.beam([.03,.02,.13],[.03,-.5,.13],.006,p.metal);}
   }else if(!gun){
    if(u.type==='spear'||mounted){mesh.beam([0,-.58,.05],[0,.46,.05],.018,p.wood);mesh.cylinder(0,.52,.05,.06,.17,metal,5,0);}
    else if(u.type==='bandit'){mesh.beam([0,-.4,.05],[0,.28,.05],.025,p.wood);mesh.bevel(.07,.2,.05,.23,.18,.055,p.metal,.02);}
    else{mesh.bevel(0,.025,.05,.055,.5,.04,metal,.012);mesh.bevel(0,-.24,.05,.2,.045,.07,p.brass,.012);}
   }
  }else if(armour){
   mesh.bevel(-.05,-.16,.12,.3,.45,.09,industrial?p.dark:coat,.045);mesh.bevel(-.05,-.16,.175,.25,.38,.04,metal,.03);mesh.box(-.05,-.16,.2,.055,.34,.015,coat);
  }
  mesh.pop();
 }
 if(u.type==='bow')mesh.bevel(-.13,torso+.02,-.2,.13,.39,.11,leather,.02);
 mesh.pop();mesh.pop();
}
