// scripts/project.js

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");

  const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAZz5mIVDN9q1EEapOvFb5RFNKN3VRrFK44KVQQlMa-HUmzEZWfseLnXpmaCQNfiXZIQjGcmLcTb1Q/pub?output=csv";

  fetch(csvUrl)
    .then(res => res.text())
    .then(data => {
      const rows = data.trim().split("\n").map(row => row.split(","));
      const headers = rows[0].map(h => h.trim());
      const entries = rows.slice(1).map(row => {
        return headers.reduce((obj, key, i) => {
          obj[key] = row[i]?.trim();
          return obj;
        }, {});
      });

      const project = entries.find(p => p.slug === slug);

      if (!project) {
        document.querySelector(".main-container").innerHTML = "<p>Project not found.</p>";
        return;
      }

      // Populate the page
      document.getElementById("project-icon").src = project.icon;
      document.getElementById("project-tags").innerHTML = project.tags.split(',').map(tag => `<span>${tag}</span>`).join('');
      document.getElementById("project-title").textContent = project.title;
      document.getElementById("project-meta").textContent = `${project.company} | ${project.year}`;
      document.getElementById("hero-img").src = project.hero_img;
      document.getElementById("hero-caption").textContent = project.hero_caption;
      document.getElementById("problem-copy").textContent = project.problem;
      document.getElementById("process-copy").textContent = project.process;
      document.getElementById("process-img-1").src = project.process_img_1;
      document.getElementById("process-caption-1").textContent = project.process_caption_1;
      document.getElementById("process-img-2").src = project.process_img_2;
      document.getElementById("process-caption-2").textContent = project.process_caption_2;
      document.getElementById("solution-copy").textContent = project.solution;
      document.getElementById("results-copy").textContent = project.results;
      document.getElementById("outcome-img").src = project.outcome_img;
      document.getElementById("outcome-caption").textContent = project.outcome_caption;
    })
    .catch(err => {
      console.error("Error loading project data:", err);
      document.querySelector(".main-container").innerHTML = "<p>Unable to load project data.</p>";
    });
});
