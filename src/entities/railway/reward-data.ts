import { cosmetic } from '../../render/cosmetic-parts.ts';

// T2's scarf is the cosmetics catalog's own entry: one copy of its name, line and shape.
export const T2_REWARD = cosmetic('scarf')!;
export const AXE_REWARD = { name: 'A proper axe', line: '' };
export const PACK_REWARD = { name: 'A pack frame', line: '' };
export const JUMP_REWARD = { name: 'A second jump', line: 'Jump again in the air.' };
export const HOOK_REWARD = {
  name: 'The hook shot',
  line: 'Pull yourself to a ring.',
  // What you wear for it, held up as you take it: a brass spool and teal hook for the forearm (Place's tech.ts).
  parts: [
    ['c', 0, 0, 0, 0.26, 0.5, 0.26, '#c79a3e'],
    ['c', 0, 0, 0, 0.3, 0.12, 0.3, '#39e6c6'],
    ['k', 0, 0.42, 0, 0.12, 0.34, 0.12, '#39e6c6'],
  ] satisfies ['c' | 'k', number, number, number, number, number, number, string][],
};
