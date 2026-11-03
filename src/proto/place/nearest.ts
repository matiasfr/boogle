// Local spatial queries shared by the objective and the playthrough bot. Keep list order to break equal-distance ties.
type Point = { x: number; z: number };

export function nearest<T extends Point>(list: readonly T[], from: Point, ok: (item: T) => boolean): T | null {
  let best: T | null = null,
    distance = Infinity;
  for (const item of list) {
    if (!ok(item)) continue;
    const d = Math.hypot(from.x - item.x, from.z - item.z);
    if (d < distance) {
      distance = d;
      best = item;
    }
  }
  return best;
}
