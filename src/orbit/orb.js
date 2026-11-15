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

  // The frame stays 16:9 everywhere; a wide film is letterboxed onto a
  // blurred echo of itself (see glow.js) rather than squeezing the player.

  // Title card shown before the first play.
  $('[data-intro-title]', container).textContent = store.title || ctx.player.getAttribute('content-title') || '';
  watch(store, (s) => Math.round(s.duration), (d) => { $('[data-intro-duration]', container).textContent = d ? fmt(d) : ''; });
  watch(store, (s) => (s.chaptersCues ?? []).length, (n) => { $('[data-intro-chapters]', container).textContent = n ? `${n} chapters` : ''; });
}
