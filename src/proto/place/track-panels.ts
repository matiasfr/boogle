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
/** Distance-phase choreography of one panel cycle (storyboard: dev evidence in the PR). Contact is phase 1.
 * There is no animation callback into game state. A stopped final cycle returns on local time. */
export function panelPose(phase: number) {
  const t = Math.max(0, Math.min(1, phase));
  const at = (from: number, to: number) => panelEase((t - from) / (to - from));
  return {
    returnT: at(0, 0.26),
    lower: at(0.26, 0.34) * (1 - at(0.38, 0.46)),
    grip: at(0.34, 0.38),
    picked: t >= 0.38,
    gauge: at(0.38, 0.46),
    travel: at(0.46, 0.62),
    sweep: Math.max(0, Math.min(1, (t - 0.62) / 0.28)),
    seat: at(0.9, 1),
  };
}
