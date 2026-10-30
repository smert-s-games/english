/* Quiz type: assemble sentence from shuffled words */
(function () {
  "use strict";
  var active = false;
  var questions = [];
  var qIndex = 0;
  var score = 0;
  var answered = false;
  var picked = [];
  var tokens = [];

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function tokenize(sentence) {
    return String(sentence || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  function buildQuestions(count) {
    if (typeof WORDS === "undefined") return [];
    var pool = WORDS.filter(function (w) {
      var n = tokenize(w.example).length;
      return w.example && n >= 3 && n <= 12;
    });
    return shuffle(pool)
      .slice(0, count)
      .map(function (w) {
        var correct = tokenize(w.example);
        return {
          wordId: w.id,
          en: w.en,
          correctTokens: correct,
          correctText: correct.join(" "),
          exampleRu: w.exampleRu || "",
        };
      });
  }

  function ensureCard() {
    var menu = document.getElementById("quiz-menu");
    if (!menu || document.getElementById("assemble-card")) return;
    var card = document.createElement("button");
    card.type = "button";
    card.className = "quiz-type-card";
    card.id = "assemble-card";
    card.innerHTML =
      "<strong>\u0421\u043e\u0431\u0435\u0440\u0438 \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u0435</strong><span>\u0421\u043b\u043e\u0432\u0430 \u0432\u043f\u0435\u0440\u0435\u043c\u0435\u0448\u043a\u0443 \u2192 \u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u044b\u0439 \u043f\u043e\u0440\u044f\u0434\u043e\u043a</span>";
    card.addEventListener("click", openSetup);
    menu.appendChild(card);
  }

  function openSetup() {
    questions = buildQuestions(10);
    if (!questions.length) {
      alert("\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u0439.");
      return;
    }
    qIndex = 0;
    score = 0;
    answered = false;
    active = true;
    document.querySelectorAll("section.view").forEach(function (s) {
      s.classList.remove("active");
    });
    var v = document.getElementById("view-quiz");
    if (v) v.classList.add("active");
    ["quiz-menu", "quiz-setup", "quiz-result"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.add("hidden");
    });
    var area = document.getElementById("quiz-area");
    if (area) area.classList.remove("hidden");
    document.body.classList.add("assemble-on");
    showQuestion();
  }

  function showQuestion() {
    answered = false;
    picked = [];
    var q = questions[qIndex];
    tokens = shuffle(q.correctTokens);
    var total = questions.length;
    document.getElementById("quiz-q-num").textContent = qIndex + 1 + " / " + total;
    document.getElementById("quiz-score").textContent = score + " \u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u044b\u0445";
    document.getElementById("quiz-progress-fill").style.width =
      (total ? (qIndex / total) * 100 : 0) + "%";
    document.getElementById("quiz-feedback").textContent = "";
    document.getElementById("quiz-feedback").className = "quiz-feedback";
    document.getElementById("quiz-continue").classList.add("hidden");
    document.getElementById("quiz-input-wrap").classList.add("hidden");
    document.getElementById("quiz-options").innerHTML = "";
    document.getElementById("quiz-question").innerHTML =
      '<div class="assemble-hint muted">\u0421\u043e\u0431\u0435\u0440\u0438 \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u0435 (\u0441\u043b\u043e\u0432\u043e: <strong>' +
      escapeHtml(q.en) +
      "</strong>)</div>" +
      (q.exampleRu ? '<div class="muted">' + escapeHtml(q.exampleRu) + "</div>" : "") +
      '<div class="assemble-answer" id="assemble-answer"></div>' +
      '<div class="assemble-bank" id="assemble-bank"></div>' +
      '<button type="button" class="btn btn-primary" id="assemble-check" style="margin-top:12px">\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c</button>';
    renderBank();
    renderAnswer();
    document.getElementById("assemble-check").addEventListener("click", check);
  }

  function renderBank() {
    var bank = document.getElementById("assemble-bank");
    if (!bank) return;
    bank.innerHTML = "";
    tokens.forEach(function (tok, i) {
      if (picked.indexOf(i) >= 0) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "assemble-chip";
      b.textContent = tok;
      b.addEventListener("click", function () {
        if (answered) return;
        picked.push(i);
        renderBank();
        renderAnswer();
      });
      bank.appendChild(b);
    });
  }

  function renderAnswer() {
    var ans = document.getElementById("assemble-answer");
    if (!ans) return;
    ans.innerHTML = "";
    if (!picked.length) {
      ans.innerHTML = '<span class="muted">\u041d\u0430\u0436\u0438\u043c\u0430\u0439 \u0441\u043b\u043e\u0432\u0430 \u043d\u0438\u0436\u0435\u2026</span>';
      return;
    }
    picked.forEach(function (ti, pi) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "assemble-chip chosen";
      b.textContent = tokens[ti];
      b.addEventListener("click", function () {
        if (answered) return;
        picked.splice(pi, 1);
        renderBank();
        renderAnswer();
      });
      ans.appendChild(b);
    });
  }

  function check() {
    if (answered) return;
    var q = questions[qIndex];
    var user = picked.map(function (i) {
      return tokens[i];
    });
    answered = true;
    var ok =
      user.length === q.correctTokens.length &&
      user.every(function (t, i) {
        return t === q.correctTokens[i];
      });
    var fb = document.getElementById("quiz-feedback");
    if (ok) {
      score++;
      fb.textContent = "\u2713 \u0412\u0435\u0440\u043d\u043e!";
      fb.className = "quiz-feedback correct";
    } else {
      fb.innerHTML =
        "\u2717 \u041d\u0435\u0432\u0435\u0440\u043d\u043e. \u041f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u043e: <strong>" +
        escapeHtml(q.correctText) +
        "</strong>";
      fb.className = "quiz-feedback wrong";
    }
    document.getElementById("quiz-score").textContent = score + " \u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u044b\u0445";
    document.getElementById("quiz-continue").classList.remove("hidden");
    var chk = document.getElementById("assemble-check");
    if (chk) chk.disabled = true;
  }

  function next() {
    if (!active || !answered) return;
    qIndex++;
    if (qIndex >= questions.length) {
      finish();
      return;
    }
    showQuestion();
  }

  function finish() {
    active = false;
    document.body.classList.remove("assemble-on");
    document.getElementById("quiz-area").classList.add("hidden");
    var result = document.getElementById("quiz-result");
    result.classList.remove("hidden");
    var total = questions.length;
    document.getElementById("result-score").textContent = score + " / " + total;
    var pct = total ? Math.round((score / total) * 100) : 0;
    document.getElementById("result-percent").textContent = pct + "%";
    document.getElementById("result-message").textContent =
      pct >= 80 ? "\u041e\u0442\u043b\u0438\u0447\u043d\u043e \u0441\u043e\u0431\u0440\u0430\u043d\u043e!" : "\u0415\u0449\u0451 \u043f\u043e\u0442\u0440\u0435\u043d\u0438\u0440\u0443\u0439 \u043f\u043e\u0440\u044f\u0434\u043e\u043a \u0441\u043b\u043e\u0432.";
    document.getElementById("result-mistakes").classList.add("hidden");
  }

  document.addEventListener(
    "click",
    function (e) {
      if (!active) return;
      if (e.target.id === "quiz-next-btn" || (e.target.closest && e.target.closest("#quiz-next-btn"))) {
        e.preventDefault();
        e.stopImmediatePropagation();
        next();
      }
    },
    true
  );

  document.addEventListener(
    "keydown",
    function (e) {
      if (!active) return;
      if (e.key === "Enter" && answered) {
        e.preventDefault();
        next();
      }
      if (e.key === "Escape") {
        active = false;
        document.body.classList.remove("assemble-on");
        document.getElementById("quiz-area").classList.add("hidden");
        document.getElementById("quiz-menu").classList.remove("hidden");
      }
    },
    true
  );

  function boot() {
    ensureCard();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(boot, 950);
    });
  } else setTimeout(boot, 950);

  window.AssembleQuiz = {
    isActive: function () {
      return active;
    },
  };
})();
