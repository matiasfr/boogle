// Source-owned production placements, sampled against the triangles actually drawn by Place's terrain.
// Foundations deliberately extend below ground; test exposed gaps and terrain above the authored seating surface.
import { Vector3 } from 'three/webgpu';
import { openingBuildings, forgePlan } from '../../src/proto/place/opening-plans.ts';
import { CELL, NX, NZ, at, heights } from '../../src/proto/place/terrain.ts';
import { GRID, ORIGIN } from '../../src/proto/place/layout.ts';
import type { Plan } from '../../src/proto/place/building-plans.ts';
import type { Box } from '../../src/proto/net/box-plan.ts';

const TOLERANCE_CM = 5;
const SAMPLE_METRES = 0.25;
type Building = { id: string; plan: Plan; boxes: readonly Box[] };

function ground(x: number, z: number) {
  const fx = (x - ORIGIN.x - GRID.x0) / CELL,
    fz = (z - ORIGIN.z - GRID.z0) / CELL;
  const i = Math.floor(fx),
    j = Math.floor(fz),
    u = fx - i,
    v = fz - j;
  if (i < 0 || j < 0 || i >= NX - 1 || j >= NZ - 1) return -6;
  const a = heights[at(i, j)]!,
    b = heights[at(i + 1, j)]!,
    c = heights[at(i, j + 1)]!,
    d = heights[at(i + 1, j + 1)]!;
  return u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
}

export function checkBuildingGrounding(buildings: readonly Building[] = openingBuildings()) {
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
  return {
    level: 'production-building-grounding',
    toleranceCm: TOLERANCE_CM,
    sampleMetres: SAMPLE_METRES,
    coverage:
      'All production opening town/camp buildings and the forge scaffold; not moving props, trees or future Place growth.',
    failures: rows.filter((row) => row.failed).length,
    rows,
  };
}
