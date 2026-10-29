/* app.js v20 - CDN app + progress DB (SRS) bootstrap */
(function () {
  "use strict";
  var STORAGE_KEY = "english-practice-v1";
  var CDN = "https://cdn.jsdelivr.net/gh/smert-s-games/english@9eaece21677c1d1115d3ab79567833fdfc30f8c0/app.js";

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
    } catch (e) {
      console.warn("progress save failed", e);
    }
  }

  function ensureProgressDb() {
    if (!window.SRS) return;
    var st = loadRaw();
    SRS.migrateState(st);
    saveRaw(st);
    var due = document.getElementById("due-today-count");
    if (due) due.textContent = String(SRS.countDue(st));
    return st;
  }

  ensureProgressDb();

  var s = document.createElement("script");
  s.src = CDN;
  s.onload = function () {
    ensureProgressDb();
    setInterval(function () {
      if (!window.SRS) return;
      var st = loadRaw();
      SRS.migrateState(st);
      if (st._progressDirty) {
        delete st._progressDirty;
        saveRaw(st);
        var due = document.getElementById("due-today-count");
        if (due) due.textContent = String(SRS.countDue(st));
      }
    }, 4000);
  };
  s.onerror = function () {
    console.error("app CDN load failed");
  };
  document.head.appendChild(s);
})();
