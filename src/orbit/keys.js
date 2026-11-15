// Orbit's own shortcuts, alongside the <media-hotkey> registrations in the
// markup. They work while focus is in the player or on the page itself.
export function initKeys(ctx) {
  const { container } = ctx;

  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t.closest?.('input, textarea, select, [contenteditable="true"], dialog')) return;
    const inPlayer = container.contains(t);
    if (!inPlayer && t !== document.body && t !== document.documentElement) return;

    const k = e.key;
    let handled = true;
    if (k === '?') ctx.showShortcuts();
    else if (k === '/') { ctx.popover('pop-assist', true); }
    else if (k === '[') ctx.loop.setA();
    else if (k === ']') ctx.loop.setB();
    else if (k === 'L' && e.shiftKey) {
      const on = ctx.loop.toggle();
      if (!on && !ctx.loop.state.on && ctx.loop.state.b == null) ctx.loop.quick(5);
    } else if (k === ',') ctx.loop.step(-1);
    else if (k === '.') ctx.loop.step(1);
    else if (e.shiftKey && k === 'ArrowLeft') ctx.chapters.go(-1);
    else if (e.shiftKey && k === 'ArrowRight') ctx.chapters.go(1);
    else if (!inPlayer && (k === ' ' || k.toLowerCase() === 'k')) {
      // Page focus: keep Space / K working without clicking the player first.
      ctx.store.paused ? ctx.store.play() : ctx.store.pause();
    } else handled = false;

    if (handled) e.preventDefault();
  });
}
