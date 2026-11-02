// Original geometry: position / smooth or face normal / RGBA / roughness-metalness.
export const MESH_STRIDE=12,MESH_BYTES=MESH_STRIDE*4;
const colors=new Map();
export function rgba(hex,alpha=1){
 if(Array.isArray(hex))return [hex[0],hex[1],hex[2],(hex[3]??1)*alpha,hex[4]??.9,hex[5]??0];
 if(!colors.has(hex))colors.set(hex,hex.match(/[a-f\d]{2}/gi).slice(0,3).map(v=>parseInt(v,16)/255));
 return [...colors.get(hex),alpha,.9,0];
}
export function surface(color,roughness=.8,metalness=0){const c=rgba(color);c[4]=roughness;c[5]=metalness;return c;}
const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
export class Mesh{
 constructor(capacity=65536){this.data=new Float32Array(capacity);this.length=0;this.matrix=identity();this.stack=[];this.alpha=1;}
 reset(){this.length=0;this.matrix=identity();this.stack.length=0;this.alpha=1;return this;}
 push({x=0,y=0,z=0,rx=0,ry=0,rz=0,scale=1}={}){
  this.stack.push(this.matrix);const m=this.matrix;
  const cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz);
  const basis=[[cy*cz,cy*sz,-sy],[sx*sy*cz-cx*sz,sx*sy*sz+cx*cz,sx*cy],[cx*sy*cz+sx*sz,cx*sy*sz-sx*cz,cx*cy]];
  const n=identity();for(let col=0;col<3;col++)for(let row=0;row<3;row++)n[col*4+row]=(m[row]*basis[col][0]+m[4+row]*basis[col][1]+m[8+row]*basis[col][2])*scale;
  for(let row=0;row<3;row++)n[12+row]=m[row]*x+m[4+row]*y+m[8+row]*z+m[12+row];this.matrix=n;
 }
 pop(){this.matrix=this.stack.pop();}
 point(p){const m=this.matrix;return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];}
 normal(p){const m=this.matrix,n=[m[0]*p[0]+m[4]*p[1]+m[8]*p[2],m[1]*p[0]+m[5]*p[1]+m[9]*p[2],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]],len=Math.hypot(...n)||1;return n.map(v=>v/len);}
 tri(a,b,c,color,normals=null){
  a=this.point(a);b=this.point(b);c=this.point(c);
  const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...n)||1;
  const rgb=rgba(color);rgb[3]*=this.alpha;if(this.length+MESH_STRIDE*3>this.data.length){const next=new Float32Array(this.data.length*2);next.set(this.data);this.data=next;}
  for(const [i,p] of [a,b,c].entries()){this.data.set([...p,...(normals?this.normal(normals[i]):n.map(x=>x/len)),...rgb],this.length);this.length+=MESH_STRIDE;}
 }
 quad(a,b,c,d,color,n=null){this.tri(a,b,c,color,n?[n[0],n[1],n[2]]:null);this.tri(a,c,d,color,n?[n[0],n[2],n[3]]:null);}
 box(x,y,z,w,h,d,color){
  const a=x-w/2,b=x+w/2,c=y-h/2,e=y+h/2,f=z-d/2,g=z+d/2;
  this.quad([a,e,f],[a,e,g],[b,e,g],[b,e,f],color);this.quad([a,c,g],[a,c,f],[b,c,f],[b,c,g],color);
  this.quad([a,c,g],[b,c,g],[b,e,g],[a,e,g],color);this.quad([b,c,f],[a,c,f],[a,e,f],[b,e,f],color);
  this.quad([a,c,f],[a,c,g],[a,e,g],[a,e,f],color);this.quad([b,c,g],[b,c,f],[b,e,f],[b,e,g],color);
 }
 // Tapered octagonal solids create bevels on armour, masonry and roof edges.
 bevel(x,y,z,w,h,d,color,b=.04){
  const ring=(yy,inset)=>{const a=w/2-inset,c=d/2-inset,k=Math.min(b,a*.4,c*.4);return [[-a+k,-c],[a-k,-c],[a,-c+k],[a,c-k],[a-k,c],[-a+k,c],[-a,c-k],[-a,-c+k]].map(([xx,zz])=>[x+xx,yy,z+zz]);};
  const rings=[ring(y-h/2,b/2),ring(y-h/2+b,0),ring(y+h/2-b,0),ring(y+h/2,b/2)];
  for(let j=1;j<4;j++)for(let i=0;i<8;i++){const k=(i+1)%8;this.quad(rings[j-1][i],rings[j][i],rings[j][k],rings[j-1][k],color);}
  for(let i=1;i<7;i++)this.tri(rings[3][0],rings[3][i+1],rings[3][i],color);
 }
 cylinder(x,y,z,r,h,color,n=10,top=r){
  for(let i=0;i<n;i++){
   const a=i*Math.PI*2/n,b=(i+1)*Math.PI*2/n,lo=t=>[x+Math.cos(t)*r,y-h/2,z+Math.sin(t)*r],hi=t=>[x+Math.cos(t)*top,y+h/2,z+Math.sin(t)*top];
   const normal=t=>[Math.cos(t),(r-top)/Math.max(.001,h),Math.sin(t)];
   this.quad(lo(a),hi(a),hi(b),lo(b),color,[normal(a),normal(a),normal(b),normal(b)]);this.tri([x,y+h/2,z],hi(b),hi(a),color);this.tri([x,y-h/2,z],lo(a),lo(b),color);
  }
 }
 ellipsoid(x,y,z,rx,ry,rz,color,n=12,rings=8){
  const p=(i,j)=>{const a=i*2*Math.PI/n,b=j*Math.PI/rings;return [x+Math.cos(a)*Math.sin(b)*rx,y+Math.cos(b)*ry,z+Math.sin(a)*Math.sin(b)*rz];};
  const normal=(i,j)=>{const q=p(i,j);return [(q[0]-x)/(rx*rx),(q[1]-y)/(ry*ry),(q[2]-z)/(rz*rz)];};
  for(let j=0;j<rings;j++)for(let i=0;i<n;i++)this.quad(p(i,j),p(i+1,j),p(i+1,j+1),p(i,j+1),color,[normal(i,j),normal(i+1,j),normal(i+1,j+1),normal(i,j+1)]);
 }
 beam(a,b,r,color,n=6){const d=b.map((v,i)=>v-a[i]),len=Math.hypot(...d);this.push({x:(a[0]+b[0])/2,y:(a[1]+b[1])/2,z:(a[2]+b[2])/2,ry:Math.atan2(d[0],d[2]),rx:Math.acos(Math.max(-1,Math.min(1,d[1]/(len||1))))});this.cylinder(0,0,0,r,len,color,n);this.pop();}
 get vertices(){return this.length/MESH_STRIDE;}
 get triangles(){return this.length/(MESH_STRIDE*3);}
}
