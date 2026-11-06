// Local correction toward the current authority, never part of a train save.
export function createTrainNudge() {
  let remaining = 0;
  return {
    set(distance: number) {
      remaining = distance;
    },
    clear() {
      remaining = 0;
    },
    step(dt: number, authority: boolean) {
      if (authority) remaining = 0;
      if (Math.abs(remaining) < 0.01) return 0;
      const distance = remaining * Math.min(1, dt * 1.5);
      remaining -= distance;
      return distance;
    },
  };
}
