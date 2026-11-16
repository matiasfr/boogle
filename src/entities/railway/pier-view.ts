// The pier's Local payoff: pooled rockets only on the mounted Q6 completion edge. From v27 it also holds the pier's
// second track and Q7's deck (./ring-deck.ts), laid from the room's rows once Q7 starts. The show ends on a 2.5 s
// shared shot of the forge's pedestal only if the breaker still waits there, and the forge's call sounds as it lands
// (docs/plans/forge-call-handoff.md, step 1): a shared moment's rules, so every page that sees the edge live, the one
// highlighted skip, behind a reward card, none under reduced motion or on a reload.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import { createRingDeck } from './ring-deck.ts';
import { emit } from '../../render/particles.ts';
import { readableIntensity } from '../../render/readable-unlit.ts';
import { whistle } from '../../render/machine-sfx.ts';
import type { ShotShape } from '../../render/camera-pull-out.ts';
import { FORGE_CUT, forgeCut } from './forge-cut.ts';
import { holdForgeCall, soundForgeCall } from './forge-call.ts';

/** Seconds into the show: when the cut to the forge starts (the rockets and both whistles are seen from the pier
 * first), the longest the show holds the forge's call, and when the call sounds with no cut to carry it. */
export const PIER_CUT = { at: 3.5, hold: 30, bare: 3 } as const;

type Deps = {
  layout: typeof import('../../place/layout.ts');
  rail: typeof import('./rail-kit.ts');
  sounds: typeof import('../../render/fanfare.ts');
  adapter: RailwayAdapter;
  /** Line 2's track, whose old merge the relay retires. */
  track: { retire(on: boolean): number };
  /** A reward card has the screen: the show waits for it. */
  busy: () => boolean;
  /** The breaker stands cast on the pedestal (false where the Works aren't mounted: then no cut). */
  cast: () => boolean;
  /** The line's camera pull-out; false when no shot was queued (reduced motion, a vehicle's seat). */
  shot: (
    from: THREE.Vector3,
    to: THREE.Vector3,
    at: THREE.Vector3,
    seconds: number,
    drift: number,
    shape: ShotShape,
  ) => boolean;
  /** The camera is coming home from the forge cut: turn it toward the forge (line2-view.ts decides for whom). */
  handBack: () => void;
};
export function createRailwayPier(
  owner: OwnedView,
  { layout, rail, sounds, adapter, track, busy, cast, shot, handBack }: Deps,
) {
  const deck = createRingDeck(adapter, owner, track);
  // besideLine already includes ORIGIN, as in the other production rail views.
  const end = rail.besideLine(layout.LINKS[1]!.line, 739, 0);
  const at = { x: end.x, y: layout.railY(layout.LINKS[1]!.line, 739), z: end.z };
  const colours = ['#ffcc63', '#39e6c6', '#ff7272', '#b9a0ff'].map((c) => new THREE.Color(c));
  const trail = new THREE.Color('#ffe9b0');
  type Rocket = { t: number; x: number; y: number; z: number; height: number; size: number; colour: THREE.Color };
  const rockets: Rocket[] = [];
  let completed = false,
    show = -1,
    secondWhistle = false,
    shows = 0,
    waiting = false, // the edge came while a reward card had the screen
    // The forge's call and the cut for this show: 'held' until the cut is due, 'cut' once its shot is queued.
    call: 'none' | 'held' | 'cut' = 'none',
    cuts = 0;
  const v = (p: { x: number; y: number; z: number }) => new THREE.Vector3(p.x, p.y, p.z);
  const cue = () => {
    if (call === 'none') return;
    call = 'none';
    soundForgeCall();
  };
  function cutToForge() {
    // A friend may have taken it while the reward card or rockets held the show.
    if (!cast()) {
      cue();
      return;
    }
    const { pos, to, at } = forgeCut('breaker');
    holdForgeCall(PIER_CUT.hold);
    // The whole shot is the held end: it cuts in, drifts and cuts home; `onCut` is its first frame on screen.
    const queued = shot(v(pos), v(pos), v(at), FORGE_CUT.seconds, 0.01, {
      cutIn: true,
      back: FORGE_CUT.back,
      end: { pos: v(pos), to: v(to), at: v(at) },
      onCut: cue,
      onHome: () => {
        cue();
        handBack();
      },
    });
    if (queued) {
      call = 'cut';
      cuts++;
    } else cue();
  }
  function celebrate() {
    waiting = false;
    show = 0;
    secondWhistle = false;
    shows++;
    sounds.fanfare(true);
    whistle(at.x, at.z);
    barrage(at.x, at.y + 6, at.z, 10, 0.5, 36, 2.2);
    barrage(layout.VILLAGE.x + layout.ORIGIN.x, layout.VILLAGE.y, layout.VILLAGE.z + layout.ORIGIN.z, 5, 0.6, 26, 1.6);
  }
  function barrage(x: number, y: number, z: number, count: number, gap: number, spread: number, size: number) {
    for (let k = 0; k < count; k++)
      rockets.push({
        t: -k * gap,
        x: x + (Math.random() - 0.5) * spread,
        y,
        z: z + (Math.random() - 0.5) * spread,
        height: 24 + Math.random() * 16,
        size,
        colour: colours[Math.floor(Math.random() * colours.length)]!,
      });
  }
  owner.cleanup(() => {
    rockets.length = 0;
  });
  return {
    restore(done: boolean) {
      deck.restore();
      completed = done;
      show = -1;
      secondWhistle = false;
      waiting = false;
      cue();
      rockets.length = 0;
    },
    update(dt: number, done: boolean) {
      deck.update(dt);
      if (done && !completed) {
        waiting = true;
        // The breaker was cast at the boiler fit. Remind only a room that left it on the pedestal.
        if (cast()) {
          holdForgeCall(PIER_CUT.hold);
          call = 'held';
        }
      }
      if (waiting && done && !busy()) celebrate();
      if (!done && completed) {
        show = -1;
        waiting = false;
        cue();
        rockets.length = 0;
      }
      completed = done;
      if (show >= 0) {
        show += dt;
        if (!secondWhistle && show >= 1.4) {
          secondWhistle = true;
          whistle(at.x, at.z);
        }
        if (call === 'held' && show >= PIER_CUT.at) cutToForge();
        // The shot was dropped (a seat taken mid-shot): the call sounds anyway.
        if (call === 'cut' && show >= PIER_CUT.at + FORGE_CUT.seconds + 4) cue();
      }
      for (let k = rockets.length - 1; k >= 0; k--) {
        const r = rockets[k]!;
        r.t += dt;
        if (r.t < 0) continue;
        if (r.t >= 0.8) {
          for (let n = 0; n < Math.round(44 + r.size * 8); n++) {
            const a = Math.random() * Math.PI * 2,
              u = Math.random() * 2 - 1,
              radius = Math.sqrt(1 - u * u),
              speed = (10 + Math.random() * 3) * r.size;
            emit({
              x: r.x,
              y: r.y + r.height,
              z: r.z,
              vx: Math.cos(a) * radius * speed,
              vy: u * speed,
              vz: Math.sin(a) * radius * speed,
              life: 1.5 + Math.random() * 0.5,
              size: 0.55 * r.size,
              color: r.colour,
              intensity: readableIntensity(),
              gravity: 7,
              drag: 1.4,
              shrink: 0.4,
            });
          }
          rockets.splice(k, 1);
        } else
          emit({
            x: r.x,
            y: r.y + r.height * (1 - (1 - r.t / 0.8) ** 2),
            z: r.z,
            vx: 0,
            vy: -1,
            vz: 0,
            life: 0.5,
            size: 0.35 * r.size,
            color: trail,
            intensity: readableIntensity(),
            shrink: 0.5,
          });
      }
      if (show > 11 && !rockets.length) show = -1;
    },
    inspect: () => ({
      pier: { ...at, completed, rockets: rockets.length, show, shows, call, cuts },
      ...deck.inspect(),
    }),
  };
}
