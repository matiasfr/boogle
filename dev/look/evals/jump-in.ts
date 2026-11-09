// A playtest jump-in end to end (docs/plans/playtest-jump-in.md, step 5): open the page with `--query from=q3-done`;
// the boot asks the local server for a seeded room, and this checks the page is in it with Q3 laid and Q4 not, then
// frames Q3. `jumpwant=<stage>` checks another stage (its line-two count from `jumpdone=<n>`).
//   npm run look -- --query from=q3-done --eval dev/look/evals/jump-in.ts --until window.__jumpDone --hud
const { inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { getRoomId } = (await import('/src/netplay/net.ts' as string)) as typeof import('../../../src/netplay/net.ts');
const { roomSeed } = (await import(
  '/src/netplay/room-seed.ts' as string
)) as typeof import('../../../src/netplay/room-seed.ts');
const { JUMP_ROOM_RE } = (await import(
  '/src/world/railway-jump.ts' as string
)) as typeof import('../../../src/world/railway-jump.ts');

const shot = window as Window & { __jumpResult?: unknown; __jumpDone?: boolean };
const query = new URLSearchParams(location.search);
const want = query.get('jumpwant') ?? 'q3-done';
const done = Number(query.get('jumpdone') ?? 3);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = performance.now() + 30_000;
while (!inspectRailway()?.ready && performance.now() < until) await wait(50);
const state = inspectRailway();
const seed = await roomSeed();
const stations = state?.line2?.stations ?? [];
const result = {
  room: getRoomId(),
  search: location.search,
  ready: !!state?.ready,
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
// Frame the last laid stretch, from above and behind.
const frame = state!.line2View.frames[Math.max(0, done - 1)];
if (frame) window.__debugCam!.set([frame.x - 14, frame.y + 12, frame.z + 18], [frame.x, frame.y, frame.z], 65);
await wait(500);
shot.__jumpDone = true;
export {};
