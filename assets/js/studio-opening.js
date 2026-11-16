/* Opening is an art-directed transition, never a network preloader.
   One brief opening per tab session; no blocking on images or fonts. */
(()=>{const el=document.querySelector('.studio-opening');if(!el)return;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let seen=false;try{seen=sessionStorage.getItem('studioOpeningSeen')==='1';sessionStorage.setItem('studioOpeningSeen','1')}catch(_){}
if(reduced||seen){el.remove();return}
let finished=false;const done=()=>{if(finished)return;finished=true;el.classList.add('is-complete');setTimeout(()=>el.remove(),650)};
const start=performance.now();
const show=()=>{const remaining=Math.max(0,2300-(performance.now()-start));setTimeout(done,remaining)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();
setTimeout(done,3100);
document.addEventListener('visibilitychange',()=>{if(document.hidden)done()},{once:true});
})();
