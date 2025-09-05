// FILE: scripts/featured.js
(function () {
  const SHEET_URL =
    window.sheetURL ||
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vRAZz5mIVDN9q1EEapOvFb5RFNKN3VRrFK44KVQQlMa-HUmzEZWfseLnXpmaCQNfiXZIQjGcmLcTb1Q/pub?gid=0&single=true&output=csv';

  const track = document.getElementById('featuredTrack');
  if (!track) {
    console.error('❌ Featured track container not found (id="featuredTrack").');
    return;
  }

  // Helpers
  const norm = (v) => (v || '').toString().trim();
  const hasFeaturedTag = (v) => /\bfeatured\b/i.test(norm(v).toLowerCase());

  // Load CSV → build featured cards
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

      // Clear any existing content
      track.innerHTML = '';

      // Build cards
      featured.forEach((p) => {
        const slug = norm(p.slug);
        const title =
          norm(p.featured_title) || norm(p.card_title) || norm(p.title) || 'Untitled';
        const img = norm(p.featured_img);
        if (!img) return; // skip if no image

        // Clickable card
        const a = document.createElement('a');
        a.className = 'feat-card';
        a.href = slug ? `project.html?slug=${encodeURIComponent(slug)}` : '#';
        a.setAttribute('aria-label', title);

        // Square image area
        const thumb = document.createElement('div');
        thumb.className = 'feat-thumb';
        thumb.style.backgroundImage = `url("${img}")`;

        // Text block under image
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
        console.warn('ℹ️ No featured cards rendered. Check CSV values for: published, tags/filter/featured, featured_img.');
        return;
      }

      // ---- Animation wiring (staggered fade + slide) ----
      // Set per-card index for stagger: --i
      const cards = track.querySelectorAll('.feat-card');
      cards.forEach((card, i) => card.style.setProperty('--i', i));

      // Optional: tweak global stagger from JS (matches CSS var if present)
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
        // Fallback for older browsers
        setTimeout(startAnimation, 100);
      }
      // ---- /Animation wiring ----
    })
    .catch((err) => console.error('❌ Featured carousel load error:', err));
})();
