// Human context only. Catalogue membership and build facts come from the generated build manifest.
export type AssetDescriptor = {
  label: string;
  category: string;
  defaultNode?: string;
  clipAsset?: string;
  expectedClips?: readonly string[];
  rootNote?: string;
};
export const descriptors: Record<string, AssetDescriptor> = {
  'feeder-roller': {
    label: 'Feeder roller trial',
    category: 'props',
    rootNote: 'Z axle pivot; 20% length revision. Original 0.86 m span retained in trial evidence.',
  },
  'conductor-cap': {
    label: 'Conductor cap trial',
    category: 'props',
    rootNote:
      'Rigid Head attachment. Inspect worn via Buddy → Hat → Conductor trial; origin is Head rest [0, 1.12, 0].',
  },
  buddy: {
    label: 'Buddy',
    category: 'characters',
    clipAsset: 'hero-clips',
    rootNote: 'Retargeted in-place clips; As played adds the real body blend and life layers.',
  },
  'hero-clips': {
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
  'place-kit': { label: 'Place kit', category: 'kit' },
  'scaffold-kit': {
    label: 'Scaffold kit',
    category: 'kit',
    defaultNode: 'plank',
    expectedClips: ['drop'],
    rootNote: 'Authored object translation in metres; drop animates each kit piece.',
  },
};
