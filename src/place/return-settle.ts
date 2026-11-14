// Local. Whether this load still has a recent return to place (docs/plans/resume-where-you-were.md, step 5). The
// answer is needed before the railway view exists: src/features/return-cover.ts reads the stored record at boot and
// keeps the loading cover up and this tab's pose unpublished while it is pending; src/entities/railway/arrival.ts
// ends it when the body stands where it will stay (or there is nothing to return to).
import { readReturnSpot, type ReturnSpot } from './return-spot.ts';
import { readReturnMinutes } from './return-tuning.ts';

export const returnKey = (room: string, pid: string) => `boogle.railway-pose.v1:${room}:${pid}`;
/** This browser's record for the room, if it is inside the return window. `had`: a record of any age was stored. */
export function storedReturn(
  storage: Pick<Storage, 'getItem'>,
  key: string,
  now: number,
): { spot: ReturnSpot | null; had: boolean } {
  try {
    const text = storage.getItem(key);
    const value: unknown = JSON.parse(text ?? 'null');
    return { spot: readReturnSpot(value, now, readReturnMinutes(storage) * 60000), had: text !== null };
  } catch {
    return { spot: null, had: false };
  }
}

const LIMIT_MS = 20000; // nobody stays unpublished for ever: a room that never answers stops pending
let pending: boolean | null = null;
let asked = 0;
let check = () => false;
export const returnSettle = {
  /** The boot-time reader of the record: asked once, the first time anything wants to know. */
  source(fn: () => boolean) {
    check = fn;
  },
  pending(now = performance.now()) {
    if (pending === null) {
      pending = check();
      asked = now;
    }
    if (pending && now - asked > LIMIT_MS) pending = false;
    return pending;
  },
  done() {
    pending = false;
  },
};
