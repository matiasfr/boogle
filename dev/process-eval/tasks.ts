// The process eval's tasks (./README.md): merged commits small enough to rebuild in one sitting, each with unit tests
// that fail on the commit before it and pass on it (`npm run process-eval -- verify`). `ask` is what the builder is
// told, worded as the owner or a finding would; the cli adds what the hidden tests import and check.
export type Task = {
  id: string;
  /** The merged (reference) commit on main. Its parent is the base a run starts from. */
  commit: string;
  kind: 'lockstep' | 'net' | 'view' | 'placement' | 'feature' | 'render' | 'tooling';
  ask: string;
};

export const tasks: Task[] = [
  {
    id: 'railhead-haul',
    commit: '2d33690ac',
    kind: 'lockstep',
    ask: "Build step 1 of docs/plans/railhead-traveller.md: the railhead traveller's pose as a pure function of the haul's inputs and the rule clock, in a new src/sim/railway-ring-haul.ts with no row fields or live callers yet. A replan stamped at an integer centimetre must keep the pose exactly.",
  },
  {
    id: 'ring-end-crossover',
    commit: '975090d4d',
    kind: 'lockstep',
    ask: "Ring Island's line needs an end (docs/plans/ring-island-build1.md, R1b layout): buffers 15 m past the halt's platforms and a crossover before them that the long train (8.2 m ahead, 12.7 m behind) clears. Add it to the ring layout catalog and to the level report in dev/level/ring.ts.",
  },
  {
    id: 'adapter-disposed-memo',
    commit: '4fb0465cd',
    kind: 'net',
    ask: "Review finding on the railway adapter's frame memo (ECS migration M1, P3): after dispose() the adapter keeps answering ready from the memo, in the same frame and in later ones. A disposed adapter must never serve the memo. Keep inspect() one frozen object while nothing it shows has changed, with its cache key evaluated once a frame.",
  },
  {
    id: 'trains-stay-drawn',
    commit: '99dee40ca',
    kind: 'view',
    ask: 'P2 from a review: with a full pending window (a burst of presses on a slow link) every train vanishes until an answer comes back, because the train view hides the cars whenever the adapter is not ready. Hide them only until the first whole state is in, and keep them drawn after that.',
  },
  {
    id: 'interior-draw-radius',
    commit: 'd63b45982',
    kind: 'view',
    ask: 'Owner, 14 November: one draw radius for every room interior, chosen for the look and not by what a room costs. Interiors draw within 48 m of their door (it covers door to door across the green), with a metre of slack so a camera on the line does not toggle them every frame, and not from as near behind the building.',
  },
  {
    id: 'hall-posts-off-shelf',
    commit: '16e8f4ac4',
    kind: 'placement',
    ask: "Owner playtest, 14 November: two of the Home hall's front posts stand 5 cm off the curio shelf's crown and read as running through it. Clear the front posts off the shelf, by more than a player's width at either end; the back keeps its five posts.",
  },
  {
    id: 'curio-frames-set-back',
    commit: '4a513a825',
    kind: 'placement',
    ask: "The curio shelf and the finders' bay beside the Home hall are placed by their frames' nominal boxes, not the crowns that are drawn, so the pair sits wrong against the hall's front edge. Measure both frames by their drawn crowns and set the pair 15 cm further back; the town plan and the Home station layout stay in agreement.",
  },
  {
    id: 'welcome-back-track',
    commit: '61af0985b',
    kind: 'feature',
    ask: 'The welcome back card says what changed while you were away. In the railway room it should name the stretches of track laid since your last visit, on both lines; a room that started over or a malformed memory names none.',
  },
  {
    id: 'detail-governor',
    commit: '12c639f8c',
    kind: 'render',
    ask: "Grant's 14 November session on a high-refresh display: frames at p50 6.2 ms and p95 8 ms, yet the Detail governor kept changing resolution and detail. It must not hunt or shed while frames still fit the 60 Hz budget, must still shed when they do not, and a Detail switch must not drop the shadow pipelines.",
  },
  {
    id: 'firefox-wgsl-check',
    commit: 'f04fe90aa',
    kind: 'tooling',
    ask: 'Firefox refused two shader modules on 10 November: its WGSL compiler rejects calls such as mix() or smoothstep() whose arguments are all literals. Add a look-harness check (dev/look/wgsl-portability.ts) that flags those calls in generated WGSL and reports the offending module while still creating it, fix the two materials it finds, and hold audio levels without cancelAndHoldAtTime, which Firefox lacks.',
  },
];
