// Local sea gate, summit switch and the signal running down Needle Bell. No shared state or Place campaign owner.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter, RailwayAccepted, RailwayCorrection } from '../../adapters/railway.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import type { Body, V3 } from '../../physics/engine.ts';
import { LINE2_SEA } from '../../sim/railway-line2-layout.ts';
import { clank, whistle } from '../../render/machine-sfx.ts';
import { readableUnlit } from '../../render/readable-unlit.ts';

type Line2 = NonNullable<ReturnType<RailwayAdapter['inspect']>['line2']>;
type Deps = {
  layout: typeof import('../../proto/place/layout.ts');
  tech: typeof import('../../proto/place/tech-layout.ts');
  land: typeof import('../../proto/place/land.ts');
  shapes: typeof import('../../proto/place/part-geometry.ts');
  flat: (typeof import('../../proto/flat.ts'))['flat'];
  sounds: typeof import('../../proto/minis/common.ts');
  partMat: THREE.Material;
  glow: THREE.Material;
};

export function createRailwaySeaGate(adapter: RailwayAdapter, owner: OwnedView, deps: Deps) {
  const { layout, tech, land, shapes, flat, partMat, glow } = deps;
  const ox = layout.ORIGIN.x;
  const G = tech.GATES.sea;
  const SLAB = { w: 6.4, h: 5.4, d: 0.9, pillar: 1.1 };
  const rotation = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, G.yaw);
  const geometry: THREE.BufferGeometry[] = [];
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material = partMat) => {
    geometry.push(g);
    const view = new THREE.Mesh(g, m);
    view.castShadow = view.receiveShadow = true;
    return view;
  };
  for (const side of [-1, 1]) {
    const jamb = mesh(new THREE.BoxGeometry(SLAB.pillar, SLAB.h + 0.8, SLAB.pillar), flat('#917b5e', 0.9));
    const along = (side * (SLAB.w + SLAB.pillar)) / 2;
    jamb.position.set(G.x + ox + Math.cos(G.yaw) * along, G.y + (SLAB.h + 0.8) / 2, G.z - Math.sin(G.yaw) * along);
    jamb.quaternion.copy(rotation);
    owner.add(jamb);
    land.addStatic(
      { kind: 'box', hx: SLAB.pillar / 2, hy: (SLAB.h + 0.8) / 2, hz: SLAB.pillar / 2 },
      jamb.position,
      rotation,
      undefined,
      owner,
    );
  }
  const slab = mesh(
    shapes.merged([
      ['b', 0, 0, 0, SLAB.w, SLAB.h, SLAB.d, '#b6a080'],
      ['b', 0, SLAB.h / 2 - 0.3, SLAB.d / 2 + 0.01, SLAB.w - 0.6, 0.2, 0.04, '#39e6c6'],
    ]),
  );
  const up = G.y + SLAB.h / 2,
    down = up - SLAB.h - 0.6;
  slab.position.set(G.x + ox, up, G.z);
  slab.quaternion.copy(rotation);
  owner.add(slab);
  let body: Body | null = null,
    slabT = -1,
    lightT = -1;
  const at = new THREE.Vector3(LINE2_SEA.x / 100, LINE2_SEA.y / 100, LINE2_SEA.z / 100);
  const target = at.clone().add(new THREE.Vector3(0, 1.7, 0));
  const drum = mesh(
    shapes.merged([
      ['c', 0, 0.35, 0, 0.72, 0.7, 0.72, '#55524a'],
      ['c', 0, 0.78, 0, 0.56, 0.16, 0.56, '#6d6a60'],
      ['c', 0, 0.9, 0, 0.5, 0.06, 0.5, '#c79a3e'],
    ]),
  );
  drum.position.copy(at);
  const handle = mesh(new THREE.BoxGeometry(0.18, 1.2, 0.18), glow);
  handle.position.y = 1.4;
  drum.add(handle);
  owner.add(drum); // Deliberately no switch collider at the hook landing.
  const capMat = readableUnlit(new THREE.MeshBasicNodeMaterial({ color: '#ffffff' }));
  const postGeo = new THREE.BoxGeometry(0.5, 2.6, 0.5),
    capGeo = new THREE.OctahedronGeometry(0.22);
  geometry.push(postGeo, capGeo);
  const posts = new THREE.InstancedMesh(postGeo, flat('#403f3a', 0.9), tech.POSTS.length);
  const caps = new THREE.InstancedMesh(capGeo, capMat, tech.POSTS.length);
  const o = new THREE.Object3D();
  const dark = new THREE.Color('#285650'),
    lit = new THREE.Color('#39e6c6').multiplyScalar(2.2);
  tech.POSTS.forEach((p, k) => {
    const y = land.H(p.x + ox, p.z);
    o.position.set(p.x + ox, y + 1.3, p.z);
    o.rotation.y = k * 0.9;
    o.updateMatrix();
    posts.setMatrixAt(k, o.matrix);
    o.position.y = y + 2.9;
    o.updateMatrix();
    caps.setMatrixAt(k, o.matrix);
    caps.setColorAt(k, dark);
  });
  posts.castShadow = true;
  posts.frustumCulled = caps.frustumCulled = false;
  owner.add(posts, caps);
  const drawCaps = (count: number) => {
    for (let k = 0; k < tech.POSTS.length; k++) caps.setColorAt(k, tech.POSTS.length - 1 - k < count ? lit : dark);
    caps.instanceColor!.needsUpdate = true;
  };
  function solid(l: Line2) {
    if (l.seaOpen && body) {
      owner.removeBody(body);
      body = null;
    }
    if (!l.seaOpen && !body)
      body = land.addStatic(
        { kind: 'box', hx: SLAB.w / 2, hy: SLAB.h / 2, hz: SLAB.d / 2 },
        { x: G.x + ox, y: up, z: G.z },
        rotation,
        undefined,
        owner,
      );
  }
  owner.cleanup(() => {
    for (const g of geometry) g.dispose();
    capMat.dispose();
  });
  return {
    accepted(e: RailwayAccepted) {
      if (e.op !== 'rail.seaSwitch') return;
      clank(at.x, at.z);
      whistle(G.x + ox, G.z);
      slabT = lightT = 0;
    },
    corrected(c: RailwayCorrection) {
      if (c.event.op !== 'rail.seaSwitch') return;
      clank(at.x, at.z);
      slabT = lightT = -1;
    },
    restore(l: Line2) {
      slabT = lightT = -1;
      solid(l);
      slab.position.y = l.seaOpen ? down : up;
      handle.rotation.z = l.sea ? -0.7 : 0.7;
      drawCaps(l.sea ? tech.POSTS.length : 0);
    },
    update(dt: number, l: Line2) {
      solid(l);
      handle.rotation.z += ((l.sea ? -0.7 : 0.7) - handle.rotation.z) * Math.min(1, dt * 10);
      if (slabT >= 0) {
        slabT += dt;
        const u = Math.min(1, slabT / 1.5);
        slab.position.y = up - (up - down) * u * u * (3 - 2 * u);
        if (u === 1) slabT = -1;
      } else slab.position.y = l.seaOpen ? down : up;
      if (lightT >= 0) {
        lightT += dt;
        drawCaps(Math.min(tech.POSTS.length, 1 + Math.floor(lightT / (1.5 / tech.POSTS.length))));
        if (lightT >= 1.5) lightT = -1;
      } else drawCaps(l.sea ? tech.POSTS.length : 0);
    },
    targets(p: V3, l: Line2): Interactable[] {
      if (l.sea || Math.hypot(p.x - at.x, p.z - at.z) >= 3 || Math.abs(p.y - at.y) >= 2.2) return [];
      return [
        {
          id: 'railway-sea-switch',
          verb: 'Pull',
          at: target,
          run: () => {
            if (l.completed < 4) {
              clank(at.x, at.z);
              return;
            }
            void adapter.pullSeaSwitch();
          },
        },
      ];
    },
    inspect: () => ({
      sea: { x: at.x, y: at.y, z: at.z, pulled: !!adapter.inspect().line2?.sea },
      seaGateSolid: !!body,
    }),
  };
}
