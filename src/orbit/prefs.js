// Remembers volume, mute, speed and captions between visits.
// (Video.js leaves storage to the app; see its "user preferences" guide.)
import { prefs, watch } from './util.js';

export function initPrefs(ctx) {
  const { store } = ctx;
  let restored = false;
  watch(store, (s) => s.canPlay, (ready) => {
    if (!ready || restored) return;
    restored = true;
    const v = prefs.get('volume');
    if (Number.isFinite(v)) store.setVolume(v);
    if (prefs.get('muted') === true) store.setMuted(true);
    const r = prefs.get('rate');
    if (Number.isFinite(r) && r !== 1) store.setPlaybackRate(r);
    if (prefs.get('captions') === true) store.toggleSubtitles(true);
    setTimeout(() => { ctx.prefsReady = true; }, 0);
  });
  watch(store, (s) => `${s.volume}|${s.muted}`, () => {
    if (!restored) return;
    prefs.set('volume', store.volume);
    prefs.set('muted', store.muted);
  });
}
