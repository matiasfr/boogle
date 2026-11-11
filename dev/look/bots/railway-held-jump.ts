// P1 on live v24: double jump while the first is still rising and keep holding Jump, and you floated up for good.
// Setup stands you still (flat ground where the seed lands you, or `heldjump=summit|cliff` on Needle Bell's summit deck
// by its cliff; cliff walks off it, opening the canopy while rising when you have the glider), taking the double jump at its device first if the room hasn't; the action jumps, air jumps at ~0.25 s while
// Jump is still held, holds it for six seconds and logs `HELDJUMP {...}` (`__heldJump`). Real input throughout; staging
// only teleports. The rail seed's view frames the flat spot from afar (the player mid-frame); crop the clip to see it.
//   npm run look -- --rail-seed q5-done --eval dev/look/evals/railway-held-jump.ts --until window.__placeDone \
//     --action dev/look/evals/railway-held-jump-act.ts --video --seconds 9
//   npm run look -- --rail-seed glide-earned --query heldjump=cliff --eval dev/look/evals/railway-held-jump.ts \
//     --until window.__placeDone --action dev/look/evals/railway-held-jump-act.ts --video --seconds 9
import { me, cam } from '../../../src/player/player.ts';
import { pressJump, releaseJump } from '../../../src/entities/player/state.ts';
import { inspectRailwayLegacy } from '../../../src/entities/railway/state.ts';
import { teleport } from '../../../src/physics/engine.ts';
import { triggerAction } from '../../../src/player/controls.ts';
import { interactTarget } from '../../../src/player/hands.ts';
import { input } from '../../../src/player/input.ts';
import { PLAYER_R } from '../../../src/constants.ts';

const SUMMIT = { x: 1015, y: 102.4, z: -6 }; // railway-glide.ts's summit pad
const page = window as Window & { __placeDone?: boolean; __heldJump?: unknown };
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
async function until(ok: () => boolean, what: string, ms: number) {
  const end = performance.now() + ms;
  while (!ok()) {
    if (performance.now() > end) throw new Error(`HELDJUMP timed out: ${what}`);
    await wait(20);
  }
}
const at = { x: 0, y: 0, z: 0 };
/** flat (default), summit (straight up on the deck), cliff (walk off its west edge; with the glider, open the canopy
 * while rising so the air jump re-arms it). */
const mode = new URLSearchParams(location.search).get('heldjump') ?? 'flat';

export async function stage() {
  await until(() => !!inspectRailwayLegacy()?.ready && !!me.body, 'railway ready', 60000);
  const b = me.body!;
  await until(() => me.coyote > 0, 'landed', 10000);
  const spawn = { x: b.position.x, y: b.position.y, z: b.position.z };
  // The double jump is a find, not a seed fact: take it at its device as gpu-portability.ts does (staging only).
  if (!inspectRailwayLegacy()!.jump) {
    const d = inspectRailwayLegacy()!.reward.jumpDevice;
    teleport(b, d.x, d.y + 0.5, d.z);
    b.velocity.set(0, 0, 0);
    await until(() => interactTarget()?.id === 'railway-jump-device', 'jump device target', 5000);
    triggerAction('interact', 'down');
    triggerAction('interact', 'up');
    await until(() => inspectRailwayLegacy()!.jump, 'accepted jump unlock', 5000);
    await wait(2000);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
    await until(() => !inspectRailwayLegacy()!.reward.showing, 'jump reveal dismissed', 5000);
  }
  const s = inspectRailwayLegacy()!;
  if (mode !== 'flat') teleport(b, SUMMIT.x + 2.5, SUMMIT.y + PLAYER_R + 0.2, SUMMIT.z - 1);
  else teleport(b, spawn.x, spawn.y + 0.2, spawn.z);
  b.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = Math.PI / 2;
  cam.pitch = -0.12;
  await until(() => me.coyote > 0 && Math.abs(b.velocity.y) < 0.05, 'standing still', 5000);
  at.x = b.position.x;
  at.y = b.position.y;
  at.z = b.position.z;
  for (const panel of document.querySelectorAll<HTMLDivElement>('body > div'))
    if (panel.style.zIndex === '9999' && panel.style.whiteSpace === 'pre') panel.style.display = 'none';
  console.log(`HELDJUMP staged ${JSON.stringify({ at, glide: s.glide })}`);
  page.__placeDone = true;
}

export async function hold() {
  const b = me.body!;
  const jumps = inspectRailwayLegacy()!.reward.tools.jumps;
  const cliff = mode === 'cliff';
  if (cliff) {
    window.__debugCam?.clear(); // the game's follow camera: the drop and the canopy read behind you
    cam.pitch = -0.3;
    input.keys.add('KeyW');
  }
  pressJump();
  if (cliff && inspectRailwayLegacy()!.glider.owned) {
    await wait(120);
    triggerAction('glide', 'down'); // armed while you rise
    triggerAction('glide', 'up');
    if (!inspectRailwayLegacy()!.glider.open) throw new Error('HELDJUMP the Glide action did not open the canopy');
    await wait(130);
  } else await wait(250); // the first jump is still rising, and Jump is still held
  pressJump();
  await until(() => inspectRailwayLegacy()!.reward.tools.jumps === jumps + 1, 'the air jump', 1000);
  const t0 = performance.now();
  let top = 0,
    topAt = 0;
  const trace: number[][] = [];
  while (performance.now() - t0 < 6000) {
    const rise = b.position.y - at.y;
    if (rise > top) {
      top = rise;
      topAt = performance.now() - t0;
    }
    trace.push([+((performance.now() - t0) / 1000).toFixed(1), +rise.toFixed(2), +b.velocity.y.toFixed(2)]);
    await wait(250);
  }
  releaseJump();
  input.keys.delete('KeyW');
  const result = {
    mode,
    top: +top.toFixed(2),
    topAtMs: Math.round(topAt),
    endRise: +(b.position.y - at.y).toFixed(2),
    glide: inspectRailwayLegacy()!.glide,
    canopy: inspectRailwayLegacy()!.glider.open,
    trace,
  };
  page.__heldJump = result;
  console.log(`HELDJUMP ${JSON.stringify(result)}`);
  // Bounded: the double jump tops out within a couple of seconds, a few metres up, and never climbs after.
  if (top > 8 || topAt > 2500) console.error(`HELDJUMP climbed while Jump was held: ${JSON.stringify(result)}`);
}
