// The garage's two seams (docs/brainstorms/engine-garage.md, first build). Local view only: nothing here is sent, saved
// or read by the simulation.
//  1. `roomFacts`: the ONE place the garage reads railway state, from the rows (`adapter.read.world()`: the
//     `line2Trains` query, the train rows' `wagon`, the shed's `ready`).
//  2. `garage`: the handle the world half (garage-view.ts) registers and the screen half (src/features/garage.ts) drives.
import { shed, trains, type ReadWorld } from '../../sim/railway-rows.ts';
import { line2Trains } from '../../sim/railway-queries-line2.ts';
import type { CatId, Phase, PartId, RoomFacts } from './garage-data.ts';

export function roomFacts(w: ReadWorld): RoomFacts {
  const wagonCoupled = trains(w).some((r) => r.wagon);
  return {
    boilerFitted: line2Trains(w),
    wagonCoupled,
    // The roll-out owns the table from the commission until the wagon has coupled.
    tableBusy: shed(w).ready >= 0 && !wagonCoupled,
  };
}

export type GarageSnap = {
  open: boolean;
  cat: CatId;
  sel: PartId;
  phase: Phase;
  /** The hold's ring, 0..1. */
  ring: number;
  /** Ms since the commit (`moment`, `rest`) or since the part started coming off (`undo`). */
  ms: number;
  /** A part is on the works copy for a Try it. */
  trying: boolean;
  /** Interact now skips (from c+800 until rest). */
  canSkip: boolean;
  /** The last tap that was too short, for the button's pulse. */
  tapped: number;
  facts: RoomFacts;
};

export type GarageApi = {
  isOpen(): boolean;
  open(): void;
  close(): void;
  snap(): GarageSnap;
  choose(cat: CatId, part?: PartId): void;
  /** A press began on Install / Try it (Interact held, the button held). */
  holdStart(): void;
  holdEnd(): void;
  skip(): void;
  /** Plays the whistle on the works copy (the Whistle category's readout). */
  hear(): void;
};

export const garage: { api: GarageApi | null } = { api: null };
