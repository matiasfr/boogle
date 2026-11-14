// What asks for the footing wagon's rails, and then for the table's turn (docs/plans/footings-signalling.md, A1 and
// A2). Owner, 14 November: "There is never any prompt to bring 8 rails to the cradle stall". From the stall's second
// footing until the wagon rolls out: a bill at the stall door, gold ghosts of the cradle's missing rails, of the
// table's handle once fitted and of the wagon where it will wait on line 2, and prompts that show greyed with a
// reason instead of not at all. This file is the pure part (state, words, shapes); works-view.ts draws it with the
// kiln's own bill board and ghost batch, which stand idle once the kiln is lit. All strings are draft UI copy.
import { WORKS } from '../../sim/railway-works-layout.ts';
import { STALL_YAW, stallPoint } from './works-shape.ts';

/** Seconds a live stall takes to stand and shed its tarp (roundhouse-view.ts BUILD_S + TARP_S): the cues wait it out. */
export const CRADLE_CUE_DELAY_S = 4.1;
export const CRADLE_COPY = {
  bill: 'Footing wagon',
  turn: 'Turn the table',
  fit: 'Fit the cradle',
  bringRails: 'Bring rails from the forge',
  setFooting: 'Set the footing',
  wagonCarries: 'The wagon carries the rest',
} as const;

export type CradleStage = 'none' | 'rails' | 'turn';
/** `rails`: the stall stands and the cradle wants rails; `turn`: fitted, the table not yet turned; else none. */
export function cradleStage(shed: { stall: number; cradleRails: number; fitted: number; ready: number }): CradleStage {
  if (shed.stall < WORKS.stall || shed.ready >= 0) return 'none';
  return shed.fitted >= 0 || shed.cradleRails >= WORKS.cradleRails ? 'turn' : 'rails';
}
/** The bill's small line, in the stations' own form. */
export const cradleBillLine = (stage: CradleStage, rails: number) =>
  stage === 'turn' ? CRADLE_COPY.turn : `rails ${Math.min(rails, WORKS.cradleRails)}/${WORKS.cradleRails}`;

/** Where the wagon parks in the stall (roundhouse-view.ts PARK.wagon), and its rail height. */
const PARKED_Z = -0.9,
  RAIL_Y = 18.35;
/** The parked wagon's prompt point, as roundhouse-view.ts puts "Fit the cradle". */
export const cradleAt = () => stallPoint(0, PARKED_Z);
export type GhostBox = { x: number; y: number; z: number; w: number; h: number; d: number; yaw: number };
/** The cradle's arms still missing with `rails` in: roundhouse-view.ts drawWagon's eight, in its order. */
export function cradleRailGhosts(rails: number): GhostBox[] {
  const out: GhostBox[] = [];
  for (let r = Math.max(0, rails); r < WORKS.cradleRails; r++) {
    const p = stallPoint(r % 2 ? 0.95 : -0.95, PARKED_Z + [-1.35, -0.25, 0.25, 1.35][Math.floor(r / 2)]!);
    out.push({ x: p.x, y: RAIL_Y + 1.05, z: p.z, w: 0.16, h: 1.16, d: 0.16, yaw: STALL_YAW });
  }
  return out;
}
/** A wagon's outline standing on the rail at (x, railY, z), heading `yaw`: its deck and the cradle's volume. */
export const wagonGhost = (x: number, railY: number, z: number, yaw: number): GhostBox[] => [
  { x, y: railY + 0.3, z, w: 2.2, h: 0.35, d: 3.2, yaw },
  { x, y: railY + 1.1, z, w: 2, h: 1.1, d: 2.9, yaw },
];
