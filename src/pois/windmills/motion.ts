// Shared production sail motion. The stage supplies its Local clock; the game supplies sharedSeconds.
export const sailAngle = (t: number, phase = 0) => 0.55 * t + 0.35 * Math.sin(t * 0.05 + phase) + phase;
export const sailSpeed = (t: number, phase = 0) => 0.55 + 0.35 * 0.05 * Math.cos(t * 0.05 + phase);
export function sailCycleSeconds() {
  let t = 0;
  for (let i = 0; i < 8; i++) t += (Math.PI * 2 - sailAngle(t)) / sailSpeed(t);
  return t;
}
