// The procedural "boing": a wobbling triangle whose pitch and length follow how hard something hit. The beach ball's
// bounces (src/features/impact.ts) and a friend going down (src/features/knockdown.ts) play it. Local cosmetics, so
// Math.random is fine.
//
//   boing(speed, vol, low)   speed in m/s (0..24 sets pitch and length), vol 0..1, low: a deeper base (water, bodies)
//   farGain(x, z)            a volume factor for a sound at x, z: 1 at the camera, falling off with distance
import { clamp } from '../math.ts';
import { getAudio } from './audio.ts';
import { camera } from './scene.ts';

let lastBoing = 0,
  boingBurst = 0,
  boingBurstAt = 0;
export function boing(speed: number, vol: number, low: boolean) {
  const a = getAudio();
  if (!a) return;
  const now = performance.now();
  if (now - lastBoing < 60) return;
  if (now - boingBurstAt > 300) boingBurst = 0;
  if (boingBurst >= 4) return;
  boingBurst++;
  boingBurstAt = lastBoing = now;
  const { ctx, out } = a;
  const t = ctx.currentTime + 0.003;
  const f0 = (low ? 110 : 160) + clamp(speed, 0, 24) * 13 * (0.96 + Math.random() * 0.08);
  // a bit subtler (2026-11-02 audit): about 4 dB down, an 8 ms onset, shorter tails, a gentler wobble and the
  // triangle's top rounded off
  const dur = 0.13 + clamp(speed / 24, 0, 1) * 0.14;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol * 0.62, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1800;
  g.connect(lp).connect(out);
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(f0 * 0.75, t);
  o.frequency.exponentialRampToValueAtTime(f0 * 1.45, t + 0.035);
  o.frequency.exponentialRampToValueAtTime(f0 * 0.6, t + dur);
  const lfo = ctx.createOscillator(); // the wobble that makes it a boing
  lfo.frequency.value = 24;
  const lg = ctx.createGain();
  lg.gain.setValueAtTime(f0 * 0.045, t);
  lg.gain.exponentialRampToValueAtTime(0.01, t + dur);
  lfo.connect(lg).connect(o.frequency);
  const o2 = ctx.createOscillator();
  o2.type = 'sine';
  o2.frequency.setValueAtTime(f0 * 1.5, t);
  o2.frequency.exponentialRampToValueAtTime(f0 * 0.9, t + dur);
  const g2 = ctx.createGain();
  g2.gain.value = 0.35;
  o2.connect(g2).connect(g);
  o.connect(g);
  for (const n of [o, o2, lfo]) {
    n.start(t);
    n.stop(t + dur + 0.03);
  }
}

export const farGain = (x: number, z: number, falloff = 300) =>
  1 / (1 + ((camera.position.x - x) ** 2 + (camera.position.z - z) ** 2) / falloff);
