/**
 * Shared site accounts (browser localStorage only — not a real server login).
 * Same origin: home page + /bone-studio/ both use this file.
 */
(function () {
  const ACCOUNTS_KEY = "austinziolo_accounts_v1";
  const SESSION_KEY = "austinziolo_session_v1";
  const GUEST_BONES_KEY = "austinziolo_guest_bones_v1";
  const GUEST_INV_KEY = "austinziolo_guest_inv_v1";

  function notifyBonesChanged() {
    try {
      window.dispatchEvent(new CustomEvent("austinziolo-bones-changed"));
    } catch (_) {}
  }

  function readGuestBones() {
    const raw = localStorage.getItem(GUEST_BONES_KEY);
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function readRowBones(row) {
    const b = row.bones;
    const n = typeof b === "number" ? b : parseInt(b, 10);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }

  /** Positive quantities only. */
  function normalizeInvObject(obj) {
    const out = {};
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return out;
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const n = Math.floor(Number(obj[k])) || 0;
      if (n > 0) out[k] = n;
    }
    return out;
  }

  function inventoryFromAccountRow(row) {
    const inv = {};
    if (row.inv && typeof row.inv === "object" && !Array.isArray(row.inv)) {
      const keys = Object.keys(row.inv);
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const n = Math.floor(Number(row.inv[k])) || 0;
        if (n > 0) inv[k] = n;
      }
    }
    const legacy = readRowBones(row);
    if (legacy > 0) {
      inv.fossil = (inv.fossil || 0) + legacy;
    }
    return normalizeInvObject(inv);
  }

  function readGuestInventoryObj() {
    try {
      const raw = localStorage.getItem(GUEST_INV_KEY);
      if (raw) {
        const j = JSON.parse(raw);
        if (j && typeof j === "object" && !Array.isArray(j)) {
          return normalizeInvObject(j);
        }
      }
    } catch (_) {}
    const legacy = readGuestBones();
    return legacy > 0 ? { fossil: legacy } : {};
  }

  function writeGuestInventoryObj(inv) {
    const norm = normalizeInvObject(inv);
    localStorage.setItem(GUEST_INV_KEY, JSON.stringify(norm));
    localStorage.removeItem(GUEST_BONES_KEY);
    notifyBonesChanged();
  }

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
        inv: {},
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

    /** Total item count across all types (Bone Studio + home summary). */
    getBones() {
      const stacks = this.getInventoryStacks();
      let t = 0;
      for (let i = 0; i < stacks.length; i++) {
        t += stacks[i].qty;
      }
      return t;
    },

    /** Stacks for UI: one entry per item type with qty ≥ 1. */
    getInventoryStacks() {
      const user = this.getCurrentUser();
      let inv;
      if (!user) {
        inv = readGuestInventoryObj();
      } else {
        const key = usernameKey(user);
        const row = getAccounts().find(function (x) { return x.u === key; });
        if (!row) return [];
        inv = inventoryFromAccountRow(row);
      }
      const keys = Object.keys(inv).sort();
      const out = [];
      for (let i = 0; i < keys.length; i++) {
        const id = keys[i];
        out.push({ id: id, qty: inv[id] });
      }
      return out;
    },

    /** Add items of a given type (`fossil` = Bone Studio dig). */
    addItem(itemId, delta) {
      const id = typeof itemId === "string" && itemId.trim() ? itemId.trim() : "fossil";
      const d = Math.floor(Number(delta)) || 0;
      if (d === 0) return this.getBones();
      const user = this.getCurrentUser();
      if (!user) {
        const inv = readGuestInventoryObj();
        const nextQty = Math.max(0, (inv[id] || 0) + d);
        if (nextQty === 0) delete inv[id];
        else inv[id] = nextQty;
        writeGuestInventoryObj(inv);
        return this.getBones();
      }
      const key = usernameKey(user);
      const accounts = getAccounts();
      const i = accounts.findIndex(function (x) { return x.u === key; });
      if (i < 0) return 0;
      const inv = inventoryFromAccountRow(accounts[i]);
      const nextQty = Math.max(0, (inv[id] || 0) + d);
      if (nextQty === 0) delete inv[id];
      else inv[id] = nextQty;
      accounts[i].inv = inv;
      delete accounts[i].bones;
      saveAccounts(accounts);
      notifyBonesChanged();
      return this.getBones();
    },

    /** Add fossils (same as addItem("fossil", delta)). */
    addBones(delta) {
      return this.addItem("fossil", delta);
    },

    /** Storage keys for cross-tab refresh (same values as internal constants). */
    storageKeys: {
      accounts: ACCOUNTS_KEY,
      session: SESSION_KEY,
      guestBones: GUEST_BONES_KEY,
      guestInv: GUEST_INV_KEY,
    },
  };
})();
