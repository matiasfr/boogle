// The crossing's finale (./crossing-view.ts): the twelfth footing set gives one whistle, then a shared camera pull-out
// along the six bents to Ring Island, ten rockets over the bents' far end leaning out toward it, and a banner. The
// shard itself does nothing: its one reaction is saved for the first train through the ring
// (docs/brainstorms/ring-island.md, item 7). Pure (layout constants only), for tests.
//
// The whistle used to take the machine sounds' 45 m range (src/render/hearing.ts), but the last bent is about 121 m
// from the pier head where the twelfth footing is set: it was silent for everyone on the pier (the owner's playtest,
// 10 November 2026). Its range is sized from that distance so the pier head hears it at about half its gain.
//
// The same playtest: two small rockets for 2.5 s, partly behind the jib's mast, and nothing said "done", so the run
// looked stalled. Ring Island is the next area (6 November), so the finale is a promise rather than an ending: the shot
// travels the bents and ends on the broken ring with the shard's light in its middle.
import { CROSSING_BENTS, PIER_FRAME } from '../../sim/railway-works-layout.ts';

type Point = { x: number; y: number; z: number };
const first = CROSSING_BENTS[0]!,
  last = CROSSING_BENTS.at(-1)!;
/** Where the finale plays, in world metres: the last bent. */
export const SHOW_AT = { x: last.x / 100, z: last.z / 100 } as const;
/** Metres from the pier head's jib, where the twelfth footing is set, to the last bent. */
export const SHOW_FROM_PIER = Math.hypot(SHOW_AT.x - PIER_FRAME.x / 100, SHOW_AT.z - PIER_FRAME.z / 100);
/** The finale whistle's hearing range: (1 - 1/3.5)² ≈ 0.51 of its gain at the pier head. */
export const SHOW_HEAR = SHOW_FROM_PIER * 3.5;

/** Ring Island's shard, in world metres: Place's buildFar (src/proto/place/land.ts) stands it 10 m east of FAR + ORIGIN,
 * 140 m up, inside the broken ring. */
export const RING_SHARD: Point = { x: 1340, y: 140, z: -1120 };

const span = Math.hypot(last.x - first.x, last.z - first.z) / 100;
const along = { x: (last.x - first.x) / 100 / span, z: (last.z - first.z) / 100 / span };
/** A point `s` metres along the bents from the first (toward Ring Island), `east` metres to the line's east, `up`
 * metres over the sea. */
export function onCrossing(s: number, east: number, up: number): Point {
  return { x: first.x / 100 + along.x * s - along.z * east, y: up, z: first.z / 100 + along.z * s + along.x * east };
}
/** Metres from the first bent to the last. */
export const CROSSING_SPAN = span;

/** The pull-out: from over the pier head's seaward end, east of the line, along the bents just over their decks (24.3 m
 * at the pier head down to 20.3 m at the last, the 4% bow) to just short of the last, looking out over the far end to
 * Ring Island all the way (the ring and shard stay in frame). Seconds of the whole shot, like Far Head's 6 s plus one
 * for the longer travel. */
export const FINALE_SHOT = {
  seconds: 7,
  from: onCrossing(-10, 20, 34),
  to: onCrossing(span - 22, 12, 27),
  /** Below the shard, so the bents keep the bottom of the frame and the ring sits under the banner. */
  at: { x: RING_SHARD.x, y: 5, z: RING_SHARD.z },
} as const;

/** Ten rockets from the sea past the last bent, each leaning `lean` metres out toward Ring Island as it climbs. */
export const FINALE_ROCKETS = {
  count: 10,
  /** Seconds from the shot's start to the first launch, and between launches. */
  first: 1,
  gap: 0.45,
  /** Launch sites: metres past the last bent toward the island, and to either side of the line. */
  beyond: [4, 30],
  side: 26,
  height: [26, 38],
  lean: 14,
  size: 3,
} as const;

/** Unit vector from the last bent toward Ring Island's shard, on the sea. */
export function towardRing(): { x: number; z: number } {
  const dx = RING_SHARD.x - SHOW_AT.x,
    dz = RING_SHARD.z - SHOW_AT.z,
    d = Math.hypot(dx, dz);
  return { x: dx / d, z: dz / d };
}
