// The little guys you can talk to, and how the town notices things without you asking. Who says what is ./town-lines.ts; who
// stands where is `CAST`. Selection follows docs/research/town-interiors.md, "Growth changes a relationship": what you asked,
// then your first meeting, then the newest thing that's changed, then an ordinary line. Each player's seen lines are their own,
// and a newcomer hears about what's there now, not a backlog.
//
// Barks: a short line in a bubble over someone's head when you walk in or pass by, so growth reaches you with no talk to open:
// on the door of a room, or from a stroller in the street once the town's changed. At most one at a time. Local.
//
// `createResidents` mounts them on an owner: the town entity's in the live game (src/entities/town/), with its memory in
// src/entities/town/memory.ts, and a never-disposed one in ?proto=place (./place-residents.ts), whose shore worker is
// ./shore-worker.ts.
import * as THREE from 'three/webgpu';
import { conversation } from '../../player/conversation.ts';
import { NO_TARGETS, interactTarget, type Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { camera } from '../../render/scene.ts';
import type { VoiceSpec } from '../../render/npc-voice.ts';
import { TOWN_FACTS } from '../../sim/town-facts.ts';
import { playMark } from '../../proto/mark.ts';
import { babble } from '../../place/chatter.ts';
import { addResident, folk, type Guy, type Mood } from '../../place/folk.ts';
import { VILLAGE, toWorld, type RoomId } from '../../place/layout.ts';
import type { Room, Rooms } from './rooms.ts';
import { roomToWorld } from './rooms.ts';
import { startTalk, type Answer, type Beat } from '../../place/talk.ts';
import {
  BYE,
  GO_ON,
  RESIDENTS,
  RUMOUR_ASK,
  STREET_NOTICE,
  WORKS_FACTS,
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
const CAST: Record<ResidentId, Cast> = {
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
    x: -1.0,
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

// ---------------------------------------------------------------- what each of you remembers
export type Seen = {
  met: Partial<Record<ResidentId, boolean>>;
  noticed: Partial<Record<ResidentId, Fact>>;
  said: Partial<Record<ResidentId, number>>;
  rumour: Partial<Record<ResidentId, number>>;
  hello: Partial<Record<ResidentId, boolean>>;
  street: Fact | null;
  streetRumour: number;
};
const isFact = (v: unknown): v is Fact =>
  typeof v === 'string' && ([...TOWN_FACTS, ...WORKS_FACTS] as readonly string[]).includes(v);
const count = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 1e6 ? v : null);
/** Only known residents, and only values `ok` accepts: anything else in a save is dropped. */
function book<T>(v: unknown, ok: (x: unknown) => T | null): Partial<Record<ResidentId, T>> {
  const out: Partial<Record<ResidentId, T>> = {};
  if (!v || typeof v !== 'object') return out;
  for (const id of IDS) {
    const x = ok((v as Record<string, unknown>)[id]);
    if (x !== null) out[id] = x;
  }
  return out;
}
/** A save, or anything else: what's well-formed in it, and empty for the rest. */
export function seenFrom(v: unknown): Seen {
  const j = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return {
    met: book(j.met, (x) => (x === true ? true : null)),
    noticed: book(j.noticed, (x) => (isFact(x) ? x : null)),
    said: book(j.said, count),
    rumour: book(j.rumour, count),
    hello: book(j.hello, (x) => (x === true ? true : null)),
    street: isFact(j.street) ? j.street : null,
    streetRumour: count(j.streetRumour) ?? 0,
  };
}

/** What the residents read of the town and the moment. */
export type ResidentsEnv = {
  /** The newest thing anyone can see has happened to the town (src/sim/town-facts.ts). */
  newest(): Fact | null;
  /** Something's up that nobody should talk over: a reward reveal, or a conversation. */
  hush(): boolean;
};
/** This player's memory of the residents: `load` may return anything (it's checked); `save` after every change. */
export type ResidentsMemory = { load(): unknown; save(s: Seen): void };

/** The five residents in their rooms, their Talk, and the barks, owned by `owner`. Call `update(dt)` every frame, after
 * the rooms'. */
export function createResidents(owner: OwnedView, rooms: Rooms, env: ResidentsEnv, memory: ResidentsMemory) {
  const V = new THREE.Vector3();
  const guys = {} as Record<ResidentId, Guy>;
  for (const id of IDS) {
    const c = CAST[id],
      r = rooms.rooms[c.room];
    roomToWorld(r, c.x, 0, c.z, V);
    guys[id] = addResident(V.x, V.y + (c.up ?? 0), V.z, r.yaw + c.yaw, c.act, c.color);
  }
  owner.cleanup(() => {
    for (const id of IDS) {
      const k = folk.guys.indexOf(guys[id]);
      if (k >= 0) folk.guys.splice(k, 1);
    }
  });
  const inRoom = (r: Room) => IDS.filter((id) => CAST[id].room === r.id);
  let seen = seenFrom(memory.load());
  const remember = () => memory.save(seen);

  const turn = (list: string[], tally: Partial<Record<ResidentId, number>>, id: ResidentId) => {
    const n = tally[id] ?? 0;
    tally[id] = n + 1;
    remember();
    return list[n % list.length]!;
  };
  /** What they've got to say about the town that you haven't heard, newest first. Only the newest counts: no backlog. */
  function noticeFor(id: ResidentId): [Fact, string] | null {
    const f = env.newest();
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
      remember();
      first = panels(id, L.intro, 0, asked);
    } else {
      const n = noticeFor(id);
      if (n) {
        seen.noticed[id] = n[0];
        remember();
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
  function targets(): Interactable[] {
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
  }

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
  /** `g` says `text` in a bubble; `secs` holds it that long instead of by its length. */
  function bark(g: Guy, text: string, shout = false, secs?: number) {
    stopBark();
    barker = g;
    shouting = shout;
    barkLeft = secs ?? Math.min(BARK.maxS, Math.max(BARK.minS, text.split(/\s+/).length * BARK.perWord));
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
  owner.cleanup(() => {
    stopBark();
    bubble.remove();
  });
  const pending: { id: ResidentId; text: string; at: number; fact: Fact | null }[] = [];
  rooms.onRoom((r, inside) => {
    if (!inside) return;
    playMark(`entered building ${r.id}`);
    // Whoever's in the room looks up: what's changed if something has, or hello the first time. One line, by the first who has one.
    for (const id of inRoom(r)) {
      const n = noticeFor(id);
      if (n && seen.met[id]) {
        seen.noticed[id] = n[0];
        remember();
        pending.push({ id, text: n[1], at: performance.now() + 1100, fact: n[0] });
        return;
      }
    }
    for (const id of inRoom(r)) {
      const hello = RESIDENTS[id].hello;
      if (hello && !seen.hello[id]) {
        seen.hello[id] = true;
        remember();
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
  function street(dt: number) {
    const b = me.body;
    if (!b || rooms.indoors.room || barker || barkGap > 0) return;
    if (Math.hypot(b.position.x - VX, b.position.z - VILLAGE.z) > VILLAGE.r + 15) return;
    const f = env.newest();
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
      remember();
      playMark('resident noticed', { who: 'street', what: f });
      return bark(best, STREET_NOTICE[f]);
    }
    streetIn = BARK.streetEvery[0] + Math.random() * (BARK.streetEvery[1] - BARK.streetEvery[0]);
    playMark('rumour overheard');
    const line = STREET_RUMOURS[seen.streetRumour++ % STREET_RUMOURS.length]!;
    remember();
    bark(best, line);
  }
  /** Start over: everyone's a stranger again. */
  function reset() {
    seen = seenFrom(null);
    remember();
    pending.length = 0;
    stopBark();
  }
  function update(dt: number) {
    for (const id of IDS) {
      const r = rooms.rooms[CAST[id].room];
      guys[id].on = r.near.visible && r.ready;
    }
    barkGap = Math.max(0, barkGap - dt);
    // Nobody chats over a conversation or a reveal. A line said straight to you (`say`, a shout) is an answer to what
    // you just did, like Button's when you take something, whose "You got" card is itself a reveal: only a conversation
    // stops that.
    const hushed = env.hush();
    if (conversation.open || (hushed && !shouting)) {
      stopBark();
      return;
    }
    const next = pending[0];
    if (!hushed && next && performance.now() >= next.at) {
      pending.shift();
      if (rooms.indoors.room?.id === CAST[next.id].room) {
        if (next.fact) playMark('resident noticed', { who: next.id, what: next.fact });
        bark(guys[next.id], next.text);
      }
    }
    if (!hushed) street(dt);
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
  return {
    guys,
    update,
    targets,
    reset,
    /** Someone who lives here says this now. */
    say: (id: ResidentId, text: string) => bark(guys[id], text, true),
    /** For ?proto=place's shore worker (./shore-worker.ts), which barks through the same bubble. */
    bark,
    stopBark,
    barker: () => barker,
    inView,
    /** This player's memory, for ?proto=place's save. */
    seen: () => seen,
    restore(v: unknown) {
      seen = seenFrom(v);
    },
    /** For the evals: who's saying something, and what. */
    barking: () => (barker ? { k: barker.k, text: bubble.textContent ?? '' } : null),
  };
}
export type Residents = ReturnType<typeof createResidents>;
