
/* ---------- 0) Shorten the hero slide timings ---------- */
window.addEventListener('DOMContentLoaded', () => {
  const p1 = document.getElementById('heroPanel1');
  const p2 = document.getElementById('heroPanel2');
  if (p1) setTimeout(() => p1.classList.add('slide-out'), 10);   // was 50
  if (p2) setTimeout(() => p2.classList.add('slide-out'), 80);   // was 200
});

/* ---------- 1) Cache the featured CSV for this session ---------- */
(function () {
  const KEY = 'featured_csv_cache_v1';
  const SHEET_URL =
    window.sheetURL ||
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vRAZz5mIVDN9q1EEapOvFb5RFNKN3VRrFK44KVQQlMa-HUmzEZWfseLnXpmaCQNfiXZIQjGcmLcTb1Q/pub?gid=0&single=true&output=csv';

  // Monkey-patch fetch when featured.js asks for the CSV
  const origFetch = window.fetch;
  window.fetch = async function (url, opts) {
    if (typeof url === 'string' && url.indexOf(SHEET_URL) === 0) {
      const cached = sessionStorage.getItem(KEY);
      if (cached) {
        // Return a Response-like object from cache
        return new Response(cached, { status: 200, headers: { 'Content-Type': 'text/csv' } });
      }
      const res = await origFetch(url, opts);
      const text = await res.text();
      try { sessionStorage.setItem(KEY, text); } catch (_) {}
      return new Response(text, { status: 200, headers: { 'Content-Type': 'text/csv' } });
    }
    return origFetch.apply(this, arguments);
  };
})();

/* ---------- 2) Lazy-hydrate .feat-thumb background images ---------- */
(function () {
  const track = document.getElementById('featuredTrack');
  if (!track) return;

  // Convert existing inline background-image to data attribute,
  // then clear it so images don't start loading immediately.
  const stripImmediateBGs = () => {
    track.querySelectorAll('.feat-thumb').forEach(el => {
      const bg = (el.style.backgroundImage || '').replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
      if (bg) {
        el.dataset.bg = bg;
        el.style.backgroundImage = ''; // defer loading
      }
    });
  };

  // If featured.js hasn’t run yet, observe until cards exist
  const ensureCards = new MutationObserver(() => {
    if (track.querySelector('.feat-thumb')) {
      ensureCards.disconnect();
      stripImmediateBGs();
      wireIO();
    }
  });

  // If cards already there (hot reload), process immediately
  if (track.querySelector('.feat-thumb')) {
    stripImmediateBGs();
    wireIO();
  } else {
    ensureCards.observe(track, { childList: true });
  }

  function wireIO() {
    if (!('IntersectionObserver' in window)) {
      // Fallback: load them all
      track.querySelectorAll('.feat-thumb[data-bg]').forEach(el => {
        el.style.backgroundImage = `url("${el.dataset.bg}")`;
        delete el.dataset.bg;
      });
      return;
    }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const el = e.target;
          const src = el.dataset.bg;
          if (src) {
            el.style.backgroundImage = `url("${src}")`;
            el.removeAttribute('data-bg');
          }
          obs.unobserve(el);
        }
      });
    }, { rootMargin: '300px 0px', threshold: 0.01 });

    track.querySelectorAll('.feat-thumb').forEach(el => io.observe(el));
  }
})();

