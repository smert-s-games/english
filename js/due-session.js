/* Due-only flashcard session (SRS queue) */
(function () {
  "use strict";
  var STORAGE_KEY = "english-practice-v1";
  var active = false;
  var queue = [];
  var index = 0;

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function buildDueQueue() {
    if (!window.SRS || typeof WORDS === "undefined") return [];
    var st = load();
    SRS.migrateState(st);
    var ids = SRS.getDueWordIds(st);
    var byId = {};
    WORDS.forEach(function (w) {
      byId[String(w.id)] = w;
    });
    var list = [];
    ids.forEach(function (id) {
      if (byId[String(id)]) list.push(byId[String(id)]);
    });
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = list[i];
      list[i] = list[j];
      list[j] = t;
    }
    return list;
  }

  function ensureBanner() {
    var area = document.querySelector(".flashcard-area");
    if (!area) return null;
    var ban = document.getElementById("due-session-banner");
    if (!ban) {
      ban = document.createElement("div");
      ban.id = "due-session-banner";
      ban.className = "due-session-banner hidden";
      ban.innerHTML =
        '<span class="due-session-text">\u0420\u0435\u0436\u0438\u043c \u043f\u043e\u0432\u0442\u043e\u0440\u0435\u043d\u0438\u044f \u00b7 <strong id="due-session-left">0</strong></span>' +
        '<button type="button" class="btn btn-ghost due-session-exit" id="due-session-exit">\u0412\u044b\u0439\u0442\u0438</button>';
      area.insertBefore(ban, area.firstChild);
      document.getElementById("due-session-exit").addEventListener("click", function () {
        stopSession();
      });
    }
    return ban;
  }

  function renderCurrent() {
    var card = document.getElementById("flashcard");
    if (!card) return;
    card.classList.remove("flipped");
    var left = document.getElementById("due-session-left");
    if (left) left.textContent = String(queue.length) + (queue.length === 1 ? " \u0441\u043b\u043e\u0432\u043e" : " \u0441\u043b\u043e\u0432");

    if (!queue.length) {
      document.getElementById("fc-word").textContent = "\u2713";
      document.getElementById("fc-tr").textContent = "";
      document.getElementById("fc-translation").textContent = "\u041d\u0430 \u0441\u0435\u0433\u043e\u0434\u043d\u044f \u0432\u0441\u0451 \u043f\u043e\u0432\u0442\u043e\u0440\u0435\u043d\u043e";
      document.getElementById("fc-pos").textContent = "";
      document.getElementById("fc-example").textContent = "";
      document.getElementById("fc-counter").textContent = "0 / 0";
      return;
    }
    if (index >= queue.length) index = 0;
    var w = queue[index];
    document.getElementById("fc-word").textContent = w.en;
    document.getElementById("fc-tr").textContent = w.tr ? "[" + w.tr + "]" : "";
    document.getElementById("fc-translation").textContent = w.ru;
    var posLabels = window.POS_LABELS || {};
    document.getElementById("fc-pos").textContent = posLabels[w.pos] || w.pos || "";
    var ex = w.example || "";
    if (w.exampleRu) ex += (ex ? "\n" : "") + w.exampleRu;
    document.getElementById("fc-example").textContent = ex;
    document.getElementById("fc-counter").textContent = index + 1 + " / " + queue.length;
  }

  function startSession() {
    queue = buildDueQueue();
    index = 0;
    if (!queue.length) {
      alert("\u041d\u0430 \u0441\u0435\u0433\u043e\u0434\u043d\u044f \u043d\u0435\u0442 \u0441\u043b\u043e\u0432 \u043a \u043f\u043e\u0432\u0442\u043e\u0440\u0435\u043d\u0438\u044e.");
      sessionStorage.removeItem("ep-due-mode");
      return;
    }
    active = true;
    sessionStorage.setItem("ep-due-mode", "1");
    var ban = ensureBanner();
    if (ban) ban.classList.remove("hidden");
    var nav = document.querySelector('.nav-btn[data-view="flashcards"]');
    if (nav) nav.click();
    document.body.classList.add("due-session-on");
    setTimeout(renderCurrent, 50);
    setTimeout(renderCurrent, 200);
  }

  function stopSession() {
    active = false;
    queue = [];
    index = 0;
    sessionStorage.removeItem("ep-due-mode");
    document.body.classList.remove("due-session-on");
    var ban = document.getElementById("due-session-banner");
    if (ban) ban.classList.add("hidden");
    var sel = document.getElementById("fc-learned");
    if (sel) sel.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function advanceAfterQuality(quality) {
    if (!active || !queue.length) return;
    var cur = queue[index];
    if (quality === "again") {
      queue.splice(index, 1);
      queue.push(cur);
      if (index >= queue.length) index = 0;
    } else {
      queue.splice(index, 1);
      if (index >= queue.length) index = 0;
    }
    renderCurrent();
    if (window.SRSHooks && SRSHooks.renderDuePanel) SRSHooks.renderDuePanel();
  }

  function wireControls() {
    function onNext(e) {
      if (!active) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!queue.length) return;
      index = (index + 1) % queue.length;
      renderCurrent();
    }
    function onPrev(e) {
      if (!active) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!queue.length) return;
      index = (index - 1 + queue.length) % queue.length;
      renderCurrent();
    }
    var next = document.getElementById("fc-next");
    var prev = document.getElementById("fc-prev");
    if (next) next.addEventListener("click", onNext, true);
    if (prev) prev.addEventListener("click", onPrev, true);

    ["fc-again", "fc-hard", "fc-good", "fc-easy"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || el.dataset.dueBound) return;
      el.dataset.dueBound = "1";
      el.addEventListener(
        "click",
        function (e) {
          if (!active) return;
          e.preventDefault();
          e.stopImmediatePropagation();
          var q =
            id === "fc-again"
              ? "again"
              : id === "fc-hard"
                ? "hard"
                : id === "fc-easy"
                  ? "easy"
                  : "good";
          var w = queue[index];
          if (w && window.SRS) {
            var st = load();
            SRS.migrateState(st);
            var entry = SRS.applyQuality(SRS.getEntry(st, w.id), q);
            SRS.setEntry(st, w.id, entry);
            var day = SRS.todayISO();
            if (!st.activity) st.activity = {};
            st.activity[day] = (st.activity[day] || 0) + 1;
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
            } catch (err) {}
            if (window.EnglishAuth && EnglishAuth.scheduleCloudSave) EnglishAuth.scheduleCloudSave();
          }
          advanceAfterQuality(q);
        },
        true
      );
    });
  }

  function wireStartButton() {
    var btn = document.getElementById("due-today-start");
    if (!btn) return;
    btn.addEventListener(
      "click",
      function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        startSession();
      },
      true
    );
  }

  function boot() {
    ensureBanner();
    wireControls();
    wireStartButton();
    if (sessionStorage.getItem("ep-due-mode") === "1") {
      var q = buildDueQueue();
      if (q.length) startSession();
      else sessionStorage.removeItem("ep-due-mode");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(boot, 800);
    });
  } else {
    setTimeout(boot, 800);
  }

  window.DueSession = {
    start: startSession,
    stop: stopSession,
    isActive: function () {
      return active;
    },
  };
})();
