import type { standWhenClear } from '../railway/frame-occupied.ts';
import type { instantiate } from '../../prefab/instantiate.ts';

/** Stand each placement as a unit. Retry only those still held by a player. */
export function massingClearance(stand: typeof standWhenClear) {
  type Record = Pick<ReturnType<typeof instantiate>, 'solids' | 'setEnabled'>;
  const waiting = new Set<Record>();
  function tryStand(record: Record) {
    return stand(record.solids, () => record.setEnabled(true));
  }
  return {
    add(record: Record) {
      if (!tryStand(record)) waiting.add(record);
    },
    update() {
      for (const record of waiting) if (tryStand(record)) waiting.delete(record);
      return waiting.size === 0;
    },
    get clear() {
      return waiting.size === 0;
    },
  };
}
