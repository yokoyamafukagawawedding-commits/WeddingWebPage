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

  const getYouTubeVideoId = (url) => {
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || "";
    if (host !== "youtube.com" && !host.endsWith(".youtube.com")) return "";
    if (url.pathname === "/watch") return url.searchParams.get("v") || "";
    const parts = url.pathname.split("/").filter(Boolean);
    return ["embed", "shorts", "live"].includes(parts[0]) ? parts[1] || "" : "";
  };

  const youtubeUrl = String(config.youtubeUrl || "").trim();
  if (youtubeUrl && !youtubeUrl.startsWith("PASTE_")) {
    try {
      const parsedUrl = new URL(youtubeUrl);
      const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
      const isYouTube = host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com");
      if (parsedUrl.protocol !== "https:" || !isYouTube) throw new Error("YouTube URLではありません。");

      const frame = document.getElementById("youtubeFrame");
      const videoWrap = document.getElementById("youtubeVideoWrap");
      const link = document.getElementById("youtubeLink");
      const linkWrap = document.getElementById("youtubeLinkWrap");
      const comingSoon = document.getElementById("youtubeComingSoon");
      const note = document.getElementById("youtubeNote");
      const videoId = getYouTubeVideoId(parsedUrl);

      link.href = parsedUrl.href;
      linkWrap.hidden = false;
      comingSoon.hidden = true;
      note.hidden = true;
      if (/^[0-9A-Za-z_-]{6,}$/.test(videoId)) {
        frame.src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
        videoWrap.hidden = false;
      }
    } catch (_) {
      // 未設定または不正なURLの場合は「Coming Soon」を表示したままにします。
    }
  }
})();
