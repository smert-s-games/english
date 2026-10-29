/* English Practice — Supabase auth + progress sync */
(function () {
  "use strict";
  var sb = null;
  var authUser = null;
  var cloudSaveTimer = null;
  var cloudSyncing = false;
  var getState = null;
  var setState = null;
  var onProgressMerged = null;

  function authReady() {
    var cfg = window.ENGLISH_SUPABASE || {};
    return !!(cfg.url && cfg.anonKey && window.supabase);
  }

  function mapAuthError(err) {
    var m = (err && err.message) || "Что-то пошло не так";
    if (m.indexOf("Invalid login") !== -1) return "Неверная почта или пароль";
    if (m.indexOf("User already registered") !== -1) return "Такой email уже зарегистрирован";
    if (m.indexOf("Email not confirmed") !== -1) return "Подтверди email по ссылке из письма";
    if (m.indexOf("Password") !== -1 && m.indexOf("least") !== -1) return "Пароль слишком короткий (минимум 6 символов)";
    return m;
  }

  function setAuthMsg(text, kind) {
    var el = document.getElementById("auth-msg");
    if (!el) return;
    el.textContent = text || "";
    el.className = "auth-msg" + (kind ? " " + kind : "");
  }

  function setSyncMsg(text) {
    var el = document.getElementById("auth-sync-msg");
    if (el) el.textContent = text || "";
  }

  function updateAccountBtn() {
    var btn = document.getElementById("account-btn");
    if (!btn) return;
    if (authUser) {
      var label = (authUser.email || "Аккаунт").split("@")[0];
      if (label.length > 12) label = label.slice(0, 11) + "…";
      btn.textContent = label;
      btn.classList.add("logged");
      btn.title = authUser.email || "Аккаунт";
    } else {
      btn.textContent = "Войти";
      btn.classList.remove("logged");
      btn.title = "Аккаунт";
    }
  }

  function showAuthOverlay(show) {
    var ov = document.getElementById("auth-overlay");
    if (!ov) return;
    ov.classList.toggle("hidden", !show);
    ov.setAttribute("aria-hidden", show ? "false" : "true");
    if (show) refreshAuthPanel();
  }

  function refreshAuthPanel() {
    var form = document.getElementById("auth-form");
    var logged = document.getElementById("auth-logged");
    var tabs = document.querySelector(".auth-tabs");
    if (!form || !logged) return;
    if (authUser) {
      form.classList.add("hidden");
      if (tabs) tabs.classList.add("hidden");
      logged.classList.remove("hidden");
      var em = document.getElementById("auth-email-display");
      if (em) em.textContent = authUser.email || "";
      setAuthMsg("", "");
    } else {
      form.classList.remove("hidden");
      if (tabs) tabs.classList.remove("hidden");
      logged.classList.add("hidden");
    }
  }

  function setAuthTab(mode) {
    var login = mode === "login";
    var regExtra = document.getElementById("reg-extra");
    if (regExtra) regExtra.classList.toggle("hidden", login);
    var submit = document.getElementById("auth-submit");
    if (submit) submit.textContent = login ? "Войти" : "Создать аккаунт";
    var modeEl = document.getElementById("auth-mode");
    if (modeEl) modeEl.value = mode;
    var tl = document.getElementById("tab-login");
    var tr = document.getElementById("tab-reg");
    if (tl) tl.className = login ? "on" : "";
    if (tr) tr.className = login ? "" : "on";
  }

  function mergeProgress(local, remote) {
    var learned;
    if (window.SRS && SRS.mergeLearnedMaps) {
      learned = SRS.mergeLearnedMaps(local.learned || {}, remote.learned || {});
    } else {
      learned = Object.assign({}, local.learned || {}, remote.learned || {});
    }
    var favorites = Object.assign({}, local.favorites || {}, remote.favorites || {});
    var streak = Math.max(local.streak || 0, remote.streak || 0);
    var quizzes = Math.max(local.quizzesDone || 0, remote.quizzes_done || remote.quizzesDone || 0);
    var lastVisit = local.lastVisit || null;
    var rVisit = remote.last_visit || remote.lastVisit || null;
    if (rVisit && (!lastVisit || String(rVisit) > String(lastVisit))) lastVisit = rVisit;
    var theme = local.theme || remote.theme || "light";
    var out = {
      learned: learned,
      favorites: favorites,
      streak: streak,
      lastVisit: lastVisit,
      quizzesDone: quizzes,
      theme: theme,
      srsMigrated: true,
      dailyNewLimit: local.dailyNewLimit != null ? local.dailyNewLimit : (remote.dailyNewLimit != null ? remote.dailyNewLimit : 10),
      activity: Object.assign({}, remote.activity || {}, local.activity || {}),
    };
    if (window.SRS) SRS.migrateState(out);
    return out;
  }

  function stateToRow(state) {
    return {
      user_id: authUser.id,
      learned: state.learned || {},
      favorites: state.favorites || {},
      streak: state.streak || 0,
      last_visit: state.lastVisit || null,
      quizzes_done: state.quizzesDone || 0,
      theme: state.theme || "light",
    };
  }

  async function pullCloudProgress() {
    if (!sb || !authUser || !getState || !setState) return;
    setSyncMsg("Загружаю прогресс…");
    try {
      var res = await sb
        .from("english_progress")
        .select("*")
        .eq("user_id", authUser.id)
        .maybeSingle();
      if (res.error) throw res.error;
      var state = getState();
      if (res.data) {
        var merged = mergeProgress(state, res.data);
        setState(merged);
        if (onProgressMerged) onProgressMerged(merged);
        setSyncMsg("Прогресс объединён с облаком.");
      } else {
        await pushCloudProgress(true);
        setSyncMsg("Локальный прогресс сохранён в облако.");
      }
    } catch (e) {
      setSyncMsg("Не удалось загрузить: " + mapAuthError(e));
    }
  }

  async function pushCloudProgress(force) {
    if (!sb || !authUser || cloudSyncing || !getState) return;
    cloudSyncing = true;
    try {
      var row = stateToRow(getState());
      var res = await sb.from("english_progress").upsert(row, { onConflict: "user_id" });
      if (res.error) throw res.error;
      if (force) setSyncMsg("Сохранено в облако.");
    } catch (e) {
      setSyncMsg("Ошибка сохранения: " + mapAuthError(e));
    } finally {
      cloudSyncing = false;
    }
  }

  function scheduleCloudSave() {
    if (!authUser || !sb) return;
    if (cloudSaveTimer) clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(function () {
      pushCloudProgress(false);
    }, 1200);
  }

  async function bootAuth() {
    if (!authReady()) {
      updateAccountBtn();
      return;
    }
    var cfg = window.ENGLISH_SUPABASE;
    sb = window.supabase.createClient(cfg.url, cfg.anonKey);
    var session = await sb.auth.getSession();
    authUser = session.data && session.data.session && session.data.session.user;
    updateAccountBtn();
    if (authUser) await pullCloudProgress();
    sb.auth.onAuthStateChange(function (event, sess) {
      authUser = sess && sess.user;
      updateAccountBtn();
      refreshAuthPanel();
      if (authUser && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        pullCloudProgress();
      }
    });
  }

  function bindAuthUI() {
    var accountBtn = document.getElementById("account-btn");
    if (accountBtn) {
      accountBtn.addEventListener("click", function () {
        showAuthOverlay(true);
      });
    }
    var closeBtn = document.getElementById("auth-close");
    if (closeBtn) closeBtn.addEventListener("click", function () { showAuthOverlay(false); });
    var overlay = document.getElementById("auth-overlay");
    if (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) showAuthOverlay(false);
      });
    }
    var tabLogin = document.getElementById("tab-login");
    var tabReg = document.getElementById("tab-reg");
    if (tabLogin) tabLogin.addEventListener("click", function () { setAuthTab("login"); });
    if (tabReg) tabReg.addEventListener("click", function () { setAuthTab("register"); });

    var form = document.getElementById("auth-form");
    if (form) {
      form.addEventListener("submit", async function (e) {
        e.preventDefault();
        if (!sb) {
          setAuthMsg("Supabase не настроен", "error");
          return;
        }
        setAuthMsg("…", "");
        var email = document.getElementById("auth-email").value.trim();
        var password = document.getElementById("auth-password").value;
        var mode = document.getElementById("auth-mode").value;
        var res;
        if (mode === "register") {
          var nameEl = document.getElementById("reg-name");
          res = await sb.auth.signUp({
            email: email,
            password: password,
            options: { data: { full_name: nameEl ? nameEl.value.trim() : "" } },
          });
        } else {
          res = await sb.auth.signInWithPassword({ email: email, password: password });
        }
        if (res.error) {
          setAuthMsg(mapAuthError(res.error), "error");
          return;
        }
        if (mode === "register" && res.data && !res.data.session) {
          setAuthMsg("Аккаунт создан. Если нужно подтверждение почты — открой письмо и войди.", "ok");
          return;
        }
        authUser = res.data.user || (res.data.session && res.data.session.user);
        updateAccountBtn();
        refreshAuthPanel();
        await pullCloudProgress();
        setAuthMsg("Готово!", "ok");
      });
    }

    var logoutBtn = document.getElementById("auth-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async function () {
        if (sb) await sb.auth.signOut();
        authUser = null;
        updateAccountBtn();
        refreshAuthPanel();
        setSyncMsg("");
        setAuthMsg("Вы вышли. Прогресс остаётся в этом браузере.", "ok");
      });
    }
    var syncBtn = document.getElementById("auth-sync-now");
    if (syncBtn) {
      syncBtn.addEventListener("click", async function () {
        await pushCloudProgress(true);
        await pullCloudProgress();
      });
    }
  }

  window.EnglishAuth = {
    init: function (opts) {
      opts = opts || {};
      getState = opts.getState;
      setState = opts.setState;
      onProgressMerged = opts.onProgressMerged;
      bindAuthUI();
      bootAuth();
    },
    scheduleCloudSave: scheduleCloudSave,
    isLoggedIn: function () { return !!authUser; },
  };
})();
