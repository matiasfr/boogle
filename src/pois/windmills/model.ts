// Pure windmill geometry; the POI owns placement, clock and physics.
import * as THREE from 'three';
import { addPart, mergeParts } from '../../render/geometry-parts.ts';
type Geos = THREE.BufferGeometry[];
export const TOWER_H = 7.2;
export const R_BOTTOM = 2.5,
  R_TOP = 1.6;
export const PLINTH_H = 0.9;
export const HUB_UP = PLINTH_H + TOWER_H + 1.1; // hub height above the mill's ground
export const SAIL_LEN = 7.2;

const m = new THREE.Matrix4(),
  q = new THREE.Quaternion(),
  s = new THREE.Vector3();
const box = new THREE.BoxGeometry(1, 1, 1);
export const put = (
  parts: Geos,
  geo: THREE.BufferGeometry,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  color: string,
  rot?: THREE.Euler,
) => {
  q.setFromEuler(rot ?? new THREE.Euler());
  m.compose(new THREE.Vector3(x, y, z), q, s.set(sx, sy, sz));
  addPart(parts, geo, m, color);
};

// One mill's static body (local frame: origin at its foot, sails towards local -z).
export function millBody(parts: Geos) {
  put(
    parts,
    new THREE.CylinderGeometry(R_BOTTOM + 0.35, R_BOTTOM + 0.5, 1, 8),
    0,
    PLINTH_H / 2,
    0,
    1,
    PLINTH_H,
    1,
    '#9b958a',
  );
  // Weatherboarding: alternating bands.
  const bands = 6;
  for (let k = 0; k < bands; k++) {
    const t0 = k / bands,
      t1 = (k + 1) / bands;
    const r0 = R_BOTTOM + (R_TOP - R_BOTTOM) * t0,
      r1 = R_BOTTOM + (R_TOP - R_BOTTOM) * t1;
    const g = new THREE.CylinderGeometry(r1, r0, 1, 8);
    put(parts, g, 0, PLINTH_H + TOWER_H * (t0 + t1) * 0.5, 0, 1, TOWER_H / bands, 1, k % 2 ? '#8d6a45' : '#9a774f');
  }
  // Cap: a thatched dome, and the windshaft's housing.
  put(
    parts,
    new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    0,
    PLINTH_H + TOWER_H,
    0,
    R_TOP + 0.45,
    1.9,
    R_TOP + 0.75,
    '#b88e52',
  );
  put(parts, box, 0, HUB_UP, -1.3, 0.7, 0.7, 1.6, '#6f5034');
  // Door, windows, a little balcony rail.
  put(parts, box, 0, PLINTH_H + 1.05, -R_BOTTOM + 0.05, 1.05, 1.9, 0.2, '#5c3f26');
  put(parts, box, 0, PLINTH_H + 1.05, -R_BOTTOM - 0.02, 1.25, 2.1, 0.1, '#e9dcc0');
  for (const [y, ang] of [
    [PLINTH_H + 3.6, 0.5],
    [PLINTH_H + 5.4, -0.9],
  ] as const) {
    const r = R_BOTTOM + (R_TOP - R_BOTTOM) * ((y - PLINTH_H) / TOWER_H) - 0.05;
    put(parts, box, Math.sin(ang) * r, y, -Math.cos(ang) * r, 0.55, 0.7, 0.15, '#3b2a1c', new THREE.Euler(0, -ang, 0));
  }
}

// The rotor: four lattice sails with canvas on the leading side. Local frame: hub at the origin, sails in the xy plane.
export function rotorParts() {
  const parts: Geos = [];
  put(
    parts,
    new THREE.CylinderGeometry(0.42, 0.42, 0.5, 10),
    0,
    0,
    0,
    1,
    1,
    1,
    '#4d3622',
    new THREE.Euler(Math.PI / 2, 0, 0),
  );
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    const rot = new THREE.Euler(0, 0, a);
    const along = (d: number, w: number): [number, number] => [
      Math.cos(a) * d - Math.sin(a) * w,
      Math.sin(a) * d + Math.cos(a) * w,
    ];
    const [cx, cy] = along(SAIL_LEN / 2, 0);
    put(parts, box, cx, cy, 0, SAIL_LEN, 0.2, 0.2, '#6b4c30', rot); // whip
    for (const w of [-0.75, 0.75]) {
      const [rx, ry] = along(SAIL_LEN * 0.6, w);
      put(parts, box, rx, ry, -0.05, SAIL_LEN * 0.78, 0.08, 0.08, '#7d5a39', rot); // side rails
    }
    for (let b = 0; b < 7; b++) {
      const d = SAIL_LEN * 0.24 + b * SAIL_LEN * 0.12;
      const [bx, by] = along(d, 0);
      put(parts, box, bx, by, -0.05, 0.07, 1.6, 0.07, '#7d5a39', rot); // bars
    }
    const [sx, sy] = along(SAIL_LEN * 0.62, 0.28);
    put(parts, box, sx, sy, -0.1, SAIL_LEN * 0.72, 0.95, 0.03, '#efe4c9', rot); // canvas
  }
  return mergeParts(parts);
}
