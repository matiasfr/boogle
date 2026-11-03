// Five opaque merged groups, not a volume or a full-screen noise field. Research recommendation 3.
// Camera-relative sky scenery: continuous slow orbit, no wrap/respawn boundary and no origin-ring gap at sea.
import * as THREE from 'three/webgpu';
import { dot, mix, normalWorld, smoothstep as ss, uniform } from 'three/tsl';
import { defineKind, spawn } from '../../entity/entity.ts';
import { smoothstep } from '../../math.ts';
import { addPart, clouds, mergeParts } from '../../render/props.ts';
import { camera } from '../../render/scene.ts';
import { skyNow } from '../../render/sky.ts';

const PALETTE = {
  top: new THREE.Color('#fffdf7'),
  base: new THREE.Color('#9ab6dc'),
  setTop: new THREE.Color('#ffca9e'),
  setBase: new THREE.Color('#9b7998'),
  nightTop: new THREE.Color('#526b99'),
  nightBase: new THREE.Color('#283b63'),
};
const lit = uniform(PALETTE.top.clone());
const shade = uniform(PALETTE.base.clone());
const lightDir = uniform(new THREE.Vector3());
defineKind('sky-clouds', { update: -1 });

export function createSkyClouds() {
  for (const cloud of clouds) cloud.visible = false;
  const root = new THREE.Group();
  const mat = new THREE.MeshBasicNodeMaterial({ fog: false });
  const wrap = normalWorld.y.mul(0.65).add(dot(normalWorld, lightDir).mul(0.35));
  mat.colorNode = mix(shade, lit, ss(-0.55, 0.7, wrap));
  const puff = new THREE.SphereGeometry(1, 20, 12);
  // Low wide bases, three taller crowns and smaller shoulders: irregular silhouettes, not a row of equal beads.
  const lobes = [
    [-15, 0, 0, 13, 6, 10],
    [-3, 0, 1, 17, 7, 12],
    [13, 0, 0, 14, 6, 10],
    [-10, 4, 0, 10, 10, 10],
    [2, 7, -1, 12, 13, 11],
    [14, 3, 1, 10, 9, 9],
    [-23, -1, 1, 8, 5, 7],
    [24, -1, 0, 7, 5, 7],
  ] as const;
  const matrix = new THREE.Matrix4();
  const parts: THREE.BufferGeometry[] = [];
  for (const [x, y, z, sx, sy, sz] of lobes) {
    matrix.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));
    addPart(parts, puff, matrix, '#ffffff');
  }
  const geo = mergeParts(parts);
  for (const part of parts) part.dispose();
  puff.dispose();
  const groups = [
    { angle: 0.05, radius: 280, height: 85, scale: 1.15 },
    { angle: 0.85, radius: 310, height: 105, scale: 1.35 },
    { angle: 2.3, radius: 260, height: 100, scale: 1.1 },
    { angle: 4.1, radius: 300, height: 80, scale: 1.3 },
    { angle: 5.4, radius: 65, height: 195, scale: 1.0 },
  ].map((layout) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.setScalar(layout.scale);
    root.add(mesh);
    return { ...layout, mesh };
  });
  let drift = 0;
  spawn({
    kind: 'sky-clouds',
    mesh: root,
    update({ dt }) {
      root.position.copy(camera.position);
      drift += dt * 0.0012; // about 0.35 m/s at the horizon groups; no jump at camera/world boundaries
      for (const g of groups) {
        const angle = g.angle + drift;
        g.mesh.position.set(Math.sin(angle) * g.radius, g.height, -Math.cos(angle) * g.radius);
        g.mesh.rotation.y = -angle; // broad silhouette toward the camera, including as the group drifts
      }
      const y = skyNow.sunDir.y;
      const warm = smoothstep(-0.3, -0.02, y) * (1 - smoothstep(0.16, 0.5, y));
      lit.value.copy(PALETTE.nightTop).lerp(PALETTE.top, skyNow.day).lerp(PALETTE.setTop, warm);
      shade.value.copy(PALETTE.nightBase).lerp(PALETTE.base, skyNow.day).lerp(PALETTE.setBase, warm);
      lightDir.value.copy(skyNow.moonDir).lerp(skyNow.sunDir, skyNow.day).normalize();
    },
  });
}
