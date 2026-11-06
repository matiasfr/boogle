// Exact authored reward data from Place gifts.ts, without importing its mutable campaign owner.
export const T2_REWARD = {
  id: 'scarf' as const,
  slot: 'accessory' as const,
  tier: 'common' as const,
  name: 'A very long scarf',
  line: 'Knitted by someone in the village, probably.',
  parts: [
    ['t', 0, 0.32, 0, 0.28, 0.22, 0.28, '#d8392b'],
    ['b', 0.14, 0.14, 0.26, 0.11, 0.42, 0.04, '#d8392b'],
    ['b', 0.14, 0.02, 0.26, 0.115, 0.06, 0.045, '#fff0c9'],
  ] satisfies ['t' | 'b', number, number, number, number, number, number, string][],
};
export const AXE_REWARD = { name: 'A proper axe', line: '' };
export const JUMP_REWARD = { name: 'A second jump', line: 'Jump again in the air.' };
