// Places-panel alternative: fibre → cement → steel, small stops, then the original island.
// This does not select the route or approve moving double jump. All numbers are paper inputs.
import type { Campaign } from './campaign-types.ts';
import { campaignKit } from './campaign-kit.ts';

const { tune, tasks, activity, fitting, profile, homeSources, line, scenarios } = campaignKit({});
activity('start', 'Read the gorge and find the workfront', 'starter', [], 8);
fitting('path', 'Walkable first path', 'R', 'starter', ['start'], { W: 96, stone: 8 });
fitting('axe', 'Proper axe', 'F', 'starter', ['path'], {}, { profile: { sourceRate: 1.5 } });
fitting('pack', 'Carry frame', 'F', 'starter', ['axe'], { W: 24 }, { profile: { carry: 16 } });
fitting('forge', 'Forge service', 'M', 'starter', ['pack'], { W: 32 });
activity('hook', 'Hook pull discovery', 'starter', ['forge'], 5, {
  kind: 'A',
  effect: { profile: { hookM: 24, hooks: ['ring'] } },
});
fitting(
  'rack',
  'Nearby supplied rack',
  'C',
  'starter',
  ['hook'],
  { W: 40, rails: 18 },
  { profile: { carryDistance: 0.6 }, chore: 'source commute' },
);
activity('glider', 'Glider discovery and first return', 'starter', ['rack'], 6, {
  kind: 'A',
  effect: { profile: { glideMps: 10 } },
});
fitting('network', 'First useful freight line', 'M', 'starter', ['glider'], { W: 88, rails: 84 });
activity('starter-close', 'Pier outlook and village visit', 'starter', ['network'], 10, { kind: 'E' });

activity(
  'glass-arrive',
  'Find the suspended baskets and open the first roof shutter',
  'glasshouse',
  ['starter-close'],
  20,
  {
    paths: [
      { id: 'glass-walk', mode: 'walk', metres: 480, puzzleS: 180 },
      { id: 'glass-hook', mode: 'hook', metres: 120, puzzleS: 120, needs: { hookM: 24, hookType: 'ring' } },
    ],
  },
);
fitting('F0', 'Loom source works', 'C', 'glasshouse', ['glass-arrive'], { W: 16 });
fitting(
  'F1',
  'Fibre loading straps',
  'C',
  'glasshouse',
  ['F0'],
  { fibre: 8, W: 4 },
  { profile: { unloadS: 0 }, chore: 'hand unloading' },
  false,
  'glasshouse',
);
fitting('F2', 'Fibre carrying sling', 'F', 'glasshouse', ['F1'], { fibre: 12, W: 4 }, { profile: { carry: 24 } }, true);
fitting('F3', 'Glider cloth', 'F', 'glasshouse', ['F1'], { fibre: 8, W: 4 }, { profile: { glideMps: 14 } }, true);
fitting(
  'F4',
  'First fibre resource hub',
  'M',
  'glasshouse',
  ['F1'],
  { fibre: 12, W: 8 },
  { profile: { rack: 24, carryDistance: 0.4 } },
);
fitting('F5', 'Town awnings', 'E', 'glasshouse', ['F4'], { fibre: 6, W: 4 }, {}, true);
activity('glass-puzzle', 'Thread the spindle through roof shutters and latch the baskets', 'glasshouse', ['F4'], 24, {
  paths: [
    { id: 'basket-walk', mode: 'walk', metres: 420, puzzleS: 300 },
    { id: 'basket-glide', mode: 'glide', metres: 240, puzzleS: 150, needs: { glideMps: 14 } },
  ],
});
activity('glass-close', 'Export a second strap and use the home crane', 'glasshouse', ['glass-puzzle'], 16);
activity('glass-side', 'Optional upper baskets and resident rooms', 'glasshouse', ['F1'], 20, {
  optional: true,
  kind: 'E',
});

activity('sail', 'Sail-testing tower and second jump device', 'small-stops', ['glass-close'], 12, {
  kind: 'A',
  effect: { profile: { extraJumps: 1 } },
});
activity('sail-practice', 'Leave the tower by the learned combination', 'small-stops', ['sail'], 6, {
  practice: 'second jump/glide',
  paths: [{ id: 'sail-gap', mode: 'walk', metres: 80, puzzleS: 60, needs: { extraJumps: 1 } }],
});
activity('shell-arrive', 'Enter the Split Shell and find the vertical kiln route', 'shell', ['sail-practice'], 18);
fitting('C0', 'Shell kiln source works', 'C', 'shell', ['shell-arrive'], { fibre: 8, W: 8 });
fitting('C1', 'Precast piers across the crack', 'R', 'shell', ['C0'], { C: 12, W: 8 }, {}, false, 'shell');
fitting('C2', 'Cement stock bays', 'F', 'shell', ['C1'], { C: 8, W: 4 }, { profile: { rack: 32 } }, true);
fitting(
  'C3',
  'Dry ramps',
  'C',
  'shell',
  ['C1'],
  { C: 8, W: 4 },
  { profile: { carryDistance: 0.3 }, chore: 'platform detour' },
);
fitting(
  'C4',
  'Frontier depot extension',
  'C',
  'shell',
  ['C3'],
  { C: 12, W: 8 },
  { profile: { carryDistance: 0.2 }, chore: 'frontier supply detour' },
);
fitting(
  'C5',
  'Cutting bench',
  'C',
  'shell',
  ['C4'],
  { C: 6, W: 4 },
  { profile: { pickupS: 0 }, chore: 'kit preparation' },
  true,
);
fitting('C6', 'High landing ledges', 'R', 'shell', ['C1'], { C: 4, W: 4 }, {}, true);
activity('shell-puzzle', 'Latch the upper shelf and open the walking return', 'shell', ['C4'], 24, {
  paths: [
    { id: 'shell-stairs', mode: 'walk', metres: 480, puzzleS: 240 },
    { id: 'shell-ledge', mode: 'glide', metres: 160, puzzleS: 120, needs: { unlock: 'C6', glideMps: 10 } },
  ],
});
activity('shell-close', 'Return to home and use the supported work deck', 'shell', ['shell-puzzle'], 16);
activity('shell-side', 'Optional chambers inside the folded coast', 'shell', ['C1'], 20, { optional: true, kind: 'E' });
activity('jump-plus', 'Third jump device on the bell terrace', 'small-stops', ['shell-close'], 8, {
  optional: true,
  kind: 'A',
  effect: { profile: { extraJumps: 2 } },
});
activity('hook-long', 'Long hook reel on the bell terrace', 'small-stops', ['shell-close'], 6, {
  optional: true,
  kind: 'F',
  effect: { profile: { hookM: 36 } },
});
activity('bell', 'Bell terraces: combine the moves already found', 'small-stops', ['shell-close'], 12, {
  practice: 'jump/hook/glide',
});

activity('exhibit-arrive', 'Find the engine too large for its exit', 'exhibition', ['bell'], 20);
fitting('S0', 'Exhibition foundry source works', 'C', 'exhibition', ['exhibit-arrive'], { C: 8, W: 8 });
fitting('S2', 'Steel truss and engine exit', 'R', 'exhibition', ['S0'], { S: 12, W: 8 }, {}, false, 'exhibition');
fitting(
  'S1',
  'Cylinder and freight chassis',
  'F',
  'exhibition',
  ['S2'],
  { S: 8, C: 4 },
  { profile: { wagon: 32, trainRate: 1.25 } },
  true,
);
fitting(
  'S3',
  'Magazine feeder',
  'C',
  'exhibition',
  ['S2'],
  { S: 8, C: 4 },
  { profile: { pickupS: 0 }, chore: 'magazine reload' },
);
fitting('S5', 'Steel tool heads', 'F', 'exhibition', ['S3'], { S: 4, W: 4 }, { profile: { sourceRate: 2 } }, true);
fitting('S6', 'Hook return and catwalk', 'R', 'exhibition', ['S3'], { S: 4, W: 4 }, {}, true);
activity('exhibit-puzzle', 'Rearrange the machinery and open the linked gates', 'exhibition', ['S3'], 26);
fitting('S4', 'Roundhouse and junction assembly', 'M', 'exhibition', ['exhibit-puzzle'], { S: 12, C: 8 });
activity('exhibit-close', 'Export the working wagon and take its first useful trip', 'exhibition', ['S4'], 16);
activity('exhibit-side', 'Optional fair exhibits and workshop interiors', 'exhibition', ['S2'], 20, {
  optional: true,
  kind: 'E',
});
activity('hook-type', 'Plate-target hook head at the observatory', 'small-stops', ['exhibit-close'], 7, {
  optional: true,
  kind: 'A',
  effect: { profile: { hooks: ['plate'] } },
});
activity('observatory', 'Broken observatory: see the final island by day', 'small-stops', ['exhibit-close'], 12, {
  optional: true,
  kind: 'E',
});
activity(
  'final-scout',
  'Scout the original island approach with the accumulated toolkit',
  'old-island',
  ['exhibit-close'],
  14,
  {
    paths: [
      { id: 'final-walk', mode: 'walk', metres: 600, puzzleS: 360 },
      { id: 'final-jump', mode: 'walk', metres: 280, puzzleS: 180, needs: { extraJumps: 2 } },
      { id: 'final-glide', mode: 'glide', metres: 400, puzzleS: 120, needs: { glideMps: 14 } },
      { id: 'final-plate', mode: 'hook', metres: 140, puzzleS: 90, needs: { hookM: 36, hookType: 'plate' } },
    ],
  },
);
fitting('return', 'Final return connection from known kits', 'R', 'old-island', ['final-scout'], {
  fibre: 4,
  C: 4,
  S: 4,
});
activity('landing', 'Original landing and lighthouse route', 'old-island', ['return'], 20);
activity('ending', 'Meet The Boogler; retain the revisitable ending', 'old-island', ['landing'], 10, { kind: 'E' });

export const threeArea: Campaign = {
  id: 'three-area',
  name: 'Glasshouse → Split Shell → Exhibition, with small stops',
  provenance: [
    'docs/brainstorms/progression.md (proposed; no route chosen)',
    'Fibre costs, stop timing, final bill and all geometry/durations guessed',
    'Cement/steel bills reuse upgrade-economy; C4 is expansion, not a second M',
  ],
  ...tune,
  profile,
  sources: [
    ...homeSources,
    {
      id: 'fibre',
      node: 'glasshouse',
      requires: ['F0'],
      raw: 'raw-fibre',
      good: 'fibre',
      reserve: tune.sourceReserve,
      seed: 4,
      batch: 4,
      seconds: 40,
    },
    {
      id: 'cement',
      node: 'shell',
      requires: ['C0'],
      raw: 'raw-C',
      good: 'C',
      reserve: tune.sourceReserve,
      seed: 4,
      batch: 4,
      seconds: 60,
    },
    {
      id: 'steel',
      node: 'exhibition',
      requires: ['S0'],
      raw: 'raw-S',
      good: 'S',
      reserve: tune.sourceReserve,
      seed: 4,
      batch: 4,
      seconds: 40,
    },
  ],
  lines: [
    { id: 'glass-line', from: 'home', to: 'glasshouse', requires: ['F0'] },
    { id: 'shell-line', from: 'glasshouse', to: 'shell', requires: ['C0'] },
    { id: 'exhibit-line', from: 'shell', to: 'exhibition', requires: ['S0'] },
    { id: 'roundhouse-link', from: 'home', to: 'exhibition', requires: ['S4'] },
  ].map(line),
  tasks,
  terminal: 'ending',
  scenarios,
};
