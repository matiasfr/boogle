// Car sizes and how trains are made up from them, with no three.js, so the layout tests read the same numbers the views
// pose (test/railway-works-layout.test.ts keeps line 2's stops clear of the parked track layer with them).
import { ENGINE } from './engine.ts';
import { lineRoute } from '../../sim/railway-trade-layout.ts';
import { LINE2 } from '../../sim/railway-lines.ts';
import { boilerCars } from '../../sim/railway-train.ts';

/** A car's physical size, shared with the platforms: deck half sizes and the deck top's height over the ground. */
export type CarSpec = { hx: number; hz: number; top: number };

export const LOCO: CarSpec = { hx: 0.8, hz: 1.5, top: 1.75 }; // the boiler top: rideable, after a jump
export const TRAILER: CarSpec = { hx: 1.1, hz: 1.6, top: 0.7 }; // a flatbed: a hop up from the ground
/** The footing wagon, line 2's fourth car once the shed's wagon couples (docs/plans/split-rock-roundhouse.md, J5a): a
 * low deck the size of the shunt's wagon, so the one in the stall and the one on the train read as the same thing. */
export const WAGON_CAR: CarSpec = { hx: 1.1, hz: 1.6, top: 0.5 };
export const RIDER_CAR: CarSpec = { hx: 0.8, hz: 1.45, top: 2.05 };

/** A railway train's cars, engine first, and each car's centre from the train's along in metres: the engine (A with
 * its walk-in cab, ./engine.ts) 0.6 m ahead of the first flatbed's end (a longer engine reaches further forward), then
 * cars every 3.7 m. Line 1 runs the first three; line 2 adds the footing wagon, which couples at the village (WAGON_S). */
export type CarRole = 'engine' | 'player' | 'rider' | 'kit' | 'wagon' | 'steel' | 'cargo';
export type Consist = readonly { role: CarRole; spec: CarSpec; offset: number }[];
export const STEEL_CAR: CarSpec = { ...TRAILER };
/** Garage step 4's kit flatbed: the Strong boiler's extra car, a flatbed behind the kit car (role `cargo`). */
export const KIT_FLATBED: CarSpec = { ...TRAILER };
/** What a boiler row looks like on `line`'s engines, wherever one is drawn (a train, the table's copy, a bay's): line
 * 2's longer and Big boilers and a trade line's Quick (row 4) wear the longer barrel and chimney; line 2's longer
 * boiler brings the steel car, a trade line's Strong (the sim's extra car, `boilerCars`) its kit flatbed. */
export const wearsLong = (line: number, row: number) => (line === LINE2 ? row >= 2 : row === 4);
export const wearsTail = (line: number, row: number) => (line === LINE2 ? row >= 2 : boilerCars(row) > 0);
/** The kit flatbed's timber and stakes (the train's and the bay copy's). */
export const KIT_FLATBED_LOOK = { deck: '#8a6d4a', stake: '#4a3a2a' } as const;
/** Local layout only; passenger routes include the coach outside the boiler's cargo allowance. */
function makeConsist(rider: boolean, wagon: boolean, steel: boolean, strong: boolean): Consist {
  const cars: { role: CarRole; spec: CarSpec; offset: number }[] = [
    { role: 'engine', spec: ENGINE, offset: TRAILER.hz + 0.6 + ENGINE.hz },
    { role: 'player', spec: TRAILER, offset: 0 },
  ];
  for (const [role, spec] of [
    ...(rider ? [['rider', RIDER_CAR] as const] : []),
    ['kit', TRAILER],
    ...(strong ? [['cargo', KIT_FLATBED] as const] : []),
    ...(wagon ? [['wagon', WAGON_CAR] as const] : []),
    ...(steel ? [['steel', STEEL_CAR] as const] : []),
  ] as const) {
    // Group the pitch before subtracting: today's 3.7 m subtraction stays byte-exact.
    const previous = cars.at(-1)!;
    cars.push({ role, spec, offset: previous.offset - (previous.spec.hz + 0.5 + spec.hz) });
  }
  return Object.freeze(cars.map((car) => Object.freeze(car)));
}
// Build all layouts once, never in a frame path. A works copy explicitly requests no passenger route.
const layouts = [false, true].map((rider) =>
  [false, true].map((wagon) =>
    [false, true].map((steel) => [false, true].map((strong) => makeConsist(rider, wagon, steel, strong))),
  ),
);
/** `strong`: a trade line's train wears the Strong boiler (garage step 4), so its kit flatbed rides behind the kit car. */
export const consistOf = ({
  line,
  wagon,
  steel,
  strong = false,
}: {
  line: number;
  wagon: boolean;
  steel: boolean;
  strong?: boolean;
}): Consist => layouts[Number(lineRoute(line) >= 0)]![Number(wagon)]![Number(steel)]![Number(strong)]!;
const bounds = new Map(
  layouts.flat(3).map(
    (consist) =>
      [
        consist,
        Object.freeze({
          lo: Math.min(...consist.map((car) => car.offset - car.spec.hz)),
          hi: Math.max(...consist.map((car) => car.offset + car.spec.hz)),
        }),
      ] as const,
  ),
);
/** The complete consist's extents relative to the players' car, precomputed with its descriptors. */
export function consistBounds(consist: Consist) {
  const value = bounds.get(consist);
  if (!value) throw new Error('Bounds require a cached consist');
  return value;
}
export const roleIndex = (consist: Consist, role: CarRole) => {
  const index = consist.findIndex((car) => car.role === role);
  if (index < 0) throw new Error(`No ${role} in consist`);
  return index;
};
export const offsetOf = (consist: Consist, role: CarRole) => consist[roleIndex(consist, role)]!.offset;
const legacy = consistOf({ line: 1, wagon: true, steel: false });
export const TRAIN_CARS: readonly CarSpec[] = legacy.map((car) => car.spec);
export const TRAIN_OFFSETS: readonly number[] = legacy.map((car) => car.offset);
export const steelCarOffset = (wagon: boolean) => offsetOf(consistOf({ line: 1, wagon, steel: true }), 'steel');
export const TRAIN_TAIL_M = STEEL_CAR.hz - steelCarOffset(true);

/** The name the place kit gives a flatbed's underframe and rail rack (src/place/look-kit.ts kitCars), so the passenger
 * car can leave it undrawn (train-view.ts) whatever order the flatbed's pieces are added in. */
export const FLAT_RACK = 'flat_rack';
/** Whether the platform a player is aboard (src/physics/platforms.ts `aboard()`: the deck under their feet, or the
 * one whose chair they sit in) is one of these cars'. */
export const ridesOn = (platform: unknown, cars: readonly { platform: unknown }[]) =>
  platform != null && cars.some((c) => c.platform === platform);
