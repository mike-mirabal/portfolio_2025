/**
 * project.js
 *
 * Fetch project data from Google Sheets (CSV) and inject into existing index.html structure.
 */

const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRAZz5mIVDN9q1EEapOvFb5RFNKN3VRrFK44KVQQlMa-HUmzEZWfseLnXpmaCQNfiXZIQjGcmLcTb1Q/pub?gid=0&single=true&output=csv';

// Wait until DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  fetch(sheetURL)
    .then(res => {
      if (!res.ok) throw new Error(`Network response was not ok: ${res.status}`);
      return res.text();
    })
    .then(csvText => {
      // Use PapaParse to handle commas in fields
      const parsed = Papa.parse(csvText.trim(), { header: true, skipEmptyLines: true });
      const projects = parsed.data;
      renderProjects(projects);
    })
    .catch(err => console.error('Error loading projects CSV:', err));
});

/**
 * renderProjects
 * Injects <a class="card"> items into the existing grid with id="projectGrid".
 */
function renderProjects(projects) {
  const grid = document.getElementById('projectGrid');
  if (!grid) {
    console.error('Container with id="projectGrid" not found');
    return;
  }
  grid.innerHTML = '';  // clear any static cards

  projects.forEach(p => {
    const link = document.createElement('a');
    link.href = `project.html?slug=${encodeURIComponent(p.slug)}`;
    link.className = 'card';
    link.setAttribute('data-tags', p.tags || '');

    link.innerHTML = `
      <img class="icon" src="${p.icon}" alt="${p.company} icon" />
      <div class="meta-inline">
        <span>${p.company}</span><span>${p.year}</span>
      </div>
      <div class="title">${p.title}</div>
      <div class="tags">
        ${(p.tags || '').split(',').map(tag => `<span>${tag.trim()}</span>`).join('')}
      </div>
    `;

    grid.appendChild(link);
  });
}
