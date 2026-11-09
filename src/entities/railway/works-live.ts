// Split-rock Works and the Roundhouse, live (docs/plans/split-rock-roundhouse.md, J4): the breaker, the Works, the
// stall and table, and footings on backs and the ground, behind one seam for view.ts. Local views of accepted state.
import type { RailwayAdapter, RailwayAccepted, RailwayCorrection } from '../../adapters/railway.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import { createRailwayBreaker } from './breaker-view.ts';
import { createRailwayWorks } from './works-view.ts';
import { createRailwayRoundhouse } from './roundhouse-view.ts';
import { createRailwayFootings } from './footing-view.ts';

export async function createRailwayWorksLive(
  adapter: RailwayAdapter,
  owner: OwnedView,
  deps: { seated: () => boolean; busy: () => boolean },
) {
  const shapes = await import('../../proto/place/part-geometry.ts');
  const breaker = createRailwayBreaker(adapter, owner, shapes);
  const [works, roundhouse] = await Promise.all([
    createRailwayWorks(adapter, owner, { contactIn: breaker.contactIn, seated: deps.seated, busy: deps.busy }),
    createRailwayRoundhouse(adapter, owner, { contactIn: breaker.contactIn }),
  ]);
  const footings = createRailwayFootings(adapter, owner);
  const views = [breaker, works, roundhouse, footings];
  return {
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
      footings.corrected(c);
    },
    targets: (): Interactable[] => [
      ...breaker.targets(),
      ...works.targets(),
      ...roundhouse.targets(),
      ...footings.targets(),
    ],
    inspect: () => ({
      ...works.inspect(),
      ...roundhouse.inspect(),
      ...breaker.inspect(),
      footings: footings.inspect(),
    }),
  };
}
