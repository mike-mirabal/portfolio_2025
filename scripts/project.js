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

      // ✅ Sort projects by year (newest to oldest)
      projects.sort((a, b) => {
        const yearA = parseInt(a.year) || 0;
        const yearB = parseInt(b.year) || 0;
        return yearB - yearA;
      });

      const gridContainer = document.getElementById('projectGrid');
      const detailContainer = document.getElementById('project-detail');

      // ✅ Render grid projects if container exists
      if (gridContainer) {
        renderProjects(projects, gridContainer);
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
    console.log("Rendering project:", p.title, "Hero Img:", p.hero_img);

    card.innerHTML = `
  <div class="hero-img">
    <img src="${p.hero_img}" alt="${p.title} hero image">
  </div>

  <div class="card-content">
    <div class="meta-inline">
      <span class="company">${p.company}</span>
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
  document.title = `${p.title} | Mike Mirabal`;
  const socialImg = p.hero_img && p.hero_img.trim() !== "" ? p.hero_img : 'assets/placeholder.png';
  setMetaTag('og:image', socialImg);
  setMetaTag('twitter:image', socialImg);
  setMetaTag('og:title', p.title);
  setMetaTag('og:description', (p.solution || '').substring(0, 160));
  setMetaTag('og:type', 'article');
  setMetaTag('og:url', window.location.href);
  setMetaTag('twitter:card', 'summary_large_image');

  // Fallback for results caption
  const resultsCaption = p.results_caption || p.outcome_caption || '';
  const resultsImg = p.results_img && p.results_img.trim() !== "" ? p.results_img : (p.outcome_img && p.outcome_img.trim() !== "" ? p.outcome_img : 'assets/placeholder.png');

  const processImg1 = p.process_img_1 && p.process_img_1.trim() !== "" ? p.process_img_1 : 'assets/placeholder.png';
  const processImg2 = p.process_img_2 && p.process_img_2.trim() !== "" ? p.process_img_2 : 'assets/placeholder.png';

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
    <section id="hero">
      <div class="image-grid single">
        <figure>
          <img id="hero-img" src="${socialImg}" alt="Hero image" />
          <figcaption id="hero-caption">${p.hero_caption}</figcaption>
        </figure>
      </div>
    </section>
    <section id="problem">
      <h3>Problem</h3>
      <p id="problem-copy">${p.problem}</p>
    </section>
    <section id="process">
      <h3>Process</h3>
      <p id="process-copy">${p.process}</p>
      <div class="image-grid">
        <figure>
          <img id="process-img-1" src="${processImg1}" alt="Process image 1" />
          <figcaption id="process-caption-1">${p.process_caption_1}</figcaption>
        </figure>
        <figure>
          <img id="process-img-2" src="${processImg2}" alt="Process image 2" />
          <figcaption id="process-caption-2">${p.process_caption_2}</figcaption>
        </figure>
      </div>
    </section>
    <section id="solution">
      <h3>Solution</h3>
      <p id="solution-copy">${p.solution}</p>
    </section>
    <section id="results">
      <h3>Results</h3>
      <p id="results-copy">${p.results}</p>
      <div class="image-grid single">
        <figure>
          <img id="results-img" src="${resultsImg}" alt="Results image" />
          <figcaption id="results-caption">${resultsCaption}</figcaption>
        </figure>
      </div>
    </section>
    <div class="filters bottom">
      <a href="projects.html" class="filter-btn">← View All Projects</a>
    </div>
    <p class="back-to-top"><a href="#top">Back to top ↑</a></p>
  `;

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
