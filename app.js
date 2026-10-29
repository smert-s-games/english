/* app.js v21 — CDN app + SRS progress + quality buttons + auth-safe boot */
(function () {
  "use strict";
  var STORAGE_KEY = "english-practice-v1";
  var CDN_APP = "https://cdn.jsdelivr.net/gh/smert-s-games/english@9eaece21677c1d1115d3ab79567833fdfc30f8c0/app.js";

  function loadRaw() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveRaw(st) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
    } catch (e) {}
  }

  function ensureProgress() {
    if (!window.SRS) return loadRaw();
    var st = loadRaw();
    SRS.migrateState(st);
    delete st._progressDirty;
    saveRaw(st);
    var due = document.getElementById("due-today-count");
    if (due) due.textContent = String(SRS.countDue(st));
    return st;
  }

  function currentWordId() {
    var el = document.getElementById("fc-word");
    if (!el || typeof WORDS === "undefined") return null;
    var en = (el.textContent || "").trim();
    if (!en || en === "\u2014") return null;
    for (var i = 0; i < WORDS.length; i++) {
      if (WORDS[i].en === en) return WORDS[i].id;
    }
    return null;
  }

  function applyQuality(quality) {
    if (!window.SRS) return;
    var id = currentWordId();
    if (id == null) return;
    var st = ensureProgress();
    var entry = SRS.applyQuality(SRS.getEntry(st, id), quality);
    SRS.setEntry(st, id, entry);
    saveRaw(st);
    var due = document.getElementById("due-today-count");
    if (due) due.textContent = String(SRS.countDue(st));
    if (window.EnglishAuth && EnglishAuth.scheduleCloudSave) EnglishAuth.scheduleCloudSave();
  }

  function wireQualityButtons() {
    function bind(id, quality) {
      var el = document.getElementById(id);
      if (!el || el.dataset.srsBound) return;
      el.dataset.srsBound = "1";
      el.addEventListener(
        "click",
        function (e) {
          e.preventDefault();
          e.stopImmediatePropagation();
          applyQuality(quality);
          var next = document.getElementById("fc-next");
          if (next) next.click();
        },
        true
      );
    }
    bind("fc-again", "again");
    bind("fc-hard", "hard");
    bind("fc-good", "good");
    bind("fc-easy", "easy");
  }

  function wireDueStart() {
    var btn = document.getElementById("due-today-start");
    if (!btn || btn.dataset.srsBound) return;
    btn.dataset.srsBound = "1";
    btn.addEventListener("click", function () {
      var nav = document.querySelector('.nav-btn[data-view="flashcards"]');
      if (nav) nav.click();
    });
  }

  function wireAccountFallback() {
    var btn = document.getElementById("account-btn");
    if (!btn || btn.dataset.srsBound) return;
    btn.dataset.srsBound = "1";
    btn.addEventListener("click", function () {
      var ov = document.getElementById("auth-overlay");
      if (ov && ov.classList.contains("hidden")) {
        ov.classList.remove("hidden");
        ov.setAttribute("aria-hidden", "false");
      }
    });
  }

  ensureProgress();

  var s = document.createElement("script");
  s.src = CDN_APP;
  s.onload = function () {
    ensureProgress();
    setTimeout(function () {
      wireQualityButtons();
      wireDueStart();
      if (window.EnglishAuth) {
        EnglishAuth.init({
          getState: function () {
            var st = loadRaw();
            if (window.SRS) SRS.migrateState(st);
            return st;
          },
          setState: function (merged) {
            var st = loadRaw();
            if (merged.learned) st.learned = merged.learned;
            if (merged.favorites) st.favorites = merged.favorites;
            if (merged.streak != null) st.streak = merged.streak;
            if (merged.lastVisit != null) st.lastVisit = merged.lastVisit;
            if (merged.quizzesDone != null) st.quizzesDone = merged.quizzesDone;
            if (merged.theme) st.theme = merged.theme;
            if (merged.activity) st.activity = merged.activity;
            if (merged.dailyNewLimit != null) st.dailyNewLimit = merged.dailyNewLimit;
            if (window.SRS) SRS.migrateState(st);
            saveRaw(st);
            ensureProgress();
          },
        });
      }
      wireAccountFallback();
      ensureProgress();
    }, 150);
    setInterval(ensureProgress, 5000);
  };
  s.onerror = function () {
    console.error("CDN app failed");
  };
  document.head.appendChild(s);
})();
