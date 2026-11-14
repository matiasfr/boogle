// Carry graces own their clocks; this is the one ordered maintenance pass used by both stepping paths.
import type { RailwayApi } from '../../../src/world/railway-server.ts';
import type { RailTuneApi } from '../../../src/world/rules/tune.ts';
import type { RailwayPosition } from './railway-supply.ts';

export function createHostMaintenance({
  api,
  railTune,
  now,
  positions,
  active,
  maintainSupply,
}: {
  api: RailwayApi;
  railTune: RailTuneApi;
  now: () => number;
  positions: () => (RailwayPosition | null)[];
  active: (pid: string) => boolean;
  maintainSupply: () => void;
}) {
  // The unique beam stays with its carrier through an absence (a hidden tab, a reload, a lost link, a restart): while
  // they are here it follows where they stand (once a second, from presence); a carrier who comes back within
  // `railBeamGraceS` still carries it (railSession moves it to their new session); one who stays away longer has it
  // put down where they last stood (owner, 6 November: you keep your load, or it goes down where you stood).
  /** Metres to whole centimetres, never -0 (Math.round gives -0 just south of zero, and the ECS int schema refuses it). */
  const cm = (m: number) => Math.round(m * 100) || 0;
  const graceMs = () => railTune.get('railBeamGraceS') * 1000;
  /** One carried load: remember where its present carrier stands; put it down once they have been away the grace. */
  const carried = (
    load: () => { state: string; holder?: string },
    stood: (pid: string, x: number, y: number, z: number) => void,
    putDown: (pid: string) => void,
  ) => {
    let away: number | null = null;
    let stoodAt = -Infinity;
    return {
      maintain() {
        const { state, holder } = load();
        if (state !== 'held' || holder === undefined) return void (away = null);
        const t = now();
        if (active(holder)) {
          away = null;
          if (t - stoodAt < 1000) return;
          stoodAt = t;
          const p = positions().find((row) => row?.pid === holder && row.y !== undefined && t - row.at <= 2000);
          // Presence is the body's centre in metres; the load lies at the feet.
          if (p) stood(holder, cm(p.x), cm(p.y!) - 45, cm(p.z));
          return;
        }
        away ??= t;
        if (t - away >= graceMs()) {
          putDown(holder);
          away = null;
        }
      },
      /** The grace runs from the carrier's departure, not from when maintenance next notices it. */
      departed(pid: string) {
        const { state, holder } = load();
        if (state === 'held' && holder === pid) away = now();
      },
    };
  };
  const beamCarry = carried(
    () => api.beam(),
    (pid, x, y, z) => void api.beamStood(pid, x, y, z),
    (pid) => void api.beamPutDown(pid),
  );
  // The hauled boiler follows the same rule on its own clock (docs/plans/boiler-first-choice.md, Part 3).
  const boilerCarry = carried(
    () => api.boiler(),
    (pid, x, y, z) => void api.boilerStood(pid, x, y, z),
    (pid) => void api.boilerPutDown(pid),
  );
  /** Loads held per account: a holder keeps theirs through the grace, then it is released. */
  const held = (
    holders: () => readonly { pid: string; epoch: number }[],
    release: (pid: string, epoch: number) => void,
  ) => {
    const away = new Map<string, number>();
    return {
      maintain() {
        const list = holders();
        for (const pid of away.keys()) if (!list.some((h) => h.pid === pid)) away.delete(pid);
        for (const { pid, epoch } of list) {
          if (active(pid)) {
            away.delete(pid);
            continue;
          }
          const since = away.get(pid) ?? now();
          away.set(pid, since);
          if (now() - since >= graceMs()) {
            release(pid, epoch);
            away.delete(pid);
          }
        }
      },
      departed(pid: string) {
        if (holders().some((h) => h.pid === pid)) away.set(pid, now());
      },
    };
  };
  // A footing works the same way: its carrier keeps it through the grace, then it goes back to the Works rack (the
  // kiln casts exactly the sixteen the sites need, so one held by a leaver would stall the crossing for good).
  const footCarry = held(
    () => api.footHolders(),
    (pid, epoch) => void api.footRelease(pid, epoch),
  );
  // A greybox leg's rack units on a leaver's back (the step 3 review's P2-2): each account's lifted count is state, so
  // through the grace its units stay counted held for the leg's frame; past it the release takes off that account's
  // own units only (the leg loads them again), and a released account is no holder, so a leaver never stalls the leg.
  const legCarry = held(
    () => api.legKitHolders(),
    (pid, epoch) => void api.legKitRelease(pid, epoch),
  );
  /** On rule ticks only, not 60 times a second; the order is part of the rules. */
  const maintain = () => {
    maintainSupply();
    beamCarry.maintain();
    boilerCarry.maintain();
    footCarry.maintain();
    legCarry.maintain();
  };

  return {
    maintain,
    departed(pid: string) {
      for (const carry of [beamCarry, boilerCarry, footCarry, legCarry]) carry.departed(pid);
    },
  };
}
