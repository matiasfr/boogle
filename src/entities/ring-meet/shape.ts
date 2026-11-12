// The Meet and the first crossing, pure numbers and decisions (docs/plans/ring-island-build1.md, R4d; calls 11 and 35):
// when the rivet's shot is offered, what the framings are, which crossing gets which shot, and what a page that joins
// after the join (or reloads) is owed. No three.js, no DOM: ring-meet/view.ts plays what this decides.
import { RING_END, RING_FORMATION, RING_RIVET, ringAt, ringDeckY } from '../../sim/railway-ring-layout.ts';
import { ringUL } from '../ring-island/ground.ts';

export type V3 = { x: number; y: number; z: number };

/** The rivet's u (cm along line 2 from the pier head): `RING_RIVET` is `ringAt(25950, mid)`; test/railway-r4d-meet.test.ts
 * pins this to it. The joint the first crossing is judged against. */
export const JOINT_U = 25950;

/** (u, lat) in cm of a world point in metres: the island ground's `ringUL`, in the layout's centimetres. */
export function ringUV(x: number, z: number) {
  const r = ringUL(x, z);
  return { u: r.u * 100, lat: r.lat * 100 };
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
  /** Opens on `from` at once (a cut), not a blend in from the follow camera through whatever lies between. */
  cutIn: boolean;
  /** A second deliberate cut when the travel ends: the held end frame (camera position and look), or null. */
  end: { pos: V3; at: V3 } | null;
};
/** The hand-back is a deliberate cut: a blend home from the halt is 140 m and reads as a near-cut anyway (270 m/s), so
 * the shot ends on its held frame and cuts back to the player (the same 0.14 s as a skip). */
const CUT_S = 0.14;
/** The stud, as the shot's opening look (a little over the deck). */
const STUD_AT: V3 = { x: RING_RIVET.x / 100, y: ringDeckY(25950) / 100 + 0.4, z: RING_RIVET.z / 100 };
/** The far look of the travel: down the joined line toward the halt's end board and buffers. */
const BOARD_AT: V3 = { x: RING_END.board.x / 100, y: RING_END.board.y / 100 + 4, z: RING_END.board.z / 100 };
/** The end frame: 14 m short of the RINGWORKS board on the east platform (u 448 m, lat +5, 4 m over the platform; src/
 * entities/ring-island/view.ts), 5.2 m wide so about 170 px at 960; the end board and buffers run on down the line to
 * the left of it (the camera looks 12 degrees off the line toward the board). */
const END: { pos: V3; at: V3 } = {
  pos: over(43400, -150, 5),
  at: over(46300, 470, 4.6),
};

/** The Meet, 6 s: a cut to 1 s held 17 m back and above the rivet looking at the stud (the clang and the gold burst in
 * frame), 3.7 s easing in and out 57 m along the joined line over the leaf (peak 23.2 m/s; it was 30), the look easing
 * from the stud toward the halt, a cut to 1.3 s held on the RINGWORKS board with the buffers beyond, then a cut back.
 * Call 11. */
export const MEET_SHOT: MeetShot = {
  seconds: 6,
  lead: 1,
  drift: 3.7,
  back: CUT_S,
  cutIn: true,
  from: over(24700, -1100, 4.5),
  to: over(30400, -1300, 9),
  atFrom: STUD_AT,
  at: BOARD_AT,
  end: END,
};
/** A late player's first crossing shows the Meet's framing in 5 s: a cut to 0.8 s on the joint, 3 s over 46 m (peak
 * 23.2 m/s; it was 37), a cut to 1.2 s on the board; cut back. */
export const MEET_REPLAY: MeetShot = {
  ...MEET_SHOT,
  seconds: 5,
  lead: 0.8,
  drift: 3,
  to: over(29300, -1300, 9),
};
/** The first-crossing pull-out: from beside the track at the leaf's mainland end, out and up over the bents, looking at
 * the joint as the train goes over it. 5 s, an even drift, blended in from the rider's own camera; cut back like the
 * Meet. */
export const CROSSING_SHOT: MeetShot = {
  seconds: 5,
  lead: 0,
  drift: 5,
  back: CUT_S,
  cutIn: false,
  from: over(25000, -900, 4),
  to: over(23300, -2800, 15),
  atFrom: null,
  at: over(JOINT_U, RING_FORMATION.mid, 1),
  end: null,
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
 * it"; the Works' mesh is hidden once both slabs are struck. At the rivet every page draws it in the hands of whoever
 * stands in the rivet's reach, and swings it on the strike (breaker.ts; a view of the room's flag, not a carry). */
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

/** The rivet stud: a low gold bolt head on the joint plate between the lanes (r at its foot, h proud of the deck). A car
 * is 2.2 m wide with its bottom 0.4 m up, on tracks 2 m either side of the middle, so its inner edge is 0.9 m from
 * the stud's centre; test/railway-r4d-meet.test.ts keeps the stud clear of it. */
export const STUD = { rTop: 0.4, rFoot: 0.46, h: 0.3 } as const;

/** The glint's look at `distance` metres from the camera (the breaker seam's language, `emit` with the gold `glint`
 * sprite, scaled to read at both ends): from a few slim sparkles rising a metre or so off the stud when you stand at
 * it (the follow camera is about 6 m back), to a taller column of larger glints that a train's length away can see.
 * Monotonic in distance and bounded: `size` 0.28 to 0.9 m, `interval` 0.3 to 0.1 s, `rise` 1.4 to 4.8 m. Fully near at
 * `NEAR` and below, fully far at `FAR` and beyond. */
export const GLINT_NEAR = 10;
export const GLINT_FAR = 22;
export function glintPlan(distance: number) {
  const k = Math.min(1, Math.max(0, (distance - GLINT_NEAR) / (GLINT_FAR - GLINT_NEAR))),
    e = k * k * (3 - 2 * k);
  return { size: 0.28 + 0.62 * e, interval: 0.3 - 0.2 * e, rise: 1.4 + 3.4 * e, life: 1.4 };
}

/** The rivet stud's place: the joint, at the rivet's prompt site. */
export const RIVET_AT: V3 = { x: RING_RIVET.x / 100, y: ringDeckY(JOINT_U) / 100, z: RING_RIVET.z / 100 };

/** The breaker at the rivet (breaker.ts), a view of the room's flag: it is in the hands of every player within `near`
 * metres of the stud (out again past `far`) and `rise` of its deck while the strike is open, and whoever strikes swings
 * it. The prompt is offered inside `prompt` metres, the furthest a swing lands its head on the stud; the server's own
 * reach (`RING_RIVET.reach`, 5 m) is wider and unchanged. */
export const RIVET_CARRY = { near: 5, far: 5.6, rise: 2.6, prompt: 2.2 } as const;
/** The rivet swing, seconds from the accepted strike: the head is over the shoulder at `raise`, meets the stud at
 * `contact` (breaker-view.ts SWING's 0.58; the clang, the burst and the Meet's cut-in wait for it, so the swing is seen
 * from the follow camera first), rests on the stud until `rest` (through the shot's held second) and is gone at `away`. */
export const RIVET_SWING = { raise: 0.4, contact: 0.58, settle: 0.8, rest: 1.9, away: 2.15 } as const;
/** The handle's length from the grip to the middle of the head, and the head's half height (breaker-view.ts). */
const HANDLE = 1.36,
  HEAD = 0.17;
/** How a swing from `d` metres (horizontal, avatar to stud) lands its head on the stud: `ahead`, metres the grip is held
 * out in front at contact; `up`, the grip's height over the deck then; `angle`, radians the handle has turned from
 * upright toward the stud (past level: the head is below the grip). The head lands `ahead + reach` metres out, which is
 * `d` held to what arms can do (0.58 to 2.17 m). */
export function rivetSwing(d: number) {
  const out = Math.min(2.17, Math.max(0.58, d)),
    reach = Math.min(1.27, Math.max(0.58, out - 0.3)),
    ahead = Math.min(0.9, Math.max(0, out - reach)),
    drop = Math.sqrt(HANDLE * HANDLE - reach * reach);
  return { ahead, up: STUD.h + HEAD + drop, angle: Math.PI - Math.asin(reach / HANDLE) };
}
/** The handle's angle `t` seconds into the swing whose contact angle is `land`, from the carry's `rest` angle (negative:
 * tipped back over the shoulder): back and up, accelerating down into the stud, a small recoil, then lying on it. */
export function rivetSwingAngle(t: number, land: number, rest: number) {
  const S = RIVET_SWING,
    back = -2.2;
  if (t < S.raise) return rest + (back - rest) * (1 - (1 - t / S.raise) ** 3);
  if (t < S.contact) {
    const u = (t - S.raise) / (S.contact - S.raise);
    return back + (land - back) * u * u;
  }
  const u = Math.min(1, (t - S.contact) / (S.settle - S.contact));
  return land - Math.sin(u * Math.PI) * 0.22;
}
