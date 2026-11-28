// Welcome back: a returning player (src/player/arrival.ts) lands straight in the world and gets a small card at the top
// for a few seconds, "Welcome back, <name>", plus what changed in this room since their last visit when that is known:
// friends who were here and railway sections laid. It reads the roster and railway rows through their read facades
// against what this browser remembered about the room last time. Never blocks: no clicks, no input.
// More welcome-back lines (persistent progress, a mailbox) are `addWelcomeItem` calls. Local. Serves DESIGN.md 8
// (Designed for drop-in) and 9 (Leave something for the next visitor: you hear what the others did).
import { rules, railwayMirror } from '../world/game-world.ts';
import './welcome-back.css';
import { publishWelcomeRows } from '../player/welcome-board.ts';
import { workSite, worksThanks } from '../sim/railway-queries-gift.ts';
import { roomWorks } from '../sim/railway-queries-room.ts';
import { defineKind, despawn, spawn, type GameEntity } from '../entity/entity.ts';
import { me } from '../player/player.ts';
import { identity } from '../player/identity.ts';
import { getRoomId } from '../netplay/net.ts';
import { worldStatus } from '../world/sync.ts';
import { productionRailway } from '../proto/flags.ts';
import { railwayWorldRead } from '../entities/railway/state.ts';
import { railwayKnown, railwaySnapshot, railwayDiff } from '../player/welcome-railway.ts';
import { showCard, addWelcomeItem, rememberVisit, roomMemory, welcomeLines } from '../player/arrival.ts';

const WAIT_MS = 4000; // the longest the card waits for the room's state before it says just hello
const SHOW_MS = 3500; // on screen, plus LINE_MS for each change it lists
const LINE_MS = 800;
const SAVE_MS = 5000; // how often this visit is remembered while you play

// ---------------------------------------------------------------- what a returning player hears about
const railway = () => railwayKnown(railwayWorldRead());
const names = (pids: readonly string[]) =>
  pids
    .map((pid) => rules.roster.nameOf(rules.roster.indexOf(pid)))
    .filter(Boolean)
    .slice(0, 6);
addWelcomeItem({
  key: 'friends',
  save: () =>
    railwayMirror && !railwayMirror.synced()
      ? undefined
      : Object.fromEntries(rules.roster.roster.pids.map((pid) => [pid, 0])),
  since: () => null,
});
function summary() {
  const w = railway();
  if (!w) return null;
  const snapshot = railwaySnapshot(w);
  const diff = railwayDiff(snapshot, then?.items.laid);
  const roster = rules.roster.roster.pids;
  const friends = then?.items.friends;
  const newcomers =
    friends && typeof friends === 'object'
      ? roster.filter((pid) => pid !== identity.pid && !Object.hasOwn(friends, pid))
      : [];
  const away = !!(diff.sections || diff.places.length || diff.built.length || newcomers.length);
  const current = roomWorks(w);
  const stop = workSite.findIndex((site) => site === current.site);
  const helpers =
    stop > 0 || current.ops.includes('rail.legStock')
      ? names(worksThanks(w, Math.max(0, stop)).filter((pid) => rules.roster.indexOf(pid) >= 0))
      : [];
  const places = away ? diff.places : snapshot.places;
  const sections = away ? diff.sections : snapshot.lines + snapshot.legs.reduce((n, v) => n + v, 0);
  const built = away ? diff.built : Object.values(snapshot.plots);
  // [placeholder: While you were away] [placeholder: Room log] [placeholder: Connected]
  // [placeholder: Built] [placeholder: New friends] [placeholder: Helping now]
  const row = (label: string, values: string[]) => label + ' \u00b7 ' + (values.join(', ') || '\u2014');
  const rows = [
    away ? 'While you were away' : 'Room log',
    row('Connected', [String(sections), ...places.slice(-1)]),
    row('Built', built.slice(-2)),
    row('New friends', names(away ? newcomers : roster)),
    row('Helping now', helpers),
  ];
  publishWelcomeRows(rows);
  return { snapshot, lines: away ? rows.slice(1).filter((r) => !r.endsWith('\u2014')) : [] };
}
addWelcomeItem({
  key: 'laid',
  save: () => summary()?.snapshot,
  absent: null,
  since: () => summary()?.lines ?? null,
});
// ---------------------------------------------------------------- the card
const room = getRoomId();
const then = roomMemory(room); // before this visit remembers anything
let enteredAt = 0;
let shown = !!showCard(); // a first visit gets the card instead
let savedAt = -1e9;

function show(lines: string[]) {
  const card = document.createElement('div');
  card.className = 'welcome-back';
  card.setAttribute('role', 'status');
  const h = document.createElement('p');
  h.className = 'welcome-back-hi';
  h.textContent = `Welcome back, ${me.name}`;
  card.append(h);
  for (const line of lines) {
    const p = document.createElement('p');
    p.className = 'welcome-back-line';
    p.textContent = line;
    card.append(p);
  }
  (document.querySelector('.hud') ?? document.body).append(card);
  requestAnimationFrame(() => card.classList.add('shown'));
  setTimeout(
    () => {
      card.classList.remove('shown');
      setTimeout(() => card.remove(), 400);
    },
    SHOW_MS + lines.length * LINE_MS,
  );
}

// The room's state is here: joined (a tab starts 'local', with an empty world that reads as ready) and loaded, and in
// the railway room the railway's whole state too.
const known = () => {
  const w = worldStatus();
  return w.mode !== 'local' && w.ready && (!productionRailway || !!railway());
};

// The wait for the room: done once the card is up. A first visit has none to wait for.
defineKind('welcome-back', { lateUpdate: 44 });
if (!shown) {
  const waiting: GameEntity = spawn({
    kind: 'welcome-back',
    lateUpdate({ now }) {
      if (!me.entered) return;
      if (!enteredAt) enteredAt = now;
      const ready = known();
      if (ready || now - enteredAt > WAIT_MS) {
        shown = true;
        show(ready ? welcomeLines(then) : []);
        despawn(waiting);
      }
    },
  });
}

// Remember the room only once it is known (and after the welcome read the old memory).
defineKind('room-memory', { lateUpdate: 44 });
spawn({
  kind: 'room-memory',
  lateUpdate({ now }) {
    if (!me.entered) return;
    if (shown && now - savedAt > SAVE_MS && known()) {
      savedAt = now;
      rememberVisit(room);
    }
  },
});
addEventListener('pagehide', () => me.entered && known() && rememberVisit(room));
