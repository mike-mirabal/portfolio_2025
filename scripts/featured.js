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

  // Build cards from CSV
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

        const img = encodeURI(imgRaw);

        // <a> card
        const a = document.createElement('a');
        a.className = 'feat-card';
        a.href = slug ? `project.html?slug=${encodeURIComponent(slug)}` : '#';
        a.setAttribute('aria-label', title);
        a.style.setProperty('--i', i);

        // Thumb
        const thumb = document.createElement('div');
        thumb.className = 'feat-thumb';

        // Use <picture> so WebP works everywhere with PNG fallback (if you keep side-by-side assets)
        const pic = document.createElement('picture');
        const srcWebp = document.createElement('source');
        srcWebp.type = 'image/webp';
        srcWebp.srcset = img;

        const image = document.createElement('img');
        image.alt = title;
        image.loading = 'lazy';
        image.decoding = 'async';
        image.src = /\.webp(\?.*)?$/i.test(img)
          ? img.replace(/\.webp(\?.*)?$/i, '.png$1') // fallback if browser can’t use <source>
          : img;
        image.onerror = () => {
          // If the PNG fallback 404s, fall back to the original URL (might be webp hosted correctly)
          if (image.dataset.triedFallback !== '1') {
            image.dataset.triedFallback = '1';
            image.src = img;
          }
        };

        pic.appendChild(srcWebp);
        pic.appendChild(image);
        thumb.appendChild(pic);

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
        console.warn('ℹ️ No featured cards rendered. Check CSV values for: published, tags/filter/featured, featured_img.');
        return;
      }

      // --- Stagger-in animation
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

      // --- Drag-to-scroll (nice on desktop)
      enableDragToScroll(track);

      // --- Mobile-only: M3 "Hero" carousel mode
      enableHeroMode(track);
    })
    .catch((err) => console.error('❌ Featured carousel load error:', err));

  // ---------------- Drag-to-scroll ----------------
  function enableDragToScroll(el) {
    let isDown = false;
    let startX = 0;
    let scrollStart = 0;

    const onDown = (e) => {
      isDown = true;
      el.classList.add('is-dragging');
      startX = ('touches' in e ? e.touches[0].pageX : e.pageX);
      scrollStart = el.scrollLeft;
    };
    const onMove = (e) => {
      if (!isDown) return;
      const x = ('touches' in e ? e.touches[0].pageX : e.pageX);
      const dx = x - startX;
      el.scrollLeft = scrollStart - dx;
    };
    const onUp = () => {
      isDown = false;
      el.classList.remove('is-dragging');
    };

    el.addEventListener('pointerdown', onDown, { passive: true });
    el.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });

    el.addEventListener('touchstart', onDown, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp, { passive: true });
  }

  // ---------------- Mobile Hero Mode ----------------
  function enableHeroMode(el) {
    const mql = window.matchMedia('(max-width: 600px)');
    let raf = 0;

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        updateCurrent();
      });
    };

    const updateCurrent = () => {
      if (!el.classList.contains('hero-mode')) return;
      const rect = el.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;

      let best = null;
      let bestDist = Infinity;

      el.querySelectorAll('.feat-card').forEach((card) => {
        const r = card.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const dist = Math.abs(cx - midX);
        if (dist < bestDist) {
          best = card;
          bestDist = dist;
        }
      });

      el.querySelectorAll('.feat-card.is-current').forEach((c) =>
        c.classList.remove('is-current')
      );
      if (best) best.classList.add('is-current');
    };

    const apply = () => {
      if (mql.matches) {
        el.classList.add('hero-mode');
        // ensure center card marked when we enter mode
        requestAnimationFrame(updateCurrent);
        el.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', updateCurrent, { passive: true });
      } else {
        el.classList.remove('hero-mode');
        el.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', updateCurrent);
        el.querySelectorAll('.feat-card.is-current').forEach((c) =>
          c.classList.remove('is-current')
        );
      }
    };

    apply();
    mql.addEventListener('change', apply);
  }
})();
