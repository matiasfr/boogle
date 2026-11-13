// Car sizes and how trains are made up from them, with no three.js, so the layout tests read the same numbers the views
// pose (test/railway-works-layout.test.ts keeps line 2's stops clear of the parked track layer with them).
import { ENGINE } from './engine.ts';

/** A car's physical size, shared with the platforms: deck half sizes and the deck top's height over the ground. */
export type CarSpec = { hx: number; hz: number; top: number };

export const LOCO: CarSpec = { hx: 0.8, hz: 1.5, top: 1.75 }; // the boiler top: rideable, after a jump
export const TRAILER: CarSpec = { hx: 1.1, hz: 1.6, top: 0.7 }; // a flatbed: a hop up from the ground
/** The footing wagon, line 2's fourth car once the shed's wagon couples (docs/plans/split-rock-roundhouse.md, J5a): a
 * low deck the size of the shunt's wagon, so the one in the stall and the one on the train read as the same thing. */
export const WAGON_CAR: CarSpec = { hx: 1.1, hz: 1.6, top: 0.5 };

/** A railway train's cars, engine first, and each car's centre from the train's along in metres: the engine (A with
 * its walk-in cab, ./engine.ts) 0.6 m ahead of the first flatbed's end (a longer engine reaches further forward), then
 * cars every 3.7 m. Line 1 runs the first three; line 2 adds the footing wagon, which couples at the village (WAGON_S). */
export const TRAIN_CARS: readonly CarSpec[] = [ENGINE, TRAILER, TRAILER, WAGON_CAR];
export const TRAIN_OFFSETS: readonly number[] = [TRAILER.hz + 0.6 + ENGINE.hz, 0, -3.7, -7.4];
/** Steel's own car (docs/plans/fourth-car.md): a flatbed the trailers' size, last on a line 2 train that wears the
 * longer boiler. Not stored: a train has it exactly when its row's `boiler >= 1`. */
export const STEEL_CAR: CarSpec = { ...TRAILER };
/** The steel car's centre from the train's along: one pitch behind the footing wagon on the wagon's train (-11.1 m),
 * else one behind the kit car (-7.4 m). The two tables above stay three cars and the wagon. */
export const steelCarOffset = (wagon: boolean) => (wagon ? TRAIN_OFFSETS[3]! : TRAIN_OFFSETS[2]!) - 3.7;
/** The farthest tail of any train, the steel car's on the wagon's train (12.7 m behind the pose): the rules' extent
 * behind (TRAIN_EXTENT.behindCm in src/sim/railway-lines.ts; test/railway-lines.test.ts keeps them in step). */
export const TRAIN_TAIL_M = STEEL_CAR.hz - steelCarOffset(true);
