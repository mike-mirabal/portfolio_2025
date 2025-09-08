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
  const toFallbackPng = (url) =>
    /\.webp(\?.*)?$/i.test(url) ? url.replace(/\.webp(\?.*)?$/i, '.png$1') : url;

  // Build featured cards from CSV
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
      featured.forEach((p, i) => {
        const slug = norm(p.slug);
        const title =
          norm(p.featured_title) ||
          norm(p.card_title) ||
          norm(p.title) ||
          'Untitled';
        const imgRaw = norm(p.featured_img);
        if (!imgRaw) return;

        // Normalize URL (handle spaces/odd chars)
        const img = encodeURI(imgRaw);
        const fallback = encodeURI(toFallbackPng(imgRaw));

        // Clickable card
        const a = document.createElement('a');
        a.className = 'feat-card';
        a.href = slug ? `project.html?slug=${encodeURIComponent(slug)}` : '#';
        a.setAttribute('aria-label', title);
        a.style.setProperty('--i', i);

        // Thumb w/ IMG (keeps aspect ratio & allows lazy/decoding)
        const thumb = document.createElement('div');
        thumb.className = 'feat-thumb';

        // Prefer WebP, fallback to PNG (same basename)
        const picture = document.createElement('picture');

        const sourceWebp = document.createElement('source');
        sourceWebp.type = 'image/webp';
        sourceWebp.srcset = img;

        const image = document.createElement('img');
        image.src = /\.webp(\?.*)?$/i.test(imgRaw) ? fallback : img;
        image.alt = title;
        image.width = 1920;
        image.height = 1280;
        image.loading = 'lazy';
        image.decoding = 'async';
        image.onerror = () => {
          // If both webp and png fail, remove the image (card still usable)
          console.warn('Featured image failed:', imgRaw);
          image.remove();
        };

        picture.appendChild(sourceWebp);
        picture.appendChild(image);
        thumb.appendChild(picture);

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
        console.warn(
          'ℹ️ No featured cards rendered. Check CSV values for: published, tags/filter/featured, featured_img.'
        );
        return;
      }

      // ---- Animation wiring (staggered fade + slide) ----
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

      // Add interactions (swipe/drag/keys/buttons)
      addFeaturedInteractions(track);
    })
    .catch((err) => console.error('❌ Featured carousel load error:', err));

  // ------------------------------------------------------------------
  // Interactions that used to live inline in index.html
  // - Touch/mouse drag to scroll
  // - Keyboard arrows when focused
  // - Optional prev/next buttons (if present in DOM)
  // ------------------------------------------------------------------
  function addFeaturedInteractions(track) {
    // Make focusable for keyboard users
    if (!track.hasAttribute('tabindex')) {
      track.setAttribute('tabindex', '0');
    }

    // ---- Touch (mobile) ----
    let tStartX = 0;
    let tScrollLeft = 0;
    let tDown = false;

    track.addEventListener(
      'touchstart',
      (e) => {
        if (!e.touches || !e.touches.length) return;
        tDown = true;
        tStartX = e.touches[0].pageX;
        tScrollLeft = track.scrollLeft;
      },
      { passive: true }
    );

    track.addEventListener(
      'touchend',
      () => {
        tDown = false;
      },
      { passive: true }
    );

    track.addEventListener(
      'touchmove',
      (e) => {
        if (!tDown || !e.touches || !e.touches.length) return;
        const x = e.touches[0].pageX;
        const dx = tStartX - x;
        track.scrollLeft = tScrollLeft + dx;
      },
      { passive: true }
    );

    // ---- Mouse drag (desktop) ----
    let mDown = false;
    let mStartX = 0;
    let mScrollLeft = 0;

    track.addEventListener('mousedown', (e) => {
      // Only left button
      if (e.button !== 0) return;
      mDown = true;
      mStartX = e.pageX - track.offsetLeft;
      mScrollLeft = track.scrollLeft;
      track.classList.add('is-dragging');
      e.preventDefault();
    });

    track.addEventListener('mouseleave', () => {
      mDown = false;
      track.classList.remove('is-dragging');
    });

    track.addEventListener('mouseup', () => {
      mDown = false;
      track.classList.remove('is-dragging');
    });

    track.addEventListener('mousemove', (e) => {
      if (!mDown) return;
      const x = e.pageX - track.offsetLeft;
      const walk = x - mStartX;
      track.scrollLeft = mScrollLeft - walk;
    });

    // ---- Keyboard arrows when focused ----
    track.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const amount = scrollByAmount(track);
      if (e.key === 'ArrowRight') {
        track.scrollBy({ left: amount, behavior: 'smooth' });
      } else {
        track.scrollBy({ left: -amount, behavior: 'smooth' });
      }
      e.preventDefault();
    });

    // ---- Optional prev/next buttons (if present) ----
    const prev = document.querySelector('.feat-prev');
    const next = document.querySelector('.feat-next');

    if (prev && next) {
      prev.addEventListener('click', () =>
        track.scrollBy({ left: -scrollByAmount(track), behavior: 'smooth' })
      );
      next.addEventListener('click', () =>
        track.scrollBy({ left: scrollByAmount(track), behavior: 'smooth' })
      );
    }
  }

  function scrollByAmount(track) {
    const card = track.querySelector('.feat-card');
    const gap = parseFloat(getComputedStyle(track).gap || '12') || 12;
    const cardWidth = card ? card.offsetWidth : 180;
    // Move ~2 cards or ~75% of track width, whichever is greater
    return Math.max(cardWidth * 2 + gap * 2, track.clientWidth * 0.75);
  }
})();
