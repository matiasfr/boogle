// One away credit and its persisted timestamp. Paused time is never accidentally stamped as hosted time.
import { railAwayCredit, RAIL_AWAY } from '../../../src/sim/railway-away.ts';
import type { RailwayApi } from '../../../src/world/railway-server.ts';

export function createHostAway(api: RailwayApi, now: () => number) {
  // The 100 ms marker at which the room stopped simulating, or null while it runs. A save while paused is stamped
  // with it, so neither a reload nor a crash counts the paused time as hosted.
  let awayMarker: number | null = null;
  let savedAt = now();
  let savedTick = 0;
  // The one away credit for the time since awayMarker; consumed once (railResume's marker), never read from a client.
  function credit() {
    if (awayMarker === null) return false;
    const marker = Math.floor(now() / 100);
    const away = Math.max(0, marker - awayMarker);
    awayMarker = null;
    if (away <= 0) return false;
    // api.resume caps the job's ticks at what the funded job has left: a whole absence finishes it.
    api.resume(away >= RAIL_AWAY.finishTicks ? Number.MAX_SAFE_INTEGER : away, marker, railAwayCredit(away));
    return true;
  }

  return {
    credit,
    read(doc: { updatedAt: string; tick: number }) {
      savedAt = Date.parse(doc.updatedAt);
      savedTick = doc.tick;
      if (!Number.isFinite(savedAt) || savedAt > now() || !Number.isSafeInteger(savedTick) || savedTick < 0)
        throw new Error('invalid railway recovery timestamp/tick');
    },
    restore(tick: number) {
      awayMarker = Math.min(
        Math.floor(now() / 100),
        Math.max(Math.floor(savedAt / 100), api.resumeMarker()) + (tick - savedTick),
      );
    },
    pause() {
      awayMarker = Math.floor(now() / 100);
    },
    updatedAt(startup: boolean) {
      // Until startup has applied the offline catch-up, a save must not claim the absent time as passed.
      const updatedAt = startup
        ? Math.max(savedAt, api.resumeMarker() * 100)
        : awayMarker !== null
          ? awayMarker * 100
          : now();
      return updatedAt;
    },
  };
}
export type HostAway = ReturnType<typeof createHostAway>;
