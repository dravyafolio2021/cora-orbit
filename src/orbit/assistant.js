// "Ask Orbit": say or type what you want, the player does it.
// Understanding runs on the device (nlu.js); answers about the film come from
// knowledge.js. Nothing is sent anywhere.
import { $, clamp, fmt, fmtPrecise, rateLabel, prefersReducedMotion, watch } from './util.js';
import { understand } from './nlu.js';
import { KNOWLEDGE } from './knowledge.js';
import { cueText } from './chapters.js';

const SIZES = ['s', 'm', 'l'];

export function initAssistant(ctx) {
  const { store, container } = ctx;
  const card = $('#pop-assist');
  const thread = $('[data-assist-thread]', card);
  const ideasEl = $('[data-assist-ideas]', card);
  const stateEl = $('[data-assist-state]', card);
  const form = $('[data-assist-form]', card);
  const input = $('[data-assist-input]', card);
  const mic = $('[data-assist-mic]', card);

  // Keep the player's single-letter hotkeys out of the text field.
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      ctx.popover('pop-assist', false);
      $('#t-assist').focus({ preventScroll: true });
      return;
    }
    if (e.key !== 'Tab') e.stopPropagation();
  });

  // ---------------------------------------------------------------- state ---
  function paintState() {
    const bits = [];
    bits.push({ label: rateLabel(store.playbackRate), on: store.playbackRate !== 1, say: store.playbackRate === 1 ? 'slower' : 'normal speed' });
    bits.push({ label: store.subtitlesShowing ? 'Captions on' : 'Captions off', on: store.subtitlesShowing, say: store.subtitlesShowing ? 'captions off' : 'captions on' });
    if (store.muted) bits.push({ label: 'Muted', on: true, say: 'unmute' });
    if (ctx.loop?.state.on) bits.push({ label: 'Looping', on: true, say: 'stop loop' });
    const sleep = $('[data-sleep-chip]', container);
    if (sleep && !sleep.hidden) bits.push({ label: $('span', sleep).textContent, on: true, say: 'cancel sleep' });
    stateEl.replaceChildren(
      ...bits.map((b) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'orbit-state-pill';
        el.toggleAttribute('data-on', b.on);
        el.textContent = b.label;
        el.title = `Say “${b.say}”`;
        el.setAttribute('aria-label', `${b.label}. Activate to ${b.say}`);
        el.addEventListener('click', () => ask(b.say));
        return el;
      }),
    );
  }
  watch(store, (s) => `${s.playbackRate}|${s.subtitlesShowing}|${s.muted}`, paintState);
  new MutationObserver(paintState).observe(container, { attributes: true, attributeFilter: ['data-looping'] });

  // ---------------------------------------------------------------- ideas ---
  function paintIdeas() {
    const c = ctx.chapters?.current();
    const ideas = [];
    if (!thread.children.length) ideas.push('What’s this about?');
    ideas.push(ctx.loop?.state.on ? 'Stop the loop' : 'Loop the last 10 seconds');
    ideas.push(store.playbackRate > 1 ? 'Normal speed' : 'A bit slower');
    ideas.push(store.subtitlesShowing ? 'Bigger captions' : 'Captions on');
    if (c) ideas.push('What’s happening?');
    ideas.push('Sleep after this video');
    ideasEl.replaceChildren(
      ...ideas.slice(0, 4).map((t) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'orbit-idea';
        b.textContent = t;
        b.addEventListener('click', () => ask(t));
        return b;
      }),
    );
  }

  // --------------------------------------------------------------- thread ---
  function bubble(who, text, actions = []) {
    const el = document.createElement('div');
    el.className = `orbit-msg orbit-msg--${who}`;
    const p = document.createElement('p');
    p.textContent = text;
    el.append(p);
    if (actions.length) {
      const row = document.createElement('div');
      row.className = 'orbit-msg-actions';
      for (const a of actions) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `orbit-pill-btn${a.accent ? ' orbit-pill-btn--accent' : ''}`;
        b.textContent = a.label;
        b.addEventListener('click', () => { a.run(); if (a.once !== false) b.disabled = true; });
        row.append(b);
      }
      el.append(row);
    }
    thread.append(el);
    // Keep the thread short: it's a remote control, not a chat log.
    while (thread.children.length > 6) thread.firstElementChild.remove();
    thread.scrollTop = thread.scrollHeight;
    return el;
  }

  function typing() {
    const el = document.createElement('div');
    el.className = 'orbit-msg orbit-msg--orbit orbit-msg--typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    el.setAttribute('aria-label', 'Orbit is thinking');
    thread.append(el);
    thread.scrollTop = thread.scrollHeight;
    return el;
  }

  // -------------------------------------------------------------- actions ---
  function snapshot() {
    const showing = (store.textTrackList ?? []).find((t) => t.mode === 'showing' && (t.kind === 'captions' || t.kind === 'subtitles'));
    return { rate: store.playbackRate, volume: store.volume, muted: store.muted, cc: showing?.id ?? null, size: container.dataset.ccSize, t: store.currentTime };
  }
  function restore(s, { time = false } = {}) {
    store.setPlaybackRate(s.rate);
    store.setVolume(s.volume);
    store.setMuted(s.muted);
    store.selectSubtitlesTrack(s.cc);
    ctx.setCaptionSize(s.size);
    if (time) store.seek(s.t);
  }

  const seekTo = (t) => { store.seek(clamp(t, 0, store.duration || t)); };
  const playChip = (t, label = `Play ${fmt(t)}`) => ({ label, run: () => { seekTo(t); store.play(); } });

  function findChapter(q) {
    const words = q.replace(/\b(the|a|an|part|scene|chapter|where|bit|with|to)\b/g, ' ').trim().split(/\s+/).filter((w) => w.length > 2);
    if (!words.length) return null;
    let best = null;
    let score = 0;
    for (const c of ctx.chapters.list()) {
      const hay = `${cueText(c)} ${KNOWLEDGE.chapterNotes[cueText(c)] ?? ''}`.toLowerCase();
      const s = words.reduce((n, w) => n + (hay.includes(w) ? 1 : hay.includes(w.slice(0, -1)) ? 0.6 : 0), 0);
      if (s > score) { score = s; best = c; }
    }
    return best;
  }

  // Each handler returns { say, actions?, undoable? }.
  const H = {
    help: () => ({ say: 'Try “too fast”, “loop this”, “skip to the next chapter”, “captions bigger”, “sleep in 20 minutes”, or ask “what’s happening?”. You can also hold the picture for 2×.' }),
    summary: () => ({
      say: `${KNOWLEDGE.title} in a few lines: ${KNOWLEDGE.summary.map((s) => s.text).join(' ')}`,
      actions: KNOWLEDGE.summary.slice(0, 3).map((s) => playChip(s.t)),
    }),
    now: () => {
      const c = ctx.chapters.current();
      if (!c) return { say: `You’re at ${fmt(store.currentTime)} of ${fmt(store.duration)}.` };
      const note = KNOWLEDGE.chapterNotes[cueText(c)];
      return {
        say: `You’re in “${cueText(c)}”, ${fmt(store.currentTime - c.startTime)} in. ${note ?? ''}`.trim(),
        actions: [playChip(c.startTime, 'From the top of this chapter'), { label: 'Loop this chapter', accent: true, run: () => H.loopChapter() }],
      };
    },
    who: ({ q }) => {
      const hit = KNOWLEDGE.entities.find((e) => [e.name, ...(e.aka ?? [])].some((n) => q.includes(n.toLowerCase())));
      if (!hit) return { say: 'I only know the people and places in this film. Try asking about one of them, or “what’s happening?”.' };
      return { say: hit.about, actions: hit.t != null ? [playChip(hit.t, `See them at ${fmt(hit.t)}`)] : [] };
    },
    remaining: () => ({ say: `${fmt(Math.max(0, store.duration - store.currentTime))} left${store.playbackRate !== 1 ? ` (${fmt((store.duration - store.currentTime) / store.playbackRate)} at ${rateLabel(store.playbackRate)})` : ''}.` }),

    sleep: ({ value }) => {
      ctx.setSleep(value === 'end' ? 'end' : String(value));
      return { say: value === 0 ? 'Sleep timer off.' : value === 'end' ? 'I’ll stop when this video ends.' : `I’ll pause in ${value} minutes.`, actions: value === 0 ? [] : [{ label: 'Cancel', run: () => ctx.setSleep('0') }] };
    },

    loopOff: () => { ctx.loop.stop(); return { say: 'Loop off.' }; },
    loopLast: ({ seconds }) => {
      ctx.loop.quick(seconds);
      const { a, b } = ctx.loop.state;
      return { say: `Looping ${fmtPrecise(a)}–${fmtPrecise(b)}, ${ctx.loop.state.passes || 'unlimited'} passes.`, actions: [{ label: 'Slow it to 0.75×', run: () => store.setPlaybackRate(0.75) }, { label: 'Stop', run: () => ctx.loop.stop() }] };
    },
    loopRange: ({ a, b }) => {
      if (a == null || b == null || b <= a) return { say: 'Give me a start and an end, like “loop 1:20 to 1:35”.' };
      ctx.loop.set(a, b);
      return { say: `Looping ${fmt(a)}–${fmt(b)}.`, actions: [{ label: 'Stop', run: () => ctx.loop.stop() }] };
    },
    loopChapter: () => {
      const c = ctx.chapters.current();
      if (!c) return H.loopLast({ seconds: 10 });
      const end = Number.isFinite(c.endTime) ? c.endTime : store.duration;
      ctx.loop.set(c.startTime, end);
      return { say: `Looping the chapter “${cueText(c)}”.`, actions: [{ label: 'Stop', run: () => ctx.loop.stop() }] };
    },

    rate: ({ value }) => { store.setPlaybackRate(clamp(value, 0.25, 3)); return { say: `Speed ${rateLabel(store.playbackRate)}.`, undoable: true }; },
    rateStep: ({ delta }) => {
      const r = clamp(Math.round((store.playbackRate + delta) * 4) / 4, 0.25, 3);
      store.setPlaybackRate(r);
      return { say: delta < 0 ? `Slowed to ${rateLabel(r)}.` : `Sped up to ${rateLabel(r)}.`, undoable: true };
    },

    captions: ({ on }) => { store.toggleSubtitles(on); return { say: on ? 'Captions on.' : 'Captions off.', undoable: true }; },
    ccSize: ({ dir }) => {
      store.toggleSubtitles(true);
      const i = clamp(SIZES.indexOf(container.dataset.ccSize ?? 'm') + dir, 0, 2);
      ctx.setCaptionSize(SIZES[i]);
      return { say: `Captions ${['small', 'medium', 'large'][i]}.`, undoable: true };
    },

    mute: ({ on }) => { store.setMuted(on); return { say: on ? 'Muted.' : 'Sound on.', undoable: true }; },
    volume: ({ value }) => {
      if (store.volumeAvailability !== 'available') return { say: 'This device only lets me mute — use its buttons for volume.' };
      store.setMuted(false); store.setVolume(clamp(value, 0, 1));
      return { say: `Volume ${Math.round(store.volume * 100)}%.`, undoable: true };
    },
    volumeStep: ({ delta }) => {
      if (store.volumeAvailability !== 'available') return { say: 'This device only lets me mute — use its buttons for volume.' };
      store.setMuted(false); store.setVolume(clamp(store.volume + delta, 0, 1));
      return { say: `Volume ${Math.round(store.volume * 100)}%.`, undoable: true };
    },

    quality: ({ value }) => {
      const list = (store.videoRenditionList ?? []).filter((r) => r.height).sort((a, b) => a.height - b.height);
      if (list.length < 2) return { say: 'This video has one quality, so there’s nothing to switch.' };
      if (value === 'auto') { store.selectVideoRendition('auto'); return { say: 'Quality back on Auto.' }; }
      const pick = value === 'low' ? list[0] : list[list.length - 1];
      store.selectVideoRendition(pick.id);
      return { say: value === 'low' ? `Saving data at ${pick.height}p.` : `Best quality, ${pick.height}p.`, actions: [{ label: 'Back to Auto', run: () => store.selectVideoRendition('auto') }] };
    },

    fullscreen: ({ on }) => { (on ? store.requestFullscreen() : store.exitFullscreen())?.catch?.(() => {}); return { say: on ? 'Going fullscreen.' : 'Back to the page.' }; },
    pip: () => {
      if (store.pictureInPictureAvailability !== 'available') return { say: 'Picture-in-picture isn’t available in this browser.' };
      store.requestPictureInPicture().catch(() => {});
      return { say: 'Popped out — keep browsing.' };
    },
    glow: ({ on }) => { ctx.setPref('glow', on); return { say: on ? 'Ambient glow on.' : 'Ambient glow off.' }; },
    brightness: () => { ctx.resetBrightness(); return { say: 'Brightness reset. In fullscreen, swipe up or down on the left side to change it.' }; },

    chapter: ({ dir }) => (ctx.chapters.go(dir) ? { say: `${dir > 0 ? 'Next' : 'Previous'} chapter: “${cueText(ctx.chapters.current())}”.`, undoable: true, time: true } : { say: 'This video has no chapters.' }),
    chapterNamed: ({ q }) => {
      const c = findChapter(q);
      if (!c) return { say: `I couldn’t find “${q}”. Chapters: ${ctx.chapters.list().map(cueText).join(', ')}.` };
      seekTo(c.startTime + 0.01);
      if (store.paused) store.play();
      return { say: `Jumped to “${cueText(c)}”.`, undoable: true, time: true };
    },
    seekTo: ({ t }) => { seekTo(t); return { say: `At ${fmt(t)}.`, undoable: true, time: true }; },
    seekBy: ({ delta }) => { seekTo(store.currentTime + delta); return { say: delta < 0 ? `Back ${fmt(-delta)}.` : `Forward ${fmt(delta)}.`, undoable: true, time: true }; },
    pause: () => { store.pause(); return { say: 'Paused.' }; },
    play: () => { store.play(); return { say: 'Playing.' }; },
  };

  // ------------------------------------------------------------------ ask ---
  async function ask(text) {
    text = text.trim();
    if (!text) return;
    bubble('you', text);
    input.value = '';
    const intents = understand(text);
    const wait = prefersReducedMotion() ? 0 : 260 + Math.random() * 240;
    const dots = wait ? typing() : null;
    await new Promise((r) => setTimeout(r, wait));
    dots?.remove();

    if (!intents.length) {
      bubble('orbit', 'I didn’t catch that. I can change speed, captions, volume and quality, jump around, loop a part, set a sleep timer, or tell you what’s happening.', [
        { label: 'What’s this about?', run: () => ask('What’s this about?') },
        { label: 'Loop this', run: () => ask('loop this') },
      ]);
      paintIdeas();
      return;
    }

    const before = snapshot();
    const replies = [];
    const actions = [];
    let undoable = false;
    let timeUndo = false;
    for (const i of intents) {
      const r = H[i.intent]?.(i) ?? { say: '' };
      if (r.say) replies.push(r.say);
      if (r.actions) actions.push(...r.actions);
      if (r.undoable) undoable = true;
      if (r.time) timeUndo = true;
    }
    if (undoable) actions.unshift({ label: 'Undo', run: () => restore(before, { time: timeUndo }) });
    bubble('orbit', replies.join(' '), actions.slice(0, 3));
    ctx.announce(replies.join(' '));
    paintIdeas();
    paintState();
  }
  ctx.ask = ask;

  form.addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); });

  // Focus the field whenever the card opens.
  new MutationObserver(() => {
    if (card.hasAttribute('data-open')) {
      paintIdeas();
      paintState();
      if (!thread.children.length) bubble('orbit', `Hi — I’m Orbit. Tell me what you’d like, in your own words.`);
      requestAnimationFrame(() => input.focus({ preventScroll: true }));
    }
  }).observe(card, { attributes: true, attributeFilter: ['data-open'] });

  // ---------------------------------------------------------------- voice ---
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    mic.hidden = false;
    let rec = null;
    mic.addEventListener('click', () => {
      if (rec) { rec.stop(); return; }
      rec = new SR();
      rec.lang = navigator.language || 'en-IN';
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      mic.setAttribute('data-listening', '');
      mic.setAttribute('aria-label', 'Stop listening');
      input.placeholder = 'Listening…';
      rec.onresult = (e) => {
        const r = e.results[e.results.length - 1];
        input.value = r[0].transcript;
        if (r.isFinal) ask(input.value);
      };
      rec.onend = rec.onerror = () => {
        rec = null;
        mic.removeAttribute('data-listening');
        mic.setAttribute('aria-label', 'Speak to Orbit');
        input.placeholder = '“slower”, “loop this”, “what’s happening?”';
      };
      try { rec.start(); } catch { rec = null; }
    });
  }

  paintIdeas();
  paintState();
}
