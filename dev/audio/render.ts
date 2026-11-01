// The listening pack: every synthesized game sound rendered to a file you can audition away from the game
// (`node dev/audio/render.ts`; DESIGN.md "How we work": feel is judged by playing, and here by listening). It starts the look
// harness (dev/look/lib.mjs: Vite, a local server, Chromium), opens one page per prototype, and records the real
// Web Audio graph while each sound plays: a tap on everything that reaches the context's destination, recorded
// sample-exact on the audio thread (an AudioWorklet). Each sound is either called through its module's export or
// played by the game itself (the wave's telegraph, a laying run, the era's bed), so what you hear is what a player hears,
// levels included. Sounds the owner cut are left out; the silence checks play their moments and fail on any sound.
//
//   node dev/audio/render.ts                       every take into .look/audio/ (WAV + MP3 + manifest.json)
//   node dev/audio/render.ts --only haul,ui        just the takes whose id or page starts with one of these
//   node dev/audio/render.ts --out <dir>
//
// Files are peak-normalized to -1 dBFS so they audition at the same loudness on a phone; manifest.json keeps each
// one's in-game peak and RMS (dBFS at the game's master), so relative loudness is still on record. One-shots are
// trimmed of leading and trailing silence.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { startStack, launch, Game, root } from '../look/lib.mjs';

type Take = {
  id: string;
  group: string; // the prototype, for the index page
  title: string;
  when: string; // when it plays in the game, one line
  silent?: true; // a silence check: a cut sound's moment, which must stay silent (no file is written)
  body: string; // page code (may await); ends with `return R.run(...)`
};
type Page = {
  key: string;
  query: string;
  room?: string; // a proto- room, for the prototypes whose shortcut buttons need one
  setup?: string; // page code run once before its takes
  takes: Take[];
};
type Result = {
  b64: string;
  sampleRate: number;
  seconds: number;
  peakDb: number;
  rmsDb: number;
  clipped: number;
  gainDb: number;
};

// ---------------------------------------------------------------- the recorder (runs in the page before the game)
// It wraps AudioContext so the game's shared context (src/render/audio.ts) gets a tap: every connect() to the
// destination is mirrored into a gain that feeds an AudioWorklet, which keeps the frames between `from` and `to`.
const RECORDER = String.raw`(() => {
  const WORKLET = ${'`'}
    class Rec extends AudioWorkletProcessor {
      constructor() {
        super();
        this.from = Infinity; this.to = Infinity; this.buf = [new Float32Array(16384), new Float32Array(16384)]; this.n = 0;
        this.port.onmessage = (e) => {
          const d = e.data;
          if ('from' in d) { this.from = d.from; this.to = d.to; this.n = 0; }
          if ('stopAt' in d) this.to = Math.max(this.from, d.stopAt);
        };
      }
      flush() {
        if (!this.n) return;
        const l = this.buf[0].slice(0, this.n), r = this.buf[1].slice(0, this.n);
        this.port.postMessage([l, r], [l.buffer, r.buffer]);
        this.n = 0;
      }
      process(inputs) {
        const f0 = currentFrame, len = 128;
        if (f0 + len > this.from && f0 < this.to) {
          const a = Math.max(0, this.from - f0), b = Math.min(len, this.to - f0);
          const inp = inputs[0], l = inp[0], r = inp[1] || inp[0];
          for (let i = a; i < b; i++) {
            this.buf[0][this.n] = l ? l[i] : 0;
            this.buf[1][this.n] = r ? r[i] : 0;
            if (++this.n === 16384) this.flush();
          }
        }
        if (this.to !== Infinity && f0 + len >= this.to) {
          this.flush();
          this.port.postMessage('done');
          this.from = this.to = Infinity;
        }
        return true;
      }
    }
    registerProcessor('boogle-rec', Rec);
  ${'`'};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (fn, ms = 15000) => {
    for (const t0 = performance.now(); performance.now() - t0 < ms; await sleep(50)) {
      try { const v = await fn(); if (v) return v; } catch {}
    }
    throw new Error('timed out waiting for ' + String(fn).slice(0, 120));
  };
  const orig = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...rest) {
    const r = orig.call(this, dest, ...rest);
    const tap = this.context.__tapIn;
    if (tap && dest instanceof AudioDestinationNode && this !== tap) orig.call(this, tap);
    return r;
  };
  const R = (window.__rec = { ctx: null, node: null, ready: null, chunks: [], done: null, sleep, until });
  const Base = window.AudioContext;
  window.AudioContext = class extends Base {
    constructor(o) {
      super(o);
      const tap = this.createGain();
      this.__tapIn = tap;
      R.ctx = this;
      const url = URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' }));
      R.ready = this.audioWorklet.addModule(url).then(() => {
        const n = new AudioWorkletNode(this, 'boogle-rec', {
          numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2],
          channelCount: 2, channelCountMode: 'explicit', channelInterpretation: 'speakers',
        });
        orig.call(tap, n);
        orig.call(n, this.destination);
        n.port.onmessage = (e) => (e.data === 'done' ? R.done?.() : R.chunks.push(e.data));
        R.node = n;
      });
    }
  };

  // Records 'seconds' from audio time 'at' (default: just ahead of now) while trigger() plays the sound. seconds null:
  // until trigger() resolves, plus 'tail' s. Returns a 16-bit WAV (base64) and the raw levels.
  R.run = async (seconds, trigger, { at, trim = true, tail = 1.2, quiet = -70 } = {}) => {
    await until(() => R.ready && R.node && R.ctx.state === 'running', 20000);
    const ctx = R.ctx, sr = ctx.sampleRate;
    const start = at ?? ctx.currentTime + 0.1;
    R.chunks = [];
    const done = new Promise((r) => (R.done = r));
    R.node.port.postMessage({ from: Math.round(start * sr), to: seconds == null ? Infinity : Math.round((start + seconds) * sr) });
    while (ctx.currentTime < start - 0.005) await sleep(5);
    if (trigger) await trigger();
    if (seconds == null) R.node.port.postMessage({ stopAt: Math.round((ctx.currentTime + tail) * sr) });
    await done;
    const n = R.chunks.reduce((t, c) => t + c[0].length, 0);
    const L = new Float32Array(n), Rr = new Float32Array(n);
    let o = 0;
    for (const [l, r] of R.chunks) { L.set(l, o); Rr.set(r, o); o += l.length; }
    let peak = 0, sum = 0, clipped = 0;
    for (let i = 0; i < n; i++) {
      const a = Math.max(Math.abs(L[i]), Math.abs(Rr[i]));
      if (a > peak) peak = a;
      if (a >= 0.999) clipped++;
      sum += (L[i] * L[i] + Rr[i] * Rr[i]) / 2;
    }
    const db = (v) => (v > 0 ? 20 * Math.log10(v) : -200);
    let a0 = 0, a1 = n;
    if (trim && peak > 0) {
      const thr = Math.max(peak * 10 ** (quiet / 20), 1e-6);
      const loud = (i) => Math.abs(L[i]) > thr || Math.abs(Rr[i]) > thr;
      while (a0 < n && !loud(a0)) a0++;
      while (a1 > a0 && !loud(a1 - 1)) a1--;
      a0 = Math.max(0, a0 - Math.round(0.02 * sr));
      a1 = Math.min(n, a1 + Math.round(0.25 * sr));
    }
    const gain = peak > 0 ? Math.min(10 ** (-1 / 20) / peak, 10 ** (40 / 20)) : 1;
    const frames = a1 - a0, bytes = new Uint8Array(44 + frames * 4), v = new DataView(bytes.buffer);
    const str = (p, s) => [...s].forEach((c, i) => v.setUint8(p + i, c.charCodeAt(0)));
    str(0, 'RIFF'); v.setUint32(4, 36 + frames * 4, true); str(8, 'WAVEfmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, sr, true);
    v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, frames * 4, true);
    for (let i = 0; i < frames; i++) {
      for (const [c, ch] of [[0, L], [1, Rr]]) {
        const s = Math.max(-1, Math.min(1, ch[a0 + i] * gain));
        v.setInt16(44 + i * 4 + c * 2, Math.round(s * 32767), true);
      }
    }
    let b64 = '';
    for (let i = 0; i < bytes.length; i += 0x8000) b64 += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { b64: btoa(b64), sampleRate: sr, seconds: frames / sr, peakDb: db(peak), rmsDb: db(Math.sqrt(sum / Math.max(1, n))), clipped, gainDb: db(gain) };
  };
})();`;

// ---------------------------------------------------------------- takes
// Page-code snippets the takes share.
const TP = (x: string | number, z: string | number) => `{
  const { teleport } = await import('/src/physics/physics.ts');
  const { groundHeight } = await import('/src/adapters/terrain.ts');
  const b = window.boogle.me.body;
  teleport(b, ${x}, groundHeight(${x}, ${z}) + 0.6, ${z});
  b.velocity.set(0, 0, 0);
}`;
const PRE = `const R = window.__rec, { sleep, until } = R;`;
// A take that calls `calls` (page code) in order, `gap` ms apart; each entry is one statement.
const seq = (imports: string, calls: string[], gap: number) => `${imports}
  return R.run(null, async () => { for (const f of [${calls.map((c) => `async () => { ${c} }`).join(', ')}]) { await f(); await sleep(${gap}); } });`;
const grindShot = (shot: string, seconds: number) => `
  const q = new URLSearchParams(location.search); q.set('gt', '${shot}');
  history.replaceState(null, '', location.pathname + '?' + q);
  const G = await import('/dev/look/evals/grind.ts');
  return R.run(${seconds}, async () => { await G.run(); });`;

const PAGES: Page[] = [
  {
    key: 'ui',
    query: 'proto=uisfx&jump2=1',
    takes: [
      {
        id: 'ui-tick',
        group: 'UI kit (?proto=uisfx)',
        title: 'Hotbar tick',
        when: 'Selecting a hotbar slot: one soft tone, the same for every slot (here: ten selects in a row).',
        body: seq(
          `const { uiSound } = await import('/src/render/ui-sound.ts');`,
          [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => `uiSound('tick', ${k});`),
          220,
        ),
      },
      {
        id: 'ui-pop',
        group: 'UI kit (?proto=uisfx)',
        title: 'Prompt pop',
        when: 'The interact prompt appears ("Take logs", "Pick up"): three of them.',
        body: seq(
          `const { uiSound } = await import('/src/render/ui-sound.ts');`,
          Array(3).fill(`uiSound('pop');`),
          600,
        ),
      },
      {
        id: 'ui-thunk',
        group: 'UI kit (?proto=uisfx)',
        title: 'Thunk (it worked)',
        when: 'A press that did something (Take logs, Pick up): a wooden tok on G4 over a soft low knock.',
        body: seq(
          `const { uiSound } = await import('/src/render/ui-sound.ts');`,
          Array(3).fill(`uiSound('thunk');`),
          500,
        ),
      },
      {
        id: 'ui-deny',
        group: 'UI kit (?proto=uisfx)',
        title: 'Deny',
        when: 'A press that could not happen ("Hotbar full"): twice.',
        body: seq(
          `const { uiSound } = await import('/src/render/ui-sound.ts');`,
          Array(2).fill(`uiSound('deny');`),
          700,
        ),
      },
      {
        id: 'ui-count',
        group: 'UI kit (?proto=uisfx)',
        title: 'Haul count run',
        when: 'The haul counter moving by one: climbs with a run of pickups, resets after a pause, falls when you drop logs.',
        body: seq(
          `const { uiSound } = await import('/src/render/ui-sound.ts');`,
          [...Array(12).fill(`uiSound('count', 1);`), 'await sleep(900);', ...Array(5).fill(`uiSound('count', -1);`)],
          110,
        ),
      },
      {
        id: 'ui-flap',
        group: 'UI kit (?proto=uisfx)',
        title: 'Plaque flap',
        when: 'A work-site plaque turns a row over (a pour was credited): a split-flap flutter, near, mid and far.',
        body: seq(
          `const { uiSound } = await import('/src/render/ui-sound.ts');`,
          [`uiSound('flap', 1);`, `uiSound('flap', 0.55);`, `uiSound('flap', 0.25);`],
          700,
        ),
      },
      {
        id: 'honk',
        group: 'Base game',
        title: 'Honk',
        when: 'T, pad Y or the Honk button: one player pressing four times (honk, toot, honk-honk, low bwomp), then four other colours, all in the current chord.',
        body: seq(
          `const { honkSound, chordSound } = await import('/src/features/honk.ts'); const { honkNotes } = await import('/src/sim/social.ts'); const H = (c, s, v, vol = 0.16) => { const [f, f2] = honkNotes(c, s, v); honkSound(f, vol, v, c, f2); return v === 2 ? f2 : f; };`,
          [0, 1, 2, 3].map((v) => `H(0, 0, ${v});`).concat([1, 2, 3, 4].map((c) => `H(${c}, 0, 0);`)),
          450,
        ),
      },
      {
        id: 'honk-chord',
        group: 'Base game',
        title: 'Honk chord',
        when: 'Three or more players honk within about a second: their honks, then their notes held as a chord with a sparkle (in Am7, then in Dm7).',
        body: seq(
          `const { honkSound, chordSound } = await import('/src/features/honk.ts'); const { honkNotes } = await import('/src/sim/social.ts'); const H = (c, s, v, vol = 0.16) => { const [f, f2] = honkNotes(c, s, v); honkSound(f, vol, v, c, f2); return v === 2 ? f2 : f; }; let n = [];`,
          [
            `n = [H(0, 0, 0)];`,
            `n.push(H(1, 0, 1, 0.14));`,
            `n.push(H(2, 0, 3, 0.14)); chordSound(n, 0.17);`,
            `await sleep(900);`,
            `n = [H(3, 20, 2)];`,
            `n.push(H(4, 20, 0, 0.14));`,
            `n.push(H(5, 20, 1, 0.14)); chordSound(n, 0.17);`,
          ],
          260,
        ),
      },
      {
        id: 'honk-jam',
        group: 'Base game',
        title: 'Honk jam (four players)',
        when: 'Four friends honking at random through all four chords (Am7, Em7, Dm7, C6/9; 10 s each in the game, 3 s each here): whatever they press, it stays in one chord.',
        body: `const { honkSound, chordSound } = await import('/src/features/honk.ts'); const { honkNotes } = await import('/src/sim/social.ts'); const H = (c, s, v, vol = 0.16) => { const [f, f2] = honkNotes(c, s, v); honkSound(f, vol, v, c, f2); return v === 2 ? f2 : f; };
          let x = 7; const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
          return R.run(null, async () => {
            for (let k = 0; k < 40; k++) {
              const c = Math.floor(rnd() * 4), v = Math.floor(rnd() * 4), s = Math.floor(k / 10) * 10;
              H(c * 2 + (k % 2), s, v, 0.12 + rnd() * 0.04);
              await sleep(120 + rnd() * 280);
            }
          });`,
      },
      {
        id: 'ping',
        group: 'Base game',
        title: 'Ping chime',
        when: 'G, middle click or Ping: "Ball!" (a fifth up), then "Look!" (a third up), then a friend\'s quieter ping. Subtler: lower, softer onset, shorter tail.',
        body: seq(
          `const { chime } = await import('/src/features/ping.ts');`,
          [`chime(0, 'ball', true);`, `chime(0, 'look', true);`, `chime(3, 'ball', false);`],
          700,
        ),
      },
      {
        id: 'ball-boing',
        group: 'Base game',
        title: 'Ball boing',
        when: 'The ball hitting things, by impact speed: a soft bounce, a medium and a hard hit, a splash-down, then a face-plant. A bit subtler: lower, softer onset, shorter tails, gentler wobble.',
        body: seq(
          `const { boing } = await import('/src/features/impact.ts');`,
          [
            `boing(4, 0.08, false);`,
            `boing(10, 0.18, false);`,
            `boing(22, 0.3, false);`,
            `boing(16, 0.25, true);`,
            `boing(18, 0.35, true);`,
          ],
          650,
        ),
      },
      {
        id: 'double-jump',
        group: 'Moves (&jump2=1)',
        title: 'Double jump',
        when: 'The second jump in the air (any ?proto= page with &jump2=1): a quiet puff of air, three of them.',
        body: seq(`const { whoop } = await import('/src/proto/moves/index.ts');`, Array(3).fill(`whoop();`), 550),
      },
    ],
  },
  {
    key: 'haul',
    query: 'proto=haul&v=wave',
    setup: `const H = await import('/dev/look/evals/haul-pilot.ts'); H.stand(2, 38, Math.PI); await until(() => window.__wave);`,
    takes: [
      {
        id: 'wave',
        group: 'Haul (?proto=haul)',
        title: 'Wave: warning to sweep',
        when: 'The wave variant (&v=wave): horn at the 25 s warning, rumble rising, two blasts at 10 s, the crash as it sweeps the beach (you get caught).',
        body: `return R.run(34, async () => { window.__wave.next(26.5); });`,
      },
      {
        id: 'pickup-thock',
        group: 'Haul (?proto=haul)',
        title: 'Pickup thock',
        when: 'Each pickup (Take logs, a pile): a wooden thock that rises with what you carry (here 0 to 60 logs).',
        body: seq(
          `const { thock } = await import('/src/proto/haul/pickup-feel.ts');`,
          [0, 6, 12, 20, 30, 40, 50, 60].map((n) => `thock(${n});`),
          380,
        ),
      },
      {
        id: 'magnet-burst',
        group: 'Haul (?proto=haul)',
        title: 'Magnet: a 5-piece and a 12-piece burst',
        when: 'The magnet variant (&v=magnet): a swell as pieces leave the pile, a bolt clink per piece landing on your back (climbing, then a payout shimmer), a cha-ching to close each burst.',
        body: `const { arrivalTick, burstChord, whooshIn } = await import('/src/proto/haul/magnet-sound.ts');
          return R.run(null, async () => {
            for (const n of [5, 12]) {
              whooshIn(n); await sleep(200);
              for (let k = 0; k < n; k++) { arrivalTick(); await sleep(k < 8 ? 40 : 45); }
              burstChord(); await sleep(1100);
            }
          });`,
      },
    ],
  },
  // Silence checks: the sounds the owner's audit cut (docs/proposals/boogle-2.md, "Sound", 2026-11-02) must stay cut
  // until better ones come. These takes play the moment and fail if anything is heard; they write no files.
  {
    key: 'grind',
    query: 'proto=wagon&grind=1&laid=3',
    setup: `await until(() => window.__wagon && window.boogle.me.body);`,
    takes: [
      {
        id: 'grind-silent',
        group: 'Silence checks',
        title: 'Grind the whole line (cut: wagon and grind sounds)',
        when: 'Landing on a laid rail and grinding it end to end, beside the running wagon: no hiss, clacks or whistle.',
        silent: true,
        body: grindShot('full', 16),
      },
    ],
  },
  {
    key: 'soapbox',
    query: 'proto=soapbox',
    setup: `await until(() => window.__soapbox && window.boogle.me.body);`,
    takes: [
      {
        id: 'soapbox-silent',
        group: 'Silence checks',
        title: 'A whole soapbox run (cut: all soapbox sounds)',
        when: 'Riding the course start to finish: no rumble, rattle or wind.',
        silent: true,
        body: `const P = await import('/dev/look/evals/soapbox-pilot.ts'); return R.run(14, async () => { await P.drive({}); });`,
      },
    ],
  },
  {
    key: 'minis',
    query: 'proto=minis',
    takes: [
      {
        id: 'minis-knock',
        group: 'Minis (?proto=minis)',
        title: 'Knock',
        when: 'A pin or block hit (topple, golf): woody, lower and louder the harder the hit (soft, medium, hard).',
        body: seq(
          `const C = await import('/src/proto/minis/common.ts');`,
          [0, 0.5, 1].map((k) => `C.knock(${k});`),
          450,
        ),
      },
      {
        id: 'minis-pop',
        group: 'Minis (?proto=minis)',
        title: 'Pop ladder',
        when: '"One more fell": a bright pop, one step up the scale per count.',
        body: seq(
          `const C = await import('/src/proto/minis/common.ts');`,
          [...Array(8).keys()].map((n) => `C.pop(${n});`),
          200,
        ),
      },
      {
        id: 'minis-fanfare',
        group: 'Minis (?proto=minis)',
        title: 'Fanfare',
        when: 'A hole sunk or a finish, then the big one for a new best.',
        body: seq(
          `const C = await import('/src/proto/minis/common.ts');`,
          [`C.fanfare(false);`, `C.fanfare(true);`],
          1100,
        ),
      },
      {
        id: 'minis-womp',
        group: 'Minis (?proto=minis)',
        title: 'Sad trombone',
        when: 'The funny failure (a miss, a fall).',
        body: seq(`const C = await import('/src/proto/minis/common.ts');`, [`C.womp();`], 100),
      },
      {
        id: 'minis-boing',
        group: 'Minis (?proto=minis)',
        title: 'Mushroom boing',
        when: 'Bouncing on a mushroom (hop): soft, medium, hard.',
        body: seq(
          `const C = await import('/src/proto/minis/common.ts');`,
          [0, 0.5, 1].map((k) => `C.boing(${k});`),
          500,
        ),
      },
    ],
  },
  {
    key: 'build',
    query: 'proto=build',
    room: 'proto-build',
    setup: `await until(() => document.querySelector('.build-proto button') && window.boogle.me.entered, 90000);
      document.querySelector('.first-run-close')?.click();
      ${TP(8, 16)}
      window.__debugCam.set([12, 4.3, 11], [17, 2.4, 5.8]);
      await sleep(1500);`,
    takes: [
      {
        id: 'build-hut',
        group: 'Build (?proto=build)',
        title: 'The helper hut goes up',
        when: 'Four pours into the Helper ring: pieces land on wooden notes up a pentatonic scale per phase, each phase resolving on a chord.',
        body: `const btn = document.querySelector('.build-proto button');
          // The hut keeps going up for a while after the ring is full: record the whole build.
          return R.run(34, async () => {
            for (let k = 0; k < 4; k++) btn.click();
          });`,
      },
    ],
  },
  {
    key: 'era',
    query: 'proto=era',
    room: 'proto-era',
    setup: `await until(() => document.querySelector('.era-proto button') && window.boogle.me.entered, 90000);
      document.querySelector('.first-run-close')?.click();
      ${TP(12, 38)}
      await sleep(1000);`,
    takes: [
      {
        id: 'era-wood-bed',
        group: 'Era (?proto=era)',
        title: 'Wood-age ambience',
        when: 'Era 1 everywhere on the island (v2): brown-noise surf swells, a soft pad in F, sparse marimba notes through an echo; far off, a gull, a mallet, a creak.',
        body: `return R.run(24, null, { trim: false });`,
      },
      {
        id: 'era-wood-bed-60',
        group: 'Era (?proto=era)',
        title: 'Wood-age ambience, a minute',
        when: 'The same bed over 60 s: long enough to hear the pad change chord, a rest, the motif and the rarer one-shots.',
        body: `return R.run(60, null, { trim: false });`,
      },
      {
        id: 'era-opening-day',
        group: 'Era (?proto=era)',
        title: 'Opening day: the wood bed through the swap',
        when: 'The gathering call, everyone arrives, the countdown and the swap to era 2, all silent now: the wood bed plays on unchanged through it (the tolls, bell and steam bed are cut).',
        body: `const { rules } = await import('/src/world/game-world.ts');
          const { world, submitEdit } = await import('/src/world/sync.ts');
          document.querySelector('.era-proto button').click();
          await until(() => rules.opening.ready(), 20000);
          return R.run(null, async () => {
            submitEdit({ op: 'open.start', i: 0, j: 0 });
            await sleep(7000);
            ${TP(6, -44)}
            await until(() => rules.opening.era(world.tick) === 2, 60000);
            await sleep(26000);
          }, { tail: 0.5 });`,
      },
    ],
  },
  {
    key: 'board',
    query: 'proto=board',
    takes: [
      {
        id: 'board-whoosh',
        group: 'Board (?proto=board)',
        title: 'Fast-travel whoosh',
        when: 'Picking a station on the departures board (&v=hop): the whoosh behind the fade.',
        body: seq(`const { whoosh } = await import('/src/proto/board/index.ts');`, [`whoosh();`, `whoosh();`], 900),
      },
    ],
  },
  {
    key: 'lay',
    query: 'proto=lay&v=quick',
    room: 'proto-lay',
    setup: `await until(() => document.querySelector('.lay-proto button') && window.boogle.me.entered, 90000);
      document.querySelector('.first-run-close')?.click();`,
    takes: [
      {
        id: 'track-machine',
        group: 'Track machine (?proto=lay)',
        title: 'A laying run (quick)',
        when: 'The track machine laying a section: rapid warm-up chuffs, a thump per sleeper, a rail clank every other one, the whistle at the end.',
        body: `const { rules } = await import('/src/world/game-world.ts');
          const { submitEdit } = await import('/src/world/sync.ts');
          const { trackMachine: TM } = await import('/src/features/track-machine.ts');
          await until(() => rules.sites.kind() === 1, 15000);
          document.querySelector('.lay-proto button').click();
          await until(() => rules.sites.canRun(0), 15000);
          const follow = setInterval(() => { const p = TM.pose; window.__debugCam.set([p.x + 4, p.y + 3, p.z + 4], [p.x, p.y, p.z]); }, 50);
          try {
            return await R.run(null, async () => {
              submitEdit({ op: 'site.run', i: 0, j: 0, s: 0 });
              await until(() => rules.sites.sites.open >= 1, 60000);
              await sleep(2500);
            });
          } finally { clearInterval(follow); }`,
      },
    ],
  },
];

// ---------------------------------------------------------------- run
const args = process.argv.slice(2);
const opt = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const only = opt('--only')?.split(',') ?? null;
const out = path.resolve(opt('--out') ?? path.join(root, '.look/audio'));
fs.mkdirSync(out, { recursive: true });
const pick = (p: Page, t: Take) => !only || only.some((o) => t.id.startsWith(o) || p.key === o);
const encoder = ['ffmpeg', 'afconvert'].find((c) => spawnSync('which', [c]).status === 0);

type Entry = Omit<Result, 'b64'> & Omit<Take, 'body'> & { file: string; wav: string; problem?: string };
const manifestPath = path.join(out, 'manifest.json');
const manifest: Entry[] = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : [];
const order = PAGES.flatMap((p) => p.takes.map((t) => t.id));
function save(e: Entry) {
  const k = manifest.findIndex((m) => m.id === e.id);
  if (k >= 0) manifest[k] = e;
  else manifest.push(e);
  manifest.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

// A small file a phone plays anywhere: MP3 with ffmpeg, else AAC (M4A) with macOS's afconvert, else the WAV.
function encode(wav: string): string {
  const mp3 = wav.replace(/\.wav$/, '.mp3'),
    m4a = wav.replace(/\.wav$/, '.m4a');
  if (encoder === 'ffmpeg')
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '192k', mp3], {
      stdio: 'inherit',
    });
  else if (encoder === 'afconvert')
    spawnSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '160000', wav, m4a], { stdio: 'inherit' });
  return path.basename([mp3, m4a, wav].find((f) => fs.existsSync(f))!);
}

const stack = await startStack();
const browser = await launch();
const failed: string[] = [];
try {
  for (const page of PAGES) {
    const takes = page.takes.filter((t) => pick(page, t));
    if (!takes.length) continue;
    const room = (page.room ?? 'audio') + Math.random().toString(36).slice(2, 6);
    console.log(`\n== ${page.key} (?${page.query}, room ${room})`);
    const g = await Game.open(browser, stack, { name: 'listener', room, query: page.query, init: RECORDER, hud: true });
    try {
      await g.eval(
        `${PRE} await until(() => R.ready && R.node && R.ctx.state === 'running', 20000);
        ${page.setup ?? ''}`,
      );
      // What the page plays by itself (beds), for reading the takes' levels against.
      const floor = (await g.eval(
        `${PRE} await sleep(1500); const r = await R.run(1, null, { trim: false }); return r.peakDb;`,
      )) as number;
      console.log(`  page floor: peak ${floor.toFixed(1)} dBFS over 1 s with nothing triggered`);
      for (const t of takes) {
        try {
          const r = (await g.eval(`${PRE} ${t.body}`)) as Result;
          if (t.silent) {
            const loud = r.peakDb >= -60;
            console.log(
              `  ${loud ? 'FAIL' : 'ok  '} ${t.id.padEnd(16)} peak ${r.peakDb.toFixed(1).padStart(6)} dBFS (must be silent)`,
            );
            if (loud) failed.push(`${t.id}: not silent (peak ${r.peakDb.toFixed(1)} dBFS)`);
            continue;
          }
          const wav = path.join(out, `${t.id}.wav`);
          fs.writeFileSync(wav, Buffer.from(r.b64, 'base64'));
          const problem =
            r.peakDb < -50 ? 'silent' : r.clipped ? `${r.clipped} clipped samples` : r.seconds < 0.05 ? 'empty' : '';
          const { id, group, title, when } = t;
          const { sampleRate, seconds, peakDb, rmsDb, clipped, gainDb } = r;
          save({
            ...{ id, group, title, when, sampleRate, seconds, peakDb, rmsDb, clipped, gainDb },
            ...{ file: encode(wav), wav: path.basename(wav), ...(problem ? { problem } : {}) },
          });
          console.log(
            `  ${problem ? 'WARN' : 'ok  '} ${t.id.padEnd(16)} ${r.seconds.toFixed(2).padStart(6)} s  peak ${r.peakDb.toFixed(1).padStart(6)} dBFS  rms ${r.rmsDb.toFixed(1).padStart(6)} dBFS${problem ? '  ' + problem : ''}`,
          );
          if (problem) failed.push(`${t.id}: ${problem}`);
        } catch (e) {
          failed.push(`${t.id}: ${(e as Error).message.split('\n')[0]}`);
          console.log(`  FAIL ${t.id}: ${(e as Error).message.split('\n')[0]}`);
        }
      }
      const errors = (g as unknown as { errors: string[] }).errors;
      if (errors.length) console.log(`  page errors: ${errors.slice(0, 3).join(' | ')}`);
    } finally {
      await g.close().catch(() => {});
    }
  }
} finally {
  await browser.close();
  await stack.close();
}
console.log(
  `\n${manifest.length} files in ${out}${encoder ? ` (compressed by ${encoder})` : ' (WAV only: no ffmpeg or afconvert)'}`,
);
if (failed.length) {
  console.log(`problems:\n  ${failed.join('\n  ')}`);
  process.exitCode = 1;
}
