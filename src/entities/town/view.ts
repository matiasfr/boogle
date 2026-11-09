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
import { inspectWardrobe, wardrobe } from '../wardrobe/state.ts';
import { railwayYouGot } from '../railway/state.ts';
import type { TownInspection } from './state.ts';

export async function createTownView(read: () => RailwayInspection | null) {
  const owner = createOwnedView();
  const [roomKit, houseKit, shopKit, sites, lines] = await Promise.all([
    import('../../proto/place/rooms.ts'),
    import('../../proto/place/house.ts'),
    import('../../proto/place/shop.ts'),
    import('../../proto/place/sites.ts'),
    import('../../proto/place/town-lines.ts'),
  ]);
  let facts: TownRead = { path: false, forge: false, completed: 0, trains: false };
  let score = 0;
  const refresh = () => {
    const r = read();
    if (!r) return;
    facts = townReadOf(r);
    score = r.counts.score;
  };
  refresh();
  // The house stands from the start; Fine Prices opens on the first path (T5). The museum keeps its board until T3.
  // The shop needs this player's wardrobe, which the wardrobe entity starts on the production railway.
  const clothes = wardrobe();
  const rooms = roomKit.createRooms(owner, {
    up: (id) => id === 'house' || (id === 'shop' && !!clothes && townHas(facts, 'path')),
  });
  rooms.stakeBoard(rooms.rooms.shop, lines.BOARDS.shopPlot);
  rooms.stakeBoard(rooms.rooms.museum, lines.BOARDS.museumPlot);
  const has = (f: Parameters<typeof townHas>[1]) => townHas(facts, f);
  const house = houseKit.createHouse(owner, rooms.rooms.house, { has });
  // Free, with joke prices that climb with the score (owner question 4). Button speaks once T2's residents are in.
  const shop = clothes
    ? shopKit.createShop(owner, rooms, { has, money: () => score, youGot: railwayYouGot }, clothes, () => {})
    : null;
  sites.buildSites(owner);
  rooms.snap();
  rooms.warm();
  const room = (id: 'house' | 'shop' | 'museum') => ({ up: rooms.rooms[id].up, ready: rooms.rooms[id].ready });
  return {
    root: owner.root,
    /** The shop's stands and rail; T2 adds the residents' Talk. */
    targets: (): Interactable[] => shop?.targets() ?? [],
    update(ctx: FrameCtx) {
      refresh();
      sites.updateSites(ctx.dt);
      rooms.update(ctx.dt);
      house.update();
      shop?.update();
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
      wardrobe: inspectWardrobe(),
    }),
    dispose: () => owner.dispose(),
  };
}
export type TownView = Awaited<ReturnType<typeof createTownView>>;
