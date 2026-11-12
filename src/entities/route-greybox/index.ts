// The greybox route's massing, resident by distance (docs/plans/greybox-route.md, leg 1 step 4; prerequisite P1: one
// area's colliders and near mesh at a time). High Gorge's (./massing.ts) is built and mounted once the camera or your
// body is within 400 m of the split and freed past 550 m; the horizon silhouette stays for the rest. The leg's own views
// (the deck, frames, racks, signs and prompts) are ./leg-view.ts's, mounted by the railway's works seam. Local scenery:
// no state, no sync, no saves. ?blockout=world draws its own Gorge, so it gets none of this.
import { productionRailway } from '../../proto/flags.ts';
import { background } from '../../async.ts';
import { defineKind, despawn, spawn, type GameEntity } from '../../entity/entity.ts';
import { camera } from '../../render/scene.ts';
import { me } from '../../player/player.ts';
import { createOwnedView, type OwnedView } from '../../render/owned-view.ts';
import { precompile } from '../../render/precompile.ts';
import { gorgeAt, gorgeMassing } from './massing.ts';
import { drawGreyBoxes } from './boxes.ts';

const MOUNT = { near: 400, far: 550 };
defineKind('route-greybox', { update: 13 });
defineKind('route-greybox-area', {});

if (productionRailway && new URLSearchParams(location.search).get('blockout') !== 'world') {
  const centre = gorgeAt(0, 0);
  let area: { owner: OwnedView; entity: GameEntity; boxes: number; solids: number } | null = null,
    building = false,
    gone = false;
  const wanted = () => {
    const body = me.body?.position;
    const d = Math.min(
      Math.hypot(camera.position.x - centre.x, camera.position.z - centre.z),
      body ? Math.hypot(body.x - centre.x, body.z - centre.z) : Infinity,
    );
    return d < (area ? MOUNT.far : MOUNT.near);
  };
  async function mount() {
    building = true;
    const owner = createOwnedView(),
      { mesh, solids } = await drawGreyBoxes(owner, gorgeMassing());
    // Its pipeline compiles off the frame before it first shows (src/render/precompile.ts).
    owner.root.visible = false;
    await precompile(owner.root);
    owner.root.visible = true;
    building = false;
    if (gone) return owner.dispose();
    area = { owner, entity: spawn({ kind: 'route-greybox-area', mesh: owner.root }), boxes: mesh.count, solids };
  }
  function unmount() {
    if (!area) return;
    despawn(area.entity);
    area.owner.dispose();
    area = null;
  }
  spawn({
    kind: 'route-greybox',
    update() {
      const want = wanted();
      if (want && !area && !building) background(mount(), 'route greybox massing');
      else if (!want && area) unmount();
    },
    describe: () => ({
      gorge: area ? { resident: true, boxes: area.boxes, solids: area.solids } : { resident: false },
    }),
    dispose() {
      gone = true;
      unmount();
    },
  });
}
