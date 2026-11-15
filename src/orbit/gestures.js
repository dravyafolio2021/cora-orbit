// Gestures Video.js doesn't ship, layered on top of its tap / double-tap:
//  • Hold anywhere on the picture → 2×. Slide sideways while holding → 1–3×.
//  • Fullscreen, touch: swipe up/down on the left for brightness, on the right
//    for volume; swipe down in the middle to leave fullscreen.
// Every gesture has a button and a key too (see keys.js and the controls).
import { clamp, prefs } from './util.js';

const HOLD_MS = 420;
const SLOP = 10;
const INTERACTIVE =
  'button, a, input, label, select, textarea, dialog, [role="button"], [role="slider"], [data-interactive], .orbit-card, media-popover, media-time-slider, media-volume-slider, media-controls-group, [class*="-button"]';

export function initGestures(ctx) {
  const { store, container } = ctx;
  let p = null; // active pointer gesture
  let brightness = prefs.get('brightness', 1);

  const applyBrightness = () => container.style.setProperty('--orbit-brightness', String(brightness));
  applyBrightness();

  function startHold() {
    if (!p || p.mode) return;
    p.mode = 'hold';
    p.prevRate = store.playbackRate;
    p.rate = Math.max(2, p.prevRate);
    store.setPlaybackRate(p.rate);
    container.setAttribute('data-holding', '');
    p.release = store.requestControlsLock?.();
    store.toggleControls?.(false);
    ctx.hud.speed(p.rate);
    navigator.vibrate?.(8);
  }

  function endHold() {
    if (!p || p.mode !== 'hold') return;
    store.setPlaybackRate(p.prevRate);
    container.removeAttribute('data-holding');
    p.release?.();
    ctx.hud.close('speed');
  }

  container.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button > 0) return;
    if (e.target.closest(INTERACTIVE)) return;
    p = { id: e.pointerId, x: e.clientX, y: e.clientY, type: e.pointerType, mode: null, t: performance.now() };
    p.side = e.clientX - container.getBoundingClientRect().left < container.clientWidth / 2 ? 'left' : 'right';
    p.third = (e.clientX - container.getBoundingClientRect().left) / container.clientWidth;
    p.timer = setTimeout(startHold, HOLD_MS);
  });

  container.addEventListener('pointermove', (e) => {
    if (!p || e.pointerId !== p.id) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;

    if (p.mode === 'hold') {
      // Slide to tune: 1× at the far left, 3× at the far right of a ~240px swing.
      const r = clamp(Math.round((p.rate + dx / 120) * 4) / 4, 1, 3);
      if (r !== store.playbackRate) { store.setPlaybackRate(r); ctx.hud.speed(r); }
      p.x = e.clientX - (r - p.rate) * 120; // keep the swing anchored
      p.rate = r;
      return;
    }

    if (!p.mode && Math.hypot(dx, dy) > SLOP) {
      clearTimeout(p.timer);
      const fs = container.hasAttribute('data-fullscreen');
      if (fs && p.type !== 'mouse' && Math.abs(dy) > Math.abs(dx)) {
        if (p.third > 0.33 && p.third < 0.67) p.mode = 'dismiss';
        else p.mode = p.side === 'left' ? 'brightness' : 'volume';
        p.base = p.mode === 'volume' ? (store.muted ? 0 : store.volume) : brightness;
        p.y0 = e.clientY;
      } else {
        p.mode = 'none';
      }
    }

    if (p.mode === 'volume' || p.mode === 'brightness') {
      const delta = -(e.clientY - p.y0) / (container.clientHeight * 0.6);
      if (p.mode === 'volume') {
        if (store.volumeAvailability !== 'available') {
          ctx.hud.note('Use your device buttons for volume');
          p.mode = 'none';
          return;
        }
        const v = clamp(p.base + delta, 0, 1);
        if (v > 0 && store.muted) store.setMuted(false);
        store.setVolume(v);
        ctx.hud.level('volume', v);
      } else {
        brightness = clamp(p.base + delta, 0.35, 1.25);
        applyBrightness();
        ctx.hud.level('brightness', (brightness - 0.35) / 0.9);
      }
    }
  });

  const finish = (e) => {
    if (!p || (e && e.pointerId !== p.id)) return;
    clearTimeout(p.timer);
    if (p.mode === 'hold') endHold();
    if (p.mode === 'brightness') prefs.set('brightness', brightness);
    if (p.mode === 'dismiss' && e && e.clientY - p.y > 110) store.exitFullscreen?.();
    p = null;
  };
  container.addEventListener('pointerup', finish);
  container.addEventListener('pointercancel', finish);
  container.addEventListener('lostpointercapture', finish);
  // A long press on touch would otherwise open the browser's context menu.
  container.addEventListener('contextmenu', (e) => { if (container.hasAttribute('data-holding')) e.preventDefault(); });

  // Keyboard twin of hold-for-speed: Shift + hold Space.
  let keyHold = null;
  container.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || !e.shiftKey || e.repeat || e.target.closest('input, textarea')) return;
    e.preventDefault();
    keyHold = { prev: store.playbackRate };
    container.setAttribute('data-holding', '');
    store.setPlaybackRate(2);
    ctx.hud.speed(2);
  });
  container.addEventListener('keyup', (e) => {
    if (e.code !== 'Space' || !keyHold) return;
    store.setPlaybackRate(keyHold.prev);
    container.removeAttribute('data-holding');
    ctx.hud.close('speed');
    keyHold = null;
  });

  ctx.resetBrightness = () => { brightness = 1; applyBrightness(); prefs.set('brightness', 1); };
}
