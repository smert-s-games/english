/* Word notes — side button + modal (not on card face) */
(function () {
  "use strict";
  var STORAGE_KEY = "english-practice-v1";
  var lastWordId = null;

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

  function currentWordId() {
    var el = document.getElementById("fc-word");
    if (!el || typeof WORDS === "undefined") return null;
    var en = (el.textContent || "").trim();
    if (!en || en === "\u2014") return null;
    for (var i = 0; i < WORDS.length; i++) {
      if (WORDS[i].en === en) return WORDS[i].id;
    }
    return null;
  }

  function getNote(id) {
    if (!window.SRS || id == null) return "";
    var st = load();
    SRS.migrateState(st);
    return SRS.getEntry(st, id).note || "";
  }

  function setNote(id, text) {
    if (!window.SRS || id == null) return;
    var st = load();
    SRS.migrateState(st);
    var entry = SRS.getEntry(st, id);
    entry.note = String(text || "").slice(0, 2000);
    SRS.setEntry(st, id, entry);
    save(st);
    if (window.EnglishAuth && EnglishAuth.scheduleCloudSave) EnglishAuth.scheduleCloudSave();
  }

  function ensureSideTools() {
    var area = document.querySelector(".flashcard-area");
    var wrap = document.querySelector(".flashcard-wrap");
    var fav = document.getElementById("fc-fav");
    if (!area || !wrap) return null;

    var tools = document.getElementById("fc-side-tools");
    if (!tools) {
      tools = document.createElement("div");
      tools.id = "fc-side-tools";
      tools.className = "fc-side-tools";
      if (wrap.nextSibling) area.insertBefore(tools, wrap.nextSibling);
      else area.appendChild(tools);
    }

    if (fav && fav.parentElement !== tools) {
      tools.appendChild(fav);
      fav.classList.add("fc-side-btn");
    }

    var noteBtn = document.getElementById("fc-note-btn");
    if (!noteBtn) {
      noteBtn = document.createElement("button");
      noteBtn.type = "button";
      noteBtn.id = "fc-note-btn";
      noteBtn.className = "fc-side-btn fc-note-btn";
      noteBtn.title = "\u0417\u0430\u043c\u0435\u0442\u043a\u0430";
      noteBtn.setAttribute("aria-label", "\u0417\u0430\u043c\u0435\u0442\u043a\u0430");
      noteBtn.innerHTML = "\uD83D\uDCDD";
      noteBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = currentWordId();
        if (id == null) return;
        openNoteEditor(id);
      });
      tools.appendChild(noteBtn);
    }

    var old = document.getElementById("fc-note-box");
    if (old) old.remove();

    updateNoteBtnState();
    return tools;
  }

  function updateNoteBtnState() {
    var btn = document.getElementById("fc-note-btn");
    if (!btn) return;
    var id = currentWordId();
    lastWordId = id;
    var has = id != null && !!getNote(id);
    btn.classList.toggle("has-note", has);
    btn.title = has ? "\u0417\u0430\u043c\u0435\u0442\u043a\u0430 (\u0435\u0441\u0442\u044c \u0442\u0435\u043a\u0441\u0442)" : "\u0417\u0430\u043c\u0435\u0442\u043a\u0430";
  }

  function openNoteEditor(wordId) {
    var w = null;
    if (typeof WORDS !== "undefined") {
      for (var i = 0; i < WORDS.length; i++) {
        if (String(WORDS[i].id) === String(wordId)) {
          w = WORDS[i];
          break;
        }
      }
    }
    var ov = document.getElementById("note-overlay");
    if (!ov) {
      ov = document.createElement("div");
      ov.id = "note-overlay";
      ov.className = "auth-overlay note-overlay hidden";
      ov.setAttribute("aria-hidden", "true");
      ov.innerHTML =
        '<div class="auth-modal note-modal" role="dialog">' +
        '<button type="button" class="auth-close" id="note-close" aria-label="\u0417\u0430\u043a\u0440\u044b\u0442\u044c">\u00d7</button>' +
        "<h2>\u0417\u0430\u043c\u0435\u0442\u043a\u0430</h2>" +
        '<p class="muted" id="note-word-label"></p>' +
        '<textarea id="note-textarea" class="fc-note note-textarea" rows="5" maxlength="2000" placeholder="\u041f\u043e\u0434\u0441\u043a\u0430\u0437\u043a\u0430, \u0430\u0441\u0441\u043e\u0446\u0438\u0430\u0446\u0438\u044f, \u043f\u0440\u0438\u043c\u0435\u0440\u2026"></textarea>' +
        '<button type="button" class="btn btn-primary" id="note-save">\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c</button>' +
        "</div>";
      document.body.appendChild(ov);
      document.getElementById("note-close").addEventListener("click", closeNoteEditor);
      ov.addEventListener("click", function (e) {
        if (e.target === ov) closeNoteEditor();
      });
      document.getElementById("note-save").addEventListener("click", function () {
        var id = ov.dataset.wordId;
        var ta = document.getElementById("note-textarea");
        setNote(id, ta.value);
        closeNoteEditor();
        updateNoteBtnState();
        refreshWordListNotes();
      });
    }
    ov.dataset.wordId = String(wordId);
    document.getElementById("note-word-label").textContent = w
      ? w.en + " \u2014 " + w.ru
      : "\u0421\u043b\u043e\u0432\u043e #" + wordId;
    document.getElementById("note-textarea").value = getNote(wordId);
    ov.classList.remove("hidden");
    ov.setAttribute("aria-hidden", "false");
    setTimeout(function () {
      var ta = document.getElementById("note-textarea");
      if (ta) ta.focus();
    }, 50);
  }

  function closeNoteEditor() {
    var ov = document.getElementById("note-overlay");
    if (!ov) return;
    ov.classList.add("hidden");
    ov.setAttribute("aria-hidden", "true");
  }

  function refreshWordListNotes() {
    if (typeof WORDS === "undefined") return;
    var items = document.querySelectorAll(".word-item[data-id]");
    if (!items.length) return;
    var st = load();
    if (window.SRS) SRS.migrateState(st);
    items.forEach(function (item) {
      var id = item.getAttribute("data-id");
      var note = window.SRS ? SRS.getEntry(st, id).note || "" : "";
      var badge = item.querySelector(".word-note-badge");
      if (note) {
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "word-note-badge";
          var meta = item.querySelector(".word-meta") || item;
          meta.appendChild(badge);
        }
        badge.textContent = "\uD83D\uDCDD";
        badge.title = note;
      } else if (badge) {
        badge.remove();
      }
    });
  }

  function wireWordList() {
    document.addEventListener(
      "click",
      function (e) {
        var badge = e.target.closest && e.target.closest(".word-note-badge");
        if (badge) {
          e.preventDefault();
          e.stopPropagation();
          var item = badge.closest(".word-item");
          if (item) openNoteEditor(item.getAttribute("data-id"));
        }
      },
      true
    );
    var list = document.getElementById("words-list");
    if (!list) return;
    var obs = new MutationObserver(function () {
      list.querySelectorAll(".word-item[data-id]").forEach(function (item) {
        if (item.querySelector(".word-note-btn")) return;
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "word-note-btn";
        btn.title = "\u0417\u0430\u043c\u0435\u0442\u043a\u0430";
        btn.textContent = "\uD83D\uDCDD";
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          openNoteEditor(item.getAttribute("data-id"));
        });
        var meta = item.querySelector(".word-meta");
        if (meta) meta.insertBefore(btn, meta.firstChild);
        else item.appendChild(btn);
      });
      refreshWordListNotes();
    });
    obs.observe(list, { childList: true, subtree: true });
    refreshWordListNotes();
  }

  function boot() {
    ensureSideTools();
    wireWordList();
    var wordEl = document.getElementById("fc-word");
    if (wordEl) {
      new MutationObserver(function () {
        updateNoteBtnState();
      }).observe(wordEl, { childList: true, characterData: true, subtree: true });
    }
    ["fc-next", "fc-prev"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener(
          "click",
          function () {
            setTimeout(updateNoteBtnState, 30);
          },
          true
        );
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(boot, 700);
    });
  } else {
    setTimeout(boot, 700);
  }
})();
