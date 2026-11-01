// Prototype: play as the jointed hero (?proto=hero; the character from assets/src/hero-rig.py, src/player/hero.ts).
// Every avatar, yours and everyone else's in the tab, is dressed as the hero in its player's colour, inside the
// avatar's `inner` group, so the bob, the squash spring and the flops of src/features/feel.ts move it as they moved
// the capsule. On top, code poses the limbs each frame from speed and airborne alone (so remote players get it free,
// with no new presence): a run cycle whose stride follows distance (feet don't skate), arms counter-swinging with bent
// elbows, a roll of the body with each step; in the air, arms up and out and one knee tucked; at rest, arms hanging
// and a slow sway; and a blink every few seconds. &hero=, &eyes=, &shade= pick the look (src/player/hero.ts).
// The gut question: does running, jumping and landing as this character feel good enough to keep it?
// Serves DESIGN.md 1 (moving around is a toy) and 10 (slapstick over precision). Sync kind: Local (render only).
import * as THREE from 'three/webgpu';
import { COLORS, PLAYER_R } from '../constants.ts';
import { clamp } from '../math.ts';
import { me } from '../player/player.ts';
import { remotes } from '../netplay/net.ts';
import { setAvatarSkin, type Avatar } from '../player/avatars.ts';
import { precompile } from '../render/precompile.ts';
import type { Hero, BoneName } from '../player/hero.ts';

const RUN = {
  stride: 2.0, // m travelled per full cycle (two steps): short legs, quick steps
  thigh: 40, // degrees of leg swing at full speed
  knee: 55, // degrees the knee folds as the leg swings forward
  arm: 45, // degrees of arm swing
  elbow: 35, // degrees the elbows bend, on top of a resting 15
  roll: 4, // degrees the body rolls towards the planted foot
  full: 6, // m/s at which the cycle reaches full size (sprint goes a bit past)
};
const EASE = { ground: 0.06, air: 0.1 }; // s: how fast limbs reach their target pose (exponential, time constant)
const BLINK = { every: [2.5, 5.5], ms: 110 };
const D = Math.PI / 180;

type Pose = { hero: Hero; phase: number; x: Record<string, number>; z: Record<string, number>; blink: number };
const poses = new WeakMap<Avatar, Pose>();

function animate(a: Avatar, speed: number, airborne: boolean, dt: number) {
  const p = poses.get(a);
  if (!p) return;
  const m = clamp(speed / RUN.full, 0, 1.3);
  p.phase += (dt * speed * 2 * Math.PI) / RUN.stride;
  const s = Math.sin(p.phase),
    c = Math.cos(p.phase);
  // Targets in degrees per bone: x swings a hanging limb forward, z swings it out to its own side (the sign per side
  // is applied below).
  const x: Partial<Record<BoneName, number>> = {};
  const z: Partial<Record<BoneName, number>> = {};
  if (airborne) {
    Object.assign(x, { arm_l: -10, arm_r: -10, forearm_l: 15, forearm_r: 15, thigh_l: 35, shin_l: -60, thigh_r: -8 });
    Object.assign(x, { shin_r: -20, foot_l: 20, body: -4 });
    Object.assign(z, { arm_l: 70, arm_r: 70 });
  } else {
    const idle = 1 - Math.min(1, m * 3);
    const sway = Math.sin(performance.now() / 900) * idle;
    Object.assign(x, {
      thigh_l: RUN.thigh * m * s,
      thigh_r: -RUN.thigh * m * s,
      shin_l: -RUN.knee * m * Math.max(0, c),
      shin_r: -RUN.knee * m * Math.max(0, -c),
      arm_l: -RUN.arm * m * s + 3 * sway,
      arm_r: RUN.arm * m * s - 3 * sway,
      forearm_l: 15 + RUN.elbow * m,
      forearm_r: 15 + RUN.elbow * m,
    });
    // Feet stay nearer level than the leg above them, so the sole meets the ground flat.
    x.foot_l = -0.6 * (x.thigh_l! + x.shin_l!);
    x.foot_r = -0.6 * (x.thigh_r! + x.shin_r!);
    Object.assign(z, { arm_l: 6 + 10 * m, arm_r: 6 + 10 * m, body: RUN.roll * m * s + 2 * sway });
  }
  const k = 1 - Math.exp(-dt / (airborne ? EASE.air : EASE.ground));
  for (const [name, bone] of Object.entries(p.hero.bones) as [BoneName, THREE.Object3D][]) {
    const out = name.endsWith('_l') ? 1 : name.endsWith('_r') ? -1 : 1;
    p.x[name] = (p.x[name] ?? 0) + ((x[name] ?? 0) - (p.x[name] ?? 0)) * k;
    p.z[name] = (p.z[name] ?? 0) + ((z[name] ?? 0) * out - (p.z[name] ?? 0)) * k;
    bone.rotation.set(p.x[name] * D, 0, p.z[name] * D);
  }
  // Blink: the eyes vanish for a moment, leaving the smooth face, which reads as closed.
  p.blink -= dt * 1000;
  const shut = p.blink < 0;
  for (const e of p.hero.eyeParts) e.visible = !shut;
  if (p.blink < -BLINK.ms) p.blink = (BLINK.every[0] + Math.random() * (BLINK.every[1] - BLINK.every[0])) * 1000;
}

async function start() {
  const { loadHeroKit } = await import('../player/hero.ts');
  const kit = await loadHeroKit();
  await precompile(kit.make(COLORS[0]).holder); // shaders compile now, not when the first player appears
  const dress = (a: Avatar, colorIdx: number) => {
    if (poses.has(a)) return;
    const hero = kit.make(COLORS[colorIdx]);
    for (const child of a.userData.inner.children) child.visible = false; // the capsule and its eyes
    hero.holder.position.y = -PLAYER_R; // the avatar's origin is the centre of its foot sphere
    a.userData.inner.add(hero.holder);
    // Colour changes (a remote's presence, the rename card) set the avatar's material: make that the hero's body.
    a.userData.mat = hero.mat as unknown as THREE.MeshStandardMaterial;
    poses.set(a, { hero, phase: 0, x: {}, z: {}, blink: 1500 + Math.random() * 3000 });
  };
  setAvatarSkin({ dress, animate }, [me.avatar, ...[...remotes.values()].map((r) => r.avatar)]);
}

if (new URLSearchParams(location.search).get('proto') === 'hero') start();
