// What your hands do with the hotbar (src/inventory.js).
//
//   useDown/useUp    click, pad X: use what is in your hand. A thing (ball, fruit, frisbee) winds up a throw and flies on
//                    release; the shovel digs, the can pours, seeds go in at your feet. Empty hands grab.
//   grabDown/grabUp  E, pad B: pick up what is in reach, take from the stall, shake a palm, pet The Boogler. With
//                    nothing in reach it winds up a throw of whatever you hold, tools included.
//   touchDown        the touch context button: grabs when something is in reach, otherwise uses
//   throwDown        the touch Toss button: winds up a throw of whatever you hold (release with releaseThrow)
//   handsHint()      the hint line and the touch context button's label
//
// Thrown things other than the beach ball fly and land through src/gifts.js; the ball keeps its own physics.
import { isTouch } from './constants.js';
import { me, chargeAmount, throwFrom, throwVelocity } from './player.js';
import { ball, ballInReach, remoteHoldsBall, grabBall, throwBall } from './ball.js';
import { inv, heldId, take, useOne, drop, has, roomFor, slotOf, select, onHotbarChange } from './inventory.js';
import { toggleShovel, setHold } from './world/terrain-edits.js';
import { giftTarget, throwItem } from './gifts.js';
import { stallTarget, plantTarget, plantFront, pour } from './mushroom-garden.js';
import { petTarget, booglerHint } from './boogler-play.js';
import { giftIndex } from './sim/gift-catalog.js';

const USE_BUTTON = { shovel: 'Dig', can: 'Water', seeds: 'Plant' };

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

// What grabbing would do: { label, button, run }, { text } when something is in reach but there is no room, or null.
function grabTarget() {
  if (!me.entered || !me.body) return null;
  if (ballInReach() && !(ball.mine && ball.held)) {
    if (roomFor('ball') < 0) return { text: 'Hotbar full' };
    return { label: remoteHoldsBall() ? 'steal the ball' : 'grab the ball', button: 'Grab', run: grabTheBall };
  }
  return giftTarget() ?? stallTarget() ?? petTarget();
}

function grab() {
  const t = grabTarget();
  if (!t?.run) return false;
  t.run();
  return true;
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
  if (!id) return grab();
  if (id === 'shovel') return (setHold('dig'), true);
  if (id === 'can') return pour();
  if (id === 'seeds') return plantFront();
  return windUp();
}

export function useUp() {
  setHold(null, 'dig');
  releaseThrow();
}

export const grabDown = () => (me.entered && me.body ? grab() || windUp() : false);
export const grabUp = releaseThrow;
export const touchDown = () => (grabTarget()?.run ? grab() : useDown());
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

// { text, button }: a short hint line (keyboard only; touch reads its button) and the touch context button's label.
export function handsHint() {
  if (!me.entered || !me.body) return null;
  const id = heldId();
  const near = grabTarget();
  const button = near?.run ? near.button : id ? (USE_BUTTON[id] ?? 'Throw') : 'Grab';
  if (near?.text) return { text: near.text, button };
  if (isTouch) return { text: '', button };
  const parts = [];
  if (id === 'seeds' && plantTarget()?.text) parts.push(plantTarget().text);
  else if (id) parts.push(`Click to ${USE_BUTTON[id]?.toLowerCase() ?? 'throw'}`);
  if (near?.run) parts.push(`${id ? 'E' : 'Click'} to ${near.label}`);
  const talk = booglerHint();
  if (talk) parts.push(talk);
  return { text: parts.join(' · '), button };
}

// Every frame, before the hotbar is drawn.
export function updateHands() {
  syncBall();
}
