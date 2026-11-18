// The lookout's secret box (the mossy scarf) on a production world: stand on the ground against its block, or up on
// it, or jump once from the ground with Open pressed all the way up, and say whether Open the crate is offered
// (src/player/reach.ts). Also prints, for every secret box, whether any ground round it within reach is offered (a
// raised one shouldn't be), whether the top of one jump from that ground is (a raised one shouldn't be either: G27,
// docs/plans/grant-c8-batch.md), how much ground round a ground box isn't, and, for each raised box, the real body
// dropped beside it from 8 sides: where it lands and whether the prompt is offered there.
//   npm run look -- --rail-seed q6-done --query 'shot=play&spot=ground' --eval dev/look/evals/secret-reach.ts --hud --name reach-ground
//   npm run look -- --rail-seed q6-done --query 'shot=play&spot=top' --eval dev/look/evals/secret-reach.ts --hud --name reach-top
//   npm run look -- --rail-seed q6-done --query 'shot=play&spot=jump' --eval dev/look/evals/secret-reach.ts \
//     --action .look/reach-jump.ts --hud --name reach-jump
// (.look/reach-jump.ts holds the one line `void window.__reachJump(); export {};`: it starts the jump and returns, so the
// motion sheet samples it.)
// (q6-done: the room has the glider, so the balcony's box waits too.)
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { inReach } = (await import('/src/player/reach.ts' as string)) as typeof import('../../../src/player/reach.ts');
const { inspectFinds } = (await import(
  '/src/entities/finds/state.ts' as string
)) as typeof import('../../../src/entities/finds/state.ts');
const { PLAYER_R } = (await import('/src/constants.ts' as string)) as typeof import('../../../src/constants.ts');
const { H } = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
const { ORIGIN } = (await import('/src/place/layout.ts' as string)) as typeof import('../../../src/place/layout.ts');
const { SECRETS, padById } = (await import(
  '/src/place/tech-layout.ts' as string
)) as typeof import('../../../src/place/tech-layout.ts');
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const ox = ORIGIN.x;
/** m one jump from the ground lifts your feet at its top (7.6 m/s, gravity 18, the apex float; the plan's G27). */
const APEX = 1.68;
await (async () => {
  const end = performance.now() + 60000;
  while (!(me.body && inspectFinds()?.ledges && inspectFinds()?.boxes) && performance.now() < end) await wait(100);
})();
if (!me.body || !inspectFinds()?.ledges) throw new Error('secret-reach needs the player and the live finds');
const finds = inspectFinds()!,
  boxes = finds.boxes ?? [],
  ledges = finds.ledges ?? {};
for (const s of SECRETS) {
  const box = boxes.find((b) => b.id === s.id)?.world;
  if (!box) continue; // the jump course's "block" waits for job E
  const x = box.x,
    base = { x, y: box.y, z: box.z },
    ledge = ledges[s.id];
  let offered = 0,
    refused = 0,
    jumped = 0, // offered at the top of one jump from that ground
    before = 0, // the rule before G27 (no ledge), from the ground
    beforeJump = 0, // and at the top of one jump
    low = Infinity,
    high = -Infinity;
  for (let a = 0; a < 48; a++)
    for (const d of [0.5, 1.25, 2, 2.8, 3.35]) {
      const px = x + Math.cos((a / 48) * Math.PI * 2) * d,
        pz = box.z + Math.sin((a / 48) * Math.PI * 2) * d,
        g = H(px, pz);
      low = Math.min(low, g);
      high = Math.max(high, g);
      const at = (feet: number) => ({ x: px, y: feet + PLAYER_R, z: pz });
      if (inReach(at(g), base, 3.4)) before++;
      if (inReach(at(g + APEX), base, 3.4)) beforeJump++;
      if (inReach(at(g + APEX), base, 3.4, ledge)) jumped++;
      if (inReach(at(g), base, 3.4, ledge)) offered++;
      else refused++;
    }
  console.log(
    `PLAY reach ${s.id} ${s.y === null ? 'ground' : `raised (ledge ${ledge!.toFixed(2)})`} base ${base.y.toFixed(2)} ground ${low.toFixed(2)}..${high.toFixed(2)}: from the ground ${offered} offered, ${refused} refused; at the top of one jump ${jumped} offered (before G27: ${before} from the ground, ${beforeJump} at a jump's top)`,
  );
}
// The real body, dropped beside each raised box from 8 sides, 1.4 m out: where it lands, and whether it's offered there.
const body = me.body;
for (const s of SECRETS) {
  const ledge = ledges[s.id],
    box = boxes.find((b) => b.id === s.id)?.world;
  if (ledge === undefined || !box) continue;
  const rows: string[] = [];
  let onLedge = 0,
    offeredOnLedge = 0;
  for (let a = 0; a < 8; a++) {
    const px = box.x + Math.cos((a / 8) * Math.PI * 2) * 1.4,
      pz = box.z + Math.sin((a / 8) * Math.PI * 2) * 1.4;
    teleport(body, px, box.y + 1.4 + PLAYER_R, pz);
    body.velocity.set(0, 0, 0);
    await wait(900);
    const feet = body.position.y - PLAYER_R,
      id = interactTarget()?.id ?? 'none',
      ok = id === `finds-secret-${s.id}`,
      level = Math.abs(feet - ledge) <= 0.3;
    if (level) onLedge++;
    if (level && ok) offeredOnLedge++;
    rows.push(`${a * 45}°:${feet.toFixed(2)}${ok ? '+' : '-'}`);
  }
  console.log(
    `PLAY reach drop ${s.id} ${box.waiting ? 'waiting' : 'not waiting'} ledge ${ledge.toFixed(2)}: ${offeredOnLedge} of ${onLedge} landings on the ledge offered (side:feet±offered ${rows.join(' ')})`,
  );
}
// Keep the player's own camera, so the still shows the prompt (or none) as you'd see it.
window.__debugCam!.set = () => {};
const spot = new URLSearchParams(location.search).get('spot') ?? 'ground';
const lk = padById('lookout'),
  x = lk.x + ox,
  z = lk.z;
// On the ground: against the block's east face, 2.6 m from the box (its block is solid all the way down). The jump
// starts 3 m out on the ground (17.05 there, 18 November), where the rule before G27 offered the box at a jump's top
// (feet within 0.6 + 0.3 × 3 = 1.5 m of it; a jump lifts them about 1.55 m). Nearer the face the pad's slab overhangs
// the block and caps the jump. On top: a metre and a half from the box.
const out = spot === 'jump' ? 3 : 2.6,
  dz = spot === 'jump' ? 0 : 0.6;
const at =
  spot === 'top' ? { x: x + 1.5, y: lk.top + 1, z: z + 0.6 } : { x: x + out, y: H(x + out, z + dz) + 1, z: z + dz };
teleport(body, at.x, at.y, at.z);
body.velocity.set(0, 0, 0);
cam.yaw = me.yaw = Math.atan2(at.x - x, at.z - z);
await wait(2500);
console.log(`PLAY reach spot ${spot}: target ${interactTarget()?.id ?? 'none'} at y ${body.position.y.toFixed(2)}`);
/** One jump from where you stand, with Open pressed every 50 ms all the way up and down: prints the highest your feet
 * got, under the box's base, whether the lookout's box was ever offered or opened, and whether the rule before G27 (no
 * ledge) would have offered it on any frame. */
(window as unknown as { __reachJump?: () => Promise<void> }).__reachJump = async () => {
  const key = (type: string, code: string) => window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
  const start = body.position.y - PLAYER_R;
  const box = { x, y: lk.top, z };
  let top = start,
    offered = false,
    before = false,
    frames = 0;
  const end = performance.now() + 1600;
  const sample = () => {
    frames++;
    top = Math.max(top, body.position.y - PLAYER_R);
    if (interactTarget()?.id === 'finds-secret-lookout') offered = true;
    if (inReach(body.position, box, 3.4)) before = true;
    if (performance.now() < end) requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
  key('keydown', 'Space');
  while (performance.now() < end) {
    key('keydown', 'KeyE');
    await wait(25);
    key('keyup', 'KeyE');
    await wait(25);
  }
  key('keyup', 'Space');
  const opened = !inspectFinds()!.boxes!.find((b) => b.id === 'lookout')!.world.waiting;
  console.log(
    `PLAY reach jump: feet ${start.toFixed(2)} up to ${top.toFixed(2)} (${(top - start).toFixed(2)} m), ${(lk.top - top).toFixed(2)} m under the box; offered ${offered}, opened ${opened}; the rule before G27 would have offered it: ${before} (${frames} frames)`,
  );
};
export {};
