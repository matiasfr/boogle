// What a recent return asks of the room's accepted state (./arrival.ts; docs/game-design/first-run.md, "Returning
// visit"): whether a catalogue halt stands now, and the halt the train you are on is running to. Local reads only.
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import { RAIL_LINES, RAIL_TRAINS, RAIL_HALTS, haltPlatform } from '../../sim/railway-lines.ts';
import { runningLine, trainStops } from '../../sim/railway-queries-trains.ts';
import { rail, train as trainRow } from '../../sim/railway-rows.ts';
import { TRAIN_PHASE } from '../../sim/railway-train.ts';
import { roomWorks } from '../../sim/railway-queries-room.ts';
import { ringOpen } from '../../sim/railway-queries.ts';
import { haltHead } from '../../sim/railway-queries-route.ts';
import { haltLandings } from '../../place/return-spot.ts';
import { consistOf, roleIndex } from './cars.ts';

export type ReturnHalts = {
  running(): boolean;
  friends(): { standing: ReturnType<typeof haltLandings>; works: { x: number; z: number } };
  passengerDecks(line: number, stop: number): string[];
  /** Halt `stop` of catalogue line `line` is open in this room (a line's open stops are a prefix of its halts). */
  stands(line: number, stop: number): boolean;
  /** `<line id>:<stop>` of the halt the train whose deck is `platform` is running to (standing: where it stands);
   * undefined off a train, or while it runs to a signal. */
  next(platform: string | undefined): string | undefined;
};

/** Halt `stop` of catalogue line `line` takes players with `open` stops open on that line: it has opened, and it has
 * not closed behind the railhead (`closesAt`: a passed stack head stays in the line's stops, but its platform and
 * lever are gone; ./halts-view.ts). */
export function haltStands(line: number, stop: number, open: number) {
  const halt = RAIL_LINES[line]?.halts[stop];
  return !!halt && stop >= 0 && stop < open && !(halt.closesAt !== undefined && open >= halt.closesAt);
}

export function createReturnHalts(world: RailwayAdapter['read']['world']): ReturnHalts {
  return {
    running: () => rail(world()).trains >= 0,
    friends() {
      const w = world();
      const works = roomWorks(w).at;
      const open = RAIL_LINES.map((_, line) => trainStops(w, line).length);
      const standing = haltLandings((h, line, stop) => {
        if (!haltStands(line, stop, open[line]!)) return [];
        if (!h.heads) return h.platforms;
        const index = RAIL_HALTS.findIndex((at) => at.line === line && at.stop === stop);
        const head = haltHead(w, index, ringOpen(w).head);
        return [haltPlatform(h, 1, head), haltPlatform(h, -1, head, stop === open[line]! - 1)];
      });
      return { standing, works: { x: works.x / 100, z: works.z / 100 } };
    },
    passengerDecks(line, stop) {
      const w = world();
      return RAIL_TRAINS.flatMap((train, slot) => {
        const row = trainRow(w, slot);
        if (row.phase !== TRAIN_PHASE.STAND || row.at !== stop || runningLine(w, slot) !== line) return [];
        const car = roleIndex(consistOf({ line: train.line, wagon: false, steel: false }), 'player');
        return [`railway:train${slot}-${car}`];
      });
    },
    stands(line, stop) {
      try {
        return haltStands(line, stop, trainStops(world(), line).length);
      } catch {
        return false; // no accepted state yet: nothing is known to stand
      }
    },
    next(platform) {
      const slot = Number(/^railway:train(\d+)-/.exec(platform ?? '')?.[1] ?? NaN);
      if (!RAIL_TRAINS[slot]) return undefined;
      try {
        // Return destinations use the running line's halt indices.
        const line = RAIL_LINES[runningLine(world(), slot)]!;
        const to = trainRow(world(), slot).to;
        return to >= 0 && to < line.halts.length ? `${line.id}:${to}` : undefined;
      } catch {
        return undefined;
      }
    },
  };
}
