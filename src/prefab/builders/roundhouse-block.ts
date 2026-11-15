// The rotunda's blockout, drawn from the kit (src/place/rotunda.ts; docs/plans/roundhouse-rotunda.md, step 1b): one
// bay is a wedge of the ring, so its walls, roof and floor are cut to the wedge and neighbours meet edge to edge as one
// curved building. A piece's frame: the table's centre on the ground, +z out along its bearing, +x across it. Plain
// colours, no detail: this is for walking the spacing. Local static scenery.
import * as THREE from 'three/webgpu';
import { material } from '../../render/materials.ts';
import { ROTUNDA_BLOCK, ROTUNDA_KIT } from '../../place/rotunda.ts';
import { registerBuilder, type ObjectBuild } from '../builders.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'roundhouse.bay-block': true;
  }
}

const WALL = '#a9a39a',
  PIER = '#cfc8ba',
  ROOF = '#666b73',
  FLOOR = '#8f8a80',
  DOOR = '#6b5238',
  GLASS = '#3b4a55',
  RUIN = '#9a958b',
  PAINT = '#e6a33e';

type XZ = readonly [x: number, z: number];
type Heights = number | readonly [number, number, number, number];
/** Triangles of one colour, flat-shaded. */
type Hex = `#${string}`;
type Paint = Map<Hex, number[]>;
/** A block over a four-cornered footprint (in order round it), from `bottom` to `top`: a height, or one per corner
 * for a sloped face. Faces are wound outward whatever the footprint's order. */
function prism(paint: Paint, colour: Hex, foot: readonly [XZ, XZ, XZ, XZ], bottom: Heights, top: Heights) {
  const y = (h: Heights, k: number) => (typeof h === 'number' ? h : h[k]!);
  const lo = foot.map(([x, z], k) => new THREE.Vector3(x, y(bottom, k), z)),
    hi = foot.map(([x, z], k) => new THREE.Vector3(x, y(top, k), z));
  const centre = new THREE.Vector3();
  for (const p of [...lo, ...hi]) centre.addScaledVector(p, 1 / 8);
  const out = paint.get(colour) ?? [];
  paint.set(colour, out);
  const n = new THREE.Vector3(),
    ab = new THREE.Vector3(),
    ac = new THREE.Vector3();
  const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) => {
    n.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a));
    const outward = n.dot(ab.subVectors(a, centre)) >= 0;
    for (const p of outward ? [a, b, c, a, c, d] : [a, c, b, a, d, c]) out.push(p.x, p.y, p.z);
  };
  quad(lo[0]!, lo[1]!, lo[2]!, lo[3]!);
  quad(hi[0]!, hi[1]!, hi[2]!, hi[3]!);
  for (let k = 0; k < 4; k++) quad(lo[k]!, lo[(k + 1) % 4]!, hi[(k + 1) % 4]!, hi[k]!);
}
function meshes(paint: Paint, shadows = true): ObjectBuild {
  const object = new THREE.Group(),
    geometries: THREE.BufferGeometry[] = [];
  for (const [colour, positions] of paint) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material('stone', { colour }));
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
    object.add(mesh);
  }
  return { object, dispose: () => geometries.forEach((g) => g.dispose()) };
}

/** A bay's wedge: its half angle, the flat door wall's distance out (the chord between the door ring's corners) and
 * the back wall's, and the wedge's half width at a distance out. */
const half = (ROTUNDA_KIT.bayDeg * Math.PI) / 360,
  doorZ = ROTUNDA_KIT.doorR * Math.cos(half),
  backZ = (ROTUNDA_KIT.doorR + ROTUNDA_KIT.depth) * Math.cos(half),
  edge = (z: number) => z * Math.tan(half);
/** The wedge's footprint between two distances out, inset `in` from each radial edge. */
const wedge = (z0: number, z1: number, inset = 0): [XZ, XZ, XZ, XZ] => [
  [-edge(z0) + inset, z0],
  [edge(z0) - inset, z0],
  [edge(z1) - inset, z1],
  [-edge(z1) + inset, z1],
];
const rect = (x0: number, x1: number, z0: number, z1: number): [XZ, XZ, XZ, XZ] => [
  [x0, z0],
  [x1, z0],
  [x1, z1],
  [x0, z1],
];
/** The two door piers, from the door's clear width to the wedge's edge, each to its own height. */
function piers(paint: Paint, colour: Hex, left: number, right: number) {
  const clear = ROTUNDA_KIT.door.clear / 2,
    z1 = doorZ + ROTUNDA_BLOCK.reveal;
  for (const [side, high] of [
    [-1, left],
    [1, right],
  ] as const)
    prism(
      paint,
      colour,
      [
        [side * clear, doorZ],
        [side * edge(doorZ), doorZ],
        [side * edge(z1), z1],
        [side * clear, z1],
      ],
      0,
      high,
    );
}

registerBuilder('roundhouse.bay-block', (params) => {
  const paint: Paint = new Map();
  const { wall, back, roof, reveal } = ROTUNDA_BLOCK,
    clear = ROTUNDA_KIT.door.clear / 2,
    high = ROTUNDA_KIT.door.high;
  switch (params.part) {
    case 'bay': {
      piers(paint, PIER, wall, wall);
      prism(paint, PIER, rect(-clear, clear, doorZ, doorZ + reveal), high, wall);
      prism(paint, WALL, wedge(backZ - 0.3, backZ), 0, back);
      // A dark band on the back wall where the big windows go, so the back is not one blank face from the town.
      prism(paint, GLASS, rect(-edge(backZ) * 0.7, edge(backZ) * 0.7, backZ, backZ + 0.04), 1.6, 3.6);
      prism(
        paint,
        ROOF,
        wedge(doorZ, backZ),
        [wall, wall, back, back],
        [wall + roof, wall + roof, back + roof, back + roof],
      );
      prism(paint, FLOOR, wedge(doorZ, backZ), 0, 0.05);
      break;
    }
    case 'bay-ruin': {
      const heights = [params.left, params.right].map((h) => (typeof h === 'number' ? h : 3.2));
      piers(paint, RUIN, heights[0]!, heights[1]!);
      prism(paint, FLOOR, wedge(doorZ, backZ), 0, 0.05);
      break;
    }
    case 'bay-door':
      // Shut: a plain leaf in the door, set back in the reveal.
      prism(paint, DOOR, rect(-clear, clear, doorZ + reveal / 2 - 0.1, doorZ + reveal / 2 + 0.1), 0, high);
      break;
    case 'end-wall':
      // On the edge between two bays, from the door ring to the back, under the roof's fall.
      prism(paint, WALL, rect(-0.15, 0.15, ROTUNDA_KIT.doorR, ROTUNDA_KIT.doorR + ROTUNDA_KIT.depth), 0, [
        wall,
        wall,
        back,
        back,
      ]);
      break;
    case 'bay-outline': {
      // Painted on the ground: the bay that is not planned here, to see what a wider arc would take.
      const w = 0.25,
        top = 0.1;
      prism(paint, PAINT, wedge(doorZ, doorZ + w), 0, top);
      prism(paint, PAINT, wedge(backZ - w, backZ), 0, top);
      for (const side of [-1, 1])
        prism(
          paint,
          PAINT,
          [
            [side * edge(doorZ), doorZ],
            [side * (edge(doorZ) - w), doorZ],
            [side * (edge(backZ) - w), backZ],
            [side * edge(backZ), backZ],
          ],
          0,
          top,
        );
      return meshes(paint, false);
    }
    default:
      throw new Error(`roundhouse.bay-block: unknown part ${String(params.part)}`);
  }
  return meshes(paint);
});
