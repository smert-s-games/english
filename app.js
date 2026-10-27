/* English Practice App - pure vanilla JS for GitHub Pages */

(function () {
  "use strict";

  // ---------- State & Storage ----------
  const STORAGE_KEY = "english-practice-v1";

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return {
      learned: {},
      streak: 0,
      lastVisit: null,
      quizzesDone: 0,
      theme: "light",
    };
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  let state = loadState();

  function updateStreak() {
    const today = new Date().toISOString().slice(0, 10);
    if (state.lastVisit === today) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (state.lastVisit === yesterday) {
      state.streak = (state.streak || 0) + 1;
    } else if (state.lastVisit !== today) {
      state.streak = 1;
    }
    state.lastVisit = today;
    saveState();
  }
  updateStreak();

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    state.theme = theme;
    saveState();
  }

  const savedTheme = state.theme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(savedTheme);

  document.getElementById("theme-toggle").addEventListener("click", () => {
    applyTheme(state.theme === "dark" ? "light" : "dark");
  });

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickN(arr, n) {
    return shuffle(arr).slice(0, Math.min(n, arr.length));
  }

  function getWordsByCat(cat) {
    if (!cat || cat === "all") return WORDS;
    return WORDS.filter((w) => w.cat === cat);
  }

  function isLearned(id) {
    return !!state.learned[id];
  }

  function markLearned(id, value = true) {
    if (value) state.learned[id] = true;
    else delete state.learned[id];
    saveState();
    updateStats();
  }

  function learnedCount() {
    return Object.keys(state.learned).length;
  }

  const views = document.querySelectorAll(".view");
  const navBtns = document.querySelectorAll(".nav-btn");

  function showView(name) {
    views.forEach((v) => v.classList.toggle("active", v.id === "view-" + name));
    navBtns.forEach((b) => b.classList.toggle("active", b.dataset.view === name));
    if (name === "words") renderWordsList();
    if (name === "flashcards") initFlashcards();
    if (name === "progress") renderProgress();
    if (name === "home") renderHome();
  }

  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.view));
  });

  document.querySelectorAll("[data-go]").forEach((el) => {
    el.addEventListener("click", () => showView(el.dataset.go));
  });

  function updateStats() {
    const total = WORDS.length;
    const learned = learnedCount();
    document.getElementById("stat-total").textContent = total;
    document.getElementById("stat-learned").textContent = learned;
    document.getElementById("stat-streak").textContent = state.streak || 0;
  }

  function renderHome() {
    updateStats();
    const grid = document.getElementById("home-categories");
    grid.innerHTML = "";
    Object.entries(CATEGORIES).forEach(([key, label]) => {
      if (key === "all") return;
      const count = WORDS.filter((w) => w.cat === key).length;
      const chip = document.createElement("button");
      chip.className = "cat-chip";
      chip.innerHTML = label + "<small>" + count + " слов</small>";
      chip.addEventListener("click", () => {
        document.getElementById("category-filter").value = key;
        showView("words");
        renderWordsList();
      });
      grid.appendChild(chip);
    });
  }

  function fillCategorySelects() {
    const selects = [
      document.getElementById("category-filter"),
      document.getElementById("fc-category"),
      document.getElementById("quiz-category"),
    ];
    selects.forEach((sel) => {
      if (!sel) return;
      while (sel.options.length > 1) sel.remove(1);
      Object.entries(CATEGORIES).forEach(([key, label]) => {
        if (key === "all") return;
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = label;
        sel.appendChild(opt);
      });
    });
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function renderWordsList() {
    const cat = document.getElementById("category-filter").value;
    const q = (document.getElementById("word-search").value || "").trim().toLowerCase();
    let list = getWordsByCat(cat);
    if (q) {
      list = list.filter(
        (w) =>
          w.en.toLowerCase().includes(q) ||
          w.ru.toLowerCase().includes(q) ||
          (w.example && w.example.toLowerCase().includes(q))
      );
    }
    const container = document.getElementById("words-list");
    if (!list.length) {
      container.innerHTML = '<p class="muted" style="text-align:center;padding:24px">Ничего не найдено</p>';
      return;
    }
    container.innerHTML = list
      .map(
        (w) =>
          '<div class="word-item ' +
          (isLearned(w.id) ? "learned" : "") +
          '" data-id="' +
          w.id +
          '">' +
          "<div>" +
          '<div class="word-en">' +
          escapeHtml(w.en) +
          "</div>" +
          '<div class="word-ru">' +
          escapeHtml(w.ru) +
          "</div>" +
          (w.example ? '<div class="word-example">' + escapeHtml(w.example) + "</div>" : "") +
          "</div>" +
          '<span class="word-cat">' +
          (CATEGORIES[w.cat] || w.cat) +
          "</span>" +
          "</div>"
      )
      .join("");
  }

  document.getElementById("category-filter").addEventListener("change", renderWordsList);
  document.getElementById("word-search").addEventListener("input", renderWordsList);

  let fcList = [];
  let fcIndex = 0;
  let fcFlipped = false;

  function initFlashcards() {
    const cat = document.getElementById("fc-category").value;
    fcList = shuffle(getWordsByCat(cat));
    fcIndex = 0;
    fcFlipped = false;
    renderFlashcard();
  }

  function renderFlashcard() {
    const card = document.getElementById("flashcard");
    card.classList.remove("flipped");
    fcFlipped = false;
    if (!fcList.length) {
      document.getElementById("fc-word").textContent = "-";
      document.getElementById("fc-translation").textContent = "Нет слов";
      document.getElementById("fc-example").textContent = "";
      document.getElementById("fc-counter").textContent = "0 / 0";
      return;
    }
    const w = fcList[fcIndex];
    document.getElementById("fc-word").textContent = w.en;
    document.getElementById("fc-translation").textContent = w.ru;
    document.getElementById("fc-example").textContent = w.example || "";
    document.getElementById("fc-counter").textContent = fcIndex + 1 + " / " + fcList.length;
  }

  document.getElementById("flashcard").addEventListener("click", () => {
    const card = document.getElementById("flashcard");
    fcFlipped = !fcFlipped;
    card.classList.toggle("flipped", fcFlipped);
  });

  document.getElementById("fc-next").addEventListener("click", () => {
    if (!fcList.length) return;
    fcIndex = (fcIndex + 1) % fcList.length;
    renderFlashcard();
  });

  document.getElementById("fc-prev").addEventListener("click", () => {
    if (!fcList.length) return;
    fcIndex = (fcIndex - 1 + fcList.length) % fcList.length;
    renderFlashcard();
  });

  document.getElementById("fc-know").addEventListener("click", () => {
    if (!fcList.length) return;
    markLearned(fcList[fcIndex].id, true);
    fcList.splice(fcIndex, 1);
    if (fcIndex >= fcList.length) fcIndex = 0;
    renderFlashcard();
  });

  document.getElementById("fc-again").addEventListener("click", () => {
    if (!fcList.length) return;
    const w = fcList.splice(fcIndex, 1)[0];
    fcList.push(w);
    if (fcIndex >= fcList.length) fcIndex = 0;
    renderFlashcard();
  });

  document.getElementById("fc-category").addEventListener("change", initFlashcards);

  let quizType = null;
  let quizQuestions = [];
  let quizIndex = 0;
  let quizScore = 0;
  let quizAnswered = false;

  const quizMenu = document.getElementById("quiz-menu");
  const quizSetup = document.getElementById("quiz-setup");
  const quizArea = document.getElementById("quiz-area");
  const quizResult = document.getElementById("quiz-result");

  function hideAllQuiz() {
    quizMenu.classList.add("hidden");
    quizSetup.classList.add("hidden");
    quizArea.classList.add("hidden");
    quizResult.classList.add("hidden");
  }

  document.querySelectorAll(".quiz-type-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      quizType = btn.dataset.quiz;
      hideAllQuiz();
      quizSetup.classList.remove("hidden");
    });
  });

  document.getElementById("quiz-back-menu").addEventListener("click", () => {
    hideAllQuiz();
    quizMenu.classList.remove("hidden");
  });

  document.getElementById("quiz-start").addEventListener("click", startQuiz);

  function startQuiz() {
    const cat = document.getElementById("quiz-category").value;
    const count = parseInt(document.getElementById("quiz-count").value, 10) || 20;
    const pool = getWordsByCat(cat);

    if (quizType === "sentence") {
      quizQuestions = pickN(SENTENCES, count).map((s) => ({ type: "sentence", ...s }));
    } else {
      const words = pickN(pool, count);
      quizQuestions = words.map((w) => {
        if (quizType === "en-ru") {
          const wrong = pickN(
            pool.filter((x) => x.id !== w.id).map((x) => x.ru),
            3
          );
          return {
            type: "choice",
            prompt: w.en,
            correct: w.ru,
            options: shuffle([w.ru, ...wrong]),
            wordId: w.id,
          };
        }
        if (quizType === "ru-en") {
          const wrong = pickN(
            pool.filter((x) => x.id !== w.id).map((x) => x.en),
            3
          );
          return {
            type: "choice",
            prompt: w.ru,
            correct: w.en,
            options: shuffle([w.en, ...wrong]),
            wordId: w.id,
          };
        }
        return {
          type: "type",
          prompt: w.ru,
          correct: w.en,
          wordId: w.id,
        };
      });
    }

    quizIndex = 0;
    quizScore = 0;
    quizAnswered = false;
    hideAllQuiz();
    quizArea.classList.remove("hidden");
    showQuestion();
  }

  function showQuestion() {
    quizAnswered = false;
    const q = quizQuestions[quizIndex];
    const total = quizQuestions.length;
    document.getElementById("quiz-q-num").textContent = quizIndex + 1 + " / " + total;
    document.getElementById("quiz-score").textContent = quizScore + " правильных";
    document.getElementById("quiz-progress-fill").style.width = (quizIndex / total) * 100 + "%";
    document.getElementById("quiz-feedback").textContent = "";
    document.getElementById("quiz-feedback").className = "quiz-feedback";

    const optionsEl = document.getElementById("quiz-options");
    const inputWrap = document.getElementById("quiz-input-wrap");
    optionsEl.innerHTML = "";
    inputWrap.classList.add("hidden");

    if (q.type === "choice" || q.type === "sentence") {
      const prompt = q.type === "sentence" ? q.text.replace("___", "______") : q.prompt;
      document.getElementById("quiz-question").textContent = prompt;
      const opts = q.type === "sentence" ? shuffle(q.options) : q.options;
      opts.forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "quiz-option";
        btn.textContent = opt;
        btn.addEventListener("click", () => answerChoice(opt, q.correct, btn));
        optionsEl.appendChild(btn);
      });
    } else {
      document.getElementById("quiz-question").textContent = q.prompt;
      inputWrap.classList.remove("hidden");
      const input = document.getElementById("quiz-input");
      input.value = "";
      input.focus();
    }
  }

  function answerChoice(selected, correct, btn) {
    if (quizAnswered) return;
    quizAnswered = true;
    const options = document.querySelectorAll(".quiz-option");
    options.forEach((o) => {
      o.disabled = true;
      if (o.textContent === correct) o.classList.add("correct");
    });
    const feedback = document.getElementById("quiz-feedback");
    if (selected === correct) {
      quizScore++;
      feedback.textContent = "Верно!";
      feedback.className = "quiz-feedback correct";
      if (quizQuestions[quizIndex].wordId) markLearned(quizQuestions[quizIndex].wordId, true);
    } else {
      if (btn) btn.classList.add("wrong");
      feedback.textContent = "Неверно. Правильно: " + correct;
      feedback.className = "quiz-feedback wrong";
    }
    setTimeout(nextQuestion, 900);
  }

  document.getElementById("quiz-check").addEventListener("click", checkTyped);
  document.getElementById("quiz-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") checkTyped();
  });

  function normalize(s) {
    return String(s)
      .trim()
      .toLowerCase()
      .replace(/[\u2019']/g, "'");
  }

  function checkTyped() {
    if (quizAnswered) return;
    const q = quizQuestions[quizIndex];
    const input = document.getElementById("quiz-input");
    const val = normalize(input.value);
    if (!val) return;
    quizAnswered = true;
    const correct = normalize(q.correct);
    const feedback = document.getElementById("quiz-feedback");
    const ok = val === correct || val === correct.replace(/\s+/g, " ");
    if (ok) {
      quizScore++;
      feedback.textContent = "Верно!";
      feedback.className = "quiz-feedback correct";
      if (q.wordId) markLearned(q.wordId, true);
    } else {
      feedback.textContent = "Неверно. Правильно: " + q.correct;
      feedback.className = "quiz-feedback wrong";
    }
    setTimeout(nextQuestion, 1100);
  }

  function nextQuestion() {
    quizIndex++;
    if (quizIndex >= quizQuestions.length) {
      finishQuiz();
    } else {
      showQuestion();
    }
  }

  function finishQuiz() {
    state.quizzesDone = (state.quizzesDone || 0) + 1;
    saveState();
    hideAllQuiz();
    quizResult.classList.remove("hidden");
    const total = quizQuestions.length;
    const pct = total ? Math.round((quizScore / total) * 100) : 0;
    document.getElementById("result-score").textContent = quizScore + " / " + total;
    document.getElementById("result-percent").textContent = pct + "%";
    let msg = "Продолжай в том же духе!";
    if (pct >= 90) msg = "Отлично! Ты почти готов к собеседованию.";
    else if (pct >= 70) msg = "Хороший результат. Ещё немного практики — и будет супер.";
    else if (pct >= 50) msg = "Неплохо. Повтори слова, которые дались сложно.";
    else msg = "Не сдавайся. Карточки и повтор — лучшие друзья.";
    document.getElementById("result-message").textContent = msg;
    document.getElementById("quiz-progress-fill").style.width = "100%";
  }

  document.getElementById("quiz-again").addEventListener("click", () => {
    hideAllQuiz();
    quizSetup.classList.remove("hidden");
  });

  document.getElementById("quiz-to-menu").addEventListener("click", () => {
    hideAllQuiz();
    quizMenu.classList.remove("hidden");
  });

  function renderProgress() {
    const learned = learnedCount();
    const total = WORDS.length;
    document.getElementById("prog-learned").textContent = learned;
    document.getElementById("prog-streak").textContent = state.streak || 0;
    document.getElementById("prog-quizzes").textContent = state.quizzesDone || 0;
    const pct = total ? Math.round((learned / total) * 100) : 0;
    document.getElementById("prog-bar").style.width = pct + "%";
  }

  document.getElementById("reset-progress").addEventListener("click", () => {
    if (!confirm("Сбросить весь прогресс (изученные слова, серию и тесты)?")) return;
    state.learned = {};
    state.streak = 0;
    state.quizzesDone = 0;
    state.lastVisit = null;
    saveState();
    updateStreak();
    updateStats();
    renderProgress();
  });

  fillCategorySelects();
  updateStats();
  renderHome();
  showView("home");
})();
