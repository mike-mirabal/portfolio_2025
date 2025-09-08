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

  // Quick skeletons so the strip doesn't look empty before fetch completes.
  // (If you didn't add the .feat-skel CSS, these just show as blank blocks.)
  track.innerHTML = '<div class="feat-skel"></div>'.repeat(4);

  // Helpers
  const norm = (v) => (v || '').toString().trim();
  const hasFeaturedTag = (v) => /\bfeatured\b/i.test(norm(v).toLowerCase());

  // Load CSV → build featured cards (no-store to avoid stale cache on updates)
  fetch(SHEET_URL, { cache: 'no-store' })
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

      // Clear skeletons
      track.innerHTML = '';

      // Build cards with stagger + image preloading
      featured.forEach((p, i) => {
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
        a.style.setProperty('--i', i); // for stagger

        // Square image area
        const thumb = document.createElement('div');
        thumb.className = 'feat-thumb';

        // Preload (so when the card animates in, the image is ready)
        const preload = new Image();
        preload.onload = () => { thumb.style.backgroundImage = `url("${img}")`; };
        preload.src = img;

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

      // Faster reveal: kick animation immediately once cards exist.
      // (If you prefer to wait until the strip is scrolled into view,
      //  swap this for the IntersectionObserver block you had before.)
      if (!track.style.getPropertyValue('--stagger')) {
        track.style.setProperty('--stagger', '60ms'); // slightly tighter than before
      }
      track.classList.add('animate');
    })
    .catch((err) => console.error('❌ Featured carousel load error:', err));
})();
