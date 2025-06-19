document.addEventListener("DOMContentLoaded", () => {
  const slug = new URLSearchParams(window.location.search).get("slug");
  const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAZz5mIVDN9q1EEapOvFb5RFNKN3VRrFK44KVQQlMa-HUmzEZWfseLnXpmaCQNfiXZIQjGcmLcTb1Q/pub?gid=0&single=true&output=csv";

  fetch(csvUrl)
    .then(res => res.text())
    .then(text => {
      const rows = text.trim().split("\n").map(r => r.split(/\s*,\s*/));
      const headers = rows.shift();
      const entries = rows.map(r => Object.fromEntries(headers.map((h,i) => [h, r[i] || ""])));
      const project = entries.find(p => p.slug === slug);

      // Debug logging
      console.log("Loaded entries:", entries);
      console.log("Looking for slug:", slug);
      console.log("Matched project:", project);

      if (!project) {
        document.querySelector(".main-container").innerHTML = "<p>404 – Project not found.</p>";
        return;
      }

      
      document.getElementById("project-icon").src = project.icon;
      document.getElementById("project-tags").innerHTML = project.tags.split(",").map(t => `<span>${t}</span>`).join("");
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
    .catch(err => console.error("CMS fetch error:", err));
});
