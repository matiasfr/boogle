// The listening pack: every synthesized game sound rendered to a file you can audition away from the game
// (`node dev/audio/render.ts`; DESIGN.md "How we work": feel is judged by playing, and here by listening). It starts the look
// harness (dev/look/lib.mjs: Vite, a local server, Chromium), opens one page per prototype, and records the real
// Web Audio graph while each sound plays: a tap on everything that reaches the context's destination, recorded
// sample-exact on the audio thread (an AudioWorklet). Each sound is either called through its module's export or
// played by the game itself (the wave's telegraph, a grind, a soapbox run, a laying run, opening day), so what you hear
// is what a player hears, levels included.
//
//   node dev/audio/render.ts                       every take into .look/audio/ (WAV + MP3 + manifest.json)
//   node dev/audio/render.ts --only groove,ui      just the takes whose id or page starts with one of these
//   node dev/audio/render.ts --out <dir>
//
// Files are peak-normalized to -1 dBFS so they audition at the same loudness on a phone; manifest.json keeps each
// one's in-game peak and RMS (dBFS at the game's master), so relative loudness is still on record. One-shots are
// trimmed of leading and trailing silence; the groove's loops are cut on bar lines, sample-exact, so they loop.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { startStack, launch, Game, root } from '../look/lib.mjs';

type Take = {
  id: string;
  group: string; // the prototype, for the index page
  title: string;
  when: string; // when it plays in the game, one line
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
// Groove: hold a state, then record `bars` from the next clean bar line (a whole bar after the state took over).
const groove = (state: string, bars: number, during = '') => `
  const G = window.__groove;
  G.force('${state}');
  await until(() => G.state().playing === '${state}', 20000);
  const BAR = (60 / G.song.bpm) * 4, off = G.state().off;
  const at = (Math.ceil((R.ctx.currentTime - off) / BAR + 0.15) + 1) * BAR + off;
  return R.run(${bars} * BAR, async () => { ${during} }, { at, trim: false });`;
const followWagon = `const W = window.__wagon;
  const follow = setInterval(() => { const p = W.cars[0].mesh.position; window.__debugCam.set([p.x + 4, p.y + 2.5, p.z + 4], [p.x, p.y, p.z]); }, 50);`;
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
        when: 'Selecting a hotbar slot: one pentatonic step per slot; empty hands is the low one (here: empty, then slots 0 to 8).',
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
        when: 'A press that did something: Take logs, Pick up.',
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
        when: 'A work-site plaque turns a row over (a pour was credited): near, mid and far from the plaque.',
        body: seq(
          `const { uiSound } = await import('/src/render/ui-sound.ts');`,
          [`uiSound('flap', 1);`, `uiSound('flap', 0.55);`, `uiSound('flap', 0.25);`],
          700,
        ),
      },
      {
        id: 'honk',
        group: 'Base game',
        title: 'Honk (six player colours)',
        when: 'T, pad Y or the Honk button: everyone has a stable pitch from their colour.',
        body: seq(
          `const { honkSound } = await import('/src/features/honk.ts'); const { honkFreq } = await import('/src/sim/social.ts');`,
          [0, 1, 2, 3, 4, 5].map((c) => `honkSound(honkFreq(${c}), 0.16);`),
          450,
        ),
      },
      {
        id: 'honk-chord',
        group: 'Base game',
        title: 'Honk chord',
        when: 'Three or more players honk within about a second: their honks then a chord with a sparkle (twice).',
        body: seq(
          `const { honkSound, chordSound } = await import('/src/features/honk.ts'); const { honkFreq } = await import('/src/sim/social.ts');`,
          [
            `honkSound(honkFreq(0), 0.16);`,
            `honkSound(honkFreq(2), 0.14);`,
            `honkSound(honkFreq(4), 0.14); chordSound([0, 2, 4].map(honkFreq), 0.17);`,
            `await sleep(900);`,
            `honkSound(honkFreq(1), 0.16);`,
            `honkSound(honkFreq(3), 0.14);`,
            `honkSound(honkFreq(5), 0.14); chordSound([1, 3, 5].map(honkFreq), 0.17);`,
          ],
          260,
        ),
      },
      {
        id: 'ping',
        group: 'Base game',
        title: 'Ping chime',
        when: 'G, middle click or Ping: "Ball!" (a fifth up), then "Look!" (a third up), then a friend\'s quieter ping.',
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
        when: 'The ball hitting things, by impact speed: a soft bounce, a medium and a hard hit, a splash-down, then a face-plant.',
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
        title: 'Double-jump whoop',
        when: 'The second jump in the air (any ?proto= page with &jump2=1): three of them.',
        body: seq(`const { whoop } = await import('/src/proto/moves/index.ts');`, Array(3).fill(`whoop();`), 550),
      },
    ],
  },
  {
    key: 'groove',
    query: 'proto=groove',
    // A layer's gain node is made on its first note, after the bar line that sets the layers' levels, so a layer
    // stays at 0 until the next state change. Two bars of full make every layer, then silent, so each take's state
    // change sets them all.
    setup: `const G = window.__groove, BAR = (60 / G.song.bpm) * 4;
      G.force('full'); await until(() => G.state().playing === 'full', 20000); await sleep(BAR * 2000);
      G.force('silent'); await until(() => G.state().playing === 'silent', 20000);`,
    takes: [
      {
        id: 'groove-sparse',
        group: 'Groove (?proto=groove)',
        title: 'Loop, sparse (8 bars)',
        when: 'Standing still away from spawn: hats and soft stabs. Cut on bar lines, so it loops.',
        body: groove('sparse', 8),
      },
      {
        id: 'groove-groove',
        group: 'Groove (?proto=groove)',
        title: 'Loop, groove (8 bars)',
        when: 'Moving around (and for 3 s after you stop): kick, hats and bass. Loops.',
        body: groove('groove', 8),
      },
      {
        id: 'groove-full',
        group: 'Groove (?proto=groove)',
        title: 'Loop, full (8 bars)',
        when: 'Riding something (the wagon, a deck): all four layers. Loops.',
        body: groove('full', 8),
      },
      {
        id: 'groove-drop',
        group: 'Groove (?proto=groove)',
        title: 'Wipeout drop (4 bars of full)',
        when: 'A hard landing, being knocked flat or a tumble: one beat of silence with a slide down through it.',
        body: groove('full', 4, `await sleep(((60 / G.song.bpm) * 4 * 1.6) * 1000); G.wipeout();`),
      },
      {
        id: 'groove-snap',
        group: 'Groove (?proto=groove)',
        title: 'Sound effects on the grid (4 bars of full)',
        when: 'Honks and a magnet burst over the music: they land on the next 16th and in the current chord, and duck the music.',
        body: groove(
          'full',
          4,
          `const { honkSound } = await import('/src/features/honk.ts'); const { honkFreq } = await import('/src/sim/social.ts');
          const { arrivalTick, burstChord } = await import('/src/proto/haul/magnet-sound.ts');
          await sleep(900); honkSound(honkFreq(0), 0.16); await sleep(700); honkSound(honkFreq(3), 0.16);
          await sleep(1300); for (let k = 0; k < 10; k++) { arrivalTick(); await sleep(55); } burstChord();
          await sleep(1400); honkSound(honkFreq(5), 0.16);`,
        ),
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
        title: 'Magnet: 12 pickups in a burst',
        when: 'The magnet variant (&v=magnet): a tick per piece landing on your back, climbing the scale, closing on a chord; then a short burst after the run resets.',
        body: seq(
          `const { arrivalTick, burstChord } = await import('/src/proto/haul/magnet-sound.ts');`,
          [
            ...Array(12).fill(`arrivalTick();`),
            `burstChord(); await sleep(1200);`,
            ...Array(5).fill(`arrivalTick();`),
            `burstChord();`,
          ],
          55,
        ),
      },
    ],
  },
  {
    key: 'wagon',
    query: 'proto=wagon&grind=1&laid=3',
    setup: `await until(() => window.__wagon && window.boogle.me.body);`,
    takes: [
      {
        id: 'wagon-ride',
        group: 'Wagon (?proto=wagon)',
        title: 'Wagon: whistle and clacks',
        when: 'The wagon leaving a stop: the whistle a moment before, then the rail-joint clacks as it rolls (heard from beside the loco).',
        body: `${followWagon}
          const { wagonAt, wagonCycle } = await import('/src/sim/wagon.ts');
          const pace = W.pace, C = wagonCycle(3, pace);
          let ph = 0;
          while (ph < C && !((wagonAt(3, ph, 0, pace)?.stop ?? -1) >= 0 && (wagonAt(3, ph + 1, 0, pace)?.stop ?? 0) < 0)) ph++;
          W.seekPhase(ph - 45);
          try { return await R.run(20, null); } finally { clearInterval(follow); }`,
      },
      {
        id: 'grind-full',
        group: 'Grind (?proto=wagon&grind=1)',
        title: 'Grind the whole line',
        when: 'Landing on a laid rail: the land, a hiss rising with speed, a clack per rail joint, hopping the parked track machine, flying off the railhead.',
        body: grindShot('full', 16),
      },
      {
        id: 'grind-reverse',
        group: 'Grind (?proto=wagon&grind=1)',
        title: 'Grind reverse screech',
        when: 'Pulling back while grinding: the screech as you reverse.',
        body: grindShot('reverse', 4.5),
      },
      {
        id: 'grind-bonk',
        group: 'Grind (?proto=wagon&grind=1)',
        title: 'Grind into the wagon',
        when: 'Meeting the wagon on the line while grinding: the bonk.',
        body: grindShot('bonk', 5),
      },
      {
        id: 'freight-thump',
        group: 'Wagon (?proto=wagon)',
        title: 'Freight crates',
        when: 'Helper-hut freight: crates hopping off the rear flatbed into the Track ring.',
        body: seq(
          `const { thump } = await import('/src/proto/wagon/freight.ts'); const { camera } = await import('/src/render/scene.ts');
          const at = () => { const v = camera.position.clone(); v.x += 2; return v; };`,
          [0, 1, 2, 3].map((k) => `thump(at(), ${k});`),
          320,
        ),
      },
    ],
  },
  {
    key: 'stoke',
    query: 'proto=wagon&v=stoke&laid=3',
    setup: `await until(() => window.__wagon && window.__wagon.cars[0]);
      const p = window.__wagon.cars[0].mesh.position;
      window.__debugCam.set([p.x + 2, p.y + 2, p.z + 2], [p.x, p.y, p.z]);
      await sleep(500);`,
    takes: [
      {
        id: 'stoke-roar',
        group: 'Wagon (?proto=wagon)',
        title: 'Stoke roar',
        when: "The stoke variant (&v=stoke): logs into the firebox catch with a roar; yours twice, then a friend's (quieter).",
        body: seq(
          `const { whoosh } = await import('/src/proto/wagon/stoke.ts');`,
          [`whoosh(true);`, `whoosh(true);`, `whoosh(false);`],
          900,
        ),
      },
      {
        id: 'stoke-chuffs',
        group: 'Wagon (?proto=wagon)',
        title: 'Chimney chuffs, cold to hot',
        when: 'The stoke variant: a chuff per chimney puff, louder and brighter as the fire gets hotter (cold, warm, hot).',
        body: seq(
          `const { chuffSound } = await import('/src/proto/wagon/stoke.ts'); const p = window.__wagon.cars[0].mesh.position.clone();`,
          [0, 0.5, 1].flatMap((h) => [...Array(8).fill(`chuffSound(p, ${h});`)]),
          330,
        ),
      },
    ],
  },
  {
    key: 'soapbox',
    query: 'proto=soapbox',
    setup: `await until(() => window.__soapbox && window.boogle.me.body);`,
    takes: [
      {
        id: 'soapbox-run',
        group: 'Soapbox (?proto=soapbox)',
        title: 'A whole run',
        when: 'Riding the soapbox down the course: rumble at low speed, the wooden rattle above 8 m/s, wind from 10 m/s.',
        body: `const P = await import('/dev/look/evals/soapbox-pilot.ts'); return R.run(14, async () => { await P.drive({}); }); // drive() starts the run and returns`,
      },
      {
        id: 'soapbox-drift',
        group: 'Soapbox (?proto=soapbox)',
        title: 'Drift charge and boost',
        when: 'A handbrake drift through the long right: charge ticks (ready, big), then the big boost when you let go.',
        body: `const P = await import('/dev/look/evals/soapbox-pilot.ts');
          const run = P.drive({ drift: [9.1, 10.0], driftSteer: 1 });
          await sleep(7800);
          const r = await R.run(5, null);
          await run;
          return r;`,
      },
      {
        id: 'soapbox-crash',
        group: 'Soapbox (?proto=soapbox)',
        title: 'Crash',
        when: 'Hitting a palm at speed: a low thump and a clatter.',
        body: `const P = await import('/dev/look/evals/soapbox-pilot.ts');
          const palm = P.obstacle(-50, -56) ?? [-52.3, -53.3];
          const run = P.drive({ path: [[-40, -95], [-34.5, -94], [-41, -85], [-42, -75], [-41.5, -68], [-40, -61.5], [-46, -56], palm, [-60, -50]] });
          await sleep(7600);
          const r = await R.run(4.5, null);
          await run;
          return r;`,
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
        when: 'Era 1 everywhere on the island: a breeze, mallet knocks, the odd gull, and the island motif plucked.',
        body: `return R.run(24, null, { trim: false });`,
      },
      {
        id: 'era-opening-day',
        group: 'Era (?proto=era)',
        title: 'Opening day: call, bell, swap to steam',
        when: 'The gathering call tolls, everyone arrives, the 10 s bell counts down, the big bell, then the wood bed crossfades into the steam bed (rumble, chuffs, whistle, the motif on brass).',
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
        // The era's ambience bed plays on every page (src/pois/ loads it); only the era's own takes keep it.
        const A = await import('/src/pois/era/ambience.ts'); A.setAmbienceLevel(${page.key === 'era' ? 0.5 : 0});
        ${page.setup ?? ''}`,
      );
      // What the page plays by itself (beds, the music), for reading the takes' levels against.
      const floor = (await g.eval(
        `${PRE} await sleep(1500); const r = await R.run(1, null, { trim: false }); return r.peakDb;`,
      )) as number;
      console.log(`  page floor: peak ${floor.toFixed(1)} dBFS over 1 s with nothing triggered`);
      for (const t of takes) {
        try {
          const r = (await g.eval(`${PRE} ${t.body}`)) as Result;
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
