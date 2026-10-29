// The Boogler as a friend: pet him, talk to him, give him presents, and ride him (he hates it). Ride too long and he
// puffs up an orb that launches you off, then tells you off. Get launched too often and he runs when you come near.
//
// Friendship is personal (src/boogler-friendship.js), saved in localStorage per room. Each player publishes
// bg = [act, wary, ev, evN] in presence: the host's brain (src/boogler.js) reads act and wary, and every client plays
// ev on his model whenever that player's evN changes, so friends see the pets, hearts and launches too.
import { FIXED, isTouch } from './constants.js';
import { world as physics } from './physics.js';
import { me } from './player.js';
import { remotes, getRoomId, addPresenceField, onRemotePresence } from './net.js';
import { registerAction } from './controls.js';
import { boogler, booglerReact, ACT, MODE, PUFF_MS } from './boogler.js';
import { booglerHearts, booglerPuff } from './boogler-fx.js';
import { booglerSay, setTagBond } from './boogler-hud.js';
import { dialogue, showDialogue, closeDialogue } from './boogler-dialogue.js';
import { openTalk, talkView, pickTalk } from './boogler-talk.js';
import { LEVEL_UP, PET, RIDE, RIDE_BAIL, FLEE } from './boogler-lines.js';
import {
  bond,
  createFriend,
  loadFriend,
  serializeFriend,
  pet,
  kickedOff,
  rideLimit,
  isWary,
} from './boogler-friendship.js';
import { pocketItems, takeFromPocket } from './gifts.js';
import { seedCount, giveSeed } from './mushroom-garden.js';
import { giftIndex } from './sim/gift-catalog.js';

const PET_RANGE = 2.6; // metres from his centre
const TALK_RANGE = 3.6;
const LAUNCH_UP = 10.5;
const LAUNCH_OUT = 5.5;
const RIDE_WARN = [0.35, 0.6, 0.82]; // fractions of his patience at which he complains (RIDE lines)
const EV = { NONE: 0, PET: 1, PAT: 2, LEVEL: 3, PUFF: 4, LOVE: 5, YUCK: 6 };
const SEEDS = giftIndex('seeds');

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
  booglerSay(named(LEVEL_UP[level]), 3200);
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
  // Tell them off once they land (or after a moment, if they flew into the sea).
  if (ride.kickAt && now - ride.kickAt > 400 && (me.coyote > 0 || me.swimming || now - ride.kickAt > 2500)) {
    ride.kickAt = 0;
    converse('kick');
  }
}

// ---------------------------------------------------------------- talking
let talk = null;

function giftList() {
  const list = seedCount() ? [{ kind: SEEDS, label: 'mushroom seed' }] : [];
  for (const g of pocketItems()) if (!list.some((x) => x.kind === g.kind)) list.push(g);
  return list;
}

function converse(start) {
  if (dialogue.open || !me.entered) return false;
  talk = openTalk(f(), {
    now: Date.now(),
    name: me.name,
    rng: Math.random,
    start,
    gifts: giftList,
    give: (kind) => (kind === SEEDS ? giveSeed() : takeFromPocket(kind)),
  });
  render();
  return true;
}

function render() {
  const v = talk && talkView(talk);
  if (!v) return hangUp();
  boogler.me.mood = v.mood;
  showDialogue(v, bond(f()), answer, hangUp);
}

function answer(i) {
  talk.ctx.now = Date.now();
  const out = pickTalk(talk, i);
  save();
  if (out.gave) {
    const t = out.gave.taste;
    emit(t === 'love' || t === 'like' ? EV.LOVE : t === 'dislike' ? EV.YUCK : EV.PAT);
  }
  if (out.levelUp) celebrate(out.levelUp);
  render();
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

// ---------------------------------------------------------------- petting (click / E, see src/input.js)
let petUntil = 0;
export function booglerAction() {
  if (!me.entered || !me.body || dialogue.open || riding() || dist() > PET_RANGE) return false;
  const r = pet(f(), Date.now());
  save();
  petUntil = performance.now() + 1200;
  emit(r.kind === 'happy' ? EV.PET : r.kind === 'wary' ? EV.YUCK : EV.PAT);
  booglerSay(pick(PET[r.kind]), 1300);
  if (r.levelUp) celebrate(r.levelUp);
  return true;
}

export function booglerHint() {
  if (!me.entered || !me.body || dialogue.open) return null;
  if (riding()) return { text: "You're riding The Boogler. He won't put up with it for long!" };
  const d = dist();
  if (d < PET_RANGE) {
    if (isTouch) return { text: 'Tap Pet to pet The Boogler, or Talk to chat', button: 'Pet' };
    return { text: `Click to pet · C to talk${giftList().length ? ' or give a present' : ''}`, button: 'Pet' };
  }
  if (d < TALK_RANGE) return { text: isTouch ? 'Tap Talk to chat with The Boogler' : 'C to talk to The Boogler' };
  if (boogler.me.wary && d < 10)
    return { text: 'The Boogler is avoiding you. Catch him and say sorry, or bring a present.' };
  return null;
}

// ---------------------------------------------------------------- frame
let waryCheckAt = 0;
let fleeSayAt = 0;

export function setupBooglerPlay() {
  installRidePhysics();
  addPresenceField('bg', () => (me.entered && me.body ? [boogler.me.act, boogler.me.wary ? 1 : 0, ev, evN] : null));
  onRemotePresence((r, pr) => {
    r.bg = Array.isArray(pr.bg) && pr.bg.length === 4 && pr.bg.every(Number.isInteger) ? pr.bg : null;
  });
  addEventListener('keydown', (e) => {
    if (!me.entered || e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.target?.tagName === 'INPUT') return;
    if (e.code === 'KeyC') booglerTalk();
  });
  registerAction('talk', { pad: 'right', label: 'Talk to The Boogler', down: booglerTalk });
  const touch = document.getElementById('touch');
  if (touch) {
    const btn = document.createElement('button');
    btn.className = 'tbtn talk';
    btn.type = 'button';
    btn.textContent = 'Talk';
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      booglerTalk();
    });
    touch.append(btn);
  }
}

export function updateBooglerPlay(dt, now) {
  if (now >= waryCheckAt) {
    waryCheckAt = now + 1000;
    boogler.me.wary = isWary(f(), Date.now());
  }
  if (me.entered && me.body) updateRide(dt, now);
  boogler.me.act = dialogue.open ? ACT.TALK : riding() ? ACT.RIDE : now < petUntil ? ACT.PET : ACT.NONE;
  playRemoteEvents();

  const d = dist();
  if (boogler.me.wary && boogler.disp.mode === MODE.FLEE && d < 8 && now > fleeSayAt) {
    fleeSayAt = now + 4000;
    booglerSay(pick(FLEE), 1200);
  }
  setTagBond(bond(f()).level, boogler.me.wary);
  document.body.classList.toggle('near-boogler', d < TALK_RANGE && !dialogue.open);
}
