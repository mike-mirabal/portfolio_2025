 const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRAZz5mIVDN9q1EEapOvFb5RFNKN3VRrFK44KVQQlMa-HUmzEZWfseLnXpmaCQNfiXZIQjGcmLcTb1Q/pub?gid=0&single=true&output=csv';

document.addEventListener('DOMContentLoaded', () => {
  fetch(sheetURL)
    .then(res => res.text())
    .then(csvText => {
      const { data: projects } = Papa.parse(csvText.trim(), { header: true, skipEmptyLines: true });

      // ✅ Filter projects to only include published entries
      const publishedProjects = projects.filter(p => p.published && p.published.toUpperCase() === "TRUE");

      // ✅ Sort published projects by year (newest to oldest)
      publishedProjects.sort((a, b) => {
        const yearA = parseInt(a.year) || 0;
        const yearB = parseInt(b.year) || 0;
        return yearB - yearA;
      });

      // ✅ Determine page type based on DOM
      const gridContainer = document.getElementById('projectGrid');
      const slug = new URLSearchParams(window.location.search).get('slug');

      if (gridContainer) {
        renderProjects(publishedProjects, gridContainer);
      }

      if (slug) {
        const p = publishedProjects.find(p => String(p.slug) === slug);
        if (p) renderDetail(p);
      }
    })
    .catch(err => console.error('CSV load error:', err));
});

/**
 * Renders project cards into grid container
 */
function renderProjects(projects, container) {
  container.innerHTML = '';
  projects.forEach(p => {
    // ── Field map + sensible fallbacks for new layout ────────────────────────
    const href    = `project.html?slug=${encodeURIComponent(p.slug)}`;
    const company = p.company || '';
    const year    = p.year || '';
    const heroImg = p.card_img || p.hero_url_1 || '';
    const iconUrl = p.icon || p.logo || p.icon_url || ''; // add one of these cols if needed

    // 🔁 Use card_title for the card; fall back to title if missing
    const title   = p.card_title || p.title || '';

    const desc =
      p.short_desc ||
      p.description ||
      p.subtitle ||
      (p.overview ? String(p.overview).split('\n')[0] : '') || '';

    const tagsLower = (p.tags || '').toLowerCase();
    const tagsHtml = (p.tags || '')
      .split(',')
      .filter(Boolean)
      .map(t => `<span>${t.trim()}</span>`)
      .join('');

    // ── Card DOM for: top-meta → hero → title → description (tags optional) ──
    const card = document.createElement('a');
    card.href = href;
    card.className = 'card card-v03';
    card.dataset.tags = tagsLower;
    card.setAttribute('aria-label', `${title} – ${company} ${year}`);

    card.innerHTML = `
      <div class="top-meta">
        <div class="company-icon" aria-hidden="true">
          ${iconUrl ? `<img src="${iconUrl}" alt="">` : `<span class="icon-fallback">${(company || '?').charAt(0)}</span>`}
        </div>
        <div class="company-and-year">
          <div class="company">${company}</div>
          <div class="year">${year}</div>
        </div>
      

      <!-- Ask AI button (top-right) -->
    <button
      class="card-action ask-ai-btn"
      type="button"
      aria-label="Ask AI about this project"
      title="Ask AI about this project"
      data-slug="${p.slug || ''}"
      data-title="${(p.card_title || p.title || '').replace(/"/g,'&quot;')}"
      data-overview="${(p.overview || '').replace(/"/g,'&quot;')}"
      onclick="openProjectChatModal(event, this)"
    >
    
      <!-- chat bubble icon -->

    <img src="/assets/icons/icon_chat_3B82F6.svg" alt="Chat Icon" width="24" height="24">

    </button>
  </div>
</div>
      <div class="hero-img">
        <img src="${heroImg}" alt="${title} card image">
      </div>

      <div class="card-content">
        <h4 class="title">${title}</h4>
        ${desc ? `<p class="desc">${desc}</p>` : ''}
        ${tagsHtml ? `<div class="tags">${tagsHtml}</div>` : ''}
      </div>
    `;

    container.appendChild(card);
  });
}

/**
 * Renders project detail page content
 */
function renderDetail(p) {
  // ✅ Populate existing project title and meta
  document.title = `${p.title} | Mike Mirabal`;
  document.getElementById('project-title').textContent = p.title;
  document.getElementById('project-meta').textContent = `${p.company} | ${p.year}`;

  // ✅ Render overview text as semantic paragraphs
  const overviewContainer = document.getElementById('overview-text');
  if (overviewContainer) {
    overviewContainer.innerHTML = (p.overview || '')
      .split('\n')
      .map(para => `<p>${para.trim()}</p>`)
      .join('');
  }

  // ✅ OPTIONAL RESOURCE LINK if applicable
  if (p.extra_resource_link) {
    const overviewSection = document.getElementById('project-overview');
    const linkHTML = `
      <p>
        <a href="${p.extra_resource_link}" target="_blank" rel="noopener noreferrer">
          ${p.extra_resource_text || 'View More Details'}
        </a>
      </p>
    `;
    overviewSection.insertAdjacentHTML('beforeend', linkHTML);
  }

  // ✅ Populate slider slides only
  const slidesContainer = document.querySelector('.swiper-wrapper');
  if (slidesContainer) {
    slidesContainer.innerHTML = '';

    for (let i = 1; i <= parseInt(p.hero_count); i++) {
      const type = p[`hero_type_${i}`];
      const url = p[`hero_url_${i}`];
      const caption = p[`hero_caption_${i}`] || '';

      if (!url) continue;

      const slide = document.createElement('div');
      slide.classList.add('swiper-slide');

      if (type === "video") {
        slide.innerHTML = `
          <figure>
            <video controls>
              <source src="${url}" type="video/mp4">
            </video>
            <figcaption class="slide-caption">${caption}</figcaption>
          </figure>
        `;
      } else {
        // ✅ Wrap image in <a> for GLightbox
        slide.innerHTML = `
          <figure>
            <a href="${url}" class="glightbox" data-gallery="project-hero">
              <img src="${url}" alt="Slide image">
            </a>
            <figcaption class="slide-caption">${caption}</figcaption>
          </figure>
        `;
      }

      slidesContainer.appendChild(slide);
    }

    // ✅ Initialize Swiper with correct caption handling for looped slides
    const swiper = new Swiper('.swiper', {
      effect: 'fade',
      loop: true,
      navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
      // pagination: { el: '.swiper-pagination' }, // removed pagination
      on: {
        init: function () {
          updateCaptions(this);
        },
        slideChange: function () {
          updateCaptions(this);
        }
      }
    });

    /**
     * Helper to show only the caption of the active slide
     */
    function updateCaptions(swiperInstance) {
      const allSlides = swiperInstance.slides;
      allSlides.forEach(slide => {
        const caption = slide.querySelector('figcaption');
        if (caption) {
          caption.style.display = 'none';
        }
      });

      const activeSlide = swiperInstance.slides[swiperInstance.activeIndex];
      if (activeSlide) {
        const activeCaption = activeSlide.querySelector('figcaption');
        if (activeCaption) {
          activeCaption.style.display = 'block';
        }
      }
    }

    // ✅ Initialize GLightbox
    const lightbox = GLightbox({
      selector: '.glightbox'
    });
  }
}
