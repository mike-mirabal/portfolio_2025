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

  // helpers
  const norm = (v) => (v || '').toString().trim();
  const hasFeaturedTag = (v) => /\bfeatured\b/i.test(norm(v).toLowerCase());

  // small util: return encoded URL, and a fallback if it's .webp
  const toEncoded = (u) => encodeURI((u || '').trim());
  const webpFallback = (u) => {
    // if it's .webp, try a .png fallback beside it
    return /\.webp(\?.*)?$/i.test(u) ? u.replace(/\.webp(\?.*)?$/i, '.png$1') : u;
  };

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

      track.innerHTML = '';

      featured.forEach((p, i) => {
        const slug = norm(p.slug);
        const title =
          norm(p.featured_title) || norm(p.card_title) || norm(p.title) || 'Untitled';
        const imgRaw = norm(p.featured_img);
        if (!imgRaw) return;

        const img = toEncoded(imgRaw);
        const isWebp = /\.webp(\?.*)?$/i.test(img);
        const fallback = toEncoded(webpFallback(img));

        // anchor card
        const a = document.createElement('a');
        a.className = 'feat-card';
        a.href = slug ? `project.html?slug=${encodeURIComponent(slug)}` : '#';
        a.setAttribute('aria-label', title);
        a.style.setProperty('--i', i);

        // thumb container
        const thumb = document.createElement('div');
        thumb.className = 'feat-thumb';

        // <picture> for webp + fallback
        const pic = document.createElement('picture');

        if (isWebp) {
          const srcWebp = document.createElement('source');
          srcWebp.type = 'image/webp';
          srcWebp.srcset = img;      // serve webp when supported
          pic.appendChild(srcWebp);
        }

        const imgTag = document.createElement('img');
        imgTag.alt = title;
        imgTag.loading = 'lazy';
        imgTag.decoding = 'async';
        imgTag.width = 1920;   // intrinsic size of your assets
        imgTag.height = 1280;
        imgTag.src = fallback || img; // use fallback if we created one

        // if fallback also fails, show a placeholder so card never looks empty
        let triedPlaceholder = false;
        imgTag.onerror = () => {
          if (triedPlaceholder) return;
          triedPlaceholder = true;
          imgTag.src = '/assets/placeholder-card-1920x1280.jpg';
        };

        pic.appendChild(imgTag);
        thumb.appendChild(pic);

        // text block
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

      // stagger animation trigger
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
})();
