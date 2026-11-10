// What a recording is (src/debug/record.ts makes one in the browser), and the state trace it writes, one row a frame, so
// a replay could be compared with the session it came from. The headless replay was retired on 9 November 2026
// (dev/sim/README.md); the recorder stays. No DOM or scene.
import { r3 } from '../math.ts';
import type { ball } from '../entities/ball/state.ts';
import type { me } from '../player/state.ts';

/** One press or release, as it arrived between two frames. t: what a press acts on. c, aim: the throw a release makes. */
export type PressData = { t?: string; c?: number; aim?: number[] };
export type Press = [id: string, down: 0 | 1, data?: PressData];

/** What changed since the frame before. Absent means the same. */
export type FrameChanges = {
  yaw?: number;
  pitch?: number;
  keys?: string[]; // input.keys, whole
  stickX?: number;
  stickY?: number;
  sprint?: boolean;
  triggerL?: number;
  triggerR?: number;
  state?: Record<string, boolean>; // inputState's fields that changed
  charging?: boolean; // me.charging: a look-drag also ends a wind-up, which only the view knows
  mine?: boolean; // ball.mine, when the room changed it rather than a press
  presses?: Press[]; // the ones since the frame before, first to last
};
export type RecordedFrame = [dt: number, changes?: FrameChanges];

/** The world a recording starts from. A replay puts all of this back, since entering picks a random spot. */
export type RecordingStart = {
  clock: { time: number; acc: number }; // physicsClock(): sea state follows the time, steps follow the leftover
  player: {
    p: number[];
    v: number[];
    yaw: number;
    coyote: number;
    jumpQueued: number;
    jumpHeld: boolean;
    swimming: boolean;
    held: string | null; // inv.held: what is in your hand
    charging: boolean;
  };
  cam: { yaw: number; pitch: number; dist: number };
  input: { keys: string[]; stickX: number; stickY: number; sprint: boolean; triggerL: number; triggerR: number };
  state: Record<string, boolean>;
  ball: { p: number[]; q: number[]; v: number[]; w: number[]; mine: boolean; held: boolean };
};

export type Recording = {
  version: 1;
  build: string;
  room: string;
  peers: number; // the most other players the room held while recording: they move the ball and bump you, a replay has none
  start: RecordingStart;
  frames: RecordedFrame[];
  trace: number[][]; // what the browser did, a row a frame
};

export const TRACE_FIELDS = [
  'player.x',
  'player.y',
  'player.z',
  'player.vx',
  'player.vy',
  'player.vz',
  'player.swimming',
  'player.grounded',
  'ball.x',
  'ball.y',
  'ball.z',
  'ball.qx',
  'ball.qy',
  'ball.qz',
  'ball.qw',
  'ball.held',
];

/** The state at the end of a frame's physics and world phases: TRACE_FIELDS, to a millimetre. */
export function traceRow(player: typeof me, thing: typeof ball) {
  const { position: p, velocity: v } = player.body!;
  const { p: bp, q: bq } = thing.pose;
  return [
    r3(p.x),
    r3(p.y),
    r3(p.z),
    r3(v.x),
    r3(v.y),
    r3(v.z),
    player.swimming ? 1 : 0,
    player.coyote > 0 ? 1 : 0,
    r3(bp.x),
    r3(bp.y),
    r3(bp.z),
    r3(bq.x),
    r3(bq.y),
    r3(bq.z),
    r3(bq.w),
    thing.held ? 1 : 0,
  ];
}

/** One frame or row to a line, so a file stays readable and a new trace diffs by the frame. */
export function stringifyRows(rows: unknown[]) {
  return `[\n${rows.map((row) => JSON.stringify(row)).join(',\n')}\n]`;
}
export function stringifyRecording({ frames, trace, ...rest }: Recording) {
  const head = JSON.stringify(rest).slice(0, -1);
  return `${head},\n"frames":${stringifyRows(frames)},\n"trace":${stringifyRows(trace)}\n}\n`;
}
