// The FNV-1a style fold every lockstep state hash uses: integers in, a uint32 out. Pure.
export const FNV_SEED = 2166136261;
export const fold = (h: number, v: number): number => Math.imul(h ^ v, 16777619) >>> 0;
export const foldAll = (h: number, values: readonly number[]): number => values.reduce(fold, h);
// A string: its char codes, then a separator so ['ab', 'c'] and ['a', 'bc'] differ.
export function foldStr(h: number, s: string): number {
  for (let k = 0; k < s.length; k++) h = fold(h, s.charCodeAt(k));
  return fold(h, 0x1f);
}
