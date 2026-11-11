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
import { holdMoment } from '../ui/moment-banner.ts';

// Owner, 9 November: "the cinematic should be uninterruptible unless by maybe a specific highlighted button press".
// Nothing ends a shot by accident; Interact skips it once its glyph has shown this long. null takes the skip out.
const SKIP_AFTER_S: number | null = 0.8;
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

type Shot = { from: THREE.Vector3; to: THREE.Vector3; at: THREE.Vector3; seconds: number; drift: number };
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
    position = new THREE.Vector3();
  const ease = (u: number) => smoothstep(0, 1, u);
  const cancel = () => {
    pending = null;
    cut = Math.min(cut, 0.999);
  };
  const skipping = () => SKIP_AFTER_S !== null && !!shot && cut === 1 && t >= SKIP_AFTER_S && t < shot.seconds - BACK_S;
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
    position.lerpVectors(shot.from, shot.to, shot.drift === shot.seconds ? travel : ease(travel));
    aim.copy(look).addScaledVector(forward, 8).lerp(shot.at, weight);
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
  // The shared full-screen check (src/ui/moment-banner.ts): a queued or playing shot is a moment with this long to go.
  const report = () => holdMoment(self, shot ? shot.seconds - t : pending ? pending.seconds : null);
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
    if (behindBuddy && !returned && cut === 1 && t >= shot.seconds - BACK_S) {
      cam.yaw = me.yaw;
      returned = true;
    }
    if (cut < 1) cut = Math.max(0, cut - dt / 0.14);
    const out = Math.min(1, t / 0.8),
      back = clamp((t - shot.seconds + BACK_S) / BACK_S, 0, 1);
    weight = ease(out) * (1 - ease(back)) * cut;
    if (t >= shot.seconds || cut <= 0) return reset();
    input.update();
    showSkip(self, skipping());
  };
  return {
    play(from: THREE.Vector3, to: THREE.Vector3, at: THREE.Vector3, seconds = 3.2, drift = seconds) {
      if (reducedMotion || inSeat()) return;
      pending = { from: from.clone(), to: to.clone(), at: at.clone(), seconds, drift };
      report();
    },
    update(dt: number) {
      step(dt);
      report();
      holdCamera(self, !!shot || !!pending); // the You page waits for every shot (src/render/buddy-frame.ts)
    },
    cancel,
    reset,
    active: () => !!shot || !!pending,
    inspect: () => ({ active: !!shot, pending: !!pending, seconds: t, weight, skip: skipping() }),
    dispose() {
      reset();
      holdCamera(self, false);
      holdMoment(self, null);
      listeners.abort();
      const index = camConstraints.indexOf(constraint);
      if (index >= 0) camConstraints.splice(index, 1);
    },
  };
}
