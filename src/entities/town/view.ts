// The town you can go into, in the live game (docs/game-design/place.md, "The town you can go into"): the house, the
// shop's and museum's plots with their stake boards, and the residents who live in them. Which rooms stand and what's on
// Pip's desk come from the town facts (src/sim/town-facts.ts), read from the shared railway, so everyone sees one town;
// the cutaway, the indoor camera, the barks and what's drawn near you are Local; what the residents told you is Personal
// Local (./memory.ts). Until place-retirement R3 the pieces load from src/proto/place with import(), as the railway's
// view does.
import type { RailwayInspection } from '../../adapters/railway.ts';
import type { FrameCtx } from '../../loop.ts';
import { conversation } from '../../player/conversation.ts';
import type { Interactable } from '../../player/hands.ts';
import { createOwnedView } from '../../render/owned-view.ts';
import {
  TOWN_FACTS,
  type TownFact,
  newestTownFact,
  townHas,
  townLevel,
  townPopulation,
  townReadOf,
  type TownRead,
} from '../../sim/town-facts.ts';
import { inspectWardrobe, wardrobe } from '../wardrobe/state.ts';
import { inspectRailway, railwayYouGot } from '../railway/state.ts';
import { createTownMemory } from './memory.ts';
import type { TownInspection } from './state.ts';

/** What every town piece reads of the world. All of it comes from the shared railway or is this tab's own moment. */
export type TownEnv = {
  has(f: TownFact): boolean;
  newest(): TownFact | null;
  level(): number;
  people(): number;
  /** The machine is awake (the railway's phase is past asleep and waking). */
  awake(): boolean;
  /** The comic score the shop's prices climb with (T5): the railway's `counts.score`. */
  money(): number;
  /** A reward reveal or a conversation is up: nobody talks over it. */
  hush(): boolean;
};
const HUSH_EVERY = 0.25; // s: the reward's state is read from inspectRailway, which walks the railway's scene

export async function createTownView(read: () => RailwayInspection | null) {
  const owner = createOwnedView();
  owner.root.name = 'town';
  const [roomKit, houseKit, shopKit, sites, lines, residentKit] = await Promise.all([
    import('../../proto/place/rooms.ts'),
    import('../../proto/place/house.ts'),
    import('../../proto/place/shop.ts'),
    import('../../proto/place/sites.ts'),
    import('../../proto/place/town-lines.ts'),
    import('../../proto/place/residents.ts'),
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
  let rewardUp = false,
    hushIn = 0;
  const env: TownEnv = {
    has: (f) => townHas(facts, f),
    newest: () => newestTownFact(facts),
    level: () => townLevel(facts),
    people: () => townPopulation(facts),
    awake: () => {
      const phase = read()?.phase;
      return !!phase && phase !== 'asleep' && phase !== 'waking';
    },
    money: () => score,
    hush: () => conversation.open || rewardUp,
  };
  // The house stands from the start; Fine Prices opens on the first path (T5). The museum keeps its board until T3.
  // The shop needs this player's wardrobe, which the wardrobe entity starts on the production railway.
  const clothes = wardrobe();
  const rooms = roomKit.createRooms(owner, {
    up: (id) => id === 'house' || (id === 'shop' && !!clothes && townHas(facts, 'path')),
  });
  rooms.stakeBoard(rooms.rooms.shop, lines.BOARDS.shopPlot);
  rooms.stakeBoard(rooms.rooms.museum, lines.BOARDS.museumPlot);
  const house = houseKit.createHouse(owner, rooms.rooms.house, env);
  const memory = createTownMemory();
  const residents = residentKit.createResidents(owner, rooms, env, memory);
  addEventListener('pagehide', memory.flush);
  owner.cleanup(() => {
    removeEventListener('pagehide', memory.flush);
    memory.flush();
  });
  // Free, with joke prices that climb with the score (owner question 4). Button answers through the residents.
  const shop = clothes
    ? shopKit.createShop(
        owner,
        rooms,
        { has: env.has, money: env.money, youGot: railwayYouGot },
        clothes,
        residents.say,
      )
    : null;
  sites.buildSites(owner);
  rooms.snap();
  rooms.warm();
  const room = (id: 'house' | 'shop' | 'museum') => ({ up: rooms.rooms[id].up, ready: rooms.rooms[id].ready });
  return {
    root: owner.root,
    /** The residents' Talk, and the shop's stands and rail. Joined only when both have something in reach. */
    targets: (): Interactable[] => {
      const a = residents.targets(),
        b = shop?.targets() ?? [];
      return !b.length ? a : !a.length ? b : [...a, ...b];
    },
    update(ctx: FrameCtx) {
      refresh();
      if ((hushIn -= ctx.dt) <= 0) {
        hushIn = HUSH_EVERY;
        const reward = inspectRailway()?.reward;
        rewardUp = !!reward && (reward.busy || reward.showing);
      }
      sites.updateSites(ctx.dt);
      rooms.update(ctx.dt);
      house.update();
      shop?.update();
      residents.update(ctx.dt);
      owner.update(ctx);
    },
    /** Just before render: what's drawn near the camera (rooms.ts `cull`). */
    cull: () => rooms.cull(),
    inspect: (): TownInspection => ({
      facts: TOWN_FACTS.filter((f) => townHas(facts, f)),
      newest: newestTownFact(facts),
      level: townLevel(facts),
      population: townPopulation(facts),
      rooms: { house: room('house'), shop: room('shop'), museum: room('museum') },
      indoors: { room: rooms.indoors.room?.id ?? null, inside: rooms.indoors.inside?.id ?? null },
      houseStage: house.stage(),
      wardrobe: inspectWardrobe(),
      residents: Object.fromEntries(
        Object.entries(residents.guys).map(([id, g]) => [id, { on: g.on, x: g.x, z: g.z }]),
      ) as TownInspection['residents'],
      bark: residents.barking(),
      memory: structuredClone(residents.seen()),
    }),
    dispose: () => owner.dispose(),
  };
}
export type TownView = Awaited<ReturnType<typeof createTownView>>;
