// Where the train garage's fixed pieces stand round a Roundhouse table (docs/plans/garage-install-moment.md, G2), as
// data: one row per table. Pure: no scene, DOM or clock. Local view data only: nothing here is sent, saved or read by
// the simulation. Bearings are degrees clockwise from north (north is -z), distances metres from the table's centre.
import { SHED_TABLE } from '../../sim/railway-works-layout.ts';
import { TABLE, homeLayout } from '../../place/home-station.ts';
import { ORIGIN } from '../../place/layout.ts';

export type XZ = { x: number; z: number };
export type Polar = { bearing: number; r: number };
export type GarageGeo = {
  /** The lever post that opens the garage. */
  post: Polar;
  /** The jib's mast, its height, and the length of its arm (it must reach the engine's seat past the table's centre,
   * over the chimney). */
  jib: Polar;
  mast: number;
  arm: number;
  /** The bearing the arm points along from its mast when parked: off the table, with nothing to install. */
  park: number;
  /** The middle of the stand the waiting part lies on, and how the part lies: along the radius with its nose at the
   * table, or along the rim. */
  stand: Polar;
  standAlong: 'radius' | 'rim';
  /** Where the two crew figures rest. */
  crew: readonly [Polar, Polar];
  /** Where the garage's camera stands. */
  camBearing: number;
};

/** The deck's radius, and the works copy's reach as the table turns it (its corners, 8.5 m of train on the centre). */
export const DECK_R = 4.8;
/** The longer boiler lying on its stand: half its length and its radius (engine.ts: 3.15 m by 1.25 m). */
export const STAND_PART = { half: 1.575, r: 0.625 } as const;
/** A radial stand's two legs: their distances from the table's centre and their half width across the barrel. They
 * stand 6 m or further out and no wider than the barrel, so a car on line 2 clears the empty stand (design ruling on
 * G2, R2). */
export const STAND_LEGS = { at: [6.1, 7.6], half: 0.5 } as const;

export const GARAGE_GEO: { a: GarageGeo; b: GarageGeo } = {
  /** Today's table (`SHED_TABLE`). Thrown away at the Home flip. Nothing fixed stands within the deck's 4.8 m
   * (design review, call 24): the copy's corners sweep 4.4 m of it. The post is where build 2's plain post stood. */
  a: {
    post: { bearing: 92, r: 5.2 },
    jib: { bearing: 118, r: 8.4 },
    mast: 4.4,
    arm: 10.6,
    park: 100,
    stand: { bearing: 118, r: 6.5 },
    standAlong: 'radius',
    crew: [
      { bearing: 121, r: 9.4 },
      { bearing: 114, r: 8.7 },
    ],
    camBearing: 85,
  },
  /** Layout B's table (`?home=b`): today's radial arrangement at bearing 85°, the stand's inner end 4.93 m out, the
   * jib and the crew behind it, nothing within the deck's 4.8 m (docs/plans/home-flip.md, F1). Bearing 85° keeps the
   * barrel off the jump-in landing (108°, 5.5 m), 60° from the nearest stall road and well inside line 2's curve. */
  b: {
    post: { bearing: 60, r: 5.6 },
    jib: { bearing: 85, r: 8.4 },
    mast: 4.4,
    arm: 10.6,
    park: 67,
    stand: { bearing: 85, r: 6.5 },
    standAlong: 'radius',
    crew: [
      { bearing: 88, r: 9.4 },
      { bearing: 81, r: 8.7 },
    ],
    camBearing: 15,
  },
};

/** The garage this page draws: its row, its table's centre (world metres) and the ground beside the table. The one
 * place a view or a look reads which table the garage stands at (`?home=b`: layout B's). */
export function garageRow(): { geo: GarageGeo; table: XZ; y: number } {
  return homeLayout()
    ? { geo: GARAGE_GEO.b, table: { x: TABLE.x + ORIGIN.x, z: TABLE.z }, y: TABLE.y + 0.5 }
    : { geo: GARAGE_GEO.a, table: { x: SHED_TABLE.x / 100, z: SHED_TABLE.z / 100 }, y: SHED_TABLE.y / 100 };
}

const rad = (d: number) => (d * Math.PI) / 180;
export const polarAt = (centre: XZ, p: Polar): XZ => ({
  x: centre.x + Math.sin(rad(p.bearing)) * p.r,
  z: centre.z - Math.cos(rad(p.bearing)) * p.r,
});
/** The stand's two ends along the part (inner first for a radial stand), from the table's centre. */
export function standEnds(centre: XZ, geo: GarageGeo): [XZ, XZ] {
  const mid = polarAt(centre, geo.stand);
  const along = rad(geo.stand.bearing + (geo.standAlong === 'radius' ? 0 : 90));
  const dx = Math.sin(along) * STAND_PART.half,
    dz = -Math.cos(along) * STAND_PART.half;
  return [
    { x: mid.x - dx, z: mid.z - dz },
    { x: mid.x + dx, z: mid.z + dz },
  ];
}
/** A hold at this post reaches the server's install point (`rail.install` is judged within `SHED_TABLE.reach` of
 * `SHED_TABLE`; 0.4 m in hand, as build 2's prompt keeps). True at today's table; true at layout B's the day the flip
 * moves `SHED_TABLE`. */
export const installHere = (post: XZ) =>
  Math.hypot(post.x - SHED_TABLE.x / 100, post.z - SHED_TABLE.z / 100) <= SHED_TABLE.reach / 100 - 0.4;
