// Source-owned production placements, sampled against the triangles actually drawn by Place's terrain.
// Foundations deliberately extend below ground; test exposed gaps and terrain above the authored seating surface.
import { Vector3 } from 'three/webgpu';
import { openingBuildings, forgePlan } from '../../src/proto/place/opening-plans.ts';
import { surfaceHeight as ground } from '../../src/proto/place/terrain.ts';
import { checkPropGrounding } from './grounding-props.ts';
import type { Plan } from '../../src/proto/place/building-plans.ts';
import type { Box } from '../../src/proto/net/box-plan.ts';

const TOLERANCE_CM = 5;
const SAMPLE_METRES = 0.25;
type Building = { id: string; plan: Plan; boxes: readonly Box[] };

export async function checkBuildingGrounding(buildings: readonly Building[] = openingBuildings()) {
  const forge = forgePlan();
  const placed = [...buildings, { id: 'forge/scaffold', plan: forge, boxes: forge.scaffold }];
  const rows = placed.map(({ id, plan, boxes }) => {
    const foundation = plan.scaffold[0];
    const seated = foundation !== undefined && boxes.includes(foundation);
    // A missing slab must measure the visible walls, not the plan's invisible ground-level collision hull.
    let base = Infinity;
    const point = new Vector3();
    for (const box of boxes)
      for (const x of [-0.5, 0.5])
        for (const y of [0, 1])
          for (const z of [-0.5, 0.5]) {
            point.set(x, y, z).applyMatrix4(box.local);
            base = Math.min(base, box.y + point.y);
          }
    const support = seated ? foundation : boxes[0];
    if (!support) throw new Error(`${id}: no visible support geometry`);
    const e = support.local.elements;
    const w = seated ? Math.hypot(e[0]!, e[2]!) : plan.hw * 2;
    const d = seated ? Math.hypot(e[8]!, e[10]!) : plan.hd * 2;
    const top = seated ? support.y + e[13]! + e[5]! : base;
    const nx = Math.ceil(w / SAMPLE_METRES),
      nz = Math.ceil(d / SAMPLE_METRES);
    const cos = Math.cos(plan.yaw),
      sin = Math.sin(plan.yaw);
    let low = Infinity,
      high = -Infinity;
    for (let i = 0; i <= nx; i++)
      for (let j = 0; j <= nz; j++) {
        const x = (i / nx - 0.5) * w,
          z = (j / nz - 0.5) * d;
        const h = ground(plan.x + x * cos + z * sin, plan.z - x * sin + z * cos);
        low = Math.min(low, h);
        high = Math.max(high, h);
      }
    const gapCm = Math.max(0, (base - low) * 100);
    const sinkCm = Math.max(0, (high - top) * 100);
    return {
      id,
      x: plan.x,
      z: plan.z,
      base,
      top,
      groundMin: low,
      groundMax: high,
      samples: (nx + 1) * (nz + 1),
      gapCm,
      sinkCm,
      failed: gapCm > TOLERANCE_CM || sinkCm > TOLERANCE_CM,
    };
  });
  rows.push(...(await checkPropGrounding()));
  return {
    level: 'production-grounding',
    toleranceCm: TOLERANCE_CM,
    sampleMetres: SAMPLE_METRES,
    coverage:
      'Production buildings, forge, all stop supports and attachments, crane/rack feet, decoded recovery rack and station feet, all standing tree roots, cove supports, bridge bank bearings and settled reward crate. Moving cargo/vehicles, floating collectibles, distant landforms and future town growth are excluded.',
    failures: rows.filter((row) => row.failed).length,
    rows,
  };
}
