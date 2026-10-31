// The beach ball keeps its place between visits (src/world/rules/ball.ts): once it has lain still for a moment, the tab
// that simulates it reports where, and the first time this tab holds the world it puts the ball back there (unless
// someone is already playing with it). The physics stays the ball's own (Owner, src/physics/ball.js); this only moves
// the ball at load. Serves DESIGN.md 9 (leave something for the next visitor) and "you global, world per room".
import { rules } from '../world/game-world.ts'; // first: the lockstep rules register before anything else
import { onSnapshot, submitEdit } from '../world/sync.ts';
import { onFrame } from '../loop.js';
import { ball, placeBall } from '../physics/ball.js';

const STILL_SPEED = 0.3; // m/s: slower than this counts as lying still
const STILL_MS = 1500; // lying still this long, then report
const RESEND_MS = 3000; // never report more often than this from one tab
const MOVED = 0.5; // metres from the saved spot before it is worth a new report

let stillSince = 0;
let lastSubmit = -1e9;

onFrame(({ now }: { now: number }) => {
  if (!ball.mine || ball.held || ball.disp.v.length() >= STILL_SPEED) {
    stillSince = 0;
    return;
  }
  stillSince ||= now;
  if (now - stillSince < STILL_MS || now - lastSubmit < RESEND_MS) return;
  const { x, y, z } = ball.disp.p;
  const saved = rules.ball.rest();
  if (saved && Math.hypot(x - saved[0] / 100, y - saved[1] / 100, z - saved[2] / 100) <= MOVED) return;
  lastSubmit = now;
  submitEdit({ op: 'ball.rest', i: 0, j: 0, x: Math.round(x * 100), y: Math.round(y * 100), z: Math.round(z * 100) });
});

let restored = false;
onSnapshot(() => {
  if (restored) return;
  restored = true;
  const at = rules.ball.rest();
  if (at) placeBall(at[0] / 100, at[1] / 100 + 0.05, at[2] / 100);
});
