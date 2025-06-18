// scripts/project.js
const params = new URLSearchParams(window.location.search);
const slug = params.get("slug");

// Example data object (to replace later with Google Sheets import)
const projects = {
  uxrs: {
    icon: "assets/icons/icon_ux_3B82F6.svg",
    tags: ["UX", "Systems", "Social"],
    title: "Empowering a Nonprofit with a Scalable Design System",
    meta: "UX Research & Strategy 501(c)3 | 2021",
    heroImg: "assets/images/uxrs_hero.jpg",
    heroCaption: "Design system overview",
    problem: "The nonprofit lacked a cohesive design foundation...",
    process: "I conducted stakeholder interviews...",
    processImgs: [
      { src: "assets/images/uxrs_process1.jpg", caption: "Initial wireframes" },
      { src: "assets/images/uxrs_process2.jpg", caption: "Feedback loop with users" }
    ],
    solution: "Developed reusable components...",
    results: "Improved usability and increased engagement...",
    outcomeImg: "assets/images/uxrs_outcome.jpg",
    outcomeCaption: "Final design outcome"
  },
  // Add more slugs as needed
};

// Fallback if slug is missing or unknown
if (!slug || !projects[slug]) {
  document.querySelector(".main-container").innerHTML = "<p>Project not found.</p>";
} else {
  const p = projects[slug];
  document.getElementById("project-icon").src = p.icon;
  document.getElementById("project-tags").innerHTML = p.tags.map(tag => `<span>${tag}</span>`).join('');
  document.getElementById("project-title").textContent = p.title;
  document.getElementById("project-meta").textContent = p.meta;
  document.getElementById("hero-img").src = p.heroImg;
  document.getElementById("hero-caption").textContent = p.heroCaption;
  document.getElementById("problem-copy").textContent = p.problem;
  document.getElementById("process-copy").textContent = p.process;
  document.getElementById("process-img-1").src = p.processImgs[0].src;
  document.getElementById("process-caption-1").textContent = p.processImgs[0].caption;
  document.getElementById("process-img-2").src = p.processImgs[1].src;
  document.getElementById("process-caption-2").textContent = p.processImgs[1].caption;
  document.getElementById("solution-copy").textContent = p.solution;
  document.getElementById("results-copy").textContent = p.results;
  document.getElementById("outcome-img").src = p.outcomeImg;
  document.getElementById("outcome-caption").textContent = p.outcomeCaption;
}
