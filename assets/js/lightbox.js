/* Inline clip player: clicking a clip plays it inside the card's own thumbnail
   rectangle — nothing pops up, nothing jumps. Falls back to the normal link if
   the video id can't be parsed.

   youtube-nocookie.com is used deliberately: it sets no tracking cookie until
   playback starts. The CSP frame-src allows exactly this origin — it used to be
   frame-src 'none', which silently blocked every clip from ever opening. */
(function () {
  "use strict";
  var cards = document.querySelectorAll('a.video-card[href*="youtube.com/watch"], a.video-card[href*="youtu.be/"]');
  if (!cards.length) return;

  var isHe = (document.documentElement.lang || "he").toLowerCase().indexOf("en") !== 0;

  function videoId(href) {
    var m = href.match(/[?&]v=([\w-]+)/) || href.match(/youtu\.be\/([\w-]+)/);
    return m ? m[1] : null;
  }

  cards.forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = videoId(a.getAttribute("href"));
      var thumb = a.querySelector(".thumb");
      if (!id || !thumb) return;                     // let the normal link handle it
      e.preventDefault();
      if (thumb.querySelector("iframe")) return;     // already playing

      var f = document.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0";
      f.title = isHe ? "נגן וידאו" : "Video player";
      f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      f.setAttribute("allowfullscreen", "");

      // If the embed is blocked (CSP, an extension, or the owner disabling
      // embedding) the iframe stays blank forever. Hand the visitor to YouTube
      // rather than leave them staring at a black rectangle.
      var loaded = false;
      f.addEventListener("load", function () { loaded = true; });
      setTimeout(function () {
        if (loaded || !thumb.contains(f)) return;
        thumb.removeChild(f);
        thumb.classList.remove("playing");
        window.open(a.href, "_blank", "noopener");
      }, 4000);

      thumb.appendChild(f);
      thumb.classList.add("playing");
    });
  });
})();
