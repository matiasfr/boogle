// Ring Island's near view on the production railway (docs/plans/ring-island-build1.md, R2b), default on. Local
// scenery: the island's ground (./ground.ts) and its shore for the sea (./shore.ts) from startup, and the folk's side
// (./view.ts), mounted (meshes in the scene, colliders built) once the camera is within 500 m of the hinge or the island
// halt, or while ringIslandNear.keep is set (R4a, once Q7 is laid); unmounted past 650 m. ?ring=greybox and
// ?blockout=world draw their own island, so neither gets this. Place's buildFar cones are the far view: they hide
// while the near view is mounted (src/place/far-hills.ts), whose ground has the cuttings they lack.
import { productionRailway } from '../../proto/flags.ts';
import { background } from '../../async.ts';
import { defineKind, despawn, spawn, type GameEntity } from '../../entity/entity.ts';
import { camera } from '../../render/scene.ts';
import { me } from '../../player/player.ts';
import { precompile, warmUp } from '../../render/precompile.ts';
import { RING_FORMATION, RING_GAP, RING_HALT, ringAt } from '../../sim/railway-ring-layout.ts';
import { registerRingShore } from './shore.ts';
import { islandGround, ringIslandNear } from './state.ts';
import type { RingIslandView } from './view.ts';
import { setNearViewMounted } from '../ring-island-far/view.ts';
import { showFarHills } from '../../place/far-hills.ts';

/** Mount and unmount distances (m, horizontal, from the camera; design review call 13). */
const MOUNT = { near: 500, far: 650 };
const ANCHORS = [
  ringAt(RING_GAP.hinge, RING_FORMATION.mid),
  ringAt((RING_HALT.u0 + RING_HALT.u1) / 2, RING_FORMATION.mid),
].map((p) => ({ x: p.x / 100, z: p.z / 100 }));

defineKind('ring-island', { update: 12 });
defineKind('ring-island-near', { update: 12 });

const query = new URLSearchParams(location.search);
if (productionRailway && query.get('ring') !== 'greybox' && query.get('blockout') !== 'world') {
  let view: RingIslandView | null = null,
    building: Promise<RingIslandView> | null = null,
    near: GameEntity | null = null,
    unregister: (() => void) | null = null,
    gone = false;
  // The shore registers before the scene's shaders, so the coast bakes both regions once, at load.
  const shore = islandGround().then((g) => {
    if (!gone) unregister = registerRingShore(g);
  });
  warmUp(() => shore, { beforeScene: true });
  // The far leaf (R2c) draws whenever the near view's meshes are not in the scene, so the two never draw at once.
  setNearViewMounted(() => ringIslandNear.mounted);

  const build = () =>
    (building ??= Promise.all([
      islandGround(),
      import('./view.ts'),
      import('../../proto/greybox/ring-cones.ts'),
      import('../../place/layout.ts'),
    ]).then(async ([g, { createRingIslandView }, { RING_CONES }, { FAR, ORIGIN }]) => {
      const v = createRingIslandView(g, RING_CONES, { x: FAR.x + ORIGIN.x, z: FAR.z + ORIGIN.z });
      // Pipelines compile off the frame before it first shows (src/render/precompile.ts).
      v.root.visible = false;
      await precompile(v.root);
      v.root.visible = true;
      if (gone) v.dispose();
      else view = v;
      return v;
    }));
  // Built while the game loads (its pipelines compile then, not on the pier), mounted later by distance.
  warmUp(() => build());
  // The camera, or your body (a restored pose or a teleport lands before the camera has followed), so the colliders
  // are there the frame you are.
  const wanted = () => {
    const body = me.body?.position;
    const d = Math.min(
      ...ANCHORS.flatMap((a) => [
        Math.hypot(camera.position.x - a.x, camera.position.z - a.z),
        body ? Math.hypot(body.x - a.x, body.z - a.z) : Infinity,
      ]),
    );
    return ringIslandNear.keep || d < (near ? MOUNT.far : MOUNT.near);
  };
  const mount = (v: RingIslandView) => {
    near = spawn({ kind: 'ring-island-near', mesh: v.root, bodies: v.bodies, update: (ctx) => v.update(ctx) });
    ringIslandNear.mounted = true;
    // The near ground is the hills now, cuttings and all: Place's cones (no cuttings, nothing solid) stand down.
    showFarHills(false);
  };
  const unmount = () => {
    if (near) despawn(near);
    near = null;
    ringIslandNear.mounted = false;
    showFarHills(true);
  };
  spawn({
    kind: 'ring-island',
    update() {
      const want = wanted();
      if (want && !near) {
        if (view) mount(view);
        else background(build(), 'ring island near view');
      } else if (!want && near) unmount();
    },
    describe: () => ({ mounted: ringIslandNear.mounted, keep: ringIslandNear.keep, ...(view?.inspect() ?? {}) }),
    dispose() {
      gone = true;
      setNearViewMounted(null);
      unmount();
      unregister?.();
      view?.dispose();
      view = null;
    },
  });
}
