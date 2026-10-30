/* Progress statistics: SRS levels, daily goal, weak categories */
(function () {
  "use strict";
  var STORAGE_KEY = "english-practice-v1";
  var GOAL_OPTIONS = [10, 20, 30, 50, 100];

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

  function catLabel(code) {
    if (window.CATEGORIES && CATEGORIES[code]) return CATEGORIES[code];
    var map = {
      interview: "\u0421\u043e\u0431\u0435\u0441\u0435\u0434\u043e\u0432\u0430\u043d\u0438\u0435",
      travel: "\u041f\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0438\u044f",
      daily: "\u041f\u043e\u0432\u0441\u0435\u0434\u043d\u0435\u0432\u043d\u043e\u0435",
      work: "\u0420\u0430\u0431\u043e\u0442\u0430",
      study: "\u0423\u0447\u0451\u0431\u0430",
      home: "\u0414\u043e\u043c",
      food: "\u0415\u0434\u0430",
      health: "\u0417\u0434\u043e\u0440\u043e\u0432\u044c\u0435",
    };
    return map[code] || code || "\u0414\u0440\u0443\u0433\u043e\u0435";
  }

  function ensureCard() {
    var prog = document.querySelector("#view-progress .progress-cards");
    if (!prog) return null;
    var card = document.getElementById("srs-stats-card");
    if (card) return card;
    card = document.createElement("div");
    card.id = "srs-stats-card";
    card.className = "progress-card srs-stats-card";
    card.innerHTML =
      "<h3>\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430 SRS</h3>" +
      '<div class="srs-levels" id="srs-levels"></div>' +
      '<h3 class="srs-sub">\u0414\u043d\u0435\u0432\u043d\u0430\u044f \u0446\u0435\u043b\u044c \u043f\u043e\u0432\u0442\u043e\u0440\u0435\u043d\u0438\u0439</h3>' +
      '<div class="daily-goal-block">' +
      '<div class="daily-goal-bar-wrap"><div class="daily-goal-bar" id="daily-goal-bar"></div></div>' +
      '<p class="daily-goal-status muted" id="daily-goal-status"></p>' +
      '<div class="daily-goal-options" id="daily-goal-options"></div>' +
      "</div>" +
      '<h3 class="srs-sub">\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438</h3>' +
      '<div id="srs-cat-stats"></div>' +
      '<p class="muted srs-weak-title" id="srs-weak-title"></p>' +
      '<ul class="srs-weak-list" id="srs-weak-list"></ul>';
    var hm = document.getElementById("activity-heatmap-card");
    if (hm) prog.insertBefore(card, hm);
    else prog.appendChild(card);

    var opts = document.getElementById("daily-goal-options");
    GOAL_OPTIONS.forEach(function (n) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn btn-ghost daily-goal-btn";
      b.dataset.goal = String(n);
      b.textContent = String(n);
      b.addEventListener("click", function () {
        var st = load();
        st.dailyReviewGoal = n;
        save(st);
        render();
      });
      opts.appendChild(b);
    });
    return card;
  }

  function levelCounts(st) {
    var counts = [0, 0, 0, 0, 0, 0];
    var totalWords = typeof WORDS !== "undefined" ? WORDS.length : 0;
    var seen = {};
    var map = st.learned || {};
    Object.keys(map).forEach(function (id) {
      var e = window.SRS ? SRS.normalizeEntry(map[id]) : map[id];
      var lv = Math.max(0, Math.min(5, (e && e.level) | 0));
      counts[lv]++;
      seen[id] = true;
    });
    var untouched = 0;
    if (typeof WORDS !== "undefined") {
      WORDS.forEach(function (w) {
        if (!seen[String(w.id)]) untouched++;
      });
    }
    counts[0] += untouched;
    return {
      counts: counts,
      total: totalWords || counts.reduce(function (a, b) {
        return a + b;
      }, 0),
    };
  }

  function categoryStats(st) {
    if (typeof WORDS === "undefined") return [];
    var byCat = {};
    WORDS.forEach(function (w) {
      var c = w.cat || "other";
      if (!byCat[c]) byCat[c] = { code: c, total: 0, errors: 0, learned: 0, levels: 0 };
      byCat[c].total++;
      var e = window.SRS ? SRS.getEntry(st, w.id) : null;
      if (e && e.level >= 4) byCat[c].learned++;
      if (e && e.level > 0) byCat[c].levels++;
      if (e && (e.lapses | 0) > 0) byCat[c].errors += e.lapses | 0;
    });
    (st.quizHistory || []).forEach(function (h) {
      (h.mistakes || []).forEach(function (m) {
        if (!m.wordId) return;
        var w = null;
        for (var i = 0; i < WORDS.length; i++) {
          if (String(WORDS[i].id) === String(m.wordId)) {
            w = WORDS[i];
            break;
          }
        }
        if (!w) return;
        var c = w.cat || "other";
        if (!byCat[c]) byCat[c] = { code: c, total: 0, errors: 0, learned: 0, levels: 0 };
        byCat[c].errors++;
      });
    });
    return Object.keys(byCat)
      .map(function (k) {
        return byCat[k];
      })
      .sort(function (a, b) {
        return b.total - a.total;
      });
  }

  function render() {
    ensureCard();
    var st = load();
    if (window.SRS) SRS.migrateState(st);

    var lc = levelCounts(st);
    var levelsEl = document.getElementById("srs-levels");
    if (levelsEl) {
      var labels = [
        "\u041d\u043e\u0432\u044b\u0435 (0)",
        "\u0423\u0440. 1",
        "\u0423\u0440. 2",
        "\u0423\u0440. 3",
        "\u0423\u0440. 4 \u2713",
        "\u0423\u0440. 5 \u2713",
      ];
      var max = Math.max.apply(null, lc.counts.concat([1]));
      var html = "";
      for (var i = 0; i <= 5; i++) {
        var pct = Math.round((lc.counts[i] / max) * 100);
        var share = lc.total ? Math.round((lc.counts[i] / lc.total) * 100) : 0;
        html +=
          '<div class="srs-level-row">' +
          '<span class="srs-level-label">' +
          labels[i] +
          "</span>" +
          '<div class="srs-level-bar-wrap"><div class="srs-level-bar l' +
          i +
          '" style="width:' +
          pct +
          '%"></div></div>' +
          '<span class="srs-level-n">' +
          lc.counts[i] +
          " <small>(" +
          share +
          "%)</small></span></div>";
      }
      levelsEl.innerHTML = html;
    }

    var goal = st.dailyReviewGoal != null ? st.dailyReviewGoal | 0 : 30;
    if (st.dailyReviewGoal == null) {
      st.dailyReviewGoal = 30;
      save(st);
    }
    var done = (st.activity && st.activity[today()]) || 0;
    var gPct = goal ? Math.min(100, Math.round((done / goal) * 100)) : 0;
    var bar = document.getElementById("daily-goal-bar");
    if (bar) bar.style.width = gPct + "%";
    var status = document.getElementById("daily-goal-status");
    if (status) {
      status.textContent =
        done >= goal
          ? "\u0426\u0435\u043b\u044c \u043d\u0430 \u0441\u0435\u0433\u043e\u0434\u043d\u044f \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0430: " + done + " / " + goal
          : "\u0421\u0435\u0433\u043e\u0434\u043d\u044f: " + done + " / " + goal + " \u043f\u043e\u0432\u0442\u043e\u0440\u0435\u043d\u0438\u0439";
    }
    document.querySelectorAll(".daily-goal-btn").forEach(function (b) {
      b.classList.toggle("active", parseInt(b.dataset.goal, 10) === goal);
    });

    var cats = categoryStats(st);
    var catEl = document.getElementById("srs-cat-stats");
    if (catEl) {
      var ch = "";
      cats.forEach(function (c) {
        var learnPct = c.total ? Math.round((c.learned / c.total) * 100) : 0;
        ch +=
          '<div class="srs-cat-row">' +
          "<span>" +
          catLabel(c.code) +
          "</span>" +
          '<div class="bar-mini"><div style="width:' +
          learnPct +
          '%"></div></div>' +
          "<span>" +
          c.learned +
          "/" +
          c.total +
          (c.errors ? " \u00b7 \u043e\u0448. " + c.errors : "") +
          "</span></div>";
      });
      catEl.innerHTML = ch || '<p class="muted">\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445</p>';
    }

    var weak = cats
      .filter(function (c) {
        return c.errors > 0;
      })
      .sort(function (a, b) {
        return b.errors - a.errors;
      })
      .slice(0, 5);
    var wt = document.getElementById("srs-weak-title");
    var wl = document.getElementById("srs-weak-list");
    if (wt && wl) {
      if (!weak.length) {
        wt.textContent = "\u0421\u043b\u0430\u0431\u044b\u0435 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438: \u043f\u043e\u043a\u0430 \u043d\u0435\u0442 \u043e\u0448\u0438\u0431\u043e\u043a \u0432 \u0438\u0441\u0442\u043e\u0440\u0438\u0438.";
        wl.innerHTML = "";
      } else {
        wt.textContent = "\u0421\u043b\u0430\u0431\u044b\u0435 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438 (\u043f\u043e \u043e\u0448\u0438\u0431\u043a\u0430\u043c \u0438 \u0441\u0440\u044b\u0432\u0430\u043c):";
        wl.innerHTML = weak
          .map(function (c) {
            return (
              "<li><strong>" +
              catLabel(c.code) +
              "</strong> \u2014 \u043e\u0448\u0438\u0431\u043e\u043a/\u0441\u0440\u044b\u0432\u043e\u0432: " +
              c.errors +
              "</li>"
            );
          })
          .join("");
      }
    }
  }

  function boot() {
    render();
    document.addEventListener(
      "click",
      function (e) {
        var nav = e.target.closest && e.target.closest('.nav-btn[data-view="progress"]');
        if (nav) setTimeout(render, 80);
      },
      true
    );
    setInterval(render, 10000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(boot, 950);
    });
  } else {
    setTimeout(boot, 950);
  }

  window.SrsStats = { render: render };
})();
