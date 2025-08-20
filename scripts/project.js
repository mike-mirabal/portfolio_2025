// FILE: project.js

const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRAZz5mIVDN9q1EEapOvFb5RFNKN3VRrFK44KVQQlMa-HUmzEZWfseLnXpmaCQNfiXZIQjGcmLcTb1Q/pub?gid=0&single=true&output=csv';

document.addEventListener('DOMContentLoaded', () => {
  fetch(sheetURL)
    .then(res => res.text())
    .then(csvText => {
      const { data: projects } = Papa.parse(csvText.trim(), { header: true, skipEmptyLines: true });

      const publishedProjects = projects.filter(p => p.published && p.published.toUpperCase() === "TRUE");

      publishedProjects.sort((a, b) => {
        const yearA = parseInt(a.year) || 0;
        const yearB = parseInt(b.year) || 0;
        return yearB - yearA;
      });

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
    const href    = `project.html?slug=${encodeURIComponent(p.slug)}`;
    const company = p.company || '';
    const year    = p.year || '';
    const heroImg = p.card_img || p.hero_url_1 || '';
    const iconUrl = p.icon || p.logo || p.icon_url || '';
    const title   = p.card_title || p.title || '';
    const desc    = p.short_desc || p.description || p.subtitle || (p.overview ? String(p.overview).split('\n')[0] : '') || '';

    const tagsLower = (p.tags || '').toLowerCase();
    const tagsHtml = (p.tags || '')
      .split(',')
      .filter(Boolean)
      .map(t => `<span>${t.trim()}</span>`)
      .join('');

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

        <button
          class="card-action ask-ai-btn"
          type="button"
          aria-label="Ask AI about this project"
          title="Ask AI about this project"
          data-slug="${p.slug || ''}"
          data-title="${(p.card_title || p.title || '').replace(/"/g,'&quot;')}"
          data-overview="${(p.overview || '').replace(/"/g,'&quot;')}"
          data-icon="${iconUrl}"
          onclick="openProjectChatModal(event, this)"
        >
          <img src="/assets/icons/icon_chat_3B82F6.svg" alt="Chat Icon" width="24" height="24">
        </button>
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
  document.title = `${p.title} | Mike Mirabal`;
  document.getElementById('project-title').textContent = p.title;
  document.getElementById('project-meta').textContent = `${p.company} | ${p.year}`;

  const contentContainer = document.getElementById('project-content');
  if (contentContainer) {
    const sections = [
      { key: 'overview', title: 'Overview' },
      { key: 'problem', title: 'Problem' },
      { key: 'process', title: 'Process' },
      { key: 'solution', title: 'Solution' },
      { key: 'results', title: 'Results' }
    ];

    sections.forEach(({ key, title }) => {
      if (p[key]) {
        const section = document.createElement('section');
        const heading = document.createElement('h3');
        heading.textContent = title;
        heading.setAttribute('id', key);
        section.appendChild(heading);

        p[key].split('\n').forEach(para => {
          const pEl = document.createElement('p');
          pEl.textContent = para.trim();
          section.appendChild(pEl);
        });

        const hr = document.createElement('hr');
        hr.style.marginTop = '2rem';
        hr.style.marginBottom = '2rem';
        section.appendChild(hr);

        contentContainer.appendChild(section);

        if (key === 'overview' && p.interactive_link && p.interactive_text) {
          const icon = p.interactive_icon || '';
          const headingText = p.interactive_heading || 'Further Reading';
          const interactiveHTML = `
            <div class="interactive-link-block">
              <h3 id="interactive" style="margin-bottom: 0.5rem;">${headingText}</h3>
              <p class="slide-caption">
                ${icon ? `<img src="${icon}" alt="icon" class="interactive-icon" style="vertical-align: middle; margin-right: 0.4em; height: 1em;">` : ''}
                ${p.interactive_supporting || ''}
              </p>
              <p style="margin: 0.4rem 0 1rem">
                <a href="${p.interactive_link}" target="_blank" rel="noopener noreferrer" style="text-decoration: underline; color: var(--accent); border: none; background: none; padding: 0; margin: 0; font: inherit; border-radius: 0;">
                  ${p.interactive_text}
                </a>
              </p>
              <hr />
            </div>
          `;
          contentContainer.insertAdjacentHTML('beforeend', interactiveHTML);
        }
      }
    });

    if (p.extra_resource_link) {
      const linkHTML = `
        <p>
          <a href="${p.extra_resource_link}" target="_blank" rel="noopener noreferrer">
            ${p.extra_resource_text || 'View More Details'}
          </a>
        </p>
      `;
      contentContainer.insertAdjacentHTML('beforeend', linkHTML);
    }
  }

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

    const swiper = new Swiper('.swiper', {
      effect: 'fade',
      loop: true,
      navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
      on: {
        init: function () {
          updateCaptions(this);
        },
        slideChange: function () {
          updateCaptions(this);
        }
      }
    });

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

    const lightbox = GLightbox({
      selector: '.glightbox'
    });
  }
}
