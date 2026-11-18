// The boiler's show (docs/plans/cutscenes-for-everyone.md, "The boiler's show"; round-4 notes O18-5): on the live
// trains edge, every page's camera stands off the old train's loco as it wakes, three-quarters to its front, and drifts
// back and up through the wake (train-view.ts's rust, coughs, steam and lamps). When the breaker waits on the pedestal
// the shot then cuts to it at the forge (./forge-cut.ts), and comes home facing the forge. Pure, for
// tests; line2-view.ts plays it, boiler-view.ts starts it and claims the forge's call for it (createShowCall).
import { LINE2_OLD_TRAIN } from '../../sim/railway-line2-layout.ts';
import { FORGE_CUT, forgeCut } from './forge-cut.ts';

type Point = { x: number; y: number; z: number };
/** Seconds: the train's leg of the shot, and the longest the show holds the forge's call (behind a card, then the
 * shot, as Far Head's does). */
export const BOILER_SHOW = { train: 4.5, hold: 30 } as const;
/** Metres from the old loco's middle (the camp track runs straight east, the loco 3.7 m east of the train's mark):
 * where the camera stands as the wake starts, where it has drifted to by the leg's end, and what it looks at (the
 * chimney's top, where the wake's steam bursts). x is along the track (east, the loco's front), z beside it: north,
 * the hill's side, so the halt dropping in on the same edge stands behind the train. The plan's first numbers stood the
 * camera on the halt's platform (south), and its roof, sign and signal post dropped in across the foreground (looked
 * at, 18 November). The camera keeps `clear` m over the ground under it, the hill rising there. */
export const BOILER_VIEW = { from: [6, 2.6, -8], to: [9, 4.2, -11], at: [1.5, 2.6, 0], clear: 1.6 } as const;
const LOCO_X = 3.7;

/** The shot as `createCameraPullOut.play` takes it: from, drifting to, looking at over `drift` seconds; with `breaker`
 * the forge's cut follows (`end`) until `seconds`. It cuts in and cuts home (`back`): a friend may be a kilometre off,
 * and a blend that far is a smear. `ground` is the terrain height at a point (land.ts's H). */
export function boilerShot(ground: (x: number, z: number) => number, breaker: boolean) {
  const x = LINE2_OLD_TRAIN.x / 100 + LOCO_X,
    z = LINE2_OLD_TRAIN.z / 100,
    y = ground(x, z);
  const off = (o: readonly [number, number, number]): Point => ({ x: x + o[0], y: y + o[1], z: z + o[2] });
  const stand = (o: readonly [number, number, number]): Point => {
    const p = off(o);
    return { ...p, y: Math.max(p.y, ground(p.x, p.z) + BOILER_VIEW.clear) };
  };
  return {
    from: stand(BOILER_VIEW.from),
    to: stand(BOILER_VIEW.to),
    at: off(BOILER_VIEW.at),
    drift: BOILER_SHOW.train,
    seconds: BOILER_SHOW.train + (breaker ? FORGE_CUT.seconds : 0),
    end: breaker ? forgeCut('breaker') : null,
    back: FORGE_CUT.back,
  };
}

/** The forge's call as a show claims it (forge-call.ts's `holdForgeCall` and `soundForgeCall`, injected so this stays
 * pure): `claim` holds it for up to `seconds`, `cue` sounds it once (the cut, the hand-back, a dropped shot), and a
 * claim still held at its deadline lapses without a cue. forge-call.ts sounds a held call by itself as its hold runs out
 * and sounds it again on every later cue (the pier's reminder), so cueing then would sound it twice. `now` in seconds,
 * on forge-call.ts's clock. */
export function createShowCall(io: { hold(seconds: number): void; sound(): void; now(): number }) {
  let until = -1;
  function cue() {
    if (until < 0) return;
    until = -1;
    io.sound();
  }
  return {
    claim(seconds: number) {
      io.hold(seconds);
      until = io.now() + seconds;
    },
    cue,
    /** Each frame: `live` while the show is still queued or playing; a dropped one cues at once. */
    update(live: boolean) {
      if (until < 0) return;
      if (io.now() >= until) until = -1;
      else if (!live) cue();
    },
    held: () => until >= 0,
  };
}
