// npm run look -- --rail-seed q6-done --query townat=shelf --eval dev/look/evals/railway-town.ts --action dev/look/evals/prefab-curio.ts --hud
// --action with railway-town.ts, townat=shelf. Exercise the existing personal wardrobe and shelf E behavior.
const { inspectTown, townShelf } = (await import(
  '/src/entities/town/state.ts' as string
)) as typeof import('../../../src/entities/town/state.ts');
const { wardrobe, inspectWardrobe } = (await import(
  '/src/entities/wardrobe/state.ts' as string
)) as typeof import('../../../src/entities/wardrobe/state.ts');
const { GIFTS } = (await import(
  '/src/render/cosmetic-parts.ts' as string
)) as typeof import('../../../src/render/cosmetic-parts.ts');
const { interactTarget, interactDown, interactUp } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const require = (ok: unknown, message: string) => {
  if (!ok) throw new Error(`CURIO ${message}`);
};
const shelf = townShelf();
const store = wardrobe();
require(shelf && store, 'shelf and wardrobe loaded');
require(!interactTarget(), 'shelf offers no E target');
const before = JSON.stringify(inspectWardrobe());
interactDown();
interactUp();
await wait(200);
require(JSON.stringify(inspectWardrobe()) === before, 'E at shelf leaves wardrobe unchanged');
for (const gift of GIFTS) {
  store!.grant(gift.id, { wear: false });
  const sight = inspectTown()!.shelf!;
  const at = gift.area ? sight.bay : sight;
  require(at.uncovered.includes(gift.id) ===
    (gift.slot !== undefined), `${gift.id} keeps its existing grant/display behavior`);
}
const sight = inspectTown()!.shelf!;
require(sight.covered === 2 && sight.bay.covered === 0, 'only the two existing unobtainable shapes stay covered');
require(JSON.stringify(sight.uncovered) ===
  JSON.stringify(GIFTS.filter((g) => !g.area && g.slot !== undefined).map((g) => g.id)), 'shelf order unchanged');
require(JSON.stringify(sight.bay.uncovered) ===
  JSON.stringify(GIFTS.filter((g) => g.area).map((g) => g.id)), 'bay order unchanged');
const pegs = Array.from({ length: 9 }, (_, k) =>
  shelf!.bayPeg(k, shelf!.shelfGroup.position.clone().set(0, 0, 0)).toArray(),
);
const crystals = Array.from({ length: 7 }, (_, k) =>
  shelf!.crystalPeg(k, 7, shelf!.shelfGroup.position.clone().set(0, 0, 0)).toArray(),
);
require(pegs.flat().every(Number.isFinite) && crystals.flat().every(Number.isFinite), 'find/crystal pegs finite');
await wait(1500);
console.log(
  `CURIO PASS ${JSON.stringify({ shelf: inspectTown()!.shelf, pegs, crystals, target: interactTarget()?.id ?? null })}`,
);
export {};
