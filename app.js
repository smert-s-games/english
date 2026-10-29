/* English Practice App — load full from known-good commit */
(function () {
  "use strict";
  var s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/gh/smert-s-games/english@9eaece21677c1d1115d3ab79567833fdfc30f8c0/app.js";
  s.onerror = function () {
    console.error("Failed to load app.js");
  };
  document.head.appendChild(s);
})();
