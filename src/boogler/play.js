// The Boogler as a friend: talk to him (the interact button, see talkTargets), and in the talk pet him and give him what
// you hold; or ride him (he hates it). Ride too long and he puffs up an orb that launches you off, then tells you off.
// Get launched too often and he runs when you come near.
//
// Friendship is personal (src/boogler/friendship.js), saved in localStorage per room. Each player publishes
// bg = [act, wary, ev, evN] in presence: the host's brain (src/boogler/boogler.js) reads act and wary, and every client plays
// ev on his model whenever that player's evN changes, so friends see the pets, hearts and launches too.
import { FIXED } from '../constants.js';
import { clamp } from '../math.js';
import { world as physics } from '../physics/physics.js';
import { me } from '../player/player.js';
import { remotes, getRoomId, addPresenceField, onRemotePresence } from '../netplay/net.js';
import { boogler, booglerReact, ACT, MODE, PUFF_MS, W_R } from './boogler.js';
import { booglerHearts, booglerPuff } from './fx.js';
import { booglerSay, setTagBond, setTagPrompt } from './hud.js';
import { dialogue, showDialogue, closeDialogue, dialogueReact } from './dialogue.js';
import { modalOpen } from '../player/modal.js';
import { LEVEL_UP, PET, RIDE, RIDE_BAIL, FLEE } from './barks.js';
import { bond, createFriend, loadFriend, serializeFriend, pet, kickedOff, rideLimit, isWary } from './friendship.js';
import { heldId, useOne } from '../player/inventory.js';
import { GIFTS, giftIndex } from '../sim/gift-catalog.js';

const TALK_RANGE = 3.6; // metres from his centre
const LEAVE_RANGE = TALK_RANGE + 1;
const LAUNCH_UP = 10.5;
const LAUNCH_OUT = 5.5;
const RIDE_WARN = [0.35, 0.6, 0.82]; // fractions of his patience at which he complains (RIDE lines)
const EV = { NONE: 0, PET: 1, PAT: 2, LEVEL: 3, PUFF: 4, LOVE: 5, YUCK: 6 };

let friend = null;
let storeKey = '';
function f() {
  if (friend) return friend;
  storeKey = `boogle.boogler.${getRoomId()}`;
  let saved = null;
  try {
    saved = localStorage.getItem(storeKey);
  } catch {
    // storage unavailable: a fresh friendship that lasts until reload
  }
  friend = saved ? loadFriend(saved) : createFriend();
  return friend;
}
function save() {
  try {
    localStorage.setItem(storeKey, serializeFriend(f()));
  } catch {
    // storage unavailable; the friendship lasts until reload
  }
}
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const named = (s) => s.replaceAll('{name}', me.name || 'friend');

// ---------------------------------------------------------------- presence and shared reactions
let ev = EV.NONE,
  evN = 0;

function play(kind) {
  if (kind === EV.PET) {
    booglerReact('pet');
    booglerHearts('pet');
  } else if (kind === EV.PAT) booglerReact('pet');
  else if (kind === EV.LEVEL) {
    booglerReact('joy');
    booglerHearts('level');
  } else if (kind === EV.PUFF) booglerPuff();
  else if (kind === EV.LOVE) {
    booglerReact('joy');
    booglerHearts('pet');
  } else if (kind === EV.YUCK) booglerReact('grump');
}

function emit(kind) {
  ev = kind;
  evN = (evN + 1) % 1000000;
  play(kind);
}

const seen = new Map(); // peer -> last evN played
function playRemoteEvents() {
  for (const r of remotes.values()) {
    if (!r.bg) continue;
    const prev = seen.get(r.peer);
    seen.set(r.peer, r.bg[3]);
    if (prev !== undefined && prev !== r.bg[3]) play(r.bg[2]);
  }
}

function celebrate(level) {
  emit(EV.LEVEL);
  const line = named(LEVEL_UP[level]);
  if (dialogue.open) dialogueReact({ line, mood: 'joy', hearts: true, bond: bond(f()) });
  else booglerSay(line, 3200);
}

// ---------------------------------------------------------------- distance
function dist() {
  if (!me.entered || !me.body) return Infinity;
  const p = me.body.interpolatedPosition;
  return Math.hypot(p.x - boogler.disp.x, p.z - boogler.disp.z);
}

// ---------------------------------------------------------------- riding
const ride = { lastOn: -1, t: 0, warned: 0, puffAt: 0, immuneUntil: 0, kickAt: 0, fly: null };
const riding = () => physics.time - ride.lastOn < 0.15 && performance.now() > ride.immuneUntil;

function installRidePhysics() {
  physics.addEventListener('postStep', () => {
    const b = me.body,
      gb = boogler.body;
    if (!b || !gb) return;
    for (const c of physics.contacts) {
      if (!((c.bi === b && c.bj === gb) || (c.bj === b && c.bi === gb))) continue;
      const ny = c.bi === b ? -c.ni.y : c.ni.y;
      if (ny > 0.5) {
        ride.lastOn = physics.time;
        return;
      }
    }
  });
  // Runs after the player's and The Boogler's own preSteps: move the rider with him, and keep a launch from being
  // steered to a stop by air control.
  physics.addEventListener('preStep', () => {
    const b = me.body,
      gb = boogler.body;
    if (!b || !gb) return;
    if (riding()) {
      b.position.x += gb.velocity.x * FIXED;
      b.position.z += gb.velocity.z * FIXED;
    }
    const fly = ride.fly;
    if (!fly) return;
    if (physics.time > fly.until || (physics.time > fly.from + 0.2 && me.coyote > 0)) ride.fly = null;
    else {
      b.velocity.x = fly.vx;
      b.velocity.z = fly.vz;
    }
  });
}

function launch(now) {
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
  ride.fly = { vx, vz, from: physics.time, until: physics.time + 1.1 };
  ride.immuneUntil = now + 1200;
  ride.lastOn = -1;
  kickedOff(f(), Date.now());
  save();
  ride.kickAt = now;
}

function updateRide(dt, now) {
  const on = riding();
  const limit = rideLimit(f(), Date.now());
  if (on && !ride.puffAt) {
    ride.t += dt;
    const frac = ride.t / limit;
    while (ride.warned < RIDE_WARN.length && frac >= RIDE_WARN[ride.warned]) booglerSay(RIDE[ride.warned++], 1500);
    if (frac >= 1) {
      ride.puffAt = now;
      booglerSay(RIDE[RIDE.length - 1], PUFF_MS + 200);
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
    if (physics.time - ride.lastOn < 0.4) launch(now);
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
// Talks are short and the game keeps playing around them: walk more than LEAVE_RANGE away, hop on him, or open the
// pause view and the talk ends (a kick-off telling-off waits for your answer, however far you flew).
// The conversations (talk.js and its ~1,100 lines, lines.js) are their own chunk: fetched right after start
// (setupBooglerPlay), so they are there long before anyone reaches him; a talk opened sooner waits for them.
let talk = null;
let talkMod = null;
let talkApi = null;
const loadTalk = () => (talkMod ??= import('./talk.js').then((m) => (talkApi = m)));

// He is offered whatever is in your hand, and takes it from there (one seed off a stack).
function giftList() {
  const id = heldId();
  return id ? [{ kind: giftIndex(id), label: GIFTS[giftIndex(id)].name }] : [];
}

function converse(start) {
  if (modalOpen() || !me.entered) return false; // the talk box, or the pause view (src/player/modal.js)
  if (!talkApi) {
    loadTalk().then(() => converse(start));
    return true;
  }
  talk = talkApi.openTalk(f(), {
    now: Date.now(),
    name: me.name,
    rng: Math.random,
    start,
    gifts: giftList,
    give: (kind) => heldId() === GIFTS[kind].id && !!useOne(),
  });
  render();
  return true;
}

function render() {
  const v = talk && talkApi.talkView(talk);
  if (!v) return hangUp();
  boogler.me.mood = v.mood;
  showDialogue(v, bond(f()), answer, leave, petInTalk);
}

// A line over his head, up long enough to read.
const sayFor = (line) => booglerSay(line, clamp(900 + line.length * 45, 1600, 4200));

function answer(i) {
  talk.ctx.now = Date.now();
  const out = talkApi.pickTalk(talk, i);
  save();
  if (out.gave) {
    const t = out.gave.taste;
    emit(t === 'love' || t === 'like' ? EV.LOVE : t === 'dislike' ? EV.YUCK : EV.PAT);
  }
  render();
  if (out.levelUp)
    celebrate(out.levelUp); // in the box, or as his bubble when this answer ended the talk
  else if (out.bubble) sayFor(out.bubble);
}

// Walked off, or closed it (Escape, E, pad B, the close button): he bookmarks a story you left halfway and says bye.
function leave() {
  if (!talk) return hangUp();
  const line = talkApi.leaveTalk(talk);
  save();
  hangUp();
  if (line) sayFor(line);
}

function hangUp() {
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

// His interactable (see registerInteractable in src/player/hands.js; src/features/boogler.js registers it). Range is to his
// middle; `r` makes the pick measure to his edge, so a ball at his feet does not win over him. Not while you ride him:
// on his back he is always nearest, and would hide the ball and everything else behind a Talk that only says "Get off
// me first!". The prompt shows in his name tag. While you talk it is Leave, so the touch main button walks away too
// (E and pad B already do, through the talk box) rather than throwing what you hold.
export function talkTargets() {
  if (!me.entered || riding()) return [];
  const target = { id: 'boogler', at: boogler.center, r: W_R, show: setTagPrompt };
  if (dialogue.open) return [{ ...target, verb: 'Leave', run: leave }];
  return dist() > TALK_RANGE ? [] : [{ ...target, verb: 'Talk', run: booglerTalk }];
}

function petInTalk() {
  const r = pet(f(), Date.now());
  save();
  emit(r.kind === 'happy' ? EV.PET : r.kind === 'wary' ? EV.YUCK : EV.PAT);
  dialogueReact({
    line: pick(PET[r.kind]),
    mood: r.kind === 'wary' ? 'grump' : 'joy',
    hearts: r.kind === 'happy',
    bond: bond(f()),
  });
  if (r.levelUp) celebrate(r.levelUp);
}

// ---------------------------------------------------------------- frame
let waryCheckAt = 0;
let fleeSayAt = 0;

export function setupBooglerPlay() {
  loadTalk();
  installRidePhysics();
  addPresenceField('bg', () => (me.entered && me.body ? [boogler.me.act, boogler.me.wary ? 1 : 0, ev, evN] : null));
  onRemotePresence((r, pr) => {
    r.bg = Array.isArray(pr.bg) && pr.bg.length === 4 && pr.bg.every(Number.isInteger) ? pr.bg : null;
  });
}

export function updateBooglerPlay(dt, now) {
  if (now >= waryCheckAt) {
    waryCheckAt = now + 1000;
    boogler.me.wary = isWary(f(), Date.now());
  }
  if (me.entered && me.body) updateRide(dt, now);
  boogler.me.act = dialogue.open ? ACT.TALK : riding() ? ACT.RIDE : ACT.NONE;
  playRemoteEvents();

  const d = dist();
  if (dialogue.open && (modalOpen() || riding() || (d > LEAVE_RANGE && talk?.ctx.start !== 'kick'))) leave();
  if (boogler.me.wary && boogler.disp.mode === MODE.FLEE && d < 8 && now > fleeSayAt) {
    fleeSayAt = now + 4000;
    booglerSay(pick(FLEE), 1200);
  }
  setTagBond(bond(f()).level, boogler.me.wary);
}
