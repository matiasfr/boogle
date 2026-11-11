// Human context only. Catalogue membership and build facts come from the generated build manifest.
export type Motion =
  | { kind: 'none'; source: string }
  | { kind: 'clips'; source: string }
  | { kind: 'chop'; source: string }
  | { kind: 'rail-wheels'; source: string }
  | { kind: 'attachment'; bone: string; node: string; asset: string; source: string }
  | { kind: 'spin'; axis: 'z'; node: string; source: string };
export type AssetDescriptor = {
  label: string;
  category: string;
  defaultNode?: string;
  clipAsset?: string;
  expectedClips?: readonly string[];
  rootNote?: string;
  motion: Motion;
};
// Local Buddy inspection targets; the geometry and attachment transforms remain production-owned.
export const gearAttachments: Record<string, Extract<Motion, { kind: 'attachment' }>> = {
  'railway-hat': {
    kind: 'attachment',
    bone: 'Head',
    node: 'wear_place_hat',
    asset: 'buddy',
    source: 'src/render/t1-reward-parts.ts and head-clearance.ts: earned railway hat',
  },
  'ring-left': {
    kind: 'attachment',
    bone: 'calf_l',
    node: 'wear_ankle_l',
    asset: 'buddy',
    source: 'src/render/gear-models.ts',
  },
  'ring-right': {
    kind: 'attachment',
    bone: 'calf_r',
    node: 'wear_ankle_r',
    asset: 'buddy',
    source: 'src/render/gear-models.ts',
  },
  spool: {
    kind: 'attachment',
    bone: 'lowerarm_r',
    node: 'wear_spool',
    asset: 'buddy',
    source: 'src/render/gear-models.ts',
  },
  glider: {
    kind: 'attachment',
    bone: 'spine_02',
    node: 'wear_glider',
    asset: 'buddy',
    source: 'src/render/gear-models.ts',
  },
  frame: {
    kind: 'attachment',
    bone: 'spine_02',
    node: 'wear_frame',
    asset: 'buddy',
    source: 'src/render/gear-models.ts',
  },
};
export const descriptors: Record<string, AssetDescriptor> = {
  'boiler-cart': {
    label: 'Boiler, saddle and cart',
    category: 'kit',
    defaultNode: 'boiler',
    rootNote: 'Rigid shells; game pivots and cargo positions unchanged. Train wheels/rods remain game-owned.',
    motion: { kind: 'none', source: 'assets/src/boiler-cart.py; rigid assembly motion belongs to Place' },
  },
  engine: {
    label: 'Train engine A',
    category: 'kit',
    defaultNode: 'engine_body',
    rootNote:
      'Car origin: rail line, frame middle. Wheels are the kit batch; rods, doors and the driver are posed by train-view.ts.',
    motion: {
      kind: 'none',
      source: 'assets/src/engine.py; rods follow the wheel angle and doors swing in src/entities/railway/train-view.ts',
    },
  },
  'passenger-car': {
    label: 'Passenger car (knifeboard)',
    category: 'kit',
    defaultNode: 'car_fit',
    rootNote:
      'Flatbed origin: rail line, deck middle (deck top 0.7 m). car_upgrade (roof, lamps) is built but switched off. Seats are registered by train-view.ts.',
    motion: { kind: 'none', source: 'assets/src/passenger-car.py; rigid fittings on the flatbed, no motion' },
  },
  'recovery-rack': {
    label: 'Recovery rack',
    category: 'props',
    rootNote: 'Owner-preferred reference-guided rack; base-centre origin. Unplaced; slice 2 owns stock and placement.',
    motion: { kind: 'none', source: 'assets/src/recovery-rack.py' },
  },
  'track-layer': {
    label: 'Track-layer shell',
    category: 'props',
    motion: {
      kind: 'rail-wheels',
      source:
        'machine-model.ts: signed distance/radius; machine-panels.ts: rigid gantry cycle off the rail stack; stage uses labelled inspection travel, a receding L1 seat and 2.866667 s cycle',
    },
    rootNote:
      'Working deck origin; rear power unit at Z -3.7 m. Existing game seats, cargo and moving fork added by Place.',
  },
  'track-wing': {
    label: 'Track-layer wing',
    category: 'props',
    motion: {
      kind: 'rail-wheels',
      source:
        'machine-wing.ts: the arm, truck and up-stack platform follow wingState(gap); stage sweeps the gap folded to open to folded over 12 s and runs the same panel cycle as the machine; shown beside the track-layer shell',
    },
    rootNote:
      "Post-foot origin on the up track (+x outboard, +z ahead); the stage sets it at the shell's rig frame, 1.2 m ahead of the deck centre. Moving parts are separate nodes; the hinge sits on the shell's header end.",
  },
  'feeder-roller': {
    motion: { kind: 'none', source: 'src/place/look-kit.ts: stationKit static roller matrices' },
    label: 'Feeder roller trial',
    category: 'props',
    rootNote: 'Z axle pivot; 20% length revision. Original 0.86 m span retained in trial evidence.',
  },
  'conductor-cap': {
    motion: {
      kind: 'attachment',
      bone: 'Head',
      node: 'wear_head_conductor',
      asset: 'buddy',
      source: 'character/buddy-preview.ts: Head.attach',
    },
    label: 'Conductor cap trial',
    category: 'props',
    rootNote:
      'Rigid Head attachment. Inspect worn via Buddy → Hat → Conductor trial; origin is Head rest [0, 1.12, 0].',
  },
  buddy: {
    motion: { kind: 'clips', source: 'src/player/buddy/rig.ts and assets/built/hero-clips.glb' },
    label: 'Buddy',
    category: 'characters',
    clipAsset: 'hero-clips',
    rootNote: 'Retargeted in-place clips; As played adds the real body blend and life layers.',
  },
  'hero-clips': {
    motion: { kind: 'clips', source: 'assets/built/hero-clips.glb' },
    label: 'Buddy animation library',
    category: 'characters',
    expectedClips: [
      'Idle_Loop',
      'Walk_Loop',
      'Jog_Fwd_Loop',
      'Sprint_Loop',
      'Jump_Start',
      'Jump_Loop',
      'Jump_Land',
      'Swim_Idle_Loop',
      'Swim_Fwd_Loop',
      'Driving_Loop',
    ],
    rootNote:
      'Authored library supplied without root motion. Inspect its source skeleton; camera motion is not root travel.',
  },
  'place-kit': {
    label: 'Place kit',
    category: 'kit',
    motion: { kind: 'none', source: 'Static kit; assembly motion belongs to game owners' },
  },
  'scaffold-kit': {
    motion: { kind: 'clips', source: 'assets/built/scaffold-kit.glb' },
    label: 'Scaffold kit',
    category: 'kit',
    defaultNode: 'plank',
    expectedClips: ['drop'],
    rootNote: 'Authored object translation in metres; drop animates each kit piece.',
  },
};
