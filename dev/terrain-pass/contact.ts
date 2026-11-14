// Where a player's body can touch rock that the terrain pass draws off its collider (docs/plans/terrain-pass.md): the
// unwalkable faces within 1.5 m of ground a player can stand on (a rim above, a foot below), ranked by how far the drawn
// rock is from the collider there, vertically and along the face's normal. A report, not a check.
// `node dev/terrain-pass/contact.ts [count]`.
import { WALKABLE_NY } from '../../src/constants.ts';
import { collider, drawnHome, measureHome, type SteepGap } from './drawn.ts';

const count = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 5);
const REACH = 1.5;
type Contact = SteepGap & { stand: 'rim' | 'foot' | 'both'; standAt: [number, number, number] };
const contacts: Contact[] = [];
// `--no-cap`: without the contact cap (island.ts capNearWalkable), as `?terrainCap=0` draws it.
measureHome(drawnHome(!process.argv.includes('--no-cap')), (gap) => {
  // Walkable collider ground within reach of this face, and whether it lies above (you stand at the face's foot and
  // press into it) or below (you stand on the rim over it).
  let above: [number, number, number] | null = null,
    below: [number, number, number] | null = null;
  for (let n = 0; n < 16; n++) {
    const angle = (n / 16) * 2 * Math.PI;
    for (const d of [0.75, REACH]) {
      const x = gap.at[0] + Math.cos(angle) * d,
        z = gap.at[1] + Math.sin(angle) * d;
      const face = collider(x, z);
      if (face.ny < WALKABLE_NY) continue;
      if (face.height > gap.y) above ??= [x, face.height, z];
      else below ??= [x, face.height, z];
    }
  }
  if (!above && !below) return;
  contacts.push({
    ...gap,
    stand: above && below ? 'both' : above ? 'rim' : 'foot',
    standAt: (below ?? above)!,
  });
});
const round = (v: number) => +v.toFixed(2);
const rankings: [label: string, key: 'vertical' | 'alongNormal', list: Contact[]][] = [
  ['vertical', 'vertical', contacts],
  ['along the normal', 'alongNormal', contacts],
  ['along the normal, standing at the foot', 'alongNormal', contacts.filter((c) => c.stand !== 'rim')],
];
for (const [label, key, list] of rankings) {
  const picked: Contact[] = [];
  for (const c of [...list].sort((a, b) => b[key] - a[key])) {
    if (picked.some((p) => Math.hypot(p.at[0] - c.at[0], p.at[1] - c.at[1]) < 8)) continue;
    picked.push(c);
    if (picked.length === count) break;
  }
  console.log(
    `worst ${count} by ${label} (of ${list.length} unwalkable triangles within ${REACH} m of walkable ground):`,
  );
  for (const c of picked)
    console.log(
      `  face at (${round(c.at[0])}, ${round(c.at[1])}) y ${round(c.y)}, normal Y ${round(c.ny)}: vertical ${round(c.vertical)} m, ` +
        `along the normal ${round(c.alongNormal)} m; walkable ground ${c.stand === 'foot' ? 'below (you stand at its foot)' : c.stand === 'rim' ? 'above (you stand on its rim)' : 'above and below'}, ` +
        `nearest at (${round(c.standAt[0])}, ${round(c.standAt[2])}) y ${round(c.standAt[1])}`,
    );
}
