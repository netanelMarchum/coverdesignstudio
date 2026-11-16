/* Cursor-following fluted-prism spotlight for album artwork.
   Only reads pointer positions while hovered; no scroll listeners or WebGL. */
(()=>{if(!matchMedia('(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)').matches)return;
document.querySelectorAll('.insta-grid .insta-item').forEach(card=>{
  let rect=null,raf=0,x=50,y=50;
  card.addEventListener('pointerenter',()=>{rect=card.getBoundingClientRect()},{passive:true});
  card.addEventListener('pointermove',event=>{
    if(!rect)rect=card.getBoundingClientRect();
    x=Math.max(0,Math.min(100,(event.clientX-rect.left)/rect.width*100));
    y=Math.max(0,Math.min(100,(event.clientY-rect.top)/rect.height*100));
    if(raf)return;
    raf=requestAnimationFrame(()=>{card.style.setProperty('--prism-x',x+'%');card.style.setProperty('--prism-y',y+'%');raf=0});
  },{passive:true});
  card.addEventListener('pointerleave',()=>{rect=null;if(raf)cancelAnimationFrame(raf);raf=0;card.style.removeProperty('--prism-x');card.style.removeProperty('--prism-y')},{passive:true});
});})();
