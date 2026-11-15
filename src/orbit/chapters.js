// Chapter menu, "now playing" chapter label and chapter jumps.
// Video.js v10 draws chapter segments on the timeline but has no chapter
// menu yet (videojs/v10#1873), so Orbit adds one from store.chaptersCues.
import { $, fmt, watch } from './util.js';

export const cueText = (c) => String(c?.text ?? c?.value ?? '').trim();

export function chaptersOf(store) {
  return (store.chaptersCues ?? []).filter((c) => cueText(c));
}

export function chapterAt(store, t = store.currentTime) {
  const list = chaptersOf(store);
  let found = null;
  for (const c of list) if (t + 0.05 >= c.startTime) found = c;
  return found;
}

export function initChapters(ctx) {
  const { store, container } = ctx;
  const listEl = $('[data-chapter-list]', container);
  const countEl = $('[data-chapter-count]', container);
  const labelEl = $('[data-chapter-label]', container);
  const nowEl = $('[data-chapter-now]', container);
  const button = $('[data-chapter-button]', container);

  function render(list) {
    listEl.replaceChildren();
    container.toggleAttribute('data-has-chapters', list.length > 0);
    countEl.textContent = list.length ? `${list.length} chapters` : '';
    list.forEach((c, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'orbit-chapter-item';
      b.dataset.index = String(i);
      b.innerHTML = `<span class="orbit-chapter-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><span class="orbit-chapter-name"></span><span class="orbit-chapter-time orbit-mono"></span><span class="orbit-chapter-bar" aria-hidden="true"><span></span></span>`;
      $('.orbit-chapter-name', b).textContent = cueText(c);
      $('.orbit-chapter-time', b).textContent = fmt(c.startTime);
      b.setAttribute('aria-label', `${cueText(c)}, starts at ${fmt(c.startTime)}`);
      b.addEventListener('click', () => {
        store.seek(c.startTime + 0.01);
        if (store.paused) store.play();
        ctx.popover('pop-chapters', false);
        ctx.announce(`Chapter: ${cueText(c)}`);
      });
      li.append(b);
      listEl.append(li);
    });
  }

  watch(store, (s) => chaptersOf(s), render);

  watch(
    store,
    (s) => {
      const c = chapterAt(s);
      return c ? c.startTime : -1;
    },
    () => {
      const list = chaptersOf(store);
      const c = chapterAt(store);
      const name = c ? cueText(c) : '';
      labelEl.textContent = name || 'Chapters';
      nowEl.textContent = name;
      button.setAttribute('aria-label', name ? `Chapter: ${name}. Show all chapters` : 'Show chapters');
      [...listEl.querySelectorAll('.orbit-chapter-item')].forEach((b, i) => {
        const active = list[i] === c;
        b.toggleAttribute('data-active', active);
        if (active) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      });
    },
  );

  // Progress inside the active chapter, drawn as a hairline under the item.
  watch(store, (s) => Math.floor(s.currentTime * 2), () => {
    const c = chapterAt(store);
    const active = listEl.querySelector('[data-active] .orbit-chapter-bar span');
    if (!c || !active) return;
    const end = Number.isFinite(c.endTime) ? c.endTime : store.duration;
    active.style.width = `${Math.min(100, ((store.currentTime - c.startTime) / Math.max(0.1, end - c.startTime)) * 100)}%`;
  });

  // Scroll the active chapter into view when the menu opens.
  const pop = document.getElementById('pop-chapters');
  new MutationObserver(() => {
    if (pop.hasAttribute('data-open')) listEl.querySelector('[data-active]')?.scrollIntoView({ block: 'nearest' });
  }).observe(pop, { attributes: true, attributeFilter: ['data-open'] });

  ctx.chapters = {
    list: () => chaptersOf(store),
    current: () => chapterAt(store),
    go(dir) {
      const list = chaptersOf(store);
      if (!list.length) return false;
      const t = store.currentTime;
      const cur = chapterAt(store);
      let i = cur ? list.indexOf(cur) : -1;
      // "previous" restarts the current chapter if we're more than 3 s in.
      if (dir < 0 && cur && t - cur.startTime > 3) i += 1;
      const next = list[Math.max(0, Math.min(list.length - 1, i + dir))];
      store.seek(next.startTime + 0.01);
      ctx.hud.note(`${cueText(next)}`);
      ctx.announce(`Chapter: ${cueText(next)}`);
      return true;
    },
  };
}
