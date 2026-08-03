(() => {
  const config = window.WEDDING_CONFIG || {};

  document.querySelectorAll("[data-config-link]").forEach((element) => {
    const key = element.dataset.configLink;
    const value = config[key];
    if (typeof value === "string" && value && !value.startsWith("PASTE_")) {
      element.href = value;
    } else {
      element.addEventListener("click", (event) => {
        event.preventDefault();
        alert("リンクは準備中です。");
      });
    }
  });

  const youtubeFrame = document.getElementById("youtubeFrame");
  if (youtubeFrame && config.youtubeVideoId) {
    youtubeFrame.src = `https://www.youtube.com/embed/${encodeURIComponent(config.youtubeVideoId)}`;
  }
})();
