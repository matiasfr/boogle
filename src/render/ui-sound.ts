// The UI sound kit (docs/research/ui-patterns.md, rec 1): five tiny synthesized voices for the HUD, in one pitch family
// (C major pentatonic from C5), quiet (a bus about 8 dB under the master) and short. Behind ?proto=uisfx for now, which
// also puts `ui-kit` on <html> for the motion and legibility rules (src/render/ui-kit.css). Local and cosmetic.
//
//   uiSound('tick', slot)   hotbar select: a short blip, one pentatonic step per slot (-1: empty hands, lower)
//   uiSound('pop')          the interact prompt appears (rate-limited, so walking past palms doesn't chatter)
//   uiSound('thunk')        a press that did something (Take logs, Pick up): low and woody
//   uiSound('deny')         a press that couldn't ("Hotbar full"): a falling two-note
//   uiSound('count', dir)   the haul count moved by one: the pitch climbs with the run (falls when dir < 0) and resets
//                           after a pause
import { getAudio } from './audio.ts';

export const UI_KIT = new URLSearchParams(location.search).get('proto') === 'uisfx';
if (UI_KIT) document.documentElement.classList.add('ui-kit');

export type UiSound = 'tick' | 'pop' | 'thunk' | 'deny' | 'count';

const ROOT = 523.25; // C5
const PENTA = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3];
// Pentatonic step n above (or below) the root.
const note = (n: number): number => ROOT * 2 ** Math.floor(n / 5) * PENTA[((n % 5) + 5) % 5];
const GAP: Record<UiSound, number> = { tick: 30, pop: 220, thunk: 80, deny: 250, count: 35 }; // ms between plays
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

type Blip = { type: OscillatorType; f0: number; f1?: number; at: number; dur: number; peak: number; lp?: number };
function blip(ctx: AudioContext, dest: AudioNode, b: Blip): void {
  const o = ctx.createOscillator();
  o.type = b.type;
  o.frequency.setValueAtTime(b.f0, b.at);
  if (b.f1) o.frequency.exponentialRampToValueAtTime(b.f1, b.at + b.dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, b.at);
  g.gain.exponentialRampToValueAtTime(b.peak, b.at + 0.004);
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
  if (!UI_KIT) return;
  const a = getAudio();
  const now = performance.now();
  if (kind === 'count') {
    run = now - (last.count ?? -1e9) > 600 ? 0 : Math.max(-5, Math.min(9, run + Math.sign(arg || 1)));
  }
  if (!a || now - (last[kind] ?? -1e9) < GAP[kind]) return;
  last[kind] = now;
  const { ctx } = a;
  const out = busFor(ctx, a.out);
  const at = ctx.currentTime + 0.005;
  const j = 1 + (Math.random() * 2 - 1) * 0.04; // ±4%: never the same twice
  switch (kind) {
    case 'tick':
      blip(ctx, out, { type: 'triangle', f0: note(arg < 0 ? 3 : 5 + arg) * j, at, dur: 0.05, peak: 0.35 });
      break;
    case 'pop':
      blip(ctx, out, { type: 'sine', f0: note(3) * j, f1: note(8) * j, at, dur: 0.1, peak: 0.3 });
      break;
    case 'thunk': {
      blip(ctx, out, { type: 'sine', f0: 210 * j, f1: 120 * j, at, dur: 0.16, peak: 0.7 });
      blip(ctx, out, { type: 'triangle', f0: note(-5) * j, at, dur: 0.07, peak: 0.25 });
      const n = ctx.createBufferSource();
      n.buffer = noise;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 900 * j;
      bp.Q.value = 2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.5, at);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.04);
      n.connect(bp).connect(g).connect(out);
      n.start(at);
      break;
    }
    case 'deny':
      blip(ctx, out, { type: 'square', f0: note(2) * j, at, dur: 0.09, peak: 0.12, lp: 1600 });
      blip(ctx, out, { type: 'square', f0: note(-1) * j, at: at + 0.1, dur: 0.11, peak: 0.12, lp: 1400 });
      break;
    case 'count':
      blip(ctx, out, { type: 'sine', f0: note(5 + run) * j, at, dur: 0.06, peak: 0.28 });
      blip(ctx, out, { type: 'triangle', f0: note(10 + run) * j, at, dur: 0.03, peak: 0.06 });
      break;
  }
}

// Restart a one-shot CSS animation class (press, nope, tick) on an element.
export function replay(el: Element | null | undefined, cls: string): void {
  if (!el || !UI_KIT) return;
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
}
