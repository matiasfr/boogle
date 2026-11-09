// The town you can go into, in the live game (docs/game-design/place.md, "The town you can go into"): the house, and the
// shop's and museum's plots with their stake boards. Which rooms stand and what's on Pip's desk come from the town facts
// (src/sim/town-facts.ts), read from the shared railway, so everyone sees one town; the cutaway, the indoor camera and
// what's drawn near you are Local. Until place-retirement R3 the pieces load from src/proto/place with import(), as the
// railway's view does.
import type { RailwayInspection } from '../../adapters/railway.ts';
import type { FrameCtx } from '../../loop.ts';
import type { Interactable } from '../../player/hands.ts';
import { createOwnedView } from '../../render/owned-view.ts';
import {
  TOWN_FACTS,
  newestTownFact,
  townHas,
  townLevel,
  townPopulation,
  townReadOf,
  type TownRead,
} from '../../sim/town-facts.ts';
import type { TownInspection } from './state.ts';

export async function createTownView(read: () => RailwayInspection | null) {
  const owner = createOwnedView();
  const [roomKit, houseKit, sites, lines] = await Promise.all([
    import('../../proto/place/rooms.ts'),
    import('../../proto/place/house.ts'),
    import('../../proto/place/sites.ts'),
    import('../../proto/place/town-lines.ts'),
  ]);
  let facts: TownRead = { path: false, forge: false, completed: 0, trains: false };
  const refresh = () => {
    const r = read();
    if (r) facts = townReadOf(r);
  };
  refresh();
  // T1: the house stands from the start; the shop and museum keep their boards until T3 and T5 open them on the path.
  const rooms = roomKit.createRooms(owner, { up: (id) => id === 'house' });
  rooms.stakeBoard(rooms.rooms.shop, lines.BOARDS.shopPlot);
  rooms.stakeBoard(rooms.rooms.museum, lines.BOARDS.museumPlot);
  const house = houseKit.createHouse(owner, rooms.rooms.house, { has: (f) => townHas(facts, f) });
  sites.buildSites(owner);
  rooms.snap();
  rooms.warm();
  const room = (id: 'house' | 'shop' | 'museum') => ({ up: rooms.rooms[id].up, ready: rooms.rooms[id].ready });
  return {
    root: owner.root,
    /** T2 adds the residents' Talk. */
    targets: (): Interactable[] => [],
    update(ctx: FrameCtx) {
      refresh();
      sites.updateSites(ctx.dt);
      rooms.update(ctx.dt);
      house.update();
      owner.update(ctx);
    },
    inspect: (): TownInspection => ({
      facts: TOWN_FACTS.filter((f) => townHas(facts, f)),
      newest: newestTownFact(facts),
      level: townLevel(facts),
      population: townPopulation(facts),
      rooms: { house: room('house'), shop: room('shop'), museum: room('museum') },
      indoors: { room: rooms.indoors.room?.id ?? null, inside: rooms.indoors.inside?.id ?? null },
      houseStage: house.stage(),
    }),
    dispose: () => owner.dispose(),
  };
}
export type TownView = Awaited<ReturnType<typeof createTownView>>;
