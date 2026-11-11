// The Pier's east platform (docs/plans/ring-island-build1.md, step 4a, calls 53-57): after a jump-in at a Q6/crossing
// seed the player stands ON the platform's south end, not in it and not 0.7 m above it. Waits for the halt to be built,
// then prints `PIEREAST ...`: the player's position, the Pier halt's deck (x, y, z, built), the lever knobs (Pier, and the
// Railhead's and Ring Island's from `ringLevers`), and how high the player's centre is over the deck.
//   npm run look -- --rail-seed crossing-done --eval dev/look/evals/pier-east.ts --warm 8
export {};
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
type Lever = { label: string; on: boolean; chained: boolean; x: number; y: number; z: number };
type Halts = {
  halts?: { name: string; x: number; y: number; z: number; up: boolean; lever: Lever[] }[];
  ringLevers?: { halt: number; platform: string; label: string; stands: boolean; chained: boolean }[];
};
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const f2 = (n: number) => +n.toFixed(2);
const view = () => inspectRailway() as unknown as Halts | null;
const end = performance.now() + 30000;
const pier = () => view()?.halts?.find((h) => h.name === 'Pier');
// The jump-in lands the player after the eval starts: wait for the Pier's x (about 1402) and the halt standing.
while ((!pier()?.up || (me.body?.position.x ?? 0) < 1300) && performance.now() < end) await wait(100);
await wait(1500);
const p = me.body!.position;
const h = pier();
const out = {
  player: { x: f2(p.x), y: f2(p.y), z: f2(p.z) },
  pier: h && { x: f2(h.x), y: f2(h.y), z: f2(h.z), up: h.up },
  // The sphere's centre is PLAYER_R above its feet: standing on the deck puts its centre at deck + R.
  heightOverDeck: h ? f2(p.y - h.y) : null,
  lever: h?.lever.map((l) => ({ label: l.label, on: l.on, chained: l.chained, x: f2(l.x), y: f2(l.y), z: f2(l.z) })),
  ringLevers: view()?.ringLevers?.map((l) => ({
    halt: l.halt,
    platform: l.platform,
    label: l.label,
    stands: l.stands,
    chained: l.chained,
  })),
};
console.log(`PIEREAST ${JSON.stringify(out)}`);
(window as unknown as { __pierEast?: unknown }).__pierEast = out;
