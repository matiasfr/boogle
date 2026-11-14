// Home's town as data, the Round (docs/plans/town-layout.md, step 1): a green on the hall's centreline, a ring road
// round it, twelve buildings on the ring or on the roads that leave it, the streets and the props that belong to the
// layout. Local, no three.js, and nothing imports it yet: the plan's steps 2 to 5 read it. Place-local metres, north is
// -z, bearings in degrees clockwise from north (a bearing from the centre), `yaw` as three.js turns a building's door
// (local +z). The ring is regular on purpose (owner, 10 November: "I don't need the houses to be clumsily laid"): one
// setback, 30 degrees apart on the station's own 30 degree grid (the Roundhouse's stalls use it too), every door
// facing the green squarely.
import { FINDERS_B, HALL, SHELF_B, SHELF_SIZE, axisPoint, type XZ } from './home-station.ts';

const rad = (deg: number) => (deg * Math.PI) / 180;

/** The green's centre G, on the hall's centreline 26.44 m out from it: (-115.0, 20.07) while the hall stands where
 * layout B puts it. Derived, never a literal, so a change at the Home flip moves the centre with the hall. */
export const TOWN_CENTRE: XZ = axisPoint(HALL.a - 26.44, HALL.c);
/** The ring road's inner and outer radius; the green is the inside. */
export const TOWN_RING = { inner: 14, outer: 20 } as const;
/** The green, a clean round. */
export const TOWN_GREEN = { radius: TOWN_RING.inner } as const;
/** The radius of every ring building's front wall: its door is 2 m from the ring road's outer edge. */
export const TOWN_FRONT = 22;

export type TownKit = 'house' | 'cottage' | 'museum' | 'shop';
export type TownWhen = 'arrival' | 'T3' | 'bought';
export type TownId = 'house' | 'gate' | 'museum' | 'shop' | `plot${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;
type Base = { id: TownId; kit: TownKit; w: number; d: number; when: TownWhen };
export type TownSlot = Base &
  (
    | { ring: { bearing: number; front: number }; at?: undefined }
    | { at: { x: number; z: number; yaw: number }; ring?: undefined }
  );

const ring = (bearing: number, front = TOWN_FRONT) => ({ bearing, front });
const HOUSE = { kit: 'house', w: 7.4, d: 7.4 } as const;
const COTTAGE = { kit: 'cottage', w: 5.4, d: 4.4 } as const;

/** The twelve buildings. Ring slots are on the 30 degree grid from the station's bearing (70, the hall's): 10 Pip's
 * house, 40 the camp road's mouth, 70 the hall, 100 free, 130 the quarry road's mouth, 160 plot 2, 190 the shop, 220
 * plot 1, 250 the dock street, 280 the gate cottage, 310 plot 4, 340 the museum. The rest stand square to their road. */
export const TOWN_SLOTS: readonly TownSlot[] = [
  { id: 'house', ...HOUSE, when: 'arrival', ring: ring(10) },
  { id: 'gate', ...COTTAGE, when: 'arrival', ring: ring(280) },
  { id: 'museum', kit: 'museum', w: 13, d: 12, when: 'T3', ring: ring(340, 24) },
  { id: 'shop', kit: 'shop', w: 10, d: 8, when: 'T3', ring: ring(190) },
  { id: 'plot1', ...HOUSE, when: 'bought', ring: ring(220) },
  { id: 'plot2', ...HOUSE, when: 'bought', ring: ring(160) },
  { id: 'plot3', ...HOUSE, when: 'bought', at: { x: -90.5, z: 33.0, yaw: -Math.PI / 2 } },
  { id: 'plot4', ...COTTAGE, when: 'bought', ring: ring(310) },
  { id: 'plot5', ...COTTAGE, when: 'bought', at: { x: -91.5, z: 42.2, yaw: -Math.PI / 2 } },
  { id: 'plot6', ...HOUSE, when: 'bought', at: { x: -90.5, z: 51.5, yaw: -Math.PI / 2 } },
  { id: 'plot7', ...COTTAGE, when: 'bought', at: { x: -99.1, z: -22.8, yaw: rad(-38.7) } },
  { id: 'plot8', ...HOUSE, when: 'bought', at: { x: -108.3, z: 56.0, yaw: Math.PI / 2 } },
];

export type TownBuilding = { x: number; z: number; yaw: number; w: number; d: number };

/** Place-local point `radius` out from the green's centre at `bearing`. */
export function slotPoint(bearing: number, radius: number): XZ {
  return { x: TOWN_CENTRE.x + radius * Math.sin(rad(bearing)), z: TOWN_CENTRE.z - radius * Math.cos(rad(bearing)) };
}
const wrap = (a: number) => (a > Math.PI ? a - 2 * Math.PI : a <= -Math.PI ? a + 2 * Math.PI : a);

/** A building's centre, yaw and size. A ring building's centre is `front + d / 2` out from G; its face points back at G
 * (bearing + 180), so yaw = 180 - face = -bearing, wrapped to (-pi, pi]. */
export function townBuilding(id: TownId): TownBuilding {
  const s = TOWN_SLOTS.find((row) => row.id === id);
  if (!s) throw new Error(`no town slot ${id}`);
  if (s.at) return { ...s.at, w: s.w, d: s.d };
  const p = slotPoint(s.ring.bearing, s.ring.front + s.d / 2);
  return { ...p, yaw: wrap(rad(-s.ring.bearing)), w: s.w, d: s.d };
}

/** Where a point in a building's own frame lands: local x across its front, local z out of its door (three.js yaw). */
export function townLocal(b: TownBuilding, x: number, z: number): XZ {
  const c = Math.cos(b.yaw),
    s = Math.sin(b.yaw);
  return { x: b.x + x * c + z * s, z: b.z - x * s + z * c };
}

/** The eight bought plots, in the order they are bought. The two lowest-numbered unbought plots are staked; the
 * passenger trade sets how far up the list the route allows. */
export const TOWN_PLOTS = {
  order: ['plot1', 'plot2', 'plot3', 'plot4', 'plot5', 'plot6', 'plot7', 'plot8'] as const,
  stakedAtOnce: 2,
};

/** The streets. The ring is `TOWN_RING`; each way out is a bearing from G, the radii it covers and its width. */
export const TOWN_STREETS = {
  ring: TOWN_RING,
  dock: { bearing: 250, from: 20, to: 38, width: 8 },
  /** The camp and quarry roads leave the ring road's centre line at these bearings. */
  camp: { bearing: 40, radius: 17 },
  quarry: { bearing: 130, radius: 17 },
} as const;

const SHOP = townBuilding('shop');
const GATE = townBuilding('gate');
const GATE_BACK = slotPoint(280, TOWN_FRONT + GATE.d + 4.5);
/** What stands in the town that is not a building: the clock on its 5 by 5 m footing at G; the finders' bay beside
 * the hall's south end and the curio shelf beside the bay; the balcony pad in the shop's frame; the `yard` find behind the gate cottage; the forge's west
 * door. */
/** A curio frame's place and its drawn footprint (`foot`): the crown's plan from `SHELF_SIZE`, which reaches further in
 * front of the frame's centre than behind, so the footprint's centre is forward of the frame's. */
function curioFrame(at: { x: number; z: number; yaw: number }) {
  const { crown, front, back } = SHELF_SIZE;
  const here = { x: at.x, z: at.z, yaw: at.yaw };
  const foot: TownBuilding = {
    ...townLocal({ ...here, w: 0, d: 0 }, 0, (front - back) / 2),
    yaw: at.yaw,
    w: 2 * crown,
    d: front + back,
  };
  return { ...here, foot };
}
export const TOWN_PROPS = {
  clock: { ...TOWN_CENTRE, footing: 5 },
  bay: curioFrame(FINDERS_B),
  /** The curio shelf, beside the bay on its far side from the hall (owner, 14 November). */
  shelf: curioFrame(SHELF_B),
  balcony: townLocal(SHOP, -1.67, -7.63),
  yard: GATE_BACK,
  forgeDoor: { x: -92, z: -3, w: 2.8 },
} as const;
