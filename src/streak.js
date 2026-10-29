// Co-op keepy-uppy streak.
//
// Rules:
// - A touch counts when someone catches (grabs) or bumps (walks into) the ball while it is FREE and AIRBORNE.
//   Free = nobody is holding it, so stealing a held ball never counts, and holding the ball can't be farmed:
//   you have to throw it (or let it fly) and catch it again. Any player counts, including the same one twice.
// - The streak ends when the free ball touches the ground or the sea, or on respawn (R).
// - The ball owner owns the streak. It rides in the ball presence (pr.b.k), so it moves with ownership:
//   a new owner continues from the previous owner's value + 1. Everyone displays the owner's value.
// - Best: the host is authoritative. A client whose streak ends sends { t: 'streak', n }; the host keeps the max,
//   publishes it as pr.best and saves it to localStorage. Clients show the max best they have seen.
import { BALL_R, SEA, reducedMotion } from './constants.js';
import { groundHeight } from './terrain.js';
import { ball } from './ball.js';
import { net, remotes, getRoomId } from './net.js';

const MAX = 9999;
const AIR_CLEARANCE = 0.2; // ball bottom must be this far above ground/sea to count as airborne
const LAND_CLEARANCE = 0.08; // at or below this the ball has landed

export const streak = { k: 0, best: 0, skip: false };

const clean = (n) => (Number.isInteger(n) && n >= 0 && n <= MAX ? n : 0);
const bestKey = () => `boogle.best.${getRoomId()}`;

function surface(x, z) {
  return Math.max(groundHeight(x, z), SEA);
}

// ---------------------------------------------------------------- best
let loaded = false;
function loadBest() {
  loaded = true;
  try {
    streak.best = Math.max(streak.best, clean(parseInt(localStorage.getItem(bestKey()) ?? '', 10)));
  } catch {
    // storage unavailable
  }
}

function recordBest(n) {
  n = clean(n);
  if (n <= streak.best) return;
  streak.best = n;
  // TODO: when host persistence lands, this moves into the host snapshot instead of localStorage.
  if (net.room?.isHost()) {
    try {
      localStorage.setItem(bestKey(), String(n));
    } catch {
      // storage unavailable
    }
  }
}

export function noteBest(n) {
  if (Number.isInteger(n) && n > streak.best && n <= MAX) streak.best = n;
}

export function bestForPresence() {
  return net.room?.isHost() && streak.best > 0 ? streak.best : null;
}

export function attachStreak(room) {
  loadBest();
  room.onMessage((msg) => {
    if (msg?.t === 'streak' && room.isHost()) {
      recordBest(msg.n);
      net.room?.presence({ best: streak.best }).catch(() => {});
    }
  });
}

function reportEnd(n) {
  if (n < 1) return;
  recordBest(n);
  if (net.room && !net.room.isHost()) net.room.send({ t: 'streak', n: clean(n) });
}

// ---------------------------------------------------------------- hooks (called from ball.js)
function ownerValue() {
  if (ball.mine) return streak.k;
  return clean(ball.owner?.remote?.ball?.k);
}

// Called when this tab is about to take (or re-grab) the ball. Sets streak.k for the new owner.
export function onTouch() {
  if (streak.skip) {
    streak.skip = false;
    streak.k = 0;
    return;
  }
  const prev = ownerValue();
  const hasOwner = !!ball.owner;
  const free = !ball.held;
  const airborne = ball.disp.p.y - BALL_R > surface(ball.disp.p.x, ball.disp.p.z) + AIR_CLEARANCE;
  if (!hasOwner) streak.k = 0;
  else if (free && airborne) streak.k = Math.min(MAX, prev + 1);
  else streak.k = prev;
}

// R pressed: end the streak and make the next claim start fresh.
export function onRespawn() {
  const n = ownerValue();
  if (n) reportEnd(n);
  streak.k = 0;
  streak.skip = true;
}

// ---------------------------------------------------------------- per frame
let shown = 0,
  lastShown = -1,
  flashUntil = 0,
  bestBefore = 0,
  celebrated = false;
const el = {};
function dom() {
  if (el.root) return el;
  el.root = document.getElementById('streak');
  el.num = document.getElementById('streak-num');
  el.best = document.getElementById('streak-best');
  return el;
}

function pop(node, cls) {
  if (reducedMotion) return;
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
}

export function updateStreak(now) {
  if (!loaded) loadBest();
  // Owner detects the end: free ball touching ground or sea.
  if (ball.mine && streak.k > 0 && !ball.held) {
    const p = ball.body.position;
    if (p.y - BALL_R <= surface(p.x, p.z) + LAND_CLEARANCE) {
      reportEnd(streak.k);
      streak.k = 0;
    }
  }
  for (const r of remotes.values()) noteBest(r.best);

  const v = ball.owner ? ownerValue() : 0;
  const d = dom();
  if (!d.root) return;
  if (v !== lastShown) {
    if (v > lastShown && v >= 2) pop(d.num, 'pop');
    if (v === 0 || v < lastShown) {
      celebrated = false;
      bestBefore = streak.best;
    }
    if (v >= 3 && v > bestBefore && !celebrated) {
      celebrated = true;
      flashUntil = now + 1800;
      pop(d.root, 'flash');
    }
    lastShown = v;
    shown = v;
    d.num.textContent = `×${v}`;
  }
  d.root.classList.toggle('on', shown >= 2);
  d.root.classList.toggle('record', shown >= 3 && shown > bestBefore);
  if (flashUntil && now > flashUntil) {
    flashUntil = 0;
    d.root.classList.remove('flash');
  }
  const best = Math.max(streak.best, shown >= 3 ? shown : 0);
  d.best.hidden = best < 1;
  const text = `Best ${best}`;
  if (d.best.textContent !== text) d.best.textContent = text;
}
