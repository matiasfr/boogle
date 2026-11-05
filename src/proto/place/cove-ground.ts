// Local, flag-only sandstone coverage on the existing, unchanged heightfield triangles.
import * as THREE from 'three/webgpu';
import {
  attribute,
  float,
  fract,
  mix,
  normalFlat,
  normalViewGeometry,
  positionWorld,
  sin,
  smoothstep,
  vec3,
  vertexColor,
} from 'three/tsl';
import { patchNode } from '../../render/material-patch.ts';
import { COVE_CLAY } from './cove.ts';

export function dressCoveGround(geometry: THREE.BufferGeometry, material: THREE.MeshStandardNodeMaterial) {
  const p = geometry.getAttribute('position');
  const indices = geometry.index!;
  const rim = new Float32Array(p.count).fill(8);
  const steep: number[] = [];
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3();
  const seen = new Set<number>();
  for (let k = 0; k < indices.count; k += 3) {
    const ids = [indices.getX(k), indices.getX(k + 1), indices.getX(k + 2)];
    a.fromBufferAttribute(p, ids[0]!);
    b.fromBufferAttribute(p, ids[1]!);
    c.fromBufferAttribute(p, ids[2]!);
    if (a.x < 730 || a.x > 890 || a.z < -25 || a.z > 115) continue;
    const up = b.sub(a).cross(c.sub(a)).normalize().y;
    // Rock begins conservatively at 44 degrees, covering every face beyond the controller's 56.6-degree limit.
    if (up >= 0.72) continue;
    for (const id of ids)
      if (!seen.has(id)) {
        seen.add(id);
        steep.push(id);
      }
  }
  // Distance to the steep region is interpolated across the surface. A continuous inset turf lip replaces
  // per-facet grass decisions; no visual displacement, extra triangles or collision ambiguity.
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i);
    if (x < 735 || x > 885 || z < -20 || z > 110) continue;
    for (const j of steep) {
      const dx = x - p.getX(j),
        dz = z - p.getZ(j);
      if (Math.abs(dx) < 8 && Math.abs(dz) < 8) rim[i] = Math.min(rim[i]!, Math.hypot(dx, dz));
    }
  }
  geometry.setAttribute('coveRim', new THREE.BufferAttribute(rim, 1));
  const w = positionWorld;
  const region = smoothstep(735, 750, w.x)
    .mul(smoothstep(870, 885, w.x).oneMinus())
    .mul(smoothstep(-20, -5, w.z))
    .mul(smoothstep(95, 110, w.z).oneMinus());
  const distance = attribute('coveRim', 'float');
  const grass = smoothstep(0.65, 0.76, distance);
  const lip = smoothstep(0.3, 0.65, distance).mul(grass.oneMinus());
  const bed = fract(
    w.y
      .add(sin(w.x.mul(0.14)).mul(0.12))
      .add(sin(w.z.mul(0.19)).mul(0.16))
      .div(1.45),
  );
  const seam = smoothstep(0.015, 0.055, bed).mul(smoothstep(0.92, 0.99, bed).oneMinus());
  const band = mix(float(0.58), float(1), seam).mul(mix(float(0.88), float(1.07), bed));
  const stone = vec3(0.62, 0.35, 0.12).mul(band);
  const rock = mix(stone, vec3(0.24, 0.14, 0.055), lip.mul(0.8));
  patchNode(material, 'colorNode', (previous) =>
    mix(
      previous ?? vertexColor().rgb,
      COVE_CLAY ? vec3(0.65, 0.63, 0.59) : mix(rock, vertexColor().rgb.mul(0.9), grass),
      region,
    ),
  );
  patchNode(material, 'normalNode', (previous) =>
    mix(
      previous ?? normalViewGeometry,
      mix(normalViewGeometry, normalFlat, grass.oneMinus().mul(0.25)),
      region,
    ).normalize(),
  );
}
