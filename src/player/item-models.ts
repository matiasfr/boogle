// Models for everything a player can pick up, hold and throw: the stall's seeds and watering can, and the frisbee.
// itemModel(id) returns a fresh copy (sharing geometry and materials) resting on y = 0; an unknown id gets an empty
// group.
import * as THREE from 'three';

type V3t = [number, number, number];
const matCache = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: string, extra?: THREE.MeshStandardMaterialParameters) {
  const key = color + (extra ? JSON.stringify(extra) : '');
  if (!matCache.has(key))
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.65, flatShading: true, ...extra }));
  return matCache.get(key)!;
}
function add(
  g: THREE.Group,
  geo: THREE.BufferGeometry,
  color: string,
  { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], m }: { p?: V3t; r?: V3t; s?: V3t; m?: THREE.Material } = {},
) {
  const mesh = new THREE.Mesh(geo, m ?? mat(color));
  mesh.position.set(...p);
  mesh.rotation.set(...r);
  mesh.scale.set(...s);
  mesh.castShadow = true;
  g.add(mesh);
  return mesh;
}
const sphere = (r: number, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h);
const cyl = (a: number, b: number, h: number, n = 8) => new THREE.CylinderGeometry(a, b, h, n);
const PI = Math.PI;

// Each builder fills a group resting on y = 0.
const BUILD: Record<string, (g: THREE.Group) => void> = {
  can: (g) => {
    const m = mat('#4fa3d9', { roughness: 0.35, metalness: 0.3, flatShading: false });
    add(g, cyl(0.17, 0.2, 0.34, 14), '', { p: [0, 0.17, 0], m });
    add(g, cyl(0.025, 0.04, 0.42), '', { p: [0, 0.24, -0.27], r: [-0.9, 0, 0], m });
    add(g, cyl(0.06, 0.035, 0.05, 10), '', { p: [0, 0.39, -0.44], r: [-0.9, 0, 0], m });
    add(g, new THREE.TorusGeometry(0.12, 0.025, 6, 12, PI), '', { p: [0, 0.34, 0.02], r: [0, PI / 2, 0], m });
  },
  seeds: (g) => {
    add(g, sphere(0.16, 8, 6), '#d8b98a', { p: [0, 0.16, 0], s: [1, 1.15, 0.8] });
    add(g, cyl(0.05, 0.08, 0.08), '#7d5230', { p: [0, 0.33, 0] });
    add(g, new THREE.CircleGeometry(0.07, 10), '#e5483b', { p: [0, 0.17, -0.13], r: [0, PI, 0] });
  },
  frisbee: (g) => {
    const prof = [
      [0, 0.04],
      [0.22, 0.035],
      [0.27, 0.015],
      [0.275, 0],
      [0.255, 0],
      [0.24, 0.02],
      [0, 0.025],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    add(g, new THREE.LatheGeometry(prof, 24), '', {
      m: mat('#ff4fa3', { side: THREE.DoubleSide, flatShading: false, roughness: 0.4 }),
    });
    add(g, new THREE.TorusGeometry(0.15, 0.008, 4, 24), '#ffe066', { p: [0, 0.04, 0], r: [PI / 2, 0, 0] });
  },
};

const templates = new Map<string, THREE.Group>();
export function itemModel(id: string) {
  if (!templates.has(id)) {
    const g = new THREE.Group();
    BUILD[id]?.(g);
    templates.set(id, g);
  }
  return templates.get(id)!.clone();
}
