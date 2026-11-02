// The UI sound kit (docs/research/ui-patterns.md, rec 1): five tiny synthesized voices for the HUD, in one pitch family
// (C major pentatonic from C5), quiet (a bus about 8 dB under the master) and short. Motion and legibility rules for the
// same HUD are in ./ui-kit.css. Local and cosmetic.
//
//   uiSound('tick')         hotbar select: one soft, short tone, the same for every slot (Fortnite-style; TICK = false
//                           silences it, the slot's bounce still shows the choice)
//   uiSound('pop')          the interact prompt appears (rate-limited, so walking past palms doesn't chatter)
//   uiSound('thunk')        a press that did something (Take logs, Pick up): a marimba-like wooden tok on G4 over a
//                           soft low knock
//   uiSound('deny')         a press that couldn't ("Hotbar full"): a falling two-note
//   uiSound('count', dir)   the haul count moved by one: the pitch climbs with the run (falls when dir < 0) and resets
//                           after a pause
//   uiSound('flap', vol)    a work-site plaque turned a row over (a pour was credited): a quiet split-flap flutter (four
//                           tiny card clicks, no pitched pip), at vol (0-1, by distance from the plaque)
import { getAudio } from '../render/audio.ts';
import { clink } from '../render/clink.ts';

export type UiSound = 'tick' | 'pop' | 'thunk' | 'deny' | 'count' | 'flap';

const TICK = true; // false: the hotbar select is silent
const ROOT = 523.25; // C5
const PENTA = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3];
// Pentatonic step n above (or below) the root.
const note = (n: number): number => ROOT * 2 ** Math.floor(n / 5) * PENTA[((n % 5) + 5) % 5];
const GAP: Record<UiSound, number> = { tick: 30, pop: 220, thunk: 80, deny: 250, count: 35, flap: 240 }; // ms between plays
const last: Record<string, number> = {};
let run = 0;

let bus: GainNode | null = null;
let noise: AudioBuffer | null = null;
function busFor(ctx: AudioContext, out: AudioNode): GainNode {
  if (bus?.context !== ctx) {
    bus = ctx.createGain();
    bus.gain.value = 0.4; // about -8 dB: UI sits under the world
    bus.connect(out);
    noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.05), ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return bus;
}

type Blip = {
  type: OscillatorType;
  f0: number;
  f1?: number;
  at: number;
  dur: number;
  peak: number;
  lp?: number;
  attack?: number;
};
function blip(ctx: AudioContext, dest: AudioNode, b: Blip): void {
  const o = ctx.createOscillator();
  o.type = b.type;
  o.frequency.setValueAtTime(b.f0, b.at);
  if (b.f1) o.frequency.exponentialRampToValueAtTime(b.f1, b.at + b.dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, b.at);
  g.gain.exponentialRampToValueAtTime(b.peak, b.at + (b.attack ?? 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, b.at + b.dur);
  let src: AudioNode = o;
  if (b.lp) {
    const f = ctx.createBiquadFilter();
    f.frequency.value = b.lp;
    src = o.connect(f);
  }
  src.connect(g).connect(dest);
  o.start(b.at);
  o.stop(b.at + b.dur + 0.02);
}

export function uiSound(kind: UiSound, arg = 0): void {
  const a = getAudio();
  const now = performance.now();
  if (kind === 'count') {
    run = now - (last.count ?? -1e9) > 600 ? 0 : Math.max(-5, Math.min(9, run + Math.sign(arg || 1)));
  }
  if (!a || now - (last[kind] ?? -1e9) < GAP[kind] || (kind === 'flap' && arg <= 0.02) || (kind === 'tick' && !TICK))
    return;
  last[kind] = now;
  const { ctx } = a;
  const out = busFor(ctx, a.out);
  const at = ctx.currentTime + 0.005;
  const j = 1 + (Math.random() * 2 - 1) * 0.04; // ±4%: never the same twice
  switch (kind) {
    case 'tick':
      // one pitch (E5) whatever the slot, a pure sine with a 3 ms fade-in so it never clicks; barely varies
      blip(ctx, out, { type: 'sine', f0: note(2) * (1 + (j - 1) * 0.25), at, dur: 0.045, peak: 0.13, attack: 0.003 });
      break;
    case 'pop':
      blip(ctx, out, { type: 'sine', f0: note(3) * j, f1: note(8) * j, at, dur: 0.1, peak: 0.3 });
      break;
    case 'thunk': {
      // A mallet on a wooden bar: the fundamental rings briefly, its 4th partial (a marimba's) and a soft click give
      // the strike, and a low knock under it gives weight. Round, short, in the kit's key.
      const f = note(-2) * j; // G4
      blip(ctx, out, { type: 'sine', f0: f, at, dur: 0.22, peak: 0.42, attack: 0.002 });
      blip(ctx, out, { type: 'sine', f0: f * 4, at, dur: 0.035, peak: 0.1, attack: 0.001 });
      blip(ctx, out, { type: 'sine', f0: 170 * j, f1: 85 * j, at, dur: 0.09, peak: 0.38, attack: 0.002 });
      const n = ctx.createBufferSource();
      n.buffer = noise;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2600 * j;
      bp.Q.value = 1.2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.12, at);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.008);
      n.connect(bp).connect(g).connect(out);
      n.start(at);
      n.stop(at + 0.02);
      break;
    }
    case 'deny':
      blip(ctx, out, { type: 'square', f0: note(2) * j, at, dur: 0.09, peak: 0.12, lp: 1600 });
      blip(ctx, out, { type: 'square', f0: note(-1) * j, at: at + 0.1, dur: 0.11, peak: 0.12, lp: 1400 });
      break;
    case 'count': // v2: a small bright clink (clink.ts), in tune (its own ±6 cents, not j), the same climb
      clink(ctx, out, { at, freq: note(5 + run), level: 0.16, metal: 0.65, ring: 0.14, bounce: 0.25, strike: 0.5 });
      break;
    case 'flap': {
      // a split-flap board settling: four tiny card clicks, each softer and a little lower; news, not an alarm
      for (let k = 0; k < 4; k++) {
        const t0 = at + k * 0.024 + (Math.random() - 0.5) * 0.004;
        const n = ctx.createBufferSource();
        n.buffer = noise;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = (2200 - k * 180) * j;
        bp.Q.value = 2.2;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.2 * arg * (1 - k * 0.2), t0 + 0.001);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.014);
        n.connect(bp).connect(g).connect(out);
        n.start(t0);
        n.stop(t0 + 0.03);
      }
      break;
    }
  }
}

// Restart a one-shot CSS animation class (press, nope, tick) on an element.
export function replay(el: Element | null | undefined, cls: string): void {
  if (!el) return;
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
}
