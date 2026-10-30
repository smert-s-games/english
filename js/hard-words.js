/* Difficult words: lapses >= 3 + train mistakes */
(function () {
  "use strict";
  var STORAGE_KEY = "english-practice-v1";
  var LAPSE_MIN = 3;
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

  function getHardWords() {
    if (!window.SRS || typeof WORDS === "undefined") return [];
    var st = load();
    SRS.migrateState(st);
    var list = [];
    WORDS.forEach(function (w) {
      var e = SRS.getEntry(st, w.id);
      if ((e.lapses | 0) >= LAPSE_MIN) {
        list.push({ word: w, lapses: e.lapses | 0, level: e.level | 0 });
      }
    });
    list.sort(function (a, b) {
      return b.lapses - a.lapses;
    });
    return list;
  }

  function getMistakeWordIds() {
    var st = load();
    var ids = {};
    (st.quizHistory || []).slice(0, 30).forEach(function (h) {
      (h.mistakes || []).forEach(function (m) {
        if (m.wordId != null) ids[String(m.wordId)] = true;
      });
    });
    if (window.SRS && typeof WORDS !== "undefined") {
      SRS.migrateState(st);
      WORDS.forEach(function (w) {
        var e = SRS.getEntry(st, w.id);
        if ((e.lapses | 0) >= LAPSE_MIN) ids[String(w.id)] = true;
      });
    }
    return Object.keys(ids);
  }

  function ensureNav() {
    var progressBtn = document.querySelector('.nav-btn[data-view="progress"]');
    if (!progressBtn) return;
    var parent = progressBtn.parentElement;
    if (document.querySelector('.nav-btn[data-view="hard"]')) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "nav-btn";
    btn.setAttribute("data-view", "hard");
    btn.textContent = "\u0422\u0440\u0443\u0434\u043d\u044b\u0435";
    parent.insertBefore(btn, progressBtn);
  }

  function ensureHomeCard() {
    var grid = document.querySelector(".action-cards, .home-actions");
    if (!grid || document.getElementById("hard-action-card")) return;
    var card = document.createElement("button");
    card.type = "button";
    card.className = "action-card";
    card.id = "hard-action-card";
    card.innerHTML =
      '<span class="action-icon">\uD83D\uDD25</span><div><strong>\u0422\u0440\u0443\u0434\u043d\u044b\u0435 \u0441\u043b\u043e\u0432\u0430</strong><span>\u0421\u0440\u044b\u0432\u044b \u0438 \u043e\u0448\u0438\u0431\u043a\u0438</span></div>';
    card.addEventListener("click", showHardView);
    grid.appendChild(card);
  }

  function ensureView() {
    if (document.getElementById("view-hard")) return document.getElementById("view-hard");
    var sec = document.createElement("section");
    sec.id = "view-hard";
    sec.className = "view";
    sec.innerHTML =
      '<div class="view-header"><h2>\u0422\u0440\u0443\u0434\u043d\u044b\u0435 \u0441\u043b\u043e\u0432\u0430</h2></div>' +
      '<p class="muted hard-intro">\u0421\u043b\u043e\u0432\u0430 \u0441 <strong>lapses \u2265 ' +
      LAPSE_MIN +
      "</strong> \u0438 \u043d\u0435\u0434\u0430\u0432\u043d\u0438\u0435 \u043e\u0448\u0438\u0431\u043a\u0438 \u0432 \u0442\u0435\u0441\u0442\u0430\u0445.</p>" +
      '<div class="hard-actions">' +
      '<button type="button" class="btn btn-primary" id="hard-train-btn">\u0422\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043c\u043e\u0438 \u043e\u0448\u0438\u0431\u043a\u0438</button>' +
      '<button type="button" class="btn btn-secondary" id="hard-cards-btn">\u041a\u0430\u0440\u0442\u043e\u0447\u043a\u0438</button>' +
      "</div>" +
      '<p class="muted" id="hard-count"></p>' +
      '<div class="words-list" id="hard-words-list"></div>';
    var progress = document.getElementById("view-progress");
    if (progress && progress.parentNode) progress.parentNode.insertBefore(sec, progress);
    else (document.querySelector("main") || document.body).appendChild(sec);
    document.getElementById("hard-train-btn").addEventListener("click", startTrain);
    document.getElementById("hard-cards-btn").addEventListener("click", startTrain);
    return sec;
  }

  function showViewOnly(name) {
    document.querySelectorAll("section.view").forEach(function (s) {
      s.classList.remove("active");
    });
    document.querySelectorAll(".nav-btn").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-view") === name);
    });
    var el = document.getElementById("view-" + name);
    if (el) el.classList.add("active");
  }

  function showHardView() {
    ensureView();
    showViewOnly("hard");
    renderList();
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderList() {
    ensureView();
    var hard = getHardWords();
    var countEl = document.getElementById("hard-count");
    if (countEl) {
      countEl.textContent = hard.length
        ? "\u041d\u0430\u0439\u0434\u0435\u043d\u043e: " + hard.length
        : "\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0442\u0440\u0443\u0434\u043d\u044b\u0445 \u0441\u043b\u043e\u0432 \u2014 \u043f\u043e\u044f\u0432\u044f\u0442\u0441\u044f \u043f\u043e\u0441\u043b\u0435 \u0441\u0440\u044b\u0432\u043e\u0432 (lapses \u2265 " +
          LAPSE_MIN +
          ").";
    }
    var list = document.getElementById("hard-words-list");
    if (!list) return;
    if (!hard.length) {
      list.innerHTML = '<p class="muted" style="text-align:center;padding:24px">\u041f\u0443\u0441\u0442\u043e</p>';
      return;
    }
    list.innerHTML = hard
      .map(function (h) {
        var w = h.word;
        return (
          '<div class="word-item hard-item" data-id="' +
          w.id +
          '">' +
          "<div><div class=\"word-en\">" +
          escapeHtml(w.en) +
          '</div><div class="word-tr">' +
          escapeHtml(w.tr || "") +
          '</div><div class="word-ru">' +
          escapeHtml(w.ru) +
          "</div></div>" +
          '<div class="word-meta"><span class="hard-badge">\u0441\u0440\u044b\u0432\u043e\u0432: ' +
          h.lapses +
          '</span><span class="word-pos">\u0443\u0440. ' +
          h.level +
          "</span></div></div>"
        );
      })
      .join("");
  }

  function buildTrainQueue() {
    var ids = getMistakeWordIds();
    if (typeof WORDS === "undefined") return [];
    var byId = {};
    WORDS.forEach(function (w) {
      byId[String(w.id)] = w;
    });
    var list = [];
    ids.forEach(function (id) {
      if (byId[id]) list.push(byId[id]);
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
    if (!area) return;
    var ban = document.getElementById("hard-session-banner");
    if (!ban) {
      ban = document.createElement("div");
      ban.id = "hard-session-banner";
      ban.className = "due-session-banner hard-session-banner hidden";
      ban.innerHTML =
        '<span>\u0422\u0440\u0443\u0434\u043d\u044b\u0435 \u00b7 <strong id="hard-session-left">0</strong></span>' +
        '<button type="button" class="btn btn-ghost" id="hard-session-exit">\u0412\u044b\u0439\u0442\u0438</button>';
      area.insertBefore(ban, area.firstChild);
      document.getElementById("hard-session-exit").addEventListener("click", stopSession);
    }
    ban.classList.remove("hidden");
  }

  function startTrain() {
    queue = buildTrainQueue();
    index = 0;
    if (!queue.length) {
      alert("\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0441\u043b\u043e\u0432 \u0441 \u043e\u0448\u0438\u0431\u043a\u0430\u043c\u0438 \u0438\u043b\u0438 \u0441\u0440\u044b\u0432\u0430\u043c\u0438 \u2265 " + LAPSE_MIN + ".");
      return;
    }
    active = true;
    var nav = document.querySelector('.nav-btn[data-view="flashcards"]');
    if (nav) nav.click();
    document.body.classList.add("hard-session-on");
    ensureBanner();
    setTimeout(renderCurrent, 80);
    setTimeout(renderCurrent, 250);
  }

  function stopSession() {
    active = false;
    queue = [];
    document.body.classList.remove("hard-session-on");
    var ban = document.getElementById("hard-session-banner");
    if (ban) ban.classList.add("hidden");
    var sel = document.getElementById("fc-learned");
    if (sel) sel.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function renderCurrent() {
    if (!active) return;
    var left = document.getElementById("hard-session-left");
    if (left) left.textContent = String(queue.length);
    var card = document.getElementById("flashcard");
    if (!card) return;
    card.classList.remove("flipped");
    if (!queue.length) {
      document.getElementById("fc-word").textContent = "\u2713";
      document.getElementById("fc-tr").textContent = "";
      document.getElementById("fc-translation").textContent =
        "\u0422\u0440\u0443\u0434\u043d\u044b\u0435 \u0441\u043b\u043e\u0432\u0430 \u043d\u0430 \u0441\u0435\u0433\u043e\u0434\u043d\u044f \u0440\u0430\u0437\u043e\u0431\u0440\u0430\u043d\u044b";
      document.getElementById("fc-example").textContent = "";
      document.getElementById("fc-counter").textContent = "0 / 0";
      return;
    }
    if (index >= queue.length) index = 0;
    var w = queue[index];
    document.getElementById("fc-word").textContent = w.en;
    document.getElementById("fc-tr").textContent = w.tr ? "[" + w.tr + "]" : "";
    document.getElementById("fc-translation").textContent = w.ru;
    var ex = w.example || "";
    if (w.exampleRu) ex += (ex ? "\n" : "") + w.exampleRu;
    document.getElementById("fc-example").textContent = ex;
    document.getElementById("fc-counter").textContent = index + 1 + " / " + queue.length;
  }

  function wireSessionControls() {
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
      if (!el || el.dataset.hardBound) return;
      el.dataset.hardBound = "1";
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
          if (q === "again") {
            var cur = queue[index];
            queue.splice(index, 1);
            queue.push(cur);
            if (index >= queue.length) index = 0;
          } else {
            queue.splice(index, 1);
            if (index >= queue.length) index = 0;
          }
          renderCurrent();
          renderList();
        },
        true
      );
    });
  }

  function wireNavIntercept() {
    document.addEventListener(
      "click",
      function (e) {
        var btn = e.target.closest && e.target.closest('.nav-btn[data-view="hard"]');
        if (btn) {
          e.preventDefault();
          e.stopPropagation();
          showHardView();
        }
      },
      true
    );
  }

  function boot() {
    ensureNav();
    ensureHomeCard();
    ensureView();
    wireSessionControls();
    wireNavIntercept();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(boot, 850);
    });
  } else {
    setTimeout(boot, 850);
  }

  window.HardWords = {
    isActive: function () {
      return active;
    },
    refresh: renderList,
  };
})();
