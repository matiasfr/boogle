// Dev-only Local comparison. Preserve the grid, path locations, palette and the owning ground/receiver graphs.
import * as THREE from 'three/webgpu';
import { attribute, float, fwidth, max, smoothstep as ss, vec3 } from 'three/tsl';
import { smoothstep } from '../../math.ts';
import { registerGraphics } from '../../graphics-settings.ts';
import { bind } from '../../render/water/live.ts';
import { registerWaterReceiver } from '../../render/water/receivers.ts';
import { groundMaterial } from './look.ts';
import { NX, NZ, at, cellX, cellZ, gorgeD, heights, pathMask } from './terrain.ts';

export function installGroundEdges(mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardNodeMaterial>) {
  const weights = new Float32Array(NX * NZ * 3);
  const grass = new Float32Array(weights.length);
  const shore = new Float32Array(weights.length);
  const green = new THREE.Color('#6c9a42'),
    green2 = new THREE.Color('#568740');
  const sand = new THREE.Color('#e8d39a'),
    bank = new THREE.Color('#8e9a78');
  const dirt = new THREE.Color('#e0b271');
  const c = new THREE.Color();
  for (let j = 0; j < NZ; j++)
    for (let i = 0; i < NX; i++) {
      const k = at(i, j),
        x = cellX(i),
        z = cellZ(j);
      const path = pathMask[k]!,
        beach = smoothstep(3.2, 1.6, heights[k]!);
      weights.set([(1 - path) * (1 - beach), path, (1 - path) * beach], k * 3);
      c.copy(green).lerp(
        green2,
        0.5 + 0.25 * Math.sin(x * 0.023 + 1) * Math.cos(z * 0.031) + 0.25 * Math.sin(x * 0.071 - z * 0.053),
      );
      grass.set([c.r, c.g, c.b], k * 3);
      c.copy(gorgeD(x, z) < 18 ? bank : sand);
      shore.set([c.r, c.g, c.b], k * 3);
    }
  mesh.geometry.setAttribute('edgeWeights', new THREE.BufferAttribute(weights, 3));
  mesh.geometry.setAttribute('edgeGrass', new THREE.BufferAttribute(grass, 3));
  mesh.geometry.setAttribute('edgeShore', new THREE.BufferAttribute(shore, 3));
  const current = mesh.material;
  const make = (width: number) => {
    const w = attribute('edgeWeights', 'vec3');
    // A Short Hike's strongest-channel selection, filtered by the fragment footprint.
    // Narrow allows a restrained overlap; crisp keeps only a one-pixel tie band.
    const win = (a: typeof w.x, b: typeof w.x, c: typeof w.x) => {
      const d = a.sub(max(b, c));
      const half = max(float(width), fwidth(d).mul(0.75));
      return ss(half.negate(), half, d);
    };
    const g = win(w.x, w.y, w.z),
      p = win(w.y, w.x, w.z),
      s = win(w.z, w.x, w.y);
    const total = g.add(p).add(s).max(0.00001);
    const colour = attribute('edgeGrass', 'vec3')
      .mul(g)
      .add(vec3(dirt.r, dirt.g, dirt.b).mul(p))
      .add(attribute('edgeShore', 'vec3').mul(s))
      .div(total);
    const material = groundMaterial({ colour, path: p.add(s).div(total) });
    registerWaterReceiver(material);
    return material;
  };
  const variants = [current, make(0.4), make(0)];
  let selected = 0;
  const select = (value: number) => {
    if (!Number.isInteger(value) || !variants[value]) throw new Error('Ground edge variant must be 0, 1 or 2');
    selected = value;
    mesh.material = variants[value]!;
  };
  bind(
    'ground.edges',
    () => selected,
    (value) => select(Number(value)),
  );
  registerGraphics({
    id: 'groundEdges',
    label: 'Ground edges comparison',
    choices: [false, true],
    default: false,
    audience: 'dev',
    scope: 'Local',
    applyMode: 'live',
    cost: 'Explicit surface weights and derivative-smoothed selection; no extra pass.',
    skips: 'Off uses the original ground material and graph.',
    read: () => selected !== 0,
    apply: (value) => select(value ? 1 : 0),
  });
}
