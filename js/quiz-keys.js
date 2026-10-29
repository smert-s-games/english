/* Desktop quiz keyboard + exit */
(function () {
  "use strict";

  function isQuizVisible() {
    var area = document.getElementById("quiz-area");
    return area && !area.classList.contains("hidden");
  }

  function ensureExitBtn() {
    var area = document.getElementById("quiz-area");
    if (!area || document.getElementById("quiz-exit-btn")) return;
    var bar = document.createElement("div");
    bar.className = "quiz-top-bar";
    bar.innerHTML =
      '<button type="button" class="btn btn-ghost quiz-exit-btn" id="quiz-exit-btn" title="Выйти (Esc)">← Выйти</button>' +
      '<span class="quiz-kb-hint muted">1–4 · Enter · Esc</span>';
    area.insertBefore(bar, area.firstChild);
    document.getElementById("quiz-exit-btn").addEventListener("click", exitToMenu);
  }

  function exitToMenu() {
    var area = document.getElementById("quiz-area");
    var menu = document.getElementById("quiz-menu");
    var setup = document.getElementById("quiz-setup");
    var result = document.getElementById("quiz-result");
    var cont = document.getElementById("quiz-continue");
    if (area) area.classList.add("hidden");
    if (setup) setup.classList.add("hidden");
    if (result) result.classList.add("hidden");
    if (cont) cont.classList.add("hidden");
    if (menu) menu.classList.remove("hidden");
  }

  document.addEventListener("keydown", function (e) {
    if (!isQuizVisible()) return;
    var tag = (e.target && e.target.tagName) || "";
    var isInput = tag === "INPUT" || tag === "TEXTAREA";

    if (e.key === "Escape") {
      e.preventDefault();
      exitToMenu();
      return;
    }

    if (!isInput && e.key >= "1" && e.key <= "4") {
      var opts = document.querySelectorAll("#quiz-options .quiz-option:not([disabled])");
      var idx = parseInt(e.key, 10) - 1;
      if (opts[idx]) {
        e.preventDefault();
        opts[idx].click();
      }
      return;
    }

    if ((e.key === "Enter" || e.key === " ") && !isInput) {
      var cont = document.getElementById("quiz-continue");
      var next = document.getElementById("quiz-next-btn");
      if (cont && !cont.classList.contains("hidden") && next) {
        e.preventDefault();
        next.click();
      }
    }
  });

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
    ensureExitBtn();
    var optsEl = document.getElementById("quiz-options");
    if (!optsEl) return;
    var obs = new MutationObserver(function () {
      badgeOptions();
      ensureExitBtn();
    });
    obs.observe(optsEl, { childList: true, subtree: true });
    var area = document.getElementById("quiz-area");
    if (area) {
      new MutationObserver(ensureExitBtn).observe(area, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserve);
  } else {
    startObserve();
  }
})();
