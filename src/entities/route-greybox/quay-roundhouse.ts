import level from '../../../content/built/levels/rotunda-port-quay.json' with { type: 'json' };
import { ROTUNDA_PORT_QUAY as site } from '../../place/port-quay.ts';
import { LINE2 } from '../../sim/railway-lines.ts';
import { shed } from '../../sim/railway-rows.ts';
import { bayFrame } from '../../place/rotunda.ts';
import { garageRow, mastFrom, polarAt } from '../railway/garage-geo.ts';
import { createGaragePieces } from '../railway/garage-pieces.ts';
import { wearsLong } from '../railway/cars.ts';
import { lineFacts } from '../railway/garage-data.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { railwayWorldRead } from '../railway/state.ts';
import { bayCopies, createRotundaView } from '../railway/rotunda-view.ts';
import { garageFacts } from '../railway/garage-state.ts';
import * as kit from '../railway/engine-kit.ts';

export function mountQuayRoundhouse(owner: OwnedView) {
  const rotunda = createRotundaView(owner, kit, { site, level });
  rotunda.show(0, 0);
  const { table, y, geo } = garageRow(1);
  const pieces = createGaragePieces(
    owner,
    { table, y, ground: site.y, post: polarAt(table, geo.post) },
    { ...geo, mast: mastFrom(geo, y, site.y) },
  );
  owner.add(pieces.root);
  pieces.rig.rotation.y = bayFrame(site, 0).yaw;
  pieces.armPivot.rotation.y = Math.PI - (geo.park * Math.PI) / 180;
  pieces.chain.visible = pieces.trolley.visible = pieces.pipeStand.visible = false;
  pieces.furniture.visible = true;
  function update() {
    const read = railwayWorldRead();
    pieces.rig.visible = !!read?.whole();
    if (!read?.whole()) {
      rotunda.copies([]);
      return;
    }
    const facts = garageFacts(read);
    const line = shed(read.world()).quayLine;
    const row = lineFacts(facts, line)?.row ?? 0;
    pieces.wearFit(wearsLong(line, row), line === LINE2 && facts.boilerRev === 1);
    rotunda.copies(bayCopies(facts, line));
  }
  update();
  return { update };
}
