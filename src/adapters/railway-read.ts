// What the railway's views read of the adapter (docs/plans/ecs-migration-railway.md, M8, M12; cut from
// railway-session.ts, docs/plans/ecs-m12-m13.md, M12f): the movement tunables, the per-frame memo and the read facade
// (`adapter.read`). Its only state is the frame counter and the latches; the session lends getters over the rest, and
// nothing here writes the world, the predictor or the mirror.
import type { World } from '../ecs/index.ts';
import type { ReadWorld } from '../sim/railway-rows.ts';
import type { TuneApi } from '../world/rules/tune.ts';
import type { RailwayIntent } from './railway-intents.ts';

/** Movement tunables the views read; tune stays lockstep, so a tab reads its own copy. */
export const railMovement = (tune: Pick<TuneApi, 'get'>) => ({
  beamSoloSpeed: tune.get('railBeamSoloSpeed') / 100,
  beamHelpSpeed: tune.get('railBeamHelpSpeed') / 100,
  boilerSoloSpeed: tune.get('railBoilerSoloSpeed') / 100,
  boilerHelpSpeed: tune.get('railBoilerHelpSpeed') / 100,
  footSoloSpeed: tune.get('railFootSoloSpeed') / 100,
  footHelpSpeed: tune.get('railFootHelpSpeed') / 100,
  jumpImpulse: tune.get('railJumpImpulse') / 100,
  jumpTurn: tune.get('railJumpTurn') / 100,
  jumpSteer: tune.get('railJumpSteer') / 100,
  jumpApexSpeed: tune.get('railJumpApexSpeed') / 100,
  // The glider (piece B): metres, seconds and radians for glide-step.ts's GlideMove.
  glideSpeed: tune.get('railGlideSpeed') / 100,
  glideSink: tune.get('railGlideSink') / 100,
  glideAccel: tune.get('railGlideAccel') / 100,
  glideBrake: tune.get('railGlideBrake') / 100,
  glideOver: tune.get('railGlideOver') / 100,
  glideTurnTau: tune.get('railGlideTurnTau') / 1000,
  glideTurnMax: (tune.get('railGlideTurnMax') * Math.PI) / 180,
  glideDeploy: tune.get('railGlideDeploy') / 1000,
});
export type RailwayMovement = ReturnType<typeof railMovement>;
const MOVEMENT_KEYS = Object.keys(railMovement({ get: () => 0 })) as (keyof RailwayMovement)[];

export type RailwayStatus = 'connecting' | 'starting' | 'ready' | 'storage' | 'full';

/** What the session lends the facade: getters over its own state, called at each read. */
export type RailwayReadHandle<D> = {
  /** The world the views see now: predicted while actions are pending, the last shown while a refill comes in. */
  view: () => World;
  tick: () => number;
  tickNow: () => number;
  available: () => boolean;
  pid: string;
  status: () => RailwayStatus;
  /** The predictor's pending list (the same array while it is unchanged) and its stalled actions at a time. */
  pending: () => readonly unknown[];
  stalled: (at: number) => readonly { action: { intent: RailwayIntent } }[];
  now: () => number;
  movement: () => RailwayMovement;
  movementRev?: () => number;
  /** The session scalars no view reads, built per call. */
  debug: () => D;
};

export function createRailwayRead<D>({
  view,
  tick,
  tickNow,
  available,
  pid,
  status,
  pending,
  stalled,
  now,
  movement,
  movementRev,
  debug,
}: RailwayReadHandle<D>) {
  // The frame memo. update() runs once a frame in the railway entity's update (order 10, after its prePhysics and fixed
  // steps) and moves `frame`. A perFrame value is taken at its first read in a frame and held until the next one (while
  // `keep` says it still stands), so about a hundred readers a frame skip the 18 tune reads, the clock and the stall
  // scan, and two reads in a frame never straddle a tick (an edge such as waking to idle is seen once). Outside the loop
  // (tests, tools) `frame` never moves and every call is live.
  let frame = 0;
  function perFrame<T>(read: () => T, keep: () => boolean = () => true) {
    let at = -1,
      value: T;
    return () => {
      if (frame && at === frame && keep()) return value;
      at = frame;
      return (value = read());
    };
  }
  const sameMovement = (a: RailwayMovement, b: RailwayMovement | null) =>
    !!b && MOVEMENT_KEYS.every((k) => a[k] === b[k]);
  // The movement tunables as one frozen object: the same object while the values are unchanged. With `movementRev` the
  // 18 tunables are read only when it moved.
  let moved: Readonly<RailwayMovement> | null = null,
    movedRev = NaN;
  const moves = perFrame(() => {
    if (movementRev) {
      const rev = movementRev();
      if (moved && rev === movedRev) return moved;
      movedRev = rev;
    }
    const m = movement();
    if (!sameMovement(m, moved)) moved = Object.freeze({ ...m });
    return moved!;
  });
  // The estimated tick the views read. Actions are still stamped with the live tick (submit).
  const frameTick = perFrame(tick);
  // The stall cue, held while the pending list keeps its oldest action (actions are pushed in time order, so only the
  // oldest can be the first stalled one).
  let stallList: unknown = null,
    stallHead: unknown = null;
  const stalledNow = perFrame(
    (): RailwayIntent['op'] | null => {
      const list = pending();
      [stallList, stallHead] = [list, list[0]];
      // Only a pending action can be stalled.
      return list.length ? (stalled(now())[0]?.action.intent.op ?? null) : null;
    },
    () => {
      const list = pending();
      return list === stallList && list[0] === stallHead;
    },
  );
  // The first whole state, latched: a session value, so a view that hides, resets or un-decks until it is in reads it
  // here, not a latch of its own. read.ready() is also false with a full pending window or the link down; this is not.
  let whole = false;
  const wholeNow = () => (whole ||= available());
  // The read facade (docs/plans/ecs-migration-railway.md, M8, M12): what views read. world() is the world the views see
  // now: the predicted clone while actions are pending, the confirmed (published) world otherwise, the last shown world
  // while a refill comes in. It is never half-filled: the mirror publishes only whole, fully applied states, and a
  // published world is never written. Read its rows and pass it to the queries in
  // src/sim/railway-queries*.ts with `tick()` as their `at` (a timed fact without it throws on a client's world); it
  // is typed read-only, so a view cannot write to it or drain its changes.
  const facade = {
    world: () => view() as unknown as ReadWorld,
    /** The estimated server tick (whole, never going backwards): the job clocks' `at`. In the frame loop it holds one
     * value for the whole frame, so it stays consistent with world() and with itself within a frame; outside the loop
     * it is live. */
    tick: frameTick,
    /** The live tick with its fraction, for movers: unlike tick(), it moves within a frame. */
    tickNow,
    pid,
    /** The session's state. 'ready' does not mean an action can be sent now: see ready(). */
    status,
    // The session values that are not rows.
    /** Whether an action can be sent now: connected, the whole state in, this session's account epoch matching and
     * the pending window not full. Unlike `status() === 'ready'`, false while RAILWAY_WINDOW actions are pending. */
    ready: available,
    /** The first whole state is in: false until ready() is first true, then true for good (through refills, full
     * windows and a dropped link, while the world the views see keeps the last whole state). */
    whole: wholeNow,
    /** Your actions sent and not yet answered (already in the world the views see). */
    pending: () => pending().length,
    /** The oldest pending action still unanswered after STALL_MS (the wordless stall cue), or null. */
    stalled: stalledNow,
    /** The movement tunables (railMovement), one frozen object while they are unchanged. */
    movement: moves,
    /** The session scalars no view reads (tools, witnesses and the view's inspection do), built per call: the
     * connection, the server step the confirmed mirror is current to and its hash (computed only when read; never the
     * prediction's), the account epoch, the next action id and the prediction's counters. */
    debug,
  };
  return {
    read: facade,
    /** One frame on: the per-frame values are taken afresh at their next read. */
    nextFrame() {
      frame++;
    },
    /** Latches the first whole state (read.whole() without a read). */
    latch: wholeNow,
  };
}
