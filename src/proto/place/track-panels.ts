// Pure, deterministic prototype schedule. Shared authority commits these indices; meshes never decide them.
import { STUB, type LineSpec } from './layout.ts';

// Twelve stock units, partitioned at the three stops. The longest ordinary panel is
// 86/6 m: 2.867 s at 5 m/s, close to the 2.8 s storyboard. T1/T2 end in shorter closures.
const TIMBER_COUNTS = [3, 3, 6] as const;
export const MAX_PANEL_LENGTH = (116 - STUB.village) / TIMBER_COUNTS[2];
export type TrackPanel = { from: number; to: number; end: number; stage: number; stock: number };
/** Metres in travel order. Every entry, including a short closure, consumes exactly one stock unit. */
export function trackPanels(spec: LineSpec): TrackPanel[] {
  const out: TrackPanel[] = [];
  const u = (s: number) => (spec.dir > 0 ? s : spec.line.len - s);
  let from = u(spec.stations[0]!.s);
  spec.stations.forEach((st, stage) => {
    const end = u(st.to);
    const count = spec.id === 'timber' ? TIMBER_COUNTS[stage]! : st.rails;
    const span = spec.id === 'timber' ? MAX_PANEL_LENGTH : (end - from) / count;
    const origin = from;
    for (let index = 1; index <= count; index++) {
      const to = index === count ? end : Math.min(end, origin + index * span);
      out.push({ from, to, end: spec.dir > 0 ? to : spec.line.len - to, stage, stock: 1 });
      from = to;
    }
  });
  return out;
}

export const panelEase = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};
/** Rails are cut every 3 m from each panel's start. The gantry carries the last whole-looking pair (at least 2 m);
 * a shorter closure stub falls with the other pieces. Metres from the panel start. */
export function carriedPiece(length: number) {
  const whole = Math.floor(length / 3 + 1e-7);
  const rest = length - whole * 3;
  if (rest >= 2 - 1e-7 || whole === 0) return { centre: whole * 3 + rest / 2, length: rest };
  return { centre: whole * 3 - 1.5, length: 3 };
}
/** Trapezoidal travel (quarter accelerating, half cruising, quarter braking): peak speed 1.33x the average,
 * where smoothstep peaks at 1.5x. Long trolley runs use it. */
export const panelGlide = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  const v = 1 / 0.75;
  if (x < 0.25) return (v * x * x) / 0.5;
  if (x > 0.75) return 1 - (v * (1 - x) * (1 - x)) / 0.5;
  return v * 0.125 + v * (x - 0.25);
};
/** The sweep starts from rest (travel brakes into it) and reaches its laying speed over the first fifth. */
const sweepIn = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x < 0.2 ? (x * x * 2.5) / 0.9 : (x - 0.1) / 0.9;
};
/** Distance-phase choreography of one panel cycle (storyboard beats). Contact is phase 1; the seat completes
 * at 0.97 so a follower holding at 0.98 rests on it. No animation callback into game state. */
export function panelPose(phase: number) {
  const t = Math.max(0, Math.min(1, phase));
  const at = (from: number, to: number) => panelEase((t - from) / (to - from));
  return {
    returnT: panelGlide(t / 0.3),
    lower: at(0.3, 0.36),
    grip: at(0.36, 0.39),
    picked: t >= 0.39,
    gauge: at(0.39, 0.45),
    travel: panelGlide((t - 0.45) / 0.19),
    sweep: sweepIn((t - 0.64) / 0.24),
    seat: at(0.88, 0.97),
  };
}
