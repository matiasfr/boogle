// Human context only. Catalogue membership and build facts come from the generated build manifest.
export type AssetDescriptor = {
  label: string;
  defaultNode?: string;
  clipAsset?: string;
  expectedClips?: readonly string[];
  rootNote?: string;
};
export const descriptors: Record<string, AssetDescriptor> = {
  buddy: {
    label: 'Buddy',
    clipAsset: 'hero-clips',
    rootNote: 'Retargeted in-place clips; As played adds the real body blend and life layers.',
  },
  'hero-clips': {
    label: 'Buddy animation library',
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
  'place-kit': { label: 'Place kit' },
  'scaffold-kit': {
    label: 'Scaffold kit',
    defaultNode: 'plank',
    expectedClips: ['drop'],
    rootNote: 'Authored object translation in metres; drop animates each kit piece.',
  },
};
