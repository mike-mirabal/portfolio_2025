// FILE: scripts/featured.js
(function () {
  const SHEET_URL =
    window.sheetURL ||
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vRAZz5mIVDN9q1EEapOvFb5RFNKN3VRrFK44KVQQlMa-HUmzEZWfseLnXpmaCQNfiXZIQjGcmLcTb1Q/pub?gid=0&single=true&output=csv';

  // Wait until DOM is ready so #featuredTrack exists
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

    const norm = (v) => (v || '').toString().trim();
    const hasFeaturedTag = (v) => /\bfeatured\b/i.test(norm(v).toLowerCase());

    fetch(SHEET_URL)
      .then((res) => res.text())
      .then((csv) => {
        const { data: rows } = Papa.parse(csv.trim(), {
          header: true,
          skipEmptyLines: true,
        });

        const featured = rows.filter((r) => {
          const published = norm(r.published).toUpperCase() === 'TRUE';
          const tagHit =
            hasFeaturedTag(r.tags) ||
            hasFeaturedTag(r.filter) ||
            hasFeaturedTag(r.tag);
          const boolHit = norm(r.featured).toUpperCase() === 'TRUE';
          return published && (tagHit || boolHit);
        });

        // Clear
        track.innerHTML = '';

        featured.forEach((p, i) => {
          const slug = norm(p.slug);
          const title =
            norm(p.featured_title) ||
            norm(p.card_title) ||
            norm(p.title) ||
            'Untitled';
          const imgRaw = norm(p.featured_img);
          if (!imgRaw) return;

          // Don’t over-encode; just trim
          const img = imgRaw;

          // <a> card
          const a = document.createElement('a');
          a.className = 'feat-card';
          a.href = slug ? `project.html?slug=${encodeURIComponent(slug)}` : '#';
          a.setAttribute('aria-label', title);
          a.style.setProperty('--i', i);

          // Thumb (IMG inside so we can detect errors and fallback)
          const thumb = document.createElement('div');
          thumb.className = 'feat-thumb';

          const image = document.createElement('img');
          image.src = img;
          image.alt = title;
          image.width = 1920;   // source natural dimensions
          image.height = 1280;  // source natural dimensions
          image.loading = 'lazy';
          image.decoding = 'async';

          // WebP → PNG fallback if server or browser chokes on webp
          image.onerror = () => {
            if (!image.dataset.triedPng && /\.webp(\?.*)?$/i.test(image.src)) {
              image.dataset.triedPng = '1';
              image.src = image.src.replace(/\.webp(\?.*)?$/i, '.png$1');
            } else {
              console.warn('Featured image failed:', img);
              // leave the soft background so the card still looks ok
              image.remove();
            }
          };

          thumb.appendChild(image);

          // Text
          const text = document.createElement('div');
          text.className = 'feat-text';
          const t = document.createElement('div');
          t.className = 'feat-title';
          t.textContent = title;
          text.appendChild(t);

          a.appendChild(thumb);
          a.appendChild(text);
          track.appendChild(a);
        });

        if (!track.children.length) {
          console.warn('ℹ️ No featured cards rendered. Check CSV (published, featured/tag, featured_img).');
          return;
        }

        // Staggered entrance
        if (!track.style.getPropertyValue('--stagger')) {
          track.style.setProperty('--stagger', '80ms');
        }
        const startAnimation = () => track.classList.add('animate');

        if ('IntersectionObserver' in window) {
          const io = new IntersectionObserver(
            (entries) => {
              entries.forEach((e) => {
                if (e.isIntersecting) {
                  startAnimation();
                  io.disconnect();
                }
              });
            },
            { threshold: 0.2 }
          );
          io.observe(track);
        } else {
          setTimeout(startAnimation, 100);
        }
      })
      .catch((err) => console.error('❌ Featured carousel load error:', err));
  });
})();
