// AP3X — core/storage.js
// Shared Storage Adapter — cross-tab reactive localStorage
// Reuses NDOS architecture contract. All state reads/writes flow through here.

const _subscribers = new Map();

function _notify(key, value) {
  _subscribers.get(key)?.forEach((fn) => fn(value));
  _subscribers.get("*")?.forEach((fn) => fn({ key, value }));
}

export const StorageAdapter = {
  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    _notify(key, value);
  },
  update(key, fn) {
    const current = this.get(key);
    const updated = fn(current);
    this.set(key, updated);
    return updated;
  },
  delete(key) {
    localStorage.removeItem(key);
    _notify(key, null);
  },
  subscribe(key, callback) {
    if (!_subscribers.has(key)) _subscribers.set(key, new Set());
    _subscribers.get(key).add(callback);
    const crossTab = (e) => {
      if (e.key === key) {
        try { callback(JSON.parse(e.newValue)); } catch { callback(null); }
      }
    };
    if (typeof window !== "undefined") window.addEventListener("storage", crossTab);
    return () => {
      _subscribers.get(key)?.delete(callback);
      if (typeof window !== "undefined") window.removeEventListener("storage", crossTab);
    };
  },
  subscribeAll(callback) { return this.subscribe("*", callback); }
};

// ─────────────────────────────────────────────
// AP3X STORAGE KEYS
// ─────────────────────────────────────────────

export const AP3X_KEYS = {
  VEHICLES:       "ap3x_vehicles",
  TRIPS:          "ap3x_trips",
  ROUTES:         "ap3x_routes",
  EVENTS:         "ap3x_events",
  AI_MESSAGES:    "ap3x_ai_messages",
  SYSTEM_STATUS:  "ap3x_system_status",
  SIM_RUNNING:    "ap3x_sim_running",
  ACTIVE_TRIP:    "ap3x_active_trip",
  SETTINGS:       "ap3x_settings"
};

export const storage = {
  get(key)         { return StorageAdapter.get(key); },
  set(key, value)  { StorageAdapter.set(key, value); rawLog("STATE_WRITE", { key }); },
  update(key, fn)  { StorageAdapter.update(key, fn); rawLog("STATE_UPDATE", { key }); },
  delete(key)      { StorageAdapter.delete(key); rawLog("STATE_DELETE", { key }); },
  subscribe(key, cb) { return StorageAdapter.subscribe(key, cb); },
  subscribeAll(cb)   { return StorageAdapter.subscribeAll(cb); }
};

export function rawLog(type, payload, module = "AP3X", source = "system") {
  const raw = JSON.parse(localStorage.getItem(AP3X_KEYS.EVENTS) || "[]");
  raw.push({ id: crypto.randomUUID(), type, module, payload, source, timestamp: new Date().toISOString() });
  if (raw.length > 500) raw.splice(0, raw.length - 500);
  localStorage.setItem(AP3X_KEYS.EVENTS, JSON.stringify(raw));
}
