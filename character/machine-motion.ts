// Inspection input only: a measured-distance adapter uses the same production wheelAngle formula.
// One second parked, two accelerating, two cruising, two braking, two parked. Not game timing.
export const MACHINE_REVIEW_SECONDS = 9;
export function machineReviewDistance(time: number) {
  const cycles = Math.floor(time / MACHINE_REVIEW_SECONDS);
  const t = time - cycles * MACHINE_REVIEW_SECONDS;
  return (
    cycles * 4 +
    (t <= 1 ? 0 : t < 3 ? 0.25 * (t - 1) ** 2 : t < 5 ? t - 2 : t < 7 ? 3 + (t - 5) - 0.25 * (t - 5) ** 2 : 4)
  );
}
