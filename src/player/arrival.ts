// Arrival: first visit or returning visit (docs/proposals/boogle-2.md, 2026-11-02; docs/game-design/first-run.md). A
// first visit (no saved name on this device) gets the small name-and-colour card (index.html's lobby, src/player/hud.ts);
// a returning visit skips it and lands straight in the world with the saved name and colour, and
// src/features/welcome-back.ts shows a light "Welcome back" that says what changed in this room since the last visit.
// Local only: everything here is this browser's localStorage, read once at load. Serves DESIGN.md 8 (Designed for
// drop-in) and 9 (Leave something for the next visitor: a returning player hears what the others did).
//
//   isFirstVisit()          no identity saved on this device: show the card
//   showCard()              the card shows this load: a first visit, or just after Leave (leaveIsland)
//   lastVisit               { at, room } of the previous visit (ms since 1970), or null; read at load
//   roomMemory(room)        what the welcome items remembered about `room` at the last visit, or null
//   addWelcomeItem(item)    one more thing a returning player hears about (persistent progress, mail, ... later)
//   rememberVisit(room)     save { at, room } and every item's save() for `room` (welcome-back.ts, every few seconds)
//   welcomeLines(then)      each item's line about what changed since `then`, in order, skipping the quiet ones
//   friendlyName()          a random friendly name for the first-visit card
//   leaveIsland()           the pause view's Leave: reload onto the card

const NAME = 'boogle.name'; // also written by enterIsland (src/player/player.ts) and the pause view's You editor
const LAST = 'boogle.lastVisit';
const ROOM = (room: string) => `boogle.visit.${room}`;
const LEAVING = 'boogle.leaving'; // sessionStorage: this tab just left, so the card shows once

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

export type LastVisit = { at: number; room: string };
const okVisit = (v: unknown): v is LastVisit =>
  !!v && typeof (v as LastVisit).at === 'number' && typeof (v as LastVisit).room === 'string';

let saved = '';
try {
  saved = store('localStorage')?.getItem(NAME) ?? '';
} catch {
  // no storage: every visit is a first visit
}
let leaving = false;
try {
  const s = store('sessionStorage');
  leaving = s?.getItem(LEAVING) === '1';
  s?.removeItem(LEAVING);
} catch {
  // no session storage: Leave lands straight back in
}

const first = !saved;
export const isFirstVisit = () => first;
export const showCard = () => first || leaving;
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
};
const items: WelcomeItem[] = [];
export function addWelcomeItem(item: WelcomeItem) {
  items.push(item);
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

export function rememberVisit(room: string, at = Date.now()) {
  const then = roomMemory(room); // read first, so this visit's welcome still compares with the last one
  const out: Record<string, unknown> = { ...then?.items };
  for (const it of items) {
    try {
      const v = it.save();
      if (v !== undefined) out[it.key] = v;
    } catch {
      // the state it reads isn't there yet
    }
  }
  writeJson(ROOM(room), { at, items: out });
  writeJson(LAST, { at, room });
}

export function welcomeLines(then: RoomMemory | null): string[] {
  if (!then) return [];
  const out: string[] = [];
  for (const it of items) {
    if (!(it.key in then.items)) continue;
    try {
      const line = it.since(then.items[it.key]);
      if (line) out.push(line);
    } catch {
      // a shape from an older build: say nothing
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
export const friendlyName = () => NAMES[Math.floor(Math.random() * NAMES.length)];

export function leaveIsland() {
  try {
    store('sessionStorage')?.setItem(LEAVING, '1');
  } catch {
    // lands straight back in
  }
  location.reload();
}
