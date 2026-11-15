// The orbit: the big play button wears playback progress as a ring.
import { $, fmt, watch } from './util.js';

export function initOrb(ctx) {
  const { store, container } = ctx;
  watch(store, (s) => (s.duration ? Math.round((s.currentTime / s.duration) * 1000) / 10 : 0), (pct) => {
    container.style.setProperty('--orbit-progress', String(pct));
  });
  // Expose a couple of states the skin's CSS uses outside the buttons.
  watch(store, (s) => s.paused, (p) => container.toggleAttribute('data-paused', p));
  watch(store, (s) => s.ended, (e) => container.toggleAttribute('data-ended', e));
  watch(store, (s) => s.started, (st) => container.toggleAttribute('data-started', st));
  watch(store, (s) => s.isFullscreen, (f) => container.toggleAttribute('data-fullscreen', f));

  // Fit the frame to the film on wide screens (Tears of Steel is 2.4:1);
  // phones keep 16:9 so the controls have room.
  const fit = () => {
    const m = ctx.media;
    const w = m?.videoWidth, h = m?.videoHeight;
    const wide = w && h && w / h > 1.9 && window.matchMedia('(min-width: 640px)').matches;
    if (wide) container.style.setProperty('--orbit-aspect', `${w} / ${h}`);
    else container.style.removeProperty('--orbit-aspect');
  };
  ctx.media?.addEventListener('loadedmetadata', fit);
  window.addEventListener('resize', fit);
  fit();

  // Title card shown before the first play.
  $('[data-intro-title]', container).textContent = store.title || ctx.player.getAttribute('content-title') || '';
  watch(store, (s) => Math.round(s.duration), (d) => { $('[data-intro-duration]', container).textContent = d ? fmt(d) : ''; });
  watch(store, (s) => (s.chaptersCues ?? []).length, (n) => { $('[data-intro-chapters]', container).textContent = n ? `${n} chapters` : ''; });
}
