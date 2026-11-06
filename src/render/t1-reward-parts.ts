// The existing first Place box and its authored conductor hat. No inventory or profile owner.
type RewardPart = [
  shape: 'b' | 'c' | 's' | 'k' | 'tube' | 'brim',
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  color: string,
  rx?: number,
];
/** The wake-time tool, unchanged from Place's ladder; eligibility belongs to accepted railway state. */
export const MULTI_AXE_REWARD = {
  key: 'multi',
  name: 'The multi-axe',
  line: 'Chops trees, breaks rocks, and more.',
  parts: [
    ['b', 0, 0.55, 0, 0.11, 1.3, 0.11, '#a9794c'],
    ['b', 0, 1.06, -0.2, 0.15, 0.34, 0.4, '#c9ced8'],
    ['k', 0, 1.06, 0.3, 0.09, 0.5, 0.09, '#8d929c', Math.PI / 2],
    ['b', 0, 1.06, 0, 0.17, 0.12, 0.17, '#39e6c6'],
  ] satisfies RewardPart[],
};
export const T1_REWARD = {
  id: 'hat' as const,
  slot: 'hat' as const,
  tier: 'common' as const,
  name: "A conductor's hat",
  line: 'Yours. It suits you.',
  parts: [
    ['brim', 0, 0.03, 0.06, 0.4, 0.05, 0.42, '#1b2a55'],
    ['tube', 0, 0.2, 0, 0.3, 0.3, 0.3, '#27386b'],
    ['tube', 0, 0.12, 0, 0.31, 0.08, 0.31, '#f2b134'],
    ['s', 0, 0.36, 0, 0.34, 0.1, 0.34, '#27386b'],
    ['s', 0, 0.2, 0.3, 0.06, 0.06, 0.03, '#f2b134'],
  ] satisfies RewardPart[],
};
export const T1_CRATE_PARTS: RewardPart[] = [
  ['b', 0, 0.5, 0, 1, 1, 1, '#b57f44'],
  ['b', 0, 0.5, 0, 1.04, 0.14, 1.04, '#c9a86a'],
  ['b', 0, 0.5, 0, 0.14, 1.04, 1.04, '#c9a86a'],
  ['b', 0, 0.5, 0, 1.04, 1.04, 0.14, '#c9a86a'],
  ['b', 0, 1.03, 0, 1.06, 0.06, 1.06, '#8a6236'],
  ['s', 0, 1.1, 0, 0.13, 0.1, 0.13, '#d8392b'],
  ['s', 0, 0.8, 0.53, 0.07, 0.07, 0.03, '#fff0c9'],
];
