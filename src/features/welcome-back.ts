// Welcome back: a returning player (src/player/arrival.ts) lands straight in the world and gets a small card at the top
// for a few seconds, "Welcome back, <name>", plus what changed in this room since their last visit when that is known:
// friends who were here, sections laid, opening day. It reads existing state only (the roster, the sites' plaques, the
// opening flag) against what this browser remembered about the room last time. Never blocks: no clicks, no input.
// More welcome-back lines (persistent progress, a mailbox) are `addWelcomeItem` calls. Local. Serves DESIGN.md 8
// (Designed for drop-in) and 9 (Leave something for the next visitor: you hear what the others did).
import { rules } from '../world/game-world.ts'; // first: the lockstep rules register before anything else
import './welcome-back.css';
import { onFrame } from '../loop.ts';
import { me } from '../player/player.ts';
import { identity } from '../player/identity.ts';
import { getRoomId } from '../netplay/net.ts';
import { worldStatus } from '../world/sync.ts';
import { showCard, addWelcomeItem, rememberVisit, roomMemory, welcomeLines, nameList } from '../player/arrival.ts';

const WAIT_MS = 4000; // the longest the card waits for the room's state before it says just hello
const SHOW_MS = 3500; // on screen, plus LINE_MS for each change it lists
const LINE_MS = 800;
const SAVE_MS = 5000; // how often this visit is remembered while you play

// ---------------------------------------------------------------- what a returning player hears about
// Friends who poured since (their plaque points rose) or who are new to the room's roster.
addWelcomeItem({
  key: 'friends',
  save: () => {
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
      if (!(pid in was) || rules.sites.points(pid) > was[pid]) names.push(rules.roster.nameOf(k) || 'Someone');
    });
    if (!names.length) return null;
    return `${nameList(names)} ${names.length === 1 ? 'was' : 'were'} here`;
  },
});
addWelcomeItem({
  key: 'laid',
  save: () => rules.sites.sites.open,
  since: (then) => {
    const n = rules.sites.sites.open - (then as number);
    if (n <= 0) return null;
    return n === 1 ? 'A new stretch of track was laid' : `${n} new stretches of track were laid`;
  },
});
addWelcomeItem({
  key: 'opened',
  save: () => rules.opening.opening.t0 >= 0,
  since: (then) => (!then && rules.opening.opening.t0 >= 0 ? 'Opening day happened while you were away' : null),
});

// ---------------------------------------------------------------- the card
const room = getRoomId();
const then = roomMemory(room); // before this visit remembers anything
let enteredAt = 0;
let shown = !!showCard(); // a first visit (or after Leave) gets the card instead
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

// The room's state is here: joined (a tab starts 'local', with an empty world that reads as ready) and loaded.
const known = () => {
  const w = worldStatus();
  return w.mode !== 'local' && w.ready;
};

onFrame(
  ({ now }: { now: number }) => {
    if (!me.entered) return;
    if (!enteredAt) enteredAt = now;
    const ready = known();
    if (!shown && (ready || now - enteredAt > WAIT_MS)) {
      shown = true;
      show(ready ? welcomeLines(then) : []);
    }
    // Remember the room only once it is known (and after the welcome read the old memory).
    if (shown && ready && now - savedAt > SAVE_MS) {
      savedAt = now;
      rememberVisit(room);
    }
  },
  { phase: 'late', order: 44 },
);
addEventListener('pagehide', () => me.entered && known() && rememberVisit(room));
