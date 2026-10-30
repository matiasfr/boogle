// Models for everything a player can pick up, hold and throw: island gifts, the stall's seeds and watering can, the
// shovel and the frisbee. itemModel(id) returns a fresh copy (sharing geometry and materials) resting on y = 0.
import * as THREE from 'three';

const matCache = new Map();
function mat(color, extra) {
  const key = color + (extra ? JSON.stringify(extra) : '');
  if (!matCache.has(key))
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.65, flatShading: true, ...extra }));
  return matCache.get(key);
}
function add(g, geo, color, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], m } = {}) {
  const mesh = new THREE.Mesh(geo, m ?? mat(color));
  mesh.position.set(...p);
  mesh.rotation.set(...r);
  mesh.scale.set(...s);
  mesh.castShadow = true;
  g.add(mesh);
  return mesh;
}
const sphere = (r, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const cyl = (a, b, h, n = 8) => new THREE.CylinderGeometry(a, b, h, n);
const PI = Math.PI;
const glass = (color, opacity) => ({
  m: mat(color, { transparent: true, opacity, roughness: 0.15, flatShading: false }),
});

// Each builder fills a group resting on y = 0.
const BUILD = {
  coconut: (g) => add(g, sphere(0.2), '#6b4423', { p: [0, 0.18, 0], s: [1, 0.92, 1] }),
  mango: (g) => {
    add(g, sphere(0.15), '#ffb02e', { p: [0, 0.13, 0], s: [1, 0.85, 1.35] });
    add(g, new THREE.ConeGeometry(0.04, 0.12, 4), '#4e9a3d', { p: [0, 0.26, 0.12], r: [0.6, 0, 0] });
  },
  banana: (g) => {
    for (const [k, y] of [
      [-0.06, 0.05],
      [0, 0.09],
      [0.06, 0.05],
    ])
      add(g, new THREE.TorusGeometry(0.2, 0.05, 6, 10, PI * 0.7), '#ffe066', { p: [k, y, -0.1], r: [PI / 2, 0, 0.6] });
  },
  pomegranate: (g) => {
    add(g, sphere(0.16), '#c8243a', { p: [0, 0.15, 0] });
    add(g, cyl(0.035, 0.05, 0.07, 6), '#8a1a28', { p: [0, 0.32, 0] });
  },
  apricot: (g) => add(g, sphere(0.11, 9, 7), '#ff9a4a', { p: [0, 0.1, 0] }),
  shell: (g) => {
    add(g, new THREE.ConeGeometry(0.16, 0.34, 7), '#ffc7c2', { p: [0, 0.13, 0], r: [0, 0, PI / 2] });
    add(g, sphere(0.12), '#fff0ec', { p: [-0.15, 0.1, 0], s: [0.4, 1, 1] });
  },
  starfish: (g) => {
    add(g, sphere(0.08), '#ff7b4a', { p: [0, 0.03, 0], s: [1, 0.4, 1] });
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * PI * 2;
      add(g, new THREE.ConeGeometry(0.06, 0.24, 4), '#ff7b4a', {
        p: [Math.cos(a) * 0.15, 0.03, -Math.sin(a) * 0.15],
        r: [0, a, -PI / 2],
        s: [1, 1, 0.45],
      });
    }
  },
  driftwood: (g) => {
    add(g, cyl(0.06, 0.09, 0.9, 6), '#9c8a74', { p: [0, 0.07, 0], r: [0, 0.3, PI / 2] });
    add(g, cyl(0.03, 0.04, 0.32, 5), '#8b7a64', { p: [0.15, 0.08, 0.12], r: [0, -0.9, PI / 2] });
  },
  seaweed: (g) => {
    for (const [a, c] of [
      [0, '#3b7d3a'],
      [1.1, '#4f9a46'],
      [2.3, '#2f6a35'],
    ])
      add(g, sphere(1, 6, 4), c, { p: [0, 0.04, 0], r: [0, a, 0], s: [0.3, 0.07, 0.1] });
  },
  flipflop: (g) => {
    add(g, box(0.14, 0.03, 0.32), '#3dc7ff', { p: [0, 0.015, 0] });
    add(g, new THREE.TorusGeometry(0.055, 0.012, 4, 10, PI), '#ffffff', { p: [0, 0.03, -0.05], r: [0, PI / 2, 0] });
  },
  boot: (g) => {
    add(g, box(0.18, 0.11, 0.32), '#6b4a2e', { p: [0, 0.055, 0.06] });
    add(g, box(0.18, 0.34, 0.15), '#6b4a2e', { p: [0, 0.17, -0.08] });
    add(g, box(0.2, 0.04, 0.17), '#4f3520', { p: [0, 0.34, -0.08] });
  },
  duck: (g) => {
    add(g, sphere(0.13), '#ffd23f', { p: [0, 0.11, 0], s: [1.25, 0.9, 1] });
    add(g, sphere(0.085), '#ffd23f', { p: [0.1, 0.25, 0] });
    add(g, new THREE.ConeGeometry(0.035, 0.08, 6), '#ff8a2b', { p: [0.2, 0.24, 0], r: [0, 0, -PI / 2] });
    for (const z of [-0.045, 0.045]) add(g, sphere(0.015, 6, 4), '#13243f', { p: [0.16, 0.28, z] });
  },
  sunglasses: (g) => {
    for (const x of [-0.08, 0.08]) add(g, cyl(0.065, 0.065, 0.02, 14), '#1d1d2b', { p: [x, 0.012, 0] });
    add(g, box(0.05, 0.015, 0.015), '#ff4fa3', { p: [0, 0.015, -0.02] });
    for (const x of [-0.145, 0.145]) add(g, box(0.012, 0.012, 0.2), '#ff4fa3', { p: [x, 0.012, 0.09] });
  },
  sponge: (g) => add(g, box(0.22, 0.12, 0.16), '#ffe14d', { p: [0, 0.06, 0] }),
  float: (g) => {
    add(g, sphere(0.17, 14, 10), '', { p: [0, 0.17, 0], ...glass('#6ec6ff', 0.75) });
    for (const ry of [0, PI / 2])
      add(g, new THREE.TorusGeometry(0.172, 0.012, 4, 16), '#c9b48a', { p: [0, 0.17, 0], r: [0, ry, 0] });
  },
  bottle: (g) => {
    add(g, cyl(0.07, 0.07, 0.26, 10), '', { p: [0, 0.07, 0], r: [0, 0, PI / 2], ...glass('#4fae6d', 0.55) });
    add(g, cyl(0.03, 0.05, 0.08, 8), '', { p: [0.17, 0.07, 0], r: [0, 0, PI / 2], ...glass('#4fae6d', 0.55) });
    add(g, cyl(0.032, 0.032, 0.05, 8), '#b07a45', { p: [0.23, 0.07, 0], r: [0, 0, PI / 2] });
    add(g, cyl(0.045, 0.045, 0.18, 8), '#fffaf0', { p: [0, 0.07, 0], r: [0, 0, PI / 2] });
  },
  card: (g) => {
    add(g, box(0.2, 0.012, 0.12), '#f4f1e8', { p: [0, 0.006, 0] });
    add(g, box(0.2, 0.014, 0.03), '#ff6b5a', { p: [0, 0.007, 0.03] });
  },
  melon: (g) => add(g, sphere(0.2, 12, 8), '#e8d36a', { p: [0, 0.17, 0], s: [1, 0.85, 1.5] }),
  teacup: (g) => {
    const prof = [
      [0, 0],
      [0.055, 0],
      [0.07, 0.015],
      [0.13, 0.095],
      [0.12, 0.1],
      [0.06, 0.025],
      [0, 0.025],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    add(g, new THREE.LatheGeometry(prof, 18), '', {
      m: mat('#f7f7f2', { side: THREE.DoubleSide, flatShading: false }),
    });
    add(g, new THREE.TorusGeometry(0.115, 0.008, 4, 20), '#2f6bd8', { p: [0, 0.08, 0], r: [PI / 2, 0, 0] });
  },
  book: (g) => {
    add(g, box(0.26, 0.06, 0.34), '#2f8cff', { p: [0, 0.03, 0] });
    add(g, box(0.25, 0.05, 0.32), '#f6f0dc', { p: [0.012, 0.03, 0] });
  },
  abacus: (g) => {
    for (const z of [-0.12, 0.12]) add(g, box(0.4, 0.03, 0.03), '#b5763a', { p: [0, 0.02, z] });
    for (const x of [-0.19, 0.19]) add(g, box(0.03, 0.03, 0.27), '#b5763a', { p: [x, 0.02, 0] });
    for (let r = 0; r < 4; r++) {
      const z = -0.08 + r * 0.055;
      add(g, cyl(0.005, 0.005, 0.36, 4), '#7d5230', { p: [0, 0.02, z], r: [0, 0, PI / 2] });
      for (let b = 0; b < 4; b++)
        add(g, sphere(0.022, 6, 4), b % 2 ? '#ffcf33' : '#e5483b', { p: [-0.13 + b * 0.05 + (r % 2) * 0.1, 0.02, z] });
    }
  },
  doppi: (g) => {
    add(g, cyl(0.16, 0.18, 0.12, 4), '#1f2a24', { p: [0, 0.06, 0], r: [0, PI / 4, 0] });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * PI * 2;
      add(g, sphere(0.035, 6, 4), '#fffaf0', {
        p: [Math.sin(a) * 0.13, 0.06, Math.cos(a) * 0.13],
        r: [0, a, 0],
        s: [0.6, 1, 0.3],
      });
    }
  },
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

const templates = new Map();
export function itemModel(id) {
  if (!templates.has(id)) {
    const g = new THREE.Group();
    (BUILD[id] ?? BUILD.coconut)(g);
    templates.set(id, g);
  }
  return templates.get(id).clone();
}
