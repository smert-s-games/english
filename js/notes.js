/* Word notes — editable, stored in SRS progress (localStorage + cloud) */
(function () {
  "use strict";
  var STORAGE_KEY = "english-practice-v1";
  var lastWordId = null;
  var saveTimer = null;

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

  function ensureNoteUi() {
    var back = document.querySelector(".flashcard-back");
    if (!back) return null;
    var box = document.getElementById("fc-note-box");
    if (box) return box;
    box = document.createElement("div");
    box.id = "fc-note-box";
    box.className = "fc-note-box";
    box.innerHTML =
      '<label class="fc-note-label" for="fc-note">Моя заметка</label>' +
      '<textarea id="fc-note" class="fc-note" rows="3" placeholder="Подсказка, ассоциация, пример…" maxlength="2000"></textarea>' +
      '<div class="fc-note-hint muted">Сохраняется автоматически</div>';
    back.appendChild(box);
    var ta = document.getElementById("fc-note");
    ta.addEventListener("click", function (e) {
      e.stopPropagation();
    });
    ta.addEventListener("mousedown", function (e) {
      e.stopPropagation();
    });
    ta.addEventListener("input", function () {
      var id = lastWordId != null ? lastWordId : currentWordId();
      if (id == null) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        setNote(id, ta.value);
        refreshWordListNotes();
      }, 400);
    });
    return box;
  }

  function syncNoteFromCard() {
    ensureNoteUi();
    var ta = document.getElementById("fc-note");
    if (!ta) return;
    var id = currentWordId();
    lastWordId = id;
    if (id == null) {
      ta.value = "";
      ta.disabled = true;
      return;
    }
    ta.disabled = false;
    var note = getNote(id);
    if (ta.value !== note && document.activeElement !== ta) {
      ta.value = note;
    }
  }

  function refreshWordListNotes() {
    if (typeof WORDS === "undefined") return;
    var items = document.querySelectorAll(".word-item[data-id]");
    if (!items.length) return;
    var st = load();
    if (window.SRS) SRS.migrateState(st);
    items.forEach(function (item) {
      var id = item.getAttribute("data-id");
      var note = "";
      if (window.SRS) note = SRS.getEntry(st, id).note || "";
      var badge = item.querySelector(".word-note-badge");
      if (note) {
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "word-note-badge";
          badge.title = note;
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
      ov.className = "auth-overlay note-overlay";
      ov.innerHTML =
        '<div class="auth-modal note-modal" role="dialog">' +
        '<button type="button" class="auth-close" id="note-close" aria-label="Закрыть">\u00d7</button>' +
        '<h2 id="note-title">Заметка</h2>' +
        '<p class="muted" id="note-word-label"></p>' +
        '<textarea id="note-textarea" class="fc-note note-textarea" rows="5" maxlength="2000" placeholder="Ваша заметка\u2026"></textarea>' +
        '<button type="button" class="btn btn-primary" id="note-save">Сохранить</button>' +
        "</div>";
      document.body.appendChild(ov);
      document.getElementById("note-close").addEventListener("click", function () {
        ov.classList.add("hidden");
      });
      ov.addEventListener("click", function (e) {
        if (e.target === ov) ov.classList.add("hidden");
      });
      document.getElementById("note-save").addEventListener("click", function () {
        var id = ov.dataset.wordId;
        var ta = document.getElementById("note-textarea");
        setNote(id, ta.value);
        ov.classList.add("hidden");
        refreshWordListNotes();
        syncNoteFromCard();
      });
    }
    ov.dataset.wordId = String(wordId);
    document.getElementById("note-word-label").textContent = w
      ? w.en + " \u2014 " + w.ru
      : "Слово #" + wordId;
    document.getElementById("note-textarea").value = getNote(wordId);
    ov.classList.remove("hidden");
    ov.setAttribute("aria-hidden", "false");
  }

  function wireWordListClicks() {
    document.addEventListener(
      "click",
      function (e) {
        var badge = e.target.closest && e.target.closest(".word-note-badge");
        if (badge) {
          e.preventDefault();
          e.stopPropagation();
          var item = badge.closest(".word-item");
          if (item) openNoteEditor(item.getAttribute("data-id"));
          return;
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
        btn.title = "Заметка";
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
    ensureNoteUi();
    syncNoteFromCard();
    wireWordListClicks();
    var wordEl = document.getElementById("fc-word");
    if (wordEl) {
      new MutationObserver(function () {
        syncNoteFromCard();
      }).observe(wordEl, { childList: true, characterData: true, subtree: true });
    }
    ["fc-next", "fc-prev"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener(
          "click",
          function () {
            setTimeout(syncNoteFromCard, 30);
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
