import * as THREE from 'three';
import { COLORS, PLAYER_R, HEAD_OFFSET } from '../constants.ts';
import { clamp, lerp } from '../math.ts';
import { warmUp } from '../render/precompile.ts';
import { playMark } from '../proto/mark.ts';

const eyeGeo = new THREE.SphereGeometry(0.12, 12, 8);
const pupilGeo = new THREE.SphereGeometry(0.055, 10, 6);
const eyeMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 });
const pupilMat = new THREE.MeshStandardMaterial({ color: '#13243f', roughness: 0.3 });
const capsuleGeo = new THREE.CapsuleGeometry(PLAYER_R, HEAD_OFFSET, 6, 16);

/** What animateAvatar keeps on an avatar (group.userData). */
/**
 * leanScale: how much of feel.ts's whole-body lean this avatar takes (1 when unset; a skin with its own lean sets 0).
 * What a skin offers the game (unset on the capsule): loadFit, how a haul bundle sits on this body (src/features/haul-stack.ts);
 * handSocket, where held things hang (src/features/held.ts); flopY, the inner group's height lying flat (src/features/impact.ts).
 * What the game tells a skin: load, pieces carried; holdKind, what's in hand; flopAmt, 0..1 flopped over; seatedAt, when it
 * was last seated in a vehicle; aloft, both hands holding something up over its head. All render only.
 */
export type AvatarData = {
  inner: THREE.Group;
  mat: THREE.MeshStandardMaterial;
  phase: number;
  colorIdx: number;
  leanScale?: number;
  loadFit?: { frame: THREE.Object3D; back: number; floor: number; len: number; round: boolean };
  handSocket?: THREE.Object3D;
  flopY?: number;
  load?: number;
  holdKind?: 'item' | 'hang' | 'ball' | null;
  flopAmt?: number;
  seatedAt?: number;
  aloft?: boolean;
};
export type Avatar = THREE.Group & { userData: AvatarData };

/**
 * Another body for every avatar (the Buddy: src/player/buddy/body.ts). `dress` is called once
 * per avatar (on every new one, and on the ones already there when the skin is set): it hides the capsule and adds its
 * own figure inside `inner`, so the bob, the squash spring and the flops (src/features/feel.ts) still move it.
 * `animate` runs after the bob each frame, to pose limbs. Render only.
 */
export type AvatarSkin = {
  dress(a: Avatar, colorIdx: number): void;
  animate(a: Avatar, speed: number, airborne: boolean, dt: number, swimming: boolean): void;
};
let skin: AvatarSkin | null = null;
const forcedCapsule = new URLSearchParams(location.search).get('body') === 'capsule';
let fallbackReason: 'load-error' | 'load-deadline' | null = null;
let ready!: () => void;
/** Loading waits for Buddy, a genuine failure, or the recoverable loading deadline. */
export const avatarReady = new Promise<void>((resolve) => {
  ready = resolve;
});
if (forcedCapsule) ready();
// Local presentation only. Includes the sky-card preview and avatars arriving while the model is loading.
const waiting = new Set<Avatar>();
const roles = new WeakMap<Avatar, 'local' | 'preview'>();
function shown(a: Avatar, body: 'buddy' | 'capsule' | 'hidden', reason: string) {
  const role = roles.get(a);
  if (role) playMark('avatar shown', { role, body, reason });
}
export function setAvatarSkin(s: AvatarSkin) {
  if (forcedCapsule) return false;
  if (skin) return skin === s; // a completed load owns the skin; never dress an avatar twice
  for (const a of waiting) {
    s.dress(a, a.userData.colorIdx);
    a.userData.inner.visible = true;
    shown(a, 'buddy', fallbackReason ? 'recovered' : 'ready');
  }
  skin = s;
  fallbackReason = null;
  waiting.clear();
  ready();
  return true;
}

/** Permit entry without cancelling preparation; late success still dresses every waiting avatar. */
export function failAvatarSkin(reason: 'load-error' | 'load-deadline' = 'load-error') {
  if (skin) return;
  fallbackReason = reason;
  for (const a of waiting) {
    a.userData.inner.visible = true;
    shown(a, 'capsule', reason);
  }
  ready();
}

// A little of a Buddy's own colour as light, so its shaded side and a night-time Buddy still read as that player.
export const AVATAR_FILL = 0.15;
export function paintAvatar(mat: THREE.MeshStandardMaterial, colorIdx: number, fill = AVATAR_FILL) {
  mat.color.set(COLORS[colorIdx]!);
  mat.emissive.copy(mat.color);
  mat.emissiveIntensity = fill;
}

// Group origin is the center of the foot sphere; the avatar faces -Z at rotation 0.
export function makeAvatar(colorIdx: number, role?: 'local' | 'preview'): Avatar {
  const group = new THREE.Group();
  const inner = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.55 });
  paintAvatar(mat, colorIdx);
  const body = new THREE.Mesh(capsuleGeo, mat);
  body.position.y = HEAD_OFFSET / 2;
  body.castShadow = true;
  inner.add(body);
  for (const sx of [-0.16, 0.16]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(sx, 0.95, -0.37);
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(sx, 0.95, -0.47);
    inner.add(eye, pupil);
  }
  group.add(inner);
  group.userData = { inner, mat, phase: 0, colorIdx } satisfies AvatarData;
  const avatar = group as Avatar;
  if (role) roles.set(avatar, role);
  inner.visible = !!skin || forcedCapsule || fallbackReason !== null;
  if (!skin && !forcedCapsule) waiting.add(avatar);
  skin?.dress(avatar, colorIdx);
  shown(
    avatar,
    skin ? 'buddy' : inner.visible ? 'capsule' : 'hidden',
    skin ? 'ready' : forcedCapsule ? 'requested-capsule' : (fallbackReason ?? 'loading'),
  );
  return avatar;
}

export function animateAvatar(avatar: Avatar, speed: number, airborne: boolean, dt: number, swimming = false) {
  const u = avatar.userData;
  const moving = clamp(speed / 5, 0, 1.6);
  u.phase += dt * (4 + speed * 1.6);
  u.inner.position.y = airborne ? 0.05 : Math.abs(Math.sin(u.phase)) * 0.09 * moving;
  u.inner.rotation.x = lerp(u.inner.rotation.x, -0.16 * Math.min(moving, 1), 1 - Math.exp(-dt * 10));
  const squash = airborne ? 1.05 : 1 - Math.abs(Math.cos(u.phase)) * 0.04 * moving;
  u.inner.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
  skin?.animate(avatar, speed, airborne, dt, swimming);
}

export function makeLabel(text: string) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.font = '700 30px Figtree, system-ui, sans-serif';
  const w = Math.min(248, g.measureText(text).width + 30);
  g.fillStyle = 'rgba(12, 28, 52, 0.62)';
  g.beginPath();
  if (g.roundRect) g.roundRect((256 - w) / 2, 10, w, 44, 22);
  else (g as CanvasRenderingContext2D).rect((256 - w) / 2, 10, w, 44);
  g.fill();
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 33, 230);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(1.9, 0.475, 1);
  sprite.position.y = 2.05;
  sprite.renderOrder = 10;
  return sprite;
}

// A player (and a name label) appears the moment someone joins: build their pipelines behind the lobby instead.
warmUp(() => {
  const g = new THREE.Group();
  g.add(makeAvatar(0), makeLabel('Boogle'));
  return g;
});
