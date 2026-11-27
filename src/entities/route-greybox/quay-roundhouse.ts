import level from '../../../content/built/levels/rotunda-port-quay.json' with { type: 'json' };
import { ROTUNDA_PORT_QUAY as site } from '../../place/port-quay.ts';
import { ORIGIN } from '../../place/layout.ts';
import { LINE2 } from '../../sim/railway-lines.ts';
import type { Placement } from '../../prefab/types.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { railwayWorldRead } from '../railway/state.ts';
import { bayCopies, createRotundaView } from '../railway/rotunda-view.ts';
import { garageFacts } from '../railway/garage-state.ts';
import * as kit from '../railway/engine-kit.ts';
import { RAIL_HEAD, SHUNT } from '../railway/works-shape.ts';
import { bridgeHalf } from '../railway/table-bridge.ts';
import { drawGreyBoxes } from './boxes.ts';

export async function mountQuayRoundhouse(owner: OwnedView, solids: number) {
  const rotunda = createRotundaView(owner, kit, { site, level });
  rotunda.show(0, 0);
  const yaw = Math.PI - (site.approach * Math.PI) / 180;
  const sin = Math.sin(yaw),
    cos = Math.cos(yaw);
  const road: Placement[] = [];
  function box(
    id: string,
    across: number,
    along: number,
    up: number,
    scale: NonNullable<Placement['scale']>,
    colour: string,
    solid = false,
  ) {
    road.push({
      id,
      prefab: solid ? 'greybox.box' : 'greybox.decoration',
      pos: [
        ORIGIN.x + site.centre.x + along * sin + across * cos,
        site.y + up,
        site.centre.z + along * cos - across * sin,
      ],
      rot: [yaw, 0, 0],
      scale,
      params: { colour },
    });
  }
  const half = bridgeHalf(site.tableR);
  box('bridge', 0, 0, 0.05 - half.hy, [2 * half.hx, 2 * half.hy, 2 * half.hz], '#665746', true);
  const start = 8.6,
    end = 29.2;
  for (const side of [-1, 1]) {
    box('bridge-rail-' + side, side * SHUNT.gauge, 0, RAIL_HEAD - 0.0675, [0.1, 0.135, 2 * half.hz], '#4c5058');
    box(
      'approach-rail-' + side,
      side * SHUNT.gauge,
      (start + end) / 2,
      RAIL_HEAD - 0.0675,
      [0.1, 0.135, end - start],
      '#4c5058',
    );
    box('buffer-post-' + side, side * SHUNT.gauge, end, 0.45, [0.24, 0.9, 0.28], '#725646');
  }
  box('buffer-beam', 0, end, 0.85, [2.3, 0.3, 0.28], '#925538');
  const batch = await drawGreyBoxes(owner, road);
  function update() {
    const read = railwayWorldRead();
    if (read?.whole()) rotunda.copies(bayCopies(garageFacts(read), LINE2));
  }
  update();
  return { solids: solids + batch.solids, update };
}
