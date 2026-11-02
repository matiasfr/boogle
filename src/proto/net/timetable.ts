// The wagon's timetable for ?proto=net. src/proto/wagon/ rebuilds its whole history at the room's current pace, so a
// change of pace jumps the wagon: a new cycle length puts the same tick somewhere else on the line, even while it
// stands at a stop. Here a change (a new section, a faster train) is added to the history instead, and takes over at the
// stop the wagon stands at or reaches next: it keeps its place in that dwell and leaves on the new timetable, so nobody
// riding is thrown off. Local: a tab that joins or reloads starts from the room's numbers at t0 = 0, so two tabs can
// run different phases (solo-first; the real timetable will want its own lockstep start tick).
import { wagonAt, type WagonPace, type WagonState } from '../../sim/wagon.ts';

type Seg = { from: number; laid: number; t0: number; pace: WagonPace };
const samePace = (a: WagonPace, b: WagonPace) => a.cruise === b.cruise && a.accel === b.accel;
const at = (s: Seg, tick: number) => wagonAt(s.laid, tick, s.t0, s.pace)!;

// The tick the stop it stands at at `t` began, or the next one it reaches.
function stopStart(s: Seg, t: number): number {
  let a = Math.ceil(t);
  if (at(s, a).stop >= 0) {
    while (at(s, a - 1).stop >= 0) a--;
  } else while (at(s, a).stop < 0) a++;
  return a;
}

// The start of the dwell at `stop` in a timetable, leaving in direction `leaves`.
function dwellPhase(laid: number, pace: WagonPace, stop: number, leaves: number): number {
  for (let p = 0; ; p++) {
    const w = wagonAt(laid, p, 0, pace)!;
    if (w.stop === stop && w.dir === leaves) return p;
  }
}

/** A timetable over `laid()` sections at `pace()`: call it with a tick, in order, to get the wagon there. */
export function createTimetable(laid: () => number, pace: () => WagonPace) {
  let segs: Seg[] = [];
  let sawNone = false; // this tab saw the line empty: the first section starts the wagon standing at the first stop
  return (tick: number): WagonState | null => {
    const n = laid(),
      p = pace();
    if (!n) {
      segs = [];
      sawNone = true;
      return null;
    }
    const last = segs[segs.length - 1];
    if (!last || n < last.laid) {
      segs = [{ from: -Infinity, laid: n, t0: sawNone ? Math.floor(tick) : 0, pace: p }]; // a start, or a start over
    } else if (n !== last.laid || !samePace(p, last.pace)) {
      const a = stopStart(last, Math.max(tick, last.from));
      const stop = at(last, a).stop;
      const arrived = at(last, a - 1).dir;
      const leaves = arrived > 0 ? (stop < n ? 1 : -1) : stop > 0 ? -1 : 1;
      segs.push({ from: a, laid: n, t0: a - dwellPhase(n, p, stop, leaves), pace: p });
      if (segs.length > 8) segs.shift();
    }
    for (let k = segs.length - 1; k >= 0; k--) if (tick >= segs[k]!.from) return at(segs[k]!, tick);
    return at(segs[0]!, tick);
  };
}
