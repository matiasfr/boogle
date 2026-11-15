// The forge's call: something waits on the pedestal by the forge. A tall pale steam plume while it waits, and a
// whistle that carries across the island on the frame it appears (docs/reviews/home-flow.md findings 2 and 3).
// The boiler and Split-rock's breaker share it. Local: it follows accepted state only, a live edge whistles and a
// restore never does. The whistle is the hand-off's cue (docs/plans/forge-call-handoff.md): a completion show holds it
// until its cut to the forge, and it repeats, at most three times, while the thing still waits.
//
// The plume is its own instanced mesh of puffs, not the shared particle pool: at the pier the pool turns over about
// 440 particles a second, so a 10 s puff from the forge is recycled within 2 s and the column never reached the sky
// (measured 9 November, `railway-works-at.ts` `worksprobe=1`). One draw, no shadows.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { material } from '../../render/materials.ts';
import { whistle } from '../../render/machine-sfx.ts';
import { camera } from '../../render/scene.ts';
import { me } from '../../player/player.ts';
import { reducedMotion } from '../../constants.ts';

/** Metres: the call reaches the pier's end and Far Head (about 600 m). */
export const FORGE_CALL_HEAR = 900;
/** Puffs in the column (and in the thicker one a repeat call leaves), the seconds one takes to rise, and the column's
 * height and lean (metres). */
const PLUME = { puffs: 22, thick: 33, rise: 11, height: 62, lean: 8 } as const;
/** The repeat call (docs/plans/forge-call-handoff.md, step 5, as the design review changed it): while the thing still
 * waits, the whistle sounds again this many seconds after the first, three times at most, and the first repeat
 * thickens the plume. Never while you stand within `quiet` m of the pedestal. Local: a reload replays none. */
export const FORGE_RECALL = { every: 90, most: 3, quiet: 30 } as const;
/** Seconds a live call waits for a show to claim it before it sounds on its own (the views update in no fixed order). */
const CLAIM_S = 0.25;

// The hand-off (step 1): a completion show that will cut to the forge holds the call, so its whistle sounds at the
// cut's start, in the clear, and not under the show's own two whistles. `holdForgeCall` is the show's claim (with the
// longest it may hold), `soundForgeCall` its cue; a call nobody claims sounds CLAIM_S after its edge. `forgeCue.count`
// goes up as each call sounds: the hoist (part-hoist.ts) lifts the part on it.
export const forgeCue = { count: 0 };
let holdUntil = 0,
  released = 0;
const nowS = () => performance.now() / 1000;
/** A show claims the calls of this moment for up to `seconds`. */
export function holdForgeCall(seconds: number) {
  holdUntil = nowS() + seconds;
}
/** The show's cue: held calls sound on their next frame. */
export function soundForgeCall() {
  holdUntil = 0;
  released = nowS();
}
/** A call is held by a show right now (a show asks before it cuts to the forge). */
export const forgeCallHeld = () => nowS() < holdUntil;

/** Metres of clear air a puff keeps from your view of Buddy: nearer, it parts (shrinks away) so a glide down the
 * column toward the boiler isn't flown blind (glider piece B, Proof 4: 11 s of a 28 s first flight inside it). */
const PART_M = 3;

/** `at` is where the plume rises; `near` the pedestal the thing waits on (the plume's own foot when left out). */
export function createForgeCall(
  at: { x: number; y: number; z: number },
  owner: OwnedView,
  near: { x: number; z: number } = at,
) {
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const puffs = new THREE.InstancedMesh(geometry, material('stone', { colour: '#f7f5f0' }), PLUME.thick);
  geometry.dispose();
  puffs.frustumCulled = false;
  puffs.castShadow = false;
  puffs.count = 0;
  owner.add(puffs);
  const m = new THREE.Matrix4(),
    p = new THREE.Vector3(),
    q = new THREE.Quaternion(),
    s = new THREE.Vector3(),
    eye = new THREE.Vector3(),
    you = new THREE.Vector3(),
    line = new THREE.Line3(eye, you),
    closest = new THREE.Vector3();
  let waiting: boolean | null = null,
    clock = 0,
    // Seconds the plume has been rising: a new call grows its column from the pedestal up, it doesn't appear whole.
    shown = 0,
    // A live call not yet sounded: the second it appeared (-1 none). Its plume starts as it sounds.
    due = -1,
    // Seconds since a live call sounded (-1: restored, or none), repeats made, and whether the plume has thickened.
    since = -1,
    recalls = 0,
    thick = false;
  function sound() {
    whistle(at.x, at.z, FORGE_CALL_HEAR);
    forgeCue.count++;
  }
  function draw(dt: number) {
    clock += dt * (reducedMotion ? 0.3 : 1);
    shown = waiting && due < 0 ? shown + dt : 0;
    let n = 0;
    const count = thick ? PLUME.thick : PLUME.puffs;
    // The sight line from the camera to Buddy: puffs on it part, so the steam never hides you or swallows the view.
    camera.getWorldPosition(eye);
    if (me.body) you.set(me.body.position.x, me.body.position.y, me.body.position.z);
    else you.copy(eye);
    for (let i = 0; i < count; i++) {
      const age = (clock + (i / count) * PLUME.rise) % PLUME.rise;
      // Puffs older than the column itself are not out yet.
      if (!waiting || due >= 0 || age > shown) continue;
      const u = age / PLUME.rise;
      // Fast off the pedestal, slowing and swelling as it climbs; it swells in at the bottom and thins out at the top.
      const up = 1 - (1 - u) * (1 - u);
      const r = (1.2 + u * 6) * Math.min(1, u * 8) * Math.min(1, (1 - u) * 3.5);
      p.set(
        at.x + up * PLUME.lean + Math.sin(i * 2.1 + clock * 0.7) * 0.5 * u,
        at.y + 2 + up * PLUME.height,
        at.z + Math.cos(i * 1.7 + clock * 0.5) * 0.5 * u,
      );
      // With no body the sight line has no length (its closest point is NaN): nothing to part, draw the puff whole.
      const k = me.body
        ? Math.min(1, Math.max(0, (line.closestPointToPoint(p, true, closest).distanceTo(p) - r) / PART_M))
        : 1;
      if (k <= 0) continue;
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, i * 1.3);
      puffs.setMatrixAt(n++, m.compose(p, q, s.set(r * k, r * 0.85 * k, r * k)));
    }
    puffs.count = n;
    puffs.instanceMatrix.needsUpdate = true;
  }
  return {
    /** Snap to the state without a whistle (first frame, reload, late join, resync): a waiting call shows whole. */
    restore(now: boolean) {
      waiting = now;
      shown = now ? PLUME.rise : 0;
      due = since = -1;
      recalls = 0;
      thick = false;
    },
    update(dt: number, now: boolean) {
      if (waiting === null) {
        waiting = now;
        shown = now ? PLUME.rise : 0;
      }
      if (now && !waiting) {
        due = nowS();
        recalls = 0;
        thick = false;
      }
      if (!now) due = since = -1;
      waiting = now;
      // Sounds once no show holds it: at the show's cue, or CLAIM_S after the edge when nobody claimed it.
      if (due >= 0 && !forgeCallHeld() && (released >= due || nowS() - due >= CLAIM_S)) {
        due = -1;
        since = 0;
        sound();
      }
      if (since >= 0) {
        since += dt;
        if (recalls < FORGE_RECALL.most && since >= FORGE_RECALL.every * (recalls + 1)) {
          recalls++;
          // Someone already at the pedestal isn't called: the turn is spent, not put off.
          const p = me.body?.position;
          if (!p || Math.hypot(p.x - near.x, p.z - near.z) > FORGE_RECALL.quiet) {
            sound();
            thick = true;
          }
        }
      }
      draw(dt);
    },
    get waiting() {
      return !!waiting;
    },
    inspect: () => ({ waiting: !!waiting, sounded: due < 0 && since >= 0, recalls, thick, puffs: puffs.count }),
  };
}
