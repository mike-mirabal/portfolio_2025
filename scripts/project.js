/**
 * project.js
 *
 * Fetch project data from Google Sheets (CSV) and render:
 *  - A project list grid on index.html (#projectGrid)
 *  - A detailed project page on project.html (#project-detail)
 *  - Dynamic social sharing image using the project's hero image
 *  - Filter logic for index page
 *  - Fade-in transition for project detail content
 */

const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRAZz5mIVDN9q1EEapOvFb5RFNKN3VRrFK44KVQQlMa-HUmzEZWfseLnXpmaCQNfiXZIQjGcmLcTb1Q/pub?gid=0&single=true&output=csv';

document.addEventListener('DOMContentLoaded', () => {
  fetch(sheetURL)
    .then(res => {
      if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
      return res.text();
    })
    .then(csvText => {
      const { data: projects } = Papa.parse(csvText.trim(), { header: true, skipEmptyLines: true });

      // ✅ Debug: log parsed projects and their years
      console.log("✅ Parsed projects:", projects);
      projects.forEach(p => console.log("Project year:", p.year));

      // ✅ Filter projects to only include published entries
      const publishedProjects = projects.filter(p => p.published && p.published.toUpperCase() === "TRUE");

      // ✅ Sort published projects by year (newest to oldest)
      publishedProjects.sort((a, b) => {
        const yearA = parseInt(a.year) || 0;
        const yearB = parseInt(b.year) || 0;
        return yearB - yearA;
      });

      const gridContainer = document.getElementById('projectGrid');
      const detailContainer = document.getElementById('project-detail');

      // ✅ Render grid projects if container exists
      if (gridContainer) {
        renderProjects(publishedProjects, gridContainer);
        initFilters();
      }

      // ✅ Render individual project details if container exists
      if (detailContainer) {
        const slug = new URLSearchParams(window.location.search).get('slug');
        const project = projects.find(p => String(p.slug) === slug);
        if (project) {
          detailContainer.style.opacity = '0';
          renderDetail(project, detailContainer);
        } else {
          detailContainer.innerHTML = '<p>404 – Project not found.</p>';
          document.title = '404 – Project Not Found | Mike Mirabal';
          detailContainer.style.opacity = '1';
        }
      }
    })
    .catch(err => console.error('Error loading/parsing CSV:', err));
});


/* ====== renderProjects: injects project cards into a grid container ====== */
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

    // ✅ Debug: log each project card being rendered
    console.log("Rendering project:", p.title, "Card Img:", p.card_img);

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

    <div class="tags">
      ${tagsHtml}
    </div>
  </div>
`;

    container.appendChild(card);
  });
}


/**
 * initFilters: sets up click handlers for filter buttons on index.html
 */
function initFilters() {
  const buttons = document.querySelectorAll('.filters button');

  // ✅ On page load: check URL param and activate correct filter
  const params = new URLSearchParams(window.location.search);
  const urlFilter = params.get('filter') || 'all';

  // Find the button matching the URL filter
  const activeBtn = Array.from(buttons).find(btn =>
    btn.textContent.trim().toLowerCase() === urlFilter
  );

  if (activeBtn) {
    selectFilter(activeBtn);
  }

  // ✅ Add click listeners to buttons to filter projects + update URL
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectFilter(btn);

      // ✅ Update the URL to reflect selected filter without reloading
      const filter = btn.textContent.trim().toLowerCase();
      const newUrl = `${window.location.pathname}?filter=${encodeURIComponent(filter)}`;
      history.pushState(null, '', newUrl);
    });
  });
}


/**
 * renderDetail: injects full project detail into container
 * Wrap hero, process, and results images uniformly in .image-grid
 * Updates document title and social share meta tags
 * Fades content in after injection
 */
function renderDetail(p, container) {
  console.log("Overview field content:", p.overview);

  document.title = `${p.title} | Mike Mirabal`;
  const socialImg = p.card_img && p.card_img.trim() !== "" ? p.card_img : 'assets/placeholder.png';
  setMetaTag('og:image', socialImg);
  setMetaTag('twitter:image', socialImg);
  setMetaTag('og:title', p.title);
  setMetaTag('og:description', (p.solution || '').substring(0, 160));
  setMetaTag('og:type', 'article');
  setMetaTag('og:url', window.location.href);
  setMetaTag('twitter:card', 'summary_large_image');

  container.innerHTML = `
    <div class="project-header">
    <!--remove icon 
      <div class="icon-tags">
        <img id="project-icon" class="icon" src="${p.icon && p.icon.trim() !== "" ? p.icon : 'assets/placeholder.png'}" alt="${p.company} icon" />
      </div>
      -->
      <p id="project-meta">${p.company} | ${p.year}</p>
      <h1 id="project-title">${p.title}</h1>
    </div>
    <section id="hero-slider" class="swiper">
      <div class="swiper-wrapper">
        <!-- Slides will be injected dynamically -->
      </div>
      <div class="swiper-button-prev"></div>
      <div class="swiper-button-next"></div>
      <div class="swiper-pagination"></div>
    </section>
    <section id="project-overview">
      <h3>Overview</h3>
      <p>${p.overview || ''}</p>
    </section>
  `;

  const slidesContainer = container.querySelector('.swiper-wrapper');

  for (let i = 1; i <= parseInt(p.hero_count); i++) {
    const type = p[`hero_type_${i}`];
    const url = p[`hero_url_${i}`];
    const caption = p[`hero_caption_${i}`] || '';

    if (!url) continue; // skip empty rows

    const slide = document.createElement('div');
    slide.classList.add('swiper-slide');

    if (type === "video") {
      slide.innerHTML = `
        <figure>
          <video controls>
            <source src="${url}" type="video/mp4">
            Your browser does not support the video tag.
          </video>
          <figcaption>${caption}</figcaption>
        </figure>
      `;
    } else {
      slide.innerHTML = `
        <figure>
          <img src="${url}" alt="Project media">
          <figcaption>${caption}</figcaption>
        </figure>
      `;
    }

    slidesContainer.appendChild(slide);
  }

  const swiper = new Swiper('.swiper', {
    effect: 'fade',
    grabCursor: true,
    centeredSlides: true,
    slidesPerView: 1,
    loop: true,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
    pagination: {
      el: '.swiper-pagination',
    },
  });

  requestAnimationFrame(() => {
    container.style.transition = 'opacity 0.3s ease';
    container.style.opacity = '1';
  });
}

/**
 * Utility to update or create meta tags
 */
function setMetaTag(property, content) {
  let tag = document.querySelector(`meta[property="${property}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('property', property);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}
