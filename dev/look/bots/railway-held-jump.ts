// P1 on live v24: double jump while the first is still rising and keep holding Jump, and you floated up for good.
// Setup stands you still (flat ground where the seed lands you, or `heldjump=summit` on Needle Bell's summit deck by its
// cliff) with a fixed side-on camera; the action jumps, air jumps at ~0.25 s while Jump is still held, holds it for
// six seconds and logs `HELDJUMP {...}` (`__heldJump`). Real input throughout; staging only teleports.
//   npm run look -- --rail-seed q5-done --eval dev/look/evals/railway-held-jump.ts --until window.__placeDone \
//     --action dev/look/evals/railway-held-jump-act.ts --video --seconds 9
//   npm run look -- --rail-seed glide-earned --query heldjump=summit --eval dev/look/evals/railway-held-jump.ts \
//     --until window.__placeDone --action dev/look/evals/railway-held-jump-act.ts --video --seconds 9
import { me, cam } from '../../../src/player/player.ts';
import { pressJump, releaseJump } from '../../../src/entities/player/state.ts';
import { inspectRailway } from '../../../src/entities/railway/state.ts';
import { teleport } from '../../../src/physics/engine.ts';
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

export async function stage() {
  await until(() => !!inspectRailway()?.ready && !!me.body, 'railway ready', 60000);
  const s = inspectRailway()!;
  if (!s.jump) throw new Error('HELDJUMP the room has no double jump: use --rail-seed q5-done or later');
  const b = me.body!;
  if (new URLSearchParams(location.search).get('heldjump') === 'summit') {
    teleport(b, SUMMIT.x + 2.5, SUMMIT.y + PLAYER_R + 0.2, SUMMIT.z - 1);
    b.velocity.set(0, 0, 0);
  }
  cam.yaw = me.yaw = Math.PI / 2;
  cam.pitch = -0.12;
  await until(() => me.coyote > 0 && Math.abs(b.velocity.y) < 0.05, 'standing still', 5000);
  at.x = b.position.x;
  at.y = b.position.y;
  at.z = b.position.z;
  // Side-on and still, so a climb reads against the ground and the sky rather than a camera that follows you up.
  window.__debugCam?.set([at.x, at.y + 4, at.z + 16], [at.x, at.y + 4, at.z], 55);
  for (const panel of document.querySelectorAll<HTMLDivElement>('body > div'))
    if (panel.style.zIndex === '9999' && panel.style.whiteSpace === 'pre') panel.style.display = 'none';
  console.log(`HELDJUMP staged ${JSON.stringify({ at, glide: s.glide })}`);
  page.__placeDone = true;
}

export async function hold() {
  const b = me.body!;
  const jumps = inspectRailway()!.reward.tools.jumps;
  pressJump();
  await wait(250); // the first jump is still rising, and Jump is still held
  pressJump();
  await until(() => inspectRailway()!.reward.tools.jumps === jumps + 1, 'the air jump', 1000);
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
  const result = {
    top: +top.toFixed(2),
    topAtMs: Math.round(topAt),
    endRise: +(b.position.y - at.y).toFixed(2),
    glide: inspectRailway()!.glide,
    canopy: inspectRailway()!.glider.open,
    trace,
  };
  page.__heldJump = result;
  console.log(`HELDJUMP ${JSON.stringify(result)}`);
  // Bounded: the double jump tops out within a couple of seconds, a few metres up, and never climbs after.
  if (top > 8 || topAt > 2500) console.error(`HELDJUMP climbed while Jump was held: ${JSON.stringify(result)}`);
}
