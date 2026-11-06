// Proposed Arc A, not a selected route or current gameplay constants. Shared inputs live in campaign-kit.ts.
import type { Campaign, Path } from './campaign-types.ts';
import { campaignKit } from './campaign-kit.ts';

const { tune, tasks, activity, fitting, profile, homeSources, line, scenarios } = campaignKit({
  rareReserve: 16,
  batch: 4,
});
// Opening costs retain the historical round4 totals, grouped into named jobs, not a prediction of the live opening.
activity('start', 'Read the gorge and find the workfront', 'starter', [], 8);
fitting('path', 'Walkable first path', 'R', 'starter', ['start'], { W: 96, stone: 8 });
fitting('axe', 'Proper axe', 'F', 'starter', ['path'], {}, { profile: { sourceRate: 1.5 } });
activity('jump', 'Second jump discovery', 'starter', ['path'], 4, {
  kind: 'A',
  effect: { profile: { extraJumps: 1 } },
});
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
activity('starter-close', 'Pier outlook and village visit', 'starter', ['network', 'jump'], 10, { kind: 'E' });

activity('chalk-arrive', 'Chalk coast landing and cliff loop', 'chalk', ['starter-close'], 18);
fitting('C0', 'Kiln source works', 'C', 'chalk', ['chalk-arrive'], { W: 16 });
fitting('C1', 'Precast feet and outbound deck', 'R', 'chalk', ['C0'], { C: 12, W: 8 }, {}, false, 'chalk');
fitting('C2', 'Larger stock bays', 'F', 'chalk', ['C1'], { C: 8, W: 4 }, { profile: { rack: 24 } }, true);
fitting(
  'C3',
  'Dry apron and loading ramps',
  'C',
  'chalk',
  ['C1'],
  { C: 8, W: 4 },
  { profile: { carryDistance: 0.4 }, chore: 'platform detour' },
);
activity('chalk-puzzle', 'Find the upper kiln return', 'chalk', ['C3'], 16);
fitting(
  'C4',
  'Satellite resource depot',
  'M',
  'chalk',
  ['chalk-puzzle'],
  { C: 12, W: 8 },
  { profile: { carryDistance: 0.3 } },
);
fitting(
  'C5',
  'Workshop cutting bench',
  'C',
  'chalk',
  ['C4'],
  { C: 6, W: 4 },
  { profile: { pickupS: 0 }, chore: 'kit preparation' },
  true,
);
fitting('C6', 'High landing ledges', 'R', 'chalk', ['C1'], { C: 4, W: 4 }, {}, true);
activity('sledge', 'Shelter breach device and cut', 'chalk', ['C4'], 10, { kind: 'A' });
activity('chalk-close', 'Export the first support and walk its home consequence', 'chalk', ['sledge'], 14);
activity('chalk-side', 'Optional cliff interiors and shelter stories', 'chalk', ['C1'], 18, {
  optional: true,
  kind: 'E',
});

activity('steel-arrive', 'Harbour low dock and upper receiving point', 'steel', ['chalk-close'], 18);
fitting('S0', 'Steel source works', 'C', 'steel', ['steel-arrive'], { C: 8, W: 8 });
fitting('S2', 'Truss span kit', 'R', 'steel', ['S0'], { S: 12, W: 8 }, {}, false, 'steel');
fitting(
  'S3',
  'Overhead loading crane',
  'C',
  'steel',
  ['S2'],
  { S: 8, C: 4 },
  { profile: { unloadS: 0 }, chore: 'hand unloading' },
);
fitting('S1', 'Cylinder and freight chassis', 'F', 'steel', ['S3'], { S: 8, C: 4 }, { profile: { wagon: 32 } }, true);
fitting('S5', 'Tool heads', 'F', 'steel', ['S3'], { S: 4, W: 4 }, { profile: { sourceRate: 2 } }, true);
fitting('S6', 'Permanent hook return and catwalk', 'R', 'steel', ['S3'], { S: 4, W: 4 }, {}, true);
activity('steel-puzzle', 'Assemble the upper hoist and reroute the loaded cradle', 'steel', ['S3'], 18);
fitting('S4', 'Roundhouse and junction assembly', 'M', 'steel', ['steel-puzzle'], { S: 12, C: 8 });
activity('bell', 'Bell steps: combine known moves', 'steel', ['S4'], 12, { practice: 'jump/hook/glide' });
activity('steel-close', 'First useful cross-link and familiar freight ride', 'steel', ['bell'], 12);
activity('steel-side', 'Optional dry dock interiors and engine displays', 'steel', ['S2'], 18, {
  optional: true,
  kind: 'E',
});

activity('crystal-arrive', 'Approach the broken ring and descend to the lower camp', 'crystal', ['steel-close'], 18);
fitting('X0', 'Connected seed preparation', 'C', 'crystal', ['crystal-arrive'], { S: 8, W: 8 });
fitting('X1', 'Collared downward support', 'R', 'crystal', ['X0'], { X: 1, S: 4 }, {}, false, 'crystal');
activity('crystal-puzzle', 'Compare the collar, socket and exceptional gap', 'crystal', ['X1'], 20);
fitting(
  'X2',
  'Home work deck',
  'C',
  'crystal',
  ['crystal-puzzle'],
  { X: 1, C: 4 },
  { profile: { carryDistance: 0.2 }, chore: 'edge transfer detour' },
);
fitting('X3', 'Fixed crane collar', 'F', 'crystal', ['X2'], { X: 1, S: 4 }, { profile: { carry: 24 } }, true);
fitting('X4', 'High return landing', 'R', 'crystal', ['X1'], { X: 1, W: 4 }, {}, true);
activity('crystal-close', 'Use the supplied second support and return home', 'crystal', ['X2'], 18);
activity('observatory', 'Optional daytime lens room and horizon view', 'crystal', ['X1'], 15, {
  optional: true,
  kind: 'E',
});

activity('port-arrive', 'Walk the waterfront and compare two spur approaches', 'port', ['crystal-close'], 20);
fitting('U0', 'Copper source works', 'C', 'port', ['port-arrive'], { S: 8, W: 8 });
fitting(
  'U2',
  'Powered rack feed',
  'C',
  'port',
  ['U0'],
  { U: 8, S: 4 },
  { profile: { pickupS: 0 }, chore: 'magazine reload' },
);
fitting(
  'U1',
  'Motor and equipped corridor',
  'F',
  'port',
  ['U2'],
  { U: 8, S: 4 },
  { profile: { trainRate: 1.5 } },
  true,
);
fitting('U4', 'Workshop lift', 'R', 'port', ['U2'], { U: 8, C: 4 }, {}, true);
fitting(
  'U5',
  'Two-bay transfer equipment',
  'C',
  'port',
  ['U2'],
  { U: 8, W: 4 },
  { profile: { rack: 32 }, chore: 'shared bay contention' },
  true,
);
fitting(
  'U6',
  'Powered bulk-preparation attachment',
  'C',
  'port',
  ['U2', 'C5'],
  { U: 4, W: 4 },
  { profile: { sourceRate: 3 }, chore: 'bench operation' },
  true,
);
activity('port-puzzle', 'Fit the chosen spur through the inhabited district', 'port', ['U2'], 18);
fitting('U3', 'Spur control and service bay', 'M', 'port', ['port-puzzle', 'S4'], { U: 12, S: 8 });
activity('port-close', 'Take the changed district ride', 'port', ['U3'], 14);
activity('port-side', 'Optional upper workshop and waterfront rooms', 'port', ['U2'], 15, {
  optional: true,
  kind: 'E',
});

// Explicit extra experiments beyond the research catalogue; all optional and billed separately (here resource-free discoveries).
activity('jump-plus', 'Third jump device', 'chalk', ['C4'], 5, {
  optional: true,
  kind: 'A',
  effect: { profile: { extraJumps: 2 } },
});
activity('glide-plus', 'Faster glider fitting', 'steel', ['S4'], 5, {
  optional: true,
  kind: 'F',
  effect: { profile: { glideMps: 14 } },
});
activity('hook-long', 'Long hook reel', 'steel', ['S4'], 5, {
  optional: true,
  kind: 'F',
  effect: { profile: { hookM: 36 } },
});
activity('hook-type', 'Plate-target hook head (still a pull)', 'crystal', ['X2'], 5, {
  optional: true,
  kind: 'A',
  effect: { profile: { hooks: ['plate'] } },
});
const finalPaths: Path[] = [
  { id: 'final-walk', mode: 'walk', metres: 600, puzzleS: 360 },
  { id: 'final-jump', mode: 'walk', metres: 280, puzzleS: 180, needs: { extraJumps: 2 } },
  { id: 'final-glide', mode: 'glide', metres: 400, puzzleS: 120, needs: { glideMps: 14 } },
  { id: 'final-plate', mode: 'hook', metres: 140, puzzleS: 90, needs: { hookM: 36, hookType: 'plate' } },
];
activity('final-scout', 'Scout the original island approach', 'old-island', ['port-close'], 14, { paths: finalPaths });
fitting('return', 'Final return connection', 'R', 'old-island', ['final-scout'], { U: 4, S: 4, C: 4, X: 1 });
activity('landing', 'Original landing and lighthouse route', 'old-island', ['return'], 20);
activity('ending', 'Meet The Boogler; retain the revisitable ending', 'old-island', ['landing'], 10, { kind: 'E' });

export const fiveArea: Campaign = {
  id: 'five-area',
  name: 'Chalk → steel → crystal → port → original island',
  provenance: [
    'docs/research/upgrade-economy.md: catalogue and bills (proposed)',
    'docs/research/next-destinations.md: Arc A',
    'Opening bills: historical round4; all activity durations, routing, reserves and ability iterations guessed',
  ],
  ...tune,
  profile,
  sources: [
    ...homeSources,
    {
      id: 'cement',
      node: 'chalk',
      requires: ['C0'],
      raw: 'raw-C',
      good: 'C',
      reserve: tune.sourceReserve,
      seed: 4,
      batch: tune.batch,
      seconds: 60,
    },
    {
      id: 'steel',
      node: 'steel',
      requires: ['S0'],
      raw: 'raw-S',
      good: 'S',
      reserve: tune.sourceReserve,
      seed: 4,
      batch: tune.batch,
      seconds: 40,
    },
    {
      id: 'crystal',
      node: 'crystal',
      requires: ['X0'],
      raw: 'raw-X',
      good: 'X',
      reserve: tune.rareReserve,
      seed: 1,
      batch: 1,
      seconds: 240,
    },
    {
      id: 'copper',
      node: 'port',
      requires: ['U0'],
      raw: 'raw-U',
      good: 'U',
      reserve: tune.sourceReserve,
      seed: 4,
      batch: tune.batch,
      seconds: 30,
    },
  ],
  lines: [
    { id: 'chalk-line', from: 'home', to: 'chalk', requires: ['C0'] },
    { id: 'steel-line', from: 'chalk', to: 'steel', requires: ['S0'] },
    { id: 'crystal-line', from: 'steel', to: 'crystal', requires: ['X0'] },
    { id: 'port-line', from: 'steel', to: 'port', requires: ['U0'] },
    { id: 'roundhouse-link', from: 'home', to: 'steel', requires: ['S4'] },
    { id: 'port-spur', from: 'home', to: 'port', requires: ['U3'] },
  ].map(line),
  tasks,
  terminal: 'ending',
  scenarios,
};
