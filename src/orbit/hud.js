// Heads-up pills for Orbit's own gestures (hold-for-speed, swipes, notes).
// Video.js's seek / volume / status indicators handle the built-in actions.
import { $ } from './util.js';

export function createHud(container) {
  const pills = {
    speed: $('[data-hud="speed"]', container),
    level: $('[data-hud="level"]', container),
    note: $('[data-hud="note"]', container),
  };
  const timers = {};

  function open(name, ms) {
    for (const [k, el] of Object.entries(pills)) if (k !== name) el.hidden = true;
    const el = pills[name];
    el.hidden = false;
    el.removeAttribute('data-closing');
    clearTimeout(timers[name]);
    if (ms) timers[name] = setTimeout(() => close(name), ms);
    return el;
  }

  function close(name) {
    const el = pills[name];
    if (!el || el.hidden) return;
    el.setAttribute('data-closing', '');
    clearTimeout(timers[name]);
    timers[name] = setTimeout(() => { el.hidden = true; el.removeAttribute('data-closing'); }, 160);
  }

  return {
    speed(rate, { held = true } = {}) {
      const el = open('speed', held ? 0 : 900);
      $('.orbit-hud-value', el).textContent = `${Number(rate.toFixed(2))}×`;
      // 1× … 3× scale
      el.style.setProperty('--hud-fill', `${((rate - 1) / 2) * 100}%`);
      el.toggleAttribute('data-held', held);
    },
    level(kind, value) {
      const el = open('level', 900);
      el.dataset.kind = kind;
      $('use', el).setAttribute('href', kind === 'brightness' ? '#i-sun' : value === 0 ? '#i-vol-off' : value < 0.5 ? '#i-vol-low' : '#i-vol-high');
      $('.orbit-hud-value', el).textContent = `${Math.round(value * 100)}%`;
      el.style.setProperty('--hud-fill', `${value * 100}%`);
    },
    note(text, ms = 1400) {
      const el = open('note', ms);
      $('.orbit-hud-text', el).textContent = text;
    },
    close,
  };
}
