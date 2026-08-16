// Instagram feed (@cover_design.studio) → .insta-scroll (auto-carousel) + .insta-grid (load more).
// Reads a self-hosted JSON (see ig-config.js) refreshed by a GitHub Action — no client token,
// no external runtime dependency. If the feed is missing, the static markup stays as fallback.
(function () {
  'use strict';

  var GRID_START = 8;        // items shown in the grid before "show more"
  var GRID_STEP = 8;         // items added per "show more" click

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function norm(m) {
    return { img: m.img || m.image || '', link: m.permalink || m.link || '', caption: m.caption || '' };
  }
  // width/height are always emitted so the square placeholder is reserved before
  // the image decodes — injected cards must not shift the layout either.
  function card(m) {
    if (!m.img) return '';
    var cap = esc(String(m.caption).slice(0, 120));
    return '<a class="insta-item" href="' + esc(m.link) + '" target="_blank" rel="noopener">' +
      '<img src="' + esc(m.img) + '" alt="' + (cap || 'עטיפה בעיצוב עיצוב עטיפה סטודיו') +
      '" loading="lazy" decoding="async" width="800" height="800">' +
      // aria-hidden: the caption is already the image's alt text, so without it
      // a screen reader reads every cover twice.
      '<div class="cap" aria-hidden="true">' + cap + '</div></a>';
  }


  // ---- "Show more" grid loader ----
  // The button is bound ONCE, immediately, regardless of whether the live feed
  // ever loads — otherwise a failed/blocked fetch (e.g. viewing the file
  // directly, or a slow network) leaves "הצג עוד" with no click handler at all.
  function initGrid(grid) {
    var btn = document.getElementById('insta-more');
    var state = { items: [], shown: GRID_START };

    // The first pass replaces the static fallback markup; every later pass only
    // appends. Rebuilding the whole grid on "show more" threw away eight cards
    // that were already painted and re-decoded their images, and the new cards
    // inherited the settled state of a grid that had already revealed, so they
    // appeared instantly while everything else on the site rises into place.
    var swapped = false;

    function render() {
      if (state.items.length) {
        var from = 0;
        if (!swapped) { grid.innerHTML = ''; swapped = true; }
        // Count REAL cards only. The velocity carousel fills this row with
        // clones to make its loop seamless, and grid.children counts those too
        // — so "show more" was slicing from a number two or three times the
        // card count and appending nothing, or skipping whole pages of covers.
        else { from = grid.querySelectorAll(':scope > :not([data-vel-clone])').length; }
        var html = state.items.slice(from, state.shown).map(card).join('');
        if (html) {
          var tmp = document.createElement('div');
          tmp.innerHTML = html;
          var fresh = [].slice.call(tmp.children);
          fresh.forEach(function (el) { grid.appendChild(el); });
          // Only for cards added after the grid has already revealed: they have
          // to start hidden and be released on the next frame, or the browser
          // computes the final style straight away and there is nothing to
          // transition from.
          if (from > 0) {
            fresh.forEach(function (el, i) {
              el.style.opacity = '0';
              el.style.transform = 'translate3d(0,var(--rise-item),0)';
              el.style.transitionDelay = (i * 0.05) + 's';
            });
            requestAnimationFrame(function () {
              requestAnimationFrame(function () {
                fresh.forEach(function (el) { el.style.opacity = ''; el.style.transform = ''; });
              });
            });
          }
        }
      }
      if (btn) {
        btn.style.display = (state.items.length && state.shown >= state.items.length) ? 'none' : '';
      }
    }

    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        if (!state.items.length) {                 // no feed loaded → fall back to the works page
          var href = btn.getAttribute('data-fallback');
          if (href) location.href = href;
          return;
        }
        state.shown += GRID_STEP;
        render();
      });
    }

    return {
      setItems: function (items) {
        state.items = items;
        state.shown = GRID_START;
        swapped = false;
        render();
      }
    };
  }

  function boot() {
    // Bind every grid's "show more" button up front, before the feed even
    // attempts to load, so it always does *something* on click.
    var gridControllers = [];
    document.querySelectorAll('.insta-grid').forEach(function (g) {
      gridControllers.push(initGrid(g));
    });

    var feedUrl = window.IG_FEED_URL;
    if (!feedUrl) return;

    fetch(feedUrl, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (d) {
        // Dedupe by image URL: a carousel post re-shared, or an overlapping
        // refresh window, would otherwise render the same cover twice.
        var seen = {};
        var items = ((d && d.items) || []).map(norm).filter(function (m) {
          if (!m.img || seen[m.img]) return false;
          seen[m.img] = 1;
          return true;
        });
        if (!items.length) return;

        gridControllers.forEach(function (c) { c.setItems(items); });
      })
      .catch(function () { /* keep the static fallback; button still works via data-fallback */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
