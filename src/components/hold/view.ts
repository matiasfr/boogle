// Garage install and town purchase share a clamped hold, with an optional release drain. Local only.
export function advanceHold(value: number, dt: number, holding: boolean, seconds: number, drain = 0): number {
  return holding ? Math.min(1, value + dt / seconds) : drain > 0 ? Math.max(0, value - dt / drain) : 0;
}
