/* Daily new-word limit — UI + counters */
(function () {
  "use strict";
  var STORAGE_KEY = "english-practice-v1";
  var OPTIONS = [5, 10, 15, 20, 30, 50, 0];

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
    if (window.EnglishAuth && EnglishAuth.scheduleCloudSave) EnglishAuth.scheduleCloudSave();
  }

  function today() {
    return window.SRS ? SRS.todayISO() : new Date().toISOString().slice(0, 10);
  }

  function getLimit(st) {
    if (st.dailyNewLimit == null) return 10;
    return st.dailyNewLimit | 0;
  }

  function getNewToday(st) {
    var day = today();
    if (!st.newByDay) st.newByDay = {};
    return st.newByDay[day] | 0;
  }

  function remainingNew(st) {
    var lim = getLimit(st);
    if (lim === 0) return Infinity;
    return Math.max(0, lim - getNewToday(st));
  }

  function isNewWord(st, id) {
    if (!window.SRS) return true;
    var e = SRS.getEntry(st, id);
    return !e.lastSeen && (e.level | 0) === 0;
  }

  function tryConsumeNew(st, id) {
    if (!isNewWord(st, id)) return true;
    var left = remainingNew(st);
    if (left <= 0) return false;
    var day = today();
    if (!st.newByDay) st.newByDay = {};
    st.newByDay[day] = (st.newByDay[day] | 0) + 1;
    return true;
  }

  function setLimit(n) {
    var st = load();
    if (window.SRS) SRS.migrateState(st);
    st.dailyNewLimit = n | 0;
    save(st);
    renderUi();
  }

  function ensureUi() {
    var card = document.getElementById("daily-limit-card");
    if (!card) {
      card = document.createElement("div");
      card.id = "daily-limit-card";
      card.className = "progress-card daily-limit-card";
      card.innerHTML =
        "<h3>\u041d\u043e\u0432\u044b\u0435 \u0441\u043b\u043e\u0432\u0430 \u0432 \u0434\u0435\u043d\u044c</h3>" +
        '<p class="daily-limit-status muted" id="daily-limit-status"></p>' +
        '<div class="daily-limit-options" id="daily-limit-options"></div>' +
        '<p class="daily-limit-hint muted">\u041b\u0438\u043c\u0438\u0442 \u0442\u043e\u043b\u044c\u043a\u043e \u043d\u0430 <strong>\u043d\u043e\u0432\u044b\u0435</strong> \u0441\u043b\u043e\u0432\u0430. \u041f\u043e\u0432\u0442\u043e\u0440\u0435\u043d\u0438\u044f \u043d\u0435 \u043e\u0433\u0440\u0430\u043d\u0438\u0447\u0438\u0432\u0430\u044e\u0442\u0441\u044f.</p>';

      var prog = document.querySelector("#view-progress .progress-cards");
      if (prog) prog.appendChild(card);
      else {
        var due = document.getElementById("due-today-block");
        if (due) due.insertAdjacentElement("afterend", card);
      }

      var opts = document.getElementById("daily-limit-options");
      OPTIONS.forEach(function (n) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "btn btn-ghost daily-limit-btn";
        b.dataset.limit = String(n);
        b.textContent = n === 0 ? "\u221e" : String(n);
        b.title = n === 0 ? "\u0411\u0435\u0437 \u043b\u0438\u043c\u0438\u0442\u0430" : n + " \u043d\u043e\u0432\u044b\u0445 \u0432 \u0434\u0435\u043d\u044c";
        b.addEventListener("click", function () {
          setLimit(n);
        });
        opts.appendChild(b);
      });
    }

    var dueBlock = document.getElementById("due-today-block");
    if (dueBlock && !document.getElementById("daily-limit-home")) {
      var home = document.createElement("div");
      home.id = "daily-limit-home";
      home.className = "daily-limit-home";
      home.innerHTML =
        '<span id="daily-limit-home-text"></span> \u00b7 <button type="button" class="btn-link" id="daily-limit-home-edit">\u0438\u0437\u043c\u0435\u043d\u0438\u0442\u044c</button>';
      dueBlock.appendChild(home);
      document.getElementById("daily-limit-home-edit").addEventListener("click", function () {
        var nav = document.querySelector('.nav-btn[data-view="progress"]');
        if (nav) nav.click();
        setTimeout(function () {
          var c = document.getElementById("daily-limit-card");
          if (c) c.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      });
    }
    return card;
  }

  function renderUi() {
    ensureUi();
    var st = load();
    if (window.SRS) SRS.migrateState(st);
    var lim = getLimit(st);
    var used = getNewToday(st);
    var status = document.getElementById("daily-limit-status");
    if (status) {
      if (lim === 0) status.textContent = "\u0421\u0435\u0433\u043e\u0434\u043d\u044f \u043d\u043e\u0432\u044b\u0445: " + used + " \u00b7 \u043b\u0438\u043c\u0438\u0442 \u043d\u0435 \u0437\u0430\u0434\u0430\u043d";
      else status.textContent = "\u0421\u0435\u0433\u043e\u0434\u043d\u044f: " + used + " \u0438\u0437 " + lim + " \u043d\u043e\u0432\u044b\u0445";
    }
    var homeText = document.getElementById("daily-limit-home-text");
    if (homeText) {
      if (lim === 0) homeText.textContent = "\u041d\u043e\u0432\u044b\u0445 \u0441\u0435\u0433\u043e\u0434\u043d\u044f: " + used + " (\u0431\u0435\u0437 \u043b\u0438\u043c\u0438\u0442\u0430)";
      else homeText.textContent = "\u041d\u043e\u0432\u044b\u0445 \u0441\u0435\u0433\u043e\u0434\u043d\u044f: " + used + " / " + lim;
    }
    document.querySelectorAll(".daily-limit-btn").forEach(function (b) {
      var n = parseInt(b.dataset.limit, 10);
      b.classList.toggle("active", n === lim);
    });
  }

  function toast(msg) {
    var old = document.getElementById("ep-new-limit-toast");
    if (old) old.remove();
    var t = document.createElement("div");
    t.id = "ep-new-limit-toast";
    t.className = "ep-due-toast show";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () {
      t.classList.remove("show");
      setTimeout(function () {
        t.remove();
      }, 300);
    }, 2800);
  }

  function boot() {
    renderUi();
    document.addEventListener(
      "click",
      function (e) {
        var nav = e.target.closest && e.target.closest('.nav-btn[data-view="progress"]');
        if (nav) setTimeout(renderUi, 50);
      },
      true
    );
    setInterval(renderUi, 8000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(boot, 900);
    });
  } else {
    setTimeout(boot, 900);
  }

  window.DailyLimit = {
    tryConsumeNew: tryConsumeNew,
    remainingNew: function () {
      var st = load();
      if (window.SRS) SRS.migrateState(st);
      return remainingNew(st);
    },
    getLimit: function () {
      return getLimit(load());
    },
    renderUi: renderUi,
    toast: toast,
    isNewWord: function (id) {
      var st = load();
      if (window.SRS) SRS.migrateState(st);
      return isNewWord(st, id);
    },
  };
})();
