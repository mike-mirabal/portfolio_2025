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
        // If grid exists, render project cards
        renderProjects(publishedProjects, gridContainer);
      }

      if (slug) {
        // If slug param exists, render project detail
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
    const card = document.createElement('a');
    card.href = `project.html?slug=${encodeURIComponent(p.slug)}`;
    card.className = 'card';
    card.dataset.tags = (p.tags || '').toLowerCase();

    const tagsHtml = (p.tags || '')
      .split(',')
      .map(t => `<span>${t.trim()}</span>`)
      .join('');

    card.innerHTML = `
      <div class="hero-img">
        <img src="${p.card_img}" alt="${p.title} card image">
      </div>
      <div class="card-content">
        <div class="meta-flex">
          <strong class="company">${p.company}</strong>
          <span class="year">${p.year}</span>
        </div>
        <p class="title">${p.title}</p>
        <div class="tags">${tagsHtml}</div>
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
  document.getElementById('overview-text').textContent = p.overview || '';

  // ✅ Populate slider slides only
  const slidesContainer = document.querySelector('.swiper-wrapper');
  if (slidesContainer) {
    slidesContainer.innerHTML = '';

    for (let i = 1; i <= parseInt(p.hero_count); i++) {
      const type = p[`hero_type_${i}`];
      const url = p[`hero_url_${i}`];
      const caption = p[`hero_caption_${i}`] || '';

      // ✅ Debug log each slide caption
      console.log(`Hero ${i}: type=${type}, url=${url}, caption=${caption}`);

      if (!url) continue;

      const slide = document.createElement('div');
      slide.classList.add('swiper-slide');

      if (type === "video") {
        slide.innerHTML = `
          <figure>
            <video controls>
              <source src="${url}" type="video/mp4">
            </video>
            <figcaption>${caption}</figcaption>
          </figure>
        `;
      } else {
        slide.innerHTML = `
          <figure>
            <img src="${url}" alt="Slide image">
            <figcaption>${caption}</figcaption>
          </figure>
        `;
      }

      slidesContainer.appendChild(slide);
    }

    // ✅ Initialize Swiper
    new Swiper('.swiper', {
      effect: 'fade',
      loop: true,
      navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
      pagination: { el: '.swiper-pagination' },
    });
  }
}
