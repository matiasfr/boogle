// The little guys you can talk to, and how the town notices things without you asking. Who says what is ./town-lines.ts; who
// stands where is `CAST`. Selection follows docs/research/town-interiors.md, "Growth changes a relationship": what you asked,
// then your first meeting, then the newest thing that's changed, then an ordinary line. Each player's seen lines are their own,
// and a newcomer hears about what's there now, not a backlog.
//
// Barks: a short line in a bubble over someone's head when you walk in or pass by, so growth reaches you with no talk to open:
// on the door of a room, or from a stroller in the street once the town's changed. At most one at a time. Local.
import * as THREE from 'three/webgpu';
import { angleLerp } from '../../math.ts';
import { conversation } from '../../player/conversation.ts';
import { isFirstVisit } from '../../player/arrival.ts';
import { NO_TARGETS, interactTarget, registerInteractable, type Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { playMark } from '../mark.ts';
import { pageQuery } from '../flags.ts';
import { camera } from '../../render/scene.ts';
import { rayHit, raycastClosest } from '../../physics/engine.ts';
import { GROUP } from '../../physics/physics.ts';
import type { VoiceSpec } from '../../render/npc-voice.ts';
import { pullOn } from './celebrate.ts';
import { babble } from './chatter.ts';
import { addGreeter, addResident, folk, type Guy, type Mood } from './folk.ts';
import { showing } from './gifts.ts';
import { newestFact } from './growth.ts';
import { job, personalSlice, save } from './job.ts';
import { VILLAGE, toWorld, type RoomId } from './layout.ts';
import { indoors, onRoom, roomToWorld, rooms, type Room } from './rooms.ts';
import { endTalk, startTalk, type Answer, type Beat } from './talk.ts';
import { SHORE_COAST, SHORE_WORKER, SHORE_WORKER_LOOK } from './shore-layout.ts';
import {
  BYE,
  GO_ON,
  RESIDENTS,
  RUMOUR_ASK,
  SHORE_ASK,
  STREET_NOTICE,
  STREET_RUMOURS,
  type Fact,
  type ResidentId,
} from './town-lines.ts';

type Cast = {
  room: RoomId;
  x: number;
  z: number;
  yaw: number;
  act: Mood;
  color: string;
  voice: VoiceSpec;
  up?: number; // stands on something, so you can see them over the furniture
};
const voice = (baseHz: number, cps: number, formantScale: number, brightnessHz: number): VoiceSpec => ({
  baseHz,
  rangeSemis: 3,
  formantScale,
  brightnessHz,
  cps,
  grainMs: [55, 85],
  vowels: [0.3, 0.15, 0.2, 0.25, 0.1],
});
/** Room space; `yaw` 0 faces the door. Fixed spots, out of the way of the door: nobody has to walk round a shared little guy. */
export const CAST: Record<ResidentId, Cast> = {
  pip: {
    room: 'house',
    x: 1.6,
    z: -3.0,
    yaw: 0,
    act: 'hammer',
    up: 0.38,
    color: '#3f8ee0',
    voice: voice(330, 34, 1.25, 4200),
  },
  button: {
    room: 'shop',
    x: -3.0,
    z: -3.3,
    yaw: 0,
    act: 'idle',
    up: 0.48,
    color: '#e4574a',
    voice: voice(285, 40, 1.15, 3800),
  },
  nell: {
    room: 'shop',
    x: -2.75,
    z: 2.3,
    yaw: -1.57,
    act: 'idle',
    color: '#a569e0',
    voice: voice(370, 30, 1.3, 4400),
  },
  moss: { room: 'museum', x: -4.6, z: 4.4, yaw: 0.9, act: 'idle', color: '#42b887', voice: voice(240, 26, 1.05, 3200) },
  wren: {
    room: 'museum',
    x: 3.2,
    z: -2.1,
    yaw: -0.75,
    act: 'idle',
    color: '#f0c030',
    voice: voice(350, 42, 1.28, 4300),
  },
};
const IDS = Object.keys(CAST) as ResidentId[];
const V = new THREE.Vector3();
export const guys = {} as Record<ResidentId, Guy>;
for (const id of IDS) {
  const c = CAST[id],
    r = rooms[c.room];
  roomToWorld(r, c.x, 0, c.z, V);
  guys[id] = addResident(V.x, V.y + (c.up ?? 0), V.z, r.yaw + c.yaw, c.act, c.color);
}
const inRoom = (r: Room) => IDS.filter((id) => CAST[id].room === r.id);
const shoreWorker = SHORE_COAST ? addGreeter(toWorld(SHORE_WORKER.x), VILLAGE.y, SHORE_WORKER.z) : null;
const shoreLine = SHORE_COAST && pageQuery().get('greeting') !== 'off';
let shoreGesture = -1;
let shoreTalking = false;
const shorePrompt = new THREE.Vector3();
const shoreSight = rayHit();

// ---------------------------------------------------------------- what each of you remembers
const seen = {
  met: {} as Partial<Record<ResidentId, boolean>>,
  noticed: {} as Partial<Record<ResidentId, Fact>>,
  said: {} as Partial<Record<ResidentId, number>>,
  rumour: {} as Partial<Record<ResidentId, number>>,
  hello: {} as Partial<Record<ResidentId, boolean>>,
  street: null as Fact | null,
  streetRumour: 0,
  // A reload on the walk retains eligibility; an ordinary returning player doesn't acquire it.
  shoreNewcomer: SHORE_COAST && isFirstVisit(),
  shoreAsk: false,
};
personalSlice('town', {
  get: () => seen,
  set: (v) => {
    const j = (v ?? {}) as Partial<typeof seen>;
    seen.met = j.met ?? {};
    seen.noticed = j.noticed ?? {};
    seen.said = j.said ?? {};
    seen.rumour = j.rumour ?? {};
    seen.hello = j.hello ?? {};
    seen.street = j.street ?? null;
    seen.streetRumour = typeof j.streetRumour === 'number' ? j.streetRumour : 0;
    seen.shoreNewcomer = j.shoreNewcomer === true;
    seen.shoreAsk = j.shoreAsk === true;
  },
});
const turn = (list: string[], book: Partial<Record<ResidentId, number>>, id: ResidentId) => {
  const n = book[id] ?? 0;
  book[id] = n + 1;
  return list[n % list.length]!;
};
/** What they've got to say about the town that you haven't heard, newest first. Only the newest counts: no backlog. */
function noticeFor(id: ResidentId): [Fact, string] | null {
  const f = newestFact();
  if (!f || seen.noticed[id] === f) return null;
  const say = RESIDENTS[id].notice[f];
  return say ? [f, say] : null;
}

// ---------------------------------------------------------------- talking
function menu(id: ResidentId, say: string, asked: Set<string>): Beat {
  const L = RESIDENTS[id];
  const answers: Answer[] = [];
  for (const q of L.asks)
    if (!asked.has(q.ask))
      answers.push({
        label: q.ask,
        then: () => {
          asked.add(q.ask);
          return { ...menu(id, q.say, asked), whole: true };
        },
      });
  answers.push({
    label: RUMOUR_ASK,
    then: () => {
      playMark('rumour heard', { who: id });
      return menu(id, turn(L.rumour, seen.rumour, id), asked);
    },
  });
  answers.push({ label: BYE, then: () => null });
  return { say, answers };
}
function panels(id: ResidentId, lines: string[], k: number, asked: Set<string>): Beat {
  if (k >= lines.length - 1) return menu(id, lines[k]!, asked);
  return { say: lines[k]!, answers: [{ label: GO_ON, then: () => panels(id, lines, k + 1, asked) }] };
}
function open(id: ResidentId) {
  const L = RESIDENTS[id],
    g = guys[id],
    asked = new Set<string>();
  let first: Beat;
  if (!seen.met[id]) {
    seen.met[id] = true;
    first = panels(id, L.intro, 0, asked);
  } else {
    const n = noticeFor(id);
    if (n) {
      seen.noticed[id] = n[0];
      playMark('resident noticed', { who: id, what: n[0] });
      first = menu(id, n[1], asked);
    } else first = menu(id, turn(L.ordinary, seen.said, id), asked);
  }
  g.chat = 1;
  const started = startTalk(
    { name: L.name, voice: CAST[id].voice, x: g.x, z: g.z, color: `#${g.tint!.getHexString()}` },
    first,
    () => {
      g.chat = 0;
    },
  );
  if (!started) return void (g.chat = 0);
  playMark('talked to resident', { who: id });
}
const prompts = new Map<ResidentId, THREE.Vector3>();
registerInteractable(() => {
  const b = me.body;
  if (!b) return NO_TARGETS;
  const p = b.interpolatedPosition;
  let out: Interactable[] | null = null;
  for (const id of IDS) {
    const g = guys[id];
    if (!g.on || Math.hypot(p.x - g.x, p.z - g.z) > 3.3 || Math.abs(p.y - (g.fy ?? g.y)) > 3) continue;
    let at = prompts.get(id);
    if (!at) prompts.set(id, (at = new THREE.Vector3()));
    at.set(g.x, (g.fy ?? g.y) + 1.5, g.z);
    (out ??= []).push({ id: `place-talk-${id}`, verb: 'Talk', at, run: () => open(id) });
  }
  if (
    shoreWorker &&
    shoreLine &&
    !job.awake &&
    !indoors.room &&
    Math.hypot(p.x - shoreWorker.x, p.z - shoreWorker.z) < 3.3 &&
    Math.abs(p.y - VILLAGE.y) < 3
  ) {
    shorePrompt.set(shoreWorker.x, VILLAGE.y + 1.5, shoreWorker.z);
    (out ??= []).push({
      id: 'place-talk-shore',
      verb: 'Talk',
      at: shorePrompt,
      run: () => {
        if (job.awake) return;
        stopBark();
        const started = startTalk(
          { name: 'Worker', voice: CAST.pip.voice, x: shoreWorker.x, z: shoreWorker.z, color: '#f0c030' },
          { say: SHORE_ASK, answers: [{ label: BYE, then: () => null }] },
          () => {
            shoreTalking = false;
          },
        );
        if (started) {
          shoreTalking = true;
          seen.shoreNewcomer = false;
          heardShoreAsk('talk');
        }
      },
    });
  }
  return out ?? NO_TARGETS;
});

// ---------------------------------------------------------------- barks
const BARK = { minS: 2.6, maxS: 6, perWord: 0.34, streetEvery: [70, 120] as const, streetReach: 7, gap: 2.5 };
const bubble = document.createElement('div');
bubble.className = 'place-bark';
(document.querySelector('.hud') ?? document.body).append(bubble);
let barker: Guy | null = null,
  barkLeft = 0,
  lineNo = 0,
  shouting = false, // heard wherever you're looking: said to you, from behind you
  barkGap = 0,
  streetIn: number = BARK.streetEvery[0];
const wasChat = new Map<Guy, 0 | 1 | 2>();
function bark(g: Guy, text: string, shout = false) {
  stopBark();
  barker = g;
  shouting = shout;
  barkLeft = Math.min(BARK.maxS, Math.max(BARK.minS, text.split(/\s+/).length * BARK.perWord));
  bubble.textContent = text;
  bubble.classList.add('on');
  wasChat.set(g, g.chat);
  g.chat = 1;
  babble(lineNo++, g.k, g.x, g.z);
}
function stopBark() {
  if (!barker) return;
  barker.chat = wasChat.get(barker) ?? 0;
  wasChat.delete(barker);
  barker = null;
  bubble.classList.remove('on');
  barkGap = BARK.gap;
}
/** Someone who lives here says this now. */
export const residentSay = (id: ResidentId, text: string) => bark(guys[id], text, true);
const pending: { id: ResidentId; text: string; at: number; fact: Fact | null }[] = [];
onRoom((r, inside) => {
  if (!inside) return;
  playMark(`entered building ${r.id}`);
  // Whoever's in the room looks up: what's changed if something has, or hello the first time. One line, by the first who has one.
  for (const id of inRoom(r)) {
    const n = noticeFor(id);
    if (n && seen.met[id]) {
      seen.noticed[id] = n[0];
      pending.push({ id, text: n[1], at: performance.now() + 1100, fact: n[0] });
      return;
    }
  }
  for (const id of inRoom(r)) {
    const hello = RESIDENTS[id].hello;
    if (hello && !seen.hello[id]) {
      seen.hello[id] = true;
      pending.push({ id, text: hello, at: performance.now() + 900, fact: null });
      return;
    }
  }
});
const VX = toWorld(VILLAGE.x);
const screen = new THREE.Vector3();
function inView(x: number, y: number, z: number, margin: number, includeNear = false) {
  screen.set(x, y, z).project(camera);
  // The shore approach includes its clip edges; the existing bark tests use open screen/far edges.
  return includeNear
    ? !(screen.z < -1 || screen.z > 1 || Math.abs(screen.x) > margin || Math.abs(screen.y) > margin)
    : screen.z < 1 && Math.abs(screen.x) < margin && Math.abs(screen.y) < margin;
}
function heardShoreAsk(via: 'bark' | 'talk') {
  if (seen.shoreAsk) return;
  playMark('ask heard', { via });
  seen.shoreAsk = true;
  save();
}
/** Per-person presentation only: the railway never waits for this invitation. */
function shoreGreeting(dt: number) {
  const g = shoreWorker;
  if (!g) return;
  if (job.awake) {
    // Also cancels a step-out or bubble if a partner wakes it during the approach.
    seen.shoreNewcomer = false;
    shoreGesture = -1;
    g.mood = 'idle';
    if (barker === g) stopBark();
    if (shoreTalking) endTalk();
    return;
  }
  const b = me.body;
  if (!b) return;
  if (shoreGesture < 0) {
    if (!seen.shoreNewcomer || me.down || me.swimming || me.coyote <= 0 || conversation.open || barker || indoors.room)
      return;
    if (Math.hypot(b.position.x - g.x, b.position.z - g.z) > 6 || Math.abs(b.position.y - VILLAGE.y) > 3) return;
    if (!inView(g.x, VILLAGE.y + 0.7, g.z, 0.85, true)) return;
    shorePrompt.set(g.x, VILLAGE.y + 0.7, g.z);
    if (raycastClosest(camera.position, shorePrompt, { mask: GROUP.SCENERY }, shoreSight)) return;
    seen.shoreNewcomer = false;
    shoreGesture = 0;
  }
  const was = shoreGesture;
  shoreGesture += dt;
  g.x = toWorld(SHORE_WORKER.x) - 1.5 * Math.min(1, shoreGesture / 0.9);
  const yaw =
    shoreGesture < 2.6
      ? Math.atan2(b.position.x - g.x, b.position.z - g.z)
      : Math.atan2(toWorld(SHORE_WORKER_LOOK.x) - g.x, SHORE_WORKER_LOOK.z - g.z);
  g.yaw = angleLerp(g.yaw, yaw, Math.min(1, dt * 5));
  g.mood = shoreGesture < 0.9 ? 'walk' : shoreGesture < 2.6 ? 'wave' : 'idle';
  if (was < 0.9 && shoreGesture >= 0.9 && shoreLine && !conversation.open) {
    bark(g, SHORE_ASK);
    barkLeft = 5;
    heardShoreAsk('bark');
  }
}
function street(dt: number) {
  const b = me.body;
  if (!b || indoors.room || barker || barkGap > 0) return;
  if (Math.hypot(b.position.x - VX, b.position.z - VILLAGE.z) > VILLAGE.r + 15) return;
  const f = newestFact();
  const news = f && seen.street !== f;
  streetIn -= dt;
  if (!news && streetIn > 0) return;
  let best: Guy | null = null,
    bd: number = BARK.streetReach;
  for (const g of folk.guys) {
    if (!g.on || g.job !== 'stroll' || g.chat || g.mood === 'hammer') continue;
    const d = Math.hypot(g.x - b.position.x, g.z - b.position.z);
    // Someone you can see: a line from behind you is nobody's line.
    if (d < bd && inView(g.x, g.y + 1.2, g.z, 0.85)) {
      bd = d;
      best = g;
    }
  }
  if (!best) return;
  if (news) {
    seen.street = f;
    playMark('resident noticed', { who: 'street', what: f });
    return bark(best, STREET_NOTICE[f]);
  }
  streetIn = BARK.streetEvery[0] + Math.random() * (BARK.streetEvery[1] - BARK.streetEvery[0]);
  playMark('rumour overheard');
  bark(best, STREET_RUMOURS[seen.streetRumour++ % STREET_RUMOURS.length]!);
}
/** Start over: everyone's a stranger again. */
export function resetResidents() {
  seen.met = {};
  seen.noticed = {};
  seen.said = {};
  seen.rumour = {};
  seen.hello = {};
  seen.street = null;
  seen.streetRumour = 0;
  seen.shoreNewcomer = SHORE_COAST && isFirstVisit();
  seen.shoreAsk = false;
  shoreGesture = -1;
  if (shoreWorker) shoreWorker.x = toWorld(SHORE_WORKER.x);
  pending.length = 0;
  stopBark();
}
export function updateResidents(dt: number) {
  for (const id of IDS) {
    const near = rooms[CAST[id].room].near.visible && rooms[CAST[id].room].ready;
    guys[id].on = near;
  }
  barkGap = Math.max(0, barkGap - dt);
  shoreGreeting(dt);
  if (conversation.open || showing() || pullOn()) {
    stopBark();
    return;
  }
  const next = pending[0];
  if (next && performance.now() >= next.at) {
    pending.shift();
    if (indoors.room?.id === CAST[next.id].room) {
      if (next.fact) playMark('resident noticed', { who: next.id, what: next.fact });
      bark(guys[next.id], next.text);
    }
  }
  street(dt);
  if (!barker) return;
  barkLeft -= dt;
  const g = barker;
  const away = Math.hypot(g.x - camera.position.x, g.z - camera.position.z) > 24;
  if (barkLeft <= 0 || !g.on || away) return stopBark();
  const onScreen = inView(g.x, (g.fy ?? g.y) + 1.25, g.z, 1.1);
  bubble.classList.toggle('on', onScreen || shouting);
  const x = onScreen ? ((screen.x + 1) / 2) * innerWidth : innerWidth / 2;
  let y = onScreen ? ((1 - screen.y) / 2) * innerHeight : innerHeight * 0.3;
  const target = interactTarget();
  if (target?.verb === 'Talk' && Math.hypot(target.at.x - g.x, target.at.z - g.z) < 0.1) {
    const prompt = document.querySelector<HTMLElement>('.prompt:not([hidden]) .prompt-in');
    if (prompt) y = Math.min(y, prompt.getBoundingClientRect().top - 8);
  }
  bubble.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
}
