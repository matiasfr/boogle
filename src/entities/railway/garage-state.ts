// The garage's two seams (docs/brainstorms/engine-garage.md, first build).
//  1. `roomFacts`: the ONE place the garage reads railway state, from the rows (`adapter.read.world()`: the
//     `line2Trains` query, the train rows' `wagon`, the shed's `ready`, `steel` and table copy, each line's `boiler`
//     and `rev`, the table's hold at the room's tick). Local view of accepted state.
//  2. `garage`: the handle the world half (garage-view.ts) registers and the screen half (src/features/garage.ts) drives.
// Nothing here is sent or saved, and the simulation reads none of it.
import { leg, line, shed, trains, type ReadWorld } from '../../sim/railway-rows.ts';
import { line2Trains } from '../../sim/railway-queries-line2.ts';
import { LINE2, RAIL_LINES, legBuilt } from '../../sim/railway-lines.ts';
import { tableFree, upgradePool } from '../../sim/railway-queries-works.ts';
import { RAIL_LEGS, TRADE_LINES } from '../../sim/railway-route.ts';
import { SERVED_LEGS, tradeOpen, tradeSwapRefusal } from '../../sim/railway-queries-route.ts';
import type { CatId, LineFacts, Phase, PartId, RoomFacts } from './garage-data.ts';

/** The garage step 4 readout's test (plan, "The garage screen"): a built leg whose kit `line`'s own trains carry has
 * two sections or more still to lay, so a Strong train there loads two sections' kit and holds at the railhead. */
function kitTrip(w: ReadWorld, l: number) {
  return SERVED_LEGS[l]!.some(
    (k) => RAIL_LEGS[k]!.line === l && legBuilt(k) && RAIL_LEGS[k]!.sections.length - leg(w, k).laid >= 2,
  );
}
/** The chips: line 2, then each trade line once its trade is open (the server refuses a bring before). */
function linesOf(w: ReadWorld): LineFacts[] {
  return [LINE2, ...TRADE_LINES.filter((l) => tradeOpen(w, l))].map((l) => ({
    line: l,
    name: RAIL_LINES[l]!.name,
    row: line(w, l).boiler,
    rev: line(w, l).rev,
    swapRefusal: l === LINE2 ? undefined : tradeSwapRefusal(w, l, line(w, l).rev),
    kitTrip: l !== LINE2 && kitTrip(w, l),
  }));
}

/** The garage's facts as a frame reads them. The table's hold is judged on the action tick (`read.tick()`), the clock
 * the garage's install and bring are sent on: whole, never going backwards between whole states (it is re-seated once
 * when one lands, after a lost link), and capped at two ticks (LEAD_STEPS) past the newest server step heard. So the
 * screen offers Install at most two ticks before the server's hold ends; the hold itself (600 to 1200 ms) is sent
 * after it, so the install reaches a free table unless the page stalls. If the server refuses one anyway, `deny`
 * lowers the part with the deny sound and the hold can be made again at once. Only the re-seat after a lost link can
 * turn the offer back off, once, when the room stood still meanwhile (intended: the server still holds the table).
 * Not `tickNow()`: the movers' RTT-compensated time can run further ahead of the room and step back at any frame
 * (garage step 4's Checkpoint, "the early Install"). */
export const garageFacts = (read: { world(): ReadWorld; tick(): number }) => roomFacts(read.world(), read.tick());

/** `tick` is the room's action tick (see `garageFacts`), for the table's hold after a bring or an install. */
export function roomFacts(w: ReadWorld, tick = Infinity): RoomFacts {
  const wagonCoupled = trains(w).some((r) => r.wagon);
  const boiler = line(w, LINE2).boiler;
  return {
    boilerFitted: line2Trains(w),
    upgradeReady: shed(w).fitted >= 0 && shed(w).table === 1,
    wagonCoupled,
    // The roll-out owns the table from the commission until the wagon has coupled.
    tableBusy: shed(w).ready >= 0 && !wagonCoupled,
    steelHome: shed(w).steel >= 1,
    // A screen counts the pool (every store of steel); a store's stack shows only what lies there.
    steel: upgradePool(w),
    longFitted: boiler >= 2,
    boilerRev: boiler,
    installRev: line(w, LINE2).rev,
    gorgeReached: leg(w, 0).laid >= RAIL_LEGS[0]!.sections.length,
    tableLine: shed(w).tableLine,
    bringRev: shed(w).bringRev,
    held: tick < tableFree(w, 0),
    lines: linesOf(w),
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
  /** The selected install is ready here: its gate, shared pool and table are available. */
  canInstall: boolean;
  /** Interact now skips (from c+800 until rest). */
  canSkip: boolean;
  /** Garage step 4: a bring this tab sent waits for its answer (the chips dim). */
  bringing: boolean;
  /** The table line's row before the install that is playing (a trade fit's rows count from it). */
  fromRow: number;
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
  /** Garage step 4: a chip pressed, bringing `line`'s copy to the table (`rail.bring`), when the table is free. */
  bring(line: number): void;
};

export const garage: { api: GarageApi | null } = { api: null };
