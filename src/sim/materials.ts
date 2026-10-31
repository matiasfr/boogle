// The material of each age: one kind on your back at a time, swapped when the age changes (brief 7, loop A; SETTLED:
// real names for now). A material's index is its kind `k` in every lockstep table (piles, stacks, sites); append only.
export const MATERIALS = ['logs', 'ore', 'ingots', 'sacks', 'charge', 'parts', 'magnets'];
export const okKind = (k: unknown): k is number =>
  typeof k === 'number' && Number.isSafeInteger(k) && k >= 0 && k < MATERIALS.length;
// The material each age is built from (age 0 is wood: logs).
export const materialOf = (age: number): number => Math.min(age, MATERIALS.length - 1);
