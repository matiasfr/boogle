// The little guys you can talk to, and how the town notices things without you asking. Who says what is ./town-lines.ts; who
// stands where is `CAST`. Selection follows docs/research/town-interiors.md, "Growth changes a relationship": what you asked,
// then your first meeting, then the newest thing that's changed, then an ordinary line. Each player's seen lines are their own,
// and a newcomer hears about what's there now, not a backlog.
//
// Barks: a short line in a bubble over someone's head when you walk in or pass by, so growth reaches you with no talk to open:
// on the door of a room, or from a stroller in the street once the town's changed. At most one at a time. Local.
import * as THREE from 'three/webgpu';
import { conversation } from '../../player/conversation.ts';
import { NO_TARGETS, registerInteractable, type Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { playMark } from '../mark.ts';
import { camera } from '../../render/scene.ts';
import type { VoiceSpec } from '../../render/npc-voice.ts';
import { pullOn } from './celebrate.ts';
import { babble } from './chatter.ts';
import { addResident, folk, type Guy, type Mood } from './folk.ts';
import { showing } from './gifts.ts';
import { newestFact } from './growth.ts';
import { personalSlice } from './job.ts';
import { VILLAGE, toWorld, type RoomId } from './layout.ts';
import { indoors, onRoom, roomToWorld, rooms, type Room } from './rooms.ts';
import { startTalk, type Answer, type Beat } from './talk.ts';
import {
  BYE,
  GO_ON,
  RESIDENTS,
  RUMOUR_ASK,
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

// ---------------------------------------------------------------- what each of you remembers
const seen = {
  met: {} as Partial<Record<ResidentId, boolean>>,
  noticed: {} as Partial<Record<ResidentId, Fact>>,
  said: {} as Partial<Record<ResidentId, number>>,
  rumour: {} as Partial<Record<ResidentId, number>>,
  hello: {} as Partial<Record<ResidentId, boolean>>,
  street: null as Fact | null,
  streetRumour: 0,
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
          return menu(id, q.say, asked);
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
    screen.set(g.x, g.y + 1.2, g.z).project(camera);
    if (d < bd && screen.z < 1 && Math.abs(screen.x) < 0.85 && Math.abs(screen.y) < 0.85) {
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
  pending.length = 0;
  stopBark();
}
export function updateResidents(dt: number) {
  for (const id of IDS) {
    const near = rooms[CAST[id].room].near.visible && rooms[CAST[id].room].ready;
    guys[id].on = near;
  }
  barkGap = Math.max(0, barkGap - dt);
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
  screen.set(g.x, (g.fy ?? g.y) + 1.25, g.z).project(camera);
  const away = Math.hypot(g.x - camera.position.x, g.z - camera.position.z) > 24;
  if (barkLeft <= 0 || !g.on || away) return stopBark();
  const onScreen = screen.z < 1 && Math.abs(screen.x) < 1.1 && Math.abs(screen.y) < 1.1;
  bubble.classList.toggle('on', onScreen || shouting);
  const x = onScreen ? ((screen.x + 1) / 2) * innerWidth : innerWidth / 2,
    y = onScreen ? ((1 - screen.y) / 2) * innerHeight : innerHeight * 0.3;
  bubble.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
}
