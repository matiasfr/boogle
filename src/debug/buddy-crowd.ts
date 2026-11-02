// ?buddies=8: that many Buddies jogging on the spot around spawn, and a readout of the frame rate and how long loading
// the body took, to measure the cost of a full room on a phone or iPad without eight people. Debug only. Local.
import { onFrame } from '../loop.ts';
import { scene } from '../render/scene.ts';
import { COLORS, PLAYER_R, SPAWN } from '../constants.ts';
import { groundHeight } from '../island/terrain.ts';
import { animateAvatar, makeAvatar, type Avatar } from '../player/avatars.ts';
import { bakeMs } from '../player/buddy/body.ts';

const n = Math.min(32, Number(new URLSearchParams(location.search).get('buddies')) || 8);
const row: Avatar[] = [];
for (let i = 0; i < n; i++) {
  const a = makeAvatar(i % COLORS.length);
  const x = SPAWN.x + ((i % 4) - 1.5) * 1.6,
    z = SPAWN.z - 4 - Math.floor(i / 4) * 1.8;
  a.position.set(x, groundHeight(x, z) + PLAYER_R, z);
  scene.add(a);
  row.push(a);
}
const out = document.createElement('div');
out.style.cssText =
  'position:fixed;left:50%;top:56px;transform:translateX(-50%);z-index:50;padding:6px 10px;border-radius:8px;background:rgba(12,28,52,.8);color:#fff;font:600 13px system-ui,sans-serif;pointer-events:none;white-space:nowrap';
document.body.append(out);

let frames = 0,
  worst = 0,
  since = performance.now(),
  last = since;
onFrame(
  ({ dt }) => {
    for (const a of row) animateAvatar(a, 4.5, false, dt);
    const now = performance.now();
    worst = Math.max(worst, now - last);
    last = now;
    frames++;
    if (now - since < 2000) return;
    const fps = Math.round((frames * 1000) / (now - since));
    out.textContent = `${n} Buddies + you: ${fps} fps, worst frame ${Math.round(worst)} ms, clips prepared in ${bakeMs} ms`;
    frames = 0;
    worst = 0;
    since = now;
  },
  { phase: 'update', order: 43 },
);
