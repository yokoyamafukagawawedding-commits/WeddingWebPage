(() => {
  "use strict";

  const config = window.WEDDING_CONFIG || {};
  const CACHE_KEY = "weddingAdminDataV2";
  const GROOM_SIDE = config.groomSideLabel || "新郎側";
  const BRIDE_SIDE = config.brideSideLabel || "新婦側";

  const state = {
    payload: null,
    responses: [],
    correctColor: "",
  };

  const elements = {
    adminKey: document.getElementById("adminKey"),
    fetchButton: document.getElementById("fetchButton"),
    statusMessage: document.getElementById("statusMessage"),
    dataBadge: document.getElementById("dataBadge"),
    dashboard: document.getElementById("dashboard"),
    rawCount: document.getElementById("rawCount"),
    uniqueCount: document.getElementById("uniqueCount"),
    duplicateCount: document.getElementById("duplicateCount"),
    fetchedAt: document.getElementById("fetchedAt"),
    voteChart: document.getElementById("voteChart"),
    correctColorButtons: document.getElementById("correctColorButtons"),
    eligibleBadge: document.getElementById("eligibleBadge"),
    drawButton: document.getElementById("drawButton"),
    drawStage: document.getElementById("drawStage"),
    responseTableBody: document.getElementById("responseTableBody"),
  };

  function showStatus(message, type = "") {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = `status-message ${type}`.trim();
  }

  function getColors() {
    const colors = Array.isArray(config.colors) ? config.colors.slice() : [];
    const responseColors = state.payload?.colors || [];
    responseColors.forEach((name) => {
      if (!colors.some((color) => color.name === name)) {
        colors.push({ name, value: "#9a8f89", text: "#fff" });
      }
    });
    return colors;
  }

  function getColor(name) {
    return getColors().find((color) => color.name === name) || {
      name,
      value: "#9a8f89",
      text: "#fff",
    };
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  }

  function normalizePayload(payload) {
    if (!payload || payload.success === false || !Array.isArray(payload.responses)) {
      throw new Error(payload?.error || "回答データの形式が正しくありません。");
    }

    const responses = payload.responses
      .map((response) => ({
        side: String(response.side || "").trim(),
        name: String(response.name || "").trim(),
        answer: String(response.answer || response.color || "").trim(),
        timestamp: response.timestamp || response.submittedAt || "",
      }))
      .filter((response) => response.side && response.name && response.answer);

    return {
      ...payload,
      success: true,
      responses,
      rawCount: Number(payload.rawCount) || responses.length,
      uniqueCount: responses.length,
      duplicateCount: Number(payload.duplicateCount) || 0,
      fetchedAt: payload.fetchedAt || new Date().toISOString(),
    };
  }

  function applyPayload(payload, label, saveToCache = true) {
    const data = normalizePayload(payload);
    state.payload = data;
    state.responses = data.responses;
    state.correctColor = "";

    if (saveToCache) localStorage.setItem(CACHE_KEY, JSON.stringify(data));

    render();
    elements.dataBadge.textContent = label;
    elements.dataBadge.className = "status-badge success";
    showStatus(`${data.responses.length}名分の最新回答を読み込みました。`, "success");
  }

  function render() {
    if (!state.payload) return;

    elements.dashboard.hidden = false;
    elements.rawCount.textContent = state.payload.rawCount;
    elements.uniqueCount.textContent = state.responses.length;
    elements.duplicateCount.textContent = state.payload.duplicateCount;
    elements.fetchedAt.textContent = formatDate(state.payload.fetchedAt);

    renderChart();
    renderColorButtons();
    renderResponseTable();
    updateDrawButton();
  }

  function renderChart() {
    const counts = new Map();
    getColors().forEach((color) => counts.set(color.name, 0));
    state.responses.forEach((response) => {
      counts.set(response.answer, (counts.get(response.answer) || 0) + 1);
    });

    const maxCount = Math.max(1, ...counts.values());
    elements.voteChart.innerHTML = "";
    counts.forEach((count, name) => {
      const color = getColor(name);
      const row = document.createElement("div");
      row.className = "vote-row";
      row.innerHTML =
        '<span class="vote-label"></span><div class="vote-track"><div class="vote-bar"></div></div><span class="vote-number"></span>';
      row.querySelector(".vote-label").textContent = name;
      row.querySelector(".vote-bar").style.width = `${(count / maxCount) * 100}%`;
      row.querySelector(".vote-bar").style.background = color.value;
      row.querySelector(".vote-number").textContent = `${count}票`;
      elements.voteChart.appendChild(row);
    });
  }

  function renderColorButtons() {
    elements.correctColorButtons.innerHTML = "";
    getColors().forEach((color) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className =
        "correct-color-button" +
        (state.correctColor === color.name ? " selected" : "");
      button.textContent = color.name;
      button.style.background = color.value;
      button.style.color = color.text || "#fff";
      button.onclick = () => {
        state.correctColor = color.name;
        elements.drawStage.innerHTML = `<p>${color.name}の正解者から抽選します</p>`;
        renderColorButtons();
        updateDrawButton();
      };
      elements.correctColorButtons.appendChild(button);
    });
  }

  function renderResponseTable() {
    elements.responseTableBody.innerHTML = "";
    state.responses
      .slice()
      .sort(
        (a, b) =>
          a.side.localeCompare(b.side, "ja") || a.name.localeCompare(b.name, "ja"),
      )
      .forEach((response) => {
        const row = document.createElement("tr");
        [
          response.side,
          response.name,
          response.answer,
          formatDate(response.timestamp),
        ].forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.appendChild(cell);
        });
        elements.responseTableBody.appendChild(row);
      });
  }

  function eligibleResponses(side) {
    return state.responses.filter(
      (response) => response.side === side && response.answer === state.correctColor,
    );
  }

  function updateDrawButton() {
    const groomCount = eligibleResponses(GROOM_SIDE).length;
    const brideCount = eligibleResponses(BRIDE_SIDE).length;
    elements.eligibleBadge.textContent = `${GROOM_SIDE} ${groomCount}名 / ${BRIDE_SIDE} ${brideCount}名`;
    elements.eligibleBadge.className = `status-badge ${groomCount && brideCount ? "success" : "warning"}`;
    elements.drawButton.disabled = !state.correctColor || !groomCount || !brideCount;
  }

  function randomIndex(max) {
    if (window.crypto?.getRandomValues) {
      const values = new Uint32Array(1);
      window.crypto.getRandomValues(values);
      return values[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  function chooseOne(responses) {
    return responses[randomIndex(responses.length)];
  }

  async function draw() {
    const groomCandidates = eligibleResponses(GROOM_SIDE);
    const brideCandidates = eligibleResponses(BRIDE_SIDE);
    if (!groomCandidates.length || !brideCandidates.length) {
      showStatus("新郎側・新婦側の両方に正解者が必要です。", "error");
      return;
    }

    elements.drawButton.disabled = true;
    elements.drawStage.innerHTML = '<div class="rolling-name">抽選中…</div>';
    const rollingName = elements.drawStage.querySelector(".rolling-name");

    await new Promise((resolve) => {
      let count = 0;
      const timer = setInterval(() => {
        const candidates = count % 2 ? groomCandidates : brideCandidates;
        rollingName.textContent = chooseOne(candidates).name;
        count += 1;
        if (count >= 24) {
          clearInterval(timer);
          resolve();
        }
      }, 65);
    });

    const groomWinner = chooseOne(groomCandidates);
    const brideWinner = chooseOne(brideCandidates);
    elements.drawStage.innerHTML = `
      <div class="winner-title">WINNERS</div>
      <div class="winner-name">${GROOM_SIDE}：${groomWinner.name} さん</div>
      <div class="winner-name">${BRIDE_SIDE}：${brideWinner.name} さん</div>
    `;
    updateDrawButton();
  }

  function fetchJsonp(url, key) {
    return new Promise((resolve, reject) => {
      const callback = `weddingAdminCallback_${Date.now()}_${Math.floor(Math.random() * 1e5)}`;
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
        reject(new Error("回答取得がタイムアウトしました。Apps Script URLを確認してください。"));
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
        reject(new Error("Apps Scriptへ接続できませんでした。デプロイ設定を確認してください。"));
      };
      script.src = `${url}${url.includes("?") ? "&" : "?"}action=responses&key=${encodeURIComponent(key)}&callback=${encodeURIComponent(callback)}&_=${Date.now()}`;
      document.head.appendChild(script);
    });
  }

  async function fetchLatest() {
    const url = String(config.gasWebAppUrl || "");
    const key = elements.adminKey.value.trim();
    if (!url || url.startsWith("PASTE_")) {
      showStatus("config.jsにApps ScriptのWebアプリURLを設定してください。", "error");
      return;
    }
    if (!key) {
      showStatus("管理者パスコードを入力してください。", "error");
      return;
    }

    elements.fetchButton.disabled = true;
    elements.fetchButton.textContent = "取得中…";
    showStatus("Googleフォームの最新回答を取得しています。");
    try {
      const payload = await fetchJsonp(url, key);
      applyPayload(payload, "最新データ");
    } catch (error) {
      showStatus(error.message || "回答取得に失敗しました。", "error");
    } finally {
      elements.fetchButton.disabled = false;
      elements.fetchButton.textContent = "最新回答を取得";
    }
  }

  elements.fetchButton.onclick = fetchLatest;
  elements.adminKey.onkeydown = (event) => {
    if (event.key === "Enter") fetchLatest();
  };
  elements.drawButton.onclick = draw;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      applyPayload(JSON.parse(cached), "端末保存", false);
      showStatus("前回取得したデータを端末から読み込みました。", "success");
    }
  } catch {
    localStorage.removeItem(CACHE_KEY);
  }
})();
