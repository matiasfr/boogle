// Furnishing the caves: lanterns along the tunnels, timber frames and name boards at the mouths, a signpost at the
// hub, and the three chambers: the abandoned mine (rails, props, a minecart full of ore, glowing ore veins), the
// underground pond (water, glowing crystals and mushrooms, stalactites, a rowboat) and the wine cellar (barrel racks,
// bottle shelves, a big cask, a candlelit table).
//
// Things are placed by probing the cave's distance field (caveSd), so lanterns sit on real walls and stalactites
// hang from the real ceiling even if the network changes. Colliders are in the CAVE group: only bodies underground
// touch them.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { groundMat, GROUP } from '../../physics/physics.js';
import { addPart, mergeParts } from '../../render/props.js';
import { addLightSource } from '../../render/lights.js';
import { mulberry32 } from '../../math.js';
import { caveSd } from './mesh.js';
import { ambAt, withCaveAmbient } from './index.js';
import { NODES, SEGMENTS, MOUTHS, POND, TUNNEL_R, FLOOR_CUT } from './network.js';

const rng = mulberry32(4242);
const box = new THREE.BoxGeometry(1, 1, 1);
const m4 = new THREE.Matrix4(),
  q = new THREE.Quaternion(),
  e = new THREE.Euler(),
  sc = new THREE.Vector3();

// ---------------------------------------------------------------- probing the cave
function march(x, y, z, dx, dy, dz, max = 14) {
  for (let t = 0; t < max; t += 0.1) if (caveSd(x + dx * t, y + dy * t, z + dz * t) > 0) return t;
  return max;
}
const ceilingAbove = (x, y, z) => y + march(x, y, z, 0, 1, 0);
const floorBelow = (x, y, z) => y - march(x, y, z, 0, -1, 0);
// The wall in direction (dx, dz) from a point, pulled back by inset: [x, y, z].
function wallAt(x, y, z, dx, dz, inset) {
  const l = Math.sqrt(dx * dx + dz * dz);
  const t = march(x, y, z, dx / l, 0, dz / l);
  return [x + (dx / l) * (t - inset), y, z + (dz / l) * (t - inset)];
}

// Points every `step` metres along a polyline (floor heights interpolated), with the direction there.
function along(pts, step, from = 0, to = 0) {
  const out = [];
  let carry = from;
  for (let k = 0; k + 1 < pts.length; k++) {
    const a = pts[k],
      b = pts[k + 1];
    const dx = b.x - a.x,
      dz = b.z - a.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    for (let s = carry; s < len; s += step) {
      const t = s / len;
      out.push({ x: a.x + dx * t, y: a.y + (b.y - a.y) * t, z: a.z + dz * t, dx: dx / len, dz: dz / len });
    }
    carry = Math.max(0, carry - len) + ((step - ((len - carry) % step)) % step);
  }
  return to ? out.slice(0, Math.max(0, out.length - Math.ceil(to / step))) : out;
}

const yawOf = (dx, dz) => Math.atan2(dx, dz);

// Whether (x, z) is inside chamber n's footprint (grown by pad, as a fraction of its radii).
const inside = (n, x, z, pad = 0.15) => Math.hypot((x - n.x) / n.r[0], (z - n.z) / n.r[2]) < 1 + pad;

// How close (x, z) is to the centre line of any tunnel leaving chamber `id`: keeps decor out of the doorways.
function nearTunnel(id, x, z) {
  let best = Infinity;
  for (const s of SEGMENTS) {
    if (s.from !== id && s.to !== id) continue;
    for (let k = 0; k + 1 < s.pts.length; k++) {
      const a = s.pts[k],
        b = s.pts[k + 1];
      const ex = b.x - a.x,
        ez = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * ex + (z - a.z) * ez) / (ex * ex + ez * ez || 1)));
      best = Math.min(best, Math.hypot(a.x + ex * t - x, a.z + ez * t - z));
    }
  }
  return best;
}

// ---------------------------------------------------------------- text boards
function board(text, w, h, bg = '#6b4a2c', fg = '#f6e7c8') {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = Math.round((256 * h) / w);
  const g = c.getContext('2d');
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
export function mouthFrame(m) {
  return {
    rx: -m.oz,
    rz: m.ox, // right, looking out
    fx: m.x - m.ox * 0.6,
    fz: m.z - m.oz * 0.6,
    half: Math.sqrt(TUNNEL_R ** 2 - FLOOR_CUT ** 2) - 0.35,
  };
}
export function buildDecor({ world, scene }) {
  const root = new THREE.Group();
  const parts = [],
    glow = [];
  const body = new CANNON.Body({ mass: 0, material: groundMat, collisionFilterGroup: GROUP.CAVE });
  const O = NODES.hub; // collider offsets are relative to the hub
  body.position.set(O.x, O.y, O.z);

  const put = (geo, x, y, z, sx, sy, sz, color, rx = 0, ry = 0, rz = 0, list = parts) => {
    q.setFromEuler(e.set(rx, ry, rz, 'YXZ'));
    m4.compose(new THREE.Vector3(x, y, z), q, sc.set(sx, sy, sz));
    addPart(list, geo, m4, color);
  };
  const solid = (x, y, z, hx, hy, hz, ry = 0) =>
    body.addShape(
      new CANNON.Box(new CANNON.Vec3(hx, hy, hz)),
      new CANNON.Vec3(x - O.x, y - O.y, z - O.z),
      new CANNON.Quaternion().setFromEuler(0, ry, 0),
    );

  // ---------------------------------------------------------------- lanterns
  const lanternGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.32, 6);
  const lantern = (x, y, z, color = '#ffc56e', intensity = 16) => {
    put(box, x, y + 0.22, z, 0.24, 0.05, 0.24, '#2b2622');
    put(box, x, y - 0.2, z, 0.26, 0.05, 0.26, '#2b2622');
    put(lanternGeo, x, y, z, 1, 1, 1, color, 0, 0, 0, glow);
    addLightSource({ position: new THREE.Vector3(x, y, z), color, intensity, distance: 13 });
  };
  const wallLantern = (p, side) => {
    const [x, , z] = wallAt(p.x, p.y + 2.2, p.z, -p.dz * side, p.dx * side, 0.32);
    lantern(x, p.y + 2.2, z);
    put(
      box,
      x - p.dz * side * 0.16,
      p.y + 2.45,
      z + p.dx * side * 0.16,
      0.06,
      0.06,
      0.36,
      '#2b2622',
      0,
      yawOf(-p.dz * side, p.dx * side),
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
    for (const sd of [-1, 1]) put(box, fx + rx * half * sd, m.y + 1.4, fz + rz * half * sd, 0.3, 2.8, 0.3, '#5d4026');
    put(box, fx, m.y + 2.85, fz, 0.32, 0.32, half * 2 + 0.6, '#5d4026', 0, yawOf(rx, rz));
    const b = board(m.label, 2.2, 0.55);
    b.position.set(fx + m.ox * 0.18, m.y + 2.85, fz + m.oz * 0.18);
    b.rotation.y = yawOf(m.ox, m.oz);
    root.add(b);
    lantern(fx + rx * (half - 0.05) + m.ox * 0.25, m.y + 2.2, fz + rz * (half - 0.05) + m.oz * 0.25);
  }

  // ---------------------------------------------------------------- hub: signpost
  {
    const h = NODES.hub;
    put(box, h.x, h.y + 1.3, h.z, 0.16, 2.6, 0.16, '#6b4a2c');
    solid(h.x, h.y + 1.3, h.z, 0.1, 1.3, 0.1);
    const targets = [
      ['mine', 'Old mine'],
      ['pond', 'Pond'],
      ['cellar', 'Cellar'],
      ['south', 'Way out'],
    ];
    targets.forEach(([id, label], k) => {
      const n = NODES[id];
      const dx = n.x - h.x,
        dz = n.z - h.z;
      const l = Math.hypot(dx, dz);
      const ux = dx / l,
        uz = dz / l;
      // Two boards back to back, each reading towards its arrow.
      for (const back of [false, true]) {
        const b = board(back ? '← ' + label : label + ' →', 1.5, 0.34);
        b.position.set(h.x + ux * 0.75, h.y + 2.2 - k * 0.38, h.z + uz * 0.75);
        b.rotation.y = Math.atan2(-uz, ux) + (back ? Math.PI : 0);
        b.translateZ(0.012);
        root.add(b);
      }
    });
    lantern(h.x + 0.3, h.y + 2.7, h.z, '#ffc56e', 20);
  }

  // ---------------------------------------------------------------- stalactites (hub and pond)
  const coneGeo = new THREE.ConeGeometry(1, 1, 6);
  const drips = (n, cx, cz, r, y0, count, rockColor) => {
    for (let k = 0; k < count; k++) {
      const a = rng() * Math.PI * 2,
        d = Math.sqrt(rng()) * r;
      const x = cx + Math.cos(a) * d,
        z = cz + Math.sin(a) * d;
      if (caveSd(x, y0 + 1.5, z) > -0.3) continue;
      const top = ceilingAbove(x, y0 + 1.5, z);
      const len = 0.5 + rng() * 1.5;
      put(coneGeo, x, top - len / 2 + 0.15, z, 0.18 + len * 0.08, len, 0.18 + len * 0.08, rockColor, Math.PI);
    }
  };
  drips(NODES.hub, NODES.hub.x, NODES.hub.z, NODES.hub.r[0], NODES.hub.y, 12, '#8a8073');
  drips(NODES.pond, NODES.pond.x, NODES.pond.z, NODES.pond.r[0], NODES.pond.y, 26, '#76838a');

  // ---------------------------------------------------------------- the mine
  {
    const mine = NODES.mine;
    const toMine = SEGMENTS.find((s) => s.from === 'hub' && s.to === 'mine').pts;
    const toEast = SEGMENTS.find((s) => s.from === 'mine' && s.to === 'east').pts;
    const track = [...toMine.slice(0, -1), ...toEast.slice(0, -1)]; // hub -> mine -> just inside the east mouth
    // Rails and sleepers.
    const rail = along(track, 0.8, 7);
    rail.forEach((p, k) => {
      const yaw = yawOf(p.dx, p.dz);
      put(box, p.x, p.y + 0.05, p.z, 1.7, 0.1, 0.24, k % 3 ? '#5a4330' : '#4e3a2a', 0, yaw);
      if (k + 1 < rail.length) {
        const n = rail[k + 1];
        for (const sd of [-0.55, 0.55])
          put(
            box,
            (p.x + n.x) / 2 - p.dz * sd,
            (p.y + n.y) / 2 + 0.14,
            (p.z + n.z) / 2 + p.dx * sd,
            0.08,
            0.09,
            0.84,
            '#6e6a66',
            0,
            yaw,
          );
      }
    });
    // Timber supports in the mine's tunnels (not in the chamber itself).
    for (const p of along(track, 4.2, 9)) {
      const inChamber = (n) => Math.hypot((p.x - n.x) / n.r[0], (p.z - n.z) / n.r[2]) < 1.05;
      if (inChamber(mine) || inChamber(NODES.hub)) continue;
      const half = Math.sqrt(TUNNEL_R ** 2 - FLOOR_CUT ** 2) - 0.3;
      const yaw = yawOf(p.dx, p.dz);
      for (const sd of [-1, 1]) {
        put(box, p.x - p.dz * half * sd, p.y + 1.35, p.z + p.dx * half * sd, 0.24, 2.7, 0.24, '#6a4a2d', 0, yaw);
        solid(p.x - p.dz * half * sd, p.y + 1.35, p.z + p.dx * half * sd, 0.12, 1.35, 0.12, yaw);
      }
      put(box, p.x, p.y + 2.78, p.z, half * 2 + 0.3, 0.26, 0.26, '#6a4a2d', 0, yaw);
    }
    // A minecart full of ore on the rails, near the middle of the chamber.
    const near = rail.reduce((b, p) =>
      Math.hypot(p.x - mine.x, p.z - mine.z) < Math.hypot(b.x - mine.x, b.z - mine.z) ? p : b,
    );
    const cart = { x: near.x + near.dx * 3, y: near.y, z: near.z + near.dz * 3, yaw: yawOf(near.dx, near.dz) };
    const cx = cart.x,
      cy = cart.y,
      cz = cart.z;
    put(box, cx, cy + 0.75, cz, 1.0, 0.7, 1.4, '#5b4632', 0, cart.yaw);
    put(box, cx, cy + 1.1, cz, 1.06, 0.08, 1.46, '#3c3a38', 0, cart.yaw);
    const wheel = new THREE.CylinderGeometry(0.22, 0.22, 0.1, 10);
    for (const [wx, wz] of [
      [-0.5, -0.45],
      [0.5, -0.45],
      [-0.5, 0.45],
      [0.5, 0.45],
    ]) {
      const s = Math.sin(cart.yaw),
        c = Math.cos(cart.yaw);
      put(wheel, cx + wx * c + wz * s, cy + 0.32, cz - wx * s + wz * c, 1, 1, 1, '#2e2c2a', 0, cart.yaw, Math.PI / 2);
    }
    const lump = new THREE.IcosahedronGeometry(0.22, 0);
    for (let k = 0; k < 9; k++)
      put(
        lump,
        cx + (rng() - 0.5) * 0.6,
        cy + 1.15 + rng() * 0.15,
        cz + (rng() - 0.5) * 0.9,
        1,
        1,
        1,
        k % 3 ? '#d8a531' : '#8b8278',
        rng(),
        rng(),
        rng(),
      );
    solid(cx, cy + 0.75, cz, 0.5, 0.45, 0.72, cart.yaw);
    // Crates, a barrel, a pickaxe, a lantern on a post.
    for (let k = 0, tries = 0; k < 4 && tries < 40; tries++) {
      const a = rng() * Math.PI * 2;
      const [wx, , wz] = wallAt(mine.x, mine.y + 0.6, mine.z, Math.cos(a), Math.sin(a), 1.1);
      if (nearTunnel('mine', wx, wz) < 2.6) continue;
      k++;
      const s = 0.8 + rng() * 0.3;
      put(box, wx, mine.y + s / 2, wz, s, s, s, '#9a7448', 0, rng() * 3);
      solid(wx, mine.y + s / 2, wz, s / 2, s / 2, s / 2);
      if (k === 1) {
        put(box, wx + 0.5, mine.y + 0.9, wz, 0.07, 1.5, 0.07, '#6b4a2c', 0, 0, 0.35);
        put(box, wx + 0.75, mine.y + 1.6, wz, 0.75, 0.1, 0.1, '#8f8c88', 0, 0, 0.35);
      }
    }
    lantern(mine.x - 2, mine.y + 2.4, mine.z + 1.5, '#ffc56e', 20);
    put(box, mine.x - 2, mine.y + 1.15, mine.z + 1.5, 0.12, 2.3, 0.12, '#6b4a2c');
    // Ore veins glinting in the walls.
    const crystal = new THREE.OctahedronGeometry(0.2, 0);
    for (let k = 0; k < 14; k++) {
      const a = rng() * Math.PI * 2,
        y = mine.y + 0.8 + rng() * 2.6;
      const [wx, wy, wz] = wallAt(mine.x, y, mine.z, Math.cos(a), Math.sin(a), 0.05);
      if (!inside(mine, wx, wz)) continue; // looked down a tunnel
      for (let c = 0; c < 4; c++)
        put(
          crystal,
          wx + (rng() - 0.5) * 0.4,
          wy + (rng() - 0.5) * 0.4,
          wz + (rng() - 0.5) * 0.4,
          0.6 + rng(),
          1 + rng(),
          0.6 + rng(),
          '#ffd76a',
          rng() * 3,
          rng() * 3,
          0,
          glow,
        );
    }
    const sign = board('Old Boogle Mine', 2.6, 0.6, '#3d2c1e');
    sign.position.set(mine.x + 3, mine.y + 2.5, mine.z - 2);
    sign.rotation.y = -0.6;
    root.add(sign);
  }

  // ---------------------------------------------------------------- the pond
  {
    const pond = NODES.pond;
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: '#0b3a44',
        emissive: '#0e5866',
        emissiveIntensity: 0.4,
        roughness: 0.08,
        metalness: 0.3,
        transparent: true,
        opacity: 0.84,
      }),
    );
    water.scale.set(POND.rx * 0.86, 1, POND.rz * 0.86);
    water.position.set(POND.x, POND.level, POND.z);
    root.add(water);
    root.userData.pond = water;
    // Crystal clusters round the edge and in the walls; some of them light the place.
    const crystal = new THREE.OctahedronGeometry(0.3, 0);
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
      const col = colors[k % 3];
      for (let c = 0; c < 5; c++)
        put(
          crystal,
          x + (rng() - 0.5) * 0.6,
          fy + 0.2 + rng() * 0.3,
          z + (rng() - 0.5) * 0.6,
          0.5 + rng() * 0.6,
          1.2 + rng() * 1.6,
          0.5 + rng() * 0.6,
          col,
          (rng() - 0.5) * 0.7,
          rng() * 3,
          (rng() - 0.5) * 0.7,
          glow,
        );
      if (k % 4 === 0)
        addLightSource({ position: new THREE.Vector3(x, fy + 0.8, z), color: col, intensity: 14, distance: 12 });
    }
    // Glowing mushrooms by the water (cousins of the garden's).
    const stem = new THREE.CylinderGeometry(0.05, 0.07, 0.3, 6);
    const cap = new THREE.SphereGeometry(0.2, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    for (let k = 0; k < 14; k++) {
      const a = rng() * Math.PI * 2,
        r = 1.08 + rng() * 0.25;
      const x = POND.x + Math.cos(a) * POND.rx * r,
        z = POND.z + Math.sin(a) * POND.rz * r;
      const y = floorBelow(x, pond.y + 1.2, z);
      const s = 0.6 + rng() * 0.9;
      put(stem, x, y + 0.15 * s, z, s, s, s, '#d9f3ef');
      put(cap, x, y + 0.29 * s, z, s, s * 0.8, s, '#5ff2d8', 0, 0, 0, glow);
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
    const by = floorBelow(bx, pond.y + 1, bz);
    put(box, bx, by + 0.25, bz, 1.0, 0.4, 2.4, '#7a5536', 0, 0.4, 0.06);
    put(box, bx, by + 0.48, bz, 1.1, 0.08, 2.5, '#5e3f27', 0, 0.4, 0.06);
    put(box, bx, by + 0.5, bz, 0.9, 0.06, 0.25, '#8d6643', 0, 0.4, 0.06);
    put(box, bx + 0.7, by + 0.2, bz - 0.6, 0.1, 0.08, 1.7, '#8d6643', 0, 1.3, 0);
    solid(bx, by + 0.3, bz, 0.5, 0.3, 1.2, 0.4);
  }

  // ---------------------------------------------------------------- the wine cellar
  {
    const c = NODES.cellar;
    const [hx, , hz] = c.half;
    const barrel = new THREE.LatheGeometry(
      [0, 0.34, 0.41, 0.44, 0.41, 0.34, 0].map((r, k) => new THREE.Vector2(r || 0.001, -0.45 + (k * 0.9) / 6)),
      12,
    );
    const hoop = new THREE.TorusGeometry(0.43, 0.025, 4, 14);
    // Racks along both long walls: two tiers of barrels lying head-on to the wall, with gaps for the tunnels.
    const count = Math.floor((hx * 2 - 2.8) / 0.95) + 1;
    const step = (hx * 2 - 2.8) / (count - 1);
    for (const side of [-1, 1]) {
      const wz = c.z + side * (hz - 0.75);
      for (let k = 0; k < count; k++) {
        const bx = c.x - hx + 1.4 + k * step;
        if (nearTunnel('cellar', bx, wz) < 2.4) continue;
        put(box, bx, c.y + 0.12, wz, step + 0.02, 0.16, 0.9, '#4e3826');
        solid(bx, c.y + 0.9, wz, step / 2, 0.9, 0.5);
        for (const tier of [0, 1]) {
          if (tier === 1 && k % 3 === 2) continue;
          const by = c.y + 0.62 + tier * 0.86;
          put(barrel, bx, by, wz, 1, 1, 1, tier ? '#8a5a35' : '#7a4e2f', Math.PI / 2, 0, 0);
          for (const hzOff of [-0.28, 0.28]) put(hoop, bx, by, wz + hzOff, 1, 1, 1, '#3a3632', 0, 0, 0);
        }
      }
    }
    // Bottle shelves on the far wall.
    const shelfX = c.x - hx + 0.35;
    put(box, shelfX, c.y + 1.2, c.z, 0.5, 2.4, hz * 1.2, '#5a3f28');
    solid(shelfX, c.y + 1.2, c.z, 0.3, 1.2, hz * 0.6);
    const bottle = new THREE.CylinderGeometry(0.06, 0.06, 0.3, 6);
    const neck = new THREE.CylinderGeometry(0.022, 0.03, 0.12, 5);
    for (let row = 0; row < 5; row++)
      for (let col = 0; col < 9; col++) {
        const y = c.y + 0.35 + row * 0.42,
          z = c.z - hz * 0.55 + col * ((hz * 1.1) / 8);
        const glass = ['#1f4d2b', '#3b1d24', '#264a35'][(row + col) % 3];
        put(bottle, shelfX + 0.2, y, z, 1, 1, 1, glass, 0, 0, Math.PI / 2);
        put(neck, shelfX + 0.4, y, z, 1, 1, 1, glass, 0, 0, Math.PI / 2);
      }
    // The big cask at the other end, on a cradle, with a tap.
    const caskX = c.x + hx - 1.4;
    put(barrel, caskX, c.y + 1.25, c.z, 2.4, 2.2, 2.4, '#7d4f2d', 0, 0, Math.PI / 2);
    for (const off of [-0.7, 0, 0.7])
      put(hoop, caskX + off, c.y + 1.25, c.z, 2.4, 2.4, 2.4, '#3a3632', 0, Math.PI / 2, 0);
    put(box, caskX, c.y + 0.2, c.z, 1.6, 0.4, 1.6, '#4e3826');
    put(box, caskX - 1.1, c.y + 1.0, c.z, 0.2, 0.1, 0.1, '#b48a3c');
    solid(caskX, c.y + 1.15, c.z, 1.1, 1.15, 1.1);
    // A table with candles, bottles and two stools, off to the side of the way through.
    const tx = c.x - 2;
    put(box, tx, c.y + 0.78, c.z, 2.2, 0.1, 1.1, '#6b4a2c');
    for (const [lx, lz] of [
      [-1, -0.45],
      [1, -0.45],
      [-1, 0.45],
      [1, 0.45],
    ])
      put(box, tx + lx, c.y + 0.38, c.z + lz, 0.1, 0.76, 0.1, '#5a3f28');
    solid(tx, c.y + 0.42, c.z, 1.1, 0.42, 0.55);
    put(bottle, tx - 0.5, c.y + 0.98, c.z + 0.1, 1, 1, 1, '#1f4d2b');
    put(neck, tx - 0.5, c.y + 1.18, c.z + 0.1, 1, 1, 1, '#1f4d2b');
    const candle = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 6);
    const flame = new THREE.ConeGeometry(0.035, 0.09, 5);
    for (const [lx, lz] of [
      [0.2, -0.2],
      [0.45, 0.15],
      [0.65, -0.1],
    ]) {
      put(candle, tx + lx, c.y + 0.93, c.z + lz, 1, 1, 1, '#f3ead6');
      put(flame, tx + lx, c.y + 1.08, c.z + lz, 1, 1, 1, '#ffcc66', 0, 0, 0, glow);
    }
    addLightSource({
      position: new THREE.Vector3(tx + 0.4, c.y + 1.3, c.z),
      color: '#ffbb66',
      intensity: 22,
      distance: 11,
    });
    const stool = new THREE.CylinderGeometry(0.25, 0.22, 0.5, 8);
    for (const lx of [-1.6, 1.6]) {
      put(stool, tx + lx, c.y + 0.25, c.z + 0.2, 1, 1, 1, '#5a3f28');
      solid(tx + lx, c.y + 0.25, c.z + 0.2, 0.25, 0.25, 0.25);
    }
    const sign = board('Wine Cellar', 2.2, 0.55, '#3d2018');
    sign.position.set(c.x - hx + 0.62, c.y + 2.75, c.z);
    sign.rotation.y = Math.PI / 2;
    root.add(sign);
  }

  // Props darken with depth like the rock around them (aAmb scales the sky's ambient light, see index.js).
  const solidGeo = mergeParts(parts);
  const sp = solidGeo.attributes.position.array;
  const amb = new Float32Array(sp.length / 3);
  for (let v = 0; v < amb.length; v++) amb[v] = ambAt(sp[v * 3], sp[v * 3 + 2]);
  solidGeo.setAttribute('aAmb', new THREE.BufferAttribute(amb, 1));
  const mat = withCaveAmbient(
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }),
  );
  const solidMesh = new THREE.Mesh(solidGeo, mat);
  solidMesh.receiveShadow = true;
  const glowMesh = new THREE.Mesh(mergeParts(glow), new THREE.MeshBasicMaterial({ vertexColors: true }));
  root.add(solidMesh, glowMesh);
  scene.add(root);
  world.addBody(body);
  return root;
}
