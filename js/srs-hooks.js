/* SRS hooks: quizzes, activity, due-today queue — overlays CDN app */
(function () {
  "use strict";
  var STORAGE_KEY = "english-practice-v1";
  var lastTypedUser = "";
  var lastHandledFb = "";

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function save(st) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
    } catch (e) {}
  }

  function bumpActivity(st) {
    if (!window.SRS) return st;
    var day = SRS.todayISO();
    if (!st.activity) st.activity = {};
    st.activity[day] = (st.activity[day] || 0) + 1;
    return st;
  }

  function applyToWord(wordId, quality) {
    if (!window.SRS || wordId == null) return;
    var st = load();
    SRS.migrateState(st);
    var entry = SRS.applyQuality(SRS.getEntry(st, wordId), quality);
    SRS.setEntry(st, wordId, entry);
    bumpActivity(st);
    save(st);
    var due = document.getElementById("due-today-count");
    if (due) due.textContent = String(SRS.countDue(st));
    if (window.EnglishAuth && EnglishAuth.scheduleCloudSave) EnglishAuth.scheduleCloudSave();
  }

  function findWordIdFromPrompt() {
    if (typeof WORDS === "undefined") return null;
    var qEl = document.getElementById("quiz-question");
    if (!qEl) return null;
    var text = (qEl.textContent || "").trim();
    if (!text) return null;
    var line = text.split("\n")[0].trim();
    for (var i = 0; i < WORDS.length; i++) {
      var w = WORDS[i];
      if (w.en === line || w.ru === line) return w.id;
    }
    for (var j = 0; j < WORDS.length; j++) {
      if (WORDS[j].ru === line || WORDS[j].en === line) return WORDS[j].id;
    }
    return null;
  }

  function onQuizFeedback() {
    var fb = document.getElementById("quiz-feedback");
    if (!fb || !window.SRS) return;
    var key = fb.className + "|" + (fb.textContent || "").slice(0, 80);
    if (key === lastHandledFb) return;
    if (!fb.classList.contains("correct") && !fb.classList.contains("wrong")) return;
    lastHandledFb = key;

    var id = findWordIdFromPrompt();
    if (id == null) return;

    if (fb.classList.contains("correct")) {
      applyToWord(id, "good");
      return;
    }
    var input = document.getElementById("quiz-input");
    var user = lastTypedUser || (input ? input.value : "");
    var correctMatch = (fb.textContent || "").match(/Правильный ответ:\s*(.+)$/i);
    var correct = correctMatch ? correctMatch[1].trim() : "";
    correct = correct.replace(/\s+/g, " ").trim();
    if (user && correct && SRS.gradeTyped(user, correct) === "almost") {
      applyToWord(id, "hard");
    } else {
      applyToWord(id, "again");
    }
  }

  function watchFeedback() {
    var fb = document.getElementById("quiz-feedback");
    if (!fb) return;
    var obs = new MutationObserver(function () {
      onQuizFeedback();
    });
    obs.observe(fb, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  }

  function wireTypedCapture() {
    document.addEventListener(
      "click",
      function (e) {
        var t = e.target;
        if (!t) return;
        if (t.id === "quiz-check" || (t.closest && t.closest("#quiz-check"))) {
          var input = document.getElementById("quiz-input");
          lastTypedUser = input ? input.value : "";
          lastHandledFb = "";
        }
        if (t.classList && t.classList.contains("quiz-option")) {
          lastHandledFb = "";
        }
      },
      true
    );
  }

  function renderDuePanel() {
    var block = document.getElementById("due-today-block");
    if (!block || !window.SRS || typeof WORDS === "undefined") return;
    var st = load();
    SRS.migrateState(st);
    var ids = SRS.getDueWordIds(st);
    var dueEl = document.getElementById("due-today-count");
    if (dueEl) dueEl.textContent = String(ids.length);

    var list = document.getElementById("due-today-list");
    if (!list) {
      list = document.createElement("div");
      list.id = "due-today-list";
      list.className = "due-today-list";
      block.appendChild(list);
    }
    if (!ids.length) {
      list.innerHTML = '<p class="muted due-empty">На сегодня повторений нет — можно учить новые слова.</p>';
      return;
    }
    var byId = {};
    WORDS.forEach(function (w) {
      byId[String(w.id)] = w;
    });
    var html = '<ul class="due-ul">';
    ids.slice(0, 12).forEach(function (id) {
      var w = byId[String(id)];
      if (!w) return;
      var e = SRS.getEntry(st, id);
      html +=
        "<li><span class=\"due-en\">" +
        escape(w.en) +
        '</span> <span class="muted">→ ' +
        escape(w.ru) +
        '</span> <span class="due-lv">L' +
        e.level +
        "</span></li>";
    });
    if (ids.length > 12) {
      html += '<li class="muted">…и ещё ' + (ids.length - 12) + "</li>";
    }
    html += "</ul>";
    list.innerHTML = html;
  }

  function escape(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function wireDueStart() {
    var btn = document.getElementById("due-today-start");
    if (!btn || btn.dataset.hooksBound) return;
    btn.dataset.hooksBound = "1";
    btn.addEventListener("click", function () {
      sessionStorage.setItem("ep-due-mode", "1");
      var nav = document.querySelector('.nav-btn[data-view="flashcards"]');
      if (nav) nav.click();
      var sel = document.getElementById("fc-learned");
      if (sel) {
        sel.value = "all";
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }
      showDueToast();
    });
  }

  function showDueToast() {
    var old = document.getElementById("ep-due-toast");
    if (old) old.remove();
    var t = document.createElement("div");
    t.id = "ep-due-toast";
    t.className = "ep-due-toast";
    t.textContent = "Режим повторения: отмечай Снова / Трудно / Хорошо / Легко — прогресс пишется в SRS.";
    document.body.appendChild(t);
    setTimeout(function () {
      t.classList.add("show");
    }, 10);
    setTimeout(function () {
      t.classList.remove("show");
      setTimeout(function () {
        t.remove();
      }, 400);
    }, 4500);
  }

  function boot() {
    watchFeedback();
    wireTypedCapture();
    wireDueStart();
    renderDuePanel();
    setInterval(renderDuePanel, 8000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(boot, 400);
    });
  } else {
    setTimeout(boot, 400);
  }

  window.SRSHooks = { renderDuePanel: renderDuePanel, applyToWord: applyToWord };
})();
