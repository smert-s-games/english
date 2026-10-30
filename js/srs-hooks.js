/* SRS hooks: quizzes — onCorrect/onWrong/onAlmost, almost UI, requeue 3–5 */
(function () {
  "use strict";
  var STORAGE_KEY = "english-practice-v1";
  var lastHandledFb = "";
  var requeue = [];
  var injectItem = null;
  var injectAnswered = false;

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
  }

  function bumpActivity(st) {
    if (!window.SRS) return;
    var day = SRS.todayISO();
    if (!st.activity) st.activity = {};
    st.activity[day] = (st.activity[day] || 0) + 1;
  }

  function persistEntry(id, mutator) {
    if (!window.SRS || id == null) return;
    var st = load();
    SRS.migrateState(st);
    var entry = mutator(SRS.getEntry(st, id));
    SRS.setEntry(st, id, entry);
    bumpActivity(st);
    save(st);
    var due = document.getElementById("due-today-count");
    if (due) due.textContent = String(SRS.countDue(st));
    if (window.EnglishAuth && EnglishAuth.scheduleCloudSave) EnglishAuth.scheduleCloudSave();
    if (window.SrsStats && SrsStats.render) SrsStats.render();
    if (window.DailyLimit && DailyLimit.renderUi) DailyLimit.renderUi();
  }

  function onCorrect(id) {
    persistEntry(id, function (e) {
      return SRS.onCorrect(e);
    });
  }
  function onWrong(id) {
    persistEntry(id, function (e) {
      return SRS.onWrong(e);
    });
  }
  function onAlmost(id) {
    persistEntry(id, function (e) {
      return SRS.onAlmost(e);
    });
  }

  function findWordByPrompt() {
    if (typeof WORDS === "undefined") return null;
    var qEl = document.getElementById("quiz-question");
    if (!qEl) return null;
    var line = (qEl.textContent || "").trim().split("\n")[0].trim();
    if (!line) return null;
    for (var i = 0; i < WORDS.length; i++) {
      if (WORDS[i].en === line || WORDS[i].ru === line) return WORDS[i];
    }
    return null;
  }

  function scheduleRequeue(item) {
    if (!item || item.wordId == null) return;
    var left = 3 + Math.floor(Math.random() * 3);
    requeue.push({ left: left, item: item });
  }

  function tickRequeue() {
    requeue.forEach(function (r) {
      r.left -= 1;
    });
  }

  function popDueRequeue() {
    for (var i = 0; i < requeue.length; i++) {
      if (requeue[i].left <= 0) {
        var item = requeue[i].item;
        requeue.splice(i, 1);
        return item;
      }
    }
    return null;
  }

  function showFeedback(kind, html) {
    var fb = document.getElementById("quiz-feedback");
    if (!fb) return;
    fb.innerHTML = html;
    fb.className = "quiz-feedback " + kind;
    lastHandledFb = fb.className + "|" + (fb.textContent || "").slice(0, 80);
    var cont = document.getElementById("quiz-continue");
    if (cont) cont.classList.remove("hidden");
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderInject(item) {
    injectItem = item;
    injectAnswered = false;
    var qEl = document.getElementById("quiz-question");
    var optsEl = document.getElementById("quiz-options");
    var inputWrap = document.getElementById("quiz-input-wrap");
    var fb = document.getElementById("quiz-feedback");
    var cont = document.getElementById("quiz-continue");
    if (fb) {
      fb.textContent = "";
      fb.className = "quiz-feedback";
    }
    if (cont) cont.classList.add("hidden");
    if (qEl) {
      qEl.innerHTML =
        escapeHtml(item.ru || item.prompt) +
        '<div class="muted srs-requeue-tag">\u041f\u043e\u0432\u0442\u043e\u0440 \u043e\u0448\u0438\u0431\u043a\u0438</div>';
    }
    if (optsEl) optsEl.innerHTML = "";
    if (inputWrap) {
      inputWrap.classList.remove("hidden");
      var inp = document.getElementById("quiz-input");
      if (inp) {
        inp.value = "";
        inp.focus();
      }
    }
  }

  function wireTypedCheck() {
    var check = document.getElementById("quiz-check");
    var input = document.getElementById("quiz-input");
    if (!check || check.dataset.srsQuiz) return;
    check.dataset.srsQuiz = "1";

    function handleTyped(e) {
      if (!window.SRS) return;
      var inp = document.getElementById("quiz-input");
      var val = ((inp && inp.value) || "").trim();

      if (injectItem && !injectAnswered) {
        e.preventDefault();
        e.stopImmediatePropagation();
        injectAnswered = true;
        var grade = SRS.gradeTyped(val, injectItem.correct || injectItem.en);
        if (grade === "correct") {
          onCorrect(injectItem.wordId);
          showFeedback("correct", "\u2713 \u0412\u0435\u0440\u043d\u043e!");
        } else if (grade === "almost") {
          onAlmost(injectItem.wordId);
          showFeedback(
            "almost",
            "\u2248 \u041f\u043e\u0447\u0442\u0438 \u0432\u0435\u0440\u043d\u043e. \u041f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u043e: <strong>" +
              escapeHtml(injectItem.correct || injectItem.en) +
              "</strong>"
          );
        } else {
          onWrong(injectItem.wordId);
          scheduleRequeue(injectItem);
          showFeedback(
            "wrong",
            "\u2717 \u041d\u0435\u0432\u0435\u0440\u043d\u043e. \u041f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u044b\u0439 \u043e\u0442\u0432\u0435\u0442: <strong>" +
              escapeHtml(injectItem.correct || injectItem.en) +
              "</strong>"
          );
        }
        return;
      }

      var w = findWordByPrompt();
      if (!w) return;
      var inputWrap = document.getElementById("quiz-input-wrap");
      if (!inputWrap || inputWrap.classList.contains("hidden")) return;

      var g = SRS.gradeTyped(val, w.en);
      if (g === "almost") {
        e.preventDefault();
        e.stopImmediatePropagation();
        onAlmost(w.id);
        showFeedback(
          "almost",
          "\u2248 \u041f\u043e\u0447\u0442\u0438 \u0432\u0435\u0440\u043d\u043e. \u041f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u043e: <strong>" +
            escapeHtml(w.en) +
            "</strong>"
        );
        if (inp) inp.blur();
      }
    }

    check.addEventListener("click", handleTyped, true);
    if (input) {
      input.addEventListener(
        "keydown",
        function (e) {
          if (e.key === "Enter") handleTyped(e);
        },
        true
      );
    }
  }

  function wireOptionCapture() {
    document.addEventListener(
      "click",
      function (e) {
        var btn = e.target.closest && e.target.closest("#quiz-options .quiz-option");
        if (!btn || !window.SRS) return;
        if (injectItem) return;
      },
      true
    );
  }

  function onQuizFeedback() {
    var fb = document.getElementById("quiz-feedback");
    if (!fb || !window.SRS) return;
    if (fb.classList.contains("almost")) return;
    var key = fb.className + "|" + (fb.textContent || "").slice(0, 80);
    if (key === lastHandledFb) return;
    if (!fb.classList.contains("correct") && !fb.classList.contains("wrong")) return;
    lastHandledFb = key;

    if (injectItem) return;

    var w = findWordByPrompt();
    if (!w) return;

    if (fb.classList.contains("correct")) {
      onCorrect(w.id);
      return;
    }

    var inputWrap = document.getElementById("quiz-input-wrap");
    var inp = document.getElementById("quiz-input");
    if (inputWrap && !inputWrap.classList.contains("hidden") && inp) {
      var grade = SRS.gradeTyped(inp.value, w.en);
      if (grade === "almost") {
        onAlmost(w.id);
        showFeedback(
          "almost",
          "\u2248 \u041f\u043e\u0447\u0442\u0438 \u0432\u0435\u0440\u043d\u043e. \u041f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u043e: <strong>" +
            escapeHtml(w.en) +
            "</strong>"
        );
        return;
      }
    }
    onWrong(w.id);
    scheduleRequeue({
      wordId: w.id,
      en: w.en,
      ru: w.ru,
      prompt: w.ru,
      correct: w.en,
      isType: true,
    });
  }

  function wireContinue() {
    var next = document.getElementById("quiz-next-btn");
    if (!next || next.dataset.srsRequeue) return;
    next.dataset.srsRequeue = "1";
    next.addEventListener(
      "click",
      function (e) {
        if (injectItem && injectAnswered) {
          e.preventDefault();
          e.stopImmediatePropagation();
          injectItem = null;
          injectAnswered = false;
          tickRequeue();
          var due = popDueRequeue();
          if (due) {
            renderInject(due);
            return;
          }
          var cont = document.getElementById("quiz-continue");
          if (cont) cont.classList.add("hidden");
          next.dataset.srsRequeue = "";
          next.click();
          next.dataset.srsRequeue = "1";
          return;
        }

        if (injectItem && !injectAnswered) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }

        tickRequeue();
        var due2 = popDueRequeue();
        if (due2) {
          setTimeout(function () {
            renderInject(due2);
          }, 40);
        }
      },
      true
    );
  }

  function wireFeedbackObserver() {
    var fb = document.getElementById("quiz-feedback");
    if (!fb) return;
    new MutationObserver(function () {
      onQuizFeedback();
    }).observe(fb, { childList: true, characterData: true, subtree: true, attributes: true });
  }

  function boot() {
    wireTypedCheck();
    wireOptionCapture();
    wireContinue();
    wireFeedbackObserver();
    document.addEventListener(
      "click",
      function (e) {
        if (e.target.closest && e.target.closest("#quiz-to-menu, #quiz-again, [data-quiz-type]")) {
          requeue = [];
          injectItem = null;
        }
      },
      true
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(boot, 700);
    });
  } else {
    setTimeout(boot, 700);
  }

  window.SRSHooks = { renderDuePanel: function () {} };
})();
