// Pure, deterministic prototype schedule. Shared authority commits these indices; meshes never decide them.
import { LINKS, STUB, type LineSpec } from '../../place/layout.ts';

// Twelve stock units, partitioned at the three stops; T1/T2 end in shorter closures. Each unit lays as its rail
// pairs, about 3 m each (owner, 6 November: "drop smaller chunks of rail so it doesn't have to extend so far"),
// matching src/sim's integer-centimetre pairsOf.
const TIMBER_COUNTS = [3, 3, 6] as const;
const STOCK_UNIT = (116 - STUB.village) / TIMBER_COUNTS[2];
export const railPairs = (length: number) => Math.max(1, Math.floor(length / 3 + 0.5 + 1e-9));
export type TrackPanel = { from: number; to: number; end: number; stage: number; stock: number };
/** Metres in travel order, one rail pair each. `stock` is 1 on the pair that closes a stock unit (its one magazine
 * decrement; a short closure unit too). */
export function trackPanels(spec: LineSpec): TrackPanel[] {
  const out: TrackPanel[] = [];
  const u = (s: number) => (spec.dir > 0 ? s : spec.line.len - s);
  let from = u(spec.stations[0]!.s);
  spec.stations.forEach((st, stage) => {
    const end = u(st.to);
    const count = spec.id === 'timber' ? TIMBER_COUNTS[stage]! : st.rails;
    const span = spec.id === 'timber' ? STOCK_UNIT : (end - from) / count;
    const origin = from;
    for (let index = 1; index <= count; index++) {
      const unitEnd = index === count ? end : Math.min(end, origin + index * span);
      const unitFrom = from,
        pairs = railPairs(unitEnd - unitFrom);
      for (let k = 1; k <= pairs; k++) {
        const to = k === pairs ? unitEnd : unitFrom + ((unitEnd - unitFrom) * k) / pairs;
        out.push({ from, to, end: spec.dir > 0 ? to : spec.line.len - to, stage, stock: k === pairs ? 1 : 0 });
        from = to;
      }
    }
  });
  return out;
}

/** Where a panelled line's sleepers lie on the land between `from` and `to` (metres along the line), each with its
 * depth along the track: the walk buildTrack makes (./track.ts: 1.2 m apart from each panel cut, the last of a cut
 * shorter), for yard track that shares those sleepers (./yard-track.ts). Not for a decked stretch (planks, 1 m apart). */
export function sleeperStations(spec: LineSpec, from: number, to: number): { s: number; depth: number }[] {
  const panels = trackPanels(spec);
  const cuts = [0, ...panels.map((p) => p.from), panels.at(-1)!.to, spec.line.len].sort((a, b) => a - b);
  const out: { s: number; depth: number }[] = [];
  for (let cut = 1; cut < cuts.length; cut++)
    for (let at = cuts[cut - 1]!; at < cuts[cut]! - 1e-7;) {
      const length = Math.min(1.2, cuts[cut]! - at);
      const s = spec.dir > 0 ? at + length / 2 : spec.line.len - at - length / 2;
      if (s >= from && s <= to) out.push({ s, depth: Math.min(0.42, length) });
      at += length;
    }
  return out.sort((a, b) => a.s - b.s);
}

/** The longest rail pair any line lays (Place's Q4 rail, 6.75 m in two 3.375 m pairs; production's longest is Q2's
 * 3.33 m). The machine's deck setback, and so its gantry beam, follow from it. */
export const MAX_PANEL_LENGTH = Math.max(...LINKS.flatMap((spec) => trackPanels(spec).map((p) => p.to - p.from)));

export const panelEase = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};
/** A panel's rails are cut into equal pieces of about 3 m (one for a single-pair panel); the gantry carries the last.
 * Metres from the panel start. */
export function carriedPiece(length: number) {
  const piece = length / railPairs(length);
  return { centre: length - piece / 2, length: piece };
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
 * at 0.97 so a follower holding at 0.98 rests on it. No animation callback into game state. A rail-pair cycle lasts
 * about half a second and its runs along the short beam are a few metres, so the pick (lower, grip, lift to gauge)
 * and the seat get a larger share than the old 14 m panels gave them. */
export function panelPose(phase: number) {
  const t = Math.max(0, Math.min(1, phase));
  const at = (from: number, to: number) => panelEase((t - from) / (to - from));
  return {
    returnT: panelGlide(t / 0.24),
    lower: at(0.24, 0.33),
    grip: at(0.33, 0.39),
    picked: t >= 0.39,
    gauge: at(0.39, 0.48),
    travel: panelGlide((t - 0.48) / 0.16),
    sweep: sweepIn((t - 0.64) / 0.2),
    seat: at(0.84, 0.97),
  };
}
