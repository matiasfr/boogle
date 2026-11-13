// Welcome back: a returning player (src/player/arrival.ts) lands straight in the world and gets a small card at the top
// for a few seconds, "Welcome back, <name>", plus what changed in this room since their last visit when that is known:
// friends who were here, sections laid, opening day. It reads existing state only (the roster; in the railway room, the
// game, the railway's rows through its read facade; on a classic `?proto=` entry the sites' plaques and the opening
// flag) against what this browser remembered about the room last time. Never blocks: no clicks, no input.
// More welcome-back lines (persistent progress, a mailbox) are `addWelcomeItem` calls. Local. Serves DESIGN.md 8
// (Designed for drop-in) and 9 (Leave something for the next visitor: you hear what the others did).
import { rules, railwayMirror } from '../world/game-world.ts';
import './welcome-back.css';
import { defineKind, despawn, spawn, type GameEntity } from '../entity/entity.ts';
import { me } from '../player/player.ts';
import { identity } from '../player/identity.ts';
import { getRoomId } from '../netplay/net.ts';
import { worldStatus } from '../world/sync.ts';
import { productionRailway } from '../proto/flags.ts';
import { railwayWorldRead } from '../entities/railway/state.ts';
import { railwayKnown, stretchesLaid, stretchesSince } from '../player/welcome-railway.ts';
import { showCard, addWelcomeItem, rememberVisit, roomMemory, welcomeLines, nameList } from '../player/arrival.ts';

const WAIT_MS = 4000; // the longest the card waits for the room's state before it says just hello
const SHOW_MS = 3500; // on screen, plus LINE_MS for each change it lists
const LINE_MS = 800;
const SAVE_MS = 5000; // how often this visit is remembered while you play

// ---------------------------------------------------------------- what a returning player hears about
// Friends who poured since (their plaque points rose) or who are new to the room's roster. In the railway room (the
// game) only "new to the roster" can happen: nothing pours into the classic sites there, so the points never rise.
addWelcomeItem({
  key: 'friends',
  save: () => {
    if (railwayMirror && !railwayMirror.synced()) return undefined;
    const { roster } = rules.roster;
    const pts: Record<string, number> = {};
    for (const pid of roster.pids) pts[pid] = rules.sites.points(pid);
    return pts;
  },
  since: (then) => {
    const was = then as Record<string, number>;
    const { roster } = rules.roster;
    const names: string[] = [];
    roster.pids.forEach((pid, k) => {
      if (pid === identity.pid) return;
      if (!(pid in was) || rules.sites.points(pid) > was[pid]!) names.push(rules.roster.nameOf(k) || 'Someone');
    });
    if (!names.length) return null;
    return `${nameList(names)} ${names.length === 1 ? 'was' : 'were'} here`;
  },
});
// Stretches of track laid: in the railway room the stations laid on both lines (undefined until its state is in, which
// keeps the last count); on a classic entry the sites opened.
const railway = () => railwayKnown(railwayWorldRead());
addWelcomeItem({
  key: 'laid',
  save: () => {
    if (!productionRailway) return rules.sites.sites.open;
    const w = railway();
    return w ? stretchesLaid(w) : undefined;
  },
  since: (then) => {
    const w = productionRailway ? railway() : null;
    const n = productionRailway
      ? w
        ? stretchesSince(then, stretchesLaid(w))
        : 0
      : rules.sites.sites.open - (then as number);
    if (n <= 0) return null;
    return n === 1 ? 'A new stretch of track was laid' : `${n} new stretches of track were laid`;
  },
});
// Unreachable in the railway room (the game): it has no opening day, and the classic opening flag never changes there.
// Live only on a classic `?proto=` entry.
addWelcomeItem({
  key: 'opened',
  save: () => rules.opening.opening.t0 >= 0,
  since: (then) => (!then && rules.opening.opening.t0 >= 0 ? 'Opening day happened while you were away' : null),
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
