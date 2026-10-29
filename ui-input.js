// One gesture, one optional tap. A drag that returns to its origin is still a drag.
export function createGesture(threshold=10){
 let start=null,ids=new Set();
 return {
  down(id,x,y,left=0,top=0){ids.add(id);if(ids.size===1)start={id,x,y,left,top,moved:false,multi:false};else if(start)start.multi=true;},
  move(id,x,y){if(start?.id===id&&Math.hypot(x-start.x,y-start.y)>threshold)start.moved=true;},
  up(id,x,y,left=0,top=0){const ok=!!start&&id===start.id&&ids.size===1&&!start.multi&&!start.moved&&Math.hypot(x-start.x,y-start.y)<=threshold&&Math.abs(left-start.left)<2&&Math.abs(top-start.top)<2;ids.delete(id);if(!ids.size)start=null;return ok;},
  cancel(id){ids.delete(id);if(start)start.multi=true;if(!ids.size)start=null;},
  reset(){ids.clear();start=null;}
 };
}
// All battlefield gestures are owned by the game from pointerdown, including pan.
// This prevents Safari/Chrome from claiming a slide before selection is established.
export function bindMapInput(viewport,onTap,begin=()=>({pan:true})){
 const g=createGesture(),ids=new Set();let active=null,blocked=false,edgeFrame=null;
 const stopEdge=()=>{if(edgeFrame!==null)cancelAnimationFrame(edgeFrame);edgeFrame=null;};
 const cancel=()=>{stopEdge();active?.interaction.cancel?.();active=null;};
 // A second finger can land on the preview window, outside the viewport.
 // Cancel before that button receives a usable click and track its release too.
 document.addEventListener('pointerdown',e=>{
  if(active&&e.pointerType==='touch'&&e.pointerId!==active.id){e.preventDefault();ids.add(e.pointerId);g.down(e.pointerId,e.clientX,e.clientY);blocked=true;cancel();}
 },{capture:true,passive:false});
 const outsideRelease=e=>{if(!viewport.contains(e.target)){ids.delete(e.pointerId);g.cancel(e.pointerId);if(!ids.size)blocked=false;}};
 document.addEventListener('pointerup',outsideRelease);document.addEventListener('pointercancel',outsideRelease);
 const edgeScroll=()=>{
  edgeFrame=null;const a=active;if(!a||!a.moved||a.interaction.pan||blocked)return;
  const r=viewport.getBoundingClientRect(),edge=28;
  const speed=(n,min,max)=>n<min+edge?-Math.min(8,(min+edge-n)*.24):n>max-edge?Math.min(8,(n-max+edge)*.24):0;
  const left=viewport.scrollLeft,top=viewport.scrollTop;
  viewport.scrollLeft+=speed(a.clientX,r.left,r.right);viewport.scrollTop+=speed(a.clientY,r.top,r.bottom);
  if(left!==viewport.scrollLeft||top!==viewport.scrollTop)a.interaction.move?.(a.clientX,a.clientY);
  edgeFrame=requestAnimationFrame(edgeScroll);
 };
 viewport.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;e.preventDefault();ids.add(e.pointerId);g.down(e.pointerId,e.clientX,e.clientY,viewport.scrollLeft,viewport.scrollTop);
  if(ids.size>1){blocked=true;cancel();return;}
  if(blocked)return;const interaction=begin(e.clientX,e.clientY)||{pan:true};
  active={id:e.pointerId,x:e.clientX,y:e.clientY,clientX:e.clientX,clientY:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,moved:false,interaction};
  viewport.setPointerCapture(e.pointerId);
 },{passive:false});
 viewport.addEventListener('pointermove',e=>{
  g.move(e.pointerId,e.clientX,e.clientY);if(!active||active.id!==e.pointerId||blocked)return;e.preventDefault();
  active.clientX=e.clientX;active.clientY=e.clientY;
  if(Math.hypot(e.clientX-active.x,e.clientY-active.y)>10)active.moved=true;
  if(!active.moved)return;
  if(active.interaction.pan){viewport.scrollLeft=active.left+active.x-e.clientX;viewport.scrollTop=active.top+active.y-e.clientY;}
  else{active.interaction.move?.(e.clientX,e.clientY);if(edgeFrame===null)edgeFrame=requestAnimationFrame(edgeScroll);}
 },{passive:false});
 viewport.addEventListener('pointerup',e=>{
  e.preventDefault();stopEdge();const tap=g.up(e.pointerId,e.clientX,e.clientY,viewport.scrollLeft,viewport.scrollTop),a=active;
  ids.delete(e.pointerId);if(a?.id===e.pointerId)active=null;
  if(!blocked){if(a?.moved){if(!a.interaction.pan)a.interaction.end?.(e.clientX,e.clientY);}else if(tap){if(a?.interaction.tap)a.interaction.tap(e.clientX,e.clientY);else onTap(e.clientX,e.clientY);}}
  if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);
  if(!ids.size)blocked=false;
 },{passive:false});
 const abort=e=>{g.cancel(e.pointerId);ids.delete(e.pointerId);if(active?.id===e.pointerId)cancel();if(!ids.size)blocked=false;};
 viewport.addEventListener('pointercancel',abort);
 viewport.addEventListener('lostpointercapture',e=>{if(active?.id===e.pointerId)abort(e);});
 for(const type of ['contextmenu','dragstart','selectstart'])viewport.addEventListener(type,e=>e.preventDefault());
 const reset=()=>{cancel();ids.clear();blocked=false;g.reset();};
 window.addEventListener('blur',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
 return {reset};
}

/** A destination is armed only after it remains the current legal tile for delay ms.
 * Changing tile or cancelling invalidates the timer (including late callbacks). */
export function createHoldLock(delay=200,onArm=()=>{}){
 let timer=null,cell=null,armed=false;
 const reset=()=>{if(timer!==null)clearTimeout(timer);timer=null;cell=null;armed=false;};
 const enter=next=>{
  if(next===cell)return;
  reset();if(next===null)return;cell=next;
  timer=setTimeout(()=>{timer=null;if(cell!==next)return;armed=true;onArm(next);},delay);
 };
 return {enter,reset,get armed(){return armed;},get cell(){return cell;}};
}

// Start on a reserve button, continue on the battlefield with the same finger.
// A short tap remains the existing button action. The engine is touched only by
// the returned map interaction's end(), after an in-viewport release.
export function bindReserveInput(root,viewport,begin){
 let active=null,suppressClick=false,edgeFrame=null;const pointers=new Set();
 const stop=()=>{if(edgeFrame!==null)cancelAnimationFrame(edgeFrame);edgeFrame=null;};
 const cancel=()=>{stop();const a=active;active=null;if(a?.interaction){suppressClick=true;a.interaction.cancel();}};
 const edge=()=>{
  edgeFrame=null;const a=active;if(!a?.interaction)return;
  const r=viewport.getBoundingClientRect();
  if(a.x>=r.left&&a.x<r.right&&a.y>=r.top&&a.y<r.bottom){
   const velocity=(n,min,max)=>n<min+28?-Math.min(8,(min+28-n)*.24):n>max-28?Math.min(8,(n-max+28)*.24):0;
   const left=viewport.scrollLeft,top=viewport.scrollTop;
   viewport.scrollLeft+=velocity(a.x,r.left,r.right);viewport.scrollTop+=velocity(a.y,r.top,r.bottom);
   if(left!==viewport.scrollLeft||top!==viewport.scrollTop)a.interaction.move(a.x,a.y);
  }
  edgeFrame=requestAnimationFrame(edge);
 };
 const down=e=>{
  pointers.add(e.pointerId);if(pointers.size===1)suppressClick=false;
  if(pointers.size>1){if(active)e.preventDefault();cancel();return;}
  const row=e.target.closest?.('[data-reserve-id]');
  if(!row||!root.contains(row)||row.disabled||e.button!==0)return;
  suppressClick=false;active={id:e.pointerId,unit:row.dataset.reserveId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY};
 };
 const move=e=>{
  const a=active;if(!a||a.id!==e.pointerId)return;
  a.x=e.clientX;a.y=e.clientY;
  if(!a.interaction&&Math.hypot(a.x-a.startX,a.y-a.startY)>10){
   a.interaction=begin(a.unit);if(!a.interaction){active=null;return;}
   suppressClick=true;viewport.setPointerCapture(e.pointerId);
  }
  if(a.interaction){e.preventDefault();a.interaction.move(a.x,a.y);if(edgeFrame===null)edgeFrame=requestAnimationFrame(edge);}
 };
 const up=e=>{
  pointers.delete(e.pointerId);
  const a=active;if(!a||a.id!==e.pointerId)return;stop();active=null;
  if(a.interaction){
   e.preventDefault();suppressClick=true;
   const r=viewport.getBoundingClientRect();
   if(e.clientX>=r.left&&e.clientX<r.right&&e.clientY>=r.top&&e.clientY<r.bottom)a.interaction.end(e.clientX,e.clientY);
   else a.interaction.cancel();
  }
 };
 const click=e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();suppressClick=false;}};
 const abort=e=>{pointers.delete(e.pointerId);if(active?.id===e.pointerId)cancel();};
 const reset=()=>{cancel();pointers.clear();};
 const hidden=()=>{if(document.hidden)reset();};
 document.addEventListener('pointerdown',down,{capture:true,passive:false});
 document.addEventListener('pointermove',move,{capture:true,passive:false});
 document.addEventListener('pointerup',up,{capture:true,passive:false});
 document.addEventListener('pointercancel',abort,true);
 document.addEventListener('click',click,true);
 window.addEventListener('blur',reset);document.addEventListener('visibilitychange',hidden);
 return ()=>{cancel();document.removeEventListener('pointerdown',down,true);document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',up,true);document.removeEventListener('pointercancel',abort,true);document.removeEventListener('click',click,true);window.removeEventListener('blur',reset);document.removeEventListener('visibilitychange',hidden);};
}
