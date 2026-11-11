// Local sea gate, summit switch and the signal running down Needle Bell. No shared state or Place campaign owner.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter, RailwayAccepted, RailwayCorrection } from '../../adapters/railway-session.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import type { Body, V3 } from '../../physics/engine.ts';
import { rail } from '../../sim/railway-rows.ts';
import { LINE2_SEA } from '../../sim/railway-line2-layout.ts';
import { clank, whistle } from '../../render/machine-sfx.ts';
import { readableUnlit } from '../../render/readable-unlit.ts';
import { playMark } from '../../proto/mark.ts';
import { uiSound } from '../../ui/ui-sound.ts';
import { createGateRig, gateEyes } from './gate-rig.ts';

type Deps = {
  layout: typeof import('../../place/layout.ts');
  tech: typeof import('../../place/tech-layout.ts');
  land: typeof import('../../place/land.ts');
  shapes: typeof import('../../render/part-geometry.ts');
  flat: (typeof import('../../render/flat.ts'))['flat'];
  sounds: typeof import('../../render/fanfare.ts');
  partMat: THREE.Material;
  glow: THREE.Material;
};

export function createRailwaySeaGate(adapter: RailwayAdapter, owner: OwnedView, deps: Deps) {
  const { layout, tech, land, shapes, flat, partMat, glow } = deps;
  const ox = layout.ORIGIN.x;
  const G = tech.GATES.sea;
  const SLAB = tech.GATE_SLAB;
  const rotation = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, G.yaw);
  const geometry: THREE.BufferGeometry[] = [];
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material = partMat) => {
    geometry.push(g);
    const view = new THREE.Mesh(g, m);
    view.castShadow = view.receiveShadow = true;
    return view;
  };
  // Jambs under a headstock whose drum winds the slab's two chains: the switch's signal turns it (gate-rig.ts).
  const rig = createGateRig(
    owner,
    { land, shapes, flat, partMat },
    { x: G.x + ox, y: G.y, z: G.z, yaw: G.yaw, slab: SLAB },
  );
  const slab = mesh(
    shapes.merged([
      ['b', 0, 0, 0, SLAB.w, SLAB.h, SLAB.d, '#b6a080'],
      ['b', 0, SLAB.h / 2 - 0.3, SLAB.d / 2 + 0.01, SLAB.w - 0.6, 0.2, 0.04, '#39e6c6'],
      ...gateEyes(SLAB),
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
  // The shaft turns at the drum's axle, rather than around the middle of the shaft.
  // From the east-side landing it starts leaning away, then pulls down toward Buddy.
  const READY = 0.65,
    PULLED = -0.95;
  const handle = new THREE.Group();
  handle.position.y = 0.9;
  handle.add(mesh(new THREE.BoxGeometry(0.18, 1.1, 0.18).translate(0, 0.55, 0), glow));
  const grip = mesh(new THREE.BoxGeometry(0.36, 0.22, 0.36));
  grip.position.y = 1.1;
  handle.add(grip);
  drum.add(handle);
  const axle = mesh(new THREE.BoxGeometry(0.3, 0.22, 0.65));
  axle.position.y = 0.9;
  drum.add(axle);
  owner.add(drum); // Deliberately no switch collider at the hook landing.
  let refusal = 1;
  function refuse() {
    refusal = 0;
    uiSound('deny');
    clank(at.x, at.z);
  }
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
  function solid(sea: boolean) {
    if (sea && body) {
      owner.removeBody(body);
      body = null;
    }
    if (!sea && !body)
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
      refuse();
      slabT = lightT = -1;
    },
    restore(sea: boolean) {
      slabT = lightT = -1;
      solid(sea);
      slab.position.y = sea ? down : up;
      rig.pose(slab.position.y);
      handle.rotation.z = sea ? PULLED : READY;
      refusal = 1;
      drum.rotation.z = 0;
      drawCaps(sea ? tech.POSTS.length : 0);
    },
    update(dt: number, sea: boolean) {
      solid(sea);
      refusal = Math.min(1, refusal + dt / 0.55);
      drum.rotation.z = Math.sin(refusal * Math.PI * 6) * (1 - refusal) * 0.12;
      handle.rotation.z += ((sea ? PULLED : READY) - handle.rotation.z) * (1 - Math.exp(-dt * 10));
      if (slabT >= 0) {
        slabT += dt;
        const u = Math.min(1, slabT / 1.5);
        slab.position.y = up - (up - down) * u * u * (3 - 2 * u);
        if (u === 1) slabT = -1;
      } else slab.position.y = sea ? down : up;
      rig.pose(slab.position.y);
      if (lightT >= 0) {
        lightT += dt;
        drawCaps(Math.min(tech.POSTS.length, 1 + Math.floor(lightT / (1.5 / tech.POSTS.length))));
        if (lightT >= 1.5) lightT = -1;
      } else drawCaps(sea ? tech.POSTS.length : 0);
    },
    targets(p: V3, sea: boolean): Interactable[] {
      if (sea || Math.hypot(p.x - at.x, p.z - at.z) >= 3 || Math.abs(p.y - at.y) >= 2.2) return [];
      return [
        {
          id: 'railway-sea-switch',
          verb: 'Pull',
          at: target,
          run: () => {
            if (!adapter.pullSeaSwitch()) {
              playMark('sea switch refused', { reason: 'not accepted locally', authority: 'local' });
              refuse();
            }
          },
        },
      ];
    },
    inspect: () => ({
      sea: {
        x: at.x,
        y: at.y,
        z: at.z,
        pulled: rail(adapter.read.world()).sea,
        handleAngle: handle.rotation.z,
        refusal,
      },
      seaGateSolid: !!body,
    }),
  };
}
