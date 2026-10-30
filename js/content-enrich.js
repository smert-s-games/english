/* Content schema: examples[], collocations[], word_family[] — merge + UI */
(function () {
  "use strict";

  var CURATED = {
    interview: {
      collocations: ["visa interview", "job interview"],
      word_family: ["interviewee", "interviewer"],
      examples: [
        { en: "I have an interview at the embassy.", ru: "\u0423 \u043c\u0435\u043d\u044f \u0441\u043e\u0431\u0435\u0441\u0435\u0434\u043e\u0432\u0430\u043d\u0438\u0435 \u0432 \u043f\u043e\u0441\u043e\u043b\u044c\u0441\u0442\u0432\u0435." },
        { en: "The interview lasted thirty minutes.", ru: "\u0421\u043e\u0431\u0435\u0441\u0435\u0434\u043e\u0432\u0430\u043d\u0438\u0435 \u0434\u043b\u0438\u043b\u043e\u0441\u044c \u0442\u0440\u0438\u0434\u0446\u0430\u0442\u044c \u043c\u0438\u043d\u0443\u0442." },
      ],
    },
    embassy: { collocations: ["embassy staff", "embassy building"], word_family: [] },
    visa: { collocations: ["tourist visa", "visa application"], word_family: [] },
    purpose: {
      collocations: ["main purpose", "purpose of the visit"],
      word_family: ["purposeful"],
    },
    application: {
      collocations: ["visa application", "submit an application"],
      word_family: ["apply", "applicant"],
    },
    applicant: { collocations: ["visa applicant"], word_family: ["apply", "application"] },
    travel: {
      collocations: ["travel plans", "travel insurance"],
      word_family: ["traveler", "travelling"],
    },
    plan: { collocations: ["travel plan", "make a plan"], word_family: ["planner", "planned"] },
  };

  var FAMILY = {
    apply: ["application", "applicant"],
    approve: ["approval", "approved"],
    deny: ["denial"],
    intend: ["intention"],
    invite: ["invitation"],
    employ: ["employer", "employee", "employment"],
    work: ["worker", "workplace"],
    study: ["student", "studies"],
    decide: ["decision"],
    explain: ["explanation"],
    translate: ["translation", "translator"],
    speak: ["speaker", "speech"],
    write: ["writer", "writing"],
    read: ["reader", "reading"],
    help: ["helper", "helpful"],
    use: ["useful", "user"],
    book: ["booking"],
    arrive: ["arrival"],
    depart: ["departure"],
    reserve: ["reservation"],
    confirm: ["confirmation"],
    cancel: ["cancellation"],
    require: ["requirement", "required"],
    prepare: ["preparation"],
    present: ["presentation"],
    manage: ["manager", "management"],
    organize: ["organization"],
    inform: ["information"],
    communicate: ["communication"],
    introduce: ["introduction"],
    recommend: ["recommendation"],
    suggest: ["suggestion"],
    prefer: ["preference"],
    agree: ["agreement"],
    accept: ["acceptance"],
    expect: ["expectation"],
    know: ["knowledge"],
    understand: ["understanding"],
    choose: ["choice"],
    visit: ["visitor"],
    pay: ["payment"],
    drive: ["driver"],
    fly: ["flight"],
    carry: ["carrier"],
  };

  function secondExample(w) {
    var en = w.en,
      ru = w.ru,
      pos = w.pos;
    if (pos === "verb")
      return { en: "I often need to " + en + ".", ru: "\u041c\u043d\u0435 \u0447\u0430\u0441\u0442\u043e \u043d\u0443\u0436\u043d\u043e: " + ru + "." };
    if (pos === "noun")
      return {
        en: "This " + en + " is important for my trip.",
        ru: "\u00ab" + ru + "\u00bb \u0432\u0430\u0436\u0435\u043d(\u0430) \u0434\u043b\u044f \u043c\u043e\u0435\u0439 \u043f\u043e\u0435\u0437\u0434\u043a\u0438.",
      };
    if (pos === "adjective")
      return { en: "It looks " + en + ".", ru: "\u042d\u0442\u043e \u0432\u044b\u0433\u043b\u044f\u0434\u0438\u0442 " + ru + "." };
    if (pos === "adverb")
      return { en: "Please speak " + en + ".", ru: "\u041f\u043e\u0436\u0430\u043b\u0443\u0439\u0441\u0442\u0430, \u0433\u043e\u0432\u043e\u0440\u0438\u0442\u0435 " + ru + "." };
    return {
      en: 'I learned the word "' + en + '".',
      ru: "\u042f \u0432\u044b\u0443\u0447\u0438\u043b \u0441\u043b\u043e\u0432\u043e \u00ab" + ru + "\u00bb.",
    };
  }

  function collocationsFor(w) {
    var en = w.en,
      pos = w.pos;
    if (pos === "verb") return ["to " + en, "will " + en];
    if (pos === "noun") return ["the " + en, "my " + en];
    if (pos === "adjective") return ["very " + en];
    if (pos === "adverb") return ["speak " + en];
    return [en];
  }

  function enrichWord(w) {
    var key = String(w.en || "").toLowerCase();
    var cur = CURATED[key];
    var examples = [];
    if (w.example) examples.push({ en: w.example, ru: w.exampleRu || "" });
    if (cur && cur.examples && cur.examples.length) {
      examples = cur.examples.slice();
    } else {
      var s2 = secondExample(w);
      if (!examples.length || s2.en !== examples[0].en) examples.push(s2);
    }
    w.examples = examples;
    if (examples[0]) {
      w.example = examples[0].en;
      w.exampleRu = examples[0].ru || "";
    }
    w.collocations = (cur && cur.collocations) || collocationsFor(w);
    w.word_family = (cur && cur.word_family) || FAMILY[key] || [];
    return w;
  }

  function enrich() {
    if (typeof WORDS === "undefined" || !WORDS.length) return;
    var fromFile = typeof WORDS_EXTRA !== "undefined" ? WORDS_EXTRA : null;
    WORDS.forEach(function (w) {
      if (fromFile) {
        var e = fromFile[String(w.id)] || fromFile[w.id];
        if (e) {
          if (e.examples && e.examples.length) {
            w.examples = e.examples.slice();
            w.example = e.examples[0].en;
            w.exampleRu = e.examples[0].ru || "";
          }
          w.collocations = e.collocations || [];
          w.word_family = e.word_family || [];
          return;
        }
      }
      enrichWord(w);
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
                (ex.ru ? '<span class="word-example-ru"> ' + escapeHtml(ex.ru) + "</span>" : "") +
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
    for (var i = 0; i < WORDS.length; i++) if (WORDS[i].en === en) return WORDS[i];
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
      (card.querySelector(".flashcard-back") || card).appendChild(host);
    }
    var enEl = document.getElementById("fc-word");
    host.innerHTML = extrasHtml(findWordByEn(enEl ? enEl.textContent : ""));
  }

  function enhanceWordList() {
    document.querySelectorAll(".word-item").forEach(function (item) {
      if (item.querySelector(".word-item-extras")) return;
      var en = item.querySelector(".word-en");
      var w = findWordByEn(en ? en.textContent : "");
      if (!w) return;
      var box = document.createElement("div");
      box.className = "word-item-extras";
      box.innerHTML = extrasHtml(w);
      if (box.innerHTML) item.appendChild(box);
    });
  }

  function boot() {
    enrich();
    var fcWord = document.getElementById("fc-word");
    if (fcWord) {
      new MutationObserver(enhanceFlashcard).observe(fcWord, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }
    document.addEventListener(
      "click",
      function () {
        setTimeout(enhanceWordList, 100);
        setTimeout(enhanceFlashcard, 100);
      },
      true
    );
    setTimeout(enhanceFlashcard, 500);
    setTimeout(enhanceWordList, 900);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(boot, 700);
    });
  } else setTimeout(boot, 700);

  window.ContentEnrich = { enrich: enrich, extrasHtml: extrasHtml };
})();
