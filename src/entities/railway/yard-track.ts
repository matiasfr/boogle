// Yard track in the main line's own pieces (the kit's sleeper, tie plates, rail and post: src/place/look-kit.ts), at
// its gauge and heights, for track that is not a line: Home's buffer stubs, spur, stall roads and the cart's leg
// (./home-station-view.ts). Static and drawn only: one batch a piece, no colliders, no drop. Local and cosmetic.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Paint } from '../../place/look.ts';
import { RAIL_HEAD, SHUNT } from './works-shape.ts';

/** A point on a track's centreline: world metres, `yaw` the way it runs (three.js rotation.y) and `y` its rail height
 * (layout.railY: the sleeper's base is 0.02 under it, the rail's foot 0.1 over it, as buildTrack lays them). */
export type TrackPose = { x: number; z: number; yaw: number; y: number };
/** A track by metres along it. */
export type TrackPath = (l: number) => TrackPose;

/** The kit's sleeper and rail, metres. */
const SLEEPER_SIZE = { length: 2.3, depth: 0.42 },
  RAIL_LENGTH = 3.05;
// One source with what rides the yard's rails (./works-shape.ts): each rail's place from the centreline, and its foot
// over the rail height, the kit rail's 0.135 m under its head (0.1, as buildTrack's TOP).
const GAUGE = SHUNT.gauge,
  BASE = -0.02,
  FOOT = RAIL_HEAD - 0.135;
/** Another track nearer than this (centre to centre) shares its sleepers: a sleeper is 2.3 m long. */
const SHARED = 2.4;

/** The right-hand side of a track running `yaw`. */
const right = (yaw: number) => ({ x: -Math.cos(yaw), z: Math.sin(yaw) });
const across = (p: TrackPose, lat: number) => {
  const n = right(p.yaw);
  return { x: p.x + n.x * lat, z: p.z + n.z * lat };
};

/** Collects yard track, then draws it. Pieces added after `later()` show only while `draw()`'s `showLater(true)`. */
export function createYardTrack(ground: (x: number, z: number) => number) {
  const sleepers: THREE.Matrix4[] = [],
    plates: THREE.Matrix4[] = [],
    rails: THREE.Matrix4[] = [],
    posts: THREE.Matrix4[] = [],
    blobs: { x: number; y: number; z: number; yaw: number }[] = [];
  let split: number[] | null = null;
  const e = new THREE.Euler(0, 0, 0, 'YXZ'),
    q = new THREE.Quaternion(),
    v = new THREE.Vector3(),
    s = new THREE.Vector3();
  const matrix = (x: number, y: number, z: number, yaw: number, pitch: number, sx: number, sy: number, sz: number) =>
    new THREE.Matrix4().compose(v.set(x, y, z), q.setFromEuler(e.set(-pitch, yaw, 0)), s.set(sx, sy, sz));
  const slope = (path: TrackPath, l: number, from: number, to: number) => {
    const a = Math.max(from, l - 0.3),
      b = Math.min(to, l + 0.3);
    return Math.atan2(path(b).y - path(a).y, b - a || 1);
  };

  /** One sleeper with its tie plates, and a post under each end where it stands clear of the ground (buildTrack's
   * rule: "low sleepers need support too"). */
  function sleeper(p: TrackPose, pitch = 0) {
    const m = matrix(p.x, p.y + BASE, p.z, p.yaw, pitch, 1, 1, 1);
    sleepers.push(m);
    plates.push(m);
    blobs.push({ x: p.x, y: ground(p.x, p.z), z: p.z, yaw: p.yaw });
    for (const side of [-0.75, 0.75]) {
      const at = across(p, side),
        foot = ground(at.x, at.z) - 0.08,
        height = p.y + BASE - foot;
      if (height > 0.18) posts.push(matrix(at.x, foot, at.z, p.yaw, 0, 0.7, height, 0.7));
    }
  }
  /** Sleepers evenly along `path` from `from` to `to`, about 1.2 m apart, the first and last half a space in. */
  function sleepersAlong(path: TrackPath, from: number, to: number) {
    if (to - from < 0.6) return;
    const n = Math.max(1, Math.round((to - from) / 1.2));
    for (let k = 0; k < n; k++) {
      const l = from + ((k + 0.5) * (to - from)) / n;
      sleeper(path(l), slope(path, l, from, to));
    }
  }
  /** Both rails from `from` to `to` in equal lengths of about 3 m, each a chord between its own ends (so they meet on
   * a curve and follow a ramp). */
  function railsAlong(path: TrackPath, from: number, to: number) {
    if (to - from < 0.2) return;
    const n = Math.max(1, Math.round((to - from) / 3));
    for (let k = 0; k < n; k++) {
      const p0 = path(from + ((to - from) * k) / n),
        p1 = path(from + ((to - from) * (k + 1)) / n);
      for (const r of [-GAUGE, GAUGE]) {
        const a = across(p0, r),
          b = across(p1, r);
        const run = Math.hypot(b.x - a.x, b.z - a.z),
          rise = p1.y - p0.y;
        rails.push(
          matrix(
            (a.x + b.x) / 2,
            (p0.y + p1.y) / 2 + FOOT,
            (a.z + b.z) / 2,
            Math.atan2(b.x - a.x, b.z - a.z),
            Math.atan2(rise, run),
            1,
            1,
            Math.hypot(run, rise) / RAIL_LENGTH,
          ),
        );
      }
    }
  }
  /** Where `path`, between `from` and `to`, runs beside another track's sleepers (`theirs`, each on that track's
   * centreline), it lays none of its own: each of theirs is carried on under this track's rails as one long timber, a
   * centimetre lower and thinner so theirs hides its half. Returns the stretch of `path` they carry, or null. */
  function timbers(theirs: (TrackPose & { depth: number })[], path: TrackPath, from: number, to: number) {
    let lo = Infinity,
      hi = -Infinity;
    for (const p of theirs) {
      // Where the path crosses this sleeper's own line.
      const ahead = (l: number) => {
        const c = path(l);
        return (c.x - p.x) * Math.sin(p.yaw) + (c.z - p.z) * Math.cos(p.yaw);
      };
      let a = from,
        fa = ahead(a),
        found = false;
      for (let next = from + 0.25; next <= to + 1e-6 && !found; next += 0.25) {
        const fb = ahead(next);
        if (fa * fb > 0) {
          a = next;
          fa = fb;
          continue;
        }
        let b = next;
        for (let i = 0; i < 20; i++) {
          const mid = (a + b) / 2;
          if (ahead(mid) * fa <= 0) b = mid;
          else a = mid;
        }
        found = true;
      }
      if (!found) continue;
      const c = path(a),
        n = right(p.yaw),
        lat = (c.x - p.x) * n.x + (c.z - p.z) * n.z;
      if (Math.abs(lat) > SHARED) continue;
      lo = Math.min(lo, a);
      hi = Math.max(hi, a);
      if (Math.abs(lat) < 0.05 || p.depth < SLEEPER_SIZE.depth) continue;
      const mid = across(p, lat / 2);
      sleepers.push(
        matrix(
          mid.x,
          p.y + BASE - 0.01,
          mid.z,
          p.yaw,
          0,
          (SLEEPER_SIZE.length + Math.abs(lat)) / SLEEPER_SIZE.length,
          1,
          (p.depth - 0.02) / SLEEPER_SIZE.depth,
        ),
      );
      // Its own tie plates once its rails are clear of the other track's.
      if (Math.abs(lat) >= 1.3) plates.push(matrix(c.x, p.y + BASE - 0.01, c.z, c.yaw, 0, 1, 1, 1));
    }
    return hi < lo ? null : { lo, hi };
  }
  /** How far along `path` from `from` (toward `to`) its rails first stand `gap` metres clear of another track's
   * centreline (`other`, sampled between `s0` and `s1`): where its rails begin, beside the other's. */
  function clearOf(path: TrackPath, from: number, to: number, other: TrackPath, s0: number, s1: number, gap = 0.1) {
    const theirs: TrackPose[] = [];
    for (let at = s0; at <= s1; at += 0.1) theirs.push(other(at));
    const step = Math.sign(to - from) * 0.05;
    for (let l = from; (to - l) * step > 0; l += step) {
      const p = path(l);
      if (theirs.every((o) => Math.hypot(o.x - p.x, o.z - p.z) >= gap)) return l;
    }
    return to;
  }

  return {
    sleeper,
    sleepersAlong,
    railsAlong,
    timbers,
    clearOf,
    /** Everything added from here on is shown only on `showLater(true)`. */
    later() {
      split = [sleepers.length, plates.length, rails.length, posts.length, blobs.length];
    },
    /** The rails laid so far, each a kit rail's matrix (its foot's middle, 3.05 m along its own z before scaling):
     * what a vehicle on the yard's track stands on. */
    rails: (): readonly THREE.Matrix4[] => rails,
    /** Draws what was collected. The kit and its paints load here, so collecting needs no scene or asset. */
    async draw(owner: OwnedView) {
      const [{ kitBatch }, { LOOK, STEEL, addBlob, honeyOf, setBlob }] = await Promise.all([
        import('../../place/look-kit.ts'),
        import('../../place/look.ts'),
      ]);
      const SLEEPER: Paint = { color: '#8a6236', grain: { axis: 'x', honey: honeyOf('#8a6236') } },
        POST: Paint = { color: '#a2743f', grain: { axis: 'y', honey: honeyOf('#a2743f') } };
      const cut = split ?? [sleepers.length, plates.length, rails.length, posts.length, blobs.length];
      const batch = (name: string, paint: Paint, list: THREE.Matrix4[], casts: boolean) => {
        const mesh = kitBatch(name, paint, list.length, owner);
        list.forEach((m, k) => mesh.setMatrixAt(k, m));
        mesh.instanceMatrix.needsUpdate = true;
        // As the line's: what lies flat on its bed is grounded by its contact blob, not a second shadow draw.
        mesh.castShadow = casts;
        mesh.count = list.length;
        owner.add(mesh);
        return mesh;
      };
      const lists = [sleepers, plates, rails, posts];
      const meshes = [
        batch('sleeper', SLEEPER, sleepers, !LOOK.contact),
        batch('sleeper_steel', STEEL, plates, false),
        batch('rail', STEEL, rails, false),
        batch('post', POST, posts, true),
      ];
      const handles = LOOK.contact ? blobs.map((b) => addBlob(b.x, b.y, b.z, 2.75, 0.8, b.yaw, owner)) : [];
      let shown = true;
      return {
        showLater(on: boolean) {
          if (on === shown) return;
          shown = on;
          meshes.forEach((mesh, k) => (mesh.count = on ? lists[k]!.length : cut[k]!));
          handles.slice(cut[4]).forEach((h, k) => {
            const b = blobs[cut[4]! + k]!;
            if (h < 0) return;
            if (on) setBlob(h, b.x, b.y, b.z, 2.75, 0.8, b.yaw, owner);
            else setBlob(h, 0, -999, 0, 0.01, 0.01, 0, owner);
          });
        },
      };
    },
  };
}
