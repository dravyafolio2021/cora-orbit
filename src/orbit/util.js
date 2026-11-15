// Small helpers shared by Orbit's modules.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Format seconds as m:ss or h:mm:ss. */
export function fmt(t) {
  if (!Number.isFinite(t) || t < 0) t = 0;
  const s = Math.floor(t % 60);
  const m = Math.floor((t / 60) % 60);
  const h = Math.floor(t / 3600);
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Format with tenths, for loop points. */
export function fmtPrecise(t) {
  if (!Number.isFinite(t) || t < 0) t = 0;
  const tenths = Math.floor((t % 1) * 10);
  return `${fmt(t)}.${tenths}`;
}

export function rateLabel(r) {
  return `${Number(r.toFixed(2)).toString()}×`;
}

/**
 * Subscribe to the player store, calling `fn(value)` whenever `select(store)`
 * changes (shallow compare for arrays and primitives). Calls once immediately.
 */
export function watch(store, select, fn) {
  let prev = Symbol('init');
  const run = () => {
    const next = select(store);
    if (Array.isArray(next) && Array.isArray(prev) && next.length === prev.length && next.every((v, i) => v === prev[i])) return;
    if (next === prev) return;
    prev = next;
    fn(next);
  };
  run();
  return store.subscribe(run);
}

/** Simple in-memory + localStorage preferences with a guard for blocked storage. */
const KEY = 'cora-orbit:prefs';
let cache = null;
export const prefs = {
  all() {
    if (cache) return cache;
    try { cache = JSON.parse(localStorage.getItem(KEY) ?? '{}') || {}; } catch { cache = {}; }
    return cache;
  },
  get(k, d) { const v = this.all()[k]; return v === undefined ? d : v; },
  set(k, v) {
    this.all()[k] = v;
    try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* storage blocked: keep in memory */ }
  },
};
