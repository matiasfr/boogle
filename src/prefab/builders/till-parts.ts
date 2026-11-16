// Small greybox ticket counter and a ribbed coin column, built through the prefab door.
import * as THREE from 'three/webgpu';
import { merged, type Part } from '../../render/part-geometry.ts';
import { material } from '../../render/materials.ts';
import { registerBuilder } from '../builders.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'railway.till-parts': true;
  }
}
registerBuilder('railway.till-parts', (p) => {
  const parts: Part[] = [];
  if (p.kind === 'counter') {
    parts.push(
      ['b', -0.17, 0.46, 0, 0.8, 0.92, 1, '#654936'],
      ['b', -0.17, 0.96, 0, 0.8, 0.08, 1, '#c59250'],
      // A fixed height gauge and cap stroke beside the column. Neither follows the balance.
      ['b', -0.17, 1.47, -0.32, 0.055, 0.94, 0.055, '#edcf8c'],
      ['b', -0.17, 1.93, 0, 0.055, 0.035, 0.75, '#edcf8c'],
    );
  } else if (p.kind === 'coins') {
    for (let k = 0; k < 18; k++)
      parts.push(['c', 0, (k + 0.5) * 0.05, 0, 0.25, 0.047, 0.25, k % 2 ? '#e6a33e' : '#f6ce65']);
  } else throw new Error('till-parts: unknown kind');
  const geometry = merged(parts);
  const mesh = new THREE.Mesh(geometry, material('stone', { colour: '#ffffff', vertexColours: true }));
  mesh.castShadow = mesh.receiveShadow = true;
  return { object: mesh, dispose: () => geometry.dispose() };
});
