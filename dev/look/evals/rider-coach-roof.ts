// driven by: node --import ./dev/sim/hooks.ts dev/look/rider-coach-roof.ts
// Controller proof helpers. Only initial placement teleports; every climb/exit uses production inputs and contacts.
import { me, cam } from '../../../src/player/player.ts';
import { input } from '../../../src/player/input.ts';
import { pressJump, releaseJump, localJumpCount } from '../../../src/entities/player/state.ts';
import { teleport, raycastClosest, rayHit } from '../../../src/physics/engine.ts';
import { carry } from '../../../src/physics/platforms.ts';
import { PLAYER_R } from '../../../src/constants.ts';
import { inspectRailway, rail, rw } from '../rail-read.ts';
import { line2Y } from '../../../src/entities/railway/line2-path.ts';
import type { WarpHandle } from '../warp.ts';
import { axisPoint, toAxis, ISLAND_C, ISLAND } from '../../../src/place/home-station.ts';
import { ORIGIN } from '../../../src/place/layout.ts';
const warp = (window as unknown as { __warp: WarpHandle }).__warp;

type Point = { x: number; y: number; z: number };
let target: Point;
let timer: ReturnType<typeof setInterval> | undefined;
let trace: ReturnType<typeof sample>[] = [];
const sample = () => ({
  time: performance.now(),
  x: me.body!.position.x,
  feet: me.body!.position.y - PLAYER_R,
  z: me.body!.position.z,
  vy: me.body!.velocity.y,
  grounded: me.coyote > 0,
  platform: carry.on?.id ?? null,
  jumps: localJumpCount(),
});
let selectedSlot: number | undefined;
export function select(slot: number) {
  selectedSlot = slot;
}
function train() {
  if (selectedSlot !== undefined) return inspectRailway()!.line2View.trains[selectedSlot]!;
  const row = inspectRailway()!.line2View.trains.find(
    (r) => r.longBoiler && r.cars.length === 6 && r.at === 0 && r.phase === 0,
  );
  if (!row) throw new Error('Production train is not standing at Home');
  return row;
}
function frame() {
  const row = train(),
    coach = row.cars.find((c) => c.role === 'rider')!,
    player = row.cars.find((c) => c.role === 'player')!;
  const d = Math.hypot(player.x - coach.x, player.z - coach.z);
  return {
    row,
    coach,
    player,
    ux: (player.x - coach.x) / d,
    uz: (player.z - coach.z) / d,
    railY: line2Y(row.along / 100),
  };
}
function floor(x: number, z: number, top: number, bottom: number) {
  const hit = rayHit();
  return raycastClosest({ x, y: top, z }, { x, y: bottom, z }, {}, hit) && hit.hitNormalWorld.y > 0.7
    ? hit.hitPointWorld.y
    : null;
}
function clearInput() {
  input.stickX = input.stickY = 0;
  input.keys.clear();
  releaseJump();
}
export async function stage(kind: 'platform' | 'bench' | 'load' | 'cab') {
  if (timer) clearInterval(timer);
  clearInput();
  const f = frame();
  if (!rail(rw()).jump) throw new Error('Controller proof requires the accepted air-jump unlock');
  if (kind === 'platform') {
    // Mount nearby level collisions before querying a takeoff; the seed can spawn the player far from Home.
    teleport(me.body!, f.coach.x + 8 * f.uz, f.railY + 3, f.coach.z - 8 * f.ux);
    await warp.step(120);
  }
  let start: Point;
  if (kind === 'platform') {
    const candidates: Point[] = [];
    for (const side of [-1, 1])
      for (const across of [2.1, 2.5, 2.9]) {
        const x = f.coach.x + side * across * f.uz,
          z = f.coach.z - side * across * f.ux;
        const y = floor(x, z, f.railY + 1.1, f.railY + 0.5);
        if (y !== null) candidates.push({ x, y, z });
      }
    if (!candidates.length)
      throw new Error(
        'No adjacent platform edge: ' +
          JSON.stringify({
            f,
            samples: [-4, -3, -2, 2, 3, 4].map((a) => ({
              a,
              y: floor(f.coach.x + a * f.uz, f.coach.z - a * f.ux, f.railY + 3, f.railY - 3),
            })),
          }),
      );
    start = candidates[0]!;
  } else if (kind === 'bench') {
    // The decorative bench/rail has no standing collider: settle from its visible top onto the real car deck.
    start = { x: f.player.x - f.ux * 0.85, y: f.railY + 1.65, z: f.player.z - f.uz * 0.85 };
  } else if (kind === 'cab') {
    const engine = f.row.cars.find((c) => c.role === 'engine')!;
    start = { x: engine.x - f.ux * 1.5, y: f.railY + 3.4, z: engine.z - f.uz * 1.5 };
  } else {
    const kit = f.row.cars.find((c) => c.role === 'kit')!;
    const candidates: Point[] = [];
    for (const across of [-0.45, 0, 0.45])
      for (const along of [-0.7, 0, 0.55]) {
        const x = kit.x + f.uz * across + f.ux * along,
          z = kit.z - f.ux * across + f.uz * along;
        const y = floor(x, z, f.railY + 2.8, f.railY + 0.7);
        if (y !== null) candidates.push({ x, y, z });
      }
    candidates.sort((a, b) => b.y - a.y);
    if (!candidates.length) throw new Error('No kit load collider');
    start = candidates[0]!;
  }
  teleport(me.body!, start.x, start.y + PLAYER_R + 0.06, start.z);
  me.body!.velocity.set(0, 0, 0);
  await warp.step(90);
  target = { x: f.coach.x, y: f.railY + 2.05, z: f.coach.z };
  window.__debugCam!.set(
    [f.coach.x - f.uz * 10 - f.ux * 4, f.railY + 7, f.coach.z + f.ux * 10 - f.uz * 4],
    [f.coach.x, f.railY + 1.6, f.coach.z],
    55,
  );
  await warp.step(2);
  return { kind, staged: start, settled: sample(), target, train: f.row };
}
export function begin(next?: Point, follow = false) {
  if (next) target = next;
  trace = [];
  clearInput();
  const t0 = performance.now();
  let air = false;
  if (Math.hypot(target.x - me.body!.position.x, target.z - me.body!.position.z) > 3) input.keys.add('ShiftLeft');
  pressJump();
  timer = setInterval(() => {
    const t = performance.now() - t0,
      b = me.body!;
    if (!air && t >= 300) {
      pressJump();
      air = true;
    }
    if (follow) {
      const f = frame();
      target = { x: f.coach.x, y: f.railY + 2.05, z: f.coach.z };
    }
    const dx = target.x - b.position.x - b.velocity.x * 0.12,
      dz = target.z - b.position.z - b.velocity.z * 0.12;
    const distance = Math.hypot(dx, dz);
    cam.yaw = Math.atan2(-dx, -dz);
    input.stickY = -Math.min(1, distance * 2);
    if (t > 2400) clearInput();
    trace.push(sample());
  }, 1000 / 60);
}
export function finish() {
  clearInterval(timer);
  timer = undefined;
  clearInput();
  const end = sample();
  return {
    target,
    end,
    reached:
      end.grounded && Math.abs(end.feet - target.y) < 0.1 && Math.hypot(end.x - target.x, end.z - target.z) < 0.6,
    trace,
  };
}
export function canopyTarget() {
  // The adjacent upper surface most likely to become a shortcut. Compare coach with the pre-existing cab roof.
  const f = frame();
  const points: Point[] = [];
  for (let along = -8; along <= 8; along += 0.5)
    for (let across = -10; across <= 10; across += 0.5) {
      if (Math.abs(across) < 1.5) continue;
      const x = f.coach.x + across * f.uz + along * f.ux,
        z = f.coach.z - across * f.ux + along * f.uz;
      const y = floor(x, z, f.railY + 8, f.railY + 3.5);
      if (y !== null) points.push({ x, y, z });
    }
  points.sort((a, b) => Math.hypot(a.x - f.coach.x, a.z - f.coach.z) - Math.hypot(b.x - f.coach.x, b.z - f.coach.z));
  if (points[0]) return { ...points[0], source: 'nearest raised walkable collider' };
  if (selectedSlot !== undefined) return null;
  // Home's visible canopy has no roof collider. Still aim at its visual top to demonstrate the exit attempt.
  const a = toAxis({ x: f.coach.x - ORIGIN.x, z: f.coach.z }).a;
  const p = axisPoint(a, ISLAND_C);
  return {
    x: p.x + ORIGIN.x,
    y: f.railY + ISLAND.lift + 4.6 + 0.3,
    z: p.z,
    source: 'visible Home canopy, no raised collider in scan',
  };
}
