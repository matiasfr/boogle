// Furnishing the caves: lanterns along the tunnels, timber frames and name boards at the mouths, a signpost at the
// hub, and the three chambers: the abandoned mine (rails, props, a minecart full of ore, glowing ore veins), the
// underground pond (water, glowing crystals and mushrooms, stalactites, a rowboat) and the wine cellar (barrel racks,
// bottle shelves, a big cask, a candlelit table).
//
// Things are placed by probing the cave's distance field (caveSd), so lanterns sit on real walls and stalactites
// hang from the real ceiling even if the network changes. Colliders are in the CAVE group: only bodies underground
// touch them.
//
// Each thing is a record (content/prefabs/caves.ts) with its own pieces and solids. caveDecor() works out where each
// stands, in the order the caves always drew them; buildDecor() stands them under the caves' owner and merges their
// pieces into two draws.
import * as THREE from 'three/webgpu';
import { addPart, mergeParts } from '../../render/geometry-parts.ts';
import { addLightSource, removeLightSource } from '../../render/lights.ts';
import { readableUnlit } from '../../render/readable-unlit.ts';
import { mulberry32 } from '../../math.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { definitions } from '../../prefab/catalogue.ts';
import { cellarRack, cellarRackDims } from '../../prefab/cellar.ts';
import { caveSd } from './mesh.ts';
import { ambAt, withCaveAmbient } from './ambient.ts';
import { NODES, SEGMENTS, MOUTHS, POND, TUNNEL_R, FLOOR_CUT, type CaveNode } from './network.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { JsonObject, Placement, PrefabKey, Vec3 } from '../../prefab/types.ts';

type P3 = { x: number; y: number; z: number };
type Step = P3 & { dx: number; dz: number };
type Geos = THREE.BufferGeometry[];

// ---------------------------------------------------------------- probing the cave
function march(x: number, y: number, z: number, dx: number, dy: number, dz: number, max = 14) {
  for (let t = 0; t < max; t += 0.1) if (caveSd(x + dx * t, y + dy * t, z + dz * t) > 0) return t;
  return max;
}
const ceilingAbove = (x: number, y: number, z: number) => y + march(x, y, z, 0, 1, 0);
const floorBelow = (x: number, y: number, z: number) => y - march(x, y, z, 0, -1, 0);
// The wall in direction (dx, dz) from a point, pulled back by inset: [x, y, z].
function wallAt(x: number, y: number, z: number, dx: number, dz: number, inset: number): [number, number, number] {
  const l = Math.sqrt(dx * dx + dz * dz);
  const t = march(x, y, z, dx / l, 0, dz / l);
  return [x + (dx / l) * (t - inset), y, z + (dz / l) * (t - inset)];
}

// Points every `step` metres along a polyline (floor heights interpolated), with the direction there.
function along(pts: P3[], step: number, from = 0) {
  const out: Step[] = [];
  let carry = from;
  for (let k = 0; k + 1 < pts.length; k++) {
    const a = pts[k]!,
      b = pts[k + 1]!;
    const dx = b.x - a.x,
      dz = b.z - a.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    for (let s = carry; s < len; s += step) {
      const t = s / len;
      out.push({ x: a.x + dx * t, y: a.y + (b.y - a.y) * t, z: a.z + dz * t, dx: dx / len, dz: dz / len });
    }
    carry = Math.max(0, carry - len) + ((step - ((len - carry) % step)) % step);
  }
  return out;
}

const yawOf = (dx: number, dz: number) => Math.atan2(dx, dz);

// Whether (x, z) is inside chamber n's footprint (grown by pad, as a fraction of its radii).
const inside = (n: { x: number; z: number; r: number[] }, x: number, z: number, pad = 0.15) =>
  Math.hypot((x - n.x) / n.r[0]!, (z - n.z) / n.r[2]!) < 1 + pad;

// How close (x, z) is to the centre line of any tunnel leaving chamber `id`: keeps decor out of the doorways.
function nearTunnel(id: string, x: number, z: number) {
  let best = Infinity;
  for (const s of SEGMENTS) {
    if (s.from !== id && s.to !== id) continue;
    for (let k = 0; k + 1 < s.pts.length; k++) {
      const a = s.pts[k]!,
        b = s.pts[k + 1]!;
      const ex = b.x - a.x,
        ez = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * ex + (z - a.z) * ez) / (ex * ex + ez * ez || 1)));
      best = Math.min(best, Math.hypot(a.x + ex * t - x, a.z + ez * t - z));
    }
  }
  return best;
}

// ---------------------------------------------------------------- text boards
/** The boards' words, by label key: the mouths' names (network.ts), the hub's signpost and the two chamber signs. */
const SIGNPOST: [string, string][] = [
  ['mine', 'Old mine'],
  ['pond', 'Pond'],
  ['cellar', 'Cellar'],
  ['south', 'Way out'],
];
const CAVE_TEXT: Record<string, string> = {
  ...Object.fromEntries(MOUTHS.map((m) => [`mouth.${m.id}`, m.label])),
  ...Object.fromEntries(
    SIGNPOST.flatMap(([id, label]) => [
      [`sign.${id}`, label + ' →'],
      [`sign.${id}.back`, '← ' + label],
    ]),
  ),
  mine: 'Old Boogle Mine',
  cellar: 'Wine Cellar',
};

function board(text: string, w: number, h: number, bg = '#6b4a2c', fg = '#f6e7c8') {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = Math.round((256 * h) / w);
  const g = c.getContext('2d')!;
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = 'rgba(0,0,0,0.18)';
  for (let y = 8; y < c.height; y += 18) g.fillRect(0, y, c.width, 2);
  g.fillStyle = fg;
  g.font = `400 ${Math.round(c.height * 0.52)}px 'Lilita One', 'Trebuchet MS', sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height * 0.54, c.width - 16);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
}

// A mouth's timber frame: posts `half` metres either side of (fx, fz) along (rx, rz), 2.8 m tall, beam on top.
export function mouthFrame(m: { x: number; z: number; ox: number; oz: number }) {
  return {
    rx: -m.oz,
    rz: m.ox, // right, looking out
    fx: m.x - m.ox * 0.6,
    fz: m.z - m.oz * 0.6,
    half: Math.sqrt(TUNNEL_R ** 2 - FLOOR_CUT ** 2) - 0.35,
  };
}

/** Where every furnishing thing stands, in drawing order. Seeded: the same caves always get the same things. */
function caveDecor(): Placement[] {
  const rng = mulberry32(4242);
  const out: Placement[] = [];
  const place = (prefab: PrefabKey, pos: Vec3, extra: Omit<Placement, 'id' | 'prefab' | 'pos'> = {}) =>
    out.push({ id: `cave/${out.length}`, prefab, pos, ...extra });
  const turned = (yaw: number) => ({ rot: [yaw, 0, 0] as Vec3 });

  // ---------------------------------------------------------------- lanterns
  const lantern = (x: number, y: number, z: number, color = '#ffc56e', intensity = 16) =>
    place('cave.lantern', [x, y, z], { params: { color, light: { color, intensity, distance: 13 } } });
  const wallLantern = (p: Step, side: number) => {
    const [x, , z] = wallAt(p.x, p.y + 2.2, p.z, -p.dz * side, p.dx * side, 0.32);
    lantern(x, p.y + 2.2, z);
    place(
      'cave.lantern-arm',
      [x - p.dz * side * 0.16, p.y + 2.45, z + p.dx * side * 0.16],
      turned(yawOf(-p.dz * side, p.dx * side)),
    );
  };
  for (const s of SEGMENTS) {
    const pts = along(s.pts, 11, 5);
    pts.forEach((p, k) => {
      const outM = MOUTHS.some((m) => Math.hypot(p.x - m.x, p.z - m.z) < 5);
      if (!outM && caveSd(p.x, p.y + 1.5, p.z) < -1) wallLantern(p, k % 2 ? 1 : -1);
    });
  }

  // ---------------------------------------------------------------- mouths: timber frames and name boards
  for (const m of MOUTHS) {
    const { rx, rz, fx, fz, half } = mouthFrame(m);
    place('cave.mouth-frame', [fx, m.y, fz], { params: { rx, rz, half } });
    place('cave.mouth-board', [fx + m.ox * 0.18, m.y + 2.85, fz + m.oz * 0.18], {
      ...turned(yawOf(m.ox, m.oz)),
      labels: { board: `mouth.${m.id}` },
    });
    lantern(fx + rx * (half - 0.05) + m.ox * 0.25, m.y + 2.2, fz + rz * (half - 0.05) + m.oz * 0.25);
  }

  // ---------------------------------------------------------------- hub: signpost
  {
    const h = NODES.hub;
    place('cave.signpost', [h.x, h.y, h.z]);
    SIGNPOST.forEach(([id], k) => {
      const n = (NODES as Record<string, CaveNode>)[id]!;
      const dx = n.x - h.x,
        dz = n.z - h.z;
      const l = Math.hypot(dx, dz);
      const ux = dx / l,
        uz = dz / l;
      // Two boards back to back, each reading towards its arrow.
      for (const back of [false, true])
        place('cave.sign-board', [h.x + ux * 0.75, h.y + 2.2 - k * 0.38, h.z + uz * 0.75], {
          ...turned(Math.atan2(-uz, ux) + (back ? Math.PI : 0)),
          labels: { board: back ? `sign.${id}.back` : `sign.${id}` },
        });
    });
    lantern(h.x + 0.3, h.y + 2.7, h.z, '#ffc56e', 20);
  }

  // ---------------------------------------------------------------- stalactites (hub and pond)
  const drips = (n: { x: number; y: number; z: number; r: number[] }, count: number, color: string) => {
    const y0 = n.y;
    for (let k = 0; k < count; k++) {
      const a = rng() * Math.PI * 2,
        d = Math.sqrt(rng()) * n.r[0]!;
      const x = n.x + Math.cos(a) * d,
        z = n.z + Math.sin(a) * d;
      if (caveSd(x, y0 + 1.5, z) > -0.3) continue;
      const top = ceilingAbove(x, y0 + 1.5, z);
      const len = 0.5 + rng() * 1.5;
      place('cave.stalactite', [x, top - len / 2 + 0.15, z], { params: { len, color } });
    }
  };
  drips(NODES.hub, 12, '#8a8073');
  drips(NODES.pond, 26, '#76838a');

  // ---------------------------------------------------------------- the mine
  {
    const mine = NODES.mine;
    const toMine = SEGMENTS.find((s) => s.from === 'hub' && s.to === 'mine')!.pts;
    const toEast = SEGMENTS.find((s) => s.from === 'mine' && s.to === 'east')!.pts;
    const track = [...toMine.slice(0, -1), ...toEast.slice(0, -1)]; // hub -> mine -> just inside the east mouth
    // Rails and sleepers.
    const rail = along(track, 0.8, 7);
    rail.forEach((p, k) => {
      const yaw = yawOf(p.dx, p.dz);
      place('cave.sleeper', [p.x, p.y + 0.05, p.z], {
        ...turned(yaw),
        params: { color: k % 3 ? '#5a4330' : '#4e3a2a' },
      });
      if (k + 1 < rail.length) {
        const n = rail[k + 1]!;
        for (const sd of [-0.55, 0.55])
          place(
            'cave.rail',
            [(p.x + n.x) / 2 - p.dz * sd, (p.y + n.y) / 2 + 0.14, (p.z + n.z) / 2 + p.dx * sd],
            turned(yaw),
          );
      }
    });
    // Timber supports in the mine's tunnels (not in the chamber itself).
    const half = Math.sqrt(TUNNEL_R ** 2 - FLOOR_CUT ** 2) - 0.3;
    for (const p of along(track, 4.2, 9)) {
      if (inside(mine, p.x, p.z, 0.05) || inside(NODES.hub, p.x, p.z, 0.05)) continue;
      const yaw = yawOf(p.dx, p.dz);
      for (const sd of [-1, 1])
        place('cave.support-post', [p.x - p.dz * half * sd, p.y + 1.35, p.z + p.dx * half * sd], turned(yaw));
      place('cave.support-beam', [p.x, p.y + 2.78, p.z], { ...turned(yaw), params: { w: half * 2 + 0.3 } });
    }
    // A minecart full of ore on the rails, near the middle of the chamber.
    const near = rail.reduce((b, p) =>
      Math.hypot(p.x - mine.x, p.z - mine.z) < Math.hypot(b.x - mine.x, b.z - mine.z) ? p : b,
    );
    const cart = { x: near.x + near.dx * 3, y: near.y, z: near.z + near.dz * 3, yaw: yawOf(near.dx, near.dz) };
    place('cave.minecart', [cart.x, cart.y, cart.z], turned(cart.yaw));
    const lumps: number[][] = [];
    for (let k = 0; k < 9; k++) {
      const x = (rng() - 0.5) * 0.6,
        y = 1.15 + rng() * 0.15,
        z = (rng() - 0.5) * 0.9;
      lumps.push([x, y, z, rng(), rng(), rng()]);
    }
    place('cave.ore-load', [cart.x, cart.y, cart.z], { params: { lumps } });
    // Crates, a barrel, a pickaxe, a lantern on a post.
    for (let k = 0, tries = 0; k < 4 && tries < 40; tries++) {
      const a = rng() * Math.PI * 2;
      const [wx, , wz] = wallAt(mine.x, mine.y + 0.6, mine.z, Math.cos(a), Math.sin(a), 1.1);
      if (nearTunnel('mine', wx, wz) < 2.6) continue;
      k++;
      const s = 0.8 + rng() * 0.3;
      place('cave.crate', [wx, mine.y + s / 2, wz], { scale: [s, s, s], params: { spin: rng() * 3 } });
      if (k === 1) place('cave.pickaxe', [wx, mine.y, wz]);
    }
    lantern(mine.x - 2, mine.y + 2.4, mine.z + 1.5, '#ffc56e', 20);
    place('cave.lamp-post', [mine.x - 2, mine.y, mine.z + 1.5]);
    // Ore veins glinting in the walls.
    for (let k = 0; k < 14; k++) {
      const a = rng() * Math.PI * 2,
        y = mine.y + 0.8 + rng() * 2.6;
      const [wx, wy, wz] = wallAt(mine.x, y, mine.z, Math.cos(a), Math.sin(a), 0.05);
      if (!inside(mine, wx, wz)) continue; // looked down a tunnel
      const crystals: number[][] = [];
      for (let c = 0; c < 4; c++) {
        const x = (rng() - 0.5) * 0.4,
          y = (rng() - 0.5) * 0.4,
          z = (rng() - 0.5) * 0.4;
        const sx = 0.6 + rng(),
          sy = 1 + rng(),
          sz = 0.6 + rng();
        crystals.push([x, y, z, sx, sy, sz, rng() * 3, rng() * 3]);
      }
      place('cave.ore-vein', [wx, wy, wz], { params: { crystals } });
    }
    place('cave.mine-board', [mine.x + 3, mine.y + 2.5, mine.z - 2], {
      ...turned(-0.6),
      labels: { board: 'mine' },
      params: { bg: '#3d2c1e' },
    });
  }

  // ---------------------------------------------------------------- the pond
  {
    const pond = NODES.pond;
    place('cave.pond', [POND.x, POND.level, POND.z], { scale: [POND.rx * 0.86, 1, POND.rz * 0.86] });
    // Crystal clusters round the edge and in the walls; some of them light the place.
    const colors = ['#79f0ff', '#b48cff', '#7cf5c8'];
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2 + rng() * 0.3;
      const onWall = k % 2 === 0;
      const y = onWall ? pond.y + 0.6 + rng() * 2.5 : pond.y + 0.1;
      const [x, , z] = onWall
        ? wallAt(pond.x, y, pond.z, Math.cos(a), Math.sin(a), 0.1)
        : [POND.x + Math.cos(a) * POND.rx * 1.02, 0, POND.z + Math.sin(a) * POND.rz * 1.02];
      if (!inside(pond, x, z)) continue; // looked down a tunnel
      const fy = onWall ? y : floorBelow(x, pond.y + 1, z);
      const color = colors[k % 3]!;
      const crystals: number[][] = [];
      for (let c = 0; c < 5; c++) {
        const cx = (rng() - 0.5) * 0.6,
          cy = 0.2 + rng() * 0.3,
          cz = (rng() - 0.5) * 0.6;
        const sx = 0.5 + rng() * 0.6,
          sy = 1.2 + rng() * 1.6,
          sz = 0.5 + rng() * 0.6;
        crystals.push([cx, cy, cz, sx, sy, sz, (rng() - 0.5) * 0.7, rng() * 3, (rng() - 0.5) * 0.7]);
      }
      const params: JsonObject = { color, crystals };
      place('cave.crystals', [x, fy, z], {
        params: k % 4 === 0 ? { ...params, light: { color, intensity: 14, distance: 12 } } : params,
      });
    }
    // Glowing mushrooms by the water (cousins of the garden's).
    for (let k = 0; k < 14; k++) {
      const a = rng() * Math.PI * 2,
        r = 1.08 + rng() * 0.25;
      const x = POND.x + Math.cos(a) * POND.rx * r,
        z = POND.z + Math.sin(a) * POND.rz * r;
      const y = floorBelow(x, pond.y + 1.2, z);
      place('cave.mushroom', [x, y, z], { params: { s: 0.6 + rng() * 0.9 } });
    }
    // A little rowboat pulled up on the shore.
    let bx = POND.x,
      bz = POND.z - POND.rz * 1.05;
    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      const x = POND.x + Math.cos(a) * POND.rx * 1.06,
        z = POND.z + Math.sin(a) * POND.rz * 1.06;
      if (nearTunnel('pond', x, z) > 3.5) {
        bx = x;
        bz = z;
        break;
      }
    }
    place('cave.rowboat', [bx, floorBelow(bx, pond.y + 1, bz), bz]);
  }

  // ---------------------------------------------------------------- the wine cellar
  {
    const c = NODES.cellar;
    const [hx, , hz] = c.half;
    // Racks along both long walls: bays of barrels lying head-on to the wall, with gaps for the tunnels.
    const rackParams = definitions['cave.rack-bay']!.visual;
    const { count, step } = cellarRack(cellarRackDims('builder' in rackParams ? rackParams.params : {}));
    for (const side of [-1, 1]) {
      const wz = c.z + side * (hz - 0.75);
      for (let k = 0; k < count; k++) {
        const bx = c.x - hx + 1.4 + k * step;
        if (nearTunnel('cellar', bx, wz) < 2.4) continue;
        place('cave.rack-bay', [bx, c.y, wz], k % 3 === 2 ? { params: { top: false } } : {});
      }
    }
    // Bottle shelves on the far wall.
    const shelfX = c.x - hx + 0.35;
    place('cave.bottle-shelf', [shelfX, c.y, c.z], { scale: [1, 1, hz] });
    place('cave.bottles', [shelfX, c.y, c.z], { params: { hz } });
    // The big cask at the other end, on a cradle, with a tap; a table with candles and two stools.
    place('cave.cask', [c.x + hx - 1.4, c.y, c.z]);
    const tx = c.x - 2;
    place('cave.table', [tx, c.y, c.z], { params: { light: { color: '#ffbb66', intensity: 22, distance: 11 } } });
    for (const lx of [-1.6, 1.6]) place('cave.stool', [tx + lx, c.y, c.z + 0.2]);
    place('cave.mouth-board', [c.x - hx + 0.62, c.y + 2.75, c.z], {
      ...turned(Math.PI / 2),
      labels: { board: 'cellar' },
      params: { bg: '#3d2018' },
    });
  }
  return out;
}

type Light = { color: string; intensity: number; distance: number };
/** Stand every thing under `owner` (still: they never move) and merge their pieces into the rock-lit and glowing draws. */
export function buildDecor(owner: OwnedView) {
  const parts: Geos = [],
    glow: Geos = [];
  for (const p of caveDecor()) {
    const bg = p.params?.bg as string | undefined;
    const thing = instantiate(p.prefab, p, {
      owner,
      still: true,
      makeLabel: (a, key) => {
        const b = board(CAVE_TEXT[key]!, a.w, a.h, bg);
        b.position.fromArray(a.at);
        return b;
      },
    });
    thing.setEnabled(true);
    for (const piece of thing.pieces)
      addPart(piece.layer === 'glow' ? glow : parts, piece.geometry, piece.matrix, piece.color);
    const light = p.params?.light as Light | undefined;
    if (light) {
      const source = addLightSource({ ...light, position: thing.attach('light').at });
      owner.cleanup(() => removeLightSource(source));
    }
  }

  // Props darken with depth like the rock around them (aAmb scales the sky's ambient light, see index.ts).
  const solidGeo = mergeParts(parts);
  const sp = solidGeo.attributes.position!.array;
  const amb = new Float32Array(sp.length / 3);
  for (let v = 0; v < amb.length; v++) amb[v] = ambAt(sp[v * 3]!, sp[v * 3 + 2]!);
  solidGeo.setAttribute('aAmb', new THREE.BufferAttribute(amb, 1));
  const mat = withCaveAmbient(
    new THREE.MeshStandardNodeMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }),
  );
  const solidMesh = new THREE.Mesh(solidGeo, mat);
  solidMesh.receiveShadow = true;
  const glowMesh = new THREE.Mesh(
    mergeParts(glow),
    readableUnlit(new THREE.MeshBasicNodeMaterial({ vertexColors: true })),
  );
  owner.add(solidMesh, glowMesh);
}
