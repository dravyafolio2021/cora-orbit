// Settings: two glass cards, one level deep. Speed is a continuous slider
// with snap marks; quality and captions are chips; preferences are switches.
import { $, $$, clamp, fmt, prefs, rateLabel, watch } from './util.js';

const SPEED_MARKS = [0.5, 1, 1.5, 2, 3];
const SPEED_MIN = 0.25;
const SPEED_MAX = 3;

function radioChips(groupEl, items, selected, onPick) {
  groupEl.replaceChildren();
  for (const it of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'orbit-chip-btn';
    b.setAttribute('role', 'radio');
    b.textContent = it.label;
    if (it.aria) b.setAttribute('aria-label', it.aria);
    const on = it.value === selected;
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1;
    b.addEventListener('click', () => onPick(it.value));
    groupEl.append(b);
  }
  if (!groupEl.querySelector('[tabindex="0"]') && groupEl.firstElementChild) groupEl.firstElementChild.tabIndex = 0;
}

/** Arrow-key roving focus for any role=radiogroup inside the root. */
function roving(root) {
  root.addEventListener('keydown', (e) => {
    const group = e.target.closest('[role="radiogroup"]');
    if (!group || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    const radios = $$('[role="radio"]', group);
    const i = radios.indexOf(e.target);
    if (i < 0) return;
    e.preventDefault();
    e.stopPropagation(); // keep the player's seek / volume hotkeys out of it
    let j = i;
    if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = radios.length - 1;
    else j = (i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + radios.length) % radios.length;
    radios[j].focus();
    radios[j].click();
  });
}

export function initSettings(ctx) {
  const { store, container } = ctx;
  const card = $('#pop-settings');
  roving(card);

  // ---- Speed ---------------------------------------------------------------
  const range = $('[data-speed-range]', card);
  const out = $('[data-speed-out]', card);
  const marks = $('[data-speed-marks]', card);
  marks.replaceChildren(
    ...SPEED_MARKS.map((m) => {
      const s = document.createElement('span');
      s.style.setProperty('--at', `${((m - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)) * 100}%`);
      s.textContent = rateLabel(m);
      s.dataset.rate = String(m);
      return s;
    }),
  );
  const paintRange = (r) => {
    range.value = String(r);
    range.style.setProperty('--fill', `${((r - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)) * 100}%`);
    range.setAttribute('aria-valuetext', `${rateLabel(r)} speed`);
    out.textContent = rateLabel(r);
    for (const m of marks.children) m.toggleAttribute('data-on', Math.abs(Number(m.dataset.rate) - r) < 0.01);
  };
  range.addEventListener('input', () => {
    let r = Number(range.value);
    const snap = SPEED_MARKS.find((m) => Math.abs(m - r) <= 0.06);
    if (snap) r = snap;
    store.setPlaybackRate(clamp(r, SPEED_MIN, SPEED_MAX));
  });
  range.addEventListener('keydown', (e) => e.stopPropagation());
  watch(store, (s) => s.playbackRate, (r) => {
    paintRange(r);
    // A temporary hold-for-speed isn't a preference.
    if (ctx.prefsReady && !container.hasAttribute('data-holding')) prefs.set('rate', r);
  });
  for (const m of marks.children) m.addEventListener('click', () => store.setPlaybackRate(Number(m.dataset.rate)));

  // ---- Quality (Mux / HLS renditions) ---------------------------------------
  const qField = $('[data-quality-field]', card);
  const qChips = $('[data-quality-chips]', card);
  const qOut = $('[data-quality-out]', card);
  watch(
    store,
    (s) => [(s.videoRenditionList ?? []).map((r) => `${r.id}:${r.height}:${r.selected}`).join('|'), s.activeVideoRendition?.height ?? 0].join('#'),
    () => {
      const list = (store.videoRenditionList ?? []).filter((r) => r.height);
      qField.hidden = list.length < 2;
      if (list.length < 2) return;
      const manual = list.find((r) => r.selected && list.some((o) => !o.selected));
      const heights = [...new Map(list.map((r) => [r.height, r])).values()].sort((a, b) => b.height - a.height).slice(0, 4);
      const active = store.activeVideoRendition?.height;
      radioChips(
        qChips,
        [{ value: 'auto', label: 'Auto' }, ...heights.map((r) => ({ value: r.id, label: `${r.height}p` }))],
        manual ? manual.id : 'auto',
        (v) => store.selectVideoRendition(v),
      );
      qOut.textContent = manual ? `${manual.height}p` : active ? `Auto · ${active}p` : 'Auto';
    },
  );

  // ---- Captions ------------------------------------------------------------
  const cChips = $('[data-captions-chips]', card);
  const cOut = $('[data-captions-out]', card);
  watch(
    store,
    (s) => (s.textTrackList ?? []).filter((t) => t.kind === 'captions' || t.kind === 'subtitles').map((t) => `${t.id}:${t.label}:${t.mode}`).join('|'),
    () => {
      const tracks = (store.textTrackList ?? []).filter((t) => t.kind === 'captions' || t.kind === 'subtitles');
      const showing = tracks.find((t) => t.mode === 'showing');
      $('[data-captions-field]', card).hidden = tracks.length === 0;
      radioChips(
        cChips,
        [{ value: null, label: 'Off' }, ...tracks.map((t) => ({ value: t.id, label: t.label || t.language || 'Captions' }))],
        showing ? showing.id : null,
        (id) => store.selectSubtitlesTrack(id),
      );
      cOut.textContent = showing ? showing.label || 'On' : 'Off';
      if (ctx.prefsReady) prefs.set('captions', !!showing);
    },
  );

  const sizeGroup = $('[data-caption-size]', card);
  const setSize = (size) => {
    container.dataset.ccSize = size;
    for (const b of $$('[role="radio"]', sizeGroup)) {
      const on = b.dataset.size === size;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    }
    prefs.set('ccSize', size);
  };
  for (const b of $$('[role="radio"]', sizeGroup)) b.addEventListener('click', () => setSize(b.dataset.size));
  setSize(prefs.get('ccSize', 'm'));
  ctx.setCaptionSize = setSize;

  // ---- Preference switches -------------------------------------------------
  const switches = {
    glow: (on) => { document.documentElement.toggleAttribute('data-glow', on); ctx.glow?.(on); },
    ccbox: (on) => container.toggleAttribute('data-cc-box', on),
    loop: (on) => { if (ctx.media) ctx.media.loop = on; },
  };
  const defaults = { glow: true, ccbox: true, loop: false };
  for (const input of $$('[data-pref]', card)) {
    const key = input.dataset.pref;
    input.checked = prefs.get(key, defaults[key]);
    switches[key](input.checked);
    input.addEventListener('change', () => { switches[key](input.checked); prefs.set(key, input.checked); });
  }
  ctx.setPref = (key, on) => {
    const input = $(`[data-pref="${key}"]`, card);
    if (!input) return;
    input.checked = on;
    switches[key](on);
    prefs.set(key, on);
  };

  // ---- Sleep timer ---------------------------------------------------------
  const sleepGroup = $('[data-sleep-chips]', card);
  const sleepOut = $('[data-sleep-out]', card);
  const chip = $('[data-sleep-chip]', container);
  let sleepAt = 0;
  let sleepEnd = false;
  let tick = 0;
  const paintSleep = (val) => {
    for (const b of $$('[role="radio"]', sleepGroup)) {
      const on = b.dataset.sleep === String(val);
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    }
  };
  function setSleep(val) {
    clearInterval(tick);
    sleepAt = 0;
    sleepEnd = false;
    if (val === 'end') sleepEnd = true;
    else if (Number(val) > 0) sleepAt = Date.now() + Number(val) * 60_000;
    paintSleep(val);
    const update = () => {
      if (sleepEnd) {
        sleepOut.textContent = 'End of video';
        chip.hidden = false;
        $('span', chip).textContent = 'Stops at the end';
      } else if (sleepAt) {
        const left = Math.max(0, (sleepAt - Date.now()) / 1000);
        sleepOut.textContent = `${fmt(left)} left`;
        chip.hidden = false;
        $('span', chip).textContent = `Sleeping in ${fmt(left)}`;
        if (left <= 0) {
          store.pause();
          ctx.hud.note('Sleep timer — paused');
          setSleep(0);
        }
      } else {
        sleepOut.textContent = 'Off';
        chip.hidden = true;
      }
    };
    update();
    if (sleepAt) tick = setInterval(update, 1000);
  }
  for (const b of $$('[role="radio"]', sleepGroup)) b.addEventListener('click', () => setSleep(b.dataset.sleep));
  watch(store, (s) => s.ended, (ended) => {
    if (ended && sleepEnd) { ctx.hud.note('Sleep timer — stopped at the end'); setSleep(0); }
  });
  setSleep(0);
  ctx.setSleep = setSleep;

  // ---- "More" row for small players --------------------------------------
  const openLater = (id) => { ctx.popover('pop-settings', false); setTimeout(() => ctx.popover(id, true), 240); };
  $('[data-more="assist"]', card).addEventListener('click', () => openLater('pop-assist'));
  $('[data-more="loop"]', card).addEventListener('click', () => openLater('pop-loop'));
  const pipBtn = $('[data-more="pip"]', card);
  watch(store, (s) => s.pictureInPictureAvailability, (a) => { pipBtn.hidden = a !== 'available'; });
  pipBtn.addEventListener('click', () => { ctx.popover('pop-settings', false); store.requestPictureInPicture?.().catch(() => {}); });

  // ---- Shortcuts dialog ----------------------------------------------------
  const dialog = $('[data-shortcuts]', container);
  ctx.showShortcuts = () => {
    ctx.popover('pop-settings', false);
    if (!dialog.open) dialog.showModal();
  };
  $('[data-open-shortcuts]', card).addEventListener('click', ctx.showShortcuts);
  $('[data-close-shortcuts]', dialog).addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', (e) => e.stopPropagation());
}
