/**
 * Shared site accounts (browser localStorage only — not a real server login).
 * Same origin: home page + /bone-studio/ both use this file.
 */
(function () {
  const ACCOUNTS_KEY = "austinziolo_accounts_v1";
  const SESSION_KEY = "austinziolo_session_v1";

  function hashPassword(usernameKey, password) {
    const s = usernameKey + "\0" + password + "\0austinziolo-salt-v1";
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
  }

  function getAccounts() {
    try {
      const raw = localStorage.getItem(ACCOUNTS_KEY);
      if (!raw) return [];
      const a = JSON.parse(raw);
      return Array.isArray(a) ? a : [];
    } catch {
      return [];
    }
  }

  function saveAccounts(accounts) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  function usernameKey(username) {
    return username.trim().toLowerCase();
  }

  function validateUsername(username) {
    const t = username.trim();
    if (t.length < 2 || t.length > 20) {
      return "Username must be 2–20 characters.";
    }
    if (!/^[a-zA-Z0-9_]+$/.test(t)) {
      return "Use only letters, numbers, and underscores.";
    }
    return null;
  }

  window.SiteAuth = {
    getCurrentUser() {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const o = JSON.parse(raw);
        return typeof o.username === "string" ? o.username : null;
      } catch {
        return null;
      }
    },

    setSession(displayName) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ username: displayName }));
    },

    logout() {
      localStorage.removeItem(SESSION_KEY);
    },

    register(username, password, confirmPassword) {
      const err = validateUsername(username);
      if (err) return { ok: false, error: err };
      if (password.length < 4) {
        return { ok: false, error: "Password must be at least 4 characters." };
      }
      if (password !== confirmPassword) {
        return { ok: false, error: "Passwords do not match." };
      }
      const key = usernameKey(username);
      const accounts = getAccounts();
      if (accounts.some(function (x) { return x.u === key; })) {
        return { ok: false, error: "That username is already taken." };
      }
      const display = username.trim();
      accounts.push({
        u: key,
        display: display,
        p: hashPassword(key, password),
      });
      saveAccounts(accounts);
      this.setSession(display);
      return { ok: true };
    },

    login(username, password) {
      const err = validateUsername(username);
      if (err) return { ok: false, error: err };
      const key = usernameKey(username);
      const row = getAccounts().find(function (x) { return x.u === key; });
      if (!row || row.p !== hashPassword(key, password)) {
        return { ok: false, error: "Wrong username or password." };
      }
      this.setSession(row.display || key);
      return { ok: true };
    },
  };
})();
