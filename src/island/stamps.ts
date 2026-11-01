// Terrain stamps: how a point of interest reshapes and repaints the natural ground (src/island/shape.ts) around it,
// without touching anything else on the island. Sites (src/pois/<name>/site.js) list stamps in their own local frame;
// createIsland() places them in the world and composes everything into one height and paint function.
//
// A stamp is a shape plus an effect. Shapes (local metres; +z is the site's forward `dir`, +x its right):
//   { shape: 'disc', x, z, r }                    circle of radius r
//   { shape: 'box', x, z, hx, hz }                rectangle, half sizes along local x and z
//   { shape: 'path', points: [[x, z, y?], ...], w }  polyline of width w (y per point: used by set: 'path')
// Every shape takes `fade` (metres, default 3): the effect blends out over that distance outside the shape.
// Height effects (pick one):
//   set: y      blend towards height y
//   add: dy     raise (or lower, negative) by dy
//   min: y      cut down to at most y (carve)
//   max: y      fill up to at least y
// Any of these values can also be 'ground' (the natural height at the site centre) or 'path' (the y of the path's
// points, interpolated along it: ramps, trenches, ridges).
// Paint (optional, with or without a height effect):
//   paint: '#rrggbb', strength (0..1, default 1), stripes: metres between darker rows (fields)
//
// Pure arithmetic and Math.sqrt only (correctly rounded everywhere), so every client gets the same ground.
import { smoothstep } from '../math-pure.ts';
import { naturalHeight } from './shape.ts';

type HeightValue = number | 'ground' | 'path';
/** One terrain stamp (see the header). */
export type Stamp = {
  shape: 'disc' | 'box' | 'path';
  x?: number;
  z?: number;
  r?: number;
  hx?: number;
  hz?: number;
  points?: number[][]; // [x, z, y?]
  w?: number;
  fade?: number;
  set?: HeightValue;
  add?: HeightValue;
  min?: HeightValue;
  max?: HeightValue;
  paint?: string;
  strength?: number;
  stripes?: number;
};
/** A point of interest's placement: where it sits, which way it faces, its stamps and keep-out discs. */
export type Site = {
  id?: string;
  name?: string;
  x: number;
  z: number;
  dir?: [number, number];
  stamps?: Stamp[];
  keepOut?: { x?: number; z?: number; r: number }[];
};
type Op = 'set' | 'add' | 'min' | 'max';
type Frame = ReturnType<typeof siteFrame>;

const hex = (s: string): [number, number, number] => {
  const n = parseInt(s.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

// Site frame: world = origin + right * lx + fwd * lz, with fwd = normalised dir and right = (fwd.z, -fwd.x).
export function siteFrame(site: { x: number; z: number; dir?: [number, number] }) {
  const [dx, dz] = site.dir ?? [0, 1];
  const l = Math.sqrt(dx * dx + dz * dz) || 1;
  const fx = dx / l,
    fz = dz / l;
  return {
    x: site.x,
    z: site.z,
    fx,
    fz,
    rx: fz,
    rz: -fx,
    toWorld(lx: number, lz: number): [number, number] {
      return [site.x + fz * lx + fx * lz, site.z - fx * lx + fz * lz];
    },
    toLocal(x: number, z: number): [number, number] {
      const px = x - site.x,
        pz = z - site.z;
      return [px * fz - pz * fx, px * fx + pz * fz];
    },
  };
}

// Distance from p to segment ab, and the parameter t along it.
function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const ex = bx - ax,
    ez = bz - az;
  const ll = ex * ex + ez * ez;
  let t = ll > 0 ? ((px - ax) * ex + (pz - az) * ez) / ll : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = ax + ex * t - px,
    qz = az + ez * t - pz;
  return { d: Math.sqrt(qx * qx + qz * qz), t };
}

// Compile one stamp into world space: { box: [x0, z0, x1, z1], eval(x, z) -> { sd, y } }.
function compile(stamp: Stamp, frame: Frame, groundY: number) {
  const fade = stamp.fade ?? 3;
  let sdf: (x: number, z: number) => { sd: number; y?: number };
  let bounds: number[];
  if (stamp.shape === 'disc') {
    const [cx, cz] = frame.toWorld(stamp.x ?? 0, stamp.z ?? 0);
    const r = stamp.r!;
    sdf = (x, z) => ({ sd: Math.sqrt((x - cx) ** 2 + (z - cz) ** 2) - r });
    bounds = [cx - r, cz - r, cx + r, cz + r];
  } else if (stamp.shape === 'box') {
    const [cx, cz] = frame.toWorld(stamp.x ?? 0, stamp.z ?? 0);
    const hx = stamp.hx!,
      hz = stamp.hz!;
    sdf = (x, z) => {
      const px = x - cx,
        pz = z - cz;
      const qx = Math.abs(px * frame.rx + pz * frame.rz) - hx,
        qz = Math.abs(px * frame.fx + pz * frame.fz) - hz;
      const ox = Math.max(qx, 0),
        oz = Math.max(qz, 0);
      return { sd: Math.sqrt(ox * ox + oz * oz) + Math.min(Math.max(qx, qz), 0) };
    };
    const ext = Math.sqrt(hx * hx + hz * hz);
    bounds = [cx - ext, cz - ext, cx + ext, cz + ext];
  } else if (stamp.shape === 'path') {
    const pts = stamp.points!.map(([lx, lz, y]) => [...frame.toWorld(lx, lz), y ?? 0]);
    const half = stamp.w! / 2;
    sdf = (x, z) => {
      let best = Infinity,
        y = pts[0][2];
      for (let k = 0; k + 1 < pts.length; k++) {
        const a = pts[k],
          b = pts[k + 1];
        const s = segDist(x, z, a[0], a[1], b[0], b[1]);
        if (s.d < best) {
          best = s.d;
          y = a[2] + (b[2] - a[2]) * s.t;
        }
      }
      return { sd: best - half, y };
    };
    const xs = pts.map((p) => p[0]),
      zs = pts.map((p) => p[1]);
    bounds = [Math.min(...xs) - half, Math.min(...zs) - half, Math.max(...xs) + half, Math.max(...zs) + half];
  } else throw new Error(`stamp: unknown shape ${stamp.shape}`);
  const box = [bounds[0] - fade, bounds[1] - fade, bounds[2] + fade, bounds[3] + fade];
  const op = (['set', 'add', 'min', 'max'] as const).find((k) => stamp[k] !== undefined) ?? null;
  const value = op && stamp[op];
  return {
    op,
    weight(x: number, z: number) {
      if (x < box[0] || z < box[1] || x > box[2] || z > box[3]) return null;
      const r = sdf(x, z);
      const w = 1 - smoothstep(0, fade, r.sd);
      if (w <= 0) return null;
      return { w, v: (value === 'path' ? r.y : value === 'ground' ? groundY : value) as number };
    },
  };
}

function applyHeight(h: number, op: Op | null, w: number, v: number) {
  if (op === 'set') return h + (v - h) * w;
  if (op === 'add') return h + v * w;
  if (op === 'min') return h > v ? h + (v - h) * w : h;
  if (op === 'max') return h < v ? h + (v - h) * w : h;
  return h;
}

// sites: [{ id, x, z, dir?, stamps?: [...], keepOut?: [{ x, z, r }] }] in a fixed order.
type Compiled = ReturnType<typeof compile>;
export function createIsland(sites: Site[]) {
  const height: Compiled[] = [],
    paint: { c: Compiled; rgb: number[]; strength: number; stripes: number; frame: Frame }[] = [],
    keepOut: { x: number; z: number; r: number }[] = [];
  for (const site of sites) {
    const frame = siteFrame(site);
    const groundY = naturalHeight(site.x, site.z);
    for (const st of site.stamps ?? []) {
      const c = compile(st, frame, groundY);
      if (c.op) height.push(c);
      if (st.paint) paint.push({ c, rgb: hex(st.paint), strength: st.strength ?? 1, stripes: st.stripes ?? 0, frame });
    }
    for (const k of site.keepOut ?? []) {
      const [x, z] = frame.toWorld(k.x ?? 0, k.z ?? 0);
      keepOut.push({ x, z, r: k.r });
    }
  }

  return {
    keepOut,
    heightAt(x: number, z: number) {
      let h = naturalHeight(x, z);
      for (const c of height) {
        const r = c.weight(x, z);
        if (r) h = applyHeight(h, c.op, r.w, r.v);
      }
      return h;
    },
    // Paint over the natural colours at x, z: [r, g, b, amount 0..1] (sRGB 0..1), or null for none.
    paintAt(x: number, z: number) {
      let out: number[] | null = null;
      for (const p of paint) {
        const r = p.c.weight(x, z);
        if (!r) continue;
        let rgb = p.rgb;
        if (p.stripes) {
          const [lx] = p.frame.toLocal(x, z);
          const row = lx / p.stripes - Math.floor(lx / p.stripes);
          const dark = row < 0.5 ? 0.82 : 1;
          rgb = [rgb[0] * dark, rgb[1] * dark, rgb[2] * dark];
        }
        const a = r.w * p.strength;
        if (!out) out = [rgb[0], rgb[1], rgb[2], a];
        else {
          out[0] += (rgb[0] - out[0]) * a;
          out[1] += (rgb[1] - out[1]) * a;
          out[2] += (rgb[2] - out[2]) * a;
          out[3] = Math.max(out[3], a);
        }
      }
      return out;
    },
    // True when (x, z) is inside some site's keep-out disc (grown by pad): no trees or rocks, the Boogler walks around.
    keptOut(x: number, z: number, pad = 0) {
      for (const k of keepOut) if ((x - k.x) ** 2 + (z - k.z) ** 2 < (k.r + pad) ** 2) return true;
      return false;
    },
  };
}
