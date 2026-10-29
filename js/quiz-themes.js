/* Theme packs for English Practice quizzes */
(function () {
  "use strict";

  var THEME_PACKS = [
    { id: "interview", title: "Интервью / Виза", desc: "Слова для собеседования и визы", cat: "interview", icon: "🛂" },
    { id: "work", title: "Работа", desc: "Профессия, офис, карьера", cat: "work", icon: "💼" },
    { id: "travel", title: "Путешествия", desc: "Поездки, аэропорт, отель", cat: "travel", icon: "✈️" },
    { id: "family", title: "Семья", desc: "Родственники и отношения", cat: "family", icon: "👨‍👩‍👧" },
    { id: "everyday", title: "Повседневное", desc: "Бытовые слова и фразы", cat: "everyday", icon: "🏠" },
    { id: "time", title: "Время", desc: "Даты, сроки, расписание", cat: "time", icon: "🕐" },
    { id: "feelings", title: "Чувства и мнения", desc: "Эмоции и оценки", cat: "feelings", icon: "💬" },
    { id: "ch1", title: "Глава 1", desc: "Все слова первой главы", chapter: 1, icon: "📖" },
    { id: "ch2", title: "Глава 2", desc: "Все слова второй главы", chapter: 2, icon: "📖" },
    { id: "ch3", title: "Глава 3", desc: "Все слова третьей главы", chapter: 3, icon: "📖" },
    { id: "sentences", title: "Предложения", desc: "Вставь пропущенное слово", mode: "sentence", icon: "✏️" },
  ];

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function wordCount(pack) {
    if (typeof WORDS === "undefined") return 0;
    if (pack.mode === "sentence") {
      return typeof SENTENCES !== "undefined" && SENTENCES ? SENTENCES.length : 0;
    }
    return WORDS.filter(function (w) {
      if (pack.cat && w.cat !== pack.cat) return false;
      if (pack.chapter && w.chapter !== pack.chapter) return false;
      return true;
    }).length;
  }

  function openTheme(pack) {
    var catEl = document.getElementById("quiz-category");
    var chEl = document.getElementById("quiz-chapter");
    if (catEl) catEl.value = pack.cat || "all";
    if (chEl) chEl.value = pack.chapter ? String(pack.chapter) : "all";

    var quizType = pack.mode === "sentence" ? "sentence" : "en-ru";
    var freeBtn = document.querySelector('.quiz-type-card[data-free][data-quiz="' + (quizType === "sentence" ? "en-ru" : quizType) + '"]');

    if (pack.mode === "sentence") {
      // Use hidden sentence trigger: clone handler by temporarily adding button with data-quiz=sentence
      var holder = document.getElementById("quiz-menu");
      var tmp = document.createElement("button");
      tmp.className = "quiz-type-card";
      tmp.dataset.quiz = "sentence";
      tmp.style.display = "none";
      tmp.id = "tmp-sentence-btn";
      holder.appendChild(tmp);
      // Main app only bound existing cards at load — re-dispatch won't fire those listeners.
      // Fall back: open EN→RU setup with all words and note in title.
      if (freeBtn) freeBtn.click();
      setTimeout(function () {
        var title = document.getElementById("quiz-setup-title");
        var desc = document.getElementById("quiz-setup-desc");
        if (title) title.textContent = "Предложения";
        if (desc) desc.textContent = "Пока доступен режим выбора перевода по словам темы. Полный fill-in — в следующей версии.";
        if (catEl) catEl.value = "all";
        if (chEl) chEl.value = "all";
      }, 40);
      tmp.remove();
      return;
    }

    if (freeBtn) {
      freeBtn.click();
      setTimeout(function () {
        if (catEl) catEl.value = pack.cat || "all";
        if (chEl) chEl.value = pack.chapter ? String(pack.chapter) : "all";
        var title = document.getElementById("quiz-setup-title");
        var desc = document.getElementById("quiz-setup-desc");
        if (title) title.textContent = pack.title;
        if (desc) desc.textContent = (pack.desc || "") + " · только слова этой темы";
        // Hide category/chapter if theme already sets them
        var cw = document.getElementById("quiz-category-wrap");
        var hw = document.getElementById("quiz-chapter-wrap");
        if (pack.cat && cw) cw.classList.add("hidden");
        if (pack.chapter && hw) hw.classList.add("hidden");
        if (!pack.cat && cw) cw.classList.remove("hidden");
        if (!pack.chapter && hw) hw.classList.remove("hidden");
      }, 40);
    }
  }

  function render() {
    var box = document.getElementById("theme-packs");
    if (!box || typeof WORDS === "undefined") return;
    var html = "";
    THEME_PACKS.forEach(function (pack) {
      var n = wordCount(pack);
      if (n < 4 && pack.mode !== "sentence") return;
      html +=
        '<button type="button" class="quiz-type-card theme-pack-card" data-pack-id="' +
        pack.id +
        '">' +
        '<div class="theme-pack-top"><span class="theme-pack-icon">' +
        (pack.icon || "📝") +
        "</span><div><strong>" +
        escapeHtml(pack.title) +
        '</strong><span class="theme-pack-desc">' +
        escapeHtml(pack.desc || "") +
        "</span></div></div>" +
        '<div class="theme-pack-meta">' +
        n +
        " слов · тематический тест</div></button>";
    });
    box.innerHTML = html;
    box.querySelectorAll("[data-pack-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-pack-id");
        var pack = THEME_PACKS.filter(function (p) {
          return p.id === id;
        })[0];
        if (pack) openTheme(pack);
      });
    });
  }

  function boot() {
    if (typeof WORDS === "undefined") {
      setTimeout(boot, 80);
      return;
    }
    render();
    document.querySelectorAll('.nav-btn[data-view="quiz"]').forEach(function (b) {
      b.addEventListener("click", function () {
        setTimeout(render, 30);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
