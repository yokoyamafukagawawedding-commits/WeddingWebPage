(() => {
  const config = window.WEDDING_CONFIG || {};
  const colors = Array.isArray(config.colors) ? config.colors : [];
  const grid = document.getElementById("colorGrid");
  const menu = document.getElementById("lightMenu");
  const screen = document.getElementById("colorScreen");
  const lastButton = document.getElementById("lastColorButton");

  let activeColor = null;

  const requestFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (_) {}
  };

  const showColor = async (color) => {
    activeColor = color;
    localStorage.setItem("weddingSelectedColor", JSON.stringify(color));
    screen.style.background = color.value;
    screen.querySelector(".color-screen__hint").style.color = color.text || "#fff";
    menu.hidden = true;
    screen.hidden = false;
    document.querySelector('meta[name="theme-color"]').setAttribute("content", color.value);
    await requestFullscreen();
  };

  const showMenu = () => {
    screen.hidden = true;
    menu.hidden = false;
    document.querySelector('meta[name="theme-color"]').setAttribute("content", "#111111");
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };

  colors.forEach((color) => {
    const button = document.createElement("button");
    button.className = "color-button";
    button.type = "button";
    button.textContent = color.name;
    button.style.background = color.value;
    button.style.color = color.text || "#fff";
    button.addEventListener("click", () => showColor(color));
    grid.appendChild(button);
  });

  try {
    const saved = JSON.parse(localStorage.getItem("weddingSelectedColor"));
    if (saved && saved.name && saved.value) {
      lastButton.hidden = false;
      lastButton.textContent = `前回の色（${saved.name}）を表示`;
      lastButton.addEventListener("click", () => showColor(saved));
    }
  } catch (_) {}

  screen.addEventListener("click", showMenu);
  screen.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") showMenu();
  });
})();
