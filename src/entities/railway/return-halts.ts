// What a recent return asks of the room's accepted state (./arrival.ts; docs/game-design/first-run.md, "Returning
// visit"): whether a catalogue halt stands now, and the halt the train you are on is running to. Local reads only.
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import { RAIL_LINES, RAIL_TRAINS } from '../../sim/railway-lines.ts';
import { trainStops } from '../../sim/railway-queries-trains.ts';
import { train as trainRow } from '../../sim/railway-rows.ts';

export type ReturnHalts = {
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
    stands(line, stop) {
      try {
        return haltStands(line, stop, trainStops(world(), line).length);
      } catch {
        return false; // no accepted state yet: nothing is known to stand
      }
    },
    next(platform) {
      const slot = Number(/^railway:train(\d+)-/.exec(platform ?? '')?.[1] ?? NaN);
      const line = RAIL_LINES[RAIL_TRAINS[slot]?.line ?? -1];
      if (!line) return undefined;
      try {
        const to = trainRow(world(), slot).to;
        return to >= 0 && to < line.halts.length ? `${line.id}:${to}` : undefined;
      } catch {
        return undefined;
      }
    },
  };
}
