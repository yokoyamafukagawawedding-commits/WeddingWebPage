(() => {
  const config = window.WEDDING_CONFIG || {};

  // 内容は常に表示し、対応環境で画面に入った要素だけを一度演出します。
  if (document.body.classList.contains("home-page") &&
      "IntersectionObserver" in window &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("reveal-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    document.querySelectorAll(".section-heading, .menu-card, .gallery, .tmp-coming-soon, .map-wrap")
      .forEach((element) => observer.observe(element));
  }

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

  const isYouTubeHost = (host) => host === "youtu.be" ||
    ["youtube.com", "youtube-nocookie.com"].some((domain) => host === domain || host.endsWith(`.${domain}`));

  const getYouTubeVideoId = (url) => {
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || "";
    if (!isYouTubeHost(host)) return "";
    if (url.pathname === "/watch") return url.searchParams.get("v") || "";
    const parts = url.pathname.split("/").filter(Boolean);
    return ["embed", "shorts", "live"].includes(parts[0]) ? parts[1] || "" : "";
  };

  const loadYouTubeTitle = async (videoId, setTitle) => {
    if (!("fetch" in window) || !("AbortController" in window)) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const endpoint = new URL("https://www.youtube.com/oembed");
      endpoint.searchParams.set("url", `https://www.youtube.com/watch?v=${videoId}`);
      endpoint.searchParams.set("format", "json");
      const response = await fetch(endpoint.href, { signal: controller.signal, credentials: "omit" });
      if (!response.ok) return;
      const data = await response.json();
      if (typeof data.title === "string" && data.title.trim()) setTitle(data.title.trim());
    } catch (_) {
      // タイトルを取得できなくても、動画とリンクは表示したままにします。
    } finally {
      clearTimeout(timeout);
    }
  };

  const movieList = document.getElementById("youtubeMovies");
  if (!movieList) return;
  // 旧設定のyoutubeUrlも、複数URLの設定がなければ引き続き利用できます。
  const youtubeUrls = Array.isArray(config.youtubeUrls) && config.youtubeUrls.length
    ? config.youtubeUrls : [config.youtubeUrl];
  youtubeUrls.forEach((value) => {
    if (typeof value !== "string") return;
    let youtubeUrl = value.trim();
    if (!youtubeUrl || youtubeUrl.startsWith("PASTE_")) return;
    const isEmbedCode = youtubeUrl.startsWith("<");
    if (isEmbedCode) {
      // コード全体は挿入せず、読み込まれないtemplateからiframeのURLだけを取得します。
      const template = document.createElement("template");
      template.innerHTML = youtubeUrl;
      const frames = template.content.querySelectorAll("iframe");
      if (frames.length !== 1) return;
      youtubeUrl = frames[0].getAttribute("src") || "";
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(youtubeUrl);
    } catch (_) {
      return;
    }
    const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
    if (parsedUrl.protocol !== "https:" || !isYouTubeHost(host) || parsedUrl.username || parsedUrl.password) return;
    const videoId = getYouTubeVideoId(parsedUrl);
    if (videoId && !/^[0-9A-Za-z_-]{11}$/.test(videoId)) return;
    const isEmbedUrl = parsedUrl.pathname.startsWith("/embed/") && Boolean(videoId);
    if (isEmbedCode && !isEmbedUrl) return;

    const card = document.createElement("article");
    card.className = "movie-card";
    const heading = document.createElement("h3");
    heading.id = `youtube-title-${movieList.children.length + 1}`;
    card.setAttribute("aria-labelledby", heading.id);
    card.append(heading);

    let frame;
    if (videoId) {
      const videoWrap = document.createElement("div");
      videoWrap.className = "video-wrap";
      frame = document.createElement("iframe");
      frame.src = isEmbedUrl ? parsedUrl.href : `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
      frame.width = "560";
      frame.height = "315";
      frame.loading = "lazy";
      frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      frame.setAttribute("frameborder", "0");
      frame.setAttribute("allowfullscreen", "");
      videoWrap.append(frame);
      card.append(videoWrap);
    }

    const linkWrap = document.createElement("div");
    linkWrap.className = "center movie-link-wrap";
    const link = document.createElement("a");
    link.className = "button";
    link.href = isEmbedUrl
      ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}` : parsedUrl.href;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "YouTubeで見る";
    linkWrap.append(link);
    card.append(linkWrap);

    const setTitle = (title) => {
      heading.textContent = title;
      if (frame) frame.title = title;
      link.setAttribute("aria-label", `${title}をYouTubeで見る`);
    };
    setTitle(`動画 ${movieList.children.length + 1}`);
    movieList.append(card);
    if (videoId) loadYouTubeTitle(videoId, setTitle);
  });

  if (movieList.children.length) {
    movieList.hidden = false;
    document.getElementById("youtubeComingSoon").hidden = true;
    document.getElementById("youtubeNote").hidden = true;
  }
})();
