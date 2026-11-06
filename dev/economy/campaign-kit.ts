// Shared paper-model inputs and authoring helpers; each call owns its mutable content.
import type { Campaign, Effect, Kind, Line, Stock, Task } from './campaign-types.ts';

export function campaignKit<T extends Record<string, number>>(extraTune: T) {
  const tune = {
    targetS: 8 * 3600,
    horizonS: 12 * 3600,
    maxPurchases: 3,
    warningGapS: 15 * 60,
    fittingAuthoredS: 60,
    fittingBuildS: 20,
    carryM: 30,
    sourceReserve: 512,
    ...extraTune,
    lineM: 1200,
    speedMps: 20,
    accelerationMps2: 2,
    dwellS: 8,
    transferS: 6,
    trains: 1,
    capacity: 24,
  };
  const tasks: Task[] = [];
  function activity(
    id: string,
    label: string,
    area: string,
    requires: string[],
    minutes: number,
    extra: Partial<Task> = {},
  ) {
    tasks.push({
      id,
      label,
      area,
      site: 'home',
      requires,
      bill: {},
      authoredS: minutes * 60,
      buildS: 0,
      carryM: tune.carryM,
      ...extra,
    });
  }
  function fitting(
    id: string,
    label: string,
    kind: Kind,
    area: string,
    requires: string[],
    bill: Stock,
    effect: Effect = {},
    optional = false,
    site = 'home',
  ) {
    tasks.push({
      id,
      label,
      kind,
      area,
      site,
      requires,
      bill,
      effect,
      optional,
      authoredS: tune.fittingAuthoredS,
      buildS: tune.fittingBuildS,
      carryM: tune.carryM,
    });
  }
  const profile: Campaign['profile'] = {
    carry: 8,
    rack: 16,
    walkMps: 5.6,
    glideMps: 0,
    hookMps: 18,
    hookM: 0,
    extraJumps: 0,
    sourceRate: 1,
    trainRate: 1,
    wagon: 24,
    pickupS: 1.2,
    unloadS: 0.09,
    carryDistance: 1,
    hooks: [],
    removedChores: [],
  };
  const homeSources: Campaign['sources'] = [
    {
      id: 'timber',
      node: 'home',
      requires: [],
      raw: 'standing-W',
      good: 'W',
      reserve: tune.sourceReserve,
      seed: 0,
      batch: 4,
      seconds: 1,
    },
    {
      id: 'stone',
      node: 'home',
      requires: [],
      raw: 'raw-stone',
      good: 'stone',
      reserve: 16,
      seed: 0,
      batch: 4,
      seconds: 2,
    },
    {
      id: 'rails',
      node: 'home',
      requires: ['forge'],
      raw: 'raw-rail',
      good: 'rails',
      reserve: 128,
      seed: 0,
      batch: 4,
      seconds: 2,
    },
  ];
  const line = (route: Pick<Line, 'id' | 'from' | 'to' | 'requires'>): Line => ({
    ...route,
    metres: tune.lineM,
    speedMps: tune.speedMps,
    accelerationMps2: tune.accelerationMps2,
    dwellS: tune.dwellS,
    transferS: tune.transferS,
    trains: tune.trains,
    capacity: tune.capacity,
  });
  const scenarios: Campaign['scenarios'] = {
    'late-3h': [
      { atS: 0, players: ['p1'] },
      { atS: 3 * 3600, players: ['p1', 'late'] },
    ],
    'late-7h': [
      { atS: 0, players: ['p1'] },
      { atS: 7 * 3600, players: ['p1', 'late'] },
    ],
    '1-2-1': [
      { atS: 0, players: ['p1'] },
      { atS: 3600, players: ['p1', 'p2'] },
      { atS: 2 * 3600, players: ['p1'] },
    ],
    absence: [
      { atS: 0, players: ['p1'] },
      { atS: 2 * 3600, players: [] },
      { atS: 3 * 3600, players: ['p1'] },
    ],
  };
  return { tune, tasks, activity, fitting, profile, homeSources, line, scenarios };
}
