import level from '../../../content/built/levels/rotunda-port-quay.json' with { type: 'json' };
import { ROTUNDA_PORT_QUAY as site } from '../../place/port-quay.ts';
import { LINE2 } from '../../sim/railway-lines.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { railwayWorldRead } from '../railway/state.ts';
import { bayCopies, createRotundaView } from '../railway/rotunda-view.ts';
import { garageFacts } from '../railway/garage-state.ts';
import * as kit from '../railway/engine-kit.ts';

export function mountQuayRoundhouse(owner: OwnedView, solids: number) {
  const rotunda = createRotundaView(owner, kit, { site, level });
  rotunda.show(0, 0);
  function update() {
    const read = railwayWorldRead();
    rotunda.copies(read?.whole() ? bayCopies(garageFacts(read), LINE2) : []);
  }
  update();
  return { solids, update };
}
