// Talk to The Boogler (the interact button, see talkTargets), and in the talk give him what you hold; or ride him (he hates it). Ride too long and he puffs up an orb that launches you off, then tells you off.
// Get launched too often and he runs when you come near.
//
// His memories are personal (src/boogler/memory.ts), saved in localStorage once per browser, shared by every room. Each player publishes
// bg = [act, wary] in presence for the server's brain. Reactions play locally on the press and are shared by
// validated server commands; friends receive a replicated event, never dialogue text.
import { FIXED, PLAYER_R } from '../constants.ts';
import { clamp } from '../math.ts';
import { background } from '../async.ts';
import { forEachContact, physicsTime } from '../physics/engine.ts';
import { me } from '../player/player.ts';
import { addPresenceField, onRemotePresence, sendPresence } from '../netplay/net.ts';
import { railwayCommands, onRailwayCommands } from '../entities/railway/state.ts';
import { railwayMirror } from '../world/game-world.ts';
import { boogler, booglerReact, ACT, MODE, PUFF_MS, W_R } from './boogler.ts';
import { booglerHearts, booglerPuff } from './fx.ts';
import { booglerSay, setTagWary, setTagPrompt } from './hud.ts';
import { dialogue, showDialogue, closeDialogue } from './dialogue.ts';
import { modalOpen } from '../player/modal.ts';
import { RIDE, RIDE_BAIL, FLEE } from './barks.ts';
import { createMemory, loadMemory, serializeMemory, kickedOff, rideLimit, isWary } from './memory.ts';
import { heldId, emptyHand } from '../player/inventory.ts';
import { GIFTS, giftIndex } from '../sim/gift-catalog.ts';
import { NO_TARGETS } from '../sim/interact-pick.ts';
import { guest } from '../guest/state.ts';
import type { BgRemote } from './boogler.ts';
import type { BooglerMemory } from './memory.ts';
import type { Talk } from './talk.ts';

const TALK_RANGE = 3.6; // metres from his centre
const LEAVE_RANGE = TALK_RANGE + 1;
const LAUNCH_UP = 10.5;
const LAUNCH_OUT = 5.5;
const RIDE_WARN = [0.35, 0.6, 0.82]; // fractions of his patience at which he complains (RIDE lines)
// Reserved: 0 NONE, 1 retired PET, 3 retired CELEBRATION. Never reuse these wire numbers.
const EV = { PAT: 2, PUFF: 4, LOVE: 5, YUCK: 6 };

let memory: BooglerMemory | null = null;
const storeKey = 'boogle.boogler'; // global: you are yours in every room (the old per-room keys are ignored)
function f() {
  if (memory) return memory;
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(storeKey);
  } catch {
    // storage unavailable: fresh memories that last until reload
  }
  memory = saved ? loadMemory(saved) : createMemory();
  return memory;
}
function save() {
  try {
    localStorage.setItem(storeKey, serializeMemory(f()));
  } catch {
    // storage unavailable; the memories last until reload
  }
}
const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;

// ---------------------------------------------------------------- presence and shared reactions
function play(kind: number, start = performance.now()) {
  if (kind === EV.PAT) booglerReact('pet');
  else if (kind === EV.PUFF) booglerPuff(start);
  else if (kind === EV.LOVE) {
    booglerReact('joy');
    booglerHearts();
  } else if (kind === EV.YUCK) booglerReact('grump');
}

function emit(kind: number, gift?: number) {
  play(kind);
  const session = railwayCommands();
  if (kind === EV.PUFF) session?.act('boogler.puff', { end: session.read.tickNow() + PUFF_MS / 100 });
  else session?.act('boogler.gift', { kind: gift });
}

let stopReactions: (() => void) | undefined;
onRailwayCommands((session) => {
  stopReactions?.();
  stopReactions = session
    ? railwayMirror?.boogler.onReact((e) => {
        if (e.kind !== EV.PUFF) return play(e.kind);
        const remaining = Math.min(PUFF_MS, (e.end! - session.read.tickNow()) * 100);
        if (remaining > 0) play(e.kind, performance.now() - (PUFF_MS - remaining));
      })
    : undefined;
});

// ---------------------------------------------------------------- distance
function dist() {
  if (!me.entered || !me.body) return Infinity;
  const p = me.body.interpolatedPosition;
  return Math.hypot(p.x - boogler.disp.x, p.z - boogler.disp.z);
}

// ---------------------------------------------------------------- riding
const ride = {
  lastOn: -1,
  t: 0,
  warned: 0,
  puffAt: 0,
  immuneUntil: 0,
  kickAt: 0,
  fly: null as { vx: number; vz: number; from: number; until: number } | null,
};
const riding = () => physicsTime() - ride.lastOn < 0.15 && performance.now() > ride.immuneUntil;

export function checkStandingOnBoogler() {
  const b = me.body,
    gb = boogler.body;
  if (!b || !gb) return;
  if (Math.hypot(b.position.x - gb.position.x, b.position.z - gb.position.z) > W_R + PLAYER_R + 0.5) return;
  forEachContact(b, (nx, ny, nz, other) => {
    if (other !== gb || ny <= 0.5) return false;
    ride.lastOn = physicsTime();
    return true;
  });
}
// Runs after the player's and The Boogler's own preSteps: move the rider with him, and keep a launch from being
// steered to a stop by air control.
export function carryBooglerRider() {
  const b = me.body,
    gb = boogler.body;
  if (!b || !gb) return;
  if (riding()) {
    b.position.x += gb.velocity.x * FIXED;
    b.position.z += gb.velocity.z * FIXED;
  }
  const fly = ride.fly;
  if (!fly) return;
  if (physicsTime() > fly.until || (physicsTime() > fly.from + 0.2 && me.coyote > 0)) ride.fly = null;
  else {
    b.velocity.x = fly.vx;
    b.velocity.z = fly.vz;
  }
}

function launch(now: number) {
  const b = me.body;
  if (!b) return;
  let dx = b.position.x - boogler.disp.x,
    dz = b.position.z - boogler.disp.z;
  let len = Math.hypot(dx, dz);
  if (len < 0.25) {
    dx = -Math.sin(boogler.disp.yaw);
    dz = -Math.cos(boogler.disp.yaw);
    len = 1;
  }
  const vx = (dx / len) * LAUNCH_OUT,
    vz = (dz / len) * LAUNCH_OUT;
  b.velocity.set(vx, LAUNCH_UP, vz);
  me.coyote = 0;
  me.jumpQueued = 0;
  ride.fly = { vx, vz, from: physicsTime(), until: physicsTime() + 1.1 };
  ride.immuneUntil = now + 1200;
  ride.lastOn = -1;
  kickedOff(f(), Date.now());
  save();
  ride.kickAt = now;
}

function updateRide(dt: number, now: number) {
  const on = riding();
  const limit = rideLimit(f(), Date.now());
  if (on && !ride.puffAt) {
    ride.t += dt;
    const frac = ride.t / limit;
    while (ride.warned < RIDE_WARN.length && frac >= RIDE_WARN[ride.warned]!) booglerSay(RIDE[ride.warned++]!, 1500);
    if (frac >= 1) {
      ride.puffAt = now;
      booglerSay(RIDE[RIDE.length - 1]!, PUFF_MS + 200);
      emit(EV.PUFF);
    }
  } else if (!on && !ride.puffAt) {
    ride.t = Math.max(0, ride.t - dt * 0.5);
    ride.warned = RIDE_WARN.filter((w) => ride.t / limit >= w).length;
  }
  if (ride.puffAt && now - ride.puffAt >= PUFF_MS) {
    ride.puffAt = 0;
    ride.t = 0;
    ride.warned = 0;
    if (physicsTime() - ride.lastOn < 0.4) launch(now);
    else booglerSay(RIDE_BAIL, 1500);
  }
  // Tell them off once they land (or after a moment, if they flew into the sea), not while the pause view is up.
  if (
    ride.kickAt &&
    !modalOpen() &&
    now - ride.kickAt > 400 &&
    (me.coyote > 0 || me.swimming || now - ride.kickAt > 2500)
  ) {
    ride.kickAt = 0;
    converse('kick');
  }
}

// ---------------------------------------------------------------- talking
// Talks are short and the island keeps playing around them, but you stand still while one is open (the shared talk
// input, src/player/conversation.ts): back (pad B, Esc), the close button, ending up more than LEAVE_RANGE away (a ball
// knocks you), hopping on him or the pause view end it (a kick-off telling-off waits for your answer, however far you
// flew).
// The conversations (talk.ts and its ~1,100 lines, lines.ts) are their own chunk: fetched right after start
// (loadTalk, at start), so they are there long before anyone reaches him; a talk opened sooner waits for them.
let talk: Talk | null = null;
let talkMod: Promise<typeof import('./talk.ts')> | null = null;
let talkApi: typeof import('./talk.ts') | null = null;
export const loadTalk = () => (talkMod ??= import('./talk.ts').then((m) => (talkApi = m)));

// He is offered whatever is in your hand, and takes it from there (one seed off a stack).
function giftList() {
  const id = heldId();
  return id ? [{ kind: giftIndex(id), label: GIFTS[giftIndex(id)]!.name }] : [];
}

function converse(start: 'menu' | 'kick'): boolean {
  if (modalOpen() || !me.entered) return false; // the talk box, or the pause view (src/player/modal.ts)
  if (!talkApi) {
    background(
      loadTalk().then(() => converse(start)),
      'boogler dialogue',
    );
    return true;
  }
  talk = talkApi.openTalk(f(), {
    now: Date.now(),
    name: me.name,
    rng: Math.random,
    start,
    mario: guest.active,
    gifts: giftList,
    give: (kind: number) => heldId() === GIFTS[kind]!.id && !!emptyHand(),
  });
  save();
  render();
  return true;
}

function render() {
  const v = talk && talkApi!.talkView(talk);
  if (!v) return hangUp();
  boogler.me.mood = v.mood;
  boogler.holdTalk(true);
  sendPresence();
  showDialogue(v, answer, leave);
}

// A line over his head, up long enough to read.
const sayFor = (line: string) => booglerSay(line, clamp(900 + line.length * 45, 1600, 4200));

function answer(i: number) {
  if (!talk || !talkApi) return;
  talk.ctx.now = Date.now();
  const out = talkApi.pickTalk(talk, i);
  save();
  if (out.gave) {
    const t = out.gave.taste;
    emit(t === 'love' || t === 'like' ? EV.LOVE : t === 'dislike' ? EV.YUCK : EV.PAT, out.gave.kind);
  }
  render();
  if (out.bubble) sayFor(out.bubble);
}

// Closed it (back: Esc, pad B; the close button) or ended up away from him: he bookmarks a story you left halfway and says bye.
function leave() {
  if (!talk) return hangUp();
  const line = talkApi!.leaveTalk(talk);
  save();
  hangUp();
  if (line) sayFor(line);
}

function hangUp() {
  boogler.holdTalk(false);
  sendPresence();
  talk = null;
  boogler.me.mood = null;
  closeDialogue();
}

export function booglerTalk() {
  if (!me.entered || dialogue.open || dist() > TALK_RANGE) return false;
  if (riding()) {
    booglerSay('Get off me first!', 1500);
    return true;
  }
  return converse('menu');
}

// His interactable (see registerInteractable in src/player/hands.ts; src/features/boogler.ts registers it). Range is to his
// middle; `r` makes the pick measure to his edge, so a ball at his feet does not win over him. Not while you ride him:
// on his back he is always nearest, and would hide the ball and everything else behind a Talk that only says "Get off
// me first!". The prompt shows in his name tag. While you talk it is Leave, so the touch main button walks away too
// (Esc and pad B already do, through the talk box) rather than throwing what you hold.
export function talkTargets() {
  if (!me.entered || riding() || (!dialogue.open && dist() > TALK_RANGE)) return NO_TARGETS;
  const target = { id: 'boogler', at: boogler.center, r: W_R, show: setTagPrompt };
  if (dialogue.open) return [{ ...target, verb: 'Leave', run: leave }];
  return [{ ...target, verb: 'Talk', run: booglerTalk }];
}

// ---------------------------------------------------------------- frame
let waryCheckAt = 0;
let fleeSayAt = 0;

addPresenceField('bg', () => (me.entered && me.body ? [boogler.me.act, boogler.me.wary ? 1 : 0] : null));
onRemotePresence((rr, pr) => {
  const r = rr as BgRemote;
  r.bg = Array.isArray(pr.bg) && pr.bg.length === 2 && pr.bg.every(Number.isInteger) ? (pr.bg as number[]) : null;
});

export function updateBooglerPlay(dt: number, now: number) {
  const previousAct = boogler.me.act,
    previousWary = boogler.me.wary;
  if (now >= waryCheckAt) {
    waryCheckAt = now + 1000;
    boogler.me.wary = isWary(f(), Date.now());
  }
  if (me.entered && me.body) updateRide(dt, now);
  boogler.me.act = dialogue.open ? ACT.TALK : riding() ? ACT.RIDE : ACT.NONE;
  if (previousAct !== boogler.me.act || previousWary !== boogler.me.wary) sendPresence();

  const d = dist();
  if (dialogue.open && (modalOpen() || riding() || (d > LEAVE_RANGE && talk?.ctx.start !== 'kick'))) leave();
  if (boogler.me.wary && boogler.disp.mode === MODE.FLEE && d < 8 && now > fleeSayAt) {
    fleeSayAt = now + 4000;
    booglerSay(pick(FLEE), 1200);
  }
  setTagWary(boogler.me.wary);
}
