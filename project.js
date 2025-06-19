/**
 * project.js
 *
 * Fetch project data from Google Sheets (CSV) and render:
 *  - A project list grid on index.html (#projectGrid)
 *  - A detailed project page on project.html (#project-detail)
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
      const gridContainer = document.getElementById('projectGrid');
      const detailContainer = document.getElementById('project-detail');

      if (gridContainer) {
        renderProjects(projects, gridContainer);
      }
      if (detailContainer) {
        const slug = new URLSearchParams(window.location.search).get('slug');
        const project = projects.find(p => String(p.slug) === slug);
        if (project) {
          renderDetail(project, detailContainer);
        } else {
          detailContainer.innerHTML = '<p>404 – Project not found.</p>';
        }
      }
    })
    .catch(err => console.error('Error loading/parsing CSV:', err));
});

/**
 * renderProjects: injects project cards into a grid container
 */
function renderProjects(projects, container) {
  container.innerHTML = '';
  projects.forEach(p => {
    const card = document.createElement('a');
    card.href = `project.html?slug=${encodeURIComponent(p.slug)}`;
    card.className = 'card';
    card.setAttribute('data-tags', p.tags || '');
    
    // build tags HTML
    const tagsHtml = (p.tags || '').split(',').map(t => `<span>${t.trim()}</span>`).join('');

    card.innerHTML = `
      <img class="icon" src="${p.icon}" alt="${p.title} icon" />
      <div class="meta-inline">
        <span>${p.company}</span><span>${p.year}</span>
      </div>
      <div class="title">${p.title}</div>
      <div class="tags">
        ${tagsHtml}
      </div>
    `;
    container.appendChild(card);
  });
}

/**
 * renderDetail: injects full project detail into container
 */
function renderDetail(p, container) {
  // build tag spans
  const tagsHtml = (p.tags || '').split(',').map(t => `<span>${t.trim()}</span>`).join('');

  container.innerHTML = `
    <img id="project-icon" src="${p.icon}" alt="${p.company} icon" />
    <div id="project-tags" class="tags">${tagsHtml}</div>
    <h1 id="project-title">${p.title}</h1>
    <p id="project-meta">${p.company} | ${p.year}</p>

    <section>
      <img id="hero-img" src="${p.hero_img}" alt="Hero image of ${p.title}" />
      <figcaption id="hero-caption">${p.hero_caption}</figcaption>
    </section>

    <section>
      <h3>Problem</h3>
      <p id="problem-copy">${p.problem}</p>
    </section>

    <section>
      <h3>Process</h3>
      <p id="process-copy">${p.process}</p>
      <img id="process-img-1" src="${p.process_img_1}" alt="Process image 1" />
      <figcaption id="process-caption-1">${p.process_caption_1}</figcaption>
      <img id="process-img-2" src="${p.process_img_2}" alt="Process image 2" />
      <figcaption id="process-caption-2">${p.process_caption_2}</figcaption>
    </section>

    <section>
      <h3>Solution</h3>
      <p id="solution-copy">${p.solution}</p>
    </section>

    <section>
      <h3>Results</h3>
      <p id="results-copy">${p.results}</p>
      <img id="outcome-img" src="${p.outcome_img}" alt="Outcome image" />
      <figcaption id="outcome-caption">${p.outcome_caption}</figcaption>
    </section>

    <p><a href="index.html">← View All Projects</a></p>
  `;
}
