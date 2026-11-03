// Making the world's far distance reach (?proto=crossing): runtime only, under the flag.
// - The far plane: the game's 1500 m would clip the far island and the sea. The near plane comes up with it, which is
//   what buys depth precision at 4 km.
// - The fog: src/render/sky.ts rewrites near and far every frame (110-520 m), so this hook sets them after it.
// - The sea: the game's plane is a fixed 1300 m square. A flat sea in four rectangles fills everything around it out to
//   where the fog is solid, with the plane's own material (./sea.ts); its hole overlaps the plane's edge, just under it,
//   so the two never fight in the depth buffer and no sky shows through the join.
// - The day: the palette of previz shot 2 over the game's sky (holdDay).
import * as THREE from 'three/webgpu';
import { FOG_FAR } from '../../constants.ts';
import { onFrame } from '../../loop.ts';
import { lerp, smoothstep } from '../../math.ts';
import { clouds } from '../../render/props.ts';
import { camera, scene, sun } from '../../render/scene.ts';
import { skyColors, skyNow, skyU, sunU } from '../../render/sky.ts';
import { seaU, waterMat } from '../../render/water-render.ts';
import { newWaterEnabled } from '../../render/water/flags.ts';
import { LENGTH } from './line.ts';
import { CROSSING, LOOK } from './tuning.ts';

// The day: the prototype's palette, over what updateSky has just set. Full above DAY_HIGH and gone below DAY_LOW, so the
// late morning stays clean; below that the game's own golden hour takes over, and its moonlit night is untouched.
const DAY_LOW = 0.12,
  DAY_HIGH = 0.27,
  HEMI_I = 1.2,
  GAME_CURVE = 0.6; // src/render/sky.ts
const DAY = {
  top: new THREE.Color(LOOK.skyTop),
  horizon: new THREE.Color(LOOK.skyHorizon),
  fog: new THREE.Color(LOOK.fog),
  glow: new THREE.Color('#ffd27a').multiplyScalar(0.25), // only a tight halo: the shot's sky stays blue around the sun
  sun: new THREE.Color('#fff3da'),
  disc: new THREE.Color(1, 0.9, 0.7).multiplyScalar(3),
  hemiSky: new THREE.Color('#e8f0ff'),
  hemiGround: new THREE.Color('#f0d9a0'),
  cloudGlow: new THREE.Color('#d8ecff'),
  white: new THREE.Color(1, 1, 1),
};
const hemi = scene.children.find((o) => (o as THREE.HemisphereLight).isHemisphereLight) as
  THREE.HemisphereLight | undefined;
export function holdDay() {
  if (newWaterEnabled) return; // fixed atmosphere owns its matching real light; route fog is still applied below
  const y = skyNow.sunDir.y,
    d = smoothstep(DAY_LOW, DAY_HIGH, y);
  skyU.uCurve.value = lerp(GAME_CURVE, LOOK.skyCurve, d);
  if (d <= 0) return;
  skyColors.top.lerp(DAY.top, d);
  skyColors.horizon.lerp(DAY.horizon, d);
  (skyU.uGlow.value as THREE.Color).lerp(DAY.glow, d);
  (sunU.uCol.value as THREE.Color).lerp(DAY.disc, d);
  sun.color.lerp(DAY.sun, d);
  sun.intensity += (LOOK.sunI + (LOOK.sunNoonI - LOOK.sunI) * smoothstep(0.3, 0.8, y) - sun.intensity) * d;
  if (hemi) {
    hemi.color.lerp(DAY.hemiSky, d);
    hemi.groundColor.lerp(DAY.hemiGround, d);
    hemi.intensity += (HEMI_I - hemi.intensity) * d;
  }
  (seaU.uLight.value as THREE.Color).lerp(DAY.white, d);
  (seaU.uSpecCol.value as THREE.Color).lerp(DAY.sun, d);
  clouds[0]?.material.emissive.lerp(DAY.cloudGlow, d);
}

export function extendSky() {
  camera.far = CROSSING.fogFar * 1.3;
  camera.near = 0.25;
  camera.updateProjectionMatrix();
  // day-night.ts runs updateSky at update -5.
  onFrame(
    () => {
      holdDay();
      const fog = scene.fog as THREE.Fog;
      if (fog.far !== FOG_FAR) return; // in a cave: keep its close fog
      fog.color.lerpColors(skyColors.horizon, DAY.fog, smoothstep(DAY_LOW, DAY_HIGH, skyNow.sunDir.y));
      fog.near = CROSSING.fogNear;
      fog.far = CROSSING.fogFar;
    },
    { phase: 'update', order: -4 },
  );

  if (newWaterEnabled) return; // the range-fitted polar sea already covers this route
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
    const m = new THREE.Mesh(geo, waterMat);
    m.position.set((x0 + x1) / 2, -0.15, (z0 + z1) / 2);
    scene.add(m);
  }
}
