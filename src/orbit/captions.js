// Orbit draws captions itself so they can rise above the controls, stay
// readable over bright and dark footage, and take the viewer's size and
// backdrop preferences. The native rendering is hidden with ::cue.
import { $, watch } from './util.js';

export function initCaptions(ctx) {
  const { store, container } = ctx;
  const box = $('.orbit-captions-box', container);
  let bound = null;

  function hideNative(media) {
    // <video> in light DOM: CSS in orbit.css handles ::cue. Media elements
    // with an open shadow root (e.g. <mux-video>) get the same rule inside.
    const root = media?.shadowRoot;
    if (root && !root.querySelector('style[data-orbit-cue]')) {
      const s = document.createElement('style');
      s.dataset.orbitCue = '';
      s.textContent = 'video::cue{color:transparent!important;background:transparent!important;text-shadow:none!important}';
      root.append(s);
    }
  }

  function showingTrack(media) {
    const tracks = media?.textTracks;
    if (!tracks) return null;
    for (const t of tracks) if (t.mode === 'showing' && (t.kind === 'captions' || t.kind === 'subtitles')) return t;
    return null;
  }

  function paint() {
    const t = bound;
    const cues = t?.activeCues ? [...t.activeCues] : [];
    const text = cues.map((c) => c.text ?? '').join('\n').replace(/<[^>]+>/g, '').trim();
    box.hidden = !text;
    box.textContent = text;
  }

  function rebind() {
    const media = ctx.media;
    hideNative(media);
    const t = showingTrack(media);
    if (t === bound) return paint();
    bound?.removeEventListener('cuechange', paint);
    bound = t;
    bound?.addEventListener('cuechange', paint);
    paint();
  }

  watch(store, (s) => s.subtitlesShowing, rebind);
  watch(store, (s) => (s.textTrackList ?? []).map((t) => `${t.id}:${t.mode}`).join('|'), rebind);
  // Fallback: some engines don't fire cuechange reliably while seeking.
  watch(store, (s) => Math.floor(s.currentTime * 4), () => bound && paint());
}
