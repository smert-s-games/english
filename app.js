/* English Practice App */
(function () {
  "use strict";
  const STORAGE_KEY = "english-practice-v1";
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { learned: {}, streak: 0, lastVisit: null, quizzesDone: 0, theme: "light" };
  }
  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  let state = loadState();
  function updateStreak() {
    const today = new Date().toISOString().slice(0, 10);
    if (state.lastVisit === today) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (state.lastVisit === yesterday) state.streak = (state.streak || 0) + 1;
    else if (state.lastVisit !== today) state.streak = 1;
    state.lastVisit = today;
    saveState();
  }
  updateStreak();
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    state.theme = theme;
    saveState();
  }
  const savedTheme =
    state.theme ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(savedTheme);
  document.getElementById("theme-toggle").addEventListener("click", function () {
    applyTheme(state.theme === "dark" ? "light" : "dark");
  });
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }
  function pickN(arr, n) {
    return shuffle(arr).slice(0, Math.min(n, arr.length));
  }
  function getWordsByCat(cat) {
    if (!cat || cat === "all") return WORDS;
    return WORDS.filter(function (w) {
      return w.cat === cat;
    });
  }
  function isLearned(id) {
    return !!state.learned[id];
  }
  function markLearned(id, value) {
    if (value === undefined) value = true;
    if (value) state.learned[id] = true;
    else delete state.learned[id];
    saveState();
    updateStats();
  }
  function learnedCount() {
    return Object.keys(state.learned).length;
  }
  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }
  function uniqueDistractors(pool, correct, field, count) {
    var correctNorm = String(correct).trim().toLowerCase();
    var seen = {};
    seen[correctNorm] = true;
    var result = [];
    var candidates = shuffle(
      pool
        .map(function (w) {
          return w[field];
        })
        .filter(function (v) {
          var n = String(v).trim().toLowerCase();
          if (seen[n]) return false;
          seen[n] = true;
          return true;
        })
    );
    for (var i = 0; i < candidates.length && result.length < count; i++) {
      result.push(candidates[i]);
    }
    while (result.length < count) result.push("-");
    return result;
  }
  var views = document.querySelectorAll(".view");
  var navBtns = document.querySelectorAll(".nav-btn");
  function showView(name) {
    views.forEach(function (v) {
      v.classList.toggle("active", v.id === "view-" + name);
    });
    navBtns.forEach(function (b) {
      b.classList.toggle("active", b.dataset.view === name);
    });
    if (name === "words") renderWordsList();
    if (name === "flashcards") initFlashcards();
    if (name === "progress") renderProgress();
    if (name === "home") renderHome();
  }
  navBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      showView(btn.dataset.view);
    });
  });
  document.querySelectorAll("[data-go]").forEach(function (el) {
    el.addEventListener("click", function () {
      showView(el.dataset.go);
    });
  });
  function updateStats() {
    document.getElementById("stat-total").textContent = WORDS.length;
    document.getElementById("stat-learned").textContent = learnedCount();
    document.getElementById("stat-streak").textContent = state.streak || 0;
  }
  function renderHome() {
    updateStats();
    var grid = document.getElementById("home-categories");
    grid.innerHTML = "";
    Object.keys(CATEGORIES).forEach(function (key) {
      if (key === "all") return;
      var label = CATEGORIES[key];
      var count = WORDS.filter(function (w) {
        return w.cat === key;
      }).length;
      if (!count) return;
      var chip = document.createElement("button");
      chip.className = "cat-chip";
      chip.innerHTML = label + "<small>" + count + " слов</small>";
      chip.addEventListener("click", function () {
        document.getElementById("category-filter").value = key;
        showView("words");
        renderWordsList();
      });
      grid.appendChild(chip);
    });
  }
  function fillCategorySelects() {
    ["category-filter", "fc-category", "quiz-category"].forEach(function (id) {
      var sel = document.getElementById(id);
      if (!sel) return;
      while (sel.options.length > 1) sel.remove(1);
      Object.keys(CATEGORIES).forEach(function (key) {
        if (key === "all") return;
        var opt = document.createElement("option");
        opt.value = key;
        opt.textContent = CATEGORIES[key];
        sel.appendChild(opt);
      });
    });
  }
  function renderWordsList() {
    var cat = document.getElementById("category-filter").value;
    var q = (document.getElementById("word-search").value || "").trim().toLowerCase();
    var list = getWordsByCat(cat);
    if (q) {
      list = list.filter(function (w) {
        return (
          w.en.toLowerCase().indexOf(q) >= 0 ||
          w.ru.toLowerCase().indexOf(q) >= 0 ||
          (w.example && w.example.toLowerCase().indexOf(q) >= 0) ||
          (w.exampleRu && w.exampleRu.toLowerCase().indexOf(q) >= 0)
        );
      });
    }
    var container = document.getElementById("words-list");
    if (!list.length) {
      container.innerHTML =
        '<p class="muted" style="text-align:center;padding:24px">Ничего не найдено</p>';
      return;
    }
    container.innerHTML = list
      .map(function (w) {
        var ex = "";
        if (w.example) {
          ex =
            '<div class="word-example">' +
            escapeHtml(w.example) +
            (w.exampleRu
              ? '<br><span class="word-example-ru">' + escapeHtml(w.exampleRu) + "</span>"
              : "") +
            "</div>";
        }
        return (
          '<div class="word-item ' +
          (isLearned(w.id) ? "learned" : "") +
          '" data-id="' +
          w.id +
          '"><div><div class="word-en">' +
          escapeHtml(w.en) +
          '</div><div class="word-ru">' +
          escapeHtml(w.ru) +
          "</div>" +
          ex +
          '</div><span class="word-cat">' +
          (CATEGORIES[w.cat] || w.cat) +
          "</span></div>"
        );
      })
      .join("");
  }
  document.getElementById("category-filter").addEventListener("change", renderWordsList);
  document.getElementById("word-search").addEventListener("input", renderWordsList);
  var fcList = [];
  var fcIndex = 0;
  var fcFlipped = false;
  function initFlashcards() {
    fcList = shuffle(getWordsByCat(document.getElementById("fc-category").value));
    fcIndex = 0;
    fcFlipped = false;
    renderFlashcard();
  }
  function renderFlashcard() {
    var card = document.getElementById("flashcard");
    card.classList.remove("flipped");
    fcFlipped = false;
    if (!fcList.length) {
      document.getElementById("fc-word").textContent = "-";
      document.getElementById("fc-translation").textContent = "Нет слов";
      document.getElementById("fc-example").textContent = "";
      document.getElementById("fc-counter").textContent = "0 / 0";
      return;
    }
    var w = fcList[fcIndex];
    document.getElementById("fc-word").textContent = w.en;
    document.getElementById("fc-translation").textContent = w.ru;
    var ex = w.example || "";
    if (w.exampleRu) ex += (ex ? "\n" : "") + w.exampleRu;
    document.getElementById("fc-example").textContent = ex;
    document.getElementById("fc-counter").textContent = fcIndex + 1 + " / " + fcList.length;
  }
  document.getElementById("flashcard").addEventListener("click", function () {
    fcFlipped = !fcFlipped;
    document.getElementById("flashcard").classList.toggle("flipped", fcFlipped);
  });
  document.getElementById("fc-next").addEventListener("click", function () {
    if (!fcList.length) return;
    fcIndex = (fcIndex + 1) % fcList.length;
    renderFlashcard();
  });
  document.getElementById("fc-prev").addEventListener("click", function () {
    if (!fcList.length) return;
    fcIndex = (fcIndex - 1 + fcList.length) % fcList.length;
    renderFlashcard();
  });
  document.getElementById("fc-know").addEventListener("click", function () {
    if (!fcList.length) return;
    markLearned(fcList[fcIndex].id, true);
    fcList.splice(fcIndex, 1);
    if (fcIndex >= fcList.length) fcIndex = 0;
    renderFlashcard();
  });
  document.getElementById("fc-again").addEventListener("click", function () {
    if (!fcList.length) return;
    var w = fcList.splice(fcIndex, 1)[0];
    fcList.push(w);
    if (fcIndex >= fcList.length) fcIndex = 0;
    renderFlashcard();
  });
  document.getElementById("fc-category").addEventListener("change", initFlashcards);
  var quizType = null;
  var quizQuestions = [];
  var quizIndex = 0;
  var quizScore = 0;
  var quizAnswered = false;
  var quizMenu = document.getElementById("quiz-menu");
  var quizSetup = document.getElementById("quiz-setup");
  var quizArea = document.getElementById("quiz-area");
  var quizResult = document.getElementById("quiz-result");
  function hideAllQuiz() {
    quizMenu.classList.add("hidden");
    quizSetup.classList.add("hidden");
    quizArea.classList.add("hidden");
    quizResult.classList.add("hidden");
  }
  document.querySelectorAll(".quiz-type-card").forEach(function (btn) {
    btn.addEventListener("click", function () {
      quizType = btn.dataset.quiz;
      hideAllQuiz();
      quizSetup.classList.remove("hidden");
    });
  });
  document.getElementById("quiz-back-menu").addEventListener("click", function () {
    hideAllQuiz();
    quizMenu.classList.remove("hidden");
  });
  document.getElementById("quiz-start").addEventListener("click", startQuiz);
  function startQuiz() {
    var cat = document.getElementById("quiz-category").value;
    var count = parseInt(document.getElementById("quiz-count").value, 10) || 20;
    var pool = getWordsByCat(cat);
    if (quizType === "sentence") {
      quizQuestions = pickN(SENTENCES, count).map(function (s) {
        return { type: "sentence", text: s.text, correct: s.answer, options: s.options };
      });
    } else {
      quizQuestions = pickN(pool, count).map(function (w) {
        if (quizType === "en-ru") {
          var wrong = uniqueDistractors(pool, w.ru, "ru", 3);
          return {
            type: "choice",
            prompt: w.en,
            correct: w.ru,
            options: shuffle([w.ru].concat(wrong)),
            wordId: w.id,
          };
        }
        if (quizType === "ru-en") {
          var wrong2 = uniqueDistractors(pool, w.en, "en", 3);
          return {
            type: "choice",
            prompt: w.ru,
            correct: w.en,
            options: shuffle([w.en].concat(wrong2)),
            wordId: w.id,
          };
        }
        return { type: "type", prompt: w.ru, correct: w.en, wordId: w.id };
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
    var q = quizQuestions[quizIndex];
    var total = quizQuestions.length;
    document.getElementById("quiz-q-num").textContent = quizIndex + 1 + " / " + total;
    document.getElementById("quiz-score").textContent = quizScore + " правильных";
    document.getElementById("quiz-progress-fill").style.width = (quizIndex / total) * 100 + "%";
    document.getElementById("quiz-feedback").textContent = "";
    document.getElementById("quiz-feedback").className = "quiz-feedback";
    var optionsEl = document.getElementById("quiz-options");
    var inputWrap = document.getElementById("quiz-input-wrap");
    optionsEl.innerHTML = "";
    inputWrap.classList.add("hidden");
    if (q.type === "choice" || q.type === "sentence") {
      var prompt = q.type === "sentence" ? q.text.replace("___", "______") : q.prompt;
      document.getElementById("quiz-question").textContent = prompt;
      var opts = q.type === "sentence" ? shuffle(q.options.slice()) : q.options;
      opts.forEach(function (opt) {
        var btn = document.createElement("button");
        btn.className = "quiz-option";
        btn.textContent = opt;
        btn.addEventListener("click", function () {
          answerChoice(opt, q.correct, btn);
        });
        optionsEl.appendChild(btn);
      });
    } else {
      document.getElementById("quiz-question").textContent = q.prompt;
      inputWrap.classList.remove("hidden");
      var input = document.getElementById("quiz-input");
      input.value = "";
      input.focus();
    }
  }
  function answerChoice(selected, correct, btn) {
    if (quizAnswered) return;
    quizAnswered = true;
    document.querySelectorAll(".quiz-option").forEach(function (o) {
      o.disabled = true;
      if (o.textContent === correct) o.classList.add("correct");
    });
    var feedback = document.getElementById("quiz-feedback");
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
  document.getElementById("quiz-input").addEventListener("keydown", function (e) {
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
    var q = quizQuestions[quizIndex];
    var val = normalize(document.getElementById("quiz-input").value);
    if (!val) return;
    quizAnswered = true;
    var feedback = document.getElementById("quiz-feedback");
    if (val === normalize(q.correct)) {
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
    if (quizIndex >= quizQuestions.length) finishQuiz();
    else showQuestion();
  }
  function finishQuiz() {
    state.quizzesDone = (state.quizzesDone || 0) + 1;
    saveState();
    hideAllQuiz();
    quizResult.classList.remove("hidden");
    var total = quizQuestions.length;
    var pct = total ? Math.round((quizScore / total) * 100) : 0;
    document.getElementById("result-score").textContent = quizScore + " / " + total;
    document.getElementById("result-percent").textContent = pct + "%";
    var msg = "Продолжай в том же духе!";
    if (pct >= 90) msg = "Отлично! Ты почти готов к собеседованию.";
    else if (pct >= 70) msg = "Хороший результат. Ещё немного практики.";
    else if (pct >= 50) msg = "Неплохо. Повтори сложные слова.";
    else msg = "Не сдавайся. Карточки помогут.";
    document.getElementById("result-message").textContent = msg;
    document.getElementById("quiz-progress-fill").style.width = "100%";
  }
  document.getElementById("quiz-again").addEventListener("click", function () {
    hideAllQuiz();
    quizSetup.classList.remove("hidden");
  });
  document.getElementById("quiz-to-menu").addEventListener("click", function () {
    hideAllQuiz();
    quizMenu.classList.remove("hidden");
  });
  function renderProgress() {
    var learned = learnedCount();
    var total = WORDS.length;
    document.getElementById("prog-learned").textContent = learned;
    document.getElementById("prog-streak").textContent = state.streak || 0;
    document.getElementById("prog-quizzes").textContent = state.quizzesDone || 0;
    document.getElementById("prog-bar").style.width =
      (total ? Math.round((learned / total) * 100) : 0) + "%";
  }
  document.getElementById("reset-progress").addEventListener("click", function () {
    if (!confirm("Сбросить весь прогресс?")) return;
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
