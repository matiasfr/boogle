// Local sea gate and its Q4-seated far-jamb switch. No shared state or Place campaign owner.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { RailwayAccepted, RailwayCorrection } from '../../adapters/railway-effects.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import type { Body, V3 } from '../../physics/engine.ts';
import { rail } from '../../sim/railway-rows.ts';
import { createPrefabBatch, instantiate } from '../../prefab/instantiate.ts';
import { line2Completed } from '../../sim/railway-queries-line2.ts';
import { LINE2_SEA, line2Routes } from '../../sim/railway-line2-layout.ts';
import { bell, clank, whistle } from '../../render/machine-sfx.ts';
import { readableUnlit } from '../../render/readable-unlit.ts';
import { playMark } from '../../proto/mark.ts';
import { uiSound } from '../../ui/ui-sound.ts';
import { createGhostOutlines } from '../../render/ghost-outline.ts';
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
  const { layout, tech, land, shapes, flat, sounds, partMat, glow } = deps;
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
  const jambBatch = createPrefabBatch('railway.sea-jamb', 7, owner);
  instantiate(
    'railway.sea-jamb',
    {
      id: 'sea-jamb',
      prefab: 'railway.sea-jamb',
      pos: [at.x, at.y, at.z],
    },
    { owner, batch: { target: jambBatch, index: 0 } },
  ).setEnabled(true);
  // The mount's hardware, there from the first minute and read from the gate's foot 13 m below: a gold collar round
  // the landing, an open cradle frame behind the socket, and dashed gold "a part goes here" for the drum and the ring.
  const CRADLE = { back: -0.83, half: 0.83, top: 3.6 };
  const cradle = mesh(
    shapes.merged([
      ['b', -CRADLE.half, CRADLE.top / 2, CRADLE.back, 0.26, CRADLE.top, 0.26, '#55524a'],
      ['b', CRADLE.half, CRADLE.top / 2, CRADLE.back, 0.26, CRADLE.top, 0.26, '#55524a'],
      ['b', 0, CRADLE.top + 0.14, CRADLE.back, CRADLE.half * 2 + 0.6, 0.28, 0.3, '#55524a'],
      ['b', 0, -0.3, 2.215, 4.46, 0.56, 0.05, '#c79a3e'],
      ['b', 0, -0.3, -2.215, 4.46, 0.56, 0.05, '#c79a3e'],
      ['b', 2.215, -0.3, 0, 0.05, 0.56, 4.46, '#c79a3e'],
      ['b', -2.215, -0.3, 0, 0.05, 0.56, 4.46, '#c79a3e'],
    ]),
  );
  cradle.position.copy(at);
  owner.add(cradle);
  // Lights that say the control is live: the cradle's beam and a strip down each face of the jamb the approach sees.
  const lampMat = readableUnlit(new THREE.MeshBasicNodeMaterial({ color: '#ffffff' }));
  const lampDark = new THREE.Color('#285650'),
    lampLit = new THREE.Color('#39e6c6').multiplyScalar(2.2),
    lampHot = new THREE.Color('#ffffff').multiplyScalar(3);
  const STRIP = { top: -0.7, bottom: -12.6 };
  const beamLamp = mesh(new THREE.BoxGeometry(CRADLE.half * 2 + 0.2, 0.14, 0.34), lampMat);
  beamLamp.position.set(at.x, at.y + CRADLE.top + 0.14, at.z + CRADLE.back);
  const strips = mesh(
    shapes.merged([
      ['b', -0.915, -0.5, 0, 0.05, 1, 0.34, '#ffffff'],
      ['b', -0.45, -0.5, 0.915, 0.34, 1, 0.05, '#ffffff'],
    ]),
    lampMat,
  );
  strips.position.set(at.x, at.y + STRIP.top, at.z);
  beamLamp.castShadow = strips.castShadow = false;
  owner.add(beamLamp, strips);
  const ringAt = { ...tech.SEA_RING, x: tech.SEA_RING.x + ox };
  const ghosts = createGhostOutlines(owner, 160, 0.26, 0.16, 0.08);
  ghosts.mesh.frustumCulled = false;
  function drawGhosts(on: boolean) {
    ghosts.begin();
    if (on) {
      ghosts.box(at.x, at.y + 0.5, at.z, 0.9, 1, 0.9);
      ghosts.box(at.x, at.y + 1.55, at.z, 0.34, 1.1, 0.34);
      ghosts.box(ringAt.x, ringAt.y, ringAt.z, 1.3, 1.3, 0.2, -Math.PI / 4);
    }
    ghosts.commit();
  }
  drawGhosts(true);
  // The seating's flash and shock ring, wide enough to clear the landing's edge from below.
  const flashMat = readableUnlit(
    new THREE.MeshBasicNodeMaterial({ color: '#e8fffa', transparent: true, opacity: 0, depthWrite: false }),
  );
  const flash = mesh(new THREE.SphereGeometry(1, 14, 10), flashMat);
  const shock = mesh(new THREE.TorusGeometry(1, 0.07, 6, 30).rotateX(Math.PI / 2), flashMat);
  flash.castShadow = shock.castShadow = flash.receiveShadow = shock.receiveShadow = false;
  flash.position.set(at.x, at.y + 0.9, at.z);
  shock.position.set(at.x, at.y + 0.3, at.z);
  flash.visible = shock.visible = false;
  owner.add(flash, shock);
  const dust = new THREE.Color('#d8cdb4');
  // Snap on join/restore; only a live Q4 edge lowers the control into its cradle, from high enough to be seen coming.
  const DROP = { from: 9, time: 1.3 };
  let installed = false,
    ghosted = true,
    seating = 1,
    litT = 1; // seconds since the seat landed, for the flash and the lights' wipe; large when settled
  const SETTLED = 10;
  const ready = () => line2Routes(line2Completed(adapter.read.world())).sea || rail(adapter.read.world()).sea;
  function install(snap: boolean, dt = 0) {
    const on = ready();
    if (snap) {
      seating = 1;
      litT = SETTLED;
    } else if (on && !installed) {
      seating = 0;
      bell(at.x, at.z);
    }
    const was = seating;
    seating = Math.min(1, seating + dt / DROP.time);
    if (on && was < 1 && seating === 1) {
      litT = 0;
      clank(at.x, at.z);
      sounds.pop(4, 0.7);
      sounds.puff(at.x, at.y + 0.3, at.z, 26, 3.2, dust, 0.5);
    }
    litT = Math.min(SETTLED, litT + dt);
    installed = on;
    drum.visible = on;
    drum.position.y = at.y + (1 - seating) * (1 - seating) * DROP.from;
    if (ghosted !== !on) drawGhosts((ghosted = !on));
    const seated = on && seating === 1;
    const u = Math.min(1, litT / 0.5);
    flash.visible = shock.visible = seated && u < 1;
    flashMat.opacity = (1 - u) * 0.9;
    flash.scale.setScalar(0.6 + u * 2.4);
    shock.scale.setScalar(0.8 + u * 4.2);
    // The lights wipe down from the cradle to the jamb's foot, hot first.
    const wipe = seated ? Math.min(1, litT / 0.9) : 0;
    strips.scale.y = Math.max(0.001, wipe * (STRIP.top - STRIP.bottom));
    strips.visible = wipe > 0;
    lampMat.color.copy(seated ? lampLit : lampDark);
    if (seated && litT < 1.4) lampMat.color.lerpColors(lampHot, lampLit, litT / 1.4);
  }
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
    capGeo = new THREE.OctahedronGeometry(0.5);
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
    o.position.y = y + 3.15;
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
    for (const m of [capMat, lampMat, flashMat]) m.dispose();
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
      install(true);
      solid(sea);
      slab.position.y = sea ? down : up;
      rig.pose(slab.position.y);
      handle.rotation.z = sea ? PULLED : READY;
      refusal = 1;
      drum.rotation.z = 0;
      drawCaps(installed ? tech.POSTS.length : 0);
    },
    update(dt: number, sea: boolean) {
      install(false, dt);
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
      } else drawCaps(installed && seating === 1 ? tech.POSTS.length : 0);
    },
    targets(p: V3, sea: boolean): Interactable[] {
      if (!ready() || seating < 1 || sea || Math.hypot(p.x - at.x, p.z - at.z) >= 3 || Math.abs(p.y - at.y) >= 2.2)
        return [];
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
        installed,
        seating,
        handleAngle: handle.rotation.z,
        refusal,
      },
      seaGateSolid: !!body,
    }),
  };
}
