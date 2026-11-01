// The first 30 seconds from a shared link (?proto=arrive; docs/research/wordless-onboarding.md, recs 1, 2, 3, 8),
// loaded by src/features/proto-arrive.ts. Every variant times the arrival: page open to in the world, first input,
// first move, first ball touch and first logs taken, counted with `protoCount` and read out on the prototype bar.
// The default (`v=direct`) skips the name and colour lobby (a friendly random name and your colour, changeable on the
// pause view's Room page), lands you south of the court looking up the line (the ball, the open work site and the
// lighthouse in one view) and rolls the ball gently toward you; the first-run card shrinks to move and camera
// (src/features/first-run.ts). `v=lobby` is today's flow, timed, for comparison. Local: nothing here is synced except
// the ball's push, which goes out like any owner's ball. Serves DESIGN.md 7 (Telegraph everything) and 8 (Designed
// for drop-in).
import './rename.ts';
import { onFrame } from '../../loop.ts';
import { me, cam } from '../../player/player.ts';
import { enterIsland } from '../../player/player.ts';
import { dom } from '../../player/hud.ts';
import { ball, placeBall } from '../../physics/ball.ts';
import { teleport } from '../../physics/physics.ts';
import { groundHeight } from '../../adapters/terrain.ts';
import { remotes } from '../../netplay/net.ts';
import { rules } from '../../world/game-world.ts';
import { worldStatus } from '../../world/sync.ts';
import { identity } from '../../player/identity.ts';
import { BALL_R, PLAYER_R } from '../../constants.ts';
import { protoCount, protoReadout } from '../count.ts';
import { cardFor, read } from '../../../protos/store.ts';

const variant = new URLSearchParams(location.search).get('v') === 'lobby' ? 'lobby' : 'direct';
const direct = variant === 'direct';

// Where a newcomer lands: south of the court, facing up the line. From here the court (12, 21), the open work site
// (11, 6) and the lighthouse (6, -58) sit within a few degrees of straight ahead.
const ARRIVE = { x: 12.6, z: 31, yaw: 0.09, pitch: -0.12 };
const ROLL_FROM = { x: 11.8, z: 21.5 }; // the court's middle
const ROLL_SPEED = 2.6; // m/s toward you: it is still coming when you look, and slows to a stop at your feet
const ROLL_DELAY_MS = 900;

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

// ---------------------------------------------------------------- timings (rec 1)
type Mark = 'world' | 'input' | 'move' | 'ball' | 'logs';
const LABELS: Record<Mark, string> = { world: 'in', input: 'input', move: 'move', ball: 'ball', logs: 'logs' };
const COUNTER: Partial<Record<Mark, string>> = { move: 'first move', ball: 'first ball', logs: 'first logs' };
const t: Partial<Record<Mark, number>> = {};
const s = (ms: number) => (ms / 1000).toFixed(1);

function mark(m: Mark) {
  if (t[m] !== undefined) return;
  t[m] = performance.now(); // ms since the page was opened (navigation start)
  const c = COUNTER[m];
  if (c) {
    // Summed seconds plus how many visits got there: the bar shows the average.
    protoCount(`${c}s`);
    protoCount(`s to ${c}`, t[m] / 1000);
  }
  console.info(`[arrive] ${variant}: ${m} at ${s(t[m])} s`);
  readout();
}

function readout() {
  const parts = (Object.keys(LABELS) as Mark[]).map((m) => `${LABELS[m]} ${t[m] === undefined ? '–' : s(t[m])}`);
  let line = `This visit (s): ${parts.join(' · ')}`;
  const card = cardFor(location.search);
  const c = card ? read(card.id).counts : {};
  const n = c['first moves'] ?? 0;
  if (n > 1) line += ` · avg move ${(c['s to first move'] / n).toFixed(1)} over ${n}`;
  protoReadout(line);
}
readout();
protoCount('arrivals');

// The first press of anything: a key, a click or a tap (the lobby's name box counts), or a gamepad stick or button.
const anyInput = () => mark('input');
for (const type of ['keydown', 'pointerdown', 'touchstart'] as const)
  addEventListener(type, anyInput, { capture: true, once: true, passive: true });

const pidRow = () => rules.roster.indexOf(identity.pid);
const carrying = () => {
  const k = pidRow();
  return k >= 0 && rules.stacks.countAt(k) > 0;
};

onFrame(
  () => {
    if (t.input === undefined) {
      const pads = navigator.getGamepads?.() ?? [];
      if (pads.some((p) => p?.buttons.some((b) => b.pressed) || p?.axes.some((a) => Math.abs(a) > 0.3))) mark('input');
    }
    if (!me.entered || !me.body) return;
    mark('world');
    if (me.wish.lengthSq() > 0.04) mark('move');
    if (t.ball === undefined) {
      const p = me.body.position;
      const d = Math.hypot(p.x - ball.disp.p.x, p.y - ball.disp.p.y, p.z - ball.disp.p.z);
      if (me.holding || d < PLAYER_R + BALL_R + 0.2) mark('ball');
    }
    if (t.logs === undefined && worldStatus().ready && carrying()) mark('logs');
  },
  { phase: 'world', order: 42 },
);

// ---------------------------------------------------------------- no lobby (rec 2)
if (direct) {
  dom.lobbyEl.hidden = true; // the splash covers the wait; the lobby never shows
  let stored = '';
  try {
    stored = localStorage.getItem('boogle.name') || '';
  } catch {
    // no storage: a fresh name every visit
  }
  if (!stored) dom.nameInput.value = NAMES[Math.floor(Math.random() * NAMES.length)];
  // initLobby has already kept your colour or picked one. Jump in as soon as the island can be drawn.
  onFrame(
    () => {
      if (me.entered || dom.enterBtn.disabled) return;
      enterIsland();
      arrive();
    },
    { phase: 'late', order: 41 },
  );
}

// ---------------------------------------------------------------- arrival (rec 3)
let rollAt = 0;
function arrive() {
  if (!me.body) return;
  teleport(me.body, ARRIVE.x, groundHeight(ARRIVE.x, ARRIVE.z) + PLAYER_R + 0.6, ARRIVE.z);
  me.body.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = ARRIVE.yaw;
  cam.pitch = ARRIVE.pitch;
  rollAt = performance.now() + ROLL_DELAY_MS;
}

// The ball rolls toward you once, when this tab simulates it and nobody else is around (a friend's ball stays theirs).
onFrame(
  ({ now }) => {
    if (!rollAt || now < rollAt || !me.body) return;
    if (now > rollAt + 10_000) return void (rollAt = 0); // never took the ball: no roll
    if (!ball.mine || ball.held || !worldStatus().ready) return;
    if ([...remotes.values()].some((r) => r.entered)) return void (rollAt = 0);
    rollAt = 0;
    const y = groundHeight(ROLL_FROM.x, ROLL_FROM.z) + BALL_R + 0.05;
    if (!placeBall(ROLL_FROM.x, y, ROLL_FROM.z)) return;
    const p = me.body.position;
    const dx = p.x - ROLL_FROM.x,
      dz = p.z - ROLL_FROM.z;
    const d = Math.hypot(dx, dz) || 1;
    ball.body.velocity.set((dx / d) * ROLL_SPEED, 0.6, (dz / d) * ROLL_SPEED);
    ball.body.angularVelocity.set((dz / d) * (ROLL_SPEED / BALL_R), 0, (-dx / d) * (ROLL_SPEED / BALL_R));
  },
  { phase: 'world', order: 43 },
);
