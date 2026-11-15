// The unfinished statue on the town green (owner, 15 November): a sheeted shape on the statue's own plinth, inside a
// timber scaffold. It stands where The Boogler's stone statue will (src/prefab/builders/boogler-statue.ts, kept and
// unused until he has been met), and the sheet is a plain lump that shows nothing of him: no hat, hands or face.
// Three meshes (stone plinth, cloth sheet, timber frame), static: no rig and no frame work. The record
// (content/prefabs/town.ts, `town.statue-works`) gives the plinth, the frame and the colours; its origin is the
// plinth's foot and its front is local +z, as the statue's is.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { material } from '../../render/materials.ts';
import { registerBuilder } from '../builders.ts';
import type { JsonObject } from '../types.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'town.statue-scaffold': true;
  }
}

/** The sheet's outline above the plinth's top, [radius, height]: a hem lying on the plinth, then a lump to a peak. */
const SHEET: readonly (readonly [number, number])[] = [
  [2.05, 0.02],
  [1.9, 0.1],
  [1.68, 0.5],
  [1.42, 1.2],
  [1.08, 2.1],
  [0.72, 3.0],
  [0.46, 3.6],
  [0.3, 3.78],
  [0, 3.8],
];
/** Where the ropes tie the sheet down, as heights above the plinth's top. */
const ROPES = [0.9, 2.3];
const POLE_R = 0.07,
  RAIL_R = 0.05,
  DECK_DEEP = 0.66,
  BOARD_HIGH = 0.05;

/** The sheet's radius at a height above the plinth's top, from its outline. */
function sheetRadius(y: number) {
  for (let i = 0; i + 1 < SHEET.length; i++) {
    const [r0, y0] = SHEET[i]!,
      [r1, y1] = SHEET[i + 1]!;
    if (y >= y0 && y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return 0;
}

/** The sheet: the outline turned round, with folds that deepen toward the hem and a peak pulled a little off centre. */
function sheet(base: number) {
  const high = SHEET.at(-1)![1];
  const geometry = new THREE.LatheGeometry(
    SHEET.map(([r, y]) => new THREE.Vector2(r, y)),
    40,
  );
  const at = geometry.getAttribute('position');
  for (let i = 0; i < at.count; i++) {
    const x = at.getX(i),
      y = at.getY(i),
      z = at.getZ(i);
    const turn = Math.atan2(z, x),
      low = 1 - y / high;
    const fold = 1 + low * (0.08 * Math.sin(7 * turn + 2.4 * y) + 0.03 * Math.sin(3 * turn + 1.1));
    at.setXYZ(i, x * fold + 0.12 * (1 - low) ** 2, y + base, z * fold);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** A round bar between two points. */
function bar(from: THREE.Vector3, to: THREE.Vector3, r: number) {
  const along = to.clone().sub(from);
  return new THREE.CylinderGeometry(r, r, along.length(), 6)
    .applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), along.normalize()))
    .translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
}

/** The frame: four corner poles on base plates, a rail round every level and the top, a cross brace on each side's
 * lower lift but the front's, a deck of three boards on the back at the first level and on the +x side at the second,
 * and the two ropes round the sheet. `turned` puts a part made along x on a side: 0 front (+z), 1 +x, 2 back, 3 -x. */
function frame(half: number, high: number, levels: readonly number[], base: number) {
  const parts: THREE.BufferGeometry[] = [];
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const turned = (g: THREE.BufferGeometry, side: number) => parts.push(g.rotateY((side * Math.PI) / 2));
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      parts.push(new THREE.CylinderGeometry(POLE_R, POLE_R, high, 8).translate(sx * half, high / 2, sz * half));
      parts.push(new THREE.BoxGeometry(0.2, 0.04, 0.2).translate(sx * half, 0.02, sz * half));
    }
  for (let side = 0; side < 4; side++) {
    for (const y of [...levels, high - 0.15]) turned(bar(v(-half, y, half), v(half, y, half), RAIL_R), side);
    // The front's lower lift stays open, so the sheet and the builders' notice read from the hall.
    if (side !== 0) {
      turned(bar(v(-half, 0.15, half), v(half, levels[0]! - 0.1, half), RAIL_R * 0.8), side);
      turned(bar(v(half, 0.15, half), v(-half, levels[0]! - 0.1, half), RAIL_R * 0.8), side);
    }
  }
  const decks: readonly (readonly [side: number, level: number])[] = [
    [2, 0],
    [1, 1],
  ];
  for (const [side, level] of decks) {
    const y = levels[level]! + RAIL_R + BOARD_HIGH / 2;
    for (let k = 0; k < 3; k++)
      turned(new THREE.BoxGeometry(2 * half, BOARD_HIGH, 0.2).translate(0, y, half - 0.11 - k * 0.22), side);
    // The deck's inner edge rests on a rail of its own.
    turned(bar(v(-half, levels[level]!, half - DECK_DEEP), v(half, levels[level]!, half - DECK_DEEP), RAIL_R), side);
  }
  for (const y of ROPES)
    parts.push(
      new THREE.TorusGeometry(sheetRadius(y) * 1.03, 0.035, 5, 28).rotateX(Math.PI / 2).translate(0, base + y, 0),
    );
  // Boxes are not indexed the way lathes and tubes are; one unindexed mesh takes them all.
  const loose = parts.map((part) => (part.index ? part.toNonIndexed() : part));
  const merged = mergeGeometries(loose);
  for (const part of new Set([...parts, ...loose])) part.dispose();
  return merged;
}

export function statueScaffold(p: JsonObject) {
  const { stone, cloth, timber, plinth, half, high, levels } = p;
  const colours = [stone, cloth, timber];
  if (
    !colours.every((c): c is `#${string}` => typeof c === 'string' && c.startsWith('#')) ||
    !Array.isArray(plinth) ||
    !plinth.length ||
    typeof half !== 'number' ||
    typeof high !== 'number' ||
    !Array.isArray(levels) ||
    levels.length < 2 ||
    !levels.every((y): y is number => typeof y === 'number')
  )
    throw new Error('town.statue-scaffold: expected stone, cloth and timber colours, plinth steps and a frame');
  const steps: THREE.BufferGeometry[] = [];
  let top = 0;
  for (const step of plinth) {
    if (!Array.isArray(step) || typeof step[0] !== 'number' || typeof step[1] !== 'number')
      throw new Error('town.statue-scaffold: a plinth step is [radius, height]');
    steps.push(new THREE.CylinderGeometry(step[0], step[0], step[1], 16).translate(0, top + step[1] / 2, 0));
    top += step[1];
  }
  const geometries = [mergeGeometries(steps), sheet(top), frame(half, high, levels, top)];
  for (const step of steps) step.dispose();
  const group = new THREE.Group();
  group.name = 'town:statue-works';
  geometries.forEach((geometry, i) => {
    const mesh = new THREE.Mesh(geometry, material(i === 2 ? 'timber' : 'stone', { colour: colours[i]! }));
    mesh.name = `town:statue-works:${['plinth', 'sheet', 'frame'][i]}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });
  return { object: group, dispose: () => geometries.forEach((geometry) => geometry.dispose()) };
}
registerBuilder('town.statue-scaffold', statueScaffold);
