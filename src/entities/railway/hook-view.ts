// The production Needle Bell climb: Local static geometry and hook presentation, owned by the railway view.
// Authored numbers/shapes only; never import Place's campaign, moves or tech owners.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Shape } from '../../physics/engine.ts';
import { camera } from '../../render/scene.ts';
import { readableGlow, readableUnlit } from '../../render/readable-unlit.ts';
import { hookRings, type HookRing } from './hook-path.ts';

export async function createRailwayHookView(owner: OwnedView) {
  const [tech, layout, land, shapes, flatMod] = await Promise.all([
    import('../../proto/place/tech-layout.ts'),
    import('../../proto/place/layout.ts'),
    import('../../proto/place/land.ts'),
    import('../../proto/place/part-geometry.ts'),
    import('../../proto/flat.ts'),
  ]);
  const ox = layout.ORIGIN.x;
  const rings = hookRings(tech.PADS, tech.ringAt, ox);
  const ringById = new Map(rings.map((r) => [r.id, r]));
  const geometries: THREE.BufferGeometry[] = [];
  const partMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.75, flatShading: true });
  const glow = readableGlow(
    new THREE.MeshStandardNodeMaterial({
      color: '#39e6c6',
      emissive: '#39e6c6',
      emissiveIntensity: 1.8,
      roughness: 0.3,
    }),
  );
  const ringMat = new THREE.MeshStandardNodeMaterial({ color: '#ffffff', roughness: 0.4 });
  const haloMat = readableUnlit(
    new THREE.MeshBasicNodeMaterial({ color: '#e8fffa', transparent: true, opacity: 0.95 }),
  );
  function add<T extends THREE.Mesh>(m: T) {
    geometries.push(m.geometry);
    owner.add(m);
    return m;
  }
  for (const { pad: p } of rings.slice(1)) {
    const thick = p.look === 'wood' ? 0.4 : 0.9;
    const parts: Parameters<typeof shapes.merged>[0] = [
      ['b', 0, -0.08, 0, p.hx * 2, thick - 0.16, p.hz * 2, '#917b5e'],
      ['b', 0, thick / 2 - 0.08, 0, p.hx * 2, 0.16, p.hz * 2, '#c6b28d'],
      ['b', 0, -thick / 2 + 0.06, 0, p.hx * 2 + 0.04, 0.12, p.hz * 2 + 0.04, '#6f604b'],
    ];
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        parts.push(['b', sx * (p.hx - 0.34), -0.02, sz * p.hz, 0.18, thick - 0.24, 0.045, '#c79a3e']);
    const slab = add(
      p.look === 'wood'
        ? new THREE.Mesh(new THREE.BoxGeometry(p.hx * 2, thick, p.hz * 2), flatMod.flat('#8a6238', 0.9))
        : new THREE.Mesh(shapes.merged(parts), partMat),
    );
    slab.position.set(p.x + ox, p.top - thick / 2, p.z);
    slab.castShadow = slab.receiveShadow = true;
    const tiles: Shape[] = [];
    const nx = Math.ceil(p.hx / 0.75),
      nz = Math.ceil(p.hz / 0.75),
      hx = p.hx / nx,
      hz = p.hz / nz;
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++)
        tiles.push({
          kind: 'box',
          hx,
          hy: thick / 2,
          hz,
          offset: { x: p.x + ox - p.hx + hx * (i * 2 + 1), y: p.top - thick / 2, z: p.z - p.hz + hz * (j * 2 + 1) },
        });
    land.addStatics(tiles, { x: 0, y: 0, z: 0 }, owner);
    if (p.look === 'float') {
      const under = add(new THREE.Mesh(new THREE.BoxGeometry(p.hx * 0.7, 0.1, p.hz * 0.7), glow));
      under.position.set(p.x + ox, p.top - thick - 0.04, p.z);
    }
  }
  const ringMesh = add(new THREE.InstancedMesh(new THREE.TorusGeometry(0.55, 0.09, 8, 22), ringMat, rings.length));
  const posts = add(
    new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 1, 0.22), flatMod.flat('#917b5e', 0.9), rings.length),
  );
  const halo = add(new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.045, 6, 28), haloMat));
  halo.visible = false;
  ringMesh.frustumCulled = posts.frustumCulled = false;
  posts.castShadow = true;
  const pose = new THREE.Object3D();
  rings.forEach((r, k) => {
    const height = r.at.y - 0.55 - r.pad.top;
    pose.position.set(r.at.x, (r.at.y - 0.55 + r.pad.top) / 2, r.at.z);
    pose.scale.set(1, height, 1);
    pose.updateMatrix();
    posts.setMatrixAt(k, pose.matrix);
    land.addStatic({ kind: 'box', hx: 0.11, hy: height / 2, hz: 0.11 }, pose.position, undefined, undefined, owner);
  });
  const dim = new THREE.Color('#c79a3e'),
    near = new THREE.Color('#39e6c6'),
    hot = new THREE.Color('#d6fff5'),
    color = new THREE.Color();
  const camAt = new THREE.Vector3();
  function update(
    dt: number,
    now: number,
    owned = false,
    pick: HookRing | null = null,
    pull: HookRing | null = null,
    range: Set<HookRing> = new Set(),
  ) {
    camera.getWorldPosition(camAt);
    rings.forEach((r, k) => {
      const bright = r === pick || r === pull,
        inRange = range.has(r);
      pose.position.set(r.at.x, r.at.y, r.at.z);
      pose.lookAt(camAt);
      pose.scale.setScalar(bright ? 1.18 + Math.sin(now * 0.012) * 0.05 : inRange ? 1.05 : 0.92);
      pose.updateMatrix();
      ringMesh.setMatrixAt(k, pose.matrix);
      ringMesh.setColorAt(
        k,
        color.copy(bright ? hot : inRange || owned ? near : dim).multiplyScalar(bright ? 1.6 : inRange ? 1.2 : 0.75),
      );
    });
    ringMesh.instanceMatrix.needsUpdate = true;
    if (ringMesh.instanceColor) ringMesh.instanceColor.needsUpdate = true;
    const target = pull ?? pick;
    halo.visible = !!target;
    if (target) {
      halo.position.set(target.at.x, target.at.y, target.at.z);
      halo.lookAt(camAt);
      halo.scale.setScalar(1 + Math.sin(now * 0.01) * 0.06);
    }
  }
  owner.cleanup(() => {
    for (const g of geometries) g.dispose();
    for (const m of [partMat, glow, ringMat, haloMat]) m.dispose();
  });
  return { rings, ringById, update };
}
