// FILE: scripts/featured.js

// Reuse the same CSV you use elsewhere:
const FEATURED_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRAZz5mIVDN9q1EEapOvFb5RFNKN3VRrFK44KVQQlMa-HUmzEZWfseLnXpmaCQNfiXZIQjGcmLcTb1Q/pub?gid=0&single=true&output=csv';

(function () {
  const track = document.getElementById('featuredTrack');
  if (!track) return;

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    await ensurePapa();
    try {
      const csv = await fetch(FEATURED_SHEET_URL).then(r => r.text());
      const { data: projects } = Papa.parse(csv.trim(), { header: true, skipEmptyLines: true });

      const published = projects.filter(p => (p.published || '').toString().toUpperCase() === 'TRUE');

      const isFeatured = (p) => {
        const t = (p.tags || '').toLowerCase();
        return t.split(',').map(s => s.trim()).includes('featured');
      };
      let featured = published.filter(isFeatured);

      featured.sort((a, b) => {
        const ao = parseInt(a.featured_order) || Number.MAX_SAFE_INTEGER;
        const bo = parseInt(b.featured_order) || Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        const ay = parseInt(a.year) || 0;
        const by = parseInt(b.year) || 0;
        return by - ay;
      });

      featured = featured.slice(0, 6);

      track.innerHTML = '';
      for (const p of featured) {
        const href     = `project.html?slug=${encodeURIComponent(p.slug || '')}`;
        const img      = p.featured_img || ''; // ← NEW: pull from featured_img
        const titleRaw = p.featured_title || p.card_title || p.title || 'Untitled Project'; // ← NEW: prefer featured_title
        const label    = clampWords(titleRaw, 6);

        const a = document.createElement('a');
        a.className = 'feat-card';
        a.href = href;

        if (img) {
          a.style.setProperty('--bg', `url("${escapeAttr(img)}")`);
        }

        const span = document.createElement('span');
        span.className = 'feat-label';
        span.textContent = label;

        a.appendChild(span);
        track.appendChild(a);
      }

      wireNav(track);

    } catch (err) {
      console.error('Featured carousel error:', err);
    }
  }

  function clampWords(text, maxWords) {
    const words = String(text).trim().split(/\s+/);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '…';
  }

  function wireNav(track) {
    const prev = document.querySelector('.feat-prev');
    const next = document.querySelector('.feat-next');

    track.addEventListener('keydown', (e) => {
      const step = track.clientWidth * 0.8;
      if (e.key === 'ArrowRight') { track.scrollBy({ left: step, behavior: 'smooth' }); e.preventDefault(); }
      if (e.key === 'ArrowLeft')  { track.scrollBy({ left: -step, behavior: 'smooth' }); e.preventDefault(); }
    });

    const scrollStep = () => {
      const card = track.querySelector('.feat-card');
      const gap = parseFloat(getComputedStyle(track).gap || '12');
      const w = card ? card.offsetWidth + gap : 180;
      return Math.max(w * 2, track.clientWidth * 0.75);
    };

    if (prev) prev.addEventListener('click', () => track.scrollBy({ left: -scrollStep(), behavior: 'smooth' }));
    if (next) next.addEventListener('click', () => track.scrollBy({ left:  scrollStep(), behavior: 'smooth' }));
  }

  function ensurePapa() {
    return new Promise((resolve, reject) => {
      if (window.Papa) return resolve();
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js';
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('PapaParse failed to load'));
      document.head.appendChild(s);
    });
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }
})();
