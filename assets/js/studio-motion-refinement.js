/* The cover art is decorative: keep the main headline and links stable.
   Avoid scroll-bound movement, and respect motion/accessibility settings. */
(function(){
  var hero=document.querySelector('.hero-orbit');
  if(!hero)return;
  var reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  var tiles=[].slice.call(hero.querySelectorAll('.orbit-tile'));
  tiles.forEach(function(tile,i){
    var img=tile.querySelector('img');
    if(!img)return;
    img.loading=i<3?'eager':'lazy';
    img.decoding='async';
  });
  if(reduced.matches)return;
  // Suspend perpetual decorative motion when not visible to save battery.
  var observer=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      entry.target.querySelectorAll('.orbit-tile img').forEach(function(img){
        img.style.animationPlayState=entry.isIntersecting?'running':'paused';
      });
    });
  },{threshold:0});
  observer.observe(hero);
})();
