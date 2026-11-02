// Small indexed-in-code procedural models; GPU buffers contain only triangles.
export const LIMITS=Object.freeze({staticVertices:240000,dynamicVertices:120000,dpr:1.5,maxSide:4096});
export const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
export function mesh(limit=LIMITS.staticVertices){
 const data=[];
 function tri(a,b,c,color){
  if(data.length/9+3>limit)throw Error('3D頂点数の上限を超えました');
  const u=b.map((n,i)=>n-a[i]),v=c.map((n,i)=>n-a[i]);
  const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...n)||1;
  for(const p of [a,b,c])data.push(...p,...n.map(x=>x/len),...color);
 }
 function box(x,y,z,w,h,d,color,angle=0){
  const co=Math.cos(angle),si=Math.sin(angle);
  const p=[[-1,0,-1],[1,0,-1],[1,1,-1],[-1,1,-1],[-1,0,1],[1,0,1],[1,1,1],[-1,1,1]].map(([a,b,c])=>[x+a*w/2*co+c*d/2*si,y+b*h,z-a*w/2*si+c*d/2*co]);
  for(const [a,b,c,d]of [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]]){tri(p[a],p[b],p[c],color);tri(p[a],p[c],p[d],color);}
 }
 function tube(a,b,r,color,sides=7,r2=r){
  const d=b.map((n,i)=>n-a[i]),len=Math.hypot(...d)||1,n=d.map(v=>v/len),up=Math.abs(n[1])>.9?[1,0,0]:[0,1,0];
  const cross=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  let u=cross(n,up);const ul=Math.hypot(...u);u=u.map(x=>x/ul);const v=cross(n,u);
  const ring=(p,i,rad)=>p.map((x,k)=>x+rad*(Math.cos(i*2*Math.PI/sides)*u[k]+Math.sin(i*2*Math.PI/sides)*v[k]));
  for(let i=0;i<sides;i++){
   const x=ring(a,i,r),y=ring(a,i+1,r),z=ring(b,i,r2),w=ring(b,i+1,r2);
   tri(x,y,z,color);tri(y,w,z,color);tri(a,y,x,color);tri(b,z,w,color);
  }
 }
 function rock(x,y,z,rx,ry,rz,color,seed=0){
  const p=Array.from({length:8},(_,i)=>{const a=i*Math.PI/4,noise=.85+((i*17+seed*13)%11)/40;return [x+Math.cos(a)*rx*noise,y+(i%2?.12:0)*ry,z+Math.sin(a)*rz*noise];});
  const top=[x-.12*rx,y+ry,z+.08*rz],bottom=[x,y-.1*ry,z];
  for(let i=0;i<8;i++){tri(p[i],p[(i+1)%8],top,color);tri(p[(i+1)%8],p[i],bottom,color);}
 }
 return {tri,box,tube,rock,data,vertices:()=>Float32Array.from(data)};
}
