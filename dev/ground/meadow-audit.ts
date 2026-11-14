// What the meadow's keep map misses, by the world's own colliders: for every 1 m texel where a flower may stand, a ray
// straight down from 1.5 m above the ground. A hit more than 8 cm above the ground is something solid standing where
// flowers grow. Prints `MEADOW AUDIT` lines: the count, then the worst 4 m blocks (Place-local x, z and hits).
//   npm run look -- --eval dev/ground/meadow-audit.ts --until "window.__meadowAudit" --name meadow-audit
// It sees only colliders that exist when it runs (the start of the game, or the save `--rail-seed` names), and nothing
// without one (a sign, a socket's marker, a dropped log).
const { me } = await import('/src/player/player.ts' as string);
const { teleport, raycastClosest, rayHit } = await import('/src/physics/engine.ts' as string);
const { colliderHeight } = await import('/src/place/ground-layers.ts' as string);
const { meadowKeep, KEEP_W, KEEP_H } = await import('/src/place/meadow-field.ts' as string);
const { pathAt } = await import('/src/place/path-field.ts' as string);
const { GRID, ORIGIN } = await import('/src/place/layout.ts' as string);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
while (!me.body) await wait(80);
teleport(me.body, ORIGIN.x + 300, 80, ORIGIN.z + 200); // out of the way of every ray
await wait(4000);
const keep: Uint8Array = meadowKeep();
const hit = rayHit();
const blocks = new Map<string, number>();
let open = 0,
  solid = 0;
for (let j = 0; j < KEEP_H; j++)
  for (let i = 0; i < KEEP_W; i++) {
    if (keep[(i + j * KEEP_W) * 4]! < 45) continue; // under 0.7 m from a kept thing: nothing grows
    const x = GRID.x0 + i,
      z = GRID.z0 + j;
    if (pathAt(x, z).edge < 0.45) continue;
    open++;
    const ground = colliderHeight(x, z);
    const from = { x: x + ORIGIN.x, y: ground + 1.5, z: z + ORIGIN.z };
    if (!raycastClosest(from, { ...from, y: ground - 0.5 }, {}, hit) || hit.hitPointWorld.y < ground + 0.08) continue;
    solid++;
    const key = `${Math.floor(x / 4) * 4},${Math.floor(z / 4) * 4}`;
    blocks.set(key, (blocks.get(key) ?? 0) + 1);
  }
const worst = [...blocks].sort((a, b) => b[1] - a[1]).slice(0, 60);
console.log(`MEADOW AUDIT ${solid} of ${open} open texels have something solid on them, in ${blocks.size} blocks`);
for (const [key, n] of worst) console.log(`MEADOW AUDIT block ${key}: ${n}`);
(window as unknown as { __meadowAudit: unknown }).__meadowAudit = { open, solid, worst };
export {};
