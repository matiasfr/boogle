// R2b blockout, rail-local: two flat colours, windows and end-door gaps; no final-art fittings.
import * as THREE from 'three/webgpu';
import { merged, type Part } from '../../render/part-geometry.ts';
import { registerBuilder } from '../builders.ts';
import { RIDER_CAR } from '../../entities/railway/cars.ts';
import { TRADE } from '../../sim/railway-trade-layout.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'railway.coach-parts': true;
  }
}
registerBuilder('railway.coach-parts', (p) => {
  const root = new THREE.Group();
  root.name = `rider-coach-${String(p.kind)}`;
  const parts: Part[] = [];
  const material = new THREE.MeshStandardMaterial({ color: p.kind === 'body' ? '#b98a52' : '#2f3131', roughness: 0.9 });
  const box = (x: number, y: number, z: number, w: number, h: number, d: number) => {
    parts.push(['b', x, y, z, w, h, d, '#ffffff']);
  };
  const { hx, hz, top } = RIDER_CAR;
  if (p.kind === 'body') {
    box(0, 0.64, 0, hx * 2, 0.12, hz * 2);
    box(0, top - 0.05, 0, hx * 2, 0.1, hz * 2);
    const openings = TRADE.riderPlaces / 2,
      length = openings * 0.6;
    for (const side of [-1, 1]) {
      box(side * (hx - 0.04), 1, 0, 0.08, 0.6, length);
      box(0, 1, side * (hz - 0.04), hx * 2, 0.6, 0.08);
      box(side * 0.535, 0.81, 0, 0.35, 0.22, length);
      for (let i = 0; i <= openings; i++) box(side * (hx - 0.04), 1.625, (i - openings / 2) * 0.6, 0.08, 0.65, 0.08);
    }
  } else if (p.kind === 'underframe') box(0, 0.49, 0, hx * 2 - 0.2, 0.18, hz * 2);
  else throw new Error('coach-parts: unknown kind');
  const geometry = merged(parts);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = mesh.receiveShadow = true;
  root.add(mesh);
  return {
    object: root,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
});
