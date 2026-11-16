// The steel pallet beside the Roundhouse table, a Local view of accepted rows. The garage's lever and Install
// control own the longer boiler's install; roundhouse-view.ts owns its shared moment and away-player banner.
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import { ROTUNDA_HOME } from '../../place/home-station.ts';
import { rotundaSteelPallet } from '../../place/rotunda.ts';
import { ORIGIN } from '../../place/layout.ts';
import { H } from '../../place/terrain.ts';
import { STEEL } from '../../sim/railway-ring-layout.ts';
import { LINE2 } from '../../sim/railway-lines.ts';
import { aperture, line, shed } from '../../sim/railway-rows.ts';
import { createBoxBatch } from './works-box-view.ts';

const GREY_DARK = '#6f7275',
  STEEL_BLOCK = '#e8742c'; // the island's steel (ring-steel/view.ts)
export const PALLET = (() => {
  const p = rotundaSteelPallet(ROTUNDA_HOME),
    x = p.x + ORIGIN.x;
  const ground = [-p.w / 2, 0, p.w / 2].flatMap((dx) => [-p.d / 2, 0, p.d / 2].map((dz) => H(x + dx, p.z + dz)));
  // Seat the base through the shallow slope: its bottom meets the low edge, its top clears the high edge.
  return { ...p, x, y: Math.max(...ground), bottom: Math.min(...ground) };
})();

export function createBoilerInstall(adapter: RailwayAdapter, owner: OwnedView) {
  const batch = createBoxBatch(owner, STEEL.total + 1, false);
  function rows() {
    if (!adapter.read.whole()) return null;
    const wd = adapter.read.world(),
      l = line(wd, LINE2),
      sh = shed(wd);
    return {
      steel: sh.steel,
      boiler: l.boiler,
      shown: aperture(wd).joined >= 0 || sh.steel > 0 || l.boiler >= 2,
    };
  }
  function draw() {
    const r = rows();
    batch.mesh.visible = !!r && r.shown;
    if (!r || !r.shown) return;
    const y = PALLET.y;
    batch.begin();
    const height = y - PALLET.bottom + 0.18;
    batch.box(PALLET.x, PALLET.bottom + height / 2, PALLET.z, PALLET.w, height, PALLET.d, GREY_DARK);
    for (let i = 0; i < Math.min(r.steel, STEEL.total); i++) {
      const row = i % 3,
        side = Math.floor(i / 3) % 2,
        layer = Math.floor(i / 6);
      batch.box(
        PALLET.x - 0.33 + side * 0.66,
        y + 0.4 + layer * 0.44,
        PALLET.z - 0.66 + row * 0.66,
        0.56,
        0.4,
        0.56,
        STEEL_BLOCK,
      );
    }
    batch.commit();
  }
  draw();
  return {
    restore: draw,
    update: draw,
    accepted() {},
    targets: (): Interactable[] => [],
    inspect: () => {
      const r = rows();
      return {
        installView: { shown: batch.mesh.visible, steel: r?.steel ?? 0, boiler: r?.boiler ?? 0, pallet: PALLET },
      };
    },
  };
}
