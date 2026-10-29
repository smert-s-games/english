/* app.js v20 - CDN app + SRS migrate/due on boot */
(function () {
  "use strict";
  var CDN = "https://cdn.jsdelivr.net/gh/smert-s-games/english@9eaece21677c1d1115d3ab79567833fdfc30f8c0/app.js";
  var s = document.createElement("script");
  s.src = CDN;
  s.onload = function () {
    try {
      if (window.SRS) {
        var raw = localStorage.getItem("english-practice-v1");
        if (raw) {
          var st = JSON.parse(raw);
          SRS.migrateState(st);
          localStorage.setItem("english-practice-v1", JSON.stringify(st));
        }
        var due = document.getElementById("due-today-count");
        if (due) {
          var st2 = JSON.parse(localStorage.getItem("english-practice-v1") || "{}");
          due.textContent = String(SRS.countDue(st2));
        }
      }
    } catch (e) { console.warn(e); }
  };
  s.onerror = function () { console.error("app CDN load failed"); };
  document.head.appendChild(s);
})();
