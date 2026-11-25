export const NEAR_M = 6;
export const FAR_M = 30;

export function voiceGain(distance: number): number {
  const t = Math.max(0, Math.min(1, (distance - NEAR_M) / (FAR_M - NEAR_M)));
  return 1 - t * t * (3 - 2 * t);
}
