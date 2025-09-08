// FILE: scripts/featured.js
(function () {
  const SHEET_URL =
    window.sheetURL ||
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vRAZz5mIVDN9q1EEapOvFb5RFNKN3VRrFK44KVQQlMa-HUmzEZWfseLnXpmaCQNfiXZIQjGcmLcTb1Q/pub?gid=0&single=true&output=csv';

  // Build one <a.feat-card> from a CSV row
  function buildCard(row, index) {
    const norm = (v) => (v || '').toString().trim();
    const slug  = norm(row.slug);
    const title = norm(row.featured_title) || norm(row.card_title) || norm(row.title) || 'Untitled';
    const img   = norm(row.featured_img);

    if (!img) return null;

    const a = document.createElement('a');
    a.className = 'feat-card';
    a.href = slug ? `project.html?slug=${encodeURIComponent(slug)}` : '#';
    a.setAttribute('aria-label', title);
    a.style.setProperty('--i', index);

    // Thumb (now an <img> inside)
    const thumb = document.createElement('div');
    thumb.className = 'feat-thumb';

    // Use a simple <img>; let CSS control fit/centering
    const image = document.createElement('img');
    image.src = encodeURI(img);          // tolerate spaces/non-ascii
    image.alt = title;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.width = 200;                   // intrinsic ratio 3:2
    image.height = 133;
    image.onerror = () => {
      console.warn('Featured image failed:', img);
      image.remove(); // keep card; show soft background
    };
    thumb.appendChild(image);

    // Text block
    const text = document.createElement('div');
    text.className = 'feat-text';
    const t = document.createElement('div');
    t.className = 'feat-title';
    t.textContent = title;
    text.appendChild(t);

    a.appendChild(thumb);
    a.appendChild(text);
    return a;
  }

  // Init after DOM is ready so #featuredTrack exists
  document.addEventListener('DOMContentLoaded', () => {
    const track = document.getElementById('featuredTrack');
    if (!track) {
      console.error('❌ Featured track container not found (id="featuredTrack").');
      return;
    }
    if (typeof Papa === 'undefined') {
      console.error('❌ PapaParse not loaded before featured.js. Include papaparse <script> first.');
      return;
    }

    // Make sure the element itself is scrollable on touch devices
    track.setAttribute('tabindex', '0');
    track.setAttribute('role', 'region');
    track.setAttribute('aria-label', 'Featured projects carousel');
    track.style.overflowX = 'auto';
    track.style.overflowY = 'hidden';
    track.style.webkitOverflowScrolling = 'touch';

    // Load CSV → filter → render
    fetch(SHEET_URL)
      .then((res) => res.text())
      .then((csv) => {
        const { data: rows } = Papa.parse(csv.trim(), {
          header: true,
          skipEmptyLines: true,
        });

        const norm = (v) => (v || '').toString().trim();
        const hasFeaturedTag = (v) => /\bfeatured\b/i.test(norm(v).toLowerCase());

        const featured = rows.filter((r) => {
          const published = norm(r.published).toUpperCase() === 'TRUE';
          const tagHit =
            hasFeaturedTag(r.tags) ||
            hasFeaturedTag(r.filter) ||
            hasFeaturedTag(r.tag);
          const boolHit = norm(r.featured).toUpperCase() === 'TRUE';
          return published && (tagHit || boolHit);
        });

        track.innerHTML = '';
        featured.forEach((row, i) => {
          const card = buildCard(row, i);
          if (card) track.appendChild(card);
        });

        if (!track.children.length) {
          console.warn('ℹ️ No featured cards rendered. Check CSV values for: published, tags/filter/featured, featured_img.');
          return;
        }

        // Staggered appearance (CSS listens for .animate)
        if (!track.style.getPropertyValue('--stagger')) {
          track.style.setProperty('--stagger', '80ms');
        }
        const startAnimation = () => track.classList.add('animate');

        if ('IntersectionObserver' in window) {
          const io = new IntersectionObserver(
            (entries) => {
              for (const e of entries) {
                if (e.isIntersecting) {
                  startAnimation();
                  io.disconnect();
                  break;
                }
              }
            },
            { threshold: 0.2 }
          );
          io.observe(track);
        } else {
          setTimeout(startAnimation, 100);
        }

        // Desktop nicety: horizontal wheel -> scroll sideways (no effect on touch)
        track.addEventListener(
          'wheel',
          (ev) => {
            if (Math.abs(ev.deltaX) < Math.abs(ev.deltaY)) {
              track.scrollLeft += ev.deltaY;
            }
          },
          { passive: true }
        );
      })
      .catch((err) => console.error('❌ Featured carousel load error:', err));
  });
})();
