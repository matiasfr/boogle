import level from '../../../content/built/levels/rotunda-port-quay.json' with { type: 'json' };
import { ROTUNDA_PORT_QUAY as site } from '../../place/port-quay.ts';
import { LINE2 } from '../../sim/railway-lines.ts';
import { garageRow, mastFrom, polarAt } from '../railway/garage-geo.ts';
import { createGaragePieces } from '../railway/garage-pieces.ts';
import { createGarageView } from '../railway/garage-view.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { railwayWorldRead, railwayCommands } from '../railway/state.ts';
import { bayCopies, createRotundaView } from '../railway/rotunda-view.ts';
import { garageFacts, quayGarage } from '../railway/garage-state.ts';
import * as kit from '../railway/engine-kit.ts';

export function mountQuayRoundhouse(owner: OwnedView) {
  const rotunda = createRotundaView(owner, kit, { site, level });
  rotunda.show(0, 0);
  const { table, y, geo } = garageRow(1);
  const placement = { table, y, ground: site.y, post: polarAt(table, geo.post) };
  const row = { ...geo, mast: mastFrom(geo, y, site.y) };
  const pieces = createGaragePieces(owner, placement, row);
  const view = createGarageView(
    owner,
    placement,
    row,
    1,
    {
      restYaw: () => Math.PI - (site.approach * Math.PI) / 180,
      install: (line, rev, part) =>
        line === LINE2
          ? (railwayCommands()?.installBoiler(1, rev, part) ?? false)
          : (railwayCommands()?.installPart(1, line, part, rev) ?? false),
      bring: (line, rev) => railwayCommands()?.bringLine(1, line, rev) ?? false,
      installHere: true,
      online: () => railwayCommands()?.read.ready() ?? false,
    },
    pieces,
  );
  quayGarage.view = view;
  owner.cleanup(() => {
    if (quayGarage.view === view) quayGarage.view = null;
    view.dispose();
  });
  function update() {
    const read = railwayWorldRead();
    if (!read?.whole()) {
      pieces.rig.visible = false;
      rotunda.copies([]);
      return;
    }
    rotunda.copies(bayCopies(garageFacts(read, 1)));
  }
  update();
  return { update };
}
