// What your hands do with what they hold (src/player/inventory.ts), and the one interact button.
//
//   useDown/useUp            the main action (click, pad RT): use what is in your hand. A thing (ball, frisbee, ...)
//                            winds up a throw and flies on release; a bag of seeds sprouts mushrooms ahead of you. Empty
//                            hands act on the nearest `click` target, or do nothing.
//   interactDown/interactUp  E, pad X: prefer a target without `click`, then a click target with empty hands; nothing while a throw winds up,
//                            and the release never throws.
//   touchDown                the touch main button, the one button for both: acts on interactTarget() when it can;
//                            otherwise uses
//   mainVerb()               what touchDown would do, for the button's label
//   throwDown                the touch Toss button: winds up a throw of what you hold (release with releaseThrow)
//   canThrow()               whether you hold anything (everything held can be thrown), never in the live game
//   interactTarget()         the one thing in front of you (see below), or null; the touch main button acts on it too
//   useVerb()                what using the thing in your hand does ('Throw', 'Sprout'), null for empty hands or when
//                            it does nothing (a throw in the live game)
//   handsNote                { text, until }: why the last use did nothing, for src/features/held.ts to show
//   emptyHands               { down, up }: what using empty hands does; the guest's punch sets it. down returns true if
//                            it acted.
//                            Mouse, pad and the touch main button all reach it.
//   onInteractPress(fn)      fn(target, ran) on every interact press (not mid-throw): for press feedback in the HUD
//
// Interactables plug in, like actions in src/player/controls.ts:
//
//   registerInteractable(fn)   fn() returns an array of targets in reach right now (NO_TARGETS, a shared empty array,
//                              for none). It is asked once a frame (the hooks asking interactTarget() share one pick) and
//                              on every press, so keep it cheap, allocate only when something is in reach, and do not
//                              cache. Register once, from your feature file in src/features/ (a module this
//                              file imports, like gifts.ts, would make an import cycle).
//   target                     { id, verb, at, r?, run | blocked, show?, click? }
//     id       a stable string per thing; the prompt pops in again when it changes
//     verb     the word on the prompt ('Pick up', 'Talk')
//     at       a world point (THREE.Vector3) where the prompt floats; its x, z also rank the pick
//     r        metres to measure to the edge of something big (The Boogler), default 0
//     run      () what the press does; or blocked: why it cannot ('Full load'), shown greyed, and the press does nothing
//     click    the main action (click, pad RT) acts on it with empty hands; E/X use it only without an ordinary target
//     show     (html) optional: draw the prompt yourself (The Boogler shows it in his name tag) instead of floating it at
//              `at`; called each frame with the prompt markup while this is the pick, and with '' once when it stops
//     Other fields are yours (gifts put the item id on theirs).
//
// The pick is src/sim/interact-pick.ts: something that would act beats something blocked, then nearest wins, with a
// nudge toward where you look. Ties go to the provider registered first.
//
// Classic gift flights and landings were retired on 13 November. The ball keeps its own physics and can still be
// thrown on nonproduction entries; the production railway continues to offer no throw. Holding seeds and giving
// gifts to The Boogler remain local inventory interactions.
import * as THREE from 'three';
import { me, cam } from './state.ts';
import { startCharge, cancelCharge, chargeAmount, launch, releasePoint } from './throw.ts';
import { ball, ballInReach, grabBall, throwBall } from '../entities/ball/state.ts';
import { remoteHoldsBall } from '../entities/ball/state.ts';
import { heldId, take, emptyHand, drop, onHandChange, onLetGo } from './inventory.ts';
import { sprout } from '../adapters/mushrooms.ts';
import { pickInteract, NO_TARGETS, type InteractTarget } from '../sim/interact-pick.ts';
import { currentFrame } from '../loop.ts';
import { productionRailway } from '../proto/flags.ts';

export { NO_TARGETS };

/** Something the interact button can act on: a verb shown in the prompt, and run (or why it is blocked). */
export type Interactable = InteractTarget & {
  id: string;
  verb: string;
  at: THREE.Vector3;
  click?: boolean;
  show?: (html: string) => void; // draws the prompt itself (the Boogler's name tag); src/features/prompt.ts
  fadeAfter?: number; // seconds before the floating hint fades; the interaction stays available
  /** A second control shown over the prompt, for something another button does meanwhile (seated in a chair aboard a
   * train: Interact requests the stop, Jump stands you up). `action` is a control id for its glyph; the prompt only
   * shows it, the control's own handler does it. */
  also?: { action: string; verb: string };
};

const USE_VERB: Record<string, string> = { seeds: 'Sprout' };
const THROWS = !productionRailway;
export const canThrow = () => THROWS && heldId() === 'ball';
const ballAt = new THREE.Vector3();

// The ball is in your hand while ball ownership says so: thrown, stolen, respawned or dropped on a hidden tab, it leaves
// (and a wind-up of it stops, through onHandChange).
function syncBall() {
  if (!(ball.mine && ball.held)) drop('ball');
}
onHandChange(() => {
  if (me.charging && !canThrow()) me.charging = false;
  syncBall();
});

// A ball pushed out of your hand drops ahead through its own physics owner.
const DROP = { forward: 2.2, up: 3.2 }; // m/s
onLetGo((id) => {
  const p = releasePoint(id);
  const v = new THREE.Vector3(-Math.sin(cam.yaw) * DROP.forward, DROP.up, -Math.cos(cam.yaw) * DROP.forward);
  if (id === 'ball') throwBall(p, v);
});

// Grab first: every change of hand syncs the ball to ownership.
function grabTheBall() {
  grabBall();
  take('ball');
  me.suppressUp = true;
}

const providers: (() => Interactable[])[] = [];
export function registerInteractable(fn: () => Interactable[]) {
  providers.push(fn);
}

// The beach ball is the hands' own interactable.
registerInteractable(() => {
  if (!ballInReach() || (ball.mine && ball.held)) return NO_TARGETS;
  const at = ballAt.copy(ball.pose.p).setY(ball.pose.p.y + 0.5);
  return [{ id: 'ball', verb: remoteHoldsBall() ? 'Steal' : 'Grab', at, run: grabTheBall }];
});

const targets: Interactable[] = []; // reused by every pick
// by: 'click' keeps only click targets, 'press' only the others; both for the prompt and the touch main button.
function pickNow(by: 'click' | 'press' | 'both' = 'both') {
  if (!me.entered || !me.body) return null;
  const p = me.body.interpolatedPosition;
  targets.length = 0; // (a provider that threw last time left some)
  for (let k = 0; k < providers.length; k++) {
    const some = providers[k]!();
    for (let m = 0; m < some.length; m++) {
      const t = some[m]!;
      if (by === 'both' || !!t.click === (by === 'click')) targets.push(t);
    }
  }
  const t = pickInteract(targets, p.x, p.z, -Math.sin(cam.yaw), -Math.cos(cam.yaw));
  targets.length = 0;
  return t;
}
// Asked by several hooks each frame (the gift highlight, the prompt, the touch button): within a frame they share one
// pick, so the providers run once per frame. Outside a frame (a key press) it picks afresh.
let pickFrame = 0;
let picked: Interactable | null = null;
export function interactTarget() {
  const f = currentFrame();
  if (!f || f !== pickFrame) {
    picked = pressTarget();
    pickFrame = f;
  }
  return picked;
}

// Never mid-throw: the prompt hides while you wind up, and E must not act on something you cannot see.
const pressed: ((t: Interactable | null, ran: boolean) => void)[] = [];
export const onInteractPress = (fn: (t: Interactable | null, ran: boolean) => void) => void pressed.push(fn);
function interact(t = interactTarget()) {
  if (me.charging) return false;
  for (const fn of pressed) fn(t, !!t?.run);
  if (!t?.run) return false;
  t.run();
  pickFrame = 0; // what is in reach may have changed
  return true;
}

export const handsNote = { text: '', until: 0 };
function deny(text: string) {
  handsNote.text = text;
  handsNote.until = performance.now() + 1400;
  return false;
}

function windUp() {
  if (!canThrow()) return false;
  me.suppressUp = false; // a fresh press winds up: its release throws, even if E grabbed the ball and is still down
  return startCharge();
}

function throwHeld(c: number) {
  const id = heldId();
  if (id !== 'ball' || !me.body) return;
  const { p, v } = launch(id, c);
  throwBall(p, v);
}

export const emptyHands: { down: () => boolean; up: () => void } = { down: () => false, up: () => {} };

export function releaseThrow() {
  emptyHands.up();
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
  if (!id) {
    const t = me.charging ? null : pickNow('click');
    return t ? interact(t) : emptyHands.down();
  }
  if (id === 'seeds') return sprout() ? !!emptyHand() : deny("Can't grow here");
  return windUp();
}

export const useUp = releaseThrow;

// Even a blocked ordinary target wins: pressing beside a full station must not chop the tree behind it.
function pressTarget() {
  return pickNow('press') ?? (heldId() ? null : pickNow('click'));
}
export const interactDown = () => (me.entered && me.body ? interact(pressTarget()) : false);
// E never throws. Its release only clears the guard grabTheBall set, so the next click release still throws.
export const interactUp = () => {
  me.suppressUp = false;
};
export function touchDown() {
  const t = me.charging ? null : pressTarget();
  return t ? interact(t) : useDown();
}
export const throwDown = windUp;

export function useVerb() {
  const id = heldId();
  return id ? (USE_VERB[id] ?? (canThrow() ? 'Throw' : null)) : null;
}

export const mainVerb = () => (me.charging ? null : interactTarget())?.verb ?? useVerb() ?? 'Grab';

// Every frame, before what you hold is drawn.
export function updateHands() {
  syncBall();
}
