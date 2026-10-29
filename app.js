/* English Practice App v7 — learned filter, quiz feedback, history */
(function () {
  "use strict";

  const STORAGE_KEY = "english-practice-v1";

  var QUIZ_TYPE_LABELS = {
    "en-ru": "EN → RU",
    "ru-en": "RU → EN",
    type: "Напиши слово",
    sentence: "Предложения",
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (!s.favorites) s.favorites = {};
        if (!s.quizHistory) s.quizHistory = [];
        return s;
      }
    } catch (_) {}
    return {
      learned: {},
      favorites: {},
      streak: 0,
      lastVisit: null,
      quizzesDone: 0,
      theme: "light",
      quizHistory: [],
    };
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (window.EnglishAuth && EnglishAuth.scheduleCloudSave) EnglishAuth.scheduleCloudSave();
  }

  var state = loadState();

  function updateStreak() {
    var today = new Date().toISOString().slice(0, 10);
    if (state.lastVisit === today) return;
    var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
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

  var savedTheme =
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

  function getWordsFiltered(opts) {
    opts = opts || {};
    var list = WORDS;
    if (opts.chapter && opts.chapter !== "all") {
      var ch = parseInt(opts.chapter, 10);
      list = list.filter(function (w) { return w.chapter === ch; });
    }
    if (opts.cat && opts.cat !== "all") {
      list = list.filter(function (w) { return w.cat === opts.cat; });
    }
    if (opts.pos && opts.pos !== "all") {
      list = list.filter(function (w) { return w.pos === opts.pos; });
    }
    if (opts.favoritesOnly) {
      list = list.filter(function (w) { return !!state.favorites[w.id]; });
    }
    if (opts.learned === "learned") {
      list = list.filter(function (w) { return isLearned(w.id); });
    } else if (opts.learned === "unlearned") {
      list = list.filter(function (w) { return !isLearned(w.id); });
    }
    return list;
  }

  function isLearned(id) { return !!state.learned[id]; }

  function markLearned(id, value) {
    if (value === undefined) value = true;
    if (value) state.learned[id] = true;
    else delete state.learned[id];
    saveState();
    updateStats();
  }

  function isFavorite(id) { return !!state.favorites[id]; }

  function toggleFavorite(id) {
    if (state.favorites[id]) delete state.favorites[id];
    else state.favorites[id] = true;
    saveState();
    updateStats();
  }

  function learnedCount() { return Object.keys(state.learned).length; }
  function favCount() { return Object.keys(state.favorites).length; }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function uniqueDistractors(pool, correct, field, count) {
    var correctNorm = String(correct).trim().toLowerCase();
    var seen = {};
    seen[correctNorm] = true;
    var result = [];
    var candidates = shuffle(
      pool.map(function (w) { return w[field]; }).filter(function (v) {
        var n = String(v).trim().toLowerCase();
        if (seen[n]) return false;
        seen[n] = true;
        return true;
      })
    );
    for (var i = 0; i < candidates.length && result.length < count; i++) result.push(candidates[i]);
    while (result.length < count) result.push("—");
    return result;
  }

  function formatDate(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleString("ru-RU", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch (_) { return iso || ""; }
  }

  var views = document.querySelectorAll(".view");
  var navBtns = document.querySelectorAll(".nav-btn");

  function showView(name) {
    views.forEach(function (v) { v.classList.toggle("active", v.id === "view-" + name); });
    navBtns.forEach(function (b) { b.classList.toggle("active", b.dataset.view === name); });
    if (name === "words") renderWordsList();
    if (name === "flashcards") initFlashcards();
    if (name === "favorites") renderFavorites();
    if (name === "progress") renderProgress();
    if (name === "home") renderHome();
    if (name === "chapters") renderChapters();
  }

  navBtns.forEach(function (btn) {
    btn.addEventListener("click", function () { showView(btn.dataset.view); });
  });
  document.querySelectorAll("[data-go]").forEach(function (el) {
    el.addEventListener("click", function () { showView(el.dataset.go); });
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
      var count = WORDS.filter(function (w) { return w.cat === key; }).length;
      if (!count) return;
      var chip = document.createElement("button");
      chip.className = "cat-chip";
      chip.innerHTML = label + "<small>" + count + " слов</small>";
      chip.addEventListener("click", function () {
        document.getElementById("category-filter").value = key;
        document.getElementById("chapter-filter").value = "all";
        document.getElementById("pos-filter").value = "all";
        document.getElementById("learned-filter").value = "all";
        showView("words");
        renderWordsList();
      });
      grid.appendChild(chip);
    });
  }

  function renderChapters() {
    var grid = document.getElementById("chapters-grid");
    grid.innerHTML = "";
    [1, 2, 3].forEach(function (ch) {
      var list = WORDS.filter(function (w) { return w.chapter === ch; });
      var learned = list.filter(function (w) { return isLearned(w.id); }).length;
      var pct = list.length ? Math.round((learned / list.length) * 100) : 0;
      var btn = document.createElement("button");
      btn.className = "chapter-card";
      btn.innerHTML =
        "<h3>" + (CHAPTERS[ch] || "Глава " + ch) + "</h3>" +
        '<div class="chapter-meta">' + list.length + " слов · изучено " + learned + " (" + pct + "%)</div>" +
        '<div class="chapter-bar-wrap"><div class="chapter-bar" style="width:' + pct + '%"></div></div>';
      btn.addEventListener("click", function () {
        document.getElementById("fc-chapter").value = String(ch);
        showView("flashcards");
        initFlashcards();
      });
      grid.appendChild(btn);
    });
  }

  function fillSelects() {
    function fillChapter(id) {
      var sel = document.getElementById(id);
      if (!sel) return;
      while (sel.options.length > 1) sel.remove(1);
      [1, 2, 3].forEach(function (ch) {
        var opt = document.createElement("option");
        opt.value = String(ch);
        opt.textContent = CHAPTERS[ch] || "Глава " + ch;
        sel.appendChild(opt);
      });
    }
    fillChapter("chapter-filter");
    fillChapter("fc-chapter");
    fillChapter("quiz-chapter");
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
    var posSel = document.getElementById("pos-filter");
    if (posSel) {
      while (posSel.options.length > 1) posSel.remove(1);
      Object.keys(POS_LABELS).forEach(function (key) {
        var opt = document.createElement("option");
        opt.value = key;
        opt.textContent = POS_LABELS[key];
        posSel.appendChild(opt);
      });
    }
  }

  function wordItemHtml(w) {
    var ex = "";
    if (w.example) {
      ex = '<div class="word-example">' + escapeHtml(w.example) +
        (w.exampleRu ? '<span class="word-example-ru">' + escapeHtml(w.exampleRu) + "</span>" : "") + "</div>";
    }
    var favActive = isFavorite(w.id) ? " active" : "";
    var star = isFavorite(w.id) ? "★" : "☆";
    return (
      '<div class="word-item ' + (isLearned(w.id) ? "learned" : "") + '" data-id="' + w.id + '">' +
      "<div><div class=\"word-en\">" + escapeHtml(w.en) + '</div><div class="word-tr">' +
      escapeHtml(w.tr || "") + '</div><div class="word-ru">' + escapeHtml(w.ru) + "</div>" + ex +
      '</div><div class="word-meta"><button class="word-fav-btn' + favActive + '" data-fav="' + w.id +
      '" title="Избранное">' + star + '</button><span class="word-pos">' +
      escapeHtml(POS_LABELS[w.pos] || w.pos || "") + '</span><span class="word-cat">' +
      escapeHtml(CATEGORIES[w.cat] || w.cat) + "</span></div></div>"
    );
  }

  function bindFavButtons(container) {
    container.querySelectorAll("[data-fav]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var id = parseInt(btn.getAttribute("data-fav"), 10);
        toggleFavorite(id);
        var active = isFavorite(id);
        btn.classList.toggle("active", active);
        btn.textContent = active ? "★" : "☆";
      });
    });
  }

  function renderWordsList() {
    var list = getWordsFiltered({
      chapter: document.getElementById("chapter-filter").value,
      cat: document.getElementById("category-filter").value,
      pos: document.getElementById("pos-filter").value,
      learned: document.getElementById("learned-filter").value,
    });
    var q = (document.getElementById("word-search").value || "").trim().toLowerCase();
    if (q) {
      list = list.filter(function (w) {
        return (
          w.en.toLowerCase().indexOf(q) >= 0 || w.ru.toLowerCase().indexOf(q) >= 0 ||
          (w.tr && w.tr.toLowerCase().indexOf(q) >= 0) ||
          (w.example && w.example.toLowerCase().indexOf(q) >= 0) ||
          (w.exampleRu && w.exampleRu.toLowerCase().indexOf(q) >= 0)
        );
      });
    }
    var container = document.getElementById("words-list");
    if (!list.length) {
      container.innerHTML = '<p class="muted" style="text-align:center;padding:24px">Ничего не найдено</p>';
      return;
    }
    container.innerHTML = list.map(wordItemHtml).join("");
    bindFavButtons(container);
  }

  document.getElementById("chapter-filter").addEventListener("change", renderWordsList);
  document.getElementById("category-filter").addEventListener("change", renderWordsList);
  document.getElementById("pos-filter").addEventListener("change", renderWordsList);
  document.getElementById("learned-filter").addEventListener("change", renderWordsList);
  document.getElementById("word-search").addEventListener("input", renderWordsList);

  function renderFavorites() {
    var list = getWordsFiltered({ favoritesOnly: true });
    var empty = document.getElementById("fav-empty");
    var container = document.getElementById("favorites-list");
    if (!list.length) {
      empty.style.display = "block";
      container.innerHTML = "";
      return;
    }
    empty.style.display = "none";
    container.innerHTML = list.map(wordItemHtml).join("");
    bindFavButtons(container);
  }

  var fcList = [];
  var fcIndex = 0;
  var fcFlipped = false;

  function initFlashcards() {
    fcList = shuffle(getWordsFiltered({
      chapter: document.getElementById("fc-chapter").value,
      cat: document.getElementById("fc-category").value,
      learned: document.getElementById("fc-learned").value,
    }));
    fcIndex = 0;
    fcFlipped = false;
    renderFlashcard();
  }

  function renderFlashcard() {
    var card = document.getElementById("flashcard");
    card.classList.remove("flipped");
    fcFlipped = false;
    var favBtn = document.getElementById("fc-fav");
    if (!fcList.length) {
      document.getElementById("fc-word").textContent = "—";
      document.getElementById("fc-tr").textContent = "";
      document.getElementById("fc-translation").textContent = "Нет слов";
      document.getElementById("fc-pos").textContent = "";
      document.getElementById("fc-example").textContent = "";
      document.getElementById("fc-counter").textContent = "0 / 0";
      favBtn.classList.remove("active");
      favBtn.textContent = "☆";
      return;
    }
    var w = fcList[fcIndex];
    document.getElementById("fc-word").textContent = w.en;
    document.getElementById("fc-tr").textContent = w.tr ? "[" + w.tr + "]" : "";
    document.getElementById("fc-translation").textContent = w.ru;
    document.getElementById("fc-pos").textContent = POS_LABELS[w.pos] || w.pos || "";
    var ex = w.example || "";
    if (w.exampleRu) ex += (ex ? "\n" : "") + w.exampleRu;
    document.getElementById("fc-example").textContent = ex;
    document.getElementById("fc-counter").textContent = fcIndex + 1 + " / " + fcList.length;
    var fav = isFavorite(w.id);
    favBtn.classList.toggle("active", fav);
    favBtn.textContent = fav ? "★" : "☆";
  }

  document.getElementById("flashcard").addEventListener("click", function () {
    fcFlipped = !fcFlipped;
    document.getElementById("flashcard").classList.toggle("flipped", fcFlipped);
  });
  document.getElementById("fc-fav").addEventListener("click", function (e) {
    e.stopPropagation();
    if (!fcList.length) return;
    var id = fcList[fcIndex].id;
    toggleFavorite(id);
    var fav = isFavorite(id);
    this.classList.toggle("active", fav);
    this.textContent = fav ? "★" : "☆";
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
  document.getElementById("fc-chapter").addEventListener("change", initFlashcards);
  document.getElementById("fc-category").addEventListener("change", initFlashcards);
  document.getElementById("fc-learned").addEventListener("change", initFlashcards);

  var quizType = null;
  var quizQuestions = [];
  var quizIndex = 0;
  var quizScore = 0;
  var quizAnswered = false;
  var quizWaitingContinue = false;
  var quizMistakes = [];

  var quizMenu = document.getElementById("quiz-menu");
  var quizSetup = document.getElementById("quiz-setup");
  var quizArea = document.getElementById("quiz-area");
  var quizResult = document.getElementById("quiz-result");
  var quizContinue = document.getElementById("quiz-continue");

  function hideAllQuiz() {
    quizMenu.classList.add("hidden");
    quizSetup.classList.add("hidden");
    quizArea.classList.add("hidden");
    quizResult.classList.add("hidden");
    quizContinue.classList.add("hidden");
    quizWaitingContinue = false;
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
    var chapter = document.getElementById("quiz-chapter").value;
    var learnedFilter = document.getElementById("quiz-learned").value;
    var count = parseInt(document.getElementById("quiz-count").value, 10) || 20;
    var pool = getWordsFiltered({ chapter: chapter, cat: cat, learned: learnedFilter });
    if (pool.length < 4 && quizType !== "sentence") {
      alert("Слишком мало слов в выбранном фильтре. Выбери «Все» или другую главу.");
      return;
    }
    if (quizType === "sentence") {
      quizQuestions = pickN(SENTENCES, count).map(function (s) {
        return {
          type: "sentence",
          text: s.text,
          prompt: s.text,
          correct: s.answer,
          options: shuffle((s.options || []).slice()),
        };
      });
    } else {
      quizQuestions = pickN(pool, count).map(function (w) {
        if (quizType === "en-ru") {
          var distractPool = pool.length >= 8 ? pool : WORDS;
          var wrong = uniqueDistractors(distractPool, w.ru, "ru", 3);
          return {
            type: "choice", prompt: w.en, sub: w.tr ? "[" + w.tr + "]" : "",
            correct: w.ru, options: shuffle([w.ru].concat(wrong)),
            wordId: w.id, en: w.en, ru: w.ru,
          };
        }
        if (quizType === "ru-en") {
          var distractPool2 = pool.length >= 8 ? pool : WORDS;
          var wrong2 = uniqueDistractors(distractPool2, w.en, "en", 3);
          return {
            type: "choice", prompt: w.ru, sub: "",
            correct: w.en, options: shuffle([w.en].concat(wrong2)),
            wordId: w.id, en: w.en, ru: w.ru,
          };
        }
        return { type: "type", prompt: w.ru, correct: w.en, wordId: w.id, en: w.en, ru: w.ru };
      });
    }
    quizIndex = 0;
    quizScore = 0;
    quizMistakes = [];
    quizAnswered = false;
    quizWaitingContinue = false;
    hideAllQuiz();
    quizArea.classList.remove("hidden");
    showQuestion();
  }

  function handleAnswer(ok, userAnswer) {
    var q = quizQuestions[quizIndex];
    if (ok) {
      quizScore++;
      if (q.wordId) markLearned(q.wordId, true);
    } else {
      if (q.wordId) markLearned(q.wordId, false);
      quizMistakes.push({
        prompt: q.prompt || q.text || "",
        correct: q.correct,
        userAnswer: userAnswer == null ? "" : String(userAnswer),
        wordId: q.wordId || null,
        en: q.en || "",
        ru: q.ru || "",
      });
    }
    var fb = document.getElementById("quiz-feedback");
    if (ok) {
      fb.textContent = "✓ Верно!";
      fb.className = "quiz-feedback correct";
    } else {
      fb.innerHTML = "✗ Неверно. Правильный ответ: <strong>" + escapeHtml(q.correct) + "</strong>";
      fb.className = "quiz-feedback wrong";
    }
    quizWaitingContinue = true;
    quizContinue.classList.remove("hidden");
  }

  function showQuestion() {
    quizAnswered = false;
    quizWaitingContinue = false;
    quizContinue.classList.add("hidden");
    var q = quizQuestions[quizIndex];
    var total = quizQuestions.length;
    document.getElementById("quiz-q-num").textContent = quizIndex + 1 + " / " + total;
    document.getElementById("quiz-score").textContent = quizScore + " правильных";
    document.getElementById("quiz-progress-fill").style.width = (quizIndex / total) * 100 + "%";
    document.getElementById("quiz-feedback").textContent = "";
    document.getElementById("quiz-feedback").className = "quiz-feedback";
    var optsEl = document.getElementById("quiz-options");
    var inputWrap = document.getElementById("quiz-input-wrap");
    optsEl.innerHTML = "";
    inputWrap.classList.add("hidden");
    if (q.type === "choice" || q.type === "sentence") {
      document.getElementById("quiz-question").innerHTML =
        escapeHtml(q.prompt || q.text || "") +
        (q.sub ? '<div class="muted">' + escapeHtml(q.sub) + "</div>" : "");
      var displayOpts = shuffle((q.options || []).slice());
      displayOpts.forEach(function (opt) {
        var btn = document.createElement("button");
        btn.className = "quiz-option";
        btn.textContent = opt;
        btn.addEventListener("click", function () {
          if (quizAnswered) return;
          quizAnswered = true;
          var ok = opt === q.correct;
          btn.classList.add(ok ? "correct" : "wrong");
          optsEl.querySelectorAll(".quiz-option").forEach(function (b) {
            b.disabled = true;
            if (b.textContent === q.correct) b.classList.add("correct");
          });
          handleAnswer(ok, opt);
        });
        optsEl.appendChild(btn);
      });
    } else {
      document.getElementById("quiz-question").textContent = q.prompt;
      inputWrap.classList.remove("hidden");
      var inp = document.getElementById("quiz-input");
      inp.value = "";
      inp.focus();
    }
  }

  document.getElementById("quiz-check").addEventListener("click", function () {
    if (quizAnswered) return;
    var q = quizQuestions[quizIndex];
    var val = document.getElementById("quiz-input").value.trim();
    quizAnswered = true;
    var ok = val.toLowerCase() === String(q.correct).trim().toLowerCase();
    handleAnswer(ok, val);
  });
  document.getElementById("quiz-input").addEventListener("keydown", function (e) {
    if (e.key === "Enter") document.getElementById("quiz-check").click();
  });

  function nextQuizQuestion() {
    if (!quizWaitingContinue) return;
    quizWaitingContinue = false;
    quizIndex++;
    if (quizIndex >= quizQuestions.length) {
      finishQuiz();
      return;
    }
    showQuestion();
  }

  document.getElementById("quiz-next-btn").addEventListener("click", nextQuizQuestion);
  document.getElementById("quiz-area").addEventListener("click", function (e) {
    if (!quizWaitingContinue) return;
    if (e.target.closest("#quiz-next-btn")) return;
    if (e.target.closest(".quiz-option")) return;
    if (e.target.closest("#quiz-input-wrap")) return;
    nextQuizQuestion();
  });

  function renderMistakesList(mistakes, container) {
    if (!mistakes || !mistakes.length) {
      container.innerHTML = '<p class="muted">Ошибок нет — отличный результат!</p>';
      container.classList.remove("hidden");
      return;
    }
    var html = "<h4>Ошибки (" + mistakes.length + ")</h4><ul class=\"mistakes-list\">";
    mistakes.forEach(function (m) {
      html += "<li>" +
        '<div class="mistake-prompt">' + escapeHtml(m.prompt) + "</div>" +
        (m.userAnswer
          ? '<div class="mistake-user">Твой ответ: <span class="wrong-text">' + escapeHtml(m.userAnswer) + "</span></div>"
          : "") +
        '<div class="mistake-correct">Правильно: <span class="correct-text">' + escapeHtml(m.correct) + "</span></div>" +
        "</li>";
    });
    html += "</ul>";
    container.innerHTML = html;
    container.classList.remove("hidden");
  }

  function finishQuiz() {
    hideAllQuiz();
    quizResult.classList.remove("hidden");
    var total = quizQuestions.length;
    document.getElementById("result-score").textContent = quizScore + " / " + total;
    var pct = total ? Math.round((quizScore / total) * 100) : 0;
    document.getElementById("result-percent").textContent = pct + "%";
    var msg =
      pct >= 90 ? "Отлично! Так держать." :
      pct >= 70 ? "Хороший результат, ещё немного практики." :
      "Продолжай тренироваться — получится!";
    document.getElementById("result-message").textContent = msg;
    renderMistakesList(quizMistakes, document.getElementById("result-mistakes"));
    state.quizzesDone = (state.quizzesDone || 0) + 1;
    if (!state.quizHistory) state.quizHistory = [];
    state.quizHistory.unshift({
      id: Date.now(),
      date: new Date().toISOString(),
      type: quizType,
      score: quizScore,
      total: total,
      pct: pct,
      mistakes: quizMistakes.slice(),
    });
    if (state.quizHistory.length > 50) state.quizHistory = state.quizHistory.slice(0, 50);
    saveState();
  }

  document.getElementById("quiz-again").addEventListener("click", startQuiz);
  document.getElementById("quiz-to-menu").addEventListener("click", function () {
    hideAllQuiz();
    quizMenu.classList.remove("hidden");
  });

  function openHistoryDetail(entry) {
    var ov = document.getElementById("history-overlay");
    document.getElementById("history-title").textContent = QUIZ_TYPE_LABELS[entry.type] || "Тест";
    document.getElementById("history-meta").textContent =
      formatDate(entry.date) + " · " + entry.score + " / " + entry.total + " (" + entry.pct + "%)";
    renderMistakesList(entry.mistakes || [], document.getElementById("history-mistakes"));
    ov.classList.remove("hidden");
    ov.setAttribute("aria-hidden", "false");
  }

  function closeHistoryDetail() {
    var ov = document.getElementById("history-overlay");
    ov.classList.add("hidden");
    ov.setAttribute("aria-hidden", "true");
  }

  document.getElementById("history-close").addEventListener("click", closeHistoryDetail);
  document.getElementById("history-close-btn").addEventListener("click", closeHistoryDetail);
  document.getElementById("history-overlay").addEventListener("click", function (e) {
    if (e.target === this) closeHistoryDetail();
  });

  function renderQuizHistory() {
    var listEl = document.getElementById("quiz-history-list");
    var history = state.quizHistory || [];
    if (!history.length) {
      listEl.innerHTML = '<p class="muted" id="quiz-history-empty">Пока нет пройденных тестов.</p>';
      return;
    }
    var html = "";
    history.forEach(function (h, idx) {
      var errCount = (h.mistakes && h.mistakes.length) || 0;
      html +=
        '<button type="button" class="history-item" data-hist="' + idx + '">' +
        '<div class="history-item-main"><strong>' +
        escapeHtml(QUIZ_TYPE_LABELS[h.type] || h.type || "Тест") +
        '</strong><span class="history-date">' + escapeHtml(formatDate(h.date)) + "</span></div>" +
        '<div class="history-item-meta">' + h.score + " / " + h.total + " · " + h.pct + "%" +
        (errCount ? " · ошибок: " + errCount : "") + "</div></button>";
    });
    listEl.innerHTML = html;
    listEl.querySelectorAll("[data-hist]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = parseInt(btn.getAttribute("data-hist"), 10);
        openHistoryDetail(history[i]);
      });
    });
  }

  function renderProgress() {
    var total = WORDS.length;
    var learned = learnedCount();
    document.getElementById("prog-learned").textContent = learned;
    document.getElementById("prog-streak").textContent = state.streak || 0;
    document.getElementById("prog-quizzes").textContent = state.quizzesDone || 0;
    document.getElementById("prog-favs").textContent = favCount();
    document.getElementById("prog-bar").style.width =
      (total ? Math.round((learned / total) * 100) : 0) + "%";
    var chEl = document.getElementById("prog-chapters");
    chEl.innerHTML = "";
    [1, 2, 3].forEach(function (ch) {
      var list = WORDS.filter(function (w) { return w.chapter === ch; });
      var n = list.filter(function (w) { return isLearned(w.id); }).length;
      var pct = list.length ? Math.round((n / list.length) * 100) : 0;
      var row = document.createElement("div");
      row.className = "chapter-prog-row";
      row.innerHTML =
        "<span>" + (CHAPTERS[ch] || "Глава " + ch) + "</span>" +
        '<div class="bar-mini"><div style="width:' + pct + '%"></div></div>' +
        "<span>" + n + "/" + list.length + "</span>";
      chEl.appendChild(row);
    });
    renderQuizHistory();
  }

  fillSelects();
  updateStats();
  renderHome();
  showView("home");

  if (window.EnglishAuth) {
    EnglishAuth.init({
      getState: function () { return state; },
      setState: function (merged) {
        state.learned = merged.learned;
        state.favorites = merged.favorites;
        state.streak = merged.streak;
        state.lastVisit = merged.lastVisit;
        state.quizzesDone = merged.quizzesDone;
        if (merged.theme) {
          state.theme = merged.theme;
          document.documentElement.setAttribute("data-theme", merged.theme);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        updateStats();
        try { renderProgress(); } catch (_) {}
      },
      onProgressMerged: function () {
        updateStats();
        try { renderProgress(); } catch (_) {}
      },
    });
  }
})();
