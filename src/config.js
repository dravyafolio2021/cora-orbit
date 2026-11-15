// Cora ORBIT — media configuration.
//
// Paste the public Playback ID of your Mux asset here. While it is empty the
// page plays the local development clip in /public/dev instead.
export const MUX_PLAYBACK_ID = '01iEqivMffn3h7Hl00Ubt01ceT5tWKBU01jwRWNcTjjYMFo';

export const TITLE = 'Tears of Steel';

// Works when the site is served from a sub-path too.
const BASE = import.meta.env.BASE_URL;

// Text tracks served from /public. Chapters drive the segmented timeline, the
// chapter menu and the assistant's "skip to…" commands.
export const TRACKS = MUX_PLAYBACK_ID
  ? {
      chapters: `${BASE}media/chapters.vtt`,
      captions: [{ src: `${BASE}media/captions-en.vtt`, label: 'English', lang: 'en' }],
      thumbnails: null, // Mux supplies the storyboard automatically.
    }
  : {
      chapters: `${BASE}dev/chapters.vtt`,
      captions: [{ src: `${BASE}dev/captions.vtt`, label: 'English', lang: 'en' }],
      thumbnails: `${BASE}dev/storyboard.vtt`,
    };

export const DEV_SRC = `${BASE}dev/test.mp4`;
