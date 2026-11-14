// The gap's cues (docs/plans/gap-readability.md, steps 1 and 3), by real input at `--rail-seed gap-footed`:
// Ring Island's hook ring from both sides. First from the folk's brace platform (the ring wakes, a Hook press pulls
// you home onto the gold pad), then from the take-off on our deck (the ring sleeps: gold, no key chip, a Hook press is
// the deny flick). It ends standing at the take-off facing the ring, so the still (with --hud) shows the ring asleep,
// its rope to the pad, the take-off board and the windsock.
//   npm run look -- --rail-seed gap-footed --hud --eval dev/look/evals/gap-cues.ts --name gap-takeoff
// Staging teleports only. Prints `GAP ...` lines and writes `__gapCues`.
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { inspectRailway } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const layout = (await import(
  '/src/sim/railway-ring-layout.ts' as string
)) as typeof import('../../../src/sim/railway-ring-layout.ts');
const page = window as unknown as Window & { __gapCues?: Record<string, unknown> };
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const key = (type: 'keydown' | 'keyup', code: string) =>
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
const say = (text: string) => console.log(`GAP ${text}`);
const b = me.body!;
const ring = { x: layout.RING_HOOK.x / 100, y: layout.RING_HOOK.y / 100, z: layout.RING_HOOK.z / 100 };
function stand(u: number, lat: number, y: number) {
  const p = layout.ringAt(Math.round(u * 100), Math.round(lat * 100));
  teleport(b, p.x / 100, y + 0.85, p.z / 100);
  b.velocity.set(0, 0, 0);
}
function faceRing() {
  const dx = ring.x - b.position.x,
    dz = ring.z - b.position.z;
  me.yaw = cam.yaw = Math.atan2(-dx, -dz);
  cam.pitch = Math.atan2(ring.y - (b.position.y + 1.3), Math.hypot(dx, dz));
}
const hook = () => {
  const h = inspectRailway()!.hookShot;
  return { owned: h.owned, pick: h.pick, asleep: h.asleep, pulls: h.pulls, denied: h.denied, chip: h.chip };
};
async function press() {
  key('keydown', 'KeyF');
  await wait(60);
  key('keyup', 'KeyF');
}
const pad = layout.RING_HOOK.pad;
const out: Record<string, unknown> = {};
// From the brace platform: the ring is awake, and the pull lands on the gold pad.
stand(288, 6, layout.RING_BRACE_PLATFORM.y / 100);
await wait(600);
faceRing();
await wait(500);
const there = hook();
await press();
await wait(3500);
out.fromBrace = {
  before: there,
  after: hook(),
  metresFromPad: +Math.hypot(b.position.x - pad.x / 100, b.position.z - pad.z / 100).toFixed(2),
  y: +b.position.y.toFixed(2),
};
say(`from the brace platform ${JSON.stringify(out.fromBrace)}`);
// From the take-off on our deck: asleep, no chip, the press denied.
stand(258.6, 3.4, pad.y / 100);
await wait(600);
faceRing();
await wait(500);
const here = hook();
await press();
await wait(400);
out.fromTakeOff = { before: here, after: hook() };
say(`from the take-off ${JSON.stringify(out.fromTakeOff)}`);
faceRing();
page.__gapCues = out;
export {};
