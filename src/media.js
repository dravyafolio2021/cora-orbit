// Inserts the media element into the Orbit container before Video.js
// registers its elements, so the player finds it on first connect.
import { MUX_PLAYBACK_ID, TRACKS, DEV_SRC } from './config.js';

function track(attrs) {
  const t = document.createElement('track');
  for (const [k, v] of Object.entries(attrs)) {
    if (v === true) t.setAttribute(k, '');
    else if (v != null && v !== false) t.setAttribute(k, v);
  }
  return t;
}

export function mountMedia() {
  const container = document.querySelector('media-container.orbit');
  if (!container || container.querySelector('video, mux-video')) return;

  const el = document.createElement(MUX_PLAYBACK_ID ? 'mux-video' : 'video');
  el.setAttribute('playsinline', '');
  el.setAttribute('crossorigin', 'anonymous');
  el.setAttribute('preload', 'metadata');
  el.className = 'orbit-media';
  el.setAttribute('src', MUX_PLAYBACK_ID ? `https://stream.mux.com/${MUX_PLAYBACK_ID}.m3u8` : DEV_SRC);
  if (MUX_PLAYBACK_ID) el.setAttribute('poster-time', '285'); // the bridge, with the robot behind

  if (TRACKS.chapters) el.append(track({ kind: 'chapters', src: TRACKS.chapters, srclang: 'en', label: 'Chapters', default: true }));
  for (const c of TRACKS.captions ?? []) el.append(track({ kind: 'captions', src: c.src, srclang: c.lang, label: c.label }));
  if (TRACKS.thumbnails) el.append(track({ kind: 'metadata', label: 'thumbnails', src: TRACKS.thumbnails, default: true }));

  container.prepend(el);
}

mountMedia();
