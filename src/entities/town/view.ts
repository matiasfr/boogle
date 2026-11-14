// The town you can go into, in the live game (docs/game-design/place.md, "The town you can go into"): the house, the
// shop's and museum's plots with their stake boards, and the residents who live in them. Which rooms stand and what's on
// Pip's desk come from the town facts (src/sim/town-facts.ts), read from the shared railway, so everyone sees one town;
// the cutaway, the indoor camera, the barks and what's drawn near you are Local; what the residents told you is Personal
// Local (./memory.ts). The museum's 1:120 table shows the shared railway as it stands (place-retirement T3).
import type { FrameCtx } from '../../loop.ts';
import { conversation } from '../../player/conversation.ts';
import { NO_TARGETS, type Interactable } from '../../player/hands.ts';
import { createOwnedView } from '../../render/owned-view.ts';
import {
  TOWN_FACTS,
  type TownFact,
  newestTownFact,
  townHas,
  townLevel,
  townPopulation,
  type TownRead,
} from '../../sim/town-facts.ts';
import { LINE1_STATIONS } from '../../sim/railway-line-layout.ts';
import { LINE2_STATIONS } from '../../sim/railway-line2-layout.ts';
import { inspectWardrobe, wardrobe } from '../wardrobe/state.ts';
import { inspectRailway, railwayYouGot } from '../railway/state.ts';
import { createTownMemory } from './memory.ts';
import type { TownLook } from './town-read.ts';
import type { TownInspection } from './state.ts';
type Fact = import('./town-lines.ts').Fact;
import { createCurioShelf } from './curio-shelf.ts';
import { createTownBlockout } from './blockout.ts';

/** What every town piece reads of the world. All of it comes from the shared railway or is this tab's own moment. */
export type TownEnv = {
  has(f: TownFact): boolean;
  /** The newest town fact, or the Works' breaker once it is taken (src/entities/town/town-lines.ts, `WORKS_FACTS`). */
  newest(): Fact | null;
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
const TABLE_EVERY = 0.5; // s: so is what the museum's table shows (trees, the machine, the trains)
/** The great tree's id in the railway's sources (LINE1_GREAT_TREE). */
const GREAT_TREE = 28;

export async function createTownView(read: () => TownLook | null) {
  const owner = createOwnedView();
  owner.root.name = 'town';
  const [roomKit, houseKit, shopKit, sites, lines, residentKit, museumKit, plans, layout] = await Promise.all([
    import('./rooms.ts'),
    import('./house.ts'),
    import('./shop.ts'),
    import('../../place/sites.ts'),
    import('./town-lines.ts'),
    import('./residents.ts'),
    import('./museum.ts'),
    import('../../place/opening-plans.ts'),
    import('../../place/layout.ts'),
  ]);
  let facts: TownRead = { path: false, forge: false, completed: 0, trains: false };
  let score = 0;
  let railway: TownLook | null = null;
  const refresh = () => {
    const r = read();
    if (!r) return;
    railway = r;
    facts = r.facts;
    score = r.score;
  };
  refresh();
  let rewardUp = false,
    hushIn = 0;
  const env: TownEnv = {
    has: (f) => townHas(facts, f),
    newest: () => (railway?.breaker === 2 ? 'breaker' : newestTownFact(facts)),
    level: () => townLevel(facts),
    people: () => townPopulation(facts),
    awake: () => {
      const phase = railway?.phase;
      return !!phase && phase !== 'asleep' && phase !== 'waking';
    },
    money: () => score,
    hush: () => conversation.open || rewardUp,
  };
  // The house stands from the start; Fine Prices and the museum open on the first path (T5, T3). The shop needs this
  // player's wardrobe, which the wardrobe entity starts on the production railway.
  const clothes = wardrobe();
  const rooms = roomKit.createRooms(owner, {
    up: (id) =>
      id === 'house' || (id === 'museum' && env.has('path')) || (id === 'shop' && !!clothes && env.has('path')),
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
  // The museum's table: the opening village and the town's rooms, the track down so far, the trees still up, and what
  // moves, read from the shared railway. Trees and movers come from inspectRailway, so they're sampled at 2 Hz.
  const opening = plans.openingBuildings().map((b) => ({ plan: b.plan, grow: 1 }));
  const [line1, line2] = [layout.LINKS[0]!.line, layout.LINKS[1]!.line];
  let tableTrees: { x: number; z: number; great: boolean }[] = [],
    movers: { x: number; y: number; z: number; kind: 'machine' | 'train' }[] = [],
    tableIn = 0;
  const sampleTable = () => {
    const r = inspectRailway();
    if (!r) return;
    tableTrees = r.trees.filter((t) => !t.cleared).map((t) => ({ x: t.x, z: t.z, great: t.id === GREAT_TREE }));
    movers = [{ ...r.machine, kind: 'machine' }];
    if (facts.trains)
      for (const t of r.line2View.trains) {
        const c = t.cars[0];
        if (c) movers.push({ x: c.x, y: c.y, z: c.z, kind: 'train' });
      }
  };
  const museum = museumKit.createMuseum(owner, rooms, {
    *buildings() {
      yield* opening;
      for (const r of Object.values(rooms.rooms)) {
        const q = r.site;
        if (q.state !== 'none') yield { plan: q.plan, grow: q.state === 'done' ? 1 : q.t / q.doneAt };
      }
    },
    forgeLit: () => facts.forge,
    trees: () => tableTrees,
    *rails() {
      // Line 1 lays from the camp to the village: each station's stretch runs from its toCm back to its fromCm, and
      // both ends' stubs are down from the start. Line 2 lays out from the turntable.
      yield { line: line1, lo: 0, hi: layout.STUB.village };
      yield { line: line1, lo: LINE1_STATIONS[0]!.fromCm / 100, hi: line1.len };
      for (const [i, completion] of (railway?.line1 ?? []).entries()) {
        const q = LINE1_STATIONS[i];
        if (q && completion) yield { line: line1, lo: q.toCm / 100, hi: q.fromCm / 100 };
      }
      yield { line: line2, lo: 0, hi: LINE2_STATIONS[0]!.fromCm / 100 };
      for (const [i, completion] of (railway?.line2 ?? []).entries()) {
        const q = LINE2_STATIONS[i];
        if (q && completion) yield { line: line2, lo: q.fromCm / 100, hi: q.toCm / 100 };
      }
    },
    movers: () => movers,
    people: env.people,
  });
  // Your wardrobe, stood up in the village: what you own on it, the rest under dust sheets (C1).
  const shelf = clothes ? await createCurioShelf(owner, clothes) : null;
  // The Round's unbuilt plots and the clock's footing as plain blocks, in every town state (the blocks read no fact).
  createTownBlockout(owner);
  sites.buildSites(owner);
  rooms.snap();
  rooms.warm();
  const room = (id: 'house' | 'shop' | 'museum') => ({ up: rooms.rooms[id].up, ready: rooms.rooms[id].ready });
  return {
    root: owner.root,
    /** The residents' Talk and the shop's stands and rail. Joined only when more than one has something in reach. */
    targets(): Interactable[] {
      const parts = [residents.targets(), shop?.targets() ?? NO_TARGETS].filter((t) => t.length);
      return parts.length === 0 ? NO_TARGETS : parts.length === 1 ? parts[0]! : parts.flat();
    },
    /** The curio shelf, for K1's crystals (`shelfGroup`, `crystalPeg`). */
    shelf,
    update(ctx: FrameCtx) {
      refresh();
      if ((hushIn -= ctx.dt) <= 0) {
        hushIn = HUSH_EVERY;
        const reward = inspectRailway()?.reward;
        rewardUp = !!reward && (reward.busy || reward.showing);
      }
      sites.updateSites(ctx.dt);
      rooms.update(ctx.dt);
      if (rooms.rooms.museum.near.visible && (tableIn -= ctx.dt) <= 0) {
        tableIn = TABLE_EVERY;
        sampleTable();
      }
      museum.update(ctx.dt);
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
      museumBits: museum.shown(),
      wardrobe: inspectWardrobe(),
      residents: Object.fromEntries(
        Object.entries(residents.guys).map(([id, g]) => [id, { on: g.on, x: g.x, z: g.z }]),
      ) as TownInspection['residents'],
      bark: residents.barking(),
      memory: structuredClone(residents.seen()),
      shelf: shelf?.inspect() ?? null,
    }),
    dispose: () => owner.dispose(),
  };
}
export type TownView = Awaited<ReturnType<typeof createTownView>>;
