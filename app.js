/* English Practice App v7 — RESTORE in progress - load full from CDN fallback */
(function () {
  "use strict";
  document.addEventListener("DOMContentLoaded", function () {
    var main = document.querySelector(".main");
    if (main) {
      var n = document.createElement("p");
      n.style.cssText = "padding:20px;text-align:center;color:#ef4444";
      n.textContent = "Обновление приложения… Обновите страницу через минуту (Ctrl+F5).";
      main.prepend(n);
    }
  });
  // Redirect load: try to fetch working version
  var s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/gh/smert-s-games/english@9eaece21677c1d1115d3ab79567833fdfc30f8c0/app.js";
  s.onerror = function () {
    console.error("Failed to load fallback app.js");
  };
  document.head.appendChild(s);
})();
