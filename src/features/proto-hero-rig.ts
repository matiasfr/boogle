// Prototype: the rig path end to end (?proto=assets, beside the scaffold bays; docs/research/procedural-animation.md,
// recommendation 3). A jointed hero built by a Blender script (assets/src/hero-rig.py: rigid parts on 15 bones, no
// skin weights) stands between the bays. Code poses it every frame (breathing, a slight sway, turning and looking at
// you); &eyes= and &shade= pick its eye style and shading (src/player/hero.ts). Press Interact near it and it changes
// outfit, then plays the authored "wave" clip, faded in over the code pose and back out. The questions it answers: can an agent-built rig and clip sit on top of code-driven motion without a
// seam, and do outfits from other files swap onto the same body?
// Local: decoration only, each tab runs its own.
import * as THREE from 'three/webgpu';
import { onFrame } from '../loop.ts';
import { scene } from '../render/scene.ts';
import { precompile } from '../render/precompile.ts';
import { groundHeight } from '../adapters/terrain.ts';
import { SPAWN } from '../constants.ts';
import { me } from '../player/player.ts';
import { registerInteractable, NO_TARGETS } from '../player/hands.ts';

const AT = { x: SPAWN.x, z: SPAWN.z - 4 }; // between the two scaffold bays
const REACH = 3; // m from the hero to offer "Change clothes"
const FADE_IN = 0.12; // s: the clip takes over quickly (its first keys are an anticipation dip)
const FADE_OUT = 0.3; // s: and hands back to the code pose softly
const q = new URLSearchParams(location.search);

async function build() {
  const { loadHeroKit, OUTFITS } = await import('../player/hero.ts');
  const hero = (await loadHeroKit()).make('#1fbfc4', q.has('hero') ? undefined : 'work');
  const { holder, pupils } = hero;
  const root = holder.children[0];
  const y = groundHeight(AT.x, AT.z);
  holder.position.set(AT.x, y, AT.z);
  scene.add(holder);
  await precompile(holder);

  const { hips, body, arm_l: armL, arm_r: armR, forearm_l: forearmL, forearm_r: forearmR } = hero.bones;
  const bones = Object.values(hero.bones);
  const pupilRest = pupils.map((p) => p.position.clone());
  const codeQ = bones.map(() => new THREE.Quaternion());
  const clipQ = new THREE.Quaternion();

  const mixer = new THREE.AnimationMixer(root);
  const wave = mixer.clipAction(hero.wave);
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
        verb: 'Change clothes',
        at,
        run: () => {
          hero.dress(OUTFITS[(OUTFITS.indexOf(hero.outfit) + 1) % OUTFITS.length]);
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
    dress: hero.dress,
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

// Also in the look lab (?proto=look&hero=<outfit>), to see it under the scene's render presets.
if (q.get('proto') === 'assets' || q.has('hero')) build();
