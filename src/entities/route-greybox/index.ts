// The greybox route's massing, resident by distance (docs/plans/greybox-route.md, leg 1 step 4; prerequisite P1: one
// area's colliders and near mesh at a time). Each area in AREAS is built and mounted once the camera or your body is
// within 400 m of its centre and freed past 550 m; the horizon silhouette stays for the rest. High Gorge's is
// ./massing.ts; leg 2's places (docs/plans/greybox-leg2-massing.md) and leg 3's Canopy (greybox-leg3.md, step 6) join
// the list as their steps land. The legs' own views (the deck, frames, racks, signs and prompts) are ./leg-view.ts's,
// mounted by the railway's works seam. Local scenery: no state, no sync, no saves. ?blockout=world draws its own
// Gorge, so it gets none of this.
import { productionRailway } from '../../proto/flags.ts';
import { background } from '../../async.ts';
import { defineKind, despawn, spawn, type GameEntity } from '../../entity/entity.ts';
import { camera } from '../../render/scene.ts';
import { resident } from '../../render/lod-level.ts';
import { me } from '../../player/player.ts';
import { createOwnedView, type OwnedView } from '../../render/owned-view.ts';
import { precompile } from '../../render/precompile.ts';
import { gorgePlacements } from '../../prefab/instantiate.ts';
import { bellExtras, bellMassing } from './massing-bell.ts';
import { westExtras, westMassing } from './massing-west.ts';
import { canopyExtras, canopyMassing, canopyNear } from './massing-canopy.ts';
import { saltpanArea } from './massing-saltpan.ts';
import { quayArea } from './massing-quay.ts';
import { notchAreas } from './massing-notch.ts';
import { wallAreas } from './massing-wall.ts';
import { AREA_CENTRES, FREE_MORE, MOUNT_NEAR } from './leg2-layout.ts';
import { drawGreyBoxes } from './boxes.ts';
import type { Placement } from '../../prefab/types.ts';
import { routeAreas, routeSceneryMounted } from './state.ts';

defineKind('route-greybox', { update: 13 });
defineKind('route-greybox-area', {});

/** Compiled boxes, boards and land share the base owner. Optional chunks own their additions separately. */
type Area = {
  id: string;
  centre: { x: number; z: number };
  build: () => readonly Placement[];
  baseExtras?: (owner: OwnedView) => { solids: number; update(): void };
  extras?: (owner: OwnedView) => Promise<{ update(): void } | undefined>;
  near?: number;
};
const AREAS: readonly Area[] = [
  saltpanArea,
  quayArea,
  ...wallAreas,
  ...notchAreas,
  {
    id: 'gorge',
    centre: AREA_CENTRES.gorge,
    build: () => gorgePlacements,
    extras: async (owner) => (await import('./massing-incline.ts')).inclineShoulders(owner),
  },
  {
    id: 'bell',
    centre: AREA_CENTRES.bell,
    build: bellMassing,
    baseExtras: bellExtras,
    extras: async (owner) => (await import('./massing-incline.ts')).bellCut(owner, bellMassing()),
  },
  {
    id: 'west',
    centre: AREA_CENTRES.west,
    build: westMassing,
    baseExtras: westExtras,
    extras: async (owner) => (await import('./cave-shore.ts')).hoodRock(owner),
  },
  { id: 'canopy', centre: AREA_CENTRES.canopy, build: canopyMassing, baseExtras: canopyExtras, near: canopyNear },
];

if (productionRailway && new URLSearchParams(location.search).get('blockout') !== 'world') {
  let gone = false;
  const residents = AREAS.map((area) => {
    const residency = { ...area.centre, mounted: false };
    routeAreas.set(area.id, residency);
    let mounted: { owner: OwnedView; entity: GameEntity; update?: () => void; boxes: number; solids: number } | null =
        null,
      building = false;
    const wanted = () => {
      const body = me.body?.position,
        c = area.centre;
      const d = Math.min(
        Math.hypot(camera.position.x - c.x, camera.position.z - c.z),
        body ? Math.hypot(body.x - c.x, body.z - c.z) : Infinity,
      );
      const near = area.near ?? MOUNT_NEAR;
      return resident(d, mounted !== null, near, near + FREE_MORE);
    };
    async function mount() {
      building = true;
      const owner = createOwnedView();
      try {
        const boxes = area.build();
        const batch = boxes.length ? await drawGreyBoxes(owner, boxes) : null;
        const more = area.baseExtras?.(owner);
        let child: OwnedView | undefined;
        let extra: { update(): void } | undefined;
        let retryAt = 0,
          delay = 3000;
        owner.cleanup(() => child?.dispose());
        async function loadExtras(load: NonNullable<Area['extras']>) {
          const attempt = createOwnedView();
          child = attempt;
          try {
            const view = await load(attempt);
            if (!attempt.alive || !view) return;
            await precompile(attempt.root);
            if (!attempt.alive) return;
            owner.root.add(attempt.root);
            extra = view;
          } catch (error) {
            attempt.dispose();
            child = undefined;
            retryAt = performance.now() + delay;
            delay = Math.min(30000, delay * 2);
            throw error;
          }
        }
        // Its pipeline compiles off the frame before it first shows (src/render/precompile.ts).
        owner.root.visible = false;
        await precompile(owner.root);
        owner.root.visible = true;
        if (gone) return owner.dispose();
        mounted = {
          owner,
          entity: spawn({ kind: 'route-greybox-area', mesh: owner.root }),
          boxes: batch?.mesh.count ?? 0,
          solids: (batch?.solids ?? 0) + (more?.solids ?? 0),
          update() {
            batch?.update();
            more?.update();
            if (extra) extra.update();
            else if (area.extras && !child && performance.now() >= retryAt)
              background(loadExtras(area.extras), `route greybox extras: ${area.id}`);
          },
        };
        residency.mounted = true;
        routeSceneryMounted();
      } catch (error) {
        owner.dispose();
        throw error;
      } finally {
        building = false;
      }
    }
    function unmount() {
      if (!mounted) return;
      despawn(mounted.entity);
      mounted.owner.dispose();
      mounted = null;
      residency.mounted = false;
    }
    return {
      id: area.id,
      update() {
        const want = wanted();
        if (want && !mounted && !building) background(mount(), `route greybox massing: ${area.id}`);
        else if (!want && mounted) unmount();
        else mounted?.update?.();
      },
      describe: () =>
        mounted ? { resident: true, boxes: mounted.boxes, solids: mounted.solids } : { resident: false },
      unmount,
    };
  });
  spawn({
    kind: 'route-greybox',
    update() {
      for (const r of residents) r.update();
    },
    describe: () => Object.fromEntries(residents.map((r) => [r.id, r.describe()])),
    dispose() {
      gone = true;
      for (const r of residents) r.unmount();
      routeAreas.clear();
    },
  });
}
