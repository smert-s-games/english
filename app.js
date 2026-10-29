/* app.js v20 SRS string-patch */
(function(){
  "use strict";
  var CDN="https://cdn.jsdelivr.net/gh/smert-s-games/english@9eaece21677c1d1115d3ab79567833fdfc30f8c0/app.js";
  var PAIRS=[["/* English Practice App v7 \u2014 learned filter, quiz feedback, history */","/* English Practice App v8 \u2014 SRS (patched) */"],["if (!s.quizHistory) s.quizHistory = [];\n        return s;","if (!s.quizHistory) s.quizHistory = [];\n        if (!s.activity) s.activity = {};\n        if (s.dailyNewLimit == null) s.dailyNewLimit = 10;\n        if (window.SRS) SRS.migrateState(s);\n        return s;"],["quizHistory: [],\n    };","quizHistory: [],\n      srsMigrated: true,\n      dailyNewLimit: 10,\n      activity: {},\n    };"],["function isLearned(id) { return !!state.learned[id]; }","function isLearned(id) { if (window.SRS) return SRS.isLearned(state, id); return !!state.learned[id]; }"],["function markLearned(id, value) {\n    if (value === undefined) value = true;\n    if (value) state.learned[id] = true;\n    else delete state.learned[id];\n    saveState();\n    updateStats();\n  }","function markLearned(id, value) {\n    if (value === undefined) value = true;\n    if (window.SRS) {\n      var entry = SRS.getEntry(state, id);\n      entry = value ? SRS.onCorrect(entry) : SRS.onWrong(entry);\n      SRS.setEntry(state, id, entry);\n    } else {\n      if (value) state.learned[id] = true;\n      else delete state.learned[id];\n    }\n    saveState();\n    updateStats();\n  }\n  function applyCardQuality(id, quality) {\n    if (!window.SRS) { markLearned(id, quality !== \"again\"); return; }\n    var entry = SRS.applyQuality(SRS.getEntry(state, id), quality);\n    SRS.setEntry(state, id, entry);\n    saveState();\n    updateStats();\n  }\n  function applyQuizResult(id, result) {\n    if (!id) return;\n    if (!window.SRS) { markLearned(id, result === \"correct\"); return; }\n    var entry = SRS.getEntry(state, id);\n    if (result === \"correct\") entry = SRS.onCorrect(entry);\n    else if (result === \"almost\") entry = SRS.onAlmost(entry);\n    else entry = SRS.onWrong(entry);\n    SRS.setEntry(state, id, entry);\n    saveState();\n    updateStats();\n  }"],["function learnedCount() { return Object.keys(state.learned).length; }","function learnedCount() { if (window.SRS) return SRS.learnedCount(state); return Object.keys(state.learned || {}).length; }"],["function renderHome() {\n    updateStats();\n    var grid = document.getElementById(\"home-categories\");","function renderHome() {\n    updateStats();\n    var dueEl = document.getElementById(\"due-today-count\");\n    if (dueEl && window.SRS) dueEl.textContent = String(SRS.countDue(state));\n    var grid = document.getElementById(\"home-categories\");"]];
  function inject(code){
    var s=document.createElement("script");
    s.text=code;
    document.head.appendChild(s);
  }
  function patch(code){
    for(var i=0;i<PAIRS.length;i++){
      if(code.indexOf(PAIRS[i][0])!==-1) code=code.replace(PAIRS[i][0], PAIRS[i][1]);
      else console.warn("SRS patch miss", i);
    }
    return code;
  }
  fetch(CDN).then(function(r){return r.text();}).then(function(code){inject(patch(code));})
  .catch(function(e){console.error(e);var s=document.createElement("script");s.src=CDN;document.head.appendChild(s);});
})();
