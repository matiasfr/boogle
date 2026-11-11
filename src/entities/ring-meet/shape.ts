// The Meet and the first crossing, pure numbers and decisions (docs/plans/ring-island-build1.md, R4d; calls 11 and 35):
// when the rivet's shot is offered, what the framings are, which crossing gets which shot, and what a page that joins
// after the join (or reloads) is owed. No three.js, no DOM: ring-meet/view.ts plays what this decides.
import { RING_END, RING_FORMATION, RING_ORIGIN, RING_RIVET, ringAt, ringDeckY } from '../../sim/railway-ring-layout.ts';

export type V3 = { x: number; y: number; z: number };

/** The rivet's u (cm along line 2 from the pier head): `RING_RIVET` is `ringAt(25950, mid)`; test/railway-r4d-meet.test.ts
 * pins this to it. The joint the first crossing is judged against. */
export const JOINT_U = 25950;
const UNIT = Math.hypot(1, 0.0272);

/** (u, lat) in cm of a world point in metres, the inverse of `ringAt` (to the centimetre). Local views only. */
export function ringUV(x: number, z: number) {
  const dx = x * 100 - RING_ORIGIN.x,
    dz = z * 100 - RING_ORIGIN.z;
  return { u: (0.0272 * dx - dz) / UNIT, lat: (dx + 0.0272 * dz) / UNIT };
}

/** A point in world metres at (u, lat) cm, `up` metres over the deck there. */
function over(u: number, lat: number, up: number): V3 {
  const p = ringAt(u, lat);
  return { x: p.x / 100, y: ringDeckY(u) / 100 + up, z: p.z / 100 };
}

/** One camera shot for `createCameraPullOut.play`: from, drifting to, looking at (world metres), seconds. `lead` is
 * held at `from` looking at `atFrom` before the travel (`drift` seconds, eased in and out, the look easing to `at`);
 * `back` is the hand-back blend home. */
export type MeetShot = {
  from: V3;
  to: V3;
  at: V3;
  seconds: number;
  drift: number;
  lead: number;
  atFrom: V3 | null;
  back: number;
};
/** The hand-back is a deliberate cut: a blend home from the halt is 140 m and reads as a near-cut anyway (270 m/s), so
 * the shot ends on its held frame and cuts back to the player (the same 0.14 s as a skip). */
const CUT_S = 0.14;
/** The stud, as the shot's opening look (a little over the deck). */
const STUD_AT: V3 = { x: RING_RIVET.x / 100, y: ringDeckY(25950) / 100 + 0.4, z: RING_RIVET.z / 100 };
/** The board and buffers the Meet looks down the line at (RINGWORKS, under the shard). */
const BOARD_AT: V3 = { x: RING_END.board.x / 100, y: RING_END.board.y / 100 + 4, z: RING_END.board.z / 100 };

/** The Meet, 6 s: 1 s held 9 m back and above the rivet (the stud in frame, the clang and gold burst), 4 s easing in
 * and out 63 m along the joined line over the leaf (peak 23.6 m/s; it was 30 m/s steady), the look easing from the
 * stud to the board and buffers, then 1 s held on them; cut back. Call 11. */
export const MEET_SHOT: MeetShot = {
  seconds: 6,
  lead: 1,
  drift: 4,
  back: CUT_S,
  from: over(24700, -1100, 4.5),
  to: over(31000, -1300, 9),
  atFrom: STUD_AT,
  at: BOARD_AT,
};
/** A late player's first crossing shows the Meet's framing in 5 s: 0.8 s on the joint, 3.2 s over 50 m (peak 23.4
 * m/s; it was 37 m/s), 1 s held on the board; cut back. */
export const MEET_REPLAY: MeetShot = {
  ...MEET_SHOT,
  seconds: 5,
  lead: 0.8,
  drift: 3.2,
  to: over(29700, -1300, 9),
};
/** The first-crossing pull-out: from beside the track at the leaf's mainland end, out and up over the bents, looking at
 * the joint as the train goes over it. 5 s, an even drift; cut back like the Meet. */
export const CROSSING_SHOT: MeetShot = {
  seconds: 5,
  lead: 0,
  drift: 5,
  back: CUT_S,
  from: over(25000, -900, 4),
  to: over(23300, -2800, 15),
  atFrom: null,
  at: over(JOINT_U, RING_FORMATION.mid, 1),
};
/** Peak camera speed (m/s) of a shot: eased travel (smoothstep) peaks at 1.5 times the mean; an even drift is the mean. */
export function peakSpeed(s: MeetShot): number {
  const d = Math.hypot(s.to.x - s.from.x, s.to.y - s.from.y, s.to.z - s.from.z);
  return (s.drift === s.seconds ? 1 : 1.5) * (d / s.drift);
}

/** The Meet is offered by an accepted rivet: `rail.strike` id 2 that moved something. Nothing else (a restore, a
 * rejoin and a late join replay no events) offers it. */
export function meetOffered(e: { op: string; id?: number; accepted: number }): boolean {
  return e.op === 'rail.strike' && e.id === 2 && e.accepted > 0;
}

/** After the server refuses a predicted strike: the shot stays when the rivet is struck anyway (another player's strike
 * won the same moment; their accepted edge is the Meet's), and is taken back when it is not. */
export function meetKept(joinedNow: boolean): boolean {
  return joinedNow;
}

/** Whether a rider crossed the joint toward the island between two frames. `prev` is null the frame they first ride. */
export function crossedJoint(prev: number | null, u: number): boolean {
  return prev !== null && prev < JOINT_U && u >= JOINT_U;
}

export type Crossing = {
  /** The rivet is struck (the Aperture row's joined >= 0). */
  joined: boolean;
  /** The local player rides a train, standing (the carry's platform). */
  riding: boolean;
  /** They crossed the joint toward the island this frame. */
  crossed: boolean;
  /** This player has been shown the first-crossing pull-out in this room. */
  pulledOut: boolean;
  /** This player has been shown the Meet in this room. */
  sawMeet: boolean;
};
/** Which shot a crossing earns, if any: the pull-out for a player who saw the Meet; the Meet's framing for one who
 * missed it (joined late, was seated, reduced motion); never twice (call 11). */
export function crossingShot(c: Crossing): 'pull-out' | 'meet' | null {
  if (!c.joined || !c.riding || !c.crossed || c.pulledOut) return null;
  return c.sawMeet ? 'pull-out' : 'meet';
}

/** `Works.breaker` as the sim's strike needs it: 2, which is the room's, not a carry rule. It is 2 once the breaker has
 * been taken from its pedestal by anyone (and stays 2 in every ring seed), so "the room has the breaker", not "you hold
 * it"; the breaker's mesh is hidden once both slabs are struck. Whether it should be visibly carried to the rivet is an
 * open design question (plan, leftovers). */
const BREAKER_HELD = 2;
/** The strike prompt's window: the leaf has visibly landed on the bents (`landed`: leaf-shape.ts `leafLanded`; the sim's
 * `brace === 0` flips 2 s or more before the plate lands, and the server takes a strike then, but the view does not
 * offer it), the rivet is not struck, the room has the breaker (`Works.breaker === 2`) and you carry no boiler. The
 * reach test is the view's. */
export function strikeOffered(o: {
  breaker: number;
  brace: number;
  joined: number;
  hauling: boolean;
  landed: boolean;
}): boolean {
  return o.breaker === BREAKER_HELD && o.brace === 0 && o.joined < 0 && !o.hauling && o.landed;
}
/** The rivet's glint (the beacon, the motes, the stud turning gold) shows from the moment the leaf has landed until the
 * rivet is struck. */
export function glintShown(brace: number, joined: number, landed: boolean): boolean {
  return brace === 0 && joined < 0 && landed;
}

/** The rivet stud's place: the joint, at the rivet's prompt site. */
export const RIVET_AT: V3 = { x: RING_RIVET.x / 100, y: ringDeckY(JOINT_U) / 100, z: RING_RIVET.z / 100 };
