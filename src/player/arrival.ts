// Arrival: first visit or returning visit (docs/decisions.md, 2026-11-02; docs/game-design/first-run.md). A
// first visit (no saved name on this device) gets the name-and-colour card (index.html's lobby, src/player/hud.ts);
// a returning visit skips it and lands straight in the world with the saved name and colour, and
// src/features/welcome-back.ts shows a light "Welcome back" that says what changed in this room since the last visit.
// Local only: everything here is this browser's localStorage, read once at load. Serves DESIGN.md 8 (Designed for
// drop-in) and 9 (Leave something for the next visitor: a returning player hears what the others did).
//
//   isFirstVisit()          no identity saved on this device, or the world was reset since: show the card
//   showCard()              the card shows this load: a first visit
//   lastVisit               { at, room } of the previous visit (ms since 1970), or null; read at load
//   roomMemory(room)        what the welcome items remembered about `room` at the last visit, or null
//   addWelcomeItem(item)    one more thing a returning player hears about (persistent progress, mail, ... later)
//   rememberVisit(room)     save { at, room } and every item's save() for `room` (welcome-back.ts, every few seconds)
//   forgetInRoom(room, key) drop one remembered thing about `room` (Get unstuck, its saved spot)
//   welcomeLines(then)      each item's line about what changed since `then`, in order, skipping the quiet ones
//   friendlyName()          a random friendly name for the first-visit card
//   leaveIsland()           the pause view's Leave: out to the menu page (/menu/), where the game isn't running
//   startFresh()            the pause view's Start fresh: forget this person on this device and fall in as someone new

import { replacedStage, worldWasReset } from '../boot/world-reset.ts';
import { PROTO } from '../proto/flags.ts';

const NAME = 'boogle.name'; // also written by the lobby (src/player/hud.ts) and the pause view's You editor
const LAST = 'boogle.lastVisit';
const ROOM = (room: string) => `boogle.visit.${room}`;

// window.localStorage itself throws where site data is blocked (and is missing in node tests).
function store(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    return globalThis[kind] ?? null;
  } catch {
    return null;
  }
}
function readJson(key: string): unknown {
  try {
    const v = store('localStorage')?.getItem(key);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}
function writeJson(key: string, value: unknown) {
  try {
    store('localStorage')?.setItem(key, JSON.stringify(value));
  } catch {
    // full or blocked: the next visit is treated like this one's start
  }
}

/** Where you last stood, in a room's memory (src/features/return-spot.ts). */
export const SPOT_KEY = 'spot';

export type LastVisit = { at: number; room: string };
const okVisit = (v: unknown): v is LastVisit =>
  !!v && typeof (v as LastVisit).at === 'number' && typeof (v as LastVisit).room === 'string';

let saved = '';
try {
  saved = store('localStorage')?.getItem(NAME) ?? '';
} catch {
  // no storage: every visit is a first visit
}
// The first load after a world reset is a new game too: the fall and the card, pre-filled with the saved name and
// colour (docs/decisions.md, 2026-11-09). A reload after that is a returning visit again. A room replaced by a stage
// is the exception: its players land at the stage with no fall and no card (docs/plans/room-fast-forward.md).
const first = !saved || (worldWasReset && !replacedStage);
export const isFirstVisit = () => first;
export const showCard = () => first || PROTO === 'fall'; // ?proto=fall replays the first visit
const lastRead = readJson(LAST);
export const lastVisit: LastVisit | null = okVisit(lastRead) ? lastRead : null;

// ---------------------------------------------------------------- welcome-back items
/** One thing a returning player can hear about. `save` says what to remember about the room now (JSON; undefined while
 * not known yet, which keeps the last value); `since` turns what was remembered last visit into a short line, or null
 * when nothing changed. Read existing state only: an item never changes the world. */
export type WelcomeItem = {
  key: string;
  save: () => unknown;
  since: (then: unknown) => string | null;
  /** What a memory from before this item counts as, so a returning player with an older memory hears about it once. */
  absent?: unknown;
  /** Its line comes first on the card (the story act, src/features/acts.ts). */
  first?: boolean;
};
const items: WelcomeItem[] = [];
export function addWelcomeItem(item: WelcomeItem) {
  if (item.first) items.unshift(item);
  else items.push(item);
}

type RoomMemory = { at: number; items: Record<string, unknown> };
const memories = new Map<string, RoomMemory | null>();
/** The room as the last visit left it (read once per room, before this visit writes over it). */
export function roomMemory(room: string): RoomMemory | null {
  if (!memories.has(room)) {
    const m = readJson(ROOM(room)) as RoomMemory | null;
    memories.set(room, m && typeof m.at === 'number' && m.items && typeof m.items === 'object' ? m : null);
  }
  return memories.get(room)!;
}

// What this visit has remembered so far, per room: an item with nothing new this time keeps its latest value.
const latest = new Map<string, Record<string, unknown>>();
export function rememberVisit(room: string, at = Date.now()) {
  if (fresh) return;
  const then = roomMemory(room); // read first, so this visit's welcome still compares with the last one
  const out: Record<string, unknown> = { ...(latest.get(room) ?? then?.items) };
  for (const it of items) {
    try {
      const v = it.save();
      if (v !== undefined) out[it.key] = v;
    } catch {
      // the state it reads isn't there yet
    }
  }
  latest.set(room, out);
  writeJson(ROOM(room), { at, items: out });
  writeJson(LAST, { at, room });
}

/** Forgets one thing about `room`, now, on disk too: the saved spot, when you asked to get unstuck from it. */
export function forgetInRoom(room: string, key: string) {
  const items = { ...(latest.get(room) ?? roomMemory(room)?.items) };
  delete items[key];
  latest.set(room, items);
  writeJson(ROOM(room), { at: Date.now(), items });
}

export function welcomeLines(then: RoomMemory | null): string[] {
  if (!then) return [];
  const out: string[] = [];
  for (const it of items) {
    const was = it.key in then.items ? then.items[it.key] : it.absent;
    if (was === undefined) continue;
    try {
      const line = it.since(was);
      if (line) out.push(line);
    } catch {
      // Malformed local memory must not interrupt arrival.
    }
  }
  return out;
}

/** "Ana", "Ana and Bo", "Ana, Bo and Cy", "Ana, Bo and 3 others". */
export function nameList(names: string[], max = 3): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length > max) {
    const rest = names.length - (max - 1);
    return `${names.slice(0, max - 1).join(', ')} and ${rest} others`;
  }
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

// ---------------------------------------------------------------- the card
const NAMES = [
  'Sunny Otter',
  'Lucky Gull',
  'Mellow Crab',
  'Breezy Fox',
  'Happy Clam',
  'Sandy Seal',
  'Jolly Puffin',
  'Calm Heron',
  'Busy Bee',
  'Cosy Newt',
  'Merry Moth',
  'Swift Tern',
];
export function pickFriendlyName(names: readonly string[], previous: string, random = Math.random): string {
  const choices = names.filter((name) => name !== previous);
  const pool = choices.length ? choices : names;
  return pool[Math.floor(random() * pool.length)] ?? '';
}
export const friendlyName = (previous = '') => pickFriendlyName(NAMES, previous);

export function leaveIsland() {
  location.href = new URL(
    `menu/?from=${encodeURIComponent(location.search)}`,
    location.origin + location.pathname,
  ).href;
}

// Who you are on this device: your identity, and what's yours rather than the island's. Your settings stay: it's still
// you at the keyboard.
const PERSON = ['boogle.name', 'boogle.color', 'boogle.pid', 'boogle.key', 'boogle.lastVisit', 'boogle.boogler'];
const PERSON_PREFIX = ['boogle.visit.', 'boogle.minis.', 'boogle.soapbox.'];
let fresh = false;
/** A place can clear its own saves and choose a fresh destination without resetting a partner's room. */
export const freshStart = {
  warning: "Are you sure? You'll fall in as someone new, and lose your own progress. The island keeps everything.",
  prepare: (): string | undefined => undefined,
};
export function startFresh() {
  fresh = true; // pagehide must not write the old person back
  const destination = freshStart.prepare();
  const s = store('localStorage');
  if (s) {
    for (const k of PERSON) s.removeItem(k);
    for (const k of Object.keys(s)) if (PERSON_PREFIX.some((p) => k.startsWith(p))) s.removeItem(k);
  }
  if (destination) location.assign(destination);
  else location.reload();
}
