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
export const NODES = {
  south: { kind: 'mouth', x: -89, z: -104, y: 4.2, out: [-0.05, 1], label: 'Caves' },
  east: { kind: 'mouth', x: -41, z: -133, y: 4.4, out: [1, 0.08], label: 'Old mine' },
  west: { kind: 'mouth', x: -152, z: -127, y: 3.4, out: [-1, 0.1], label: 'Pond cave' },
  north: { kind: 'mouth', x: -99, z: -176, y: 4.4, out: [1, -0.15], label: 'Cellar' }, // opens onto the north ledge
  hub: { kind: 'hub', x: -93, z: -128, y: 4.2, r: [6.5, 5.2, 6.5] },
  mine: { kind: 'mine', x: -64, z: -136, y: 4.4, r: [13, 6.2, 9.5] },
  pond: { kind: 'pond', x: -121, z: -131, y: 3.6, r: [13, 6.8, 11] },
  cellar: { kind: 'cellar', x: -96, z: -157, y: 4.6, half: [7, 2.5, 5], dir: [0, 1] }, // half: [x, wall height, z]
};

// Tunnels: [from, to, bend] — bend is a sideways offset of the midpoint (metres) so tunnels wander a little.
export const TUNNELS = [
  ['south', 'hub', 2],
  ['hub', 'mine', -3],
  ['mine', 'east', 2],
  ['hub', 'pond', 3],
  ['pond', 'west', -3],
  ['hub', 'cellar', -2],
  ['cellar', 'north', 2],
];

export const POND = { x: -123, z: -132, rx: 8.5, rz: 6.5, level: 3.25, bed: 2.2 }; // water surface and basin floor

const MOUTH_REACH = 7; // how far a mouth's tunnel sticks out of the hill into its trench (it is trimmed there)
export const TRENCH = { len: 15, w: 6.4 }; // the approach dug down to each mouth

// ---------------------------------------------------------------- derived geometry
const norm = ([x, z]) => {
  const l = Math.sqrt(x * x + z * z) || 1;
  return [x / l, z / l];
};

// Tunnel centre polylines (floor heights along them). A tunnel that ends at a mouth runs straight out through it, along
// the mouth's outward direction, and on MOUTH_REACH metres into its trench (it is trimmed there; see index.js).
const APPROACH = 7; // straight run inside the hill before a mouth
export const SEGMENTS = TUNNELS.map(([a, b, bend]) => {
  const ends = [NODES[a], NODES[b]].map((n) => {
    if (n.kind !== 'mouth') return { inner: { x: n.x, z: n.z, y: n.y }, tail: [] };
    const [ox, oz] = norm(n.out);
    return {
      inner: { x: n.x - ox * APPROACH, z: n.z - oz * APPROACH, y: n.y },
      tail: [{ x: n.x + ox * MOUTH_REACH, z: n.z + oz * MOUTH_REACH, y: n.y }],
    };
  });
  const p = ends[0].inner,
    q = ends[1].inner;
  const dx = q.x - p.x,
    dz = q.z - p.z;
  const l = Math.sqrt(dx * dx + dz * dz) || 1;
  const mid = { x: (p.x + q.x) / 2 + (-dz / l) * bend, z: (p.z + q.z) / 2 + (dx / l) * bend, y: (p.y + q.y) / 2 };
  return { from: a, to: b, pts: [...ends[0].tail.reverse(), p, mid, q, ...ends[1].tail] };
});

// Mouth frames: where the tunnel meets the hillside (the portal), and the outward direction.
export const MOUTHS = Object.entries(NODES)
  .filter(([, n]) => n.kind === 'mouth')
  .map(([id, n]) => {
    const [ox, oz] = norm(n.out);
    return { id, x: n.x, z: n.z, y: n.y, ox, oz, label: n.label };
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
    out.push({ pts: s.pts.map((p) => [p.x, p.z, p.y + FLOOR_CUT + TUNNEL_R + COVER]), w: TUNNEL_R * 2 + 2 });
  return out;
}
