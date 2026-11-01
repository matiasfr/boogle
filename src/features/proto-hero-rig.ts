// Prototype: the rig path end to end (?proto=assets, beside the scaffold bays; docs/research/procedural-animation.md,
// recommendation 3). A jointed hero built by a Blender script (assets/src/hero-rig.py: rigid parts on 15 bones, no
// skin weights) stands between the bays. Code poses it every frame (breathing, a slight sway, turning and looking at
// you); &eyes= and &shade= pick its eye style and shading. Press Interact near it and it changes outfit, then plays the authored "wave" clip, faded in over the code pose
// and back out. The questions it answers: can an agent-built rig and clip sit on top of code-driven motion without a
// seam, and do outfits from other files swap onto the same body?
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
import castawayUrl from '../../assets/built/hero-outfit-castaway.glb?url';

const AT = { x: SPAWN.x, z: SPAWN.z - 4 }; // between the two scaffold bays
const REACH = 3; // m from the hero to offer "Change clothes"
const OUTFITS = ['work', 'castaway', 'bare'] as const;
type Outfit = (typeof OUTFITS)[number];
const EYES = ['googly', 'flat', 'bead'] as const; // assets/src/hero-rig.py, "Face"
const SHADES = ['matte', 'plastic', 'clay'] as const;
const q = new URLSearchParams(location.search);
const pick = <T extends string>(list: readonly T[], key: string) => {
  const v = q.get(key) as T | null;
  return v && list.includes(v) ? v : list[0];
};
const FADE_IN = 0.12; // s: the clip takes over quickly (its first keys are an anticipation dip)
const FADE_OUT = 0.3; // s: and hands back to the code pose softly

async function build() {
  const { loadAsset } = await import('../render/assets.ts');
  const [rig, castaway] = await Promise.all([loadAsset(rigUrl), loadAsset(castawayUrl)]);
  const holder = rig.instance('hero');
  const root = holder.children[0];
  const bone = (n: string) => {
    const b = root.getObjectByName(n);
    if (!b) throw new Error('hero-rig: no bone ' + n);
    return b;
  };

  // Outfits. Clothes are separate parts (`wear_<slot>_<item>_...`, assets/src/hero-rig.py) over a complete bare
  // figure. The work outfit comes in the hero's own file; another outfit's file has the same armature, so each of its
  // wear_ parts moves onto the hero's bone of the same name, keeping its transform (the rest poses match). Clothes win
  // over the body: a head item hides the top of the head, a feet item the bare feet, so nothing pokes through.
  const wear = (from: THREE.Object3D) => {
    const parts: THREE.Object3D[] = [];
    from.traverse((o) => {
      if (o.name.startsWith('wear_')) parts.push(o);
    });
    return parts;
  };
  const outfits: Record<Outfit, THREE.Object3D[]> = { work: wear(root), castaway: [], bare: [] };
  for (const part of wear(castaway.instance())) {
    bone(part.parent!.name).add(part);
    outfits.castaway.push(part);
  }
  const covers = { head: [bone('crown_part')], feet: ['foot_l_part', 'foot_r_part'].map(bone) };
  let outfit: Outfit = 'work';
  const dress = (name: Outfit) => {
    outfit = name;
    for (const parts of Object.values(outfits)) for (const p of parts) p.visible = false;
    for (const p of outfits[name]) p.visible = true;
    for (const [slot, regions] of Object.entries(covers)) {
      const worn = outfits[name].some((p) => p.name.startsWith(`wear_${slot}_`));
      for (const r of regions) r.visible = !worn;
    }
  };
  dress(pick(OUTFITS, 'hero'));

  // Eye styles: one shows (&eyes=<style>), and its pupils are the ones that look at you.
  const eyes = pick(EYES, 'eyes');
  const pupils: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (!o.name.startsWith('eyes_')) return;
    o.visible = o.name.startsWith(`eyes_${eyes}_`);
    if (o.visible && o.name.includes('_pupil_')) pupils.push(o);
  });

  const y = groundHeight(AT.x, AT.z);
  holder.position.set(AT.x, y, AT.z);
  // Shading (&shade=<name>). Every one adds a cool rim of sky light, the soft edge the previz renders have and the
  // game's lighting lacks: (1 - N.V)^p, so it shows only where a surface turns away from the camera. The body's own
  // material (the player's colour) then differs:
  // - matte: as exported (roughness 0.5).
  // - plastic: glossy vinyl (Astro Bot): roughness 0.22 for a tight highlight, a stronger, sharper rim.
  // - clay: soft and chalky (Fall Guys' fuzzy jelly): roughness 0.9, shade lifted by a little of its own colour, and a
  //   warm edge, as if light scattered through it.
  const shade = pick(SHADES, 'shade');
  const edge = float(1).sub(normalView.dot(positionViewDirection).saturate());
  const rim = edge
    .pow(shade === 'plastic' ? 2.5 : 3)
    .mul(color('#cfe6ff'))
    .mul(shade === 'plastic' ? 0.6 : 0.45);
  const bodyMat = (bone('body_part') as THREE.Mesh).material as THREE.MeshStandardNodeMaterial;
  const patched = new Set<THREE.Material>();
  holder.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | undefined;
    if (!m || patched.has(m)) return;
    patched.add(m);
    patchNode(m, 'emissiveNode', (prev) => (prev ?? vec3(0)).add(rim));
  });
  // Eye whites stay white: warm sun and grading tint them peach (eggs, not eyes), so they glow a little on their own.
  const whites = (bone('eyes_googly_white_l_part') as THREE.Mesh).material as THREE.MeshStandardNodeMaterial;
  patchNode(whites, 'emissiveNode', (prev) => prev.add(vec3(0.35)));
  if (shade === 'plastic') bodyMat.roughness = 0.22;
  if (shade === 'clay') {
    bodyMat.roughness = 0.9;
    const own = color(bodyMat.color.clone());
    patchNode(bodyMat, 'emissiveNode', (prev) =>
      prev.add(own.mul(0.12)).add(edge.pow(2).mul(color('#ffb48a')).mul(0.22)),
    );
  }
  scene.add(holder);
  await precompile(holder);

  const bones = ['root', 'hips', 'body', 'arm_l', 'arm_r', 'forearm_l', 'forearm_r', 'hand_l', 'hand_r'].map(bone);
  const [, hips, body, armL, armR, forearmL, forearmR] = bones;
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
        verb: 'Change clothes',
        at,
        run: () => {
          dress(OUTFITS[(OUTFITS.indexOf(outfit) + 1) % OUTFITS.length]);
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
    dress,
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
