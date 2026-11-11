// The garage's two seams (docs/brainstorms/engine-garage.md, first build). Local view only: nothing here is sent, saved
// or read by the simulation.
//  1. `roomFacts`: the ONE place the garage reads railway state, from the adapter's `inspect()`
//     (src/adapters/railway.ts: `line2.trains`, `trains[].wagon`, `shed.ready`). When the railway moves onto the ECS,
//     re-point this function and nothing else in the garage changes.
//  2. `garage`: the handle the world half (garage-view.ts) registers and the screen half (src/features/garage.ts) drives.
import type { RailwayAdapter } from '../../adapters/railway.ts';
import type { CatId, Phase, PartId, RoomFacts } from './garage-data.ts';

export function roomFacts(state: ReturnType<RailwayAdapter['inspect']>): RoomFacts {
  const wagonCoupled = state.trains.some((r) => r.wagon);
  return {
    boilerFitted: state.line2.trains,
    wagonCoupled,
    // The roll-out owns the table from the commission until the wagon has coupled.
    tableBusy: state.shed.ready >= 0 && !wagonCoupled,
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
