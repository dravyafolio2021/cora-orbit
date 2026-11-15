// Ambient glow: the player samples its own picture once a second and tints
// the page and its glass with it ("letting the content influence the color").
// Needs CORS-enabled media (Mux is); quietly does nothing otherwise.
import { prefersReducedMotion } from './util.js';
import { MUX_PLAYBACK_ID } from '../config.js';

export function initGlow(ctx) {
  const { container } = ctx;
  const root = document.documentElement;
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 9;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  let timer = 0;
  let tainted = false;

  function sample() {
    const media = ctx.media;
    const video = media?.shadowRoot?.querySelector('video') ?? (media instanceof HTMLVideoElement ? media : null);
    if (!video || video.readyState < 2 || tainted) return;
    try {
      g.drawImage(video, 0, 0, 16, 9);
      const d = g.getImageData(0, 0, 16, 9).data;
      let r = 0, gr = 0, b = 0, n = 0, lum = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; gr += d[i + 1]; b += d[i + 2]; n++; }
      r /= n; gr /= n; b /= n;
      lum = (0.2126 * r + 0.7152 * gr + 0.0722 * b) / 255;
      root.style.setProperty('--glow-rgb', `${Math.round(r)} ${Math.round(gr)} ${Math.round(b)}`);
      // Bright frames get a slightly stronger glass so controls stay legible.
      container.style.setProperty('--frame-luma', lum.toFixed(2));
      container.toggleAttribute('data-bright-frame', lum > 0.55);
    } catch {
      tainted = true; // cross-origin without CORS: leave the defaults
    }
  }

  function run() {
    clearInterval(timer);
    sample();
    timer = setInterval(sample, prefersReducedMotion() ? 3000 : 1000);
  }

  // Sampling always runs (it also keeps the glass legible on bright frames);
  // the page glow itself is shown only while [data-glow] is set.
  // Cinema fill behind the picture.
  const fill = document.createElement('div');
  fill.className = 'orbit-fill';
  fill.setAttribute('aria-hidden', 'true');
  const fc = document.createElement('canvas');
  fc.width = 64; fc.height = 36;
  fill.append(fc);
  container.prepend(fill);
  if (MUX_PLAYBACK_ID) fill.style.backgroundImage = `url("https://image.mux.com/${MUX_PLAYBACK_ID}/thumbnail.webp?time=285&width=320")`;
  const fg = fc.getContext('2d');
  let fillTimer = 0;
  function draw() {
    const media = ctx.media;
    const video = media?.shadowRoot?.querySelector('video') ?? (media instanceof HTMLVideoElement ? media : null);
    if (!video || video.readyState < 2 || tainted || !video.videoWidth) return;
    try {
      // centre-crop the frame to 16:9 so the echo isn't stretched
      const vw = video.videoWidth, vh = video.videoHeight;
      const sw = Math.min(vw, vh * 16 / 9);
      fg.drawImage(video, (vw - sw) / 2, 0, sw, vh, 0, 0, 64, 36);
      fill.setAttribute('data-live', '');
    } catch { tainted = true; }
  }
  const fillRun = () => {
    clearInterval(fillTimer);
    draw();
    if (!ctx.store.paused && !document.hidden) fillTimer = setInterval(draw, prefersReducedMotion() ? 1000 : 160);
  };
  const m = ctx.media;
  for (const ev of ['loadeddata', 'seeked', 'play', 'pause', 'playing']) m?.addEventListener(ev, fillRun);
  document.addEventListener('visibilitychange', fillRun);
  fillRun();

  ctx.glow = () => run();
  run();
  document.addEventListener('visibilitychange', () => (document.hidden ? clearInterval(timer) : run()));
}
