/* Merge WORDS_EXTRA into WORDS + show examples/collocations/word_family in UI */
(function () {
  "use strict";

  function enrich() {
    if (typeof WORDS === "undefined" || !WORDS.length) return;
    var extra = typeof WORDS_EXTRA !== "undefined" ? WORDS_EXTRA : {};
    WORDS.forEach(function (w) {
      var e = extra[String(w.id)] || extra[w.id] || null;
      if (!w.examples || !w.examples.length) {
        w.examples = [];
        if (w.example) {
          w.examples.push({ en: w.example, ru: w.exampleRu || "" });
        }
      }
      if (e) {
        if (e.examples && e.examples.length) {
          w.examples = e.examples.slice();
          w.example = e.examples[0].en;
          w.exampleRu = e.examples[0].ru || "";
        }
        w.collocations = e.collocations || w.collocations || [];
        w.word_family = e.word_family || w.word_family || [];
      } else {
        w.collocations = w.collocations || [];
        w.word_family = w.word_family || [];
      }
    });
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function extrasHtml(w) {
    if (!w) return "";
    var parts = [];
    if (w.examples && w.examples.length) {
      parts.push(
        '<div class="word-extras-block"><strong>\u041f\u0440\u0438\u043c\u0435\u0440\u044b</strong><ul class="word-extras-list">' +
          w.examples
            .map(function (ex) {
              return (
                "<li>" +
                escapeHtml(ex.en) +
                (ex.ru
                  ? '<span class="word-example-ru">' + escapeHtml(ex.ru) + "</span>"
                  : "") +
                "</li>"
              );
            })
            .join("") +
          "</ul></div>"
      );
    }
    if (w.collocations && w.collocations.length) {
      parts.push(
        '<div class="word-extras-block"><strong>\u0421\u043e\u0447\u0435\u0442\u0430\u043d\u0438\u044f</strong><div class="word-chips">' +
          w.collocations
            .map(function (c) {
              return '<span class="word-chip">' + escapeHtml(c) + "</span>";
            })
            .join("") +
          "</div></div>"
      );
    }
    if (w.word_family && w.word_family.length) {
      parts.push(
        '<div class="word-extras-block"><strong>\u041e\u0434\u043d\u043e\u043a\u043e\u0440\u0435\u043d\u043d\u044b\u0435</strong><div class="word-chips">' +
          w.word_family
            .map(function (c) {
              return '<span class="word-chip family">' + escapeHtml(c) + "</span>";
            })
            .join("") +
          "</div></div>"
      );
    }
    return parts.join("");
  }

  function findWordByEn(en) {
    if (typeof WORDS === "undefined") return null;
    en = (en || "").trim();
    for (var i = 0; i < WORDS.length; i++) {
      if (WORDS[i].en === en) return WORDS[i];
    }
    return null;
  }

  function enhanceFlashcard() {
    var card = document.getElementById("flashcard");
    if (!card) return;
    var host = document.getElementById("fc-extras");
    if (!host) {
      host = document.createElement("div");
      host.id = "fc-extras";
      host.className = "fc-extras";
      var back = card.querySelector(".flashcard-back") || card;
      back.appendChild(host);
    }
    var enEl = document.getElementById("fc-word");
    var w = findWordByEn(enEl ? enEl.textContent : "");
    host.innerHTML = w ? extrasHtml(w) : "";
  }

  function enhanceWordDetail() {
    document.querySelectorAll(".word-item").forEach(function (item) {
      if (item.querySelector(".word-item-extras")) return;
      var en = item.querySelector(".word-en");
      var w = findWordByEn(en ? en.textContent : "");
      if (!w) return;
      if (!w.collocations && !w.word_family && !(w.examples && w.examples.length > 1)) return;
      var box = document.createElement("div");
      box.className = "word-item-extras";
      box.innerHTML = extrasHtml(w);
      if (box.innerHTML) item.appendChild(box);
    });
  }

  function wireObservers() {
    var fcWord = document.getElementById("fc-word");
    if (fcWord) {
      new MutationObserver(function () {
        enhanceFlashcard();
      }).observe(fcWord, { childList: true, characterData: true, subtree: true });
    }
    document.addEventListener(
      "click",
      function () {
        setTimeout(enhanceWordDetail, 80);
        setTimeout(enhanceFlashcard, 80);
      },
      true
    );
  }

  function boot() {
    enrich();
    wireObservers();
    setTimeout(enhanceFlashcard, 400);
    setTimeout(enhanceWordDetail, 800);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(boot, 700);
    });
  } else {
    setTimeout(boot, 700);
  }

  window.ContentEnrich = { enrich: enrich, extrasHtml: extrasHtml };
})();
