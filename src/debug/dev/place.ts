// Explicit, read-mostly adapter. This module is loaded only when place is already running.
import { HEAD_OFFSET, PLAYER_R, SEA, WALKABLE_NY } from '../../constants.ts';
import { cam, me } from '../../player/state.ts';
import { inputState } from '../../player/input-state.ts';
import { releaseInput } from '../../player/input.ts';
import { releaseJump } from '../../entities/player/state.ts';
import { cancelCharge } from '../../player/throw.ts';
import { inv } from '../../player/inventory.ts';
import { carry } from '../../physics/platforms.ts';
import { getMask, raycastClosest, rayHit, sweepSphere, teleport, type V3 } from '../../physics/engine.ts';
import { waterField } from '../../physics/water-field.ts';
import { GROUP } from '../../physics/physics.ts';
import { fixtureReason, intervention, noteScenario, type Destination, type Scenario } from './fixtures.ts';
import { no, ok } from './types.ts';

const [
  { ORIGIN, SPAWN, SPIRE, HEAD, FORGE, VILLAGE },
  { H, insidePlace },
  { activeFrame, run },
  { back },
  { pair },
  { standUp, seated },
  { closeGlide, cancelPull },
  { coop },
  { prepareDevStage },
] = await Promise.all([
  import('../../proto/place/layout.ts'),
  import('../../proto/place/terrain.ts'),
  import('../../proto/place/run.ts'),
  import('../../proto/place/chop.ts'),
  import('../../proto/place/pair.ts'),
  import('../../proto/place/seat.ts'),
  import('../../proto/place/moves.ts'),
  import('../../proto/place/coop.ts'),
  import('../../proto/place/panel.ts'),
]);

export type Spot = V3 & { mode: 'land' | 'water' | 'air'; yaw?: number };
let returnSpot: Spot | null = null;
export let lastDestination: Destination = 'spawn';
// Pick the first southern coast crossing of the actual terrain, away from buildings and rails.
function coast(target: number) {
  const x = ORIGIN.x + VILLAGE.x;
  let best = { x, z: 200, error: Infinity };
  for (let z = VILLAGE.z + VILLAGE.r; z < 245; z += 0.5) {
    const error = Math.abs(H(x, z) - (SEA + target));
    if (error < best.error) best = { x, z, error };
  }
  return { x, z: best.z };
}
// A height match alone can land on a steep triangle. Ask actual colliders about bounded coast candidates.
function shoreSpot(): Spot | null {
  const candidates: { spot: Spot; score: number }[] = [];
  const center = ORIGIN.x + VILLAGE.x;
  for (let x = center - 80; x <= center + 80; x += 2)
    for (let z = VILLAGE.z + VILLAGE.r; z < 245; z += 2) {
      const h = H(x, z);
      if (h < SEA + 0.3 || h > SEA + 2) continue;
      candidates.push({
        spot: { x, y: h + PLAYER_R + 0.15, z, mode: 'land' },
        score: Math.abs(h - SEA - 0.8) + Math.abs(x - center) * 0.003,
      });
    }
  candidates.sort((a, b) => a.score - b.score);
  for (const { spot } of candidates.slice(0, 96)) if (!safe(spot)) return spot;
  return null;
}
export function destination(id: Destination): Spot | null {
  const land = (x: number, z: number): Spot => ({
    x: ORIGIN.x + x,
    z: ORIGIN.z + z,
    y: H(ORIGIN.x + x, ORIGIN.z + z) + PLAYER_R + 0.15,
    mode: 'land',
  });
  if (id === 'spawn') return { ...land(SPAWN.x, SPAWN.z), yaw: SPAWN.yaw };
  if (id === 'shore') return shoreSpot();
  if (id === 'tower') return land(SPIRE.x, SPIRE.z + 18);
  if (id === 'head') return land(HEAD.x, HEAD.z);
  if (id === 'forge') return land(FORGE.x - FORGE.w / 2 - 3, FORGE.z);
  if (id === 'frame') {
    const frame = activeFrame();
    return frame
      ? { x: frame.x + 3, z: frame.z + 3, y: H(frame.x + 3, frame.z + 3) + PLAYER_R + 0.15, mode: 'land' }
      : null;
  }
  const point = coast(id === 'shallow' ? -0.7 : -5);
  return {
    ...point,
    y: SEA + (id === 'plunge' ? 30 : 0.5),
    mode: id === 'plunge' ? 'air' : 'water',
  };
}
function safe(spot: Spot) {
  if (![spot.x, spot.y, spot.z].every(Number.isFinite) || !insidePlace(spot.x, spot.z) || spot.y < -10 || spot.y > 180)
    return 'Destination is outside supported place bounds.';
  const body = me.body!;
  const mask = getMask(body) & ~GROUP.DEFAULT;
  if (spot.mode === 'land') {
    const hit = rayHit();
    if (
      !raycastClosest(
        { x: spot.x, y: spot.y + 2, z: spot.z },
        { x: spot.x, y: spot.y - 3, z: spot.z },
        { mask, skipBackfaces: true },
        hit,
      )
    )
      return 'No static floor support at this destination. Use its camera bookmark.';
    if (hit.hitNormalWorld.y < WALKABLE_NY) return 'The support at this destination is too steep to stand on.';
    spot.y = hit.hitPointWorld.y + PLAYER_R + 0.15;
    if (hit.hitPointWorld.y < SEA - 0.1) return 'This land destination is underwater; use a water destination.';
  } else {
    const water = waterField.nearby(spot);
    if (
      water.body !== 'sea' ||
      !Number.isFinite(water.height) ||
      H(spot.x, spot.z) > SEA - (spot.mode === 'air' ? 3 : 0.3)
    )
      return 'No sufficiently deep sea at this destination.';
  }
  const high = { x: spot.x, y: spot.y + HEAD_OFFSET + PLAYER_R + 0.3, z: spot.z };
  for (const thin of ['skip', 'only'] as const) {
    if (sweepSphere(high, spot, PLAYER_R, { mask, thin }) >= 0)
      return 'Landing clearance is obstructed. Use its camera bookmark.';
  }
  return null;
}
function detachReason() {
  if (inputState.seated || inv.held || !back.empty() || pair.grip() !== null || pair.carrying())
    return 'Put carried items down / get out of the vehicle first. Dev will not change object ownership.';
  return null;
}
function moveTo(spot: Spot) {
  releaseInput();
  releaseJump();
  cancelCharge();
  closeGlide();
  cancelPull();
  standUp();
  carry.x = carry.y = carry.z = carry.spin = 0;
  carry.on = null;
  const body = me.body!;
  teleport(body, spot.x, spot.y, spot.z);
  body.velocity.set(0, 0, 0);
  body.angularVelocity.set(0, 0, 0);
  body.force.set(0, 0, 0);
  me.wish.set(0, 0, 0);
  me.jumpQueued = me.coyote = 0;
  if (spot.yaw !== undefined) cam.yaw = me.yaw = spot.yaw;
  waterField.invalidate('player');
}
export function travel(id: Destination | 'return') {
  const blocked = fixtureReason() ?? detachReason();
  if (blocked) return no(blocked);
  const spot = id === 'return' ? returnSpot && { ...returnSpot } : destination(id);
  if (!spot)
    return no(
      id === 'return'
        ? 'No Return spot yet.'
        : id === 'shore'
          ? 'No clear walkable shore found in the bounded search. No player movement.'
          : 'No current construction frame. No progression was changed.',
    );
  const why = safe(spot);
  if (why) return no(why);
  if (!returnSpot && id !== 'return') {
    const p = me.body!.position;
    const origin: Spot = { x: p.x, y: p.y, z: p.z, yaw: me.yaw, mode: me.swimming ? 'water' : 'land' };
    if (safe(origin)) return no('Stand on a clear shore or supported floor first so Return has a safe landing.');
    returnSpot = origin;
  }
  moveTo(spot);
  if (id === 'return') returnSpot = null;
  else lastDestination = id;
  intervention(`go:${id}`);
  return ok(`Moved to ${id}.`, { position: { ...spot }, returnAvailable: !!returnSpot });
}
export function stage(id: Scenario) {
  const blocked = fixtureReason() ?? detachReason();
  if (blocked) return no(blocked);
  prepareDevStage(id);
  noteScenario(id);
  intervention(`scenario:${id}`);
  return ok(`Prepared ${id} in this disposable run. No player teleport.`, { scenario: id });
}
export function inspectPlace() {
  const frame = activeFrame();
  return {
    landingMask: me.body ? getMask(me.body) & ~GROUP.DEFAULT : null,
    mode: run.mode,
    frame: frame ? { id: frame.spec.id, x: frame.x, z: frame.z } : null,
    seated: seated(),
    carry: { logs: back.logs, rails: back.rails, stone: back.stone, big: back.big },
    authority: coop.on
      ? coop.follower()
        ? 'another visible place tab'
        : 'this visible place tab'
      : 'solo prototype-local',
    returnAvailable: !!returnSpot,
    destination: lastDestination,
  };
}
