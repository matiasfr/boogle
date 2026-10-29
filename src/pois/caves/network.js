// The cave system under the north-west massif: chambers joined by tunnels, open to the surface at four mouths.
// Pure data and pure maths (no three.js), shared by site.js (terrain: ridges over the tunnels, trenches at the mouths)
// and index.js (the cave mesh, colliders, decor and the "am I underground?" test).
//
// World coordinates in metres; `y` of a node is its floor height. Everything stays above sea level (the player swims
// below SEA), and under at least COVER metres of rock.

export const TUNNEL_R = 2.3; // tunnel radius; the floor is cut flat at FLOOR_CUT below the axis
export const FLOOR_CUT = 1.4;
export const COVER = 2.2; // rock kept above every ceiling

// kind: mouth | hub | mine | pond | cellar. r: chamber radii [x, height, z] (ellipsoid) or cellar half sizes.
// Mouths: out = outward direction, approach = straight run inside the hill before the mouth, trench = length of the
// cut dug down to it from the open ground.
export const NODES = {
  south: { kind: 'mouth', x: -37, z: -80, y: 4.0, out: [0.5, 0.85], approach: 4, trench: 11, label: 'Caves' },
  east: { kind: 'mouth', x: -26, z: -95, y: 3.8, out: [1, 0], approach: 4, trench: 11, label: 'Old mine' },
  west: { kind: 'mouth', x: -71, z: -83, y: 3.4, out: [-0.25, 0.97], approach: 3, trench: 12, label: 'Pond cave' },
  north: { kind: 'mouth', x: -44.5, z: -104.5, y: 3.4, out: [0.87, -0.5], approach: 3, trench: 10, label: 'Cellar' },
  hub: { kind: 'hub', x: -50, z: -88, y: 3.9, r: [4.6, 4.3, 4.6] },
  mine: { kind: 'mine', x: -35, z: -93, y: 3.8, r: [6.5, 4.8, 5.5] },
  pond: { kind: 'pond', x: -64, z: -90, y: 3.4, r: [6.5, 5, 6] },
  cellar: { kind: 'cellar', x: -49, z: -99, y: 3.6, half: [4.8, 2.3, 3.2], dir: [0, 1] }, // half: [x, wall height, z]
};

// Tunnels: [from, to, bend] — bend is a sideways offset of the midpoint (metres) so tunnels wander a little.
export const TUNNELS = [
  ['south', 'hub', 2],
  ['hub', 'mine', -3],
  ['mine', 'east', 2],
  ['hub', 'pond', 3],
  ['pond', 'west', -3],
  ['hub', 'cellar', 0],
  ['cellar', 'north', 0],
];

export const POND = { x: -65, z: -90, rx: 4.6, rz: 3.9, level: 3.0, bed: 2.0 }; // water surface and basin floor

const MOUTH_REACH = 5; // how far a mouth's tunnel sticks out of the hill into its trench (it is trimmed there)
export const TRENCH = { len: 12, w: 6.4 }; // the approach dug down to each mouth (len per mouth: node.trench)

// ---------------------------------------------------------------- derived geometry
const norm = ([x, z]) => {
  const l = Math.sqrt(x * x + z * z) || 1;
  return [x / l, z / l];
};

// Tunnel centre polylines (floor heights along them). A tunnel that ends at a mouth runs straight out through it, along
// the mouth's outward direction (for node.approach metres inside), and on MOUTH_REACH metres into its trench (it is
// trimmed there; see index.js). `cover` is the part under the hill, which needs rock over it.
export const SEGMENTS = TUNNELS.map(([a, b, bend]) => {
  const ends = [NODES[a], NODES[b]].map((n) => {
    if (n.kind !== 'mouth') return { inner: { x: n.x, z: n.z, y: n.y }, mouth: null, tail: [] };
    const [ox, oz] = norm(n.out);
    return {
      inner: { x: n.x - ox * n.approach, z: n.z - oz * n.approach, y: n.y },
      mouth: { x: n.x, z: n.z, y: n.y },
      tail: [{ x: n.x + ox * MOUTH_REACH, z: n.z + oz * MOUTH_REACH, y: n.y }],
    };
  });
  const p = ends[0].inner,
    q = ends[1].inner;
  const dx = q.x - p.x,
    dz = q.z - p.z;
  const l = Math.sqrt(dx * dx + dz * dz) || 1;
  const mid = { x: (p.x + q.x) / 2 + (-dz / l) * bend, z: (p.z + q.z) / 2 + (dx / l) * bend, y: (p.y + q.y) / 2 };
  const cover = [ends[0].mouth, p, mid, q, ends[1].mouth].filter(Boolean);
  return { from: a, to: b, pts: [...ends[0].tail.reverse(), p, mid, q, ...ends[1].tail], cover };
});

// Mouth frames: where the tunnel meets the hillside (the portal), and the outward direction.
export const MOUTHS = Object.entries(NODES)
  .filter(([, n]) => n.kind === 'mouth')
  .map(([id, n]) => {
    const [ox, oz] = norm(n.out);
    return { id, x: n.x, z: n.z, y: n.y, ox, oz, label: n.label, trench: n.trench ?? TRENCH.len };
  });

// ---------------------------------------------------------------- signed distance (negative = open cave)
const smin = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};

let segFloor = 0; // floor height at the closest point of the last segment tested
function segmentSd(px, py, pz, a, b) {
  const ex = b.x - a.x,
    ey = b.y - a.y,
    ez = b.z - a.z;
  const wx = px - a.x,
    wz = pz - a.z;
  let t = (wx * ex + wz * ez) / (ex * ex + ez * ez || 1); // along the floor plan
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const floor = a.y + ey * t;
  segFloor = floor;
  const ax = a.x + ex * t,
    az = a.z + ez * t,
    ay = floor + FLOOR_CUT; // tunnel axis
  const dx = px - ax,
    dy = py - ay,
    dz = pz - az;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - TUNNEL_R; // the floor is cut later, for the whole network
}

function ellipsoidSd(px, py, pz, n) {
  const [rx, ry, rz] = n.r;
  const cy = n.y + ry * 0.35; // centre above the floor; the floor cuts the bottom flat
  const qx = (px - n.x) / rx,
    qy = (py - cy) / ry,
    qz = (pz - n.z) / rz;
  const k = Math.sqrt(qx * qx + qy * qy + qz * qz);
  return (k - 1) * Math.min(rx, ry, rz);
}

function cellarSd(px, py, pz, n) {
  const [hx, wallH, hz] = n.half;
  const lx = px - n.x,
    lz = pz - n.z,
    ly = py - n.y;
  // Walls: a box from the floor to wallH; ceiling: a barrel vault along x with radius hz.
  const bx = Math.abs(lx) - hx,
    bz = Math.abs(lz) - hz;
  const box = Math.max(bx, bz, ly - wallH);
  const vault = Math.max(Math.sqrt(lz * lz + (ly - wallH) ** 2) - hz, bx, wallH - ly);
  return Math.min(box, vault);
}

// Zones: which part of the cave a point belongs to (colours, decor, noise). Tunnels take the zone of their chamber.
export const ZONE = { TUNNEL: 0, HUB: 1, MINE: 2, POND: 3, CELLAR: 4 };
const KIND_ZONE = { hub: ZONE.HUB, mine: ZONE.MINE, pond: ZONE.POND, cellar: ZONE.CELLAR };
const tunnelZone = (s) => KIND_ZONE[NODES[s.from].kind] ?? KIND_ZONE[NODES[s.to].kind] ?? ZONE.TUNNEL;

// Distance to the open cave at p, plus the zone and floor height of the nearest part (out.zone, out.floor).
// Shapes are joined smoothly, then cut by one floor blended from theirs, so junctions stay flat (a smooth union of two
// floor planes would dip). Ignores the mouth trimming; see index.js for that.
const info = { zone: 0, floor: 0 };
const MAX_PARTS = 64; // shape distance, zone and floor of each piece, reused (no garbage per call)
const partD = new Float64Array(MAX_PARTS),
  partZ = new Int8Array(MAX_PARTS),
  partF = new Float64Array(MAX_PARTS);
export function networkSd(px, py, pz, out = info) {
  let n = 0;
  for (const s of SEGMENTS) {
    const z = s.from === 'hub' && s.to === 'mine' ? ZONE.MINE : tunnelZone(s);
    for (let k = 0; k + 1 < s.pts.length; k++) {
      const c = segmentSd(px, py, pz, s.pts[k], s.pts[k + 1]);
      partD[n] = c;
      partZ[n] = z === ZONE.HUB ? ZONE.TUNNEL : z;
      partF[n++] = segFloor;
    }
  }
  for (const node of Object.values(NODES)) {
    if (node.kind === 'mouth') continue;
    const c = node.kind === 'cellar' ? cellarSd(px, py, pz, node) : ellipsoidSd(px, py, pz, node);
    partD[n] = c - 0.3; // chambers win ties near their walls
    partZ[n] = KIND_ZONE[node.kind];
    partF[n++] = node.y;
  }
  let d = Infinity,
    lo = Infinity;
  for (let k = 0; k < n; k++) lo = Math.min(lo, partD[k]);
  let wSum = 0,
    floor = 0;
  for (let k = 0; k < n; k++) {
    const c = partD[k];
    d = smin(d, c, 1.2);
    const w = Math.exp(-3 * (c - lo));
    wSum += w;
    floor += w * partF[k];
    if (c === lo) out.zone = partZ[k];
  }
  out.floor = floor / wSum;
  d = Math.max(d, out.floor - py);
  // The pond's basin: a shallow bowl dug below the chamber floor.
  const qx = (px - POND.x) / POND.rx,
    qz = (pz - POND.z) / POND.rz;
  const rim = Math.sqrt(qx * qx + qz * qz);
  if (rim < 1.25) {
    const bedY = POND.bed + (POND.level + 0.6 - POND.bed) * Math.min(1, rim * rim);
    const c = Math.max(rim - 1.1, bedY - py, py - (NODES.pond.y + 3));
    if (c < d) {
      d = c;
      out.zone = ZONE.POND;
      out.floor = Math.min(out.floor, bedY);
    }
  }
  return d;
}

// Highest ceiling above (x, z) for the terrain cover stamps: chambers and tunnels, from their definitions.
export function coverPaths() {
  const out = [];
  for (const s of SEGMENTS)
    out.push({ pts: s.cover.map((p) => [p.x, p.z, p.y + FLOOR_CUT + TUNNEL_R + COVER]), w: TUNNEL_R * 2 + 2 });
  return out;
}
