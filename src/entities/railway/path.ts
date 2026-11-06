// The first path's lamps and solid walking approaches, owned and derived from T3 completion.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';

export async function createRailwayPath(owner: OwnedView) {
  const [{ LINKS, railY }, { besideLine }, { addStatic, plank, H }, { flat }, { pop }] = await Promise.all([
    import('../../proto/place/layout.ts'),
    import('../../proto/place/rail.ts'),
    import('../../proto/place/land.ts'),
    import('../../proto/flat.ts'),
    import('../../proto/minis/common.ts'),
  ]);
  const row = new THREE.Group();
  row.visible = false;
  const glow = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(3, 2.1, 0.9) });
  const line = LINKS[0]!.line;
  const slots: { x: number; y: number; z: number }[] = [];
  for (let s = 116; s >= 60; s -= 7)
    for (const side of [-1, 1]) {
      const p = besideLine(line, s, side * 1.72),
        y = railY(line, s);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.12), flat('#5c4530'));
      post.position.set(p.x, y + 0.75, p.z);
      post.castShadow = true;
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), glow);
      light.position.set(p.x, y + 1.55, p.z);
      row.add(post, light);
      slots.push({ x: p.x, y: y + 0.75, z: p.z });
    }
  owner.add(row);
  owner.cleanup(() => glow.dispose());
  let placed = false;
  return {
    update(open: boolean, quiet = false) {
      row.visible = open;
      if (!open || placed) return;
      placed = true;
      // Join the grass beside the parked machine to the actual solid top (rail.ts TOP = 0.1).
      // Reach that height outside the 2.8 m bed before crossing its vertical side collider.
      for (const s of [14, 30]) {
        const foot = besideLine(line, s, 4),
          shoulder = besideLine(line, s, 1.6),
          center = besideLine(line, s, 0);
        const top = railY(line, s) + 0.1;
        plank(foot.x, foot.z, shoulder.x, shoulder.z, H(foot.x, foot.z) - 0.02, top, 2.3, '#8a6236', 0.14, owner);
        plank(shoulder.x, shoulder.z, center.x, center.z, top, top, 2.3, '#8a6236', 0.14, owner);
      }
      for (const at of slots) addStatic({ kind: 'box', hx: 0.06, hy: 0.75, hz: 0.06 }, at, undefined, undefined, owner);
      if (!quiet) pop(4, 0.25);
    },
  };
}
