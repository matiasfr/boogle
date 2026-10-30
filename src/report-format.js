// What a problem report may say about the player, kept pure (no DOM) so the privacy promise in
// src/features/telemetry.js is unit-tested (test/report-format.test.mjs): a coarse browser name, a stack frame with no
// origin or query string, and messages with peer ids and other id-like tokens scrubbed out.
const BROWSERS = [
  ['Edge', /Edg\/(\d+)/],
  ['Firefox', /Firefox\/(\d+)/],
  ['Chrome', /Chrome\/(\d+)/],
  ['Safari', /Version\/(\d+).*Safari/],
];
const SYSTEMS = [
  ['Android', /Android/],
  ['iOS', /iPhone|iPad/],
  ['Windows', /Windows/],
  ['Mac', /Mac OS X/],
  ['Linux', /Linux/],
];
// "Chrome 130 Android"; "other other" for anything unrecognised.
export function coarseUa(ua) {
  const b = BROWSERS.map(([name, re]) => [name, re.exec(ua)]).find(([, m]) => m);
  const os = SYSTEMS.find(([, re]) => re.test(ua));
  return `${b ? `${b[0]} ${b[1][1]}` : 'other'} ${os ? os[0] : 'other'}`;
}

// First stack frame, without the origin or query string: "at step (/boogle/assets/index-abc.js:1:2345)".
export function firstFrame(stack) {
  const line = String(stack || '')
    .split('\n')
    .find((l) => /\bat\b|@/.test(l) && /:\d+/.test(l));
  return line
    ? line
        .trim()
        .replace(/[a-z-]+:\/\/[^/\s)]+/g, '')
        .replace(/\?[^:)\s]*/g, '')
        .slice(0, 150)
    : '';
}

// Peer ids (`boogle-<room>-c<random>`) and other id-like tokens (12+ letters/digits with a digit) out of messages.
export const scrub = (msg) =>
  String(msg)
    .replace(/boogle-[a-z0-9-]+/gi, 'boogle-*')
    .replace(/\b(?=[a-z]*\d)[a-z0-9]{12,}\b/gi, '*');
