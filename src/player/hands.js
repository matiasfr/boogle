// What your hands do with the hotbar (src/player/inventory.js), and the one interact button.
//
//   useDown/useUp            click, pad X: use what is in your hand. A thing (ball, frisbee, ...) winds up a throw and
//                            flies on release; the can pours, seeds go in at your feet. Empty hands
//                            interact.
//   interactDown/interactUp  E, pad B: act on interactTarget(), and only on it; nothing while a throw winds up, and the
//                            release never throws.
//   touchDown                the touch main button: acts on interactTarget() when it can, otherwise uses
//   throwDown                the touch Toss button: winds up a throw of what you hold (release with releaseThrow)
//   canThrow()               whether you hold anything (everything held can be thrown)
//   interactTarget()         the one thing in front of you (see below), or null; the touch main button acts on it too
//   useVerb()                what using the thing in your hand does ('Throw', 'Water', ...), null for empty hands
//   handsNote                { text, until }: why the last use did nothing, for the hotbar to show
//
// Interactables plug in, like actions in src/player/controls.js:
//
//   registerInteractable(fn)   fn() returns an array of targets in reach right now ([] for none). It is asked every
//                              frame (for the prompt, src/features/prompt.js) and on every press, so keep it cheap and
//                              do not cache. Register once, from your feature file in src/features/ (a module this
//                              file imports, like gifts.js, would make an import cycle).
//   target                     { id, verb, at, r?, run | blocked, show? }
//     id       a stable string per thing; the prompt pops in again when it changes
//     verb     the word on the prompt ('Pick up', 'Talk')
//     at       a world point (THREE.Vector3) where the prompt floats; its x, z also rank the pick
//     r        metres to measure to the edge of something big (The Boogler), default 0
//     run      () what the press does; or blocked: why it cannot ('Hotbar full'), shown greyed, and the press does nothing
//     show     (html) optional: draw the prompt yourself (The Boogler shows it in his name tag) instead of floating it at
//              `at`; called each frame with the prompt markup while this is the pick, and with '' once when it stops
//     Other fields are yours (gifts put the item id on theirs).
//
// The pick is src/sim/interact-pick.ts: something that would act beats something blocked, then nearest wins, with a
// nudge toward where you look. Ties go to the provider registered first.
//
// Thrown things other than the beach ball fly and land through src/adapters/gifts.js; the ball keeps its own physics.
import * as THREE from 'three';
import { me, cam } from './player.js';
import { startCharge, cancelCharge, chargeAmount, launch } from './throw.ts';
import { ball, ballInReach, remoteHoldsBall, grabBall, throwBall } from '../physics/ball.js';
import { heldId, take, useOne, drop, has, roomFor, onHotbarChange } from './inventory.js';
import { throwItem } from '../adapters/gifts.js';
import { plantTarget, plantFront, pour } from '../adapters/mushroom-garden.js';
import { giftIndex } from '../sim/gift-catalog.ts';
import { pickInteract } from '../sim/interact-pick.ts';

const USE_VERB = { can: 'Water', seeds: 'Plant' };
export const canThrow = () => !!heldId();
const ballAt = new THREE.Vector3();

// The ball's slot is whatever ball ownership says: thrown, stolen, respawned or dropped on a hidden tab, it leaves.
function syncBall() {
  const carried = ball.mine && ball.held;
  if (!carried && has('ball')) drop('ball');
  me.holding = carried && heldId() === 'ball';
}
onHotbarChange(() => {
  if (me.charging && !canThrow()) me.charging = false;
  syncBall();
});

// Grab first: the hotbar syncs the ball slot to ownership on every change.
function grabTheBall() {
  grabBall();
  take('ball');
  me.suppressUp = true;
}

const providers = [];
export function registerInteractable(fn) {
  providers.push(fn);
}

// The beach ball is the hands' own interactable.
registerInteractable(() => {
  if (!ballInReach() || (ball.mine && ball.held)) return [];
  const at = ballAt.copy(ball.disp.p).setY(ball.disp.p.y + 0.5);
  const t = { id: 'ball', verb: remoteHoldsBall() ? 'Steal' : 'Grab', at };
  return [roomFor('ball') < 0 ? { ...t, blocked: 'Hotbar full' } : { ...t, run: grabTheBall }];
});

export function interactTarget() {
  if (!me.entered || !me.body) return null;
  const p = me.body.interpolatedPosition;
  const targets = providers.flatMap((fn) => fn());
  return pickInteract(targets, p.x, p.z, -Math.sin(cam.yaw), -Math.cos(cam.yaw));
}

// Never mid-throw: the prompt hides while you wind up, and E must not act on something you cannot see.
function interact(t = interactTarget()) {
  if (me.charging || !t?.run) return false;
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
  if (!canThrow()) return false;
  me.suppressUp = false; // a fresh press winds up: its release throws, even if E grabbed the ball and is still down
  return startCharge();
}

function throwHeld(c) {
  const id = heldId();
  if (!id || !me.body) return;
  const { p, v } = launch(id, c);
  if (id === 'ball') return throwBall(p, v);
  useOne();
  if (!throwItem(giftIndex(id), p, v)) take(id);
}

export function releaseThrow() {
  if (me.suppressUp) {
    me.suppressUp = false;
    return;
  }
  if (!me.charging) return;
  cancelCharge();
  throwHeld(chargeAmount());
}

export function useDown() {
  if (!me.entered || !me.body) return false;
  const id = heldId();
  if (!id) return interact();
  if (id === 'can') return pour();
  if (id === 'seeds') return plantFront() || deny(plantTarget()?.text ?? '');
  return windUp();
}

export const useUp = releaseThrow;

export const interactDown = () => (me.entered && me.body ? interact() : false);
// E never throws. Its release only clears the guard grabTheBall set, so the next click release still throws.
export const interactUp = () => {
  me.suppressUp = false;
};
export function touchDown() {
  const t = interactTarget();
  return t?.run ? interact(t) : useDown();
}
export const throwDown = windUp;

export function useVerb() {
  const id = heldId();
  return id ? (USE_VERB[id] ?? 'Throw') : null;
}

// Every frame, before the hotbar is drawn.
export function updateHands() {
  syncBall();
}
