export function continuous(previous: number, epoch: number, distance: number, speed: number, dt: number) {
  return previous === epoch && dt > 0 && speed > 0.05 && distance <= speed * dt + 0.5;
}
export function cupStroll() {
  const sunk = new Set<number>();
  return (cup: number) => {
    sunk.add(cup);
    if (sunk.size < 3) return false;
    sunk.clear();
    return true;
  };
}
export function cheerSite(cheer: (x: number, z: number, radius: number, duration: number) => void) {
  let last = -Infinity;
  return (now: number, x: number, z: number) => {
    if (now - last < 3000) return;
    last = now;
    cheer(x, z, 16, 1.4);
  };
}
