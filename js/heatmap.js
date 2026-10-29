/* Activity heatmap — 12 weeks (GitHub-style) */
(function () {
  "use strict";
  var STORAGE_KEY = "english-practice-v1";

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function levelClass(n) {
    n = n || 0;
    if (n <= 0) return "";
    if (n <= 2) return "l1";
    if (n <= 5) return "l2";
    if (n <= 12) return "l3";
    return "l4";
  }

  function todayISO() {
    if (window.SRS && SRS.todayISO) return SRS.todayISO();
    return new Date().toISOString().slice(0, 10);
  }

  function ensureHost() {
    var host = document.getElementById("activity-heatmap");
    if (host) return host;
    var progCards = document.querySelector("#view-progress .progress-cards");
    if (!progCards) return null;
    var card = document.createElement("div");
    card.className = "progress-card heatmap-card";
    card.id = "activity-heatmap-card";
    card.innerHTML = "<h3>Активность (12 недель)</h3><div id=\"activity-heatmap\"></div>";
    progCards.appendChild(card);
    return document.getElementById("activity-heatmap");
  }

  function renderHeatmap() {
    var host = ensureHost();
    if (!host) return;
    var st = load();
    if (window.SRS && SRS.migrateState) SRS.migrateState(st);
    var activity = st.activity || {};
    var today = new Date(todayISO() + "T12:00:00");
    var dow = (today.getDay() + 6) % 7;
    var end = new Date(today);
    var start = new Date(today);
    start.setDate(start.getDate() - (11 * 7 + dow));

    var cells = [];
    var d = new Date(start);
    var activeDays = 0;
    var totalReps = 0;
    while (d <= end) {
      var iso = d.toISOString().slice(0, 10);
      var n = activity[iso] || 0;
      if (n > 0) {
        activeDays++;
        totalReps += n;
      }
      cells.push({ iso: iso, n: n, title: iso + ": " + n + " повтор." });
      d.setDate(d.getDate() + 1);
    }

    var html =
      '<div class="heatmap-wrap"><div class="heatmap-grid" role="img" aria-label="Активность за 12 недель">';
    cells.forEach(function (c) {
      html +=
        '<div class="hm-cell ' +
        levelClass(c.n) +
        '" title="' +
        c.title +
        '"></div>';
    });
    html += "</div></div>";
    html +=
      '<div class="heatmap-legend"><span>Меньше</span>' +
      '<span class="hm-cell"></span><span class="hm-cell l1"></span><span class="hm-cell l2"></span>' +
      '<span class="hm-cell l3"></span><span class="hm-cell l4"></span><span>Больше</span></div>';
    html +=
      '<div class="heatmap-stats muted">Активных дней: <strong>' +
      activeDays +
      "</strong> · Повторений: <strong>" +
      totalReps +
      "</strong> · Сегодня: <strong>" +
      (activity[todayISO()] || 0) +
      "</strong></div>";
    host.innerHTML = html;
  }

  function boot() {
    renderHeatmap();
    setInterval(renderHeatmap, 6000);
    document.querySelectorAll('.nav-btn[data-view="progress"]').forEach(function (btn) {
      btn.addEventListener("click", function () {
        setTimeout(renderHeatmap, 50);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(boot, 600);
    });
  } else {
    setTimeout(boot, 600);
  }

  window.EPHeatmap = { render: renderHeatmap };
})();
