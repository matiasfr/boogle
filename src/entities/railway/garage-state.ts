// The garage's two seams (docs/brainstorms/engine-garage.md, first build).
//  1. `roomFacts`: the ONE place the garage reads railway state, from the rows (`adapter.read.world()`: the
//     `line2Trains` query, the train rows' `wagon`, the shed's `ready` and `steel`, line 2's `boiler`).
//     Local view of accepted state.
//  2. `garage`: the handle the world half (garage-view.ts) registers and the screen half (src/features/garage.ts) drives.
// Nothing here is sent or saved, and the simulation reads none of it.
import { line, shed, trains, type ReadWorld } from '../../sim/railway-rows.ts';
import { line2Trains } from '../../sim/railway-queries-line2.ts';
import { LINE2 } from '../../sim/railway-lines.ts';
import type { CatId, Phase, PartId, RoomFacts } from './garage-data.ts';

export function roomFacts(w: ReadWorld): RoomFacts {
  const wagonCoupled = trains(w).some((r) => r.wagon);
  const boiler = line(w, LINE2).boiler;
  return {
    boilerFitted: line2Trains(w),
    wagonCoupled,
    // The roll-out owns the table from the commission until the wagon has coupled.
    tableBusy: shed(w).ready >= 0 && !wagonCoupled,
    steelHome: shed(w).steel >= 1,
    steel: shed(w).steel,
    longFitted: boiler >= 1,
    boilerRev: boiler,
  };
}

export type GarageSnap = {
  open: boolean;
  cat: CatId;
  sel: PartId;
  phase: Phase;
  /** The hold's ring, 0..1. */
  ring: number;
  /** Ms since the commit (`moment`). */
  ms: number;

  /** The hold's press is down (false while the ring drains: let go, or the part lowering after a refusal). */
  held: boolean;
  /** This moment is this tab's own install: its camera and Back are held until it ends. A moment that is not
   * `mine` is someone else's install, watched: nothing is taken. */
  mine: boolean;
  /** An install is in the air or playing: sent to the server by this tab, or someone's accepted one, watched. */
  real: boolean;
  /** The part hangs over its seat waiting for the server's answer. */
  waiting: boolean;
  /** The Longer boiler can be installed from here now (steel home, not fitted, the post inside the server's reach). */
  canInstall: boolean;
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
  /** A press began on Install (Interact held, the button held). Nothing happens unless the part can be installed. */
  holdStart(): void;
  holdEnd(): void;
  skip(): void;
  /** Plays the whistle on the works copy (the Whistle category's readout). */
  hear(): void;
};

export const garage: { api: GarageApi | null } = { api: null };
