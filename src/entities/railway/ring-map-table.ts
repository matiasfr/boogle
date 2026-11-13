// Ring Island's map table from the rivet on (docs/plans/greybox-route.md, leg 1 step 4b; the step 4 design review's
// answer l: "every display, the Ring Island map table included"). The table is ring-island/view.ts's greybox: a low
// top with the branch lines painted on it, which stays exactly as it is until the rivet. From the rivet a plate lies
// over that paint carrying the halt map's own drawing (halt-map.ts's lines for the stage, render/island-map.ts's
// face), Ring Island ringed as "you are here", so the first frame's own platform shows the stack line's marks.
// It lies flat and true to the ground: north (world -z) is up the map whichever side you read it from. No train
// markers (the boards' are quads on upright faces). One mesh, one draw, redrawn only when line 2's stage changes.
// Local.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { OwnedView } from '../../render/owned-view.ts';
import { drawMapBase, fitMap, mapLabelSteps, MAP_CELL, type MapLine } from '../../render/island-map.ts';
import { LINE2, RAIL_LINES } from '../../sim/railway-lines.ts';
import { RING_MAP_TABLE } from '../ring-island/state.ts';

const CW = MAP_CELL.w,
  CH = MAP_CELL.h,
  /** Canvas pixels a map pixel: the table's face is 2.3 m wide, twice a halt display's. */
  DENSITY = 2,
  /** The plate: over the table's own paint (up to 0.115 m over `top`), inside the top's edge. */
  PLATE = { y0: 0.08, y1: 0.135, w: RING_MAP_TABLE.w - 0.04, d: RING_MAP_TABLE.d - 0.04 },
  FACE_W = 2.3,
  FACE_D = (FACE_W * CH) / CW;
/** A reader of the table faces north: what lies to the north is up the map. */
const NORTH = { x: 0, z: -1 };
const HERE = [{ line: LINE2, stop: RAIL_LINES[LINE2]!.halts.findIndex((h) => h.ring && !h.leg) }];

export function createRingMapTable(owner: OwnedView) {
  const canvas = document.createElement('canvas');
  canvas.width = CW * DENSITY;
  canvas.height = CH * DENSITY;
  const g = canvas.getContext('2d')!;
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const material = new THREE.MeshStandardNodeMaterial({ map, roughness: 0.6 });
  // The plate samples the face's corner pixel (the map's ground), so plate and face are one mesh.
  const plate = new THREE.BoxGeometry(PLATE.w, PLATE.y1 - PLATE.y0, PLATE.d).translate(0, (PLATE.y0 + PLATE.y1) / 2, 0);
  const uv = plate.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.004, 0.996);
  const face = new THREE.PlaneGeometry(FACE_W, FACE_D).rotateX(-Math.PI / 2).translate(0, PLATE.y1 + 0.003, 0);
  const geometry = mergeGeometries([plate, face])!;
  plate.dispose();
  face.dispose();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'railway:ring-map-table';
  mesh.position.set(RING_MAP_TABLE.x, RING_MAP_TABLE.top, RING_MAP_TABLE.z);
  mesh.receiveShadow = true;
  mesh.visible = false;
  owner.add(mesh);
  owner.cleanup(() => {
    geometry.dispose();
    map.dispose();
    material.dispose();
  });
  let steps = 0;
  return {
    /** Draws the map for `lines` (halt-map.ts's, at a stage from the rivet on), its marks at `scale`. */
    draw(lines: readonly MapLine[], scale: number) {
      g.setTransform(DENSITY, 0, 0, DENSITY, 0, 0);
      drawMapBase(g, { x: 0, y: 0 }, CW, CH, lines, fitMap(lines, NORTH, CW, CH, CH * MAP_CELL.pad), HERE, scale);
      steps = mapLabelSteps;
      map.needsUpdate = true;
    },
    set(on: boolean) {
      mesh.visible = on;
    },
    inspect: () => ({
      on: mesh.visible,
      labelSteps: steps,
      at: [RING_MAP_TABLE.x, RING_MAP_TABLE.top, RING_MAP_TABLE.z],
    }),
  };
}
