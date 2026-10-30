/* app.js v31 — CDN app + SRS + dark default + due-aware + daily limit */
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
    if (window.DailyLimit && !DailyLimit.tryConsumeNew(st, id)) {
      if (DailyLimit.toast) DailyLimit.toast("\u041b\u0438\u043c\u0438\u0442 \u043d\u043e\u0432\u044b\u0445 \u0441\u043b\u043e\u0432 \u043d\u0430 \u0441\u0435\u0433\u043e\u0434\u043d\u044f \u0438\u0441\u0447\u0435\u0440\u043f\u0430\u043d. \u041c\u043e\u0436\u043d\u043e \u0442\u043e\u043b\u044c\u043a\u043e \u043f\u043e\u0432\u0442\u043e\u0440\u044f\u0442\u044c.");
      return;
    }
    if (window.DailyLimit && DailyLimit.renderUi) DailyLimit.renderUi();
    var entry = SRS.applyQuality(SRS.getEntry(st, id), quality);
    SRS.setEntry(st, id, entry);
    var day = SRS.todayISO();
    if (!st.activity) st.activity = {};
    st.activity[day] = (st.activity[day] || 0) + 1;
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
          if (window.DueSession && DueSession.isActive && DueSession.isActive()) {
            return;
          }
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

  function ensureDarkDefault() {
    var st = loadRaw();
    if (!st.themeUserSet) {
      st.theme = "dark";
      saveRaw(st);
    }
    document.documentElement.setAttribute("data-theme", st.theme || "dark");
  }
  ensureDarkDefault();

  function wireThemeUserFlag() {
    var btn = document.getElementById("theme-toggle");
    if (!btn || btn.dataset.themeFlag) return;
    btn.dataset.themeFlag = "1";
    btn.addEventListener(
      "click",
      function () {
        setTimeout(function () {
          var st = loadRaw();
          st.themeUserSet = true;
          st.theme = document.documentElement.getAttribute("data-theme") || "dark";
          saveRaw(st);
        }, 0);
      },
      true
    );
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
            if (merged.theme && st.themeUserSet) st.theme = merged.theme;
            if (merged.activity) st.activity = merged.activity;
            if (merged.dailyNewLimit != null) st.dailyNewLimit = merged.dailyNewLimit;
            if (merged.newByDay) st.newByDay = merged.newByDay;
            if (window.SRS) SRS.migrateState(st);
            saveRaw(st);
            ensureDarkDefault();
            ensureProgress();
            if (window.DailyLimit && DailyLimit.renderUi) DailyLimit.renderUi();
          },
        });
      }
      wireAccountFallback();
      wireThemeUserFlag();
      ensureDarkDefault();
      ensureProgress();
    }, 150);
    setInterval(ensureProgress, 5000);
  };
  s.onerror = function () {
    console.error("CDN app failed");
  };
  document.head.appendChild(s);
})();
