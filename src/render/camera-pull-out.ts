// Place's celebration pull-out, with an owned lifetime and one highlighted skip.
// Local only: the ordinary follow camera continues underneath, ready for the return blend.
import * as THREE from 'three/webgpu';
import './camera-pull-out.css';
import { cam, camConstraints, camForward, me } from '../player/player.ts';
import { inputState } from '../player/input-state.ts';
import { skipInput } from '../player/dismiss-pointer.ts';
import { glyph } from '../player/glyphs.ts';
import { reducedMotion } from '../constants.ts';
import { clamp, smoothstep } from '../math-pure.ts';
import { holdCamera } from './buddy-frame.ts';
import { craneAim } from './crane-aim.ts';
import { camera } from './scene.ts';

// Owner, 9 November: "the cinematic should be uninterruptible unless by maybe a specific highlighted button press".
// Nothing ends a shot by accident; Interact skips it once its glyph has shown this long. null takes the skip out.
const SKIP_AFTER_S: number | null = 0.8;
/** Where a crane keeps Buddy on screen: a little below the middle, clear of the title above it. */
const CRANE_NDC_Y = -0.17;
const BACK_S = 0.55; // the blend home at the end of a shot

// One chip for every pull-out: Interact's glyph, ringed, with a skip mark. On touch the Grab button lights instead.
let chip: HTMLElement | null = null;
let chipOwner: object | null = null;
function showSkip(owner: object, on: boolean) {
  if (!on && chipOwner !== owner) return;
  chipOwner = on ? owner : null;
  document.body.classList.toggle('shot-skip', on);
  if (!on) return chip?.classList.remove('on');
  if (!chip) {
    chip = document.createElement('div');
    chip.className = 'shot-skip-chip';
    (document.querySelector('.hud') ?? document.body).append(chip);
  }
  const html = `${glyph('interact')}<i>▸▸</i>`;
  if (chip.innerHTML !== html) chip.innerHTML = html;
  chip.classList.toggle('on', !!glyph('interact'));
}

/** Optional shaping of one shot: `lead` seconds held at `from` before the travel starts, `atFrom` where it looks until
 * then (it eases to `at` over the travel), `back` the hand-back blend (a tiny one is a deliberate cut), `end` a cut to a
 * held position and look the moment the travel ends, `cutIn` opens on `from` at once instead of blending in from the
 * follow camera (which can pass through geometry between the player and the shot). */
export type ShotShape = {
  lead?: number;
  atFrom?: THREE.Vector3;
  back?: number;
  cutIn?: boolean;
  end?: { pos: THREE.Vector3; at: THREE.Vector3 };
};
type Shot = {
  from: THREE.Vector3;
  to: THREE.Vector3;
  at: THREE.Vector3;
  seconds: number;
  drift: number;
  lead: number;
  atFrom: THREE.Vector3 | null;
  back: number;
  cutIn: boolean;
  end: { pos: THREE.Vector3; at: THREE.Vector3 } | null;
  /** A crane (`crane()`): rises by `lift` over the live follow camera and back, easing in and out over `blend` seconds,
   * looking so that Buddy stays at CRANE_NDC_Y on screen. It starts and ends at the follow camera: no cut. */
  lift?: THREE.Vector3;
  blend?: number;
};
export function createCameraPullOut(busy = () => false, behindBuddy = false, seated = () => false) {
  const inSeat = () => inputState.seated || seated();
  const listeners = new AbortController();
  const self = {};
  let shot: Shot | null = null,
    pending: Shot | null = null,
    t = 0,
    weight = 0,
    cut = 1,
    returned = false;
  const forward = new THREE.Vector3(),
    aim = new THREE.Vector3(),
    position = new THREE.Vector3(),
    target = new THREE.Vector3(),
    chest = new THREE.Vector3(),
    want = new THREE.Vector3();
  const ease = (u: number) => smoothstep(0, 1, u);
  const cancel = () => {
    pending = null;
    cut = Math.min(cut, 0.999);
  };
  const inS = () => (shot?.cutIn ? 0 : (shot?.blend ?? 0.8)),
    outS = () => shot?.blend ?? shot?.back ?? BACK_S;
  const skipping = () => SKIP_AFTER_S !== null && !!shot && cut === 1 && t >= SKIP_AFTER_S && t < shot.seconds - outS();
  const skip = () => {
    if (!skipping()) return;
    // Behind Buddy at once, so the short blend home lands where the full shot would have.
    if (behindBuddy && !returned) cam.yaw = me.yaw;
    returned = true;
    cancel();
  };
  const input = skipInput(skipping, skip, listeners.signal);
  const constraint: (typeof camConstraints)[number] = (look, pos) => {
    if (!shot || weight <= 0 || inSeat() || busy()) return false;
    camForward(forward);
    const travel = Math.min(1, t / shot.drift);
    if (shot.lift) {
      // A crane: over wherever the follow camera is, rising and coming back down. It looks at the follow camera's own
      // aim at first and, as it rises, at the point that puts Buddy at CRANE_NDC_Y whatever the camera's real height,
      // distance and field of view are (./crane-aim.ts).
      position.copy(pos).addScaledVector(shot.lift, Math.sin(Math.PI * travel));
      pos.lerp(position, weight);
      aim.copy(look).addScaledVector(forward, 8);
      if (me.body) {
        const p = me.body.interpolatedPosition;
        chest.set(p.x, p.y + 0.4, p.z);
        craneAim(pos, chest, camera.fov, CRANE_NDC_Y, aim.distanceTo(pos), want);
        aim.lerp(want, weight);
      }
      look.copy(aim).addScaledVector(forward, -8);
      return true;
    } else {
      const run = Math.min(1, Math.max(0, t - shot.lead) / shot.drift);
      position.lerpVectors(shot.from, shot.to, shot.drift === shot.seconds ? run : ease(run));
      if (shot.atFrom) target.lerpVectors(shot.atFrom, shot.at, ease(run));
      else target.copy(shot.at);
      // The end cut sets the camera's position and its look together, on the one frame.
      if (shot.end && t >= shot.lead + shot.drift) {
        position.copy(shot.end.pos);
        target.copy(shot.end.at);
      }
      aim.copy(look).addScaledVector(forward, 8).lerp(target, weight);
    }
    pos.lerp(position, weight);
    look.copy(aim).addScaledVector(forward, -8);
    return true;
  };
  camConstraints.push(constraint);
  const settle = () => {
    t = weight = 0;
    cut = 1;
    returned = false;
    input.release();
    showSkip(self, false);
  };
  // The camera's one list (buddy-frame.ts): a queued or playing shot holds it, but only a playing one has the screen: a queued
  // shot waits on a talk or a reward card, and the act card must not wait on it forever. The You page waits for every shot.
  const report = () => holdCamera(self, !!shot || !!pending, shot ? shot.seconds - t : 0);
  const reset = () => {
    shot = pending = null;
    settle();
    report();
  };
  const step = (dt: number) => {
    if (inSeat() || reducedMotion) return reset();
    if (pending && !busy() && !inputState.held) {
      shot = pending;
      pending = null;
      settle();
    }
    if (!shot) return;
    // A reward card over a shot the player was meant to see: it goes back in the queue and plays whole after the card.
    if (busy() || inputState.held) {
      if (cut === 1) pending ??= shot;
      shot = null;
      return settle();
    }
    t += dt;
    // Reorient the underlying follow camera while the gate shot has full weight, before blending home.
    if (behindBuddy && !returned && cut === 1 && t >= shot.seconds - outS()) {
      cam.yaw = me.yaw;
      returned = true;
    }
    if (cut < 1) cut = Math.max(0, cut - dt / 0.14);
    const out = inS() > 0 ? Math.min(1, t / inS()) : 1,
      back = clamp((t - shot.seconds + outS()) / outS(), 0, 1);
    weight = ease(out) * (1 - ease(back)) * cut;
    if (t >= shot.seconds || cut <= 0) return reset();
    input.update();
    showSkip(self, skipping());
  };
  return {
    play(
      from: THREE.Vector3,
      to: THREE.Vector3,
      at: THREE.Vector3,
      seconds = 3.2,
      drift = seconds,
      shape: ShotShape = {},
    ) {
      if (reducedMotion || inSeat()) return;
      pending = {
        from: from.clone(),
        to: to.clone(),
        at: at.clone(),
        seconds,
        drift,
        lead: shape.lead ?? 0,
        atFrom: shape.atFrom?.clone() ?? null,
        back: shape.back ?? BACK_S,
        cutIn: shape.cutIn ?? false,
        end: shape.end ? { pos: shape.end.pos.clone(), at: shape.end.at.clone() } : null,
      };
      report();
    },
    /** A crane over the follow camera: up by `lift` (a world offset) and back down in `seconds`, easing in and out over
     * `blend` seconds each way, with Buddy held at CRANE_NDC_Y. */
    crane(lift: THREE.Vector3, seconds: number, blend: number) {
      if (reducedMotion || inSeat()) return;
      pending = {
        from: lift,
        to: lift,
        at: lift,
        seconds,
        drift: seconds,
        lead: 0,
        atFrom: null,
        back: BACK_S,
        cutIn: false,
        end: null,
        lift: lift.clone(),
        blend,
      };
      report();
    },
    update(dt: number) {
      step(dt);
      report();
    },
    cancel,
    reset,
    active: () => !!shot || !!pending,
    inspect: () => ({ active: !!shot, pending: !!pending, seconds: t, weight, skip: skipping() }),
    dispose() {
      reset();
      holdCamera(self, false);
      listeners.abort();
      const index = camConstraints.indexOf(constraint);
      if (index >= 0) camConstraints.splice(index, 1);
    },
  };
}
