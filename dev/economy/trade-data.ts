// Passenger trade ("Boogles"): every number the trade model uses, in one table. Offline design arithmetic only.
// Source: docs/brainstorms/passenger-trade.md sections 3 and 8; the owner called the first prices "fine as stand-ins;
// tune them on the 2D model page" (10 November 2026). Nothing here is a game rule until the owner says so.
export const TOWNS = ['village', 'ring', 'canopy', 'port', 'gorge'] as const;
export type Town = (typeof TOWNS)[number];
export const MATS = ['W', 'St', 'Fi', 'Cu'] as const;
export type Mat = (typeof MATS)[number];
export type Bill = Partial<Record<Mat, number>>;

export type Tunable = { key: string; group: string; label: string; value: number; unit: string; note: string };
const rows: Tunable[] = [];
const add = (group: string, key: string, label: string, value: number, unit: string, note = '') =>
  rows.push({ key, group, label, value, unit, note });

const TOWN_NAME: Record<Town, string> = {
  village: 'the Village',
  ring: 'Ring Island',
  canopy: 'Canopy Town',
  port: 'Port Quay',
  gorge: 'High Gorge',
};
export const townName = (t: Town) => TOWN_NAME[t];

// Fares: 2 to board plus 1 a 100 m. Village to Far Head is 7 and Home to Ring Island 14 (brief, section 3).
add('Fares', 'fare.board', 'Fare to board', 2, 'Boogles', 'Brief section 3');
add('Fares', 'fare.per100m', 'Fare per 100 m ridden', 1, 'Boogles', 'Brief section 3');
const KM: Record<Town, number> = { village: 0.5, ring: 1.2, canopy: 2.9, port: 3.8, gorge: 5.4 };
for (const t of TOWNS)
  add(
    'Fares',
    `km.${t}`,
    `Ride length, ${TOWN_NAME[t]}`,
    KM[t],
    'km',
    'Village 7, Ring 14, Canopy 31 are the brief; Port and Gorge are stand-ins',
  );

// Riders.
add('Riders', 'riders.perBuilding', 'Riders a building sends', 2, 'a minute each way', 'Brief section 3');
add(
  'Riders',
  'riders.townBuilding',
  'Riders a town building (workplace or sight) adds',
  1,
  'a minute each way',
  'Brief section 3',
);
add(
  'Riders',
  'riders.startBuildings',
  'Buildings a town has on arrival',
  2,
  'buildings',
  'Owner, 10 and 11 November: a couple',
);
add(
  'Riders',
  'riders.fitoutBoost',
  'Rise in riders per station fit-out step',
  0.25,
  'of the rate',
  'Two steps at most',
);
add('Riders', 'riders.jitter', 'Random swing in riders each minute', 0.2, 'of the rate', 'Seeded; the only randomness');
add('Riders', 'crowd.stop', 'Waiting riders that stop a train', 4, 'riders', 'Decided: four or more, never an express');
add('Riders', 'crowd.cap', 'Waiting riders past which the rest give up', 24, 'riders', 'Stand-in; 12 are drawn');
add(
  'Riders',
  'house.buildMin',
  'Minutes from the buy to the first riders',
  1,
  'minutes',
  'The build is about 30 seconds',
);

// Trains and seats.
add('Seats', 'seats.perCar', 'Seats in a passenger car', 4, 'seats', 'A Four car');
add('Seats', 'seats.six', 'Seats in a car after the Six fit-out', 6, 'seats', '');
add('Seats', 'trains.perLine', 'Trains on a line', 2, 'trains', 'Line 2 has two');
add('Seats', 'cars.base', 'Passenger cars a train starts with', 1, 'cars', 'The free first car');
add('Seats', 'cars.second', 'Passenger cars after the second-car buy', 2, 'cars', 'The cap is four cars');
add(
  'Seats',
  'cycle.base',
  'Round trip, fixed part',
  1,
  'minutes',
  'Stand-in; gives line 2 about 4.8 riders a minute each way',
);
add('Seats', 'cycle.perKm', 'Round trip, per km of ride', 1.3, 'minutes', 'Stand-in');
add(
  'Seats',
  'express.seats',
  'Seats the express set adds (Port Quay line)',
  8,
  'seats',
  'Stand-in; the brief gives no effect',
);

// Strongbox, sack, away.
add(
  'Box',
  'box.incomeMin',
  'Strongbox holds, in minutes of income',
  20,
  'minutes',
  'Decided: the larger of this or the next',
);
add('Box', 'box.dearestMult', 'Strongbox holds, times the dearest thing on offer', 1.5, 'times', 'Decided');
add('Box', 'sack.min', 'Coin sack holds, in minutes of income', 15, 'minutes', 'Decided');
add('Box', 'away.horizonH', 'Away credit horizon H', 2, 'hours', 'Decided 6 November: H x (1 - e^(-away/H))');
add('Box', 'away.hours', 'A night away', 22, 'hours', 'Used for the night-away figure');

// Houses and town things (Boogles). Prices are the ones the owner saw.
const HOUSE: Record<Town, number[]> = {
  village: [300, 800, 3000],
  ring: [1300, 2100],
  canopy: [2500, 4000, 6400],
  port: [3500, 5600],
  gorge: [5000, 8000],
};
for (const t of TOWNS)
  HOUSE[t].forEach((p, i) =>
    add(
      'Town buys',
      `house.${t}.${i + 1}`,
      `House ${i + 1}, ${TOWN_NAME[t]}`,
      p,
      'Boogles',
      i === 2 && t === 'village' ? 'Offered at the first branch' : 'Brief section 3',
    ),
  );
add(
  'Town buys',
  'house.order',
  "Each next house in a town costs this times the last, on the brief's base prices",
  2,
  'times',
  "Owner, 11 November: later purchases can cost more; 1 gives the brief's prices as written",
);
add(
  'Town buys',
  'house.mult.materialSeats',
  'House price factor when seats cost materials',
  1.5,
  'times',
  'Brief: "half as much again"',
);
add(
  'Town buys',
  'house.mult.boogleSeats',
  'House price factor when seats cost Boogles',
  1,
  'times',
  'The prices he saw',
);
add('Town buys', 'building.ring', 'Town building at Ring Island', 1600, 'Boogles', 'Adds one rider a minute each way');
const FIT: Record<Town, number> = { village: 1800, ring: 2400, canopy: 3500, port: 5000, gorge: 7000 };
for (const t of TOWNS)
  add(
    'Town buys',
    `fitout.${t}`,
    `Station fit-out, ${TOWN_NAME[t]}`,
    FIT[t],
    'Boogles',
    'First step; the second costs more',
  );
add(
  'Town buys',
  'step2Mult',
  "Price of a thing's second step",
  1.6,
  'times',
  'Brief: each next step 1.6 times the last',
);

// Source upgrades (Boogles). `cut.*` is what one step takes off the labour and waiting in the route steps still to come.
const SOURCES: [string, string, string, number][] = [
  ['regrowth.camp', "Faster regrowth, the timber camp's grove", 'home.line2', 1100],
  ['regrowth.quarry', "Faster regrowth, the Quarry's rocks", 'home.line2', 1100],
  ['rack.forge', "Bigger rack, the forge's", 'home.line2', 900],
  ['loader.works', "Faster loader arm, the Works' footing loader", 'home.line2', 1300],
  ['rack.steelworks', "Bigger rack, the steel works'", 'ring.connect', 1500],
  ['loader.steelworks', "Faster loader arm, the steel works'", 'ring.connect', 2200],
  ['regrowth.loft', "Faster regrowth, the cloth loft's crop", 'b1.reach', 2800],
  ['rack.loft', "Bigger rack, the cloth loft's", 'b1.reach', 2400],
  ['loader.loft', "Faster loader arm, the cloth loft's", 'b1.reach', 3200],
  ['rack.copper', "Bigger rack, the copper source's", 'port.reach', 4000],
  ['loader.ring', "Faster loader arm, a ring source's", 'b2.reach', 5500],
];
export type SourceDef = { id: string; kind: 'regrowth' | 'rack' | 'loader'; label: string; offerAt: string };
export const SOURCE_DEFS: SourceDef[] = SOURCES.map(([id, label, offerAt]) => ({
  id,
  kind: id.split('.')[0] as SourceDef['kind'],
  label,
  offerAt,
}));
for (const [id, label, , price] of SOURCES)
  add('Source upgrades', `src.${id}`, label, price, 'Boogles', 'Brief section 3; two steps');
add(
  'Source upgrades',
  'cut.regrowth',
  'Labour and waiting one regrowth step removes',
  0.04,
  'of the rest',
  'Stand-in; the least certain number here',
);
add('Source upgrades', 'cut.rack', 'Labour and waiting one rack step removes', 0.02, 'of the rest', 'Stand-in');
add('Source upgrades', 'cut.loader', 'Labour and waiting one loader step removes', 0.03, 'of the rest', 'Stand-in');

// Seats: the material bills (hauled) and the old Boogle prices (for the seats-in-Boogles room).
export type SeatStep = 'six' | 'car' | 'express';
export const SEAT_STEPS: Record<Town, SeatStep[]> = {
  village: ['six', 'car'],
  ring: ['six', 'car'],
  canopy: ['six', 'car'],
  port: ['six', 'car', 'express'],
  gorge: ['six', 'car'],
};
const SIX: Record<Town, Bill> = {
  village: { W: 24 },
  ring: { W: 16 },
  canopy: { W: 24, Fi: 6 },
  port: { W: 24, Fi: 6 },
  gorge: { W: 24, Fi: 6 },
};
const CAR: Record<Town, Bill> = {
  village: { St: 6, W: 24 },
  ring: { St: 10, Fi: 8 },
  canopy: { St: 10, Fi: 8 },
  port: { St: 10, Fi: 8 },
  gorge: { St: 10, Fi: 8 },
};
const SIX_B: Record<Town, number> = { village: 600, ring: 500, canopy: 3000, port: 3000, gorge: 3000 };
const CAR_B: Record<Town, number> = { village: 2000, ring: 6000, canopy: 6000, port: 6000, gorge: 6000 };
for (const t of TOWNS) {
  for (const step of SEAT_STEPS[t]) {
    const bill: Bill = step === 'six' ? SIX[t] : step === 'car' ? CAR[t] : { St: 12, Fi: 8, Cu: 4 };
    const nm = step === 'six' ? 'Six fit-out' : step === 'car' ? 'Second car' : "Express's passenger set";
    for (const m of MATS)
      if (bill[m])
        add(
          'Seats on materials',
          `bill.${t}.${step}.${m}`,
          `${nm}, ${TOWN_NAME[t]}: ${m}`,
          bill[m]!,
          'units',
          'Stand-in sized beside engine-garage',
        );
    const b = step === 'six' ? SIX_B[t] : step === 'car' ? CAR_B[t] : 6000;
    add(
      'Seats in Boogles',
      `seatB.${t}.${step}`,
      `${nm}, ${TOWN_NAME[t]}`,
      b,
      'Boogles',
      'The price before his 10 November answer',
    );
  }
}
add('Seats on materials', 'haul.W', 'Minutes to haul one log', 0.14, 'minutes', 'About 440 an hour by hand (ring-sim)');
add('Seats on materials', 'haul.St', 'Minutes to haul one steel', 0.3, 'minutes', 'Stand-in');
add('Seats on materials', 'haul.Fi', 'Minutes to haul one fibre', 0.35, 'minutes', 'Stand-in');
add('Seats on materials', 'haul.Cu', 'Minutes to haul one copper', 0.5, 'minutes', 'Stand-in');
add(
  'Seats on materials',
  'haul.parallel',
  'Each extra player adds, hauling',
  0.7,
  'of a hauler',
  "ring-sim's handParallel",
);

// End-game goals priced in Boogles: town buildings only (the rest of the goals are cargo, works and track).
add('Goals', 'goal.G5', 'Grand Station at Home', 18750, 'Boogles', 'ring-data GOALS');
add('Goals', 'goal.G6', 'Ring lighthouse', 18750, 'Boogles', 'ring-data GOALS');
add('Goals', 'goal.G7', 'Express engine collection (looks)', 22500, 'Boogles', 'ring-data GOALS');
add('Goals', 'goal.hoursMax', 'Longest the goals are played after the route', 12, 'hours', 'Model limit');

export const TUNABLES: readonly Tunable[] = rows;
export type Tunables = Record<string, number>;
export const defaultTunables = (): Tunables => Object.fromEntries(TUNABLES.map((r) => [r.key, r.value]));
