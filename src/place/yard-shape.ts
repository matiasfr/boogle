// The Round's loader yard, in its plot's frame (+z faces the ring road): an open shed, a jib and a stack of footings.
// One table for the construction recipe, the solid record and the ghost, so what looks solid is solid. No imports.
export type YardBox = { dx: number; dy: number; dz: number; hx: number; hy: number; hz: number };

/** Same 7.4 m square plot and 9 m plinth as a house; a low slab you walk onto. */
export const YARD = {
  w: 7.4,
  d: 7.4,
  floor: 0.14,
  slab: 4.5,
  /** Across the back of the plot, open to the road; only its back wall is boarded. */
  shed: { x0: -3.5, x1: 3.3, z0: -3.5, z1: -0.4, high: 3.3, post: 0.36, beam: 0.3, board: 0.16, eave: 0.4 },
  /** The timber stack along the shed's back wall. */
  stack: { dx: -1.4, dz: -2.85, w: 3, h: 0.66, d: 0.9 },
  /** Bottom-centre of each footing: three on the slab, one on the seam of the front two, under the hook. */
  footing: { w: 0.8, body: 0.68, shoulder: 0.12 },
  footings: [
    [-1.65, 0, 1.6],
    [-0.75, 0, 1.6],
    [-1.2, 0, 0.65],
    [-1.2, 1, 1.6],
  ] as const,
  /** The jib: a mast at the front corner by the road, its boom along the front over the footings, so a player on
   * the ring road sees it side on; the counterweight past the mast. */
  jib: { x: 2.9, z: 2.6, top: 5.6, boomX0: -2.2, boomX1: 3.6, hookX: -1.2, hookY: 2.35 },
} as const;

const { shed, footing, jib, floor } = YARD;
export const shedPosts = (): [number, number][] =>
  [shed.x0, (shed.x0 + shed.x1) / 2, shed.x1].flatMap((x) => [shed.z0, shed.z1].map((z): [number, number] => [x, z]));
export const shedCentre = { x: (shed.x0 + shed.x1) / 2, z: (shed.z0 + shed.z1) / 2 };
/** The footing's layer height: its body plus the shoulders the next one sits on. */
export const FOOTING_H = footing.body + footing.shoulder;

/** The jib's solid parts: base, mast, boom, counterweight, pinnacle (the rope, hook and ties stay open, like the
 * Works arm's). */
export const JIB_SOLIDS: YardBox[] = [
  { dx: jib.x, dy: floor + 0.25, dz: jib.z, hx: 0.55, hy: 0.25, hz: 0.55 },
  { dx: jib.x, dy: (floor + 0.5 + jib.top) / 2, dz: jib.z, hx: 0.21, hy: (jib.top - floor - 0.5) / 2, hz: 0.21 },
  {
    dx: (jib.boomX0 + jib.boomX1) / 2,
    dy: jib.top + 0.21,
    dz: jib.z,
    hx: (jib.boomX1 - jib.boomX0) / 2,
    hy: 0.21,
    hz: 0.21,
  },
  { dx: jib.boomX1 - 0.24, dy: jib.top - 0.35, dz: jib.z, hx: 0.23, hy: 0.35, hz: 0.45 },
  { dx: jib.x, dy: jib.top + 0.9, dz: jib.z, hx: 0.1, hy: 0.48, hz: 0.1 },
];

/** Every solid box, centre and half extents above the plot's ground. The first is the slab. */
export function yardHulls(): YardBox[] {
  const postH = shed.high - floor,
    roofH = shed.beam + shed.board;
  const width = shed.x1 - shed.x0,
    depth = shed.z1 - shed.z0;
  return [
    { dx: 0, dy: floor / 2, dz: 0, hx: YARD.slab, hy: floor / 2, hz: YARD.slab },
    ...shedPosts().map(([x, z]) => ({
      dx: x,
      dy: floor + postH / 2,
      dz: z,
      hx: shed.post / 2,
      hy: postH / 2,
      hz: shed.post / 2,
    })),
    { dx: shedCentre.x, dy: floor + postH / 2, dz: shed.z0, hx: width / 2 + 0.18, hy: postH / 2, hz: 0.09 },
    {
      dx: shedCentre.x,
      dy: shed.high + roofH / 2,
      dz: shedCentre.z,
      hx: width / 2 + shed.eave,
      hy: roofH / 2,
      hz: depth / 2 + shed.eave,
    },
    {
      dx: YARD.stack.dx,
      dy: floor + YARD.stack.h / 2,
      dz: YARD.stack.dz,
      hx: YARD.stack.w / 2,
      hy: YARD.stack.h / 2,
      hz: YARD.stack.d / 2,
    },
    ...YARD.footings.map(([x, layer, z]) => ({
      dx: x,
      dy: floor + (layer + 0.5) * FOOTING_H,
      dz: z,
      hx: footing.w / 2 + 0.01,
      hy: FOOTING_H / 2,
      hz: footing.w / 2 + 0.01,
    })),
    ...JIB_SOLIDS,
  ];
}

/** The Works arm's paint, bare until the yard is built and yellow after; the town jib wears the same at the same tick. */
export const LOADER_PAINT = { bare: '#737878', built: '#d8a34a' } as const;
