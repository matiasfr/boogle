// How the sky's light fades with depth in the caves, shared by the rock (index.ts) and the props (decor.ts).
import * as THREE from 'three/webgpu';
import { attribute } from 'three/tsl';
import { patchNode } from '../../render/material-patch.ts';
import { MOUTHS } from './network.ts';

// Ambient light reaching the rock, by distance from the nearest mouth: daylight at the mouth, AMB_DEEP of it from
// AMB_FAR metres in. Baked into the mesh, so the inside reads dark from outside too (the sky's light is global).
const AMB_NEAR = 2,
  AMB_FAR = 14,
  AMB_DEEP = 0.6;

// Ambient (sky) light reaching a point at world (x, z): 1 at the mouths, AMB_DEEP deep in. Fill it into an aAmb vertex
// attribute for any cave mesh drawn with withCaveAmbient, so it darkens with depth like the rock.
export function ambAt(x: number, z: number) {
  let mouthD = Infinity;
  for (const mo of MOUTHS) mouthD = Math.min(mouthD, Math.hypot(x - mo.x, z - mo.z));
  return 1 - (1 - AMB_DEEP) * THREE.MathUtils.smoothstep(mouthD, AMB_NEAR, AMB_FAR);
}

// Scales the sky's ambient (hemisphere) light by the geometry's aAmb attribute; lanterns and the sun are not.
// aoNode multiplies the indirect diffuse light, which here is only the hemisphere light.
const aAmb = attribute('aAmb', 'float');
export function withCaveAmbient<M extends object>(mat: M) {
  return patchNode(mat, 'aoNode', (prev) => (prev ? prev.mul(aAmb) : aAmb));
}
