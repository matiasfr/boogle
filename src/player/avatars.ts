import * as THREE from 'three';
import { COLORS, PLAYER_R, PLAYER_MASS, HEAD_OFFSET } from '../constants.ts';
import { clamp, lerp } from '../math.ts';
import { playerMat, NOT_SCENERY } from '../physics/physics.ts';
import { createBody, BODY } from '../physics/engine.ts';
import { warmUp } from '../render/precompile.ts';

const eyeGeo = new THREE.SphereGeometry(0.12, 12, 8);
const pupilGeo = new THREE.SphereGeometry(0.055, 10, 6);
const eyeMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 });
const pupilMat = new THREE.MeshStandardMaterial({ color: '#13243f', roughness: 0.3 });
const capsuleGeo = new THREE.CapsuleGeometry(PLAYER_R, HEAD_OFFSET, 6, 16);

/** What animateAvatar keeps on an avatar (group.userData). */
export type AvatarData = { inner: THREE.Group; mat: THREE.MeshStandardMaterial; phase: number };
export type Avatar = THREE.Group & { userData: AvatarData };

// Group origin is the center of the foot sphere; the avatar faces -Z at rotation 0.
export function makeAvatar(colorIdx: number): Avatar {
  const group = new THREE.Group();
  const inner = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: COLORS[colorIdx], roughness: 0.55 });
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
  group.userData = { inner, mat, phase: 0 } satisfies AvatarData;
  return group as Avatar;
}

export function animateAvatar(avatar: Avatar, speed: number, airborne: boolean, dt: number) {
  const u = avatar.userData;
  const moving = clamp(speed / 5, 0, 1.6);
  u.phase += dt * (4 + speed * 1.6);
  u.inner.position.y = airborne ? 0.05 : Math.abs(Math.sin(u.phase)) * 0.09 * moving;
  u.inner.rotation.x = lerp(u.inner.rotation.x, -0.16 * Math.min(moving, 1), 1 - Math.exp(-dt * 10));
  const squash = airborne ? 1.05 : 1 - Math.abs(Math.cos(u.phase)) * 0.04 * moving;
  u.inner.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
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

export function makePlayerBody(kinematic: boolean) {
  return createBody({
    mass: kinematic ? 0 : PLAYER_MASS,
    type: kinematic ? BODY.KINEMATIC : BODY.DYNAMIC,
    material: playerMat,
    fixedRotation: true,
    mask: kinematic ? NOT_SCENERY : -1, // remote players are moved by the network, not by the ground
    shapes: [
      { kind: 'sphere', r: PLAYER_R },
      { kind: 'sphere', r: PLAYER_R, offset: { x: 0, y: HEAD_OFFSET, z: 0 } },
    ],
  });
}

// A player (and a name label) appears the moment someone joins: build their pipelines behind the lobby instead.
warmUp(() => {
  const g = new THREE.Group();
  g.add(makeAvatar(0), makeLabel('Boogle'));
  return g;
});
