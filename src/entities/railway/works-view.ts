// Dormant Local shell only. No material transfers, accepted events or persisted state until J4.
import type { RailwayAdapter } from '../../adapters/railway.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import { WORKS_KILN, WORKS_RACK } from '../../sim/railway-works-layout.ts';
import { SPLIT_ROCK_BOXES, THROAT_SLAB, WORKS_BOULDERS, ROLLER_ROAD, beam, box, type WorksBox } from './works-shape.ts';
import { drawWorksBoxes } from './works-box-view.ts';
export async function createRailwayWorks(_adapter: RailwayAdapter, owner: OwnedView) {
  const { H } = await import('../../proto/place/land.ts');
  const kiln = { x: WORKS_KILN.x / 100, z: WORKS_KILN.z / 100 },
    rack = { x: WORKS_RACK.x / 100, z: WORKS_RACK.z / 100 };
  const boxes: WorksBox[] = [
    ...SPLIT_ROCK_BOXES,
    ...THROAT_SLAB.map((b) => ({ ...b, colour: '#a49d8e' as const })),
    { ...box(kiln.x, 26.6, kiln.z, 5, 5, 3, -Math.PI / 4), colour: '#716d67' },
    { ...box(kiln.x + 1.5, 30, kiln.z - 1.5, 1.4, 9, 1.4), colour: '#595958' },
    ...WORKS_BOULDERS,
  ];
  // A contrasting broken zigzag painted on the outside face; no decal or texture draw.
  const seam = THROAT_SLAB[1]!;
  for (let i = 0; i < 4; i++)
    boxes.push({
      ...box(seam.x - 0.55 + (i % 2) * 0.22, 25.1 + i * 1.5, seam.z - 0.55 - (i % 2) * 0.22, 0.18, 1.7, 0.18),
      colour: '#433f39',
      solid: false,
    });
  for (let i = 1; i < ROLLER_ROAD.length; i++) {
    const a = ROLLER_ROAD[i - 1]!,
      b = ROLLER_ROAD[i]!;
    const n = Math.ceil(Math.hypot(a.x - b.x, a.z - b.z) / 1.5);
    for (let j = 0; j < n; j++) {
      const p = { x: a.x + ((b.x - a.x) * j) / n, z: a.z + ((b.z - a.z) * j) / n };
      boxes.push({
        ...box(p.x, H(p.x, p.z) + 0.15, p.z, 2, 0.18, 0.32, Math.atan2(b.x - a.x, b.z - a.z)),
        colour: '#676963',
        solid: false,
      });
    }
    boxes.push({ ...beam(a, b, (H(a.x, a.z) + H(b.x, b.z)) / 2 + 0.12, 0.16, 0.2), colour: '#79766a', solid: false });
  }
  const y = H(rack.x, rack.z);
  boxes.push(
    { ...box(rack.x, y + 0.4, rack.z, 3, 0.8, 2.2), colour: '#68665e' },
    box(rack.x - 0.4, y + 1.4, rack.z, 0.8, 1.2, 1.6),
    box(rack.x + 0.4, y + 1.2, rack.z, 0.8, 0.8, 1.6),
  );
  await drawWorksBoxes(owner, boxes);
  return {
    update() {},
    restore() {},
    targets: (): Interactable[] => [],
    inspect: () => ({ boxes: boxes.length, slab: true }),
  };
}
