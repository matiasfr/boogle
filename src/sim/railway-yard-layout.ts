// The halt yards' catalog (docs/plans/halt-yard.md, step 1): one low timber bay a halt site, where anyone leaves logs,
// stone and rails and anyone picks them up, never capped. A row's index is its `HaltYard` slot. Centres are world cm
// beside the foot of the halt's back ramp (the plan's "Where: four bays"); `opens` is the stretch whose laying opens
// it (`line` 1 a `Job` slot, 2 a `QJob` slot), none for the Village, whose yard is the recovery rack (RECOVERY_RACK)
// and is always open. Rules in ./railway-sys-yard.ts, facts in ./railway-queries-yard.ts.
import { RECOVERY_RACK } from './railway-supply.ts';

export type HaltYardId = 'village' | 'camp' | 'quarry' | 'farhead';
export type HaltYardSpec = {
  readonly id: HaltYardId;
  readonly x: number;
  readonly z: number;
  readonly opens?: { readonly line: 1 | 2; readonly slot: number };
};
export const HALT_YARDS: readonly HaltYardSpec[] = [
  { id: 'village', x: RECOVERY_RACK.x, z: RECOVERY_RACK.z },
  // Camp opens with T3 laid; Quarry with Q3 laid (it lays s 122 to 178, the halt at s 174); Far Head with Q5 laid.
  { id: 'camp', x: 101360, z: -13810, opens: { line: 1, slot: 2 } },
  { id: 'quarry', x: 107670, z: 5140, opens: { line: 2, slot: 2 } },
  { id: 'farhead', x: 136430, z: -15460, opens: { line: 2, slot: 4 } },
];
/** Both ops are judged within this of a yard's centre (cm): the bay's half length plus a prompt reach. */
export const HALT_YARD_REACH = 420;
/** The Village's row: its logs and stone are the recovery rack's own (`Rail.rack`, `Rail.stoneRack`). */
export const VILLAGE_YARD = 0;

if (
  HALT_YARDS.length !== 4 ||
  HALT_YARDS[VILLAGE_YARD]!.id !== 'village' ||
  HALT_YARDS[VILLAGE_YARD]!.opens ||
  HALT_YARDS.some(
    (y, k) =>
      !Number.isSafeInteger(y.x) ||
      !Number.isSafeInteger(y.z) ||
      (k > 0 && (!y.opens || !Number.isSafeInteger(y.opens.slot) || y.opens.slot < 0)),
  )
)
  throw new Error('railway: halt yards catalog');
