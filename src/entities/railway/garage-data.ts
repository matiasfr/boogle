// The train garage's catalogue and readout maths (docs/brainstorms/engine-garage.md), pure: no scene, DOM or clock.
// Local view data only: nothing here is sent, saved or read by the simulation. Speeds and times come from the
// railway's own leg maths (src/sim/railway-train.ts) so a number on the screen is the number the timetable gives.
import { trainLegTicks, TRAIN } from '../../sim/railway-train.ts';
import { LINE2, RAIL_LINES } from '../../sim/railway-lines.ts';
import { WORKS } from '../../sim/railway-works-layout.ts';
import { LINE2_KIT } from '../../sim/railway-line2-layout.ts';

// ---------------------------------------------------------------- categories
export type CatId = 'engine' | 'cars' | 'cargo' | 'looks' | 'whistle';
export type Group = 'fn' | 'cos';
/** The rail's two headed groups: what a part changes in what the train does, and what it only changes in look or
 * sound (brief, "Acting on the owner's notes" (c)). An entry is in one group only. */
export const CATS: readonly { id: CatId; name: string; group: Group }[] = [
  { id: 'engine', name: 'Engine', group: 'fn' },
  { id: 'cars', name: 'Cars', group: 'fn' },
  { id: 'cargo', name: 'Cargo', group: 'fn' },
  { id: 'looks', name: 'Looks', group: 'cos' },
  { id: 'whistle', name: 'Whistle', group: 'cos' },
];
export const GROUP_NAME: Record<Group, string> = { fn: 'Upgrades', cos: 'Looks and sounds' };

// ---------------------------------------------------------------- what the room has
/** The room's facts the garage reads (Local view of accepted state; nothing here writes any). */
export type RoomFacts = {
  /** The boiler is fitted: the trains run (`line2.trains`). */
  boilerFitted: boolean;
  /** The footing wagon is coupled to a line-2 train. */
  wagonCoupled: boolean;
  /** The shunter or the footing wagon is using the table (the roll-out): the garage waits ("The table's busy"). */
  tableBusy: boolean;
};

export type PartId = 'boiler' | 'long' | 'plough' | 'four' | 'kitcar' | 'wagon' | 'cradle' | 'roof' | 'toot' | 'two';
/** How big an install of this part is (brief, "Three sizes of install"): a tunable table, not three code paths. */
export type Size = 'small' | 'medium' | 'large';
export type Standing =
  /** Fitted to the room's train. */
  | 'installed'
  /** Came with an unlock and is on the train. */
  | 'free'
  /** Cannot be installed yet because the material is missing (the part still shows as a ghost to try on). */
  | 'steel'
  /** Not built yet: shown so the category reads true, with no picture of its own. */
  | 'later';
export type Part = {
  id: PartId;
  cat: CatId;
  name: string;
  desc: string;
  standing: Standing;
  /** The words on its tile (the brief's strings). */
  pill: string;
  size: Size;
  /** Whether "Try it" can put it on the works copy (a part with a model and a rule the first build can show). */
  tryable: boolean;
  /** The note under the title when the part costs nothing but a gate. */
  price?: string;
};

export function partsOf(room: RoomFacts): Part[] {
  return [
    {
      id: 'boiler',
      cat: 'engine',
      name: 'Boiler',
      desc: 'The first install. It woke the trains.',
      standing: 'installed',
      pill: 'Installed',
      size: 'large',
      tryable: false,
    },
    {
      id: 'long',
      cat: 'engine',
      name: 'Longer boiler',
      desc: 'A steel boiler, half a metre longer, with a taller chimney and a sand dome. It runs faster and pulls one more car.',
      standing: 'steel',
      pill: 'Needs steel',
      size: 'large',
      tryable: true,
      price: 'Free: the reward for reaching steel',
    },
    {
      id: 'plough',
      cat: 'engine',
      name: 'Plough and headlamp',
      desc: 'Not built yet.',
      standing: 'later',
      pill: 'Later',
      size: 'medium',
      tryable: false,
    },
    {
      id: 'four',
      cat: 'cars',
      name: 'Four seats',
      desc: 'The knifeboard passenger car: four riders and four pets.',
      standing: 'installed',
      pill: 'Installed',
      size: 'medium',
      tryable: false,
    },
    {
      id: 'kitcar',
      cat: 'cargo',
      name: 'Rail and kit car',
      desc: 'Stakes and boards. The forge fills it at Home: 32 rails and 32 logs a trip.',
      standing: 'installed',
      pill: 'Installed',
      size: 'medium',
      tryable: false,
    },
    room.wagonCoupled
      ? {
          id: 'wagon',
          cat: 'cargo',
          name: 'Footing wagon',
          desc: 'It rolled out of the stall when the kiln lit. 6 footings a trip, Quarry to Pier.',
          standing: 'free',
          pill: 'Free with the kiln',
          size: 'medium',
          tryable: false,
        }
      : {
          id: 'wagon',
          cat: 'cargo',
          name: 'Footing wagon',
          desc: 'It waits in the stall until the cradle is fitted and the table turns.',
          standing: 'later',
          pill: 'Waits in the stall',
          size: 'medium',
          tryable: false,
        },
    {
      id: 'cradle',
      cat: 'cargo',
      name: 'Bigger cradle',
      desc: 'Not built yet.',
      standing: 'later',
      pill: 'Later',
      size: 'medium',
      tryable: false,
    },
    {
      id: 'roof',
      cat: 'looks',
      name: 'Roof and lamps',
      desc: 'Built and switched off. It has no rule, so it is a look.',
      standing: 'later',
      pill: 'Later',
      size: 'small',
      tryable: false,
    },
    {
      id: 'toot',
      cat: 'whistle',
      name: 'Toot',
      desc: 'Today’s whistle.',
      standing: 'installed',
      pill: 'Installed',
      size: 'small',
      tryable: false,
    },
    {
      id: 'two',
      cat: 'whistle',
      name: 'Two-tone',
      desc: 'Not built yet.',
      standing: 'later',
      pill: 'Later',
      size: 'small',
      tryable: false,
    },
  ];
}

// ---------------------------------------------------------------- the line, speed and cars
/** Line 2 is the line the first build previews (it carries the cargo; the brief's examples are its). */
export const GARAGE_LINE = LINE2;
/** The engine's top speed in m/s (a line's `speed` is cm a tick; TRAIN.speed 200 is 20 m/s). */
export const speedMs = (cmPerTick: number) => cmPerTick / 10;
/** What each boiler sets (owner, 10 November: "certain boilers are faster but also raise the cap of the amount of
 * cars"): its top speed and how many cars the engine pulls. */
export const BOILERS = {
  boiler: { speed: 200, pulls: 3 },
  long: { speed: 250, pulls: 4 },
} as const;
export type BoilerId = keyof typeof BOILERS;
/** The line's run for the readouts: the Village stop to the line's last stop, in centimetres, or, until the island
 * halt is in the catalogue (generic-lines v26/v27), the brief's planned 1.2 km, which is the run the 10-second rule
 * and the per-minute numbers are about. */
export const PLANNED_RUN_CM = 120000;
export function lineRunCm(line = GARAGE_LINE): { cm: number; planned: boolean; end: string } {
  // As far as Ring Island: the greybox route's halts past it (a leg's) are not the garage's run yet.
  const halts = RAIL_LINES[line]!.halts.filter((h) => !h.leg && !h.shut);
  const real = halts.at(-1)!.s - halts[0]!.s;
  return real >= PLANNED_RUN_CM
    ? { cm: real, planned: false, end: halts.at(-1)!.name }
    : { cm: PLANNED_RUN_CM, planned: true, end: 'the island' };
}
/** Seconds for one nonstop run of `cm` from a stand at top speed `speed` (cm a tick), with the line's acceleration. */
export function runSeconds(cm: number, speed: number, accel: number = TRAIN.accel) {
  return trainLegTicks(cm, 0, { speed, accel }) / 10;
}
/** A round trip: two runs and three stands (the brief's throughput note). */
export const roundTripSeconds = (run: number) => 2 * run + (3 * TRAIN.dwellTicks) / 10;
/** Items a minute from `load` a trip, one train, to a tenth. */
export const perMinute = (load: number, run: number) => Math.round(((load * 60) / roundTripSeconds(run)) * 10) / 10;
/** Owner, 10 November: "A speed part is offered only where it saves about ten seconds a trip". */
export const SAVES_AT_LEAST_S = 10;
export const speedSaved = (cm: number, from: number, to: number) => runSeconds(cm, from) - runSeconds(cm, to);
export const speedOffered = (cm: number, from: number, to: number) => speedSaved(cm, from, to) >= SAVES_AT_LEAST_S;

// ---------------------------------------------------------------- readouts
/** One row. `now` and `then` are the same kind: a number (with `unit`), or car pips. */
export type Row = {
  id: string;
  label: string;
  kind: 'number' | 'pips' | 'text';
  now: number;
  then: number;
  /** Decimal places the count shows. */
  digits?: number;
  unit?: string;
  text?: string;
};
export const rowChanged = (r: Row) => r.kind !== 'text' && r.now !== r.then;

/** The rows a part shows, for the part chosen against what the category has now. Only rows the part changes carry a
 * preview (brief, call 37); a part that changes nothing shows what the category is today. */
export function rowsFor(cat: CatId, chosen: PartId): Row[] {
  const { cm } = lineRunCm();
  const end = lineRunCm().end;
  if (cat === 'engine') {
    const a = BOILERS.boiler,
      b = chosen === 'long' ? BOILERS.long : a;
    const runA = runSeconds(cm, a.speed),
      runB = runSeconds(cm, b.speed);
    const rows: Row[] = [
      { id: 'speed', label: 'Top speed', kind: 'number', now: speedMs(a.speed), then: speedMs(b.speed), unit: ' m/s' },
      { id: 'cars', label: 'Cars it pulls', kind: 'pips', now: a.pulls, then: b.pulls },
      {
        id: 'foot',
        label: `Footings to ${end} a minute`,
        kind: 'number',
        digits: 1,
        now: perMinute(WORKS.wagonCap, runA),
        then: perMinute(WORKS.wagonCap, runB),
      },
      {
        id: 'kit',
        label: 'Rails and logs a minute',
        kind: 'number',
        digits: 1,
        now: perMinute(LINE2_KIT.rails, runA),
        then: perMinute(LINE2_KIT.rails, runB),
      },
    ];
    return rows;
  }
  if (cat === 'cars') return [{ id: 'seats', label: 'Seats', kind: 'number', now: 4, then: 4 }];
  if (cat === 'cargo')
    return [
      { id: 'footTrip', label: 'Footings a trip', kind: 'number', now: WORKS.wagonCap, then: WORKS.wagonCap },
      { id: 'kitTrip', label: 'Rails a trip', kind: 'number', now: LINE2_KIT.rails, then: LINE2_KIT.rails },
    ];
  if (cat === 'looks')
    return [{ id: 'look', label: 'What it changes', kind: 'text', now: 0, then: 0, text: 'The look only' }];
  return [{ id: 'sound', label: 'Its sound', kind: 'text', now: 0, then: 0, text: 'Hear it' }];
}

// ---------------------------------------------------------------- the install moment (brief, "The install moment")
/** Milliseconds and sizes, one tunable table. `hold` is the press-and-hold that lifts the part; `hang` the pause above
 * its seat before the drop; `hitStop` the garage's own clock stopping at the hit; `shake` the camera's trauma of 1. */
export const SIZES = {
  small: { hold: 600, hang: 0, hitStop: 0, shake: 0, bolts: 0 },
  medium: { hold: 900, hang: 120, hitStop: 50, shake: 0.2, bolts: 2 },
  large: { hold: 1200, hang: 180, hitStop: 70, shake: 0.35, bolts: 4 },
} as const satisfies Record<Size, { hold: number; hang: number; hitStop: number; shake: number; bolts: number }>;
/** Times of the Large moment, ms since the commit (`c+0`). */
export const MOMENT = {
  quiet: 180, // c+180: the drop starts
  hit: 320, // c+320: the part meets the ghost
  settle: 390,
  bolts: 650, // c+650: the first bolt, and the numbers start landing
  boltEvery: 200,
  answer: 1450, // c+1450: the safety valve, the wheels run up
  whistle: 1800,
  rest: 4000,
  /** Try it rests this long, then comes off. */
  tryRest: 2500,
  /** And comes off again over this long. */
  undo: 1200,
  /** Each row starts counting this far after the one above, and counts for `count` ms. */
  rowGap: 150,
  count: 500,
  /** Released early, the ring drains back over this long. */
  drain: 250,
  /** The drop: 0.6 m over 140 ms. */
  drop: 140,
  hang: 0.6,
  /** A skip is offered from here (the game's one skip chip) and the hit can never be skipped. */
  skipFrom: 800,
} as const;

/** The hold's place along the lift (0 stand, 1 hanging over the seat): the ring's value, pushed back a little in the
 * last third so finishing is a small effort. */
export const liftOf = (ring: number) => {
  const r = Math.min(1, Math.max(0, ring));
  return r < 2 / 3 ? r * 1.12 : (2 / 3) * 1.12 + (r - 2 / 3) * 0.78;
};
/** Fast then slowing, 0 to 1. */
export const easeOut = (u: number) => 1 - (1 - Math.min(1, Math.max(0, u))) ** 3;
/** A row's number `u` (0..1) of the way from `now` to `then`, to its digits. */
export function countAt(now: number, then: number, u: number, digits = 0) {
  const v = now + (then - now) * easeOut(u);
  const k = 10 ** digits;
  return Math.round(v * k) / k;
}
/** Row `index`'s count progress `ms` after the commit: starts at `MOMENT.bolts + index * rowGap`. */
export const rowProgress = (ms: number, index: number) => (ms - MOMENT.bolts - index * MOMENT.rowGap) / MOMENT.count;

// ---------------------------------------------------------------- what a row shows through an install
/** Where the garage is in an install: idle, the hold lifting the part, the moment after the commit, the rest of a
 * Try it, and the part coming off again. */
export type Phase = 'idle' | 'holding' | 'moment' | 'rest' | 'undo';
/** What a row reads: its value, whether "old →" is still in front of it, and whether it is in the preview colour. */
export type Shown = { value: number; arrow: boolean; preview: boolean };
/** `ms` is since the commit during `moment`, since the part started coming off during `undo`. A row the part does not
 * change is always ink, with no arrow. */
export function shownRow(row: Row, index: number, phase: Phase, ms: number): Shown {
  if (!rowChanged(row)) return { value: row.then, arrow: false, preview: false };
  const digits = row.digits ?? 0;
  if (phase === 'moment') {
    const u = rowProgress(ms, index);
    if (u <= 0) return { value: row.then, arrow: true, preview: true };
    return { value: countAt(row.now, row.then, u, digits), arrow: false, preview: true };
  }
  if (phase === 'rest') return { value: row.then, arrow: false, preview: true };
  if (phase === 'undo') {
    const u = ms / 300;
    if (u >= 1) return { value: row.then, arrow: true, preview: true };
    return { value: countAt(row.then, row.now, u, digits), arrow: false, preview: true };
  }
  return { value: row.then, arrow: true, preview: true };
}
