/* Play the opening on the first visit in a tab and when the homepage is reloaded. */
(()=>{
const template=document.getElementById('home-opening');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const navigation=template && performance.getEntriesByType('navigation')[0];
const reloading=navigation && navigation.type==='reload';
let seen=false;
try{seen=sessionStorage.getItem('studioOpeningSeen')==='1';sessionStorage.setItem('studioOpeningSeen','1')}catch(_){}
if(template && !reduced && (!seen || reloading)){
  template.replaceWith(template.content.cloneNode(true));
}
const el=document.querySelector('.studio-opening');if(!el)return;
if(reduced || (seen && !reloading)){el.remove();return}
let finished=false;const done=()=>{if(finished)return;finished=true;el.classList.add('is-complete');setTimeout(()=>el.remove(),650)};
const start=performance.now();
const show=()=>{const remaining=Math.max(0,2300-(performance.now()-start));setTimeout(done,remaining)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();
setTimeout(done,3100);
document.addEventListener('visibilitychange',()=>{if(document.hidden)done()},{once:true});
})();
