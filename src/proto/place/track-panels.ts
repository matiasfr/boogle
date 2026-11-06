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
/** Distance-phase choreography: early empty return, drop/grip, lift, carry, lower. Contact is phase 1.
 * There is no animation callback into game state. A stopped final cycle returns on local time. */
export function panelPose(phase: number) {
  const t = Math.max(0, Math.min(1, phase));
  return {
    carry: panelEase((t - 0.57) / 0.23),
    lift: panelEase((t - 0.36) / 0.2) * (1 - panelEase((t - 0.8) / 0.2)),
    grip: panelEase((t - 0.29) / 0.07),
    picked: t >= 0.36,
    returning: t < 0.18,
    returnT: panelEase(t / 0.18),
    drop: panelEase((t - 0.18) / 0.11),
  };
}
