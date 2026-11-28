// Split-rock Works and the Roundhouse, live (docs/plans/split-rock-roundhouse.md, J4): the breaker, the Works, the
// stall and table, footings on backs and the ground, and (J5) the crossing at the pier, behind one seam for view.ts.
// Local views of accepted state.
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { RailwayAccepted, RailwayCorrection } from '../../adapters/railway-effects.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import { createRailwayBreaker } from './breaker-view.ts';
import { createRailwayWorks } from './works-view.ts';
import { createRailwayRoundhouse } from './roundhouse-view.ts';
import { createRailwayFootings } from './footing-view.ts';
import { createRailwayCrossing } from './crossing-view.ts';
import { createRailwayRailhead } from './railhead-view.ts';
import type { RailheadDeck } from './railhead-state.ts';
import { createRailwayLeaf } from './leaf-view.ts';
import { createBoilerInstall } from './boiler-install-view.ts';
import { createRingMeet } from '../ring-meet/view.ts';
import { createRingFolk } from '../ring-folk/view.ts';
import { createRingSteel } from '../ring-steel/view.ts';
import { createLegView } from '../route-greybox/leg-view.ts';
import { createStationGuides } from './station-guides.ts';
import { createRouteGuides } from '../route-greybox/phase-guides.ts';
import { giftQueued, giftInTransit, giftRides, worksThanks } from '../../sim/railway-queries-gift.ts';
import { railwayMirror, rules } from '../../world/game-world.ts';
import { roomWorks, WORKS_STEPS } from '../../sim/railway-queries-room.ts';
import { boiler, works as worksRow, type ReadWorld } from '../../sim/railway-rows.ts';
import { createWorksSignal } from './works-signal.ts';
import { islandGround } from '../ring-island/state.ts';
import { createWorksBoard } from './works-board-state.ts';

// A funded section keeps its site while laying, even after the feed action disappears.
const routeSections = new Set(
  WORKS_STEPS.filter((step) => step.ops.includes('rail.legStock')).map((step) => step.site),
);

export async function createRailwayWorksLive(
  adapter: RailwayAdapter,
  owner: OwnedView,
  deps: {
    deck: RailheadDeck;
    busy: () => boolean;
    toPier: () => number;
    toRing: () => number;
    loaderHook: () => { x: number; y: number; z: number } | null;
    /** Shows or hides the island's hook ring (hook-view.ts), once the gap is footed. */
    hookRing: (on: boolean) => void;
  },
) {
  const shapes = await import('../../render/part-geometry.ts');
  const breaker = createRailwayBreaker(adapter, owner, shapes);
  const [works, roundhouse, crossing, steel, leg] = await Promise.all([
    createRailwayWorks(adapter, owner, { contactIn: breaker.contactIn, busy: deps.busy, loaderHook: deps.loaderHook }),
    createRailwayRoundhouse(adapter, owner, { contactIn: breaker.contactIn }),
    createRailwayCrossing(adapter, owner, deps),
    createRingSteel(adapter, owner),
    createLegView(adapter, owner),
  ]);
  const footings = createRailwayFootings(adapter, owner);
  const railhead = createRailwayRailhead(adapter, owner, deps);
  const leaf = createRailwayLeaf(adapter);
  const meet = createRingMeet(adapter, owner, { ...deps, landed: leaf.landed });
  const folk = createRingFolk(adapter, owner);
  const guides = createStationGuides(adapter, owner);
  const routeGuides = createRouteGuides(owner, () => adapter.read.ready() && adapter.read.whole());
  const signal = createWorksSignal(owner, await islandGround());
  const updateBoard = createWorksBoard(owner);

  let publication: Parameters<typeof roomWorks>[0] | undefined;
  let current: ReturnType<typeof roomWorks> | undefined;
  function updateSignal(dt: number, restore = false) {
    if (!adapter.read.whole() || !railwayMirror) return;
    const world = railwayMirror.confirmed();
    if (world !== publication || !current) {
      current = roomWorks(world);
      routeGuides.read(world as ReadWorld, current);
      const routeSection = routeSections.has(current.site);
      const names = routeSection
        ? worksThanks(world)
            .map((pid) => {
              const ordinal = rules.roster.indexOf(pid);
              return ordinal < 0 ? undefined : rules.roster.nameOf(ordinal);
            })
            .filter((name): name is string => !!name)
            .slice(0, 6)
        : [];
      updateBoard(
        current,
        names,
        routeSection && (giftRides(world) || giftInTransit(world))
          ? [giftQueued(world), giftInTransit(world)]
          : undefined,
      );
      publication = world;
    }
    if (!current) return;
    const work = current;

    const forgeCalling =
      (work.site === 'boiler' && boiler(world).state === 'pedestal') ||
      (work.site === 'breaker' && worksRow(world).breaker === 1);
    signal(work, forgeCalling, dt, restore);
  }
  const install = createBoilerInstall(adapter, owner);
  const views = [
    breaker,
    works,
    roundhouse,
    footings,
    crossing,
    railhead,
    leaf,
    meet,
    folk,
    guides,
    steel,
    install,
    leg,
  ];
  return {
    /** Where the footing wagon's loads hop from and to: the Works rack and the pier rack. */
    footPlaces: { works: works.rackSlot, pier: crossing.rackSlot, ring: railhead.rackSlot },
    /** The junctions these views draw (the railhead's J10, the greybox stack's J12), for turnout-blades.ts. */
    points: [...railhead.points, ...leg.points],
    crossingInspect: () => crossing.inspect().crossingView,
    restore() {
      updateSignal(0, true);
      for (const view of views) view.restore();
    },
    update(dt: number) {
      updateSignal(dt);
      for (const view of views) view.update(dt);
      routeGuides.update(dt);
    },
    lateUpdate() {
      footings.lateUpdate();
      folk.lateUpdate();
      guides.lateUpdate();
      routeGuides.lateUpdate();
    },
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
      meet.corrected(c);
    },
    targets: (): Interactable[] => [
      ...breaker.targets(),
      ...works.targets(),
      ...roundhouse.targets(),
      ...footings.targets(),
      ...crossing.targets(),
      ...railhead.targets(),
      ...leaf.targets(),
      ...meet.targets(),
      ...folk.targets(),
      ...guides.targets(),
      ...steel.targets(),
      ...install.targets(),
      ...leg.targets(),
      ...routeGuides.targets(),
    ],
    inspect: () => ({
      routeGuides: routeGuides.inspect(),
      ...works.inspect(),
      ...railhead.inspect(),
      ...leaf.inspect(),
      ...meet.inspect(),
      ...folk.inspect(),
      ...guides.inspect(),
      ...steel.inspect(),
      ...install.inspect(),
      ...leg.inspect(),
      ...roundhouse.inspect(),
      ...breaker.inspect(),
      footings: footings.inspect(),
    }),
  };
}
