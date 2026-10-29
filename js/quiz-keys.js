/* Keyboard helpers for quizzes (desktop) */
(function () {
  "use strict";

  function isQuizVisible() {
    var area = document.getElementById("quiz-area");
    return area && !area.classList.contains("hidden");
  }

  document.addEventListener("keydown", function (e) {
    if (!isQuizVisible()) return;
    var tag = (e.target && e.target.tagName) || "";
    var isInput = tag === "INPUT" || tag === "TEXTAREA";

    // 1-4: choose option
    if (!isInput && e.key >= "1" && e.key <= "4") {
      var opts = document.querySelectorAll("#quiz-options .quiz-option:not([disabled])");
      var idx = parseInt(e.key, 10) - 1;
      if (opts[idx]) {
        e.preventDefault();
        opts[idx].click();
      }
      return;
    }

    // Enter / Space: next after answer (when not typing)
    if ((e.key === "Enter" || e.key === " ") && !isInput) {
      var cont = document.getElementById("quiz-continue");
      var next = document.getElementById("quiz-next-btn");
      if (cont && !cont.classList.contains("hidden") && next) {
        e.preventDefault();
        next.click();
      }
    }
  });

  // Badge option buttons with 1-4
  function badgeOptions() {
    var opts = document.querySelectorAll("#quiz-options .quiz-option");
    opts.forEach(function (btn, i) {
      if (btn.querySelector(".opt-key")) return;
      var key = document.createElement("span");
      key.className = "opt-key";
      key.textContent = String(i + 1);
      var text = document.createElement("span");
      text.className = "opt-text";
      text.textContent = btn.textContent;
      btn.textContent = "";
      btn.appendChild(key);
      btn.appendChild(text);
    });
  }

  function startObserve() {
    var optsEl = document.getElementById("quiz-options");
    if (!optsEl) return;
    var obs = new MutationObserver(badgeOptions);
    obs.observe(optsEl, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserve);
  } else {
    startObserve();
  }
})();
