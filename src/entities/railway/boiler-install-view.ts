// The steel store in bay 150 degrees: Local presentation of the one server-owned stock pool.
// Every visible block has its record's solid; reveal clears the player before enabling any new solid.
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import { createPrefabBatch, instantiate } from '../../prefab/instantiate.ts';
import { definitions } from '../../prefab/catalogue.ts';
import { ROTUNDA_HOME } from '../../place/home-station.ts';
import { bayFrame, rotundaSteelPallet } from '../../place/rotunda.ts';
import { ORIGIN } from '../../place/layout.ts';
import { H } from '../../place/terrain.ts';
import { STEEL } from '../../sim/railway-ring-layout.ts';
import { steelPool } from '../../sim/railway-works-layout.ts';
import { LINE2 } from '../../sim/railway-lines.ts';
import { line, shed } from '../../sim/railway-rows.ts';
import { HEAD_OFFSET, PLAYER_R } from '../../constants.ts';
import { me } from '../../player/state.ts';

const bay = bayFrame(ROTUNDA_HOME, -2);
// Just inside the bay, behind its open door leaves. The approach and the 95–125 degree lane stay clear.
export const PALLET = {
  x: bay.door.x + bay.u.x * 2.5 + ORIGIN.x,
  y: ROTUNDA_HOME.y,
  z: bay.door.z + bay.u.z * 2.5,
  w: 1.5,
  d: 2.1,
  yaw: bay.yaw,
};
// The post-height proof leaves the bay stack behind the boiler stand. Keep one low token layer at the old apron
// position (plan, level finding 3); it reads the same pool, never a second stock count.
const TOKEN_BLOCKS = 6;
export const TOKEN = (() => {
  const p = rotundaSteelPallet(ROTUNDA_HOME),
    x = p.x + ORIGIN.x;
  const y = Math.max(
    ...[-p.w / 2, 0, p.w / 2].flatMap((dx) => [-p.d / 2, 0, p.d / 2].map((dz) => H(x + dx, p.z + dz))),
  );
  return { ...p, x, y, yaw: 0 };
})();

export function createBoilerInstall(adapter: RailwayAdapter, owner: OwnedView) {
  const batch = createPrefabBatch('roundhouse.steel-block', STEEL.total + TOKEN_BLOCKS, owner);
  const entries = [PALLET, TOKEN].flatMap((p, store) =>
    Array.from({ length: (store ? TOKEN_BLOCKS : STEEL.total) + 1 }, (_, n) => {
      const i = n - 1,
        block = n > 0;
      const key = block ? 'roundhouse.steel-block' : 'roundhouse.steel-pallet';
      const x = block ? -0.33 + (Math.floor(i / 3) % 2) * 0.66 : 0,
        z = block ? -0.66 + (i % 3) * 0.66 : 0;
      const index = block ? (store ? STEEL.total : 0) + i : -1;
      const instance = instantiate(
        key,
        {
          id: `steel-store.${store}.${n}`,
          prefab: key,
          pos: [
            p.x + Math.cos(p.yaw) * x + Math.sin(p.yaw) * z,
            p.y + (block ? 0.4 + Math.floor(i / 6) * 0.44 : 0),
            p.z - Math.sin(p.yaw) * x + Math.cos(p.yaw) * z,
          ],
          rot: [p.yaw, 0, 0],
        },
        { owner, ...(block ? { batch: { target: batch, index } } : {}) },
      );
      return {
        instance,
        enabled: false,
        n,
        index,
        store,
        colliders: definitions[key]!.colliders,
        rest: instance.root.matrix.clone(),
      };
    }),
  );
  const point = owner.root.position.clone(),
    matrix = entries[0]!.instance.root.matrix.clone();
  function clearPlayer(entry: (typeof entries)[number]) {
    const body = me.body;
    if (!body) return;
    entry.instance.root.updateWorldMatrix(true, false);
    const overlaps = entry.colliders.some(
      (box) =>
        box.shape === 'box' &&
        [0, HEAD_OFFSET].some((up) => {
          entry.instance.root.worldToLocal(point.set(body.position.x, body.position.y + up, body.position.z));
          const dx = Math.max(0, Math.abs(point.x - box.at[0]) - box.half[0]);
          const dy = Math.max(0, Math.abs(point.y - box.at[1]) - box.half[1]);
          const dz = Math.max(0, Math.abs(point.z - box.at[2]) - box.half[2]);
          return dx * dx + dy * dy + dz * dz < (PLAYER_R - 0.01) ** 2;
        }),
    );
    if (!overlaps) return;
    if (entry.store) point.set(TOKEN.x + 2.25, H(TOKEN.x + 2.25, TOKEN.z) + PLAYER_R + 0.025, TOKEN.z);
    else point.set(bay.door.x - bay.u.x * 2 + ORIGIN.x, ROTUNDA_HOME.y + PLAYER_R + 0.025, bay.door.z - bay.u.z * 2);
    owner.root.localToWorld(point);
    body.position.set(point.x, point.y, point.z);
    body.interpolatedPosition.set(point.x, point.y, point.z);
    body.velocity.set(0, 0, 0);
  }
  for (const entry of entries) entry.instance.setEnabled(false);
  let count = -1,
    shown = false;
  function draw() {
    if (!adapter.read.whole()) return;
    const sh = shed(adapter.read.world()),
      nextShown = sh.steel >= 1,
      next = steelPool(sh);
    if (next === count && shown === nextShown) return;
    count = next;
    shown = nextShown;
    entries.forEach((entry) => {
      const on = shown && entry.n <= count;
      if (on && !entry.enabled) clearPlayer(entry);
      entry.instance.setEnabled(on);
      entry.instance.root.visible = on;
      entry.enabled = on;
      if (entry.index >= 0) batch.mesh.setMatrixAt(entry.index, on ? entry.rest : matrix.makeScale(0, 0, 0));
    });
    batch.mesh.instanceMatrix.needsUpdate = true;
    batch.mesh.computeBoundingBox();
    batch.mesh.computeBoundingSphere();
  }
  draw();
  return {
    restore: draw,
    update: draw,
    accepted() {},
    targets: (): Interactable[] => [],
    inspect: () => ({
      installView: {
        shown,
        steel: count,
        boiler: adapter.read.whole() ? line(adapter.read.world(), LINE2).boiler : 0,
        pallet: PALLET,
        token: TOKEN,
      },
    }),
  };
}
