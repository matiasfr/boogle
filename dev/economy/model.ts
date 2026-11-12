// Offline design arithmetic, not game/sync code. Node 26; no dependencies.
// Campaign stock/events are separate from these preserved historical arithmetic fixtures.
import { number, parseOption } from './options.ts';
export { simulateCampaign, validateCampaign } from './campaign.ts';
export type { Campaign, CampaignOptions } from './campaign-types.ts';
// Evidence, units, assumptions and reproduction: docs/research/rail-economy-model.md.
// Edit/export the typed tables or call model(table, players, options) from another .ts file.
type Activity = 'harvest' | 'handling' | 'haul' | 'walk' | 'ride' | 'build' | 'wait' | 'orient' | 'content';
type Times = Record<Activity, number>;
export type Beat = { activity: Activity; seconds: number; metres?: number; newThing?: string };
export type Ingredient = { good: string; units: number; harvestS: number; supplied: boolean };
export type Station = {
  id: string;
  recipe: string;
  sourceM: number; // effective one-way pickup route; workers start/end at the frame
  spanM: number;
  setupS: number;
  before?: Beat[];
  newThing?: string; // first meaningful use/reveal, not every identical animation
  supply?: {
    rate: number; // pooled finished carried units/s, NOT raw ore or crates/s
    batch: number; // carried units on the freight vehicle
    railM: number; // already completed rail to the current rack; never unlaid track
    dwellS: number;
    leadS: number; // actual prior work during which this ONE kit was reserved/prepared
  };
};
export type Link = {
  id: string;
  era: string;
  carry: number;
  trainSpeed: number;
  laySpeed: number;
  before: Beat[];
  stations: Station[];
  after: Beat[];
};
export type Table = {
  name: string;
  walkSpeed: number;
  pickupS: number;
  unloadS: number;
  recipes: Record<string, Ingredient[]>;
  links: Link[];
};
export type Options = {
  carry?: number;
  distance?: number;
  supply?: number;
  content?: number;
  train?: number;
  coordination?: number; // extra fraction of task time per additional active carrier
};
const times = (): Times => ({
  harvest: 0,
  handling: 0,
  haul: 0,
  walk: 0,
  ride: 0,
  build: 0,
  wait: 0,
  orient: 0,
  content: 0,
});
const total = (t: Times) => Object.values(t).reduce((a, b) => a + b, 0);
function add(to: Times, from: Times) {
  for (const key of Object.keys(to) as Activity[]) to[key] += from[key];
}
const min = (seconds: number) => +(seconds / 60).toFixed(2);
const beat = (activity: Activity, seconds: number, newThing?: string): Beat => ({ activity, seconds, newThing });
const item = (good: string, units: number, supplied = false, harvestS = 0): Ingredient => ({
  good,
  units,
  supplied,
  harvestS,
});

export function model(table: Table, players: number, options: Options = {}) {
  number(players, 'players', 1, true);
  if (players > 4) throw new Error('This comparison supports 1–4 active players');
  number(table.walkSpeed, 'walkSpeed', Number.EPSILON);
  number(table.pickupS, 'pickupS');
  number(table.unloadS, 'unloadS');
  const distance = number(options.distance ?? 1, 'distance');
  const supply = number(options.supply ?? 1, 'supply', Number.EPSILON);
  const content = number(options.content ?? 1, 'content');
  const train = number(options.train ?? 1, 'train', Number.EPSILON);
  const coordination = number(options.coordination ?? 0, 'coordination');
  const shares = times();
  const seen = new Set<string>();
  let clock = 0,
    lastNew = 0,
    longest = 0,
    longestWhere = '',
    finds = 0;
  function novelty(label?: string) {
    if (!label || seen.has(label)) return;
    if (clock - lastNew > longest) {
      longest = clock - lastNew;
      longestWhere = label;
    }
    seen.add(label);
    lastNew = clock;
  }
  function advance(t: Times) {
    add(shares, t);
    clock += total(t);
  }
  function beats(list: Beat[], trainSpeed: number) {
    const start = clock;
    for (const b of list) {
      number(b.seconds, `${b.activity} seconds`);
      const t = times();
      const metres = number(b.metres ?? 0, 'beat metres');
      if (metres && b.activity !== 'walk' && b.activity !== 'ride') throw new Error('Distance belongs to walk/ride');
      t[b.activity] =
        b.seconds * (b.activity === 'content' ? content : 1) +
        metres / (b.activity === 'ride' ? trainSpeed * train : table.walkSpeed);
      advance(t);
      novelty(b.newThing);
    }
    return clock - start;
  }
  const links = table.links.map((link) => {
    const start = clock,
      linkTimes = { ...shares };
    const carry = number(options.carry ?? link.carry, 'carry', 1, true);
    number(link.trainSpeed, 'trainSpeed', Number.EPSILON);
    number(link.laySpeed, 'laySpeed', Number.EPSILON);
    const beforeS = beats(link.before, link.trainSpeed);
    const stations = link.stations.map((station, index) => {
      number(station.sourceM, 'sourceM');
      number(station.spanM, 'spanM');
      number(station.setupS, 'setupS');
      const approachS = beats(station.before ?? [], link.trainSpeed);
      const recipe = table.recipes[station.recipe];
      if (!recipe?.length) throw new Error(`Missing/empty recipe: ${station.recipe}`);
      const pieces = recipe.flatMap((ingredient) => {
        number(ingredient.units, 'units', 1, true);
        number(ingredient.harvestS, 'harvestS');
        return Array.from({ length: ingredient.units }, () => ingredient);
      });
      const networkUnits = pieces.filter((p) => p.supplied).length;
      // A whole kit is produced, then shipped in batches; no streaming overlap.
      // Only this station is reserved, so there is no unlimited offline stock.
      let readyS = 0;
      if (networkUnits) {
        const s = station.supply;
        if (!s) throw new Error(`No supply for ${station.id}`);
        number(s.rate, 'rate', Number.EPSILON);
        number(s.batch, 'batch', 1, true);
        number(s.railM, 'railM');
        number(s.dwellS, 'dwellS');
        number(s.leadS, 'leadS');
        const batches = Math.ceil(networkUnits / s.batch);
        const leg = s.railM / (link.trainSpeed * train);
        // Production may overlap the prior lay. Freight travel cannot: that track
        // is only traversable once the previous station has completed.
        readyS = Math.max(0, networkUnits / (s.rate * supply) - s.leadS) + (2 * batches - 1) * leg + batches * s.dwellS;
        readyS = Math.max(0, readyS - approachS - (index === 0 ? beforeS : 0));
      }
      const wait = times();
      wait.wait = readyS;
      advance(wait);
      // Compare minimum-load and one-load-per-player schedules, balancing sizes.
      // A larger bag need not force a crew to consolidate into one solo load.
      // No inter-station preloading; all return legs are charged.
      const trips = Math.ceil(pieces.length / carry);
      let chosen: { workers: Times[]; count: number[]; work: Times; loads: number } | undefined;
      for (let loads = trips; loads <= Math.max(trips, players) && loads <= pieces.length; loads++) {
        const active = Math.min(players, loads);
        const workers = Array.from({ length: active }, times);
        const count = Array.from({ length: active }, () => 0);
        let offset = 0;
        for (let trip = 0; trip < loads; trip++) {
          const size = Math.floor(pieces.length / loads) + (trip < pieces.length % loads ? 1 : 0);
          const load = pieces.slice(offset, offset + size);
          offset += size;
          let w = 0;
          for (let k = 1; k < active; k++) if (total(workers[k]!) < total(workers[w]!)) w = k;
          const worker = workers[w]!;
          worker.harvest += load.reduce((s, p) => s + p.harvestS, 0);
          worker.handling += table.pickupS + load.length * table.unloadS;
          worker.haul += (2 * station.sourceM * distance) / table.walkSpeed;
          count[w]!++;
        }
        const critical = workers.reduce((a, b) => (total(a) >= total(b) ? a : b));
        // An explicit interference sensitivity, not a measured multiplayer penalty.
        const work = { ...critical };
        for (const key of Object.keys(work) as Activity[]) work[key] *= 1 + coordination * (active - 1);
        if (!chosen || total(work) < total(chosen.work)) chosen = { workers, count, work, loads };
      }
      if (!chosen) throw new Error(`No loads for ${station.id}`);
      const { workers, count, work, loads } = chosen;
      const active = workers.length;
      const labourS = workers.reduce((s, w) => s + total(w), 0);
      advance(work);
      const workS = total(work);
      const build = times();
      build.build = station.spanM / link.laySpeed + station.setupS;
      advance(build);
      novelty(station.newThing);
      const flags: string[] = [];
      if (workS > 40) flags.push('long-work>40s');
      if (workS < 8) flags.push('tiny-work<8s');
      if (trips > 2) flags.push('repeat>2-loads');
      if (readyS > 10) flags.push('supply-wait>10s');
      if (active < players) flags.push(`${players - active}-spare-players`);
      finds++; // one proposed cosmetic find per completed station; no timing benefit
      return {
        id: station.id,
        recipe: station.recipe,
        minTrips: trips,
        trips: loads,
        waves: Math.max(...count),
        active,
        workS,
        labourS,
        waitS: readyS,
        buildS: build.build,
        endS: clock,
        flags,
      };
    });
    const openS = clock;
    beats(link.after, link.trainSpeed);
    finds += 3; // three proposed finds at each link's first freight payoff
    const activityS = times();
    for (const key of Object.keys(activityS) as Activity[]) activityS[key] = shares[key] - linkTimes[key];
    return {
      id: link.id,
      era: link.era,
      minutes: min(clock - start),
      cumulative: min(clock),
      openS,
      stations,
      activityS,
    };
  });
  if (clock - lastNew > longest) {
    longest = clock - lastNew;
    longestWhere = 'end (no later novelty)';
  }
  return {
    name: table.name,
    players,
    minutes: min(clock),
    totalS: clock,
    longestNoNewMin: min(longest),
    longestWhere,
    noveltyEvents: seen.size,
    finds,
    findsPerHour: clock ? +((finds * 3600) / clock).toFixed(1) : 0,
    activityMinutes: Object.fromEntries(Object.entries(shares).map(([k, v]) => [k, min(v)])),
    activityPercent: Object.fromEntries(
      Object.entries(shares).map(([k, v]) => [k, clock ? +((100 * v) / clock).toFixed(1) : 0]),
    ),
    links,
  };
}

// Current recipe/timing constants copied from place/layout.ts at 5f8b9009.
// sourceM is a FITTED effective distance, not a surveyed path: see calibration.
const workTargets = [22, 19, 42, 10, 34, 36];
const recipes: Table['recipes'] = {
  wood24: [item('logs', 24, false, 0.24 / 4)],
  wood12: [item('logs', 12, false, 0.24 / 4)],
  mix12: [item('logs', 8), item('rails', 4)],
  mix16: [item('logs', 8), item('rails', 8)],
  end12: [item('logs', 4), item('rails', 8)],
  supply12: [item('logs', 8, true), item('rails', 4, true)],
  supply16: [item('logs', 8, true), item('rails', 8, true)],
  supplyEnd: [item('logs', 4, true), item('rails', 8, true)],
  steam: [item('bracing', 7, true), item('rails', 8, true), item('crystal seed', 1, true)],
  crystal: [item('bracing', 7, true), item('rails', 8, true), item('crystal seed', 1, false, 1)],
  iron: [item('girder kits', 8, true), item('rails', 8, true), item('collars', 7, true), item('crystal seed', 1, true)],
  diesel: [item('slab kits', 8, true), item('rail modules', 8, true)],
  electric: [item('wire reels', 8, true), item('rail modules', 8, true), item('mast kits', 8, true)],
  future: [item('span kits', 7, true), item('rail modules', 8, true), item('crystal seed', 1, true)],
};
function fittedStation(
  id: string,
  recipe: string,
  target: number,
  spanM: number,
  setupS: number,
  newThing?: string,
): Station {
  const r = recipes[recipe]!;
  const units = r.reduce((s, p) => s + p.units, 0),
    trips = Math.ceil(units / 12);
  const harvest = r.reduce((s, p) => s + p.units * p.harvestS, 0);
  const sourceM = ((target - harvest - trips * 1.2 - units * 0.09) * 5.6) / (2 * trips);
  return { id, recipe, sourceM, spanM, setupS, newThing };
}
export const prototype: Table = {
  name: 'prototype (fitted, not a fresh measurement)',
  walkSpeed: 5.6,
  pickupS: 1.2,
  unloadS: 0.09,
  recipes,
  links: [
    {
      id: 'timber',
      era: 'wood',
      carry: 12,
      trainSpeed: 12,
      laySpeed: 5,
      before: [
        { activity: 'walk', seconds: 0, metres: 78 * 5.6, newThing: 'camp discovered' },
        beat('orient', 6.5, 'wake layer'),
      ],
      stations: [
        fittedStation('T1', 'wood24', 22, 75, 0, 'first physical track'),
        fittedStation('T2', 'wood24', 19, 54, 0.2, 'walkable gorge trestle'),
        fittedStation('T3', 'wood24', 42, 32, 0.1, 'timber connection'),
      ],
      after: [
        { activity: 'walk', seconds: 0, metres: 30 * 5.6 },
        { activity: 'ride', seconds: 0, metres: 39 * 12 },
        beat('wait', 11, 'forge and turntable ready'),
      ],
    },
    {
      id: 'quarry',
      era: 'wood',
      carry: 12,
      trainSpeed: 12,
      laySpeed: 5,
      before: [beat('orient', 1)],
      stations: [
        fittedStation('Q1', 'mix12', 10, 35, 0, 'first mixed kit'),
        fittedStation('Q2', 'mix16', 34, 80, 1),
        fittedStation('Q3', 'end12', 36, 59, 1.2),
      ],
      after: [beat('wait', 39, 'quarry cargo grows town')],
    },
  ],
};

// A tuned short chapter, NOT a 45-minute promise. Separate variants before combining in play.
export const chapter: Table = structuredClone(prototype);
chapter.name = 'chapter one hypothesis';
chapter.links[0]!.stations[2]!.recipe = 'wood12';
chapter.links[0]!.before.unshift(beat('orient', 30));
chapter.links[0]!.after.push(beat('content', 60, 'see timber become forge rails'));
chapter.links[1]!.carry = 16;
chapter.links[1]!.before = [beat('orient', 1), beat('content', 20, 'commission frontier freight')];
for (const [i, station] of chapter.links[1]!.stations.entries()) {
  station.recipe = ['supply12', 'supply16', 'supplyEnd'][i]!;
  station.sourceM = [24, 30, 36][i]!;
  station.supply = { rate: 2, batch: 16, railM: [0, 35, 115][i]!, dwellS: 5, leadS: 0 };
  // Only production of this one kit overlaps the previous lay.
  if (i > 0) {
    const previous = chapter.links[1]!.stations[i - 1]!;
    station.supply.leadS = previous.spanM / chapter.links[1]!.laySpeed + previous.setupS;
  }
  station.newThing = ['first freight kit', 'freight reaches new rim', 'quarry service'][i]!;
}

// Rough content authoring budget. "content" is unbuilt discovery/choice/aftermath,
// not forced waiting, and gets NO invented novelty events inside it.
// Rows: era, train m/s, lay m/s, carry, kit, source m, supply units/s, rail m/link,
//      content minutes/era, shared walking minutes/era, riding minutes/era.
const eraRows: [string, number, number, number, string, number, number, number, number, number, number][] = [
  ['wood', 12, 5, 12, 'wood24', 30, 1, 180, 30, 8, 2],
  ['steam', 20, 25, 16, 'steam', 36, 1, 1200, 48, 8, 4],
  ['iron-harbour', 20, 30, 16, 'iron', 30, 2, 1200, 74, 8, 5],
  ['diesel-concrete', 30, 30, 16, 'diesel', 36, 3, 1200, 85, 8, 4],
  ['electric', 40, 30, 16, 'electric', 30, 4, 1200, 80, 8, 3],
  ['future', 50, 30, 16, 'future', 36, 4, 1200, 80, 6, 3],
];
export const eras: Table = { ...prototype, name: 'six eras: content-budget hypothesis', links: [] };
for (const [era, speed, lay, carry, kit, sourceM, rate, length, contentMin, walkMin, rideMin] of eraRows) {
  for (let l = 0; l < 2; l++) {
    const id = `${era}-${l + 1}`;
    const stations: Station[] = Array.from({ length: 3 }, (_, s) => ({
      id: `${id}.${s + 1}`,
      recipe: era === 'steam' && l === 0 && s === 0 ? 'crystal' : kit,
      sourceM,
      spanM: length / 3,
      setupS: 1,
      before: [beat('content', era === 'wood' ? (l === 0 ? [60, 60, 240][s]! : 480) : (contentMin * 60) / 6)],
      supply: { rate, batch: 24, railM: (s * length) / 3, dwellS: 5, leadS: 0 },
      newThing: s === 2 ? `${id} service` : s === 0 ? `${id} approach` : undefined,
    }));
    // Chapter-one costs/relief carry forward; wood line two is already supplied.
    if (era === 'wood') {
      for (const [s, station] of stations.entries()) {
        station.recipe = l === 0 ? (s === 2 ? 'wood12' : 'wood24') : ['supply12', 'supply16', 'supplyEnd'][s]!;
      }
    }
    eras.links.push({
      id,
      era,
      carry: era === 'wood' && l === 1 ? 16 : carry,
      trainSpeed: speed,
      laySpeed: lay,
      before: [{ activity: 'walk', seconds: 0, metres: walkMin * 30 * prototype.walkSpeed }],
      stations,
      after: [{ activity: 'ride', seconds: 0, metres: rideMin * 30 * speed, newThing: `${id} destination` }],
    });
  }
}

// Round 4 of the retired Place prototype (docs/plans/round-4.md), hypotheses until played: a slog by hand that's starting to feel long by the
// end, then each rung. Bills and spans are src/place/layout.ts's. A press every 0.38 s (a person, not the 0.24 s cooldown),
// 2 logs a stroke, then 5 with the proper axe. sourceM is the historical grove-based one-way carry, weighted by
// how many of a station's loads go that far (Q3 is one load of rails 130 m and one of logs 16 m from the rack, so 73).
// Universal finite trees change the nearest reachable source; use the playthrough trace for current elapsed times.
const axe1 = 0.38 / 2,
  axe2 = 0.38 / 5;
const round4Recipes: Table['recipes'] = {
  t1: [item('logs', 24, false, axe1)],
  t2: [item('logs', 32, false, axe1), item('stone', 8, false, axe1)],
  t3: [item('logs', 40, false, axe1)],
  f1: [item('logs', 24, false, axe2)],
  f2: [item('logs', 32, false, axe2)],
  q1: [item('logs', 16, false, axe2), item('rails', 6)],
  q2: [item('logs', 24), item('rails', 12)],
  q3: [item('logs', 16), item('rails', 12)],
  q4: [item('logs', 16), item('rails', 16)],
  q5: [item('logs', 24), item('rails', 24)],
  q6: [item('logs', 32), item('rails', 32)],
};
const r4 = (id: string, recipe: string, sourceM: number, spanM: number, newThing?: string): Station => ({
  id,
  recipe,
  sourceM,
  spanM,
  setupS: 1,
  newThing,
});
export const round4: Table = {
  name: 'round 4: hungry, then relief',
  walkSpeed: 5.6,
  pickupS: 1.2,
  unloadS: 0.09,
  recipes: round4Recipes,
  links: [
    {
      id: 'first path',
      era: 'wood',
      carry: 8,
      trainSpeed: 18,
      laySpeed: 5,
      before: [
        { activity: 'walk', seconds: 0, metres: 431, newThing: 'camp discovered' },
        beat('orient', 4, 'wake layer'),
      ],
      stations: [
        r4('T1', 't1', 20, 41, 'first physical track'),
        r4('T2', 't2', 30, 34, 'stone'),
        {
          ...r4('T3', 't3', 65, 86, 'first path open, no train'),
          // The great tree: 12 strokes, and its trunk on your shoulder, there and back.
          before: [beat('harvest', 12 * 0.38), { activity: 'haul', seconds: 0, metres: 0 }, beat('handling', 2)],
        },
      ],
      after: [
        beat('content', 8, 'celebration'),
        { activity: 'walk', seconds: 0, metres: 90, newThing: 'the walk home' },
      ],
    },
    {
      id: 'forge frame',
      era: 'wood',
      carry: 8,
      trainSpeed: 18,
      laySpeed: 5,
      before: [beat('content', 5, 'proper axe')],
      stations: [{ ...r4('F1', 'f1', 95, 0, 'forge frame up'), setupS: 0 }], // half its logs from the old oak, half over the bridge
      after: [],
    },
    {
      id: 'forge lit',
      era: 'wood',
      carry: 16,
      trainSpeed: 18,
      laySpeed: 5,
      before: [beat('content', 5, 'pack frame')],
      stations: [{ ...r4('F2', 'f2', 170, 0, 'forge lit'), setupS: 0 }],
      after: [beat('wait', 10, 'machine turns')],
    },
    {
      id: 'far head',
      era: 'wood',
      carry: 16,
      trainSpeed: 18,
      laySpeed: 7,
      before: [],
      stations: [
        r4('Q1', 'q1', 150, 35, 'depot'),
        r4('Q2', 'q2', 27, 80, 'gorge again, logs by cart'),
        r4('Q3', 'q3', 73, 56, 'quarry reached'),
        r4('Q4', 'q4', 103, 108),
        r4('Q5', 'q5', 199, 260, 'far head, over the sea'),
      ],
      after: [{ activity: 'walk', seconds: 0, metres: 546, newThing: 'the long walk home' }],
    },
    {
      id: 'trains',
      era: 'wood',
      carry: 16,
      trainSpeed: 18,
      laySpeed: 9,
      before: [
        { activity: 'walk', seconds: 0, metres: 190, newThing: 'boiler over the bridge' },
        beat('orient', 4, 'trains'),
        { activity: 'ride', seconds: 0, metres: 190 },
        { activity: 'ride', seconds: 0, metres: 524, newThing: 'first ride out' },
      ],
      stations: [r4('Q6', 'q6', 16, 196, 'the pier')],
      after: [beat('content', 10, 'the end')],
    },
  ],
};

// Keep round4 as the historical comparison. This is a deliberately conservative
// cold-start estimate: empty forge, cart at camp, all shipments before carrying.
// No credit for stock already made, a cart already travelling, or overlapping the
// first short carry with the second shipment. Abilities remain outside this model.
export const round4Cart: Table = structuredClone(round4);
round4Cart.name = 'round 4: mixed cart from Q4 (cold-start estimate)';
for (const station of round4Cart.links.flatMap((link) => link.stations)) {
  if (station.id !== 'Q4' && station.id !== 'Q5') continue;
  // layout.ts/depot.ts: camp road 196 m, stop 13 m before s=178/286.
  const roadM = station.id === 'Q4' ? 361 : 469;
  const recipe = round4Cart.recipes[station.recipe]!;
  const rails = recipe.find((item) => item.good === 'rails')!.units;
  const logs = recipe.find((item) => item.good === 'logs')!.units;
  const batches = Math.max(Math.ceil(logs / 24), Math.ceil(rails / 16));
  // Forge: 2 rails/s. Cart: 9 m/s, camp load 3 s, forge departure 3 s,
  // last piece lands within 3.3 s. Return to camp between batches.
  const supplyS = rails / 2 + ((2 * batches - 1) * roadM) / 9 + batches * (3 + 3 + 3.3);
  station.sourceM = 16;
  station.before = [...(station.before ?? []), beat('wait', supplyS, 'rails arrive with the cart')];
}

function report(result: ReturnType<typeof model>) {
  console.log(`\n${result.name} | ${result.players} player(s)`);
  console.table(
    result.links.map((l) => ({
      link: l.id,
      min: l.minutes,
      cumulative: l.cumulative,
      trips: l.stations.map((s) => `${s.id}:${s.minTrips}/${s.trips}/${s.waves}`).join(' '),
      workS: l.stations.map((s) => +s.workS.toFixed(1)).join('/'),
      waitS: l.stations.map((s) => +s.waitS.toFixed(1)).join('/'),
    })),
  );
  console.log(
    'Trips = minimum loads / scheduled loads / maximum by one carrier. Partial loads may help friends. Activity = elapsed critical-path %.',
  );
  console.log(result.activityPercent);
  console.log(`Longest without new content: ${result.longestNoNewMin} min (ending at ${result.longestWhere}).`);
  console.log(
    `Hypothetical cosmetics: ${result.finds} finds, ${result.findsPerHour}/hour; never count as new capability.`,
  );
  for (const l of result.links)
    for (const s of l.stations) if (s.flags.length) console.log(`${s.id}: ${s.flags.join(', ')}`);
  if (result.longestNoNewMin > 10)
    console.log('CONTENT GAP >10 min: author/verify a new experience or shorten the budget.');
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const mode = args.find((a) => !a.startsWith('--')) ?? 'all';
  const tables: Record<string, Table> = { prototype, chapter, eras, round4, 'round4-cart': round4Cart };
  const options: Options = {};
  const allowed = ['carry', 'distance', 'supply', 'content', 'train', 'coordination'] as const;
  for (const arg of args.filter((a) => a.startsWith('--') && a !== '--json')) {
    const [key, value] = parseOption(arg) ?? [];
    if (!allowed.includes(key as (typeof allowed)[number]) || value === undefined)
      throw new Error(
        `Unknown argument ${arg}. Use --carry=N, --distance=N, --supply=N, --content=N, --train=N, --coordination=N, --json.`,
      );
    options[key as (typeof allowed)[number]] = Number(value);
  }
  if (!['all', 'sensitivity', ...Object.keys(tables)].includes(mode)) throw new Error(`Unknown table ${mode}`);
  if (mode === 'sensitivity') {
    const cases: [string, Options][] = [
      ['base', {}],
      ['carry8', { carry: 8 }],
      ['carry12', { carry: 12 }],
      ['carry16', { carry: 16 }],
      ['carry24', { carry: 24 }],
      ['distance0.5', { distance: 0.5 }],
      ['distance2', { distance: 2 }],
      ['supply0.5', { supply: 0.5 }],
      ['supply0.1', { supply: 0.1 }],
      ['train2', { train: 2 }],
      ['content0.75', { content: 0.75 }],
      ['content0', { content: 0 }],
      ['coordination0.25', { coordination: 0.25 }],
    ];
    const results = Object.entries(tables).flatMap(([name, table]) =>
      cases.map(([change, values]) => ({
        table: name,
        change,
        minutes1to4: [1, 2, 3, 4].map((p) => model(table, p, { ...options, ...values }).minutes),
      })),
    );
    if (args.includes('--json')) console.log(JSON.stringify(results, null, 2));
    else console.table(results.map((r) => ({ ...r, minutes1to4: r.minutes1to4.join(' / ') })));
  } else {
    const selected = mode === 'all' ? Object.values(tables) : [tables[mode]!];
    const results = selected.flatMap((t) => [1, 2, 3, 4].map((p) => model(t, p, options)));
    if (args.includes('--json')) console.log(JSON.stringify(results, null, 2));
    else results.forEach(report);
    if (mode === 'all' || mode === 'prototype') {
      const fitted = model(prototype, 1);
      const actual = fitted.links.flatMap((l) => l.stations.map((s) => s.workS));
      const error = Math.max(...actual.map((s, i) => Math.abs(s - workTargets[i]!)));
      if (error > 1e-8 || Math.abs(fitted.totalS - 437) > 1e-8) throw new Error('Calibration arithmetic drifted');
      if (!args.includes('--json'))
        console.log(
          `Calibration: station max error ${error.toFixed(6)} s; final ${fitted.totalS} s (fit, not validation).`,
        );
    }
  }
}
