// Place's celebration pull-out, with an owned lifetime and shared input dismissal.
// Local only: the ordinary follow camera continues underneath, ready for the return blend.
import * as THREE from 'three/webgpu';
import { cam, camConstraints, camForward, me } from '../player/player.ts';
import { inputState } from '../player/input-state.ts';
import { dismissInput } from '../player/dismiss-pointer.ts';
import { reducedMotion } from '../constants.ts';

type Shot = { from: THREE.Vector3; to: THREE.Vector3; at: THREE.Vector3; seconds: number; drift: number };
export function createCameraPullOut(busy = () => false, behindBuddy = false, seated = () => false) {
  const inSeat = () => inputState.seated || seated();
  const listeners = new AbortController();
  let shot: Shot | null = null,
    pending: Shot | null = null,
    t = 0,
    weight = 0,
    cut = 1,
    returned = false;
  const forward = new THREE.Vector3(),
    aim = new THREE.Vector3(),
    position = new THREE.Vector3();
  const ease = (u: number) => u * u * (3 - 2 * u);
  const cancel = () => {
    pending = null;
    cut = Math.min(cut, 0.999);
  };
  const input = dismissInput(() => !!shot, cancel, listeners.signal);
  const constraint: (typeof camConstraints)[number] = (look, pos) => {
    if (!shot || weight <= 0 || inSeat() || busy()) return false;
    camForward(forward);
    const travel = Math.min(1, t / shot.drift);
    position.lerpVectors(shot.from, shot.to, shot.drift === shot.seconds ? travel : ease(travel));
    aim.copy(look).addScaledVector(forward, 8).lerp(shot.at, weight);
    pos.lerp(position, weight);
    look.copy(aim).addScaledVector(forward, -8);
    return true;
  };
  camConstraints.push(constraint);
  const reset = () => {
    shot = pending = null;
    t = weight = 0;
    cut = 1;
    returned = false;
  };
  return {
    play(from: THREE.Vector3, to: THREE.Vector3, at: THREE.Vector3, seconds = 3.2, drift = seconds) {
      if (reducedMotion || inSeat()) return;
      pending = { from: from.clone(), to: to.clone(), at: at.clone(), seconds, drift };
    },
    update(dt: number) {
      if (inSeat() || reducedMotion) return reset();
      if (pending && !busy() && !inputState.held) {
        shot = pending;
        pending = null;
        t = weight = 0;
        cut = 1;
        input.reset();
      }
      if (!shot) return;
      if (busy() || inputState.held) return reset();
      input.update();
      t += dt;
      // Reorient the underlying follow camera while the gate shot has full weight, before blending home.
      if (behindBuddy && !returned && cut === 1 && t >= shot.seconds - 0.55) {
        cam.yaw = me.yaw;
        returned = true;
      }
      if (cut < 1) cut = Math.max(0, cut - dt / 0.14);
      const out = Math.min(1, t / 0.8),
        back = Math.max(0, Math.min(1, (t - shot.seconds + 0.55) / 0.55));
      weight = ease(out) * (1 - ease(back)) * cut;
      if (t >= shot.seconds || cut <= 0) reset();
    },
    cancel,
    reset,
    active: () => !!shot || !!pending,
    inspect: () => ({ active: !!shot, pending: !!pending, seconds: t, weight }),
    dispose() {
      reset();
      listeners.abort();
      const index = camConstraints.indexOf(constraint);
      if (index >= 0) camConstraints.splice(index, 1);
    },
  };
}
