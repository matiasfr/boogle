// What your hands do with the hotbar (src/inventory.js).
//
//   useDown/useUp            click, pad X: use what is in your hand. A thing (ball, fruit, frisbee) winds up a throw and
//                            flies on release; the shovel digs, the can pours, seeds go in at your feet. Empty hands
//                            interact.
//   interactDown/interactUp  E, pad B: act on interactTarget(), and only on it; nothing while a throw winds up, and the
//                            release never throws.
//   touchDown                the touch context button: interacts when something is in reach, otherwise uses
//   throwDown                the touch Toss button: winds up a throw of whatever you hold (release with releaseThrow)
//   interactTarget()         the one thing in front of you: { id, verb, at, run } (talk to The Boogler, pick up, take,
//                            shake a palm, grab the ball), { id, verb, at, blocked } when your hotbar has no room for it
//                            and nothing that would act is in reach, or null. `at` is where its prompt goes.
//   useVerb()                what using the thing in your hand does ('Throw', 'Dig', ...), null for empty hands
//   handsNote                { text, until }: why the last use did nothing, for the hotbar to show
//
// Thrown things other than the beach ball fly and land through src/gifts.js; the ball keeps its own physics.
import * as THREE from 'three';
import { me, cam, chargeAmount, throwFrom, throwVelocity } from './player.js';
import { ball, ballInReach, remoteHoldsBall, grabBall, throwBall } from './ball.js';
import { inv, heldId, take, useOne, drop, has, roomFor, slotOf, select, onHotbarChange } from './inventory.js';
import { toggleShovel, setHold } from './world/terrain-edits.js';
import { giftTargets, throwItem } from './gifts.js';
import { stallTargets, plantTarget, plantFront, pour } from './mushroom-garden.js';
import { talkTarget } from './boogler-play.js';
import { giftIndex } from './sim/gift-catalog.js';
import { pickInteract } from './sim/interact-pick.js';

const USE_VERB = { shovel: 'Dig', can: 'Water', seeds: 'Plant' };
const ballAt = new THREE.Vector3();

// The ball's slot is whatever ball ownership says: thrown, stolen, respawned or dropped on a hidden tab, it leaves.
function syncBall() {
  const carried = ball.mine && ball.held;
  if (!carried && has('ball')) drop('ball');
  me.holding = carried && heldId() === 'ball';
}
onHotbarChange(() => {
  toggleShovel(heldId() === 'shovel');
  if (me.charging && !heldId()) me.charging = false;
  syncBall();
});

// Grab first: the hotbar syncs the ball slot to ownership on every change.
function grabTheBall() {
  grabBall();
  take('ball');
  me.suppressUp = true;
}

function ballTarget() {
  if (!ballInReach() || (ball.mine && ball.held)) return null;
  const at = ballAt.copy(ball.disp.p).setY(ball.disp.p.y + 0.5);
  const t = { id: 'ball', verb: remoteHoldsBall() ? 'Steal' : 'Grab', at };
  return roomFor('ball') < 0 ? { ...t, blocked: 'Hotbar full' } : { ...t, run: grabTheBall };
}

// The pick itself is src/sim/interact-pick.js: something that would act beats something blocked, then nearest wins, with
// a nudge toward where you look; `r` measures to the edge of something big.
export function interactTarget() {
  if (!me.entered || !me.body) return null;
  const p = me.body.interpolatedPosition;
  const targets = [ballTarget(), ...giftTargets(), ...stallTargets(), talkTarget()];
  return pickInteract(targets, p.x, p.z, -Math.sin(cam.yaw), -Math.cos(cam.yaw));
}

// Never mid-throw: the prompt hides while you wind up, and E must not act on something you cannot see.
function interact() {
  if (me.charging) return false;
  const t = interactTarget();
  if (!t?.run) return false;
  t.run();
  return true;
}

export const handsNote = { text: '', until: 0 };
function deny(text) {
  handsNote.text = text;
  handsNote.until = performance.now() + 1400;
  return false;
}

function windUp() {
  if (!heldId()) return false;
  me.charging = true;
  me.chargeStart = performance.now();
  return true;
}

function throwHeld(c) {
  const id = heldId();
  if (!id || !me.body) return;
  if (id === 'ball') return throwBall(c);
  const kind = giftIndex(id);
  const from = throwFrom();
  const v = throwVelocity(c, from, id === 'frisbee');
  useOne();
  if (!throwItem(kind, from, v)) take(id);
}

export function releaseThrow() {
  if (me.suppressUp) {
    me.suppressUp = false;
    return;
  }
  if (!me.charging) return;
  me.charging = false;
  throwHeld(chargeAmount());
}

export function useDown() {
  if (!me.entered || !me.body) return false;
  const id = heldId();
  if (!id) return interact();
  if (id === 'shovel') return (setHold('dig'), true);
  if (id === 'can') return pour();
  if (id === 'seeds') return plantFront() || deny(plantTarget()?.text ?? '');
  return windUp();
}

export function useUp() {
  setHold(null, 'dig');
  releaseThrow();
}

export const interactDown = () => (me.entered && me.body ? interact() : false);
// E never throws. Its release only clears the guard grabTheBall set, so the next click release still throws.
export const interactUp = () => {
  me.suppressUp = false;
};
export const touchDown = () => (interactTarget()?.run ? interact() : useDown());
export const throwDown = windUp;

// The shovel is always at hand: Q, Z and F pull it out (a fresh one if you threw yours away).
export function ensureShovel() {
  if (heldId() === 'shovel') return true;
  const k = slotOf('shovel');
  if (k >= 0) select(k);
  else take('shovel');
  return heldId() === 'shovel';
}
let beforeShovel = -1;
export function toggleShovelHand() {
  if (heldId() === 'shovel') return select(beforeShovel === inv.sel ? -1 : beforeShovel);
  beforeShovel = inv.sel;
  ensureShovel();
}

export function useVerb() {
  const id = heldId();
  return id ? (USE_VERB[id] ?? 'Throw') : null;
}

// Every frame, before the hotbar is drawn.
export function updateHands() {
  syncBall();
}
