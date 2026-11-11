// A playtest jump-in end to end (docs/plans/playtest-jump-in.md, step 5): open the page with `--query from=q3-done`;
// the boot asks the local server for a seeded room, and this checks the page is in it with Q3 laid and Q4 not, then
// frames Q3. `jumpwant=<stage>` checks another stage (its line-two count from `jumpdone=<n>`). A row with a `land`
// also checks the avatar landed there, standing, and frames it from behind instead.
//   npm run look -- --query from=q3-done --eval dev/look/evals/jump-in.ts --until window.__jumpDone --hud
const { inspectRailway, line2Jobs, railReady, rw } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { getRoomId } = (await import('/src/netplay/net.ts' as string)) as typeof import('../../../src/netplay/net.ts');
const { roomSeed } = (await import(
  '/src/netplay/room-seed.ts' as string
)) as typeof import('../../../src/netplay/room-seed.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { JUMP_ROOM_RE, jumpOf } = (await import(
  '/src/world/railway-jump.ts' as string
)) as typeof import('../../../src/world/railway-jump.ts');

const shot = window as Window & { __jumpResult?: unknown; __jumpDone?: boolean };
const query = new URLSearchParams(location.search);
const want = query.get('jumpwant') ?? 'q3-done';
const done = Number(query.get('jumpdone') ?? 3);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const ready = await railReady(30_000);
const seed = await roomSeed();
// Completion is a row (no clock): read without `at`.
const stations = ready ? line2Jobs(rw()).map(({ job }) => job) : [];
const result = {
  room: getRoomId(),
  search: location.search,
  ready,
  completed: stations.map((s) => s.completion),
  seed,
};
shot.__jumpResult = result;
console.log(`JUMP ${JSON.stringify(result)}`);
const problems = [
  !JUMP_ROOM_RE.test(result.room) && `room ${result.room} is not a jump room`,
  result.room.startsWith('look') && 'still in the look room',
  query.has('from') && 'the address still has from=',
  !result.ready && 'the railway never became ready',
  done > 0 && stations[done - 1]?.completion !== 1 && `Q${done} is not laid`,
  stations[done]?.completion === 1 && `Q${done + 1} is already laid`,
  seed?.stage !== want && `the room's seed is ${seed?.stage}, not ${want}`,
].filter(Boolean);
if (problems.length) throw new Error(`jump-in: ${problems.join('; ')}`);
const land = jumpOf(want)?.land;
type V3 = [number, number, number];
let aim: [V3, V3] | undefined;
if (land) {
  // The landing: within a metre of the row's spot, feet on its surface, standing still.
  const near = () => {
    const p = me.body?.position;
    return !!p && Math.hypot(p.x - land.x, p.z - land.z) < 1 && Math.abs(me.body!.velocity.y) < 0.3;
  };
  const by = performance.now() + 15_000;
  while (!near() && performance.now() < by) await wait(100);
  await wait(1500);
  const p = me.body!.position;
  const landed = { x: p.x, y: p.y, z: p.z, yaw: me.yaw, want: land };
  console.log(`JUMP LAND ${JSON.stringify(landed)}`);
  if (!near()) {
    // What stands there: a ray down from 3 m above the landing, on a 2 m grid, to pick a better spot.
    const { raycastClosest, rayHit } = (await import(
      '/src/physics/engine.ts' as string
    )) as typeof import('../../../src/physics/engine.ts');
    const { GROUP } = (await import(
      '/src/physics/physics.ts' as string
    )) as typeof import('../../../src/physics/physics.ts');
    const hit = rayHit();
    for (const dz of [-4, -2, 0, 2, 4]) {
      const cells = [-4, -2, 0, 2, 4].map((dx) => {
        const from = { x: land.x + dx, y: land.y + 3, z: land.z + dz };
        const ok = raycastClosest(from, { ...from, y: land.y - 6 }, { mask: GROUP.SCENERY }, hit);
        return ok ? hit.hitPointWorld.y.toFixed(1) : '--';
      });
      console.log(`JUMP PROBE dz${dz}: ${cells.join(' ')}`);
    }
  }
  if (!near()) throw new Error(`jump-in: the avatar is at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}, not the landing`);
  if (p.y < land.y || p.y > land.y + 1.5)
    throw new Error(`jump-in: the avatar's height ${p.y.toFixed(2)} is off ${land.y}`);
  // From behind and above, looking the way the avatar faces.
  const fx = -Math.sin(me.yaw),
    fz = -Math.cos(me.yaw);
  aim = [
    [p.x - fx * 7, p.y + 3.5, p.z - fz * 7],
    [p.x + fx * 8, p.y + 0.5, p.z + fz * 8],
  ];
} else {
  // Frame the last laid stretch, from above and behind.
  const frame = inspectRailway()!.line2View.frames[Math.max(0, done - 1)];
  if (frame)
    aim = [
      [frame.x - 14, frame.y + 12, frame.z + 18],
      [frame.x, frame.y, frame.z],
    ];
}
// look.ts freezes its default view once this script returns (a ?from= page has no --rail-seed save), so hold the
// framing for a second after that, then say done.
void (async () => {
  for (let i = 0; i < 20; i++) {
    if (aim) window.__debugCam!.set(aim[0], aim[1], 65);
    await wait(50);
  }
  shot.__jumpDone = true;
})();
export {};
