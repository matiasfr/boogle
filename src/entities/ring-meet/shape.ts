// The Meet and the first crossing, pure numbers and decisions (docs/plans/ring-island-build1.md, R4d; calls 11 and 35):
// when the rivet's shot is offered, what the framings are, which crossing gets which shot, and what a page that joins
// after the join (or reloads) is owed. No three.js, no DOM: ring-meet/view.ts plays what this decides.
import {
  RING_END,
  RING_FORMATION,
  RING_ORIGIN,
  RING_RIVET,
  RING_HALT,
  ringAt,
  ringDeckY,
} from '../../sim/railway-ring-layout.ts';

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

/** One camera shot for `createCameraPullOut.play`: from, drifting to, looking at (world metres), seconds. */
export type MeetShot = { from: V3; to: V3; at: V3; seconds: number };

/** The Meet: from back along the bents above the leaf (the rivet's glint just ahead), running along the joined line
 * past the joint to the halt, looking at the RINGWORKS board and the buffers under the shard. 6 s, linear (the shot's
 * drift is its length). Call 11. */
export const MEET_SHOT: MeetShot = {
  seconds: 6,
  from: over(22500, -1400, 11),
  to: over(RING_HALT.u0 - 1800, -1400, 8),
  at: { x: RING_END.board.x / 100, y: RING_END.board.y / 100 + 4, z: RING_END.board.z / 100 },
};
/** A late player's first crossing shows the Meet's framing, 5 s (the crossing's length), not the 6 s. */
export const MEET_REPLAY: MeetShot = { ...MEET_SHOT, seconds: 5 };
/** The first-crossing pull-out: from beside the track at the leaf's mainland end, out and up over the bents, looking at
 * the joint as the train goes over it. 5 s. */
export const CROSSING_SHOT: MeetShot = {
  seconds: 5,
  from: over(25000, -900, 4),
  to: over(23300, -2800, 15),
  at: over(JOINT_U, RING_FORMATION.mid, 1),
};

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

/** `Works.breaker` when a player has the breaker in hand (1 on its pedestal): breaker-view.ts and the sim's strike read the same 2. */
const BREAKER_HELD = 2;
/** The strike prompt's window: the leaf down on the bents (`brace === 0`, so the rivet is the last step), not yet
 * struck, the breaker in your hands (the rule's `Works.breaker === 2`) and not the boiler. The reach test is the view's. */
export function strikeOffered(o: { breaker: number; brace: number; joined: number; hauling: boolean }): boolean {
  return o.breaker === BREAKER_HELD && o.brace === 0 && o.joined < 0 && !o.hauling;
}
/** The rivet's glint (the gold motes at the stud) shows from the moment the leaf is down until it is struck. */
export function glintShown(brace: number, joined: number): boolean {
  return brace === 0 && joined < 0;
}

/** The rivet stud's place: the joint, at the rivet's prompt site. */
export const RIVET_AT: V3 = { x: RING_RIVET.x / 100, y: ringDeckY(JOINT_U) / 100, z: RING_RIVET.z / 100 };
