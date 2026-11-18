// The caves' furnishing (src/pois/caves/decor.ts places it): each thing's pieces in its own frame, for the caves to
// merge into their two draws (`layer: 'glow'` is the unlit one), and the underground pond's water.
// Things stand where decor.ts probes the cave, so most frames are translations; the pieces keep their old shapes,
// colours and turns exactly. Placement params carry what a seeded draw chose (a crate's spin, a crystal's size).
import * as THREE from 'three/webgpu';
import { readableGlow } from '../../render/readable-unlit.ts';
import { registerBuilder, type Piece } from '../builders.ts';
import { cellarRack, cellarRackDims } from '../cellar.ts';
import type { Json, JsonObject } from '../types.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'poi.cave-parts': true;
    'poi.cave-water': true;
  }
}

const box = new THREE.BoxGeometry(1, 1, 1),
  lanternGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.32, 6),
  coneGeo = new THREE.ConeGeometry(1, 1, 6),
  wheel = new THREE.CylinderGeometry(0.22, 0.22, 0.1, 10),
  lump = new THREE.IcosahedronGeometry(0.22, 0),
  vein = new THREE.OctahedronGeometry(0.2, 0),
  shard = new THREE.OctahedronGeometry(0.3, 0),
  stem = new THREE.CylinderGeometry(0.05, 0.07, 0.3, 6),
  cap = new THREE.SphereGeometry(0.2, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
  barrel = new THREE.LatheGeometry(
    [0, 0.34, 0.41, 0.44, 0.41, 0.34, 0].map((r, k) => new THREE.Vector2(r || 0.001, -0.45 + (k * 0.9) / 6)),
    12,
  ),
  hoop = new THREE.TorusGeometry(0.43, 0.025, 4, 14),
  bottle = new THREE.CylinderGeometry(0.06, 0.06, 0.3, 6),
  neck = new THREE.CylinderGeometry(0.022, 0.03, 0.12, 5),
  candle = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 6),
  flame = new THREE.ConeGeometry(0.035, 0.09, 5),
  stool = new THREE.CylinderGeometry(0.25, 0.22, 0.5, 8);

const num = (v: Json | undefined, name: string) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`poi.cave-parts: expected ${name}`);
  return v;
};
const text = (v: Json | undefined, name: string) => {
  if (typeof v !== 'string') throw new Error(`poi.cave-parts: expected ${name}`);
  return v;
};
const rows = (v: Json | undefined, name: string, width: number) => {
  if (!Array.isArray(v) || v.some((row) => !Array.isArray(row) || row.length !== width))
    throw new Error(`poi.cave-parts: expected ${name}`);
  return (v as Json[][]).map((row) => row.map((n) => num(n, name)));
};

/** One thing's pieces: decor.ts's old `put` calls, with the thing's origin taken out. */
export function cavePieces(params: JsonObject): Piece[] {
  const pieces: Piece[] = [];
  const e = new THREE.Euler(),
    q = new THREE.Quaternion(),
    sc = new THREE.Vector3();
  const put = (
    geometry: THREE.BufferGeometry,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    color: string,
    rx = 0,
    ry = 0,
    rz = 0,
    layer?: 'glow',
  ) => {
    q.setFromEuler(e.set(rx, ry, rz, 'YXZ'));
    pieces.push({
      geometry,
      matrix: new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, sc.set(sx, sy, sz)),
      color,
      ...(layer ? { layer } : {}),
    });
  };
  const piece = text(params.piece, 'piece');
  switch (piece) {
    case 'lantern':
      put(box, 0, 0.22, 0, 0.24, 0.05, 0.24, '#2b2622');
      put(box, 0, -0.2, 0, 0.26, 0.05, 0.26, '#2b2622');
      put(lanternGeo, 0, 0, 0, 1, 1, 1, text(params.color, 'colour'), 0, 0, 0, 'glow');
      break;
    case 'lantern-arm':
      put(box, 0, 0, 0, 0.06, 0.06, 0.36, '#2b2622');
      break;
    case 'mouth-frame': {
      const rx = num(params.rx, 'rx'),
        rz = num(params.rz, 'rz'),
        half = num(params.half, 'half');
      for (const sd of [-1, 1]) put(box, rx * half * sd, 1.4, rz * half * sd, 0.3, 2.8, 0.3, '#5d4026');
      put(box, 0, 2.85, 0, 0.32, 0.32, half * 2 + 0.6, '#5d4026', 0, Math.atan2(rx, rz));
      break;
    }
    case 'signpost':
      put(box, 0, 1.3, 0, 0.16, 2.6, 0.16, '#6b4a2c');
      break;
    case 'stalactite': {
      const len = num(params.len, 'length');
      put(coneGeo, 0, 0, 0, 0.18 + len * 0.08, len, 0.18 + len * 0.08, text(params.color, 'colour'), Math.PI);
      break;
    }
    case 'sleeper':
      put(box, 0, 0, 0, 1.7, 0.1, 0.24, text(params.color, 'colour'));
      break;
    case 'rail':
      put(box, 0, 0, 0, 0.08, 0.09, 0.84, '#6e6a66');
      break;
    case 'support-post':
      put(box, 0, 0, 0, 0.24, 2.7, 0.24, '#6a4a2d');
      break;
    case 'support-beam':
      put(box, 0, 0, 0, num(params.w, 'width'), 0.26, 0.26, '#6a4a2d');
      break;
    case 'minecart':
      put(box, 0, 0.75, 0, 1.0, 0.7, 1.4, '#5b4632');
      put(box, 0, 1.1, 0, 1.06, 0.08, 1.46, '#3c3a38');
      for (const [wx, wz] of [
        [-0.5, -0.45],
        [0.5, -0.45],
        [-0.5, 0.45],
        [0.5, 0.45],
      ] satisfies [number, number][])
        put(wheel, wx, 0.32, wz, 1, 1, 1, '#2e2c2a', 0, 0, Math.PI / 2);
      break;
    case 'ore-load':
      rows(params.lumps, 'lumps', 6).forEach(([x, y, z, rx, ry, rz], k) =>
        put(lump, x!, y!, z!, 1, 1, 1, k % 3 ? '#d8a531' : '#8b8278', rx, ry, rz),
      );
      break;
    case 'crate':
      put(box, 0, 0, 0, 1, 1, 1, '#9a7448', 0, num(params.spin, 'spin'));
      break;
    case 'pickaxe':
      put(box, 0.5, 0.9, 0, 0.07, 1.5, 0.07, '#6b4a2c', 0, 0, 0.35);
      put(box, 0.75, 1.6, 0, 0.75, 0.1, 0.1, '#8f8c88', 0, 0, 0.35);
      break;
    case 'lamp-post':
      put(box, 0, 1.15, 0, 0.12, 2.3, 0.12, '#6b4a2c');
      break;
    case 'ore-vein':
      for (const [x, y, z, sx, sy, sz, rx, ry] of rows(params.crystals, 'crystals', 8))
        put(vein, x!, y!, z!, sx!, sy!, sz!, '#ffd76a', rx, ry, 0, 'glow');
      break;
    case 'crystals': {
      const color = text(params.color, 'colour');
      for (const [x, y, z, sx, sy, sz, rx, ry, rz] of rows(params.crystals, 'crystals', 9))
        put(shard, x!, y!, z!, sx!, sy!, sz!, color, rx, ry, rz, 'glow');
      break;
    }
    case 'mushroom': {
      const s = num(params.s, 'size');
      put(stem, 0, 0.15 * s, 0, s, s, s, '#d9f3ef');
      put(cap, 0, 0.29 * s, 0, s, s * 0.8, s, '#5ff2d8', 0, 0, 0, 'glow');
      break;
    }
    case 'rowboat':
      put(box, 0, 0.25, 0, 1.0, 0.4, 2.4, '#7a5536', 0, 0.4, 0.06);
      put(box, 0, 0.48, 0, 1.1, 0.08, 2.5, '#5e3f27', 0, 0.4, 0.06);
      put(box, 0, 0.5, 0, 0.9, 0.06, 0.25, '#8d6643', 0, 0.4, 0.06);
      put(box, 0.7, 0.2, -0.6, 0.1, 0.08, 1.7, '#8d6643', 0, 1.3, 0);
      break;
    case 'rack-bay': {
      // Two tiers of barrels lying head-on to the wall, on a plank; some bays have no top barrel.
      const { step } = cellarRack(cellarRackDims(params));
      put(box, 0, 0.12, 0, step + 0.02, 0.16, 0.9, '#4e3826');
      for (const tier of params.top === false ? [0] : [0, 1]) {
        const by = 0.62 + tier * 0.86;
        put(barrel, 0, by, 0, 1, 1, 1, tier ? '#8a5a35' : '#7a4e2f', Math.PI / 2, 0, 0);
        for (const hzOff of [-0.28, 0.28]) put(hoop, 0, by, hzOff, 1, 1, 1, '#3a3632', 0, 0, 0);
      }
      break;
    }
    case 'bottle-shelf':
      put(box, 0, 1.2, 0, 0.5, 2.4, 1.2, '#5a3f28'); // the placement stretches it along the wall
      break;
    case 'bottles': {
      const hz = num(params.hz, 'shelf half-length');
      for (let row = 0; row < 5; row++)
        for (let col = 0; col < 9; col++) {
          const y = 0.35 + row * 0.42,
            z = -hz * 0.55 + col * ((hz * 1.1) / 8);
          const glass = ['#1f4d2b', '#3b1d24', '#264a35'][(row + col) % 3]!;
          put(bottle, 0.2, y, z, 1, 1, 1, glass, 0, 0, Math.PI / 2);
          put(neck, 0.4, y, z, 1, 1, 1, glass, 0, 0, Math.PI / 2);
        }
      break;
    }
    case 'cask':
      put(barrel, 0, 1.25, 0, 2.4, 2.2, 2.4, '#7d4f2d', 0, 0, Math.PI / 2);
      for (const off of [-0.7, 0, 0.7]) put(hoop, off, 1.25, 0, 2.4, 2.4, 2.4, '#3a3632', 0, Math.PI / 2, 0);
      put(box, 0, 0.2, 0, 1.6, 0.4, 1.6, '#4e3826');
      put(box, -1.1, 1.0, 0, 0.2, 0.1, 0.1, '#b48a3c');
      break;
    case 'table':
      // A table with candles and a bottle, off to the side of the way through.
      put(box, 0, 0.78, 0, 2.2, 0.1, 1.1, '#6b4a2c');
      for (const [lx, lz] of [
        [-1, -0.45],
        [1, -0.45],
        [-1, 0.45],
        [1, 0.45],
      ] satisfies [number, number][])
        put(box, lx, 0.38, lz, 0.1, 0.76, 0.1, '#5a3f28');
      put(bottle, -0.5, 0.98, 0.1, 1, 1, 1, '#1f4d2b');
      put(neck, -0.5, 1.18, 0.1, 1, 1, 1, '#1f4d2b');
      for (const [lx, lz] of [
        [0.2, -0.2],
        [0.45, 0.15],
        [0.65, -0.1],
      ] satisfies [number, number][]) {
        put(candle, lx, 0.93, lz, 1, 1, 1, '#f3ead6');
        put(flame, lx, 1.08, lz, 1, 1, 1, '#ffcc66', 0, 0, 0, 'glow');
      }
      break;
    case 'stool':
      put(stool, 0, 0.25, 0, 1, 1, 1, '#5a3f28');
      break;
    default:
      throw new Error(`poi.cave-parts: unknown piece ${piece}`);
  }
  return pieces;
}
registerBuilder('poi.cave-parts', (params) => ({ pieces: cavePieces(params) }));

// The pond's surface: real water (src/pois/caves/index.ts registers it). The placement sizes the unit disc.
registerBuilder('poi.cave-water', () => {
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2),
    readableGlow(
      new THREE.MeshStandardNodeMaterial({
        color: '#0b3a44',
        emissive: '#0e5866',
        emissiveIntensity: 0.4,
        roughness: 0.08,
        metalness: 0.3,
        transparent: true,
        opacity: 0.84,
      }),
    ),
  );
  return water;
});
