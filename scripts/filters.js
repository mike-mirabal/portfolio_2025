(function() {
  function applyFilterFromURL() {
    const params = new URLSearchParams(window.location.search);
    const filter = params.get("filter");
    if (!filter) return;

    // Deactivate all filter buttons
    document.querySelectorAll(".filters button").forEach(btn =>
      btn.classList.remove("active")
    );

    // Activate correct filter button
    const filterBtn = Array.from(document.querySelectorAll(".filters button"))
      .find(btn => btn.textContent.trim().toLowerCase() === filter);
    if (filterBtn) {
      filterBtn.classList.add("active");
    }

    // Show only matching cards
    document.querySelectorAll(".card").forEach(card => {
      const tags = card.dataset.tags?.split(",").map(t => t.trim().toLowerCase()) || [];
      card.style.display = filter === "all" || tags.includes(filter) ? "" : "none";
    });
  }

  function enableButtonFiltering() {
    document.querySelectorAll(".filters button").forEach(button => {
      button.addEventListener("click", () => {
        const selected = button.textContent.trim().toLowerCase();
        document.querySelectorAll(".filters button").forEach(btn =>
          btn.classList.remove("active"));
        button.classList.add("active");

        document.querySelectorAll(".card").forEach(card => {
          const tags = card.dataset.tags?.split(",").map(t => t.trim().toLowerCase()) || [];
          card.style.display = selected === "all" || tags.includes(selected) ? "" : "none";
        });
      });
    });
  }

  // Wait for cards to be injected
  window.addEventListener("load", () => {
    const checkCardsLoaded = setInterval(() => {
      const cards = document.querySelectorAll(".card");
      if (cards.length > 0) {
        clearInterval(checkCardsLoaded);
        applyFilterFromURL();
        enableButtonFiltering();
      }
    }, 50);
  });
})();
