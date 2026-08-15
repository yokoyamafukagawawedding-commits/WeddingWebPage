(() => {
  const config = window.WEDDING_CONFIG || {};
  const colors = Array.isArray(config.colors) ? config.colors : [];
  const grid = document.getElementById("colorGrid");
  const menu = document.getElementById("lightMenu");
  const screen = document.getElementById("colorScreen");
  const lastButton = document.getElementById("lastColorButton");
  const myAnswerToggle = document.getElementById("myAnswerToggle");
  const myAnswer = document.getElementById("myAnswerContent");
  const sideSelect = document.getElementById("sideSelect");
  const nameSelect = document.getElementById("nameSelect");
  const refreshAnswersButton = document.getElementById("refreshAnswersButtonSecondary");
  const answerStatus = document.getElementById("answerStatus");
  const myAnswerResult = document.getElementById("myAnswerResult");
  const ANSWER_SELECTION_KEY = "weddingAnswerSelection";
  const ANSWERS_CACHE_KEY = "weddingGuestResponsesV1";

  let activeColor = null;
  let responses = [];

  const loadAnswerSelection = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(ANSWER_SELECTION_KEY));
      return {
        side: String(saved?.side || ""),
        name: String(saved?.name || ""),
      };
    } catch (_) {
      return { side: "", name: "" };
    }
  };

  const saveAnswerSelection = () => {
    localStorage.setItem(ANSWER_SELECTION_KEY, JSON.stringify({
      side: sideSelect.value,
      name: nameSelect.value,
    }));
  };

  const loadAnswersCache = () => {
    try {
      const cached = JSON.parse(localStorage.getItem(ANSWERS_CACHE_KEY));
      return cached && Array.isArray(cached.responses) ? cached : null;
    } catch (_) {
      localStorage.removeItem(ANSWERS_CACHE_KEY);
      return null;
    }
  };

  const saveAnswersCache = (items) => {
    localStorage.setItem(ANSWERS_CACHE_KEY, JSON.stringify({
      responses: items,
      savedAt: new Date().toISOString(),
    }));
  };

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

  const showAnswerStatus = (message, type = "") => {
    answerStatus.textContent = message;
    answerStatus.className = `answer-status ${type}`.trim();
  };

  const fetchJsonp = (url) => new Promise((resolve, reject) => {
    const callback = `weddingLightCallback_${Date.now()}_${Math.floor(Math.random() * 1e5)}`;
    const script = document.createElement("script");
    let finished = false;
    const cleanup = () => {
      script.remove();
      delete window[callback];
    };
    const timeout = setTimeout(() => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(new Error("回答取得がタイムアウトしました。"));
    }, 20000);

    window[callback] = (payload) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      cleanup();
      resolve(payload);
    };
    script.onerror = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      cleanup();
      reject(new Error("回答データを取得できませんでした。"));
    };
    script.src = `${url}${url.includes("?") ? "&" : "?"}action=responses&callback=${encodeURIComponent(callback)}&_=${Date.now()}`;
    document.head.appendChild(script);
  });

  const resetResult = () => {
    myAnswerResult.hidden = true;
    myAnswerResult.textContent = "";
  };

  const showLoadingResult = () => {
    myAnswerResult.textContent = "";
    const label = document.createElement("p");
    label.textContent = "あなたが投票した色";
    const value = document.createElement("strong");
    value.className = "my-answer__loading";
    value.textContent = "取得中…";
    myAnswerResult.append(label, value);
    myAnswerResult.hidden = false;
  };

  const showFailedResult = () => {
    resetResult();
    const value = document.createElement("strong");
    value.className = "my-answer__loading";
    value.textContent = "取得失敗";
    myAnswerResult.appendChild(value);
    myAnswerResult.hidden = false;
  };

  const normalizeResponses = (items) => items.map((response) => ({
    side: String(response?.side || "").trim(),
    name: String(response?.name || "").trim(),
    answer: String(response?.answer || "").trim(),
  })).filter((response) => response.side && response.name && response.answer);

  const applyAnswers = (items, selection, fromCache = false) => {
    responses = normalizeResponses(items);
    sideSelect.value = selection.side;
    populateSides();
    populateNames(selection.name);
    if (sideSelect.value && nameSelect.value) {
      saveAnswerSelection();
      showMyAnswer();
      showAnswerStatus(fromCache
        ? "保存済みの回答を表示しています。最新情報は更新ボタンで取得できます。"
        : "回答を表示しています。", "success");
    } else {
      showAnswerStatus(fromCache
        ? "保存済みデータを読み込みました。招待者と名前を選んでください。"
        : "招待者と名前を選んでください。", "success");
    }
  };

  const populateSides = () => {
    sideSelect.disabled = false;
  };

  const populateNames = (selectedName = "") => {
    const side = sideSelect.value;
    nameSelect.innerHTML = '<option value="">選択してください</option>';
    resetResult();
    if (!side) {
      nameSelect.innerHTML = '<option value="">先に招待者を選択してください</option>';
      nameSelect.disabled = true;
      return;
    }
    responses.filter((response) => response.side === side)
      .sort((a, b) => a.name.localeCompare(b.name, "ja"))
      .forEach((response) => nameSelect.add(new Option(response.name, response.name)));
    nameSelect.disabled = false;
    if (selectedName && [...nameSelect.options].some((option) => option.value === selectedName)) {
      nameSelect.value = selectedName;
    }
  };

  const showMyAnswer = () => {
    const response = responses.find((item) => item.side === sideSelect.value && item.name === nameSelect.value);
    resetResult();
    if (!response) return;
    const color = colors.find((item) => item.name === response.answer);
    const label = document.createElement("p");
    label.textContent = "あなたが投票した色";
    const value = document.createElement("strong");
    value.textContent = response.answer;
    if (color) {
      value.style.background = color.value;
      value.style.color = color.text || "#fff";
    }
    myAnswerResult.append(label, value);
    myAnswerResult.hidden = false;
  };

  const fetchAnswers = async () => {
    const url = String(config.gasWebAppUrl || "");
    const savedSelection = loadAnswerSelection();
    const selection = {
      side: sideSelect.value || savedSelection.side,
      name: nameSelect.value || savedSelection.name,
    };
    if (!url || url.startsWith("PASTE_")) {
      showAnswerStatus("回答データの接続先が設定されていません。", "error");
      showFailedResult();
      return;
    }
    refreshAnswersButton.disabled = true;
    showAnswerStatus("回答データを取得しています。");
    showLoadingResult();
    try {
      const payload = await fetchJsonp(url);
      if (!payload?.success || !Array.isArray(payload.responses)) {
        throw new Error(payload?.error || "回答データの形式が正しくありません。");
      }
      const normalized = normalizeResponses(payload.responses);
      saveAnswersCache(normalized);
      applyAnswers(normalized, selection);
    } catch (error) {
      showAnswerStatus(error.message || "回答データを取得できませんでした。", "error");
      showFailedResult();
    } finally {
      refreshAnswersButton.disabled = false;
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
  const savedAnswerSelection = loadAnswerSelection();
  if (savedAnswerSelection.side) sideSelect.value = savedAnswerSelection.side;

  sideSelect.addEventListener("change", () => {
    populateNames();
    saveAnswerSelection();
  });
  nameSelect.addEventListener("change", () => {
    saveAnswerSelection();
    showMyAnswer();
  });
  refreshAnswersButton.addEventListener("click", fetchAnswers);
  myAnswerToggle.addEventListener("click", () => {
    const willOpen = myAnswer.hidden;
    myAnswer.hidden = !willOpen;
    myAnswerToggle.setAttribute("aria-expanded", String(willOpen));
  });
  const cachedAnswers = loadAnswersCache();
  if (cachedAnswers) {
    applyAnswers(cachedAnswers.responses, savedAnswerSelection, true);
  } else {
    fetchAnswers();
  }
})();
