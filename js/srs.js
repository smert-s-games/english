/* SRS (Leitner) module for English Practice — stage 0/1 */
(function (global) {
  "use strict";

  var INTERVALS = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };
  var LEARNED_LEVEL = 4;
  var MAX_LEVEL = 5;

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function addDays(iso, days) {
    var d = new Date(iso + "T12:00:00");
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function defaultEntry() {
    return { level: 0, due: null, lapses: 0, lastSeen: null, note: "" };
  }

  function normalizeEntry(raw) {
    if (raw == null) return defaultEntry();
    if (raw === true) {
      return { level: 3, due: todayISO(), lapses: 0, lastSeen: null, note: "" };
    }
    if (typeof raw !== "object") return defaultEntry();
    var level = parseInt(raw.level, 10);
    if (isNaN(level) || level < 0) level = 0;
    if (level > MAX_LEVEL) level = MAX_LEVEL;
    return {
      level: level,
      due: raw.due || null,
      lapses: parseInt(raw.lapses, 10) || 0,
      lastSeen: raw.lastSeen || raw.last_seen || null,
      note: typeof raw.note === "string" ? raw.note : "",
    };
  }

  /** One-time migration: learned[id]=true → object; flag srsMigrated */
  function migrateState(state) {
    if (!state || state.srsMigrated) {
      if (state && !state.learned) state.learned = {};
      if (state && state.dailyNewLimit == null) state.dailyNewLimit = 10;
      return state;
    }
    var learned = state.learned || {};
    var next = {};
    Object.keys(learned).forEach(function (id) {
      next[id] = normalizeEntry(learned[id]);
    });
    state.learned = next;
    state.srsMigrated = true;
    if (state.dailyNewLimit == null) state.dailyNewLimit = 10;
    if (!state.activity) state.activity = {};
    return state;
  }

  function getEntry(state, id) {
    var key = String(id);
    if (!state.learned) state.learned = {};
    if (!state.learned[key]) {
      return defaultEntry();
    }
    return normalizeEntry(state.learned[key]);
  }

  function setEntry(state, id, entry) {
    if (!state.learned) state.learned = {};
    state.learned[String(id)] = normalizeEntry(entry);
  }

  function isLearned(state, id) {
    return getEntry(state, id).level >= LEARNED_LEVEL;
  }

  function learnedCount(state) {
    var n = 0;
    var map = state.learned || {};
    Object.keys(map).forEach(function (id) {
      if (normalizeEntry(map[id]).level >= LEARNED_LEVEL) n++;
    });
    return n;
  }

  function scheduleNext(level) {
    var lv = Math.max(1, Math.min(MAX_LEVEL, level | 0));
    var days = INTERVALS[lv] || 1;
    return addDays(todayISO(), days);
  }

  /**
   * quality: again | hard | good | easy
   * returns updated entry
   */
  function applyQuality(entry, quality) {
    entry = normalizeEntry(entry);
    var q = quality || "good";
    if (q === "again") {
      entry.level = 1;
      entry.lapses = (entry.lapses || 0) + 1;
    } else if (q === "hard") {
      if (entry.level < 1) entry.level = 1;
    } else if (q === "easy") {
      entry.level = Math.min(MAX_LEVEL, (entry.level || 0) + 2);
      if (entry.level < 1) entry.level = 1;
    } else {
      entry.level = Math.min(MAX_LEVEL, (entry.level || 0) + 1);
      if (entry.level < 1) entry.level = 1;
    }
    entry.lastSeen = todayISO();
    entry.due = scheduleNext(entry.level);
    return entry;
  }

  function onCorrect(entry) {
    entry = normalizeEntry(entry);
    entry.level = Math.min(MAX_LEVEL, Math.max(1, (entry.level || 0) + 1));
    entry.lastSeen = todayISO();
    entry.due = scheduleNext(entry.level);
    return entry;
  }

  function onWrong(entry) {
    entry = normalizeEntry(entry);
    entry.level = 1;
    entry.lapses = (entry.lapses || 0) + 1;
    entry.lastSeen = todayISO();
    entry.due = scheduleNext(1);
    return entry;
  }

  function onAlmost(entry) {
    entry = normalizeEntry(entry);
    if (entry.level < 1) entry.level = 1;
    entry.lastSeen = todayISO();
    entry.due = scheduleNext(entry.level);
    return entry;
  }

  function isDue(entry, day) {
    entry = normalizeEntry(entry);
    day = day || todayISO();
    if (entry.level <= 0) return false;
    if (!entry.due) return true;
    return String(entry.due) <= String(day);
  }

  function getDueWordIds(state, day) {
    day = day || todayISO();
    var ids = [];
    var map = state.learned || {};
    Object.keys(map).forEach(function (id) {
      if (isDue(map[id], day)) ids.push(id);
    });
    return ids;
  }

  function countDue(state, day) {
    return getDueWordIds(state, day).length;
  }

  function getReviewPool(state, allWords, opts) {
    opts = opts || {};
    var limitNew = state.dailyNewLimit != null ? state.dailyNewLimit : 10;
    var dueIds = {};
    getDueWordIds(state).forEach(function (id) {
      dueIds[String(id)] = true;
    });
    var due = [];
    var fresh = [];
    (allWords || []).forEach(function (w) {
      var id = String(w.id);
      var e = getEntry(state, id);
      if (dueIds[id] || isDue(e)) {
        due.push(w);
      } else if (e.level === 0 && !e.lastSeen) {
        fresh.push(w);
      }
    });
    var newCap = Math.max(0, limitNew);
    return { due: due, fresh: fresh.slice(0, newCap), all: due.concat(fresh.slice(0, newCap)) };
  }

  function levenshtein(a, b) {
    a = String(a || "").toLowerCase().trim();
    b = String(b || "").toLowerCase().trim();
    if (a === b) return 0;
    var m = a.length;
    var n = b.length;
    if (!m) return n;
    if (!n) return m;
    var prev = new Array(n + 1);
    var cur = new Array(n + 1);
    var i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur[0] = i;
      for (j = 1; j <= n; j++) {
        var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      }
      var t = prev;
      prev = cur;
      cur = t;
    }
    return prev[n];
  }

  function gradeTyped(user, correct) {
    var d = levenshtein(user, correct);
    if (d === 0) return "correct";
    if (d === 1) return "almost";
    return "wrong";
  }

  function mergeLearnedMaps(a, b) {
    var out = {};
    var ids = {};
    Object.keys(a || {}).forEach(function (k) {
      ids[k] = true;
    });
    Object.keys(b || {}).forEach(function (k) {
      ids[k] = true;
    });
    Object.keys(ids).forEach(function (id) {
      var ea = normalizeEntry((a || {})[id]);
      var eb = normalizeEntry((b || {})[id]);
      var pick = ea.level >= eb.level ? ea : eb;
      var other = ea.level >= eb.level ? eb : ea;
      if (ea.level === eb.level) {
        if (ea.due && eb.due) pick = String(ea.due) <= String(eb.due) ? ea : eb;
      }
      pick.lapses = Math.max(ea.lapses || 0, eb.lapses || 0);
      if ((other.note || "").length > (pick.note || "").length) pick.note = other.note;
      if (other.lastSeen && (!pick.lastSeen || String(other.lastSeen) > String(pick.lastSeen))) {
        pick.lastSeen = other.lastSeen;
      }
      out[id] = pick;
    });
    return out;
  }

  global.SRS = {
    INTERVALS: INTERVALS,
    LEARNED_LEVEL: LEARNED_LEVEL,
    todayISO: todayISO,
    addDays: addDays,
    defaultEntry: defaultEntry,
    normalizeEntry: normalizeEntry,
    migrateState: migrateState,
    getEntry: getEntry,
    setEntry: setEntry,
    isLearned: isLearned,
    learnedCount: learnedCount,
    scheduleNext: scheduleNext,
    applyQuality: applyQuality,
    onCorrect: onCorrect,
    onWrong: onWrong,
    onAlmost: onAlmost,
    isDue: isDue,
    getDueWordIds: getDueWordIds,
    countDue: countDue,
    getReviewPool: getReviewPool,
    levenshtein: levenshtein,
    gradeTyped: gradeTyped,
    mergeLearnedMaps: mergeLearnedMaps,
  };
})(typeof window !== "undefined" ? window : this);
