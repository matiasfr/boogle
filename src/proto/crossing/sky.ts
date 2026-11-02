// Making the world's far distance reach (?proto=crossing): runtime only, under the flag, nothing in core changes.
// - The far plane: the game's 1500 m would clip the far island and the sea. The near plane comes up with it, which is
//   what buys depth precision at 4 km.
// - The fog: src/render/sky.ts rewrites near and far every frame (110-520 m), so this hook sets them after it.
// - The sea: the game's plane is a fixed 1300 m square. A flat sea in four rectangles fills everything around it out to
//   where the fog is solid, in the same colour; its hole overlaps the plane's edge from just under the lowest wave, so
//   the two never fight in the depth buffer and no sky shows through the join.
import * as THREE from 'three/webgpu';
import {
  Fn,
  cos,
  float,
  max,
  mix,
  normalize,
  positionWorld,
  cameraPosition,
  pow,
  dot,
  sin,
  vec3,
  vec4,
} from 'three/tsl';
import { FOG_FAR } from '../../constants.ts';
import { onFrame } from '../../loop.ts';
import { camera, scene } from '../../render/scene.ts';
import { seaU } from '../../render/water-render.ts';
import { LENGTH } from './line.ts';
import { CROSSING } from './tuning.ts';

const lin = (hexR: number, g: number, b: number) => {
  const c = new THREE.Color().setRGB(hexR, g, b, THREE.SRGBColorSpace);
  return vec3(c.r, c.g, c.b);
};
// The colour the game's sea reaches at its edge (MID towards DEEP in water-render.ts, found by eye against it).
const OPEN = mix(lin(0.1, 0.7, 0.8), lin(0.05, 0.38, 0.64), 0.83);

export function extendSky() {
  camera.far = CROSSING.fogFar * 1.3;
  camera.near = 0.25;
  camera.updateProjectionMatrix();
  // day-night.ts runs updateSky at update -5.
  onFrame(
    () => {
      const fog = scene.fog as THREE.Fog;
      if (fog.far !== FOG_FAR) return; // in a cave: keep its close fog
      fog.near = CROSSING.fogNear;
      fog.far = CROSSING.fogFar;
    },
    { phase: 'update', order: -4 },
  );

  // Transparent like the game's sea, at its opacity, so the two match where they meet.
  const mat = new THREE.MeshBasicNodeMaterial({ transparent: true });
  mat.colorNode = Fn(() => {
    const t = seaU.uTime;
    const p = positionWorld.xz;
    const n1 = sin(p.x.mul(0.43).add(t.mul(1.2))).mul(cos(p.y.mul(0.37).sub(t.mul(0.9))));
    const n2 = sin(p.x.add(p.y).mul(1.1).sub(t.mul(1.9)));
    const n3 = cos(p.x.sub(p.y).mul(0.8).add(t.mul(1.4)));
    const nrm = normalize(vec3(n1.mul(0.12).add(n2.mul(0.06)), 1, n3.mul(0.06).sub(n1.mul(0.08))));
    const view = normalize(cameraPosition.sub(positionWorld));
    const spec = pow(max(dot(nrm, normalize(seaU.uSun.add(view))), 0), 140);
    const fres = pow(float(1).sub(max(view.y, 0)), 4);
    const col = mix(OPEN, seaU.uSky, fres.mul(0.45)).mul(seaU.uLight);
    return vec4(col.add(seaU.uSpecCol.mul(spec).mul(0.9)), 0.97);
  })();
  const E = LENGTH + CROSSING.fogFar + 500,
    H = 645; // the game's sea reaches 650 m from the origin
  const rects = [
    [-E, E, -E, -H],
    [-E, E, H, E],
    [-E, -H, -H, H],
    [H, E, -H, H],
  ];
  for (const r of rects) {
    const [x0, x1, z0, z1] = r as [number, number, number, number];
    const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, mat);
    m.position.set((x0 + x1) / 2, -0.15, (z0 + z1) / 2);
    scene.add(m);
  }
}
