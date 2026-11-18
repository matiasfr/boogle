// The lighthouse's records (src/pois/lighthouse/): the striped tower with its gallery deck and spiral stair, as pieces
// the POI merges into one draw, and the lantern (glass, lamp, beams and halo) the POI lights at dusk.
// The stair is a smooth helical ramp for physics (src/prefab/lighthouse.ts) with treads drawn on top; railings on the
// outer edge and round the deck keep people from falling off (mostly). The deck is open where the stair arrives.
import * as THREE from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { uniform, vec4, pow, uv } from 'three/tsl';
import { readableUnlit } from '../../render/readable-unlit.ts';
import { registerBuilder, type Piece } from '../builders.ts';
import { lighthouseDims, lighthouseShape } from '../lighthouse.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'poi.lighthouse': true;
    'poi.lighthouse-lantern': true;
  }
}

const box = new THREE.BoxGeometry(1, 1, 1);
const cyl = (rt: number, rb: number, h: number, n = 20) => new THREE.CylinderGeometry(rt, rb, h, n);
const q = new THREE.Quaternion(),
  s = new THREE.Vector3();

registerBuilder('poi.lighthouse', (params) => {
  const d = lighthouseDims(params);
  const { base, deck, startA, deckStart, deckSpan, towerR, stairY, stairA, at } = lighthouseShape(d);
  const pieces: Piece[] = [];
  const put = (
    geometry: THREE.BufferGeometry,
    pos: THREE.Vector3,
    color: string,
    quat?: THREE.Quaternion | null,
    scale?: THREE.Vector3,
  ) =>
    pieces.push({
      geometry,
      matrix: new THREE.Matrix4().compose(pos, quat ?? q.identity(), scale ?? s.set(1, 1, 1)),
      color,
    });

  // Plinth, striped tower, a door and a few windows.
  put(cyl(d.plinthR, d.plinthR + 0.2, d.plinthH + 0.6, 10), new THREE.Vector3(0, (d.plinthH - 0.6) / 2, 0), '#a19b90');
  const bands = 6;
  for (let k = 0; k < bands; k++) {
    const y0 = base + (k / bands) * d.towerH,
      y1 = base + ((k + 1) / bands) * d.towerH;
    put(
      cyl(towerR(y1), towerR(y0), y1 - y0, 22),
      new THREE.Vector3(0, (y0 + y1) / 2, 0),
      k % 2 ? '#d64b3c' : '#f3efe6',
    );
  }
  const doorA = startA + 0.55;
  put(
    box,
    at(doorA, d.rBottom - 0.05, base + 1.05),
    '#4d3423',
    q.setFromEuler(new THREE.Euler(0, -doorA, 0)),
    s.set(0.25, 2.1, 1.1),
  );
  for (let k = 0; k < 5; k++) {
    const y = base + 3.5 + k * 3.1,
      a = startA + 1.7 + k * 2.4;
    put(box, at(a, towerR(y) - 0.04, y), '#25303b', q.setFromEuler(new THREE.Euler(0, -a, 0)), s.set(0.2, 0.9, 0.55));
  }

  // Gallery deck: the tower's cap plus a ring, open over the top of the stair.
  // Cap sits a hair above the tower top and the ring so their top faces don't z-fight.
  put(cyl(d.rTop + 0.15, d.rTop + 0.15, 0.4, 24), new THREE.Vector3(0, deck - 0.18, 0), '#5b6168');
  const ringN = 40;
  for (let k = 0; k < ringN; k++) {
    const a0 = deckStart + (k / ringN) * deckSpan,
      a1 = deckStart + ((k + 1) / ringN) * deckSpan;
    const am = (a0 + a1) / 2,
      rm = (d.rTop + 0.1 + d.deckR + 0.05) / 2; // starts just under the cap's rim, not across it
    const chord = 2 * d.deckR * Math.sin((a1 - a0) / 2) * 1.05;
    put(
      box,
      at(am, rm, deck - 0.15),
      '#5b6168',
      q.setFromEuler(new THREE.Euler(0, -am, 0)),
      s.set(d.deckR - d.rTop - 0.05, 0.3, chord),
    );
    if (k % 2 === 0) put(box, at(a0, d.deckR - 0.08, deck + 0.55), '#2d3035', q.identity(), s.set(0.07, 1.1, 0.07));
  }
  put(
    new THREE.TorusGeometry(d.deckR - 0.08, 0.05, 6, 48, deckSpan),
    new THREE.Vector3(0, deck + 1.1, 0),
    '#2d3035',
    q.setFromEuler(new THREE.Euler(Math.PI / 2, 0, deckStart)),
  );

  // Lantern room roof and finial (the glass is the lantern record's).
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    put(box, at(a, 1.38, deck + 1.25), '#2d3035', q.identity(), s.set(0.08, 2.5, 0.08));
  }
  put(new THREE.ConeGeometry(1.85, 1.5, 16), new THREE.Vector3(0, deck + 3.2, 0), '#c84436');
  put(new THREE.SphereGeometry(0.22, 10, 6), new THREE.Vector3(0, deck + 4.05, 0), '#2d3035');

  // The spiral stair: treads, outer posts and a handrail.
  const treadN = Math.round(d.towerH / 0.2);
  for (let k = 0; k < treadN; k++) {
    const u = (k + 0.5) / treadN,
      y = stairY(u),
      a = stairA(u);
    const rin = towerR(y) + 0.03,
      rm = rin + d.stairW / 2;
    const arc = (d.turns * Math.PI * 2 * rm) / treadN;
    put(
      box,
      at(a, rm, y - 0.06),
      k % 2 ? '#7d8186' : '#8a8e93',
      q.setFromEuler(new THREE.Euler(0, -a, 0)),
      s.set(d.stairW, 0.12, arc * 1.15),
    );
    if (k % 3 === 0 && u > d.railFrom)
      put(box, at(a, rin + d.stairW - 0.06, y + 0.5), '#2d3035', q.identity(), s.set(0.06, 1.0, 0.06));
  }
  const railPts = [];
  for (let k = 0; k <= 120; k++) {
    const u = d.railFrom + (k / 120) * (1 - d.railFrom),
      y = stairY(u);
    railPts.push(at(stairA(u), towerR(y) + 0.03 + d.stairW - 0.06, y + 1.0));
  }
  pieces.push({
    geometry: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPts), 240, 0.05, 5),
    matrix: new THREE.Matrix4(),
    color: '#2d3035',
  });
  return { pieces };
});

/** The lantern's moving parts, by name, for the POI's dusk and sweep. */
export type Lantern = {
  glass: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
  lamp: THREE.Mesh<THREE.SphereGeometry, MeshBasicNodeMaterial>;
  beams: THREE.Group;
  halo: THREE.Sprite;
  /** The beams' strength, 0 by day. */
  on: { value: number };
};
export const lanternOf = (root: THREE.Object3D) => root.getObjectByName('lantern')!.userData.lantern as Lantern;

// Local frame: the origin is the middle of the gallery deck's walkable top.
registerBuilder('poi.lighthouse-lantern', () => {
  const group = new THREE.Group();
  group.name = 'lantern';
  const glass = new THREE.Mesh(
    cyl(1.4, 1.4, 2.4, 16),
    new THREE.MeshStandardMaterial({
      color: '#cfe9ff',
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      emissive: '#ffd27a',
      emissiveIntensity: 0,
      depthWrite: false,
    }),
  );
  glass.position.set(0, 1.25, 0);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 14, 10),
    readableUnlit(new MeshBasicNodeMaterial({ color: '#7a6a4a' })),
  );
  lamp.position.set(0, 1.3, 0);

  const on = uniform(0);
  const beamMat = new MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
  });
  // uv().y: 1 at the lamp, 0 at the far end. Warm lamp colour.
  const warm = new THREE.Color().setRGB(1, 0.9, 0.6, THREE.SRGBColorSpace);
  beamMat.colorNode = vec4(warm.r, warm.g, warm.b, pow(uv().y, 1.6).mul(on).mul(0.42));
  const beams = new THREE.Group();
  for (const dir of [1, -1]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(6, 70, 20, 1, true), beamMat);
    cone.rotation.z = (dir * Math.PI) / 2; // lie it down along x
    cone.position.x = dir * 35; // apex at the lamp, widening out to sea
    cone.frustumCulled = false;
    beams.add(cone);
  }
  beams.position.copy(lamp.position);

  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,240,200,1)');
  grad.addColorStop(0.25, 'rgba(255,210,120,0.55)');
  grad.addColorStop(1, 'rgba(255,190,90,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0,
    }),
  );
  halo.position.copy(lamp.position);
  halo.scale.setScalar(7);
  group.add(glass, lamp, beams, halo);
  group.userData.lantern = { glass, lamp, beams, halo, on } satisfies Lantern;
  return group;
});
