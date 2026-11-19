// Rigid loader parts. The view drives named pivots; this builder owns geometry and its private paint.
import * as THREE from 'three/webgpu';
import { registerBuilder } from '../builders.ts';
import { JIB_SOLIDS, YARD } from '../../place/yard-shape.ts';
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
    // The town yard's jib, in its plot's frame (yard-shape.ts): the Works arm's paint and iron, a mast taller than the
    // shed, the boom out over the footings. It never moves; the view repaints `paint` with the Works arm's.
    const { jib, floor } = YARD;
    // The paint parts share one material the view repaints through the mast.
    for (const b of JIB_SOLIDS)
      box(root, b.name, b.dx, b.dy, b.dz, b.hx * 2, b.hy * 2, b.hz * 2, b.paint ? paint : iron);
    box(root, 'slew', jib.x, jib.top - 0.08, jib.z, 0.62, 0.16, 0.62, iron);
    // Ties from the pinnacle to the boom's ends, thin iron like the arm's rope.
    for (const end of [jib.boomX0 + 0.15, jib.boomX1 - 0.15]) {
      const dy = 0.96,
        dx = end - jib.x,
        tie = box(root, 'tie', jib.x + dx / 2, jib.top + 0.42 + dy / 2, jib.z, Math.hypot(dy, dx), 0.06, 0.06, iron);
      tie.rotation.z = dx < 0 ? Math.atan2(dy, -dx) : -Math.atan2(dy, dx);
    }
    box(root, 'trolley', jib.hookX, jib.top - 0.06, jib.z, 0.4, 0.16, 0.5, iron);
    const rope = jib.top - 0.14 - (floor + jib.hookY);
    box(root, 'rope', jib.hookX, floor + jib.hookY + rope / 2, jib.z, 0.06, rope, 0.06, iron);
    box(root, 'hook-bar', jib.hookX, floor + jib.hookY, jib.z, 0.5, 0.12, 0.12);
    for (const x of [-0.22, 0.22])
      box(root, 'hook-tip', jib.hookX + x, floor + jib.hookY - 0.12, jib.z, 0.08, 0.28, 0.12, iron);
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
