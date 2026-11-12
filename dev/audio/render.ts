// The listening pack: every synthesized game sound rendered to a file you can audition away from the game
// (`node dev/audio/render.ts`; DESIGN.md "How we work": feel is judged by playing, and here by listening). It starts the look
// harness (dev/look/lib.ts: Vite, a local server, Chromium), opens one page per prototype, and records the real
// Web Audio graph while each sound plays: a tap on everything that reaches the context's destination, recorded
// sample-exact on the audio thread (an AudioWorklet). Each sound is either called through its module's export or
// played by the game itself (the wave's telegraph, a laying run, the era's bed), so what you hear is what a player hears,
// levels included. Sounds the owner cut are left out; the silence checks play their moments and fail on any sound.
//
//   node dev/audio/render.ts                       every take into .look/audio/ (WAV + MP3 + manifest.json)
//   node dev/audio/render.ts --only haul,ui        just the takes whose id or page starts with one of these
//   node dev/audio/render.ts --out <dir>
//   node dev/audio/render.ts --offline-place       raw round-4 recipes via the existing Codex browser broker
//
// WAVs preserve full unnormalized float32 output, including silence, tails and overs. The ledger meters those raw
// windows; compressed listening derivatives never replace the measurement evidence. Use --broker in Codex jobs.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { startStack, launch, Game, root } from '../look/lib.ts';
import { analyze } from './analyze.ts';

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
  query: string; // '' for the current game, as the bare address opens it
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
  activeSeconds: number;
  nonfinite: number;
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
  R.lastEnd = 0;
  R.ends = new Map();
  R.note = (source, end) => { R.ends.set(source, end); R.lastEnd = Math.max(0, ...R.ends.values()); };
  R.attach = async (ctx, output) => {
    R.ctx = ctx;
    const url = URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' }));
    await ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    const node = R.node = new AudioWorkletNode(ctx, 'boogle-rec', {
      numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2],
      channelCount: 2, channelCountMode: 'explicit', channelInterpretation: 'speakers',
    });
    output.connect(node); node.connect(ctx.destination);
    node.port.onmessage = (e) => e.data === 'done' ? R.done?.() : R.chunks.push(e.data);
    R.ready = Promise.resolve();
  };
  // Every finite oscillator/buffer source already declares its completion to Web Audio. Follow that clock,
  // including delayed notes, instead of cutting all recipes at the same arbitrary post-trigger duration.
  for (const prototype of [OscillatorNode.prototype, AudioBufferSourceNode.prototype]) {
    const stop = prototype.stop;
    prototype.stop = function(at = 0) {
      R.note(this, at || this.context.currentTime);
      return stop.call(this, at);
    };
  }
  const startBuffer = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function(at = 0, offset = 0, duration) {
    if (!this.loop && this.buffer) {
      const rate = Math.max(0.001, this.playbackRate.value * 2 ** (this.detune.value / 1200));
      const seconds = Math.max(0, Math.min(duration ?? Infinity, this.buffer.duration - offset)) / rate;
      R.note(this, Math.max(at, this.context.currentTime) + seconds);
    }
    return startBuffer.call(this, at, offset, duration);
  };
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
  // until trigger() and all scheduled source tails complete. tail covers downstream reverb, not cue duration.
  // Full unnormalized float32 WAV; previews are derivatives and never replace this evidence.
  R.run = async (seconds, trigger, { at, tail = 0.25 } = {}) => {
    await until(() => R.ready && R.node && R.ctx.state === 'running', 20000);
    const ctx = R.ctx, sr = ctx.sampleRate;
    const start = at ?? ctx.currentTime + 0.1;
    R.chunks = [];
    R.ends.clear();
    R.lastEnd = start;
    const done = new Promise((r) => (R.done = r));
    R.node.port.postMessage({ from: Math.round(start * sr), to: seconds == null ? Infinity : Math.round((start + seconds) * sr) });
    while (ctx.currentTime < start) await sleep(5);
    if (trigger) await trigger();
    if (seconds == null) {
      await until(() => ctx.currentTime >= R.lastEnd, 30000);
      R.node.port.postMessage({ stopAt: Math.round((Math.max(ctx.currentTime, R.lastEnd) + tail) * sr) });
    }
    await done;
    const n = R.chunks.reduce((t, c) => t + c[0].length, 0);
    const L = new Float32Array(n), Rr = new Float32Array(n);
    let o = 0;
    for (const [l, r] of R.chunks) { L.set(l, o); Rr.set(r, o); o += l.length; }
    let peak = 0, sum = 0, clipped = 0, nonfinite = 0, first = n, last = -1;
    for (let i = 0; i < n; i++) {
      const a = Math.max(Math.abs(L[i]), Math.abs(Rr[i]));
      if (a > peak) peak = a;
      if (a > 1) clipped++;
      if (!Number.isFinite(L[i]) || !Number.isFinite(Rr[i])) nonfinite++;
      if (a > 1e-5) { first = Math.min(first, i); last = i; }
      sum += (L[i] * L[i] + Rr[i] * Rr[i]) / 2;
    }
    const db = (v) => (v > 0 ? 20 * Math.log10(v) : -200);
    const frames = n, bytes = new Uint8Array(44 + frames * 8), v = new DataView(bytes.buffer);
    const str = (p, s) => [...s].forEach((c, i) => v.setUint8(p + i, c.charCodeAt(0)));
    str(0, 'RIFF'); v.setUint32(4, 36 + frames * 8, true); str(8, 'WAVEfmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 3, true); v.setUint16(22, 2, true); v.setUint32(24, sr, true);
    v.setUint32(28, sr * 8, true); v.setUint16(32, 8, true); v.setUint16(34, 32, true); str(36, 'data'); v.setUint32(40, frames * 8, true);
    for (let i = 0; i < frames; i++) {
      for (const [c, ch] of [[0, L], [1, Rr]]) {
        v.setFloat32(44 + i * 8 + c * 4, ch[i], true);
      }
    }
    let b64 = '';
    for (let i = 0; i < bytes.length; i += 0x8000) b64 += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { b64: btoa(b64), sampleRate: sr, seconds: frames / sr, activeSeconds: Math.max(0, last-first+1)/sr, peakDb: db(peak), rmsDb: db(Math.sqrt(sum / Math.max(1, n))), clipped, nonfinite, gainDb: 0 };
  };
})();`;

// ---------------------------------------------------------------- takes
// Page-code snippets the takes share.
const PRE = `const R = window.__rec, { sleep, until } = R;`;
// A take that calls `calls` (page code) in order, `gap` ms apart; each entry is one statement.
const seq = (imports: string, calls: string[], gap: number) => `${imports}
  return R.run(null, async () => { for (const f of [${calls.map((c) => `async () => { ${c} }`).join(', ')}]) { await f(); await sleep(${gap}); } });`;

const PAGES: Page[] = [
  {
    key: 'voice',
    query: '',
    takes: [
      {
        id: 'voice-boogler',
        group: 'Voice',
        title: 'Formant phrase',
        when: 'Fixed representative Boogler phrase; original voice parameters, no text change.',
        body: `const {buildPlan, createLane} = await import('/src/render/npc-voice.ts');
        const {getAudio} = await import('/src/render/audio.ts');
        const voice = {baseHz:155,rangeSemis:2,formantScale:.9,brightnessHz:3500,cps:48,grainMs:[65,95],vowels:[.3,.15,.1,.25,.2]};
        const plan = buildPlan('Welcome aboard, my friends!', 'smile', voice);
        const audio = getAudio('voice');
        return R.run(null, () => {
          const lane=createLane(audio.ctx,audio.out,voice), start=audio.ctx.currentTime;
          for(const s of plan.syllables) lane.grain(s,start+s.at/1000);
          const last=plan.syllables.at(-1); lane.end(start+(last.at+last.ms)/1000+.04);
        });`,
      },
    ],
  },
  {
    key: 'machine',
    query: '',
    takes: [
      {
        id: 'machine-reference',
        group: 'Machine',
        title: 'Machine family at listener',
        when: 'One soft/heavy chuff, sleeper, rail and whistle at the camera.',
        body: seq(
          `const M = await import('/src/render/machine-sfx.ts'); const { camera } = await import('/src/render/scene.ts'); const {x,z}=camera.position;`,
          ['M.chuff(x,z,0);', 'M.chuff(x,z,1);', 'M.thump(x,z);', 'M.clank(x,z);', 'M.whistle(x,z);'],
          1800,
        ),
      },
    ],
  },
  {
    key: 'ui',
    query: 'jump2=1',
    takes: [
      {
        id: 'ui-tick',
        group: 'UI kit',
        title: 'Tick',
        when: 'A new thing in your hand, or a menu step: one soft tone (here: ten in a row).',
        body: seq(
          `const { uiSound } = await import('/src/ui/ui-sound.ts');`,
          [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => `uiSound('tick', ${k});`),
          220,
        ),
      },
      {
        id: 'ui-pop',
        group: 'UI kit',
        title: 'Prompt pop',
        when: 'The interact prompt appears ("Take logs", "Pick up"): three of them.',
        body: seq(`const { uiSound } = await import('/src/ui/ui-sound.ts');`, Array(3).fill(`uiSound('pop');`), 600),
      },
      {
        id: 'ui-thunk',
        group: 'UI kit',
        title: 'Thunk (it worked)',
        when: 'A press that did something (Take logs, Pick up): a wooden tok on G4 over a soft low knock.',
        body: seq(`const { uiSound } = await import('/src/ui/ui-sound.ts');`, Array(3).fill(`uiSound('thunk');`), 500),
      },
      {
        id: 'ui-deny',
        group: 'UI kit',
        title: 'Deny',
        when: 'A press that could not happen (a seed bag where nothing can grow): twice.',
        body: seq(`const { uiSound } = await import('/src/ui/ui-sound.ts');`, Array(2).fill(`uiSound('deny');`), 700),
      },
      {
        id: 'ui-count',
        group: 'UI kit',
        title: 'Haul count run',
        when: 'The haul counter moving by one: climbs with a run of pickups, resets after a pause, falls when you drop logs.',
        body: seq(
          `const { uiSound } = await import('/src/ui/ui-sound.ts');`,
          [...Array(12).fill(`uiSound('count', 1);`), 'await sleep(900);', ...Array(5).fill(`uiSound('count', -1);`)],
          110,
        ),
      },
      {
        id: 'ui-flap',
        group: 'UI kit',
        title: 'Plaque flap',
        when: 'A work-site plaque turns a row over (a pour was credited): a split-flap flutter, near, mid and far.',
        body: seq(
          `const { uiSound } = await import('/src/ui/ui-sound.ts');`,
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
        when: 'The ball hitting things, by impact speed: a soft bounce, a medium and a hard hit, then a splash-down or a friend going down. A bit subtler: lower, softer onset, shorter tails, gentler wobble.',
        body: seq(
          `const { boing } = await import('/src/render/boing.ts');`,
          [`boing(4, 0.08, false);`, `boing(10, 0.18, false);`, `boing(22, 0.3, false);`, `boing(16, 0.25, true);`],
          650,
        ),
      },
    ],
  },
  {
    key: 'ambience',
    query: '',
    setup: `await until(() => window.boogle.me.entered && window.boogle.me.body, 90000);
      await sleep(1000);`,
    takes: [
      {
        id: 'ambience-mix',
        group: 'The island (the production entry)',
        title: 'The ambience under the game',
        when: 'Standing at spawn with everything playing: the bed against the little guys and whatever else is going on.',
        body: `return R.run(30, null, { trim: false });`,
      },
      ...[
        ['coast', 'on the beach', 'ambience-coast', -125, 130],
        ['river', 'on the river bank, at the bottom of the gorge', 'ambience-river', 8, 30],
        ['inland', 'inland, on the village green', 'ambience-inland', -100, 14],
      ].map(([where, title, id, x, z]) => ({
        id: id as string,
        group: 'The island (the production entry)',
        title: `Ambience ${title}`,
        when: `The sea, gulls and breeze alone (the other buses muted), standing ${title}, 45 s (${where}).`,
        body: `const { getAudio } = await import('/src/render/audio.ts');
          for (const bus of ['music', 'sfx', 'ui', 'voice']) getAudio(bus).out.gain.value = 0;
          const { teleport } = await import('/src/physics/engine.ts');
          const { H } = await import('/src/place/land.ts');
          const { toWorld } = await import('/src/place/layout.ts');
          const x = toWorld(${x}), z = ${z}, b = window.boogle.me.body;
          teleport(b, x, Math.max(H(x, z), 0) + 1, z);
          b.velocity.set(0, 0, 0);
          await sleep(8000);
          return R.run(45, null, { trim: false });`,
      })),
      {
        id: 'ambience-gulls',
        group: 'The island (the production entry)',
        title: 'Gull calls, one of each',
        when: 'Each pattern the ambience picks from, near and far: a lone mew, a pair, a long call, and one answered.',
        body: seq(
          `const { gullCall } = await import('/src/render/ambience.ts');`,
          [
            `gullCall('mew', 0.2);`,
            `gullCall('pair', 0.2);`,
            `gullCall('long', 0.2);`,
            `gullCall('answered', 0.2);`,
            `gullCall('long', 1);`,
          ],
          5000,
        ),
      },
    ],
  },
];

// ---------------------------------------------------------------- run
const args = process.argv.slice(2);
const opt = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const only = opt('--only')?.split(',') ?? null;
const out = path.resolve(opt('--out') ?? path.join(root, '.look/audio', String(Date.now())));
fs.mkdirSync(out, { recursive: true });
if (fs.readdirSync(out, { recursive: true }).some((file) => String(file).endsWith('.wav')))
  throw new Error(
    'Capture output already contains WAVs; choose a fresh --out directory to avoid mixing builds. Use audio:analyze to re-meter existing evidence.',
  );
// Broker mode opens the same live fixtures through the supplied browser owner. No second browser or server path.
if (args.includes('--broker') && !args.includes('--offline-place') && !args.includes('--offline-locomotion')) {
  const failed: string[] = [];
  const manifest: object[] = [];
  const evidence: string[] = [];
  for (const page of PAGES) {
    const takes = page.takes.filter((t) => !only || only.some((o) => t.id.startsWith(o) || page.key === o));
    if (!takes.length) continue;
    const evalPath = path.join(root, '.look', `audio-${page.key}.ts`);
    fs.writeFileSync(
      evalPath,
      `${RECORDER}\n${PRE}
      const A = await import('/src/render/audio.ts');
      A.setVolume(1); A.setMuted(false);
      await until(() => A.audioOutput());
      const final = A.audioOutput(); await R.attach(final.ctx, final.out);
      let seed = 0x5b00; Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      ${page.setup ?? ''}
      await sleep(1500);
      ${takes
        .map(
          (take) => `try {
        const result = await (async () => { ${take.body} })();
        const {b64,...metadata} = result;
        metadata.audio = A.audioSnapshot();
        console.log('AUDIOMETA ' + JSON.stringify({id:${JSON.stringify(take.id)}, ...metadata}));
        for(let p=0;p<b64.length;p+=24000) console.log('AUDIODATA ${take.id} ' + b64.slice(p,p+24000));
      } catch(error) { console.log('AUDIOFAIL ' + JSON.stringify({id:${JSON.stringify(take.id)},error:String(error)})); }`,
        )
        .join('\n')}
    `,
    );
    const evidenceRoot = path.join(root, '.look/evidence');
    const before = new Set(fs.existsSync(evidenceRoot) ? fs.readdirSync(evidenceRoot) : []);
    const query = page.query;
    const run = spawnSync(
      process.execPath,
      [
        '.look/see-client.ts',
        'look',
        ...(query ? ['--query', query] : []),
        '--room',
        `proto-audio-${page.key}-${Date.now()}`,
        '--eval',
        evalPath,
        '--real',
        '--warm',
        '0',
        '--seconds',
        '0.2',
        '--frames',
        '2',
        '--name',
        `audio-${page.key}`,
        '--question',
        'Does the live sound fixture remain visible and healthy after capture?',
      ],
      { encoding: 'utf8', stdio: ['ignore', 'ignore', 'pipe'] },
    );
    const matches = (fs.existsSync(evidenceRoot) ? fs.readdirSync(evidenceRoot) : [])
      .filter((id) => !before.has(id))
      .map((id) => path.join(evidenceRoot, id, 'evidence.json'))
      .filter((file) => fs.existsSync(file))
      .filter((file) => {
        const e = JSON.parse(fs.readFileSync(file, 'utf8')) as { args: string[] };
        return e.args.includes(evalPath);
      });
    if (matches.length !== 1) {
      failed.push(`${page.key}: no unique broker manifest (${run.status}): ${run.stderr}`);
      continue;
    }
    const file = matches[0]!;
    evidence.push(file);
    const health = JSON.parse(fs.readFileSync(file, 'utf8')) as { status: number; changedDuringRun: boolean };
    if (run.status !== 0 || health.status !== 0 || health.changedDuringRun)
      failed.push(`${page.key}: broker health/source failure; ${file}`);
    const lines = fs.readFileSync(path.join(path.dirname(file), 'output.txt'), 'utf8').split('\n');
    for (const take of takes) {
      const line = lines.find(
        (l) => l.startsWith('AUDIOMETA ') && (JSON.parse(l.slice(10)) as { id: string }).id === take.id,
      );
      if (!line) {
        failed.push(
          `${take.id}: no capture; ${lines.find((l) => l.startsWith('AUDIOFAIL ') && l.includes(take.id)) ?? file}`,
        );
        continue;
      }
      const result = JSON.parse(line.slice(10)) as Omit<Result, 'b64'>;
      const b64 = lines
        .filter((l) => l.startsWith(`AUDIODATA ${take.id} `))
        .map((l) => l.slice(take.id.length + 11))
        .join('');
      const wav = `${take.id}.wav`;
      fs.writeFileSync(path.join(out, wav), Buffer.from(b64, 'base64'));
      const problem = result.nonfinite
        ? 'nonfinite samples'
        : take.silent
          ? result.peakDb >= -60
            ? 'cut moment audible'
            : ''
          : result.peakDb < -80
            ? 'untriggered or silent'
            : '';
      if (problem) failed.push(`${take.id}: ${problem}`);
      const { id, group, title, when, silent } = take;
      const description = { id, group, title, when, silent };
      manifest.push({ ...description, ...result, wav, problem, evidence: file, seed: 0x5b00, tap: 'final output' });
      console.log(`${take.id}: ${result.peakDb.toFixed(2)} dBFS, ${result.seconds.toFixed(3)} s ${problem}`);
    }
    fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ manifest, evidence, failed }, null, 2) + '\n');
  }
  analyze(out);
  if (evidence.length) fs.cpSync(out, path.join(path.dirname(evidence.at(-1)!), 'audio'), { recursive: true });
  console.log(`Raw WAVs, measurements.md, manifest.json: ${out}`);
  for (const problem of failed) console.error(problem);
  process.exit(failed.length ? 1 : 0);
}
// A Codex worker cannot launch Chromium. Ask its broker to render the same recipes in OfflineAudioContext;
// preserve unnormalized SFX levels so the owner can judge their relationship. No live mixer/compressor in this mode.
if (args.includes('--offline-place') || args.includes('--offline-locomotion')) {
  const locomotion = args.includes('--offline-locomotion');
  const evalFile = locomotion ? 'dev/audio/locomotion-offline.ts' : 'dev/audio/place-offline.ts';
  const evidenceRoot = path.join(root, '.look/evidence');
  const before = new Set(fs.existsSync(evidenceRoot) ? fs.readdirSync(evidenceRoot) : []);
  const run = spawnSync(
    process.execPath,
    [
      '.look/see-client.ts',
      'look',
      '--query',
      'ambience=off',
      '--eval',
      evalFile,
      '--warm',
      '0',
      '--seconds',
      '0.2',
      '--frames',
      '2',
      '--name',
      'audio-offline',
      '--question',
      'Does the place still render after the production sound recipes render offline?',
    ],
    { encoding: 'utf8', stdio: ['ignore', 'ignore', 'pipe'] },
  );
  // see-client prints and exits; large piped console output can be truncated. The broker's completed disk log is
  // authoritative. Select only a new manifest for this exact eval, never a previous successful render.
  const matches = (fs.existsSync(evidenceRoot) ? fs.readdirSync(evidenceRoot) : [])
    .filter((id) => !before.has(id))
    .map((id) => path.join(evidenceRoot, id, 'evidence.json'))
    .filter((file) => fs.existsSync(file))
    .filter((file) => {
      const e = JSON.parse(fs.readFileSync(file, 'utf8')) as { operation: string; args: string[] };
      return e.operation === 'look' && e.args.includes(path.join(root, evalFile));
    });
  if (matches.length !== 1) {
    console.error(`Offline audio: expected one new broker manifest, found ${matches.length}; exit ${run.status}.`);
    if (run.error) console.error(run.error.message);
    process.exit(1);
  }
  const evidence = matches[0]!;
  const broker = JSON.parse(fs.readFileSync(evidence, 'utf8')) as { status: number; changedDuringRun: boolean };
  const log = fs.readFileSync(path.join(path.dirname(evidence), 'output.txt'), 'utf8');
  const catalogueLine = log.split('\n').find((line) => line.startsWith('AUDIOCATALOG '));
  const catalogue = catalogueLine
    ? (JSON.parse(catalogueLine.slice(13)) as { expected: number; cues: string[]; seeds: number[] })
    : null;
  type OfflineTake = Result & { id: string; description: string; scheduled: number; sources: number };
  const takes: OfflineTake[] = log
    .split('\n')
    .filter((line) => line.startsWith('AUDIO '))
    .map((line) => {
      try {
        return JSON.parse(line.slice(6)) as OfflineTake;
      } catch {
        throw new Error(`Incomplete offline take in broker log; read ${evidence}.`);
      }
    });
  const manifest = takes.map(({ b64, ...take }) => {
    fs.mkdirSync(path.dirname(path.join(out, `${take.id}.wav`)), { recursive: true });
    fs.writeFileSync(path.join(out, `${take.id}.wav`), Buffer.from(b64, 'base64'));
    console.log(
      `${take.id}: ${take.seconds.toFixed(3)} s, peak ${take.peakDb.toFixed(1)} dBFS, ${take.clipped} clipped samples`,
    );
    return { ...take, wav: `${take.id}.wav` };
  });
  fs.writeFileSync(
    path.join(out, locomotion ? 'locomotion-offline.json' : 'place-offline.json'),
    JSON.stringify(
      {
        mode: locomotion
          ? 'Raw mono source references and authored character/SFX sum; no compressor/master.'
          : 'Raw mono SFX at unit distance gain; no master, compressor, normalization or live ambience.',
        evidence,
        catalogue,
        takes: manifest,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`Evidence: ${evidence}`);
  console.log(`Raw WAVs and offline manifest: ${out}`);
  if (run.status !== 0 || broker.status !== 0) console.error(`Offline audio failed; read ${evidence}.`);
  if (locomotion) {
    const metrics = ['A', 'B', 'C', 'v1'].flatMap((style) =>
      analyze(path.join(out, style)).map((row) => ({ ...row, style, wav: `${style}/${row.wav}` })),
    );
    fs.writeFileSync(path.join(out, 'metrics.json'), JSON.stringify(metrics, null, 2) + '\n');
  } else analyze(out);
  if (locomotion)
    fs.writeFileSync(
      path.join(out, 'listening.md'),
      [
        '# Locomotion listening sheet',
        '',
        'Mono 48 kHz float WAVs. A (0) soft thump, B (1) textured, C (2) toy tick; character.footstepStyle switches the next live contact. v1 is the frozen #1019 recipe, rendered offline in the current build. No old build launched. No listening-file normalization; the recipes share a -12 dBFS source-peak reference. Playback device, subjective balance and live cadence remain unverified here.',
        '',
        'Each file uses the same six take seeds, pitch/gain variation and fixed spacing across all styles and v1. Jump+land pairs each takeoff with normal landing 650 ms later. This is an audition, not a physics or stride timing simulation. Walk/run defaults are exactly 11 dB below v1; jump is -15 dB and land -13 dB before unchanged surface trims and jitter.',
        '',
        '| Style | Surface | Walk | Run | Jump + land |',
        '| --- | --- | --- | --- | --- |',
        ...['A', 'B', 'C', 'v1'].flatMap((style) =>
          ['grass', 'sand', 'wood', 'rail', 'water'].map(
            (s) =>
              `| ${style} | ${s} | [WAV](${style}/${s}-walk.wav) | [WAV](${style}/${s}-run.wav) | [WAV](${style}/${s}-jump+land.wav) |`,
          ),
        ),
        '',
        'Settings, source completion and seeds: locomotion-offline.json. Each style has metrics.json, measurements.md and meter-tool.json; combined metrics.json is here. Peak/RMS cover complete raw windows; LUFS is FFmpeg loudnorm input (BS.1770), diagnostic for short cues. The actual mix compressor/master and other game sounds are absent.',
      ].join('\n'),
    );
  fs.cpSync(out, path.join(path.dirname(evidence), 'audio'), { recursive: true });
  const bad = takes.some(
    (t) =>
      t.clipped > 0 || t.nonfinite > 0 || t.peakDb < -60 || t.seconds < 0.05 || t.seconds > (locomotion ? 12 : 2.1),
  );
  process.exit(
    run.status === 0 &&
      broker.status === 0 &&
      !broker.changedDuringRun &&
      catalogue &&
      takes.length === catalogue.expected &&
      !bad
      ? 0
      : 1,
  );
}
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
          const { sampleRate, seconds, peakDb, rmsDb, clipped, gainDb, activeSeconds, nonfinite } = r;
          save({
            ...{
              id,
              group,
              title,
              when,
              sampleRate,
              seconds,
              peakDb,
              rmsDb,
              clipped,
              gainDb,
              activeSeconds,
              nonfinite,
            },
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
