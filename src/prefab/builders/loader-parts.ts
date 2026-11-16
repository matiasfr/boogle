// Rigid loader parts. The view drives named pivots; this builder owns geometry and its private paint.
import * as THREE from 'three/webgpu';
import { registerBuilder } from '../builders.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'railway.loader-parts': true;
  }
}

registerBuilder('railway.loader-parts', (p) => {
  const root = new THREE.Group();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const paint = new THREE.MeshStandardMaterial({ color: '#d8a34a', roughness: 0.85 });
  const iron = new THREE.MeshStandardMaterial({ color: '#494d4e', roughness: 0.9 });
  const stone = new THREE.MeshStandardMaterial({ color: '#d6cfbf', roughness: 1 });
  const box = (
    parent: THREE.Object3D,
    name: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat = paint,
  ) => {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  if (p.kind === 'arm') {
    box(root, 'base', 0, 0.22, 0, 1.25, 0.44, 1.25, iron);
    box(root, 'mast', 0, 1.6, 0, 0.42, 3.2, 0.42);
    const slew = new THREE.Group();
    slew.name = 'slew';
    slew.position.y = 3.2;
    root.add(slew);
    const boom = new THREE.Group();
    boom.name = 'boom';
    slew.add(boom);
    box(boom, 'outer', 0, 0, 0.9, 0.42, 0.42, 1.8);
    box(boom, 'inner', 0, 0, 1.8, 0.25, 0.25, 1.8, iron);
    const hook = new THREE.Group();
    hook.name = 'hook';
    root.add(hook);
    box(hook, 'rope', 0, 0.55, 0, 0.06, 1.1, 0.06, iron);
    box(hook, 'hook-bar', 0, 0, 0, 0.5, 0.12, 0.12);
    for (const x of [-0.22, 0.22]) box(hook, 'hook-tip', x, -0.12, 0, 0.08, 0.28, 0.12, iron);
  } else if (p.kind === 'yard') {
    // On the road-side step, inside the existing 9 m square plinth. The wall remains closed.
    box(root, 'mast', -2.85, 2.2, 4.03, 0.22, 3.4, 0.22);
    box(root, 'jib', -1.9, 3.85, 4.03, 2.1, 0.22, 0.22);
    box(root, 'rope', -0.95, 2.85, 4.03, 0.06, 1.8, 0.06, iron);
    box(root, 'hook', -0.95, 1.96, 4.03, 0.28, 0.12, 0.12, iron);
    for (const x of [-0.95, 0.55]) {
      box(root, 'footing', x, 0.84, 4.03, 0.8, 0.68, 0.8, stone);
      for (const side of [-1, 1]) box(root, 'shoulder', x + side * 0.27, 1.21, 4.03, 0.26, 0.12, 0.8, stone);
      box(root, 'band', x, 0.73, 4.03, 0.82, 0.08, 0.82, iron);
    }
  } else throw new Error('loader-parts: unknown kind');
  return {
    object: root,
    dispose: () => {
      geometry.dispose();
      paint.dispose();
      iron.dispose();
      stone.dispose();
    },
  };
});
