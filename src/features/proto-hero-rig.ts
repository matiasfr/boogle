// Prototype: the rig path end to end (?proto=assets, beside the scaffold bays; docs/research/procedural-animation.md,
// recommendation 3). A jointed hero built by a Blender script (assets/src/hero-rig.py: rigid parts on 13 bones, no
// skin weights) stands between the bays. Code poses it every frame (breathing, a slight sway, turning and looking at
// you); press Interact near it and it plays the authored "wave" clip, faded in over the code pose and back out. The
// question it answers: can an agent-built rig and clip sit on top of code-driven motion without a seam?
// Local: decoration only, each tab runs its own.
import * as THREE from 'three/webgpu';
import { color, float, normalView, positionViewDirection, vec3 } from 'three/tsl';
import { patchNode } from '../render/material-patch.ts';
import { onFrame } from '../loop.ts';
import { scene } from '../render/scene.ts';
import { precompile } from '../render/precompile.ts';
import { groundHeight } from '../adapters/terrain.ts';
import { SPAWN } from '../constants.ts';
import { me } from '../player/player.ts';
import { registerInteractable, NO_TARGETS } from '../player/hands.ts';
import rigUrl from '../../assets/built/hero-rig.glb?url';

const AT = { x: SPAWN.x, z: SPAWN.z - 4 }; // between the two scaffold bays
const REACH = 3; // m from the hero to offer "Wave"
const FADE_IN = 0.12; // s: the clip takes over quickly (its first keys are an anticipation dip)
const FADE_OUT = 0.3; // s: and hands back to the code pose softly

async function build() {
  const { loadAsset } = await import('../render/assets.ts');
  const rig = await loadAsset(rigUrl);
  const holder = rig.instance('hero');
  const y = groundHeight(AT.x, AT.z);
  holder.position.set(AT.x, y, AT.z);
  // A cool rim of sky light on every part, the soft edge the previz renders have and the game's lighting lacks:
  // (1 - N.V)^3, so it shows only where a surface turns away from the camera.
  const rim = float(1).sub(normalView.dot(positionViewDirection).saturate()).pow(3).mul(color('#cfe6ff')).mul(0.45);
  const patched = new Set<THREE.Material>();
  holder.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | undefined;
    if (!m || patched.has(m)) return;
    patched.add(m);
    patchNode(m, 'emissiveNode', (prev) => (prev ?? vec3(0)).add(rim));
  });
  scene.add(holder);
  await precompile(holder);

  const root = holder.children[0];
  const bone = (n: string) => {
    const b = root.getObjectByName(n);
    if (!b) throw new Error('hero-rig: no bone ' + n);
    return b;
  };
  const bones = ['root', 'hips', 'body', 'arm_l', 'arm_r', 'forearm_l', 'forearm_r', 'hand_l', 'hand_r'].map(bone);
  const [, hips, body, armL, armR, forearmL, forearmR] = bones;
  const pupils = ['pupil_l_part', 'pupil_r_part'].map(bone);
  const pupilRest = pupils.map((p) => p.position.clone());
  const codeQ = bones.map(() => new THREE.Quaternion());
  const clipQ = new THREE.Quaternion();

  const mixer = new THREE.AnimationMixer(root);
  const wave = mixer.clipAction(rig.clip('wave'));
  wave.setLoop(THREE.LoopOnce, 1);
  let waveT = -1; // seconds into the wave, or -1 when the code pose has the figure alone

  const at = new THREE.Vector3(AT.x, y + 2.1, AT.z);
  registerInteractable(() => {
    if (!me.entered || !me.body || waveT >= 0) return NO_TARGETS;
    const p = me.body.interpolatedPosition;
    if (Math.hypot(p.x - AT.x, p.z - AT.z) > REACH) return NO_TARGETS;
    return [
      {
        id: 'hero-rig',
        verb: 'Wave',
        at,
        run: () => {
          waveT = 0;
          wave.reset().play();
        },
      },
    ];
  });

  let t = 0;
  let yaw = 0;
  onFrame(
    ({ dt }) => {
      t += dt;
      // Turn towards the player, on a soft spring, and look at them.
      const p = me.body ? me.body.interpolatedPosition : { x: SPAWN.x, z: SPAWN.z };
      const want = Math.atan2(p.x - AT.x, p.z - AT.z) + Math.PI; // the figure faces -Z at yaw 0
      let d = want - yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      yaw += d * Math.min(1, dt * 3);
      holder.rotation.y = yaw;
      const look = THREE.MathUtils.clamp(d, -0.5, 0.5);
      pupils.forEach((pu, i) => pu.position.set(pupilRest[i].x - look * 0.06, pupilRest[i].y, pupilRest[i].z));

      // The code pose: breathing (a small squash on the hips), a sway, arms hanging with a little swing.
      const breath = Math.sin(t * 2.2);
      hips.scale.set(1 + breath * 0.015, 1 - breath * 0.02, 1 + breath * 0.015);
      for (const b of bones) b.quaternion.identity();
      body.rotation.set(0, 0, Math.sin(t * 0.9) * 0.04);
      armL.rotation.set(Math.sin(t * 1.1) * 0.06, 0, -0.12);
      armR.rotation.set(-Math.sin(t * 1.1) * 0.06, 0, 0.12);
      forearmL.rotation.set(-0.15, 0, 0);
      forearmR.rotation.set(-0.15, 0, 0);
      if (waveT < 0) return;

      // The authored clip over the code pose: the mixer writes the clip's pose, then each bone blends from the code
      // pose towards it by the fade weight.
      bones.forEach((b, i) => codeQ[i].copy(b.quaternion));
      waveT += dt;
      mixer.update(dt);
      const dur = wave.getClip().duration;
      const w = Math.min(1, waveT / FADE_IN, Math.max(0, (dur - waveT) / FADE_OUT));
      // (slerpQuaternions copies its first argument into the target first, so the clip pose needs its own copy)
      bones.forEach((b, i) => b.quaternion.slerpQuaternions(codeQ[i], clipQ.copy(b.quaternion), w));
      if (waveT >= dur) waveT = -1;
    },
    { phase: 'update', order: 41 },
  );
  (window as unknown as { __heroRig?: unknown }).__heroRig = {
    wave: () => {
      waveT = 0;
      wave.reset().play();
    },
    seek: (s: number) => {
      waveT = 0;
      wave.reset().play();
      mixer.update(0);
      waveT = s;
      wave.time = s;
    },
  };
}

if (new URLSearchParams(location.search).get('proto') === 'assets') build();
