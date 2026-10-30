/* Smart training: SRS-level tasks, category interleave, TTS audio */
(function () {
  "use strict";
  var STORAGE_KEY = "english-practice-v1";
  var DEFAULT_COUNT = 15;
  var active = false;
  var questions = [];
  var qIndex = 0;
  var score = 0;
  var answered = false;
  var mistakes = [];
  var speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

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

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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

  function uniqueDistractors(pool, correct, field, n) {
    var opts = [];
    var seen = {};
    seen[String(correct).toLowerCase()] = true;
    var shuffled = shuffle(pool);
    for (var i = 0; i < shuffled.length && opts.length < n; i++) {
      var v = shuffled[i][field];
      if (!v || seen[String(v).toLowerCase()]) continue;
      seen[String(v).toLowerCase()] = true;
      opts.push(v);
    }
    return opts;
  }

  function speak(text, lang) {
    if (!speechSupported || !text) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(String(text));
      u.lang = lang || "en-US";
      u.rate = 0.92;
      var voices = window.speechSynthesis.getVoices() || [];
      var en = voices.filter(function (v) {
        return /^en(-|_)/i.test(v.lang);
      });
      if (en.length) {
        var us = en.filter(function (v) {
          return /en-US/i.test(v.lang);
        });
        u.voice = us[0] || en[0];
      }
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  function speakQuestion(q) {
    if (!q) return;
    if (q.mode === "dictation") {
      speak(q.speakText || q.correct || q.en, "en-US");
      return;
    }
    if (q.mode === "en-ru" || q.mode === "blank") {
      speak(q.en || q.correct, "en-US");
      return;
    }
    if (q.mode === "ru-en" || q.mode === "type") {
      speak(q.en || q.correct, "en-US");
    }
  }

  function getLevel(w) {
    if (!window.SRS) return 0;
    var st = load();
    SRS.migrateState(st);
    return SRS.getEntry(st, w.id).level | 0;
  }

  function pickTaskType(level) {
    if (level <= 1) return "en-ru";
    if (level === 2) return "ru-en";
    if (level === 3) return "type";
    if (speechSupported) return "dictation";
    return "blank";
  }

  function makeBlankQuestion(w) {
    var ex = w.example || "";
    var en = w.en;
    if (ex && en) {
      var re = new RegExp("\\b" + en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
      if (re.test(ex)) {
        return {
          type: "type",
          mode: "blank",
          prompt: ex.replace(re, "______"),
          sub: "\u0412\u0441\u0442\u0430\u0432\u044c \u043f\u0440\u043e\u043f\u0443\u0449\u0435\u043d\u043d\u043e\u0435 \u0441\u043b\u043e\u0432\u043e",
          correct: en,
          speakText: en,
          wordId: w.id,
          en: w.en,
          ru: w.ru,
          cat: w.cat,
        };
      }
    }
    return {
      type: "type",
      mode: "type",
      prompt: w.ru,
      sub: "\u041d\u0430\u043f\u0438\u0448\u0438 \u043f\u043e-\u0430\u043d\u0433\u043b\u0438\u0439\u0441\u043a\u0438",
      correct: en,
      speakText: en,
      wordId: w.id,
      en: w.en,
      ru: w.ru,
      cat: w.cat,
    };
  }

  function makeDictationQuestion(w) {
    var speakText = w.example && w.example.indexOf(w.en) !== -1 ? w.example : w.en;
    return {
      type: "type",
      mode: "dictation",
      prompt: "\uD83D\uDD0A \u041f\u0440\u043e\u0441\u043b\u0443\u0448\u0430\u0439 \u0438 \u043d\u0430\u043f\u0438\u0448\u0438",
      sub: speakText === w.en ? "\u0421\u043b\u043e\u0432\u043e" : "\u0424\u0440\u0430\u0437\u0430 / \u0441\u043b\u043e\u0432\u043e \u0438\u0437 \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u044f",
      correct: w.en,
      speakText: speakText,
      wordId: w.id,
      en: w.en,
      ru: w.ru,
      cat: w.cat,
    };
  }

  function buildQuestion(w, pool) {
    var level = getLevel(w);
    var kind = pickTaskType(level);
    if (kind === "en-ru") {
      var wrong = uniqueDistractors(pool, w.ru, "ru", 3);
      return {
        type: "choice",
        mode: "en-ru",
        prompt: w.en,
        sub: w.tr ? "[" + w.tr + "]" : "\u0412\u044b\u0431\u0435\u0440\u0438 \u043f\u0435\u0440\u0435\u0432\u043e\u0434",
        correct: w.ru,
        options: shuffle([w.ru].concat(wrong)),
        speakText: w.en,
        wordId: w.id,
        en: w.en,
        ru: w.ru,
        cat: w.cat,
        level: level,
      };
    }
    if (kind === "ru-en") {
      var wrong2 = uniqueDistractors(pool, w.en, "en", 3);
      return {
        type: "choice",
        mode: "ru-en",
        prompt: w.ru,
        sub: "\u0412\u044b\u0431\u0435\u0440\u0438 \u0430\u043d\u0433\u043b\u0438\u0439\u0441\u043a\u043e\u0435 \u0441\u043b\u043e\u0432\u043e",
        correct: w.en,
        options: shuffle([w.en].concat(wrong2)),
        speakText: w.en,
        wordId: w.id,
        en: w.en,
        ru: w.ru,
        cat: w.cat,
        level: level,
      };
    }
    if (kind === "type") {
      return {
        type: "type",
        mode: "type",
        prompt: w.ru,
        sub: "\u041d\u0430\u043f\u0438\u0448\u0438 \u0441\u043b\u043e\u0432\u043e",
        correct: w.en,
        speakText: w.en,
        wordId: w.id,
        en: w.en,
        ru: w.ru,
        cat: w.cat,
        level: level,
      };
    }
    if (kind === "dictation") {
      var d = makeDictationQuestion(w);
      d.level = level;
      return d;
    }
    var q = makeBlankQuestion(w);
    q.level = level;
    return q;
  }

  function buildSession(count) {
    if (typeof WORDS === "undefined" || !WORDS.length) return [];
    var st = load();
    if (window.SRS) SRS.migrateState(st);
    var scored = WORDS.map(function (w) {
      var e = window.SRS ? SRS.getEntry(st, w.id) : { level: 0, due: null, lapses: 0 };
      var due = window.SRS && SRS.isDue(e) ? 2 : 0;
      var lapseBoost = Math.min(3, e.lapses | 0);
      var mid = e.level >= 1 && e.level <= 3 ? 1 : 0;
      return { w: w, score: due * 10 + lapseBoost * 3 + mid + Math.random() };
    });
    scored.sort(function (a, b) {
      return b.score - a.score;
    });
    var byCat = {};
    scored.forEach(function (s) {
      var c = s.w.cat || "other";
      if (!byCat[c]) byCat[c] = [];
      byCat[c].push(s.w);
    });
    var cats = shuffle(Object.keys(byCat));
    var picked = [];
    var used = {};
    var catIdx = 0;
    var guard = 0;
    while (picked.length < count && guard < count * 20) {
      guard++;
      var cat = cats[catIdx % cats.length];
      catIdx++;
      var bucket = byCat[cat];
      if (!bucket || !bucket.length) continue;
      var w = null;
      for (var i = 0; i < bucket.length; i++) {
        if (!used[bucket[i].id]) {
          w = bucket[i];
          break;
        }
      }
      if (!w) continue;
      used[w.id] = true;
      picked.push(w);
    }
    return picked.map(function (w) {
      return buildQuestion(w, WORDS);
    });
  }

  function applySrs(wordId, grade) {
    if (!window.SRS || wordId == null) return;
    var st = load();
    SRS.migrateState(st);
    var entry = SRS.getEntry(st, wordId);
    if (grade === "correct") entry = SRS.onCorrect(entry);
    else if (grade === "almost") entry = SRS.onAlmost(entry);
    else entry = SRS.onWrong(entry);
    SRS.setEntry(st, wordId, entry);
    var day = SRS.todayISO();
    if (!st.activity) st.activity = {};
    st.activity[day] = (st.activity[day] || 0) + 1;
    save(st);
    var due = document.getElementById("due-today-count");
    if (due) due.textContent = String(SRS.countDue(st));
  }

  function hideAllQuiz() {
    ["quiz-menu", "quiz-setup", "quiz-area", "quiz-result"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.add("hidden");
    });
  }

  function ensureMenuCard() {
    var menu = document.getElementById("quiz-menu");
    if (!menu || document.getElementById("smart-train-card")) return;
    var card = document.createElement("button");
    card.type = "button";
    card.className = "quiz-type-card smart-train-card";
    card.id = "smart-train-card";
    card.innerHTML =
      "<strong>\u0423\u043c\u043d\u0430\u044f \u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043a\u0430</strong>" +
      "<span>SRS \u00b7 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438 \u00b7 \u043e\u0437\u0432\u0443\u0447\u043a\u0430" +
      (speechSupported ? "" : " (\u0430\u0443\u0434\u0438\u043e \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e)") +
      "</span>";
    card.addEventListener("click", openSetup);
    var freeTitle = null;
    menu.querySelectorAll("h3").forEach(function (h) {
      if ((h.textContent || "").indexOf("\u0421\u0432\u043e\u0431\u043e\u0434\u043d\u044b\u0439") !== -1) freeTitle = h;
    });
    if (freeTitle && freeTitle.nextSibling) menu.insertBefore(card, freeTitle.nextSibling);
    else menu.appendChild(card);
  }

  function ensureSetupPanel() {
    if (document.getElementById("smart-setup")) return;
    var view = document.getElementById("view-quiz");
    if (!view) return;
    var panel = document.createElement("div");
    panel.id = "smart-setup";
    panel.className = "quiz-setup smart-setup hidden";
    panel.innerHTML =
      "<h3>\u0423\u043c\u043d\u0430\u044f \u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043a\u0430</h3>" +
      '<p class="muted">0\u20131: EN\u2192RU \u00b7 2: RU\u2192EN \u00b7 3: \u0432\u0432\u043e\u0434 \u00b7 4+: ' +
      (speechSupported
        ? "\u0434\u0438\u043a\u0442\u0430\u043d\u0442 (\u0430\u0443\u0434\u0438\u043e)"
        : "\u043f\u0440\u043e\u043f\u0443\u0441\u043a \u0432 \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u0438") +
      "</p>" +
      (speechSupported
        ? '<p class="muted">\u041a\u043d\u043e\u043f\u043a\u0430 \uD83D\uDD0A \u2014 \u043f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u044c \u043e\u0437\u0432\u0443\u0447\u043a\u0443. \u041d\u0430 \u0434\u0438\u043a\u0442\u0430\u043d\u0442\u0435 \u0441\u043b\u043e\u0432\u043e \u0437\u0432\u0443\u0447\u0438\u0442 \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438.</p>'
        : '<p class="muted">\u041e\u0437\u0432\u0443\u0447\u043a\u0430 \u043d\u0435 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044f \u0432 \u044d\u0442\u043e\u043c \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435.</p>') +
      "<label>\u0427\u0438\u0441\u043b\u043e \u0432\u043e\u043f\u0440\u043e\u0441\u043e\u0432" +
      '<select id="smart-count">' +
      '<option value="10">10</option>' +
      '<option value="15" selected>15</option>' +
      '<option value="20">20</option>' +
      '<option value="30">30</option>' +
      "</select></label>" +
      '<div class="setup-actions" style="margin-top:12px">' +
      '<button type="button" class="btn btn-primary" id="smart-start">\u041d\u0430\u0447\u0430\u0442\u044c</button> ' +
      '<button type="button" class="btn btn-secondary" id="smart-cancel">\u041d\u0430\u0437\u0430\u0434</button>' +
      "</div>";
    var area = document.getElementById("quiz-area");
    if (area) view.insertBefore(panel, area);
    else view.appendChild(panel);
    document.getElementById("smart-start").addEventListener("click", startSession);
    document.getElementById("smart-cancel").addEventListener("click", backToMenu);
  }

  function openSetup() {
    ensureSetupPanel();
    hideAllQuiz();
    var setup = document.getElementById("smart-setup");
    if (setup) setup.classList.remove("hidden");
    document.querySelectorAll("section.view").forEach(function (s) {
      s.classList.remove("active");
    });
    var v = document.getElementById("view-quiz");
    if (v) v.classList.add("active");
    document.querySelectorAll(".nav-btn").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-view") === "quiz");
    });
  }

  function backToMenu() {
    active = false;
    if (speechSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    hideAllQuiz();
    var menu = document.getElementById("quiz-menu");
    if (menu) menu.classList.remove("hidden");
    var smart = document.getElementById("smart-setup");
    if (smart) smart.classList.add("hidden");
  }

  function startSession() {
    var countEl = document.getElementById("smart-count");
    var count = countEl ? parseInt(countEl.value, 10) || DEFAULT_COUNT : DEFAULT_COUNT;
    questions = buildSession(count);
    if (!questions.length) {
      alert("\u041d\u0435\u0442 \u0441\u043b\u043e\u0432 \u0434\u043b\u044f \u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043a\u0438.");
      return;
    }
    qIndex = 0;
    score = 0;
    mistakes = [];
    answered = false;
    active = true;
    hideAllQuiz();
    var area = document.getElementById("quiz-area");
    if (area) area.classList.remove("hidden");
    var smart = document.getElementById("smart-setup");
    if (smart) smart.classList.add("hidden");
    document.body.classList.add("smart-train-on");
    showQuestion();
  }

  function modeLabel(mode) {
    var m = {
      "en-ru": "EN \u2192 RU",
      "ru-en": "RU \u2192 EN",
      type: "\u0412\u0432\u043e\u0434",
      blank: "\u041f\u0440\u043e\u043f\u0443\u0441\u043a",
      dictation: "\u0414\u0438\u043a\u0442\u0430\u043d\u0442",
    };
    return m[mode] || mode;
  }

  function showQuestion() {
    answered = false;
    var q = questions[qIndex];
    var total = questions.length;
    document.getElementById("quiz-q-num").textContent = qIndex + 1 + " / " + total;
    document.getElementById("quiz-score").textContent = score + " \u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u044b\u0445";
    document.getElementById("quiz-progress-fill").style.width =
      (total ? (qIndex / total) * 100 : 0) + "%";
    var fb = document.getElementById("quiz-feedback");
    fb.textContent = "";
    fb.className = "quiz-feedback";
    document.getElementById("quiz-continue").classList.add("hidden");

    var audioBtn = speechSupported
      ? '<button type="button" class="btn-audio" id="smart-audio-btn" title="\u041f\u0440\u043e\u0441\u043b\u0443\u0448\u0430\u0442\u044c">\uD83D\uDD0A</button>'
      : "";

    var modeTag =
      '<div class="smart-mode-row">' +
      audioBtn +
      '<span class="smart-mode-tag muted">' +
      modeLabel(q.mode) +
      (q.level != null ? " \u00b7 \u0443\u0440. " + q.level : "") +
      (q.cat ? " \u00b7 " + q.cat : "") +
      "</span></div>";

    var optsEl = document.getElementById("quiz-options");
    var inputWrap = document.getElementById("quiz-input-wrap");
    optsEl.innerHTML = "";
    inputWrap.classList.add("hidden");

    if (q.type === "choice") {
      document.getElementById("quiz-question").innerHTML =
        escapeHtml(q.prompt) +
        (q.sub ? '<div class="muted">' + escapeHtml(q.sub) + "</div>" : "") +
        modeTag;
      shuffle(q.options || []).forEach(function (opt) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "quiz-option";
        btn.textContent = opt;
        btn.addEventListener("click", function () {
          if (answered) return;
          answered = true;
          var ok = opt === q.correct;
          btn.classList.add(ok ? "correct" : "wrong");
          optsEl.querySelectorAll(".quiz-option").forEach(function (b) {
            b.disabled = true;
            if (b.textContent === q.correct) b.classList.add("correct");
          });
          finishAnswer(ok, opt, null);
        });
        optsEl.appendChild(btn);
      });
    } else {
      var promptHtml =
        q.mode === "dictation"
          ? '<div class="dictation-prompt">' + escapeHtml(q.prompt) + "</div>"
          : escapeHtml(q.prompt);
      document.getElementById("quiz-question").innerHTML =
        promptHtml +
        (q.sub ? '<div class="muted">' + escapeHtml(q.sub) + "</div>" : "") +
        modeTag;
      inputWrap.classList.remove("hidden");
      var inp = document.getElementById("quiz-input");
      inp.value = "";
      inp.focus();
    }

    var ab = document.getElementById("smart-audio-btn");
    if (ab) {
      ab.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        speakQuestion(q);
      });
    }

    if (speechSupported) {
      setTimeout(
        function () {
          if (!active || answered) return;
          if (q.mode === "dictation") speakQuestion(q);
          else if (q.mode === "en-ru") speak(q.en, "en-US");
        },
        q.mode === "dictation" ? 350 : 200
      );
    }
  }

  function finishAnswer(ok, userAnswer, almost) {
    var q = questions[qIndex];
    var fb = document.getElementById("quiz-feedback");
    if (almost) {
      applySrs(q.wordId, "almost");
      fb.innerHTML =
        "\u2248 \u041f\u043e\u0447\u0442\u0438 \u0432\u0435\u0440\u043d\u043e. \u041f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u043e: <strong>" +
        escapeHtml(q.correct) +
        "</strong>";
      fb.className = "quiz-feedback almost";
      speak(q.correct || q.en, "en-US");
    } else if (ok) {
      score++;
      applySrs(q.wordId, "correct");
      fb.textContent = "\u2713 \u0412\u0435\u0440\u043d\u043e!";
      fb.className = "quiz-feedback correct";
    } else {
      applySrs(q.wordId, "wrong");
      fb.innerHTML =
        "\u2717 \u041d\u0435\u0432\u0435\u0440\u043d\u043e. \u041f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u044b\u0439 \u043e\u0442\u0432\u0435\u0442: <strong>" +
        escapeHtml(q.correct) +
        "</strong>";
      fb.className = "quiz-feedback wrong";
      speak(q.correct || q.en, "en-US");
      mistakes.push({
        prompt: q.prompt,
        correct: q.correct,
        userAnswer: userAnswer || "",
        wordId: q.wordId,
        en: q.en,
        ru: q.ru,
      });
      var delay = 3 + Math.floor(Math.random() * 3);
      var insertAt = Math.min(questions.length, qIndex + 1 + delay);
      questions.splice(insertAt, 0, Object.assign({}, q));
    }
    document.getElementById("quiz-score").textContent = score + " \u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u044b\u0445";
    document.getElementById("quiz-continue").classList.remove("hidden");
  }

  function checkTyped() {
    if (!active || answered) return;
    var q = questions[qIndex];
    if (q.type !== "type") return;
    var val = (document.getElementById("quiz-input").value || "").trim();
    answered = true;
    if (window.SRS) {
      var g = SRS.gradeTyped(val, q.correct);
      if (g === "correct") finishAnswer(true, val, false);
      else if (g === "almost") finishAnswer(false, val, true);
      else finishAnswer(false, val, false);
    } else {
      var ok = val.toLowerCase() === String(q.correct).toLowerCase();
      finishAnswer(ok, val, false);
    }
  }

  function nextQuestion() {
    if (!active || !answered) return;
    if (speechSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    qIndex++;
    if (qIndex >= questions.length) {
      finishSession();
      return;
    }
    showQuestion();
  }

  function finishSession() {
    active = false;
    document.body.classList.remove("smart-train-on");
    if (speechSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    hideAllQuiz();
    var result = document.getElementById("quiz-result");
    if (result) result.classList.remove("hidden");
    var total = questions.length;
    document.getElementById("result-score").textContent = score + " / " + total;
    var pct = total ? Math.round((score / total) * 100) : 0;
    document.getElementById("result-percent").textContent = pct + "%";
    document.getElementById("result-message").textContent =
      pct >= 90
        ? "\u041e\u0442\u043b\u0438\u0447\u043d\u043e! \u0423\u043c\u043d\u0430\u044f \u0442\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043a\u0430 \u043f\u0440\u043e\u0439\u0434\u0435\u043d\u0430."
        : pct >= 70
          ? "\u0425\u043e\u0440\u043e\u0448\u0438\u0439 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442."
          : "\u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0430\u0439 \u2014 \u0443\u0440\u043e\u0432\u043d\u0438 \u043f\u043e\u0434\u0442\u044f\u043d\u0443\u0442\u0441\u044f.";
    var mist = document.getElementById("result-mistakes");
    if (mistakes.length) {
      mist.classList.remove("hidden");
      mist.innerHTML =
        "<h4>\u041e\u0448\u0438\u0431\u043a\u0438 (" +
        mistakes.length +
        ')</h4><ul class="mistakes-list">' +
        mistakes
          .map(function (m) {
            return (
              "<li><div>" +
              escapeHtml(m.prompt) +
              '</div><div class="correct-text">' +
              escapeHtml(m.correct) +
              "</div></li>"
            );
          })
          .join("") +
        "</ul>";
    } else {
      mist.classList.add("hidden");
      mist.innerHTML = "";
    }
    var st = load();
    st.quizzesDone = (st.quizzesDone || 0) + 1;
    if (!st.quizHistory) st.quizHistory = [];
    st.quizHistory.unshift({
      id: Date.now(),
      date: new Date().toISOString(),
      type: "smart",
      score: score,
      total: total,
      pct: pct,
      mistakes: mistakes.slice(),
    });
    if (st.quizHistory.length > 50) st.quizHistory = st.quizHistory.slice(0, 50);
    save(st);
  }

  function wireGlobal() {
    document.addEventListener(
      "click",
      function (e) {
        if (!active) return;
        if (e.target.id === "quiz-check" || (e.target.closest && e.target.closest("#quiz-check"))) {
          e.preventDefault();
          e.stopImmediatePropagation();
          checkTyped();
          return;
        }
        if (
          e.target.id === "quiz-next-btn" ||
          (e.target.closest && e.target.closest("#quiz-next-btn"))
        ) {
          e.preventDefault();
          e.stopImmediatePropagation();
          nextQuestion();
        }
      },
      true
    );
    document.addEventListener(
      "keydown",
      function (e) {
        if (!active) return;
        if (e.key === "Enter") {
          var wrap = document.getElementById("quiz-input-wrap");
          if (wrap && !wrap.classList.contains("hidden") && !answered) {
            e.preventDefault();
            e.stopImmediatePropagation();
            checkTyped();
          } else if (answered) {
            e.preventDefault();
            nextQuestion();
          }
        }
        if (e.key === "Escape") {
          active = false;
          document.body.classList.remove("smart-train-on");
          backToMenu();
        }
        if (!answered && e.key >= "1" && e.key <= "4") {
          var opts = document.querySelectorAll("#quiz-options .quiz-option:not([disabled])");
          var idx = parseInt(e.key, 10) - 1;
          if (opts[idx]) {
            e.preventDefault();
            opts[idx].click();
          }
        }
      },
      true
    );
  }

  function boot() {
    if (speechSupported) {
      try {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = function () {
          window.speechSynthesis.getVoices();
        };
      } catch (e) {}
    }
    ensureMenuCard();
    ensureSetupPanel();
    wireGlobal();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(boot, 900);
    });
  } else {
    setTimeout(boot, 900);
  }

  window.SmartTrain = {
    isActive: function () {
      return active;
    },
    open: openSetup,
    speak: speak,
  };
})();
