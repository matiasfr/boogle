// The fall into the world (src/features/fall.ts loads this on a first visit or ?proto=fall; docs/game-design/first-run.md). You
// meet your Buddy riding a flat trolley on a rail above the clouds, with the name-and-colour card beside it. Jump in
// runs it off the end: one shot, no cut. You steer on the way down, through the cloud, into the BOOGLE title hanging in the
// sky. It breaks up and the letters fall with you; you lie flat with stars, they and the cart come down around you, and the
// game begins. The rail going nowhere says what the
// game wants, without words. Serves DESIGN.md 10 (Slapstick over precision) and 7 (Telegraph everything). Local, apart from
// your body and the existing flops: the prop pieces are this tab's alone.
import './fall.css';
import * as THREE from 'three/webgpu';
import { FIXED, PLAYER_R, reducedMotion } from '../constants.ts';
import { onEntered } from '../entities/player/state.ts';
import { groundHeight } from '../island/heights.ts';
import { clamp, smoothstep } from '../math.ts';
import { defineKind, despawn, spawn } from '../entity/entity.ts';
import { teleport } from '../physics/engine.ts';
import { AVATAR_FILL, animateAvatar, makeAvatar, makeLabel, paintAvatar, type Avatar } from '../player/avatars.ts';
import { input, inputState } from '../player/input-state.ts';
import { cam, me } from '../player/player.ts';
import { getAudio } from '../render/audio.ts';
import { emit } from '../render/particles.ts';
import { camera, sky, sun } from '../render/scene.ts';
import { SUN_DIR } from '../render/sun-dir.ts';
import { TITLE_Y, blastLetters, burst, fallWithYou, hitTitle } from './letters.ts';
import {
  CAR_START,
  DECK_Y,
  FWD,
  HEIGHT,
  RIGHT,
  ROLL_DIST,
  STAND,
  TARGET,
  UP,
  YAW,
  car,
  carProp,
  clearDeck,
  clearRail,
  slideWorld,
} from './stage.ts';

const CRUISE = 5, // m/s the cart is already doing behind the card
  RELEASE = 10, // m/s as the rail runs out: it speeds up over the last stretch
  OFF_END = 0.8, // m the cart's middle is past the end when it tips and you leave it
  LAUNCH_UP = 4, // m/s: a little hop off the end
  BLEND_S = 1, // the camera swinging from your face to behind you
  FALL_PITCH = -1.05, // looking down past your feet
  TITLE_PITCH = -1.22, // steeper while the title's coming up, so it reads in the middle of the screen
  REST_PITCH = -0.38, // after the landing
  FUNNEL = { base: 1, perMetre: 0.2, firm: 1.5 }, // how far off the title you can steer, by height, so you can't miss
  DOWN_MS = 1800, // flat with stars. Under 2000: presence `kd` ignores more
  GET_UP_MS = 900, // the soonest any input stands you up
  CAR_LATE_S = 0.8, // how long after you it lands
  CLEAR_AFTER_S = 40, // the cart lies where it landed this long
  CART_FADE_S = 4, // and shrinks away over the last of it
  FALL_FOV = 10, // degrees wider on the way down
  FRONT_FILL = 0.42; // the sun is behind your Buddy on the card, and this is where you pick the colour: light its front

type State = 'card' | 'roll' | 'fall' | 'down' | 'done';
let state: State = 'card';

document.body.classList.add('fall-stage', 'fall-air');
const white = document.createElement('div');
white.className = 'fall-white';
document.body.append(white);

// ---------------------------------------------------------------- your Buddy on the card
// Not the player yet (me.entered would start the game): another avatar in your colour, swapped for you on Jump in.
defineKind('fall-preview', { update: 15 });
const previewHolder = new THREE.Group();
const previewProp = spawn({ kind: 'fall-preview', mesh: previewHolder, update: ({ dt }) => updatePreview(dt) });
let preview: Avatar | null = null;
let label: THREE.Sprite | null = null;
let labelText = '';
let hop = 1; // s since the last colour change
let shownColor = -1;
let retry = 0;
const nameBox = document.getElementById('name-input') as HTMLInputElement | null;

function standOnCar(out: THREE.Vector3, carAt: THREE.Vector3) {
  return out
    .copy(carAt)
    .addScaledVector(FWD, -STAND.back)
    .addScaledVector(UP, STAND.up + PLAYER_R);
}
const buddyAt = new THREE.Vector3();
const stageAt = new THREE.Vector3();

function updatePreview(dt: number) {
  retry -= dt;
  // The Buddy dresses avatars only once it has loaded; until then this is a capsule.
  if (retry <= 0 && !preview?.userData.handSocket) {
    retry = 0.25;
    preview?.removeFromParent();
    preview = makeAvatar(me.colorIdx);
    preview.rotation.y = YAW;
    previewHolder.add(preview);
    label = null;
    labelText = '';
    shownColor = -1;
  }
  if (!preview) return;
  if (me.colorIdx !== shownColor) {
    if (shownColor >= 0) hop = 0;
    shownColor = me.colorIdx;
    paintAvatar(preview.userData.mat, me.colorIdx, FRONT_FILL);
  }
  hop += dt;
  const up = hop < 0.34 ? Math.sin((hop / 0.34) * Math.PI) * 0.55 : 0;
  standOnCar(buddyAt, car.group.position);
  preview.position.copy(buddyAt);
  preview.position.y += up;
  animateAvatar(preview, 0, up > 0, dt);
  const text = nameBox?.value.trim() ?? '';
  if (text !== labelText) {
    labelText = text;
    if (label) {
      preview.remove(label);
      label.material.map?.dispose();
      label.material.dispose();
    }
    label = makeLabel(text || ' ');
    preview.add(label);
  }
}

// ---------------------------------------------------------------- the camera on the card
const stagePos = new THREE.Vector3();
const stageLook = new THREE.Vector3();
const stageQ = new THREE.Quaternion();
const mat4 = new THREE.Matrix4();
function stageShot(buddy: THREE.Vector3) {
  // In front of your Buddy, on its level: the rail runs away behind it and the cloud lies below. It takes the side of the
  // screen the card leaves free: the left on a wide screen (looking from the front, the world's -RIGHT is screen right),
  // the top on an upright one.
  const wide = camera.aspect > 23 / 20;
  stageLook.copy(buddy).addScaledVector(UP, 0.7);
  if (wide) stageLook.addScaledVector(RIGHT, -2.1);
  else stageLook.addScaledVector(UP, -1.5);
  stagePos
    .copy(buddy)
    .addScaledVector(FWD, wide ? 6.6 : 8)
    .addScaledVector(UP, 1.1)
    .addScaledVector(RIGHT, wide ? -1.2 : 0);
  stageQ.setFromRotationMatrix(mat4.lookAt(stagePos, stageLook, UP));
}
function lightStage(at: THREE.Vector3) {
  sun.target.position.copy(at);
  sun.position.set(at.x + SUN_DIR.x * 80, at.y + SUN_DIR.y * 80, at.z + SUN_DIR.z * 80);
}

// ---------------------------------------------------------------- Jump in: on the rail, then off it
let rollT = 0;
const carAt = new THREE.Vector3();
const ROLL_S = (2 * (ROLL_DIST + OFF_END)) / (CRUISE + RELEASE); // steady speeding up, from CRUISE to RELEASE
function rollPlace(t: number) {
  const k = Math.min(t, ROLL_S);
  carAt.copy(CAR_START).addScaledVector(FWD, CRUISE * k + (((RELEASE - CRUISE) / ROLL_S) * k * k) / 2);
}
const standAt = new THREE.Vector3();

onEntered(() => {
  state = 'roll';
  document.body.classList.remove('fall-stage');
  despawn(previewProp);
  inputState.held = true;
  standOnCar(standAt, CAR_START);
  teleport(me.body!, standAt.x, standAt.y, standAt.z);
  me.body!.velocity.set(0, 0, 0);
  me.yaw = cam.yaw = YAW;
});

function holdOrSteer() {
  const b = me.body;
  if (!b) return;
  if (state === 'roll') {
    rollT += FIXED;
    rollPlace(rollT);
    standOnCar(standAt, carAt);
    teleport(b, standAt.x, standAt.y, standAt.z);
    b.velocity.set(0, 0, 0);
    me.coyote = 0.1; // standing, for the avatar
    me.yaw = YAW;
    if (rollT >= ROLL_S) {
      state = 'fall';
      inputState.held = false;
      me.coyote = 0;
      b.velocity.set(FWD.x * RELEASE * 0.8, LAUNCH_UP, FWD.z * RELEASE * 0.8);
      releaseCar();
    }
  } else if (state === 'fall') {
    // You steer the whole way down, inside a funnel that closes on the sign.
    const dx = b.position.x - TARGET.x,
      dz = b.position.z - TARGET.z,
      d = Math.hypot(dx, dz);
    // It closes on the title in the sky, and stays loose under it.
    const r = FUNNEL.base + Math.max(0, b.position.y - TITLE_Y) * FUNNEL.perMetre + (titleHit ? 2 : 0);
    if (d > r) {
      const nx = dx / d,
        nz = dz / d,
        want = -(d - r) * FUNNEL.firm,
        v = b.velocity.x * nx + b.velocity.z * nz;
      if (v > want) {
        b.velocity.x -= (v - want) * nx;
        b.velocity.z -= (v - want) * nz;
      }
    }
  }
}

// ---------------------------------------------------------------- the cart comes too
const carV = new THREE.Vector3();
let travelled = 0,
  rumble = 0;
let carFlying = false,
  carDown = false,
  carSpin = 0;
const CAR_LAND = TARGET.clone().addScaledVector(RIGHT, 3.2).addScaledVector(FWD, 5.5); // where you'll see it from the ground
const carMaxFall = HEIGHT / (HEIGHT / 20 + CAR_LATE_S);
function releaseCar() {
  carFlying = true;
  carV.copy(FWD).multiplyScalar(RELEASE * 0.6);
  carV.y = 1;
}
function updateCar(dt: number) {
  const g = car.group;
  if (state === 'card' || state === 'roll') {
    // It rides the sleepers: a small tremble and a slow rock.
    travelled += dt * CRUISE;
    rumble = Math.sin((travelled * 2 * Math.PI) / 0.95) * 0.007;
    g.rotation.x = Math.sin(travelled * 1.3) * 0.009;
  }
  if (state === 'card') {
    slideWorld(travelled);
    g.position.y = CAR_START.y + rumble;
  }
  if (state === 'roll') {
    rollPlace(rollT);
    g.position.copy(carAt);
    g.position.y += rumble;
  }
  if (!carFlying || carDown) return;
  carV.y = Math.max(carV.y - 30 * dt, -carMaxFall);
  const pull = 1 - Math.exp(-dt * 0.9);
  carV.x *= Math.exp(-dt * 2);
  carV.z *= Math.exp(-dt * 2);
  g.position.x += carV.x * dt + (CAR_LAND.x - g.position.x) * pull;
  g.position.z += carV.z * dt + (CAR_LAND.z - g.position.z) * pull;
  g.position.y += carV.y * dt;
  carSpin += dt * 2.6;
  g.rotation.x = -carSpin;
  g.rotation.z = carSpin * 0.45;
  const ground = groundHeight(g.position.x, g.position.z);
  if (g.position.y <= ground + 0.4) {
    carDown = true;
    g.position.y = ground + 0.45;
    g.rotation.x = 0.1;
    g.rotation.z = 2.5; // on its side, wheels in the air
    burst(g.position, 22, 16);
    shake = Math.max(shake, 0.7);
    thump(0.7);
  }
}

// ---------------------------------------------------------------- the crash
let shake = 0;
const knock = (ctx: AudioContext, out: AudioNode, at: number, f: number, gain: number) => {
  const o = ctx.createOscillator(),
    g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(f, at);
  o.frequency.exponentialRampToValueAtTime(f * 0.55, at + 0.07);
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + 0.1);
};
function thump(strength: number) {
  const a = getAudio();
  if (!a) return;
  const { ctx, out } = a;
  const t = ctx.currentTime + 0.002;
  const o = ctx.createOscillator(),
    g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(130, t);
  o.frequency.exponentialRampToValueAtTime(38, t + 0.28);
  g.gain.setValueAtTime(0.75 * strength, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.4);
  // Timber clattering.
  for (let k = 0; k < 9; k++)
    knock(
      ctx,
      out,
      t + 0.03 + k * 0.055 + Math.random() * 0.05,
      240 + Math.random() * 420,
      0.2 * strength * (1 - k / 11),
    );
}

const hit = new THREE.Vector3();
let downSince = 0;
let titleHit = false;
function smashTitle() {
  titleHit = true;
  const p = me.body!.position;
  hit.set(p.x, TITLE_Y, p.z);
  hitTitle(hit);
  burst(hit, 26, 34);
  shake = reducedMotion ? 0 : 0.8;
  thump(0.7);
}
let clearProps = 0;
function land(now: number) {
  state = 'down';
  document.body.classList.remove('fall-air');
  downSince = now;
  me.down = true;
  me.downUntil = now + DOWN_MS;
  const p = me.body!.position;
  hit.set(p.x, TARGET.y, p.z);
  blastLetters(hit, now);
  burst(hit, 34, 30);
  shake = reducedMotion ? 0 : 1;
  thump(1);
  clearRail();
  clearProps = now + CLEAR_AFTER_S * 1000;
}

const pressing = () => input.keys.size > 0 || Math.abs(input.stickX) + Math.abs(input.stickY) > 0.25;

// ---------------------------------------------------------------- every frame
const STREAK = new THREE.Color('#ffffff');
const followPos = new THREE.Vector3();
const followAim = new THREE.Vector3();
const focus = new THREE.Vector3();
const from = new THREE.Vector3();
const to = new THREE.Vector3();
let outOfCloud = false;
let blendT = 0,
  fov = 0,
  restT = 0;

// You take over from the preview still lit as it was, and the fill settles as the camera swings round to your sunlit back.
let filled = true;
function fadeFrontFill(e: number) {
  const m = me.avatar?.userData.mat;
  if (!m || !filled) return;
  filled = e < 1;
  paintAvatar(m, me.colorIdx, FRONT_FILL + (AVATAR_FILL - FRONT_FILL) * e);
}

function blendCamera(dt: number) {
  blendT += dt;
  const e = smoothstep(0, BLEND_S, blendT);
  fadeFrontFill(e);
  if (e >= 1) return;
  const ip = me.body!.interpolatedPosition;
  focus.set(ip.x, ip.y + 1, ip.z);
  stageShot(standOnCar(standAt, CAR_START));
  // Round your side, not through you: angle, radius and height blend separately around you.
  from.subVectors(stagePos, focus);
  followPos.copy(camera.position);
  to.subVectors(followPos, focus);
  const a0 = Math.atan2(from.x, from.z);
  let da = Math.atan2(to.x, to.z) - a0;
  da = Math.atan2(Math.sin(da), Math.cos(da));
  const a = a0 + da * e,
    r = THREE.MathUtils.lerp(Math.hypot(from.x, from.z), Math.hypot(to.x, to.z), e);
  camera.position.set(
    focus.x + Math.sin(a) * r,
    THREE.MathUtils.lerp(from.y, to.y, e) + focus.y,
    focus.z + Math.cos(a) * r,
  );
  // Keep you in frame the whole way round: aim at a point moving from the card's aim to the follow camera's.
  followAim.set(0, 0, -10).applyQuaternion(camera.quaternion).add(followPos);
  camera.lookAt(followAim.lerp(stageLook, 1 - e));
}

// The director: runs the whole fall, then takes itself and the cart away. Its camera comes straight after the camera
// entity (-200), before the clouds (-190) and the sky (-5), which place themselves around wherever the camera is: from the
// orbit that entity falls back on before you enter, the sun's disc sat well off its glow and jumped back on Jump in.
defineKind('fall', { fixedPre: 1000, update: -195, lateUpdate: 1200 });
const director = spawn({
  kind: 'fall',
  fixedPre: holdOrSteer,
  describe: () => ({ state, height: HEIGHT }),
  update({ dt }) {
    if (state === 'card') {
      standOnCar(stageAt, CAR_START); // not the cart's rumble: the camera holds still
      stageShot(stageAt);
      camera.position.copy(stagePos);
      camera.quaternion.copy(stageQ);
      sky.position.copy(camera.position);
      lightStage(stageAt);
    } else if (me.body) blendCamera(dt);
  },
  lateUpdate({ now, dt }) {
    updateCar(dt);
    if (state === 'card') {
      updatePreview(dt);
      return;
    }
    const b = me.body;
    if (!b) return;

    if (state === 'fall') {
      if (!titleHit && b.position.y <= TITLE_Y) smashTitle();
      if (titleHit) fallWithYou(b.interpolatedPosition, dt);
      const pitch = titleHit ? FALL_PITCH : TITLE_PITCH;
      cam.pitch += (pitch - cam.pitch) * (1 - Math.exp(-dt * 2.4));
      if (b.position.y - TARGET.y > 8 && !reducedMotion)
        for (let k = 0; k < 3; k++)
          emit({
            x: b.position.x + (Math.random() - 0.5) * 18,
            y: b.position.y - 24 + Math.random() * 10,
            z: b.position.z + (Math.random() - 0.5) * 18,
            vx: 0,
            vy: 0,
            vz: 0,
            life: 0.7,
            size: 0.09,
            alpha: 0.5,
            color: STREAK,
          });
      if (me.coyote > 0 || me.swimming) land(now);
    } else if (state === 'down') {
      if (now - downSince > GET_UP_MS && pressing()) me.downUntil = now;
      if (!me.down) state = 'done';
    }
    if (state === 'down' || (state === 'done' && restT < 1.2)) {
      restT += dt;
      cam.pitch += (REST_PITCH - cam.pitch) * (1 - Math.exp(-dt * 2));
    }

    // Through the cloud: white for the moment you're in it, and it's gone from above you once you're out.
    const inCloud = 1 - clamp(Math.abs(camera.position.y - DECK_Y) / 15, 0, 1);
    white.style.opacity = String(inCloud * 0.94);
    if (!outOfCloud && camera.position.y < DECK_Y - 1) {
      outOfCloud = true;
      clearDeck();
    }

    const wantFov = state === 'fall' && !reducedMotion ? FALL_FOV * clamp(-b.velocity.y / 15, 0, 1) : 0;
    const step = (wantFov - fov) * (1 - Math.exp(-dt * 5));
    if (Math.abs(step) > 0.01) {
      fov += step;
      camera.fov += step;
      camera.updateProjectionMatrix();
    }
    if (shake > 0.01) {
      camera.position.x += (Math.random() - 0.5) * 0.5 * shake;
      camera.position.y += (Math.random() - 0.5) * 0.5 * shake;
      camera.position.z += (Math.random() - 0.5) * 0.5 * shake;
      shake *= Math.exp(-dt * 6);
    }
    sky.position.copy(camera.position);
    if (clearProps) car.group.scale.setScalar(clamp((clearProps - now) / (CART_FADE_S * 1000), 0, 1));
    if (clearProps && now > clearProps) {
      despawn(carProp);
      despawn(director);
      white.remove();
    }
  },
});
