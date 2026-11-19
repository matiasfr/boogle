// B2: standing houses from the same compiled hull records (the loader yard's open shed has its own), and the optional
// rooftop route's geometric gaps.
import { Quaternion, Vector3 } from 'three';
import { definitions } from '../../src/prefab/catalogue.ts';
import { townBuilding, townLocal, TOWN_PLOTS, TOWN_PROPS } from '../../src/place/town-plan.ts';
import { H } from '../../src/place/terrain.ts';
import { ROOM_PLOTS, toWorld } from '../../src/place/layout.ts';
import { padById } from '../../src/place/tech-layout.ts';
import { openScene, type Solid } from './scene.ts';
import { TRADE } from '../../src/sim/railway-trade-layout.ts';
import { YARD, shedCentre } from '../../src/place/yard-shape.ts';

const yardAt = (i: number) => {
  const p = TRADE.plots[0][i];
  return !!p && 'gives' in p && p.gives === 'loader';
};

type Frame = { x: number; z: number; yaw: number; w: number; d: number };
function perimeter(b: Frame) {
  const points: { x: number; z: number }[] = [];
  for (let k = 0; k <= 200; k++) {
    const u = k / 200 - 0.5;
    for (const side of [-1, 1])
      points.push(townLocal(b, u * b.w, (side * b.d) / 2), townLocal(b, (side * b.w) / 2, u * b.d));
  }
  return points;
}
function gap(a: Frame, b: Frame) {
  const aa = perimeter(a),
    bb = perimeter(b);
  let d = Infinity;
  for (const p of aa) for (const q of bb) d = Math.min(d, Math.hypot(p.x - q.x, p.z - q.z));
  return d;
}
export async function checkTownHouses() {
  const solids: Solid[] = [];
  const houses = TOWN_PLOTS.order.slice(0, 3).map(townBuilding);
  for (const [i, b] of houses.entries()) {
    const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), b.yaw);
    const yard = yardAt(i);
    for (const [k, c] of definitions[yard ? 'town.plot-yard-hull' : 'town.plot-house-hull']!.colliders.entries()) {
      if (c.shape !== 'box') throw new Error('house hull must be a box');
      const p = townLocal(b, c.at[0], c.at[2]);
      solids.push({
        id: `house.${i}.${k}`,
        source: { file: `src/content/prefabs/${yard ? 'loader-yard' : 'town-plot-house'}.ts`, symbol: 'prefabs' },
        shape: { kind: 'box', hx: c.half[0], hy: c.half[1], hz: c.half[2] },
        position: { x: toWorld(p.x), y: H(toWorld(b.x), b.z) + c.at[1], z: p.z },
        rotation: q,
        support: 'grounded',
      });
    }
  }
  const scene = await openScene(solids);
  let failures = 0;
  const tops = houses.map((b, i) => {
    // A house is solid at its middle; the yard's shed roof is over its own middle, and its jib's mast is solid.
    const yard = yardAt(i);
    const roofAt = yard ? townLocal(b, shedCentre.x, shedCentre.z) : b,
      solidAt = yard ? townLocal(b, YARD.jib.x, YARD.jib.z) : b;
    const x = toWorld(roofAt.x),
      y = H(toWorld(b.x), b.z);
    const hit = scene.below({ x, y: y + 12, z: roofAt.z }, 15);
    if (!hit || !scene.clear({ x: toWorld(solidAt.x), y: y + 1.5, z: solidAt.z })) failures++;
    return { slot: i, roof: hit ? hit.y : null };
  });
  scene.world.free();
  const wall = (b: Frame) => ({ ...b, w: b.w + 0.2, d: b.d + 0.2 });
  const balcony = padById('balcony');
  const route = [
    TOWN_PROPS.bay.foot,
    TOWN_PROPS.shelf.foot,
    wall(houses[0]!),
    wall(houses[1]!),
    ROOM_PLOTS.shop,
    { ...balcony, yaw: 0, w: balcony.hx * 2, d: balcony.hz * 2 },
  ];
  const names = ['bay → shelf', 'shelf → first house', 'first → second house', 'second house → shop', 'shop → balcony'];
  const gaps = names.map((name, i) => ({ name, metres: Number(gap(route[i]!, route[i + 1]!).toFixed(2)) }));
  return {
    scope: 'town houses',
    failures,
    solids: solids.length,
    tops,
    gaps,
    withinPlanHorizontalEnvelope: gaps.every((g) => g.metres <= 12.6),
    rooftop:
      'Geometric envelope only: compare gaps with the plan’s 12.6 m sprint double jump. No controller movement witness; roof height and landing clearance still matter.',
  };
}
