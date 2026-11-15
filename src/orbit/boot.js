// Waits for the Video.js player store, then starts Orbit's modules.
import { $ } from './util.js';
import { createHud } from './hud.js';
import { initOrb } from './orb.js';
import { initChapters } from './chapters.js';
import { initCaptions } from './captions.js';
import { initSettings } from './settings.js';
import { initLoop } from './loop.js';
import { initGestures } from './gestures.js';
import { initGlow } from './glow.js';
import { initKeys } from './keys.js';
import { initAssistant } from './assistant.js';
import { initPrefs } from './prefs.js';

async function waitForStore(player) {
  await customElements.whenDefined('video-player');
  for (let i = 0; i < 200 && !player.store; i++) await new Promise((r) => setTimeout(r, 10));
  return player.store;
}

export async function boot() {
  const player = $('#player');
  const container = $('media-container.orbit', player);
  const store = await waitForStore(player);
  if (!store) return console.warn('[orbit] player store unavailable');

  const live = $('[data-orbit-announce]', container);
  const ctx = {
    player,
    store,
    container,
    get media() { return container.querySelector('mux-video, video'); },
    hud: createHud(container),
    /** Polite screen-reader announcement for Orbit's own actions. */
    announce(msg) {
      live.textContent = '';
      requestAnimationFrame(() => { live.textContent = msg; });
    },
    /** Open or close one of Orbit's popovers through its trigger. */
    popover(id, open = true) {
      const pop = document.getElementById(id);
      if (!pop) return;
      const isOpen = pop.hasAttribute('data-open');
      if (isOpen === open) return;
      const trigger = container.querySelector(`[commandfor="${id}"]`);
      if (!open && typeof pop.close === 'function') return pop.close();
      if (trigger && trigger.offsetParent !== null) trigger.click();
      else pop.open = open; // trigger hidden on small players: open directly (shown as a sheet)
    },
  };

  container.dataset.ready = '';
  window.orbit = ctx; // handy for debugging in the console

  initPrefs(ctx);
  initOrb(ctx);
  initChapters(ctx);
  initCaptions(ctx);
  initSettings(ctx);
  initLoop(ctx);
  initGestures(ctx);
  initGlow(ctx);
  initAssistant(ctx);
  initKeys(ctx);
}
