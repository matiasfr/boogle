// The preset railway (SETTLED: a route like Death Stranding 2's highways, built in short sections). Static and the
// same on every peer: a pure module rather than JSON so the rules may import it. 0.1 testbed: three wood-age sections
// from the court toward the lighthouse (docs/plans/0.1-groundwork.md). Positions are world metres (x, z); each section
// runs from its site to `to`. Append only once shipped: a section's index is its id in lockstep state.

// Per age: what a section costs and what a helper hut costs (brief 7 section 3: ~x3 per age, helper ~0.6 of a
// section), in that age's material (src/sim/materials.ts).
export const AGES = [60, 180, 550, 1600, 5000, 15000, 45000].map((cost) => ({ cost, helper: Math.round(cost * 0.6) }));

export const ROUTE = [
  { age: 0, x: 11, z: 6, to: [10, -12] },
  { age: 0, x: 10, z: -12, to: [8, -30] },
  { age: 0, x: 8, z: -30, to: [6, -46] },
];
// ROUTE's positions as shipped, copied before `?layout=` (src/island/layout.ts) can move ROUTE in place: lockstep code
// that needs a section's geometry (the wagon's steam clock, ../world/rules/wagon.ts) reads these, so a tab walking a
// layout, the other tabs and the server all agree.
export const HOME_ROUTE: readonly { x: number; z: number; to: readonly [number, number] }[] = ROUTE.map((r) =>
  Object.freeze({ x: r.x, z: r.z, to: Object.freeze([r.to[0], r.to[1]] as [number, number]) }),
);

// A site's two rings, beside its sign: Track (lays the section) and Helper (builds the station's helper hut).
export const TRACK = 0;
export const HELPER = 1;
export const RING_R = 1.7; // metres
export const ringAt = (s: number, ring: number): { x: number; z: number } => ({
  x: ROUTE[s].x + (ring === TRACK ? -2.4 : 2.4),
  z: ROUTE[s].z,
});
export const costOf = (s: number, ring: number): number =>
  ring === TRACK ? AGES[ROUTE[s].age].cost : AGES[ROUTE[s].age].helper;
