// Orbit's on-device language understanding. Plain rules, no model, no network:
// it splits a request into clauses and maps each to a player intent.
// Returns [{ intent, ...args }] in the order they were asked.

const NUM_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, half: 0.5 };

function normalize(text) {
  return ` ${text.toLowerCase()} `
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9:.%×'\s-]/g, ' ')
    .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|forty|fifty|sixty)\b/g, (w) => String(NUM_WORDS[w]))
    .replace(/\s+/g, ' ');
}

/** "2:30", "90 seconds", "2 minutes", "1 min 20" → seconds */
function parseTime(s) {
  let m = s.match(/(\d+):(\d{1,2})(?::(\d{1,2}))?/);
  if (m) return m[3] ? +m[1] * 3600 + +m[2] * 60 + +m[3] : +m[1] * 60 + +m[2];
  let total = 0;
  let found = false;
  for (const [, n, unit] of s.matchAll(/(\d+(?:\.\d+)?)\s*(h|hours?|m|mins?|minutes?|s|secs?|seconds?)\b/g)) {
    found = true;
    total += unit.startsWith('h') ? n * 3600 : unit.startsWith('m') ? n * 60 : +n;
  }
  return found ? total : null;
}

const RULES = [
  // ---- questions ---------------------------------------------------------
  [/\b(help|what can you do|how do i|commands?)\b/, () => ({ intent: 'help' })],
  [/\b(summar|tl;?dr|tldr|what'?s (this|it) about|what is (this|it) about|recap|gist|overview)\b/, () => ({ intent: 'summary' })],
  [/\b(what'?s happening|what is happening|where are we|what is this (part|scene|bit)|what'?s this (part|scene|bit)|explain this|what did i miss|what just happened)\b/, () => ({ intent: 'now' })],
  [/\bwho('?s| is| are)\b(.+)/, (m) => ({ intent: 'who', q: m[2].trim() })],
  [/\b(how (long|much)( is)? (left|remaining)|time left|how long is (this|it)|when does it end)\b/, () => ({ intent: 'remaining' })],

  // ---- sleep -------------------------------------------------------------
  [/\b(cancel|stop|turn off|no) (the )?sleep( timer)?\b/, () => ({ intent: 'sleep', value: 0 })],
  [/\b(sleep|stop|pause|turn off)\b.*\b(in|after) (\d+) ?(m|mins?|minutes?)\b/, (m) => ({ intent: 'sleep', value: +m[3] })],
  [/\b(bed|sleep|sleepy|falling asleep|after this|at the end|when (it|this) ends|end of (the )?video)\b/, () => ({ intent: 'sleep', value: 'end' })],

  // ---- loop --------------------------------------------------------------
  [/\b(stop|end|cancel|no|turn off)( the)? (loop|looping|repeat(ing)?)\b|\bloop off\b/, () => ({ intent: 'loopOff' })],
  [/\b(loop|repeat|practi[cs]e)\b.*\b(chapter|section|scene)\b/, () => ({ intent: 'loopChapter' })],
  [/\b(loop|repeat|practi[cs]e)\b.*\blast (\d+(?:\.\d+)?) ?(s|secs?|seconds?)?\b/, (m) => ({ intent: 'loopLast', seconds: +m[2] })],
  [/\b(loop|repeat|practi[cs]e)\b.*?(\d+:\d{2}).*?(\d+:\d{2})/, (m) => ({ intent: 'loopRange', a: parseTime(m[2]), b: parseTime(m[3]) })],
  [/\b(loop|repeat|again and again|on repeat|practi[cs]e (this|that))\b/, () => ({ intent: 'loopLast', seconds: 8 })],

  // ---- speed -------------------------------------------------------------
  [/\b(normal|regular|default|reset)( the)? speed\b|\bspeed (back )?to normal\b|\b1 ?(x|×|times)\b/, () => ({ intent: 'rate', value: 1 })],
  [/\bhalf speed\b|\bslow ?mo(tion)?\b/, () => ({ intent: 'rate', value: 0.5 })],
  [/\bdouble speed\b/, () => ({ intent: 'rate', value: 2 })],
  [/\b(\d+(?:\.\d+)?) ?(x|×|times)( speed)?\b|\bspeed (to |at )?(\d+(?:\.\d+)?)\b/, (m) => ({ intent: 'rate', value: +(m[1] ?? m[5]) })],
  [/\b(too fast|slow(er)?( down)?|can'?t (keep up|follow)|less fast)\b/, () => ({ intent: 'rateStep', delta: -0.25 })],
  [/\b(too slow|fast(er)?|speed (it )?up|hurry|quicker|boring)\b/, () => ({ intent: 'rateStep', delta: 0.25 })],

  // ---- captions ----------------------------------------------------------
  [/\b(bigger|larger|increase|can'?t read)\b.*\b(captions?|subtitles?|text|cc)\b|\b(captions?|subtitles?|text) (bigger|larger)\b/, () => ({ intent: 'ccSize', dir: 1 })],
  [/\b(smaller|decrease|reduce)\b.*\b(captions?|subtitles?|text|cc)\b|\b(captions?|subtitles?|text) smaller\b/, () => ({ intent: 'ccSize', dir: -1 })],
  [/\b(captions?|subtitles?|cc)\b.*\b(off|hide|remove|no)\b|\b(hide|remove|turn off|no|disable)\b.*\b(captions?|subtitles?|cc)\b/, () => ({ intent: 'captions', on: false })],
  [/\b(captions?|subtitles?|cc|what did (he|she|they) say)\b/, () => ({ intent: 'captions', on: true })],

  // ---- volume ------------------------------------------------------------
  [/\b(unmute|sound on|turn (the )?sound on)\b/, () => ({ intent: 'mute', on: false })],
  [/\b(mute|silence|sound off|quiet please)\b/, () => ({ intent: 'mute', on: true })],
  [/\bvolume (to |at )?(\d+) ?%?\b|\b(\d+) ?% volume\b/, (m) => ({ intent: 'volume', value: +(m[2] ?? m[3]) / 100 })],
  [/\b(louder|volume up|turn (it )?up|can'?t hear|too quiet|more volume)\b/, () => ({ intent: 'volumeStep', delta: 0.15 })],
  [/\b(quieter|softer|volume down|turn (it )?down|too loud|less volume)\b/, () => ({ intent: 'volumeStep', delta: -0.15 })],

  // ---- quality -----------------------------------------------------------
  [/\b(data saver|save data|saving data|low(er)? quality|slow (internet|connection|network)|buffering)\b/, () => ({ intent: 'quality', value: 'low' })],
  [/\b(best|highest|max(imum)?|full) quality\b|\b(hd|1080p?|4k)\b/, () => ({ intent: 'quality', value: 'high' })],
  [/\bauto(matic)? quality\b/, () => ({ intent: 'quality', value: 'auto' })],

  // ---- screen ------------------------------------------------------------
  [/\b(exit|leave|close) (full ?screen|full)\b|\bsmall(er)? screen\b/, () => ({ intent: 'fullscreen', on: false })],
  [/\b(full ?screen|bigger|big screen|go big|maximi[sz]e)\b/, () => ({ intent: 'fullscreen', on: true })],
  [/\b(picture in picture|pip|mini ?player|pop ?out|float(ing)?)\b/, () => ({ intent: 'pip' })],
  [/\b(glow|ambient)\b.*\b(off|no|disable|stop)\b/, () => ({ intent: 'glow', on: false })],
  [/\b(glow|ambient)\b/, () => ({ intent: 'glow', on: true })],
  [/\b(too (dark|bright)|brightness|reset brightness)\b/, () => ({ intent: 'brightness' })],

  // ---- navigation --------------------------------------------------------
  [/\b(next|skip) (chapter|part|section|scene)\b|\bskip (this|ahead)\b(?!.*\d)/, () => ({ intent: 'chapter', dir: 1 })],
  [/\b(previous|prev|last|back to the last) (chapter|part|section|scene)\b/, () => ({ intent: 'chapter', dir: -1 })],
  [/\b(beginning|from the top|restart|start over|from the start)\b/, () => ({ intent: 'seekTo', t: 0 })],
  [/\b(back|rewind|go back|replay)\b/, (m, s) => ({ intent: 'seekBy', delta: -(parseTime(s) ?? 10) })],
  [/\b(skip|forward|ahead|fast forward)\b(?=.*\d)/, (m, s) => ({ intent: 'seekBy', delta: parseTime(s) ?? 10 })],
  [/\b(go to|jump to|skip to|take me to|show me|at)\b\s+(.+)/, (m) => {
    const t = parseTime(m[2]);
    return t != null ? { intent: 'seekTo', t } : { intent: 'chapterNamed', q: m[2].trim() };
  }],

  // ---- playback ----------------------------------------------------------
  [/\b(pause|hold on|wait|stop)\b/, () => ({ intent: 'pause' })],
  [/\b(play|resume|continue|go on|keep going|start)\b/, () => ({ intent: 'play' })],
];

/** Split "too fast and I'm going to bed, then captions on" into clauses. */
function clauses(text) {
  return text
    .split(/\s(?:and then|then|and also|also|and|plus)\s|[,;]+/)
    .map((c) => c.trim())
    .filter(Boolean);
}

export function understand(raw) {
  const out = [];
  for (const c of clauses(normalize(raw))) {
    const s = ` ${c} `;
    for (const [re, make] of RULES) {
      const m = s.match(re);
      if (m) { out.push(make(m, s)); break; }
    }
  }
  // Drop exact duplicates ("louder, louder") but keep order.
  const seen = new Set();
  return out.filter((i) => { const k = JSON.stringify(i); if (seen.has(k)) return false; seen.add(k); return true; });
}
