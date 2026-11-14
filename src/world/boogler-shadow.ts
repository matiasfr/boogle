// Fixed decisions and continuous travel, shared by the server and sessionless local presentation.
// Metres, radians and 10 Hz rule ticks; replication quantizes to cm and milliradians.
import { createBooglerBrain, findStart, MODE, validBooglerSpot } from './boogler-brain.ts';
import type { BooglerVisitor } from './boogler-brain.ts';
import type { BooglerLand } from './boogler-land.ts';
import { SPEED, FLEE_SPEED, RIDDEN_SPEED, TURN, stepBooglerWalk } from './boogler-walk.ts';
import { angleLerp } from '../math.ts';

export type BooglerLeg = {
  x0: number;
  z0: number;
  yaw0: number;
  x1: number;
  z1: number;
  start: number;
  speed: number;
  mode: number;
  look?: string;
};

// Integral of max(0, cos(error)), as yaw turns at TURN radians/s toward a fixed target.
export function booglerPose(leg: BooglerLeg, tick: number) {
  const dx = leg.x1 - leg.x0,
    dz = leg.z1 - leg.z0;
  const distance = Math.hypot(dx, dz);
  const seconds = Math.max(0, tick - leg.start) / 10;
  if (!leg.speed || distance <= 0.3) return { x: leg.x0, z: leg.z0, yaw: leg.yaw0, walking: false };
  const delta = angleLerp(leg.yaw0, Math.atan2(-dx, -dz), 1) - leg.yaw0;
  const error = Math.abs(delta),
    remaining = Math.max(0, error - TURN * seconds);
  const turning = (Math.sin(Math.min(error, Math.PI / 2)) - Math.sin(Math.min(remaining, Math.PI / 2))) / TURN;
  const travelled = Math.min(distance - 0.3, leg.speed * (turning + Math.max(0, seconds - error / TURN)));
  return {
    x: leg.x0 + (dx / distance) * travelled,
    z: leg.z0 + (dz / distance) * travelled,
    yaw: leg.yaw0 + Math.sign(delta) * (error - remaining),
    walking: travelled < distance - 0.3,
  };
}

export function createBooglerShadow(land: BooglerLand, rng: () => number, startTick: number) {
  let leg: BooglerLeg | null = null;
  let tick = startTick;
  const walk: typeof stepBooglerWalk = (state, _dt, speed, blocked) => {
    const mode = brain.state.mode;
    if (!leg || leg.x1 !== state.tx || leg.z1 !== state.tz || leg.speed !== speed || leg.mode !== mode)
      leg = { x0: state.x, z0: state.z, yaw0: state.yaw, x1: state.tx, z1: state.tz, start: tick - 1, speed, mode };
    const pose = booglerPose(leg, tick);
    // Never trust a target or skip terrain checks, even if the caller claims to stand across an obstacle.
    if (blocked(pose.x, pose.z, 0, state.x, state.z)) return 'blocked';
    state.x = pose.x;
    state.z = pose.z;
    state.yaw = pose.yaw;
    return pose.walking ? 'walking' : 'arrived';
  };
  const brain = createBooglerBrain({ land, rng, start: findStart(land), walk });
  const stand = (t: number): BooglerLeg => ({
    x0: brain.state.x,
    z0: brain.state.z,
    yaw0: brain.state.yaw,
    x1: brain.state.x,
    z1: brain.state.z,
    start: t,
    speed: 0,
    mode: brain.state.mode,
    look: brain.state.look,
  });
  leg = stand(tick);
  const speedOf = () =>
    brain.state.mode === MODE.FLEE ? FLEE_SPEED : brain.state.mode === MODE.RIDDEN ? RIDDEN_SPEED : SPEED;
  return {
    step(t: number, visitors: readonly BooglerVisitor[]) {
      if (leg) leg.start += Math.max(0, t - tick - 1); // skipped empty-room ticks never become travel
      tick = t;
      // Mode is set by the brain before it calls walk; the getter below reads that decision.
      brain.step(0.1, visitors);
      const s = brain.state;
      // Integer tick deadlines: in particular 0.8 s is eight decisions, not nine from float subtraction.
      s.wait = Math.max(0, Math.ceil((s.wait - 1e-9) * 10)) / 10;
      s.fleeCheck = Math.max(0, Math.ceil((s.fleeCheck - 1e-9) * 10)) / 10;
      const mode = s.mode;
      if (!s.walking) {
        // Displayed-player facing is cosmetic: do not publish idle yaw/start every tick.
        if (!leg || leg.speed || leg.mode !== mode || leg.look !== s.look) leg = stand(t);
      } else if (!leg || leg.speed === 0)
        leg = { x0: s.x, z0: s.z, yaw0: s.yaw, x1: s.tx, z1: s.tz, start: t, speed: speedOf(), mode };
    },
    pause(t: number) {
      if (leg?.speed) leg = stand(t);
    },
    serialize: () => [brain.state.x, brain.state.z, brain.state.yaw],
    load(value: unknown) {
      if (
        !Array.isArray(value) ||
        value.length !== 3 ||
        !value.every((v) => typeof v === 'number' && Number.isFinite(v))
      )
        throw new Error('invalid boogler pose');
      brain.takeover({ x: value[0], z: value[1], yaw: value[2] });
      leg = stand(tick);
    },
    validate(t: number) {
      tick = t;
      if (!validBooglerSpot(land, brain.state.x, brain.state.z)) brain.takeover({ ...findStart(land), yaw: 0 });
      // Recovery verifies the saved hash first. Then keep a finite but enormous yaw wire-safe.
      if (!Number.isSafeInteger(Math.round(brain.state.yaw * 1000))) brain.state.yaw %= Math.PI * 2;
      leg = stand(t);
    },
    leg: () => leg!,
    snapshot: () => ({ tick, ...brain.snapshot(), leg: leg ? { ...leg } : null }),
  };
}
