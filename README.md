# Cora ORBIT — a Video.js v10 skin

**Everything orbits the picture.** Glass controls that let the scene show through, one accent colour, and one circle that carries your progress and your practice loops. Lazy hands get gestures, and anyone can just tell the player what they want.

Built for the Contra × Video.js Skins Design Challenge, on `@videojs/html` **10.4.0** (HTML custom elements, no framework).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

Until a Mux Playback ID is set, the page plays a local test clip from `public/dev/` (not shipped in production builds once Mux is set).

## Before you deploy

1. **Mux video.** Upload *Tears of Steel* to Mux, copy its public Playback ID and paste it into `src/config.js` → `MUX_PLAYBACK_ID`.
2. **Chapters & captions.** Put `chapters.vtt` and `captions-en.vtt` for the film in `public/media/` (the paths are in `src/config.js`).
3. **Logo.** Add `public/brand/cora-logo.svg` and swap the placeholder in `index.html` (search for `data-logo`).
4. **Deploy.** Push to GitHub and import into Vercel (framework preset: Vite), or run `npx vercel` in this folder. Add your domain in Vercel → Settings → Domains.

## What Orbit adds on top of Video.js v10

| | |
| --- | --- |
| **The orbit** | The play button wears playback progress as a ring; a practice loop fills its own ring pass by pass. |
| **Chapters** | Segmented timeline with thumbnail + chapter previews, a chapter menu (v10 has none yet, videojs/v10#1873), the current chapter named in the bar, `Shift + ←/→` to jump. |
| **Glass settings** | Two cards, one level deep: a continuous 0.25–3× speed slider with snap marks, quality (Mux renditions), captions, caption size and backdrop, ambient glow, loop video, sleep timer. |
| **Captions** | Orbit draws captions itself so they rise above the controls, stay readable over bright and dark frames, and follow the viewer's size and backdrop choices. |
| **Practice loop** | Mark A and B (`[` `]`), choose passes, frame-step (`,` `.`), loop on/off (`Shift + L`). Stops and says so when the target is reached. |
| **Ask Orbit** | `/` or ✦: type or say “too fast and I’m going to bed”, “loop this”, “skip to the next chapter”, “bigger captions”, “what’s happening?”. Understanding runs in the browser (`src/orbit/nlu.js`); answers about the film come from `src/orbit/knowledge.js`. No server, no account. |
| **Gestures** | Tap / double-tap from v10, plus hold anywhere for 2× (slide sideways to tune 1–3×; `Shift + hold Space` on a keyboard), and in fullscreen swipe up/down for brightness (left) and volume (right), swipe down in the middle to leave. |
| **Ambient glow** | The player samples its own picture and tints the page and its glass — and thickens the glass on bright frames so controls stay legible. |
| **Remembers you** | Volume, mute, speed, captions and caption size persist between visits. |

## Accessibility

Every gesture has a button and a key. Focus is always visible (accent ring plus a dark halo for contrast over any frame), controls stay up while focus is inside them, all controls are real buttons/sliders with labels, radio groups use roving focus, touch targets are 44 px on touch screens, motion drops away with `prefers-reduced-motion`, and `forced-colors` / `prefers-contrast` are handled. Orbit's own actions are announced through a polite live region alongside v10's status announcer.

## Customising

The skin supports the public Video.js skin properties: `--media-accent-color`, `--media-border-radius`, `--media-font-family`.

## Structure

```
index.html            page + the Orbit skin markup (Video.js v10 elements)
src/main.js           registers Video.js elements and boots Orbit
src/media.js          inserts <mux-video> (or the dev <video>) with its tracks
src/config.js         Mux playback ID and track paths
src/orbit.css         the skin
src/page.css          the showcase page
src/orbit/*.js        Orbit's behaviour, built on the v10 player store
```

## Credits & licence

Film: *Tears of Steel* © Blender Foundation | mango.blender.org, CC BY 3.0.
Skin code: Apache License 2.0. Video.js is a separate open-source project.
