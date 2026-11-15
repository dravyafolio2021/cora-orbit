// Practice loop: mark A and B, choose how many passes, and the orbit ring
// fills with every pass. Stops (and says so) when the target is reached.
import { $, clamp, fmtPrecise, watch } from './util.js';

export function initLoop(ctx) {
  const { store, container } = ctx;
  const card = $('#pop-loop');
  const band = $('[data-loop-band]', container);
  const ring = $('[data-loop-ring]', card);
  const countEl = $('[data-loop-count]', card);
  const ofEl = $('[data-loop-of]', card);
  const rangeEl = $('[data-loop-range]', card);
  const passesOut = $('[data-loop-passes-out]', card);
  const toggleBtn = $('[data-loop-toggle]', card);
  const badge = $('[data-loop-badge]', container);
  const chip = $('[data-loop-chip]', container);
  const loopBtn = $('#t-loop');

  const st = { a: null, b: null, on: false, passes: 5, count: 0 };
  let raf = 0;
  let last = 0;

  const fps = () => store.activeVideoRendition?.frameRate || 24;

  function paint() {
    const d = store.duration || 0;
    const ready = st.a != null && st.b != null && st.b > st.a;
    band.hidden = !ready;
    if (ready && d) {
      band.style.left = `${(st.a / d) * 100}%`;
      band.style.width = `${((st.b - st.a) / d) * 100}%`;
    }
    band.toggleAttribute('data-on', st.on);
    rangeEl.textContent = ready
      ? `${fmtPrecise(st.a)} → ${fmtPrecise(st.b)}  ·  ${(st.b - st.a).toFixed(1)} s`
      : st.a != null ? `A ${fmtPrecise(st.a)} → set B` : 'Mark A and B to begin';
    passesOut.textContent = st.passes ? String(st.passes) : '∞';
    countEl.textContent = String(st.count);
    ofEl.textContent = st.passes ? `/ ${st.passes}` : '';
    toggleBtn.disabled = !ready;
    toggleBtn.textContent = st.on ? 'Stop loop' : 'Start loop';
    toggleBtn.setAttribute('aria-pressed', String(st.on));
    container.toggleAttribute('data-looping', st.on);
    loopBtn.toggleAttribute('data-active', st.on);
    loopBtn.setAttribute('aria-label', st.on ? `Practice loop on, pass ${st.count + 1}${st.passes ? ` of ${st.passes}` : ''}` : 'Practice loop');
    const label = st.passes ? `${Math.min(st.count + 1, st.passes)}/${st.passes}` : `${st.count + 1}`;
    badge.hidden = !st.on;
    badge.textContent = label;
    chip.hidden = !st.on;
    $('span', chip).textContent = ready ? `Looping ${fmtPrecise(st.a)}–${fmtPrecise(st.b)} · pass ${label}` : '';
    ring.setAttribute('aria-label', ready ? `Pass ${st.count} of ${st.passes || 'unlimited'}` : 'No loop yet');
    paintRing();
  }

  function paintRing() {
    const ready = st.a != null && st.b != null && st.b > st.a;
    const t = store.currentTime;
    const p = ready && st.on ? clamp((t - st.a) / (st.b - st.a), 0, 1) : 0;
    ring.style.setProperty('--pass', String(p * 100));
    container.style.setProperty('--loop-pass', String(p * 100));
  }

  function frame() {
    raf = 0;
    if (!st.on) return;
    const m = ctx.media;
    const t = m ? m.currentTime : store.currentTime;
    // Only a natural crossing of B counts as a pass: if the viewer jumps
    // elsewhere (a chapter, a seek), the loop stays out of the way.
    const crossed = last >= st.a - 0.3 && last < st.b && t >= st.b - 0.03 && t - last < 1.5;
    if (crossed && !store.paused) {
      st.count += 1;
      if (st.passes && st.count >= st.passes) {
        st.on = false;
        store.pause();
        ctx.hud.note(`${st.passes} passes done — nice work`, 2200);
        ctx.announce(`Loop finished after ${st.passes} passes`);
        paint();
        return;
      }
      store.seek(st.a);
      last = st.a;
      paint();
    } else {
      last = t;
    }
    paintRing();
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (!(st.a != null && st.b != null && st.b > st.a)) return false;
    st.on = true;
    st.count = 0;
    const t = store.currentTime;
    if (t < st.a || t >= st.b) store.seek(st.a);
    last = st.a;
    if (store.paused) store.play();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
    paint();
    ctx.announce(`Looping ${fmtPrecise(st.a)} to ${fmtPrecise(st.b)}`);
    return true;
  }

  function stop() {
    st.on = false;
    cancelAnimationFrame(raf);
    paint();
    ctx.announce('Loop off');
  }

  const api = {
    state: st,
    setA(t = store.currentTime) {
      st.a = Math.max(0, t);
      if (st.b != null && st.b <= st.a + 0.2) st.b = null;
      ctx.hud.note(`Loop start ${fmtPrecise(st.a)}`);
      paint();
    },
    setB(t = store.currentTime) {
      st.b = Math.min(store.duration || t, t);
      if (st.a == null || st.a >= st.b - 0.2) st.a = Math.max(0, st.b - 5);
      ctx.hud.note(`Loop end ${fmtPrecise(st.b)}`);
      paint();
    },
    set(a, b, { passes } = {}) {
      st.a = Math.max(0, a);
      st.b = Math.min(store.duration || b, b);
      if (passes !== undefined) st.passes = passes;
      paint();
      return start();
    },
    quick(seconds = 5) {
      const t = store.currentTime;
      const b = t < 1 ? Math.min(seconds, store.duration || seconds) : t;
      return api.set(Math.max(0, b - seconds), b);
    },
    start,
    stop,
    toggle() { return st.on ? (stop(), false) : start(); },
    passes(n) { st.passes = clamp(n, 0, 99); paint(); },
    step(dir) {
      if (!store.paused) store.pause();
      store.seek(clamp(store.currentTime + dir / fps(), 0, store.duration || 0));
    },
  };
  ctx.loop = api;

  $('[data-loop-set="a"]', card).addEventListener('click', () => api.setA());
  $('[data-loop-set="b"]', card).addEventListener('click', () => api.setB());
  $('[data-loop-quick]', card).addEventListener('click', () => api.quick(5));
  toggleBtn.addEventListener('click', () => api.toggle());
  for (const b of card.querySelectorAll('[data-loop-passes]')) {
    b.addEventListener('click', () => {
      const d = Number(b.dataset.loopPasses);
      const n = st.passes || 10;
      api.passes(d > 0 ? (st.passes === 0 ? 0 : n >= 20 ? 0 : n + 1) : st.passes === 0 ? 20 : Math.max(1, n - 1));
    });
  }
  for (const b of card.querySelectorAll('[data-frame]')) b.addEventListener('click', () => api.step(Number(b.dataset.frame)));
  card.addEventListener('keydown', (e) => { if (e.key !== 'Escape' && e.key !== 'Tab') e.stopPropagation(); });

  watch(store, (s) => s.duration, paint);
  watch(store, (s) => Math.floor(s.currentTime * 10), () => { if (!st.on) paintRing(); });
  watch(store, (s) => s.paused, (p) => { if (!p && st.on && !raf) raf = requestAnimationFrame(frame); });
  paint();
}
