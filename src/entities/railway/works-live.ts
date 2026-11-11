// Split-rock Works and the Roundhouse, live (docs/plans/split-rock-roundhouse.md, J4): the breaker, the Works, the
// stall and table, footings on backs and the ground, and (J5) the crossing at the pier, behind one seam for view.ts.
// Local views of accepted state.
import type { RailwayAdapter, RailwayAccepted, RailwayCorrection } from '../../adapters/railway.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import { createRailwayBreaker } from './breaker-view.ts';
import { createRailwayWorks } from './works-view.ts';
import { createRailwayRoundhouse } from './roundhouse-view.ts';
import { createRailwayFootings } from './footing-view.ts';
import { createRailwayCrossing } from './crossing-view.ts';
import { createRailwayRailhead } from './railhead-view.ts';
import { createRailwayLeaf } from './leaf-view.ts';

export async function createRailwayWorksLive(
  adapter: RailwayAdapter,
  owner: OwnedView,
  deps: {
    seated: () => boolean;
    busy: () => boolean;
    toPier: () => number;
    toRing: () => number;
    /** Shows or hides the island's hook ring (hook-view.ts), once the gap is footed. */
    hookRing: (on: boolean) => void;
  },
) {
  const shapes = await import('../../render/part-geometry.ts');
  const breaker = createRailwayBreaker(adapter, owner, shapes);
  const [works, roundhouse, crossing] = await Promise.all([
    createRailwayWorks(adapter, owner, { contactIn: breaker.contactIn, seated: deps.seated, busy: deps.busy }),
    createRailwayRoundhouse(adapter, owner, { contactIn: breaker.contactIn }),
    createRailwayCrossing(adapter, owner, deps),
  ]);
  const footings = createRailwayFootings(adapter, owner);
  const railhead = createRailwayRailhead(adapter, owner, deps);
  const leaf = createRailwayLeaf(adapter);
  const views = [breaker, works, roundhouse, footings, crossing, railhead, leaf];
  return {
    /** Where the footing wagon's loads hop from and to: the Works rack and the pier rack. */
    footPlaces: { works: works.rackSlot, pier: crossing.rackSlot, ring: railhead.rackSlot },
    crossingInspect: () => crossing.inspect().crossingView,
    restore() {
      for (const view of views) view.restore();
    },
    update(dt: number) {
      for (const view of views) view.update(dt);
    },
    lateUpdate: footings.lateUpdate,
    prePhysics: footings.prePhysics,
    accepted(e: RailwayAccepted) {
      for (const view of views) view.accepted(e);
    },
    corrected(c: RailwayCorrection) {
      works.corrected(c);
      roundhouse.corrected(c);
      crossing.corrected(c);
      railhead.corrected(c);
      footings.corrected(c);
    },
    targets: (): Interactable[] => [
      ...breaker.targets(),
      ...works.targets(),
      ...roundhouse.targets(),
      ...footings.targets(),
      ...crossing.targets(),
      ...railhead.targets(),
      ...leaf.targets(),
    ],
    inspect: () => ({
      ...works.inspect(),
      ...railhead.inspect(),
      ...leaf.inspect(),
      ...roundhouse.inspect(),
      ...breaker.inspect(),
      footings: footings.inspect(),
    }),
  };
}
