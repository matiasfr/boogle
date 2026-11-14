// The museum: two things worth walking in for, and neither is a shelf of collectibles (Grant: no collecting for collecting's
// sake). The specimen: a stone split open like a book, its rough outside facing away, its inside a cave of blue crystal with light
// going slowly up through it, and a shard turning in the gap. The same blue as the far island's shard; you can catch a sliver of it
// from the street through the door. The miniature: the whole place on a table, its real land from the same heights you walk on,
// with what's actually there on it right now: every building standing and any going up, the track as far as it's laid, the machine
// and the trains moving, trees that are still up, the village's people, and a small orange pin for you. It's read from the shared
// state each time it's drawn, so it shows the same thing to two people (DESIGN.md 9 and 11). Docs: docs/research/town-interiors.md,
// "A museum that rewards the eyes". Local.
// `createMuseum` mounts it in `rooms`' museum on an owner, reading the world through `MuseumEnv`: the town entity's in the
// live game (src/entities/town/), from the shared railway; ?proto=place's in ./town-life.ts, from Place's own modules.
import * as THREE from 'three/webgpu';
import { me } from '../../player/player.ts';
import { createOwnedView, type OwnedView } from '../../render/owned-view.ts';
import { H } from '../../place/terrain.ts';
import { FORGE, ORIGIN, railY, toWorld, type Line } from '../../place/layout.ts';
import { plate, roomMesh, type Rooms } from './rooms.ts';
import type { Plan } from '../../place/sites.ts';
import { mulberry32 } from '../../sim/rng.ts';
import { BOARDS } from './town-lines.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { loadLevelArtifact } from '../../prefab/validate.ts';
import { definitions } from '../../prefab/catalogue.ts';
import level from '../../../content/built/levels/museum.json' with { type: 'json' };
const placements = loadLevelArtifact(level, definitions).placements;
/** What the miniature shows, in world metres. The live game reads the shared railway; Place reads its own modules. */
export type MuseumEnv = {
  /** Every building there is, and how far up it is (0..1). */
  buildings(): Iterable<{ plan: Plan; grow: number }>;
  forgeLit(): boolean;
  /** Trees still standing. */
  trees(): Iterable<{ x: number; z: number; great: boolean }>;
  /** Track that's down: metres along the line, `lo` < `hi`. A line may come in several stretches. */
  rails(): Iterable<{ line: Line; lo: number; hi: number }>;
  /** What moves: the machine and the trains. */
  movers(): Iterable<{ x: number; y: number; z: number; kind: 'machine' | 'train' }>;
  /** The village's people. */
  people(): number;
};

const TABLE = { x: 0, z: 1.05, w: 6.0, d: 4.0, top: 1.0 };
const SCALE = 1 / 120,
  UP = SCALE * 1.5;
const SPAN = { x0: -220, x1: 480, z0: -238, z1: 222 };
const toTableX = (x: number) => (x - (SPAN.x0 + SPAN.x1) / 2) * SCALE + TABLE.x;
const toTableZ = (z: number) => (z - (SPAN.z0 + SPAN.z1) / 2) * SCALE + TABLE.z;
const seaY = TABLE.top + 0.012;
const tableY = (h: number) => seaY + Math.max(0, h) * UP;
const inTable = (x: number, z: number) => x > SPAN.x0 && x < SPAN.x1 && z > SPAN.z0 && z < SPAN.z1;
const peopleAt = (() => {
  const q = mulberry32(551);
  return Array.from({ length: 28 }, () => {
    const a = q() * 6.28,
      d_ = 8 + q() * 30;
    return { x: -102 + Math.cos(a) * d_, z: 12 + Math.sin(a) * d_ };
  });
})();

/** The museum's record-owned furnishing. The caller still updates the table only while the interior draws. */
export function createMuseum(owner: OwnedView, rooms: Rooms, env: MuseumEnv) {
  const r = rooms.rooms.museum;
  if (r.w !== 13 || r.d !== 12 || r.high !== 5) throw new Error('museum: room dimensions differ from authored records');
  const fixtureOwner = createOwnedView();
  r.near.add(fixtureOwner.root);
  owner.cleanup(fixtureOwner.dispose);
  const pieces = new Map(
    placements.map((p) => {
      const instance = instantiate(p.prefab, p, {
        owner: fixtureOwner,
        makeLabel(a, key) {
          if (key !== 'specimen' && key !== 'table' && key !== 'museum')
            throw new Error('museum: unknown label reference');
          return plate(BOARDS[key], a.w, a.h, a.at[0], a.at[1], a.at[2]);
        },
      });
      r.furnishings.push(instance);
      return [p.id.slice('museum-'.length), instance] as const;
    }),
  );
  const get = (id: string) => {
    const p = pieces.get(id);
    if (!p) throw new Error(`museum: missing piece ${id}`);
    return p;
  };
  const parts = (...ids: string[]) => ids.flatMap((id) => get(id).parts);
  const made: THREE.BufferGeometry[] = [];
  const keep = (mesh: THREE.Mesh) => {
    made.push(mesh.geometry);
    return mesh;
  };
  owner.cleanup(() => {
    for (const geometry of made) geometry.dispose();
  });
  const fixtures = parts(
    'floor',
    'alcove-back',
    'alcove-left',
    'alcove-right',
    'plinth',
    'table',
    'bench',
    'label-specimen',
    'label-table',
    'cabinet-trim',
    'cushion-0',
    'cushion-1',
    'drawer-0',
    'drawer-1',
    'drawer-2',
    'reflector-0',
    'reflector-1',
  );
  // Preserve the original merged draws and mesh submission order, including the two plaques.
  r.near.add(
    keep(roomMesh(fixtures)),
    get('label-specimen').root,
    get('label-table').root,
    get('specimen').root,
    get('pool').root,
    get('relief').root,
    keep(roomMesh(parts('spire'), false)),
    get('bits').root,
  );
  const core = get('specimen').root.getObjectByName('museum-core')!;
  const bits = get('bits').root.children[0] as THREE.InstancedMesh;
  const MAX = bits.instanceMatrix.count;
  const m_ = new THREE.Matrix4(),
    q_ = new THREE.Quaternion(),
    p_ = new THREE.Vector3(),
    s_ = new THREE.Vector3(),
    c_ = new THREE.Color();
  const UPAXIS = new THREE.Vector3(0, 1, 0);
  let n_ = 0;
  function bit(x: number, y: number, z: number, sx: number, sy: number, sz: number, color: string, yaw = 0) {
    if (n_ >= MAX) return;
    q_.setFromAxisAngle(UPAXIS, yaw);
    bits.setMatrixAt(n_, m_.compose(p_.set(x, y, z), q_, s_.set(sx, sy, sz)));
    bits.setColorAt(n_, c_.set(color));
    n_++;
  }
  function drawRail(line: Line, lo: number, hi: number) {
    const STEP = 5;
    for (let s = Math.max(0, lo); s < Math.min(line.len, hi); s += STEP) {
      const k = Math.floor(s),
        x = line.xs[k]!,
        z = line.zs[k]!;
      if (!inTable(x, z)) continue;
      const kk = Math.min(line.xs.length - 1, k + 1);
      const yaw = Math.atan2(line.xs[kk]! - x, line.zs[kk]! - z);
      const y = railY(line, s),
        ground = H(toWorld(x), z),
        ty = tableY(y);
      bit(toTableX(x), ty + 0.012, toTableZ(z), 0.03, 0.022, STEP * SCALE * 1.1, '#2a2622', yaw);
      // Trestle legs where the track stands off the ground.
      if (y - ground > 3 && k % 10 === 0) {
        const bottom = tableY(ground);
        bit(toTableX(x), (ty + bottom) / 2, toTableZ(z), 0.014, ty - bottom, 0.014, '#a9794c');
      }
    }
  }
  function drawBits() {
    n_ = 0;
    // Buildings: bigger than their scale, or you couldn't see a village at all. Roof colour on top. One that's going up rises.
    for (const { plan: P, grow: g } of env.buildings()) {
      const x = P.x - ORIGIN.x,
        z = P.z - ORIGIN.z;
      if (!inTable(x, z)) continue;
      const grow = Math.max(0.05, Math.min(1, g));
      const hgt = (P.top.y - P.y) * SCALE * 2 * grow;
      const fw = Math.max(0.05, P.hw * 2 * SCALE * 1.7),
        fd = Math.max(0.05, P.hd * 2 * SCALE * 1.7);
      const base = tableY(P.y);
      const pieces = P.pieces;
      const wall = pieces[Math.min(pieces.length - 1, P.FRAME)]?.color.getHexString() ?? 'c8c3b4';
      const roof = pieces[Math.max(0, P.ROOFED - 2)]?.color.getHexString() ?? 'c4453a';
      bit(toTableX(x), base + hgt / 2, toTableZ(z), fw, hgt, fd, `#${wall}`, P.yaw);
      bit(toTableX(x), base + hgt + 0.012, toTableZ(z), fw * 1.15, 0.024, fd * 1.15, `#${roof}`, P.yaw);
    }
    // The forge isn't a site: it stands from the start, and it glows when it's lit.
    {
      const x = FORGE.x,
        z = FORGE.z,
        base = tableY(H(toWorld(x), z));
      bit(toTableX(x), base + 0.05, toTableZ(z), 0.14, 0.1, 0.12, '#6d5136');
      if (env.forgeLit()) bit(toTableX(x), base + 0.11, toTableZ(z), 0.05, 0.05, 0.05, '#ff9a3a');
    }
    for (const t of env.trees()) {
      const x = t.x - ORIGIN.x,
        z = t.z - ORIGIN.z;
      if (!inTable(x, z)) continue;
      const base = tableY(H(t.x, t.z)),
        size = t.great ? 0.075 : 0.04;
      bit(toTableX(x), base + size * 0.9, toTableZ(z), size, size * 1.8, size, t.great ? '#3f7a24' : '#4f8a34');
    }
    for (const q of env.rails()) drawRail(q.line, q.lo, q.hi);
    // People: as many as the village has.
    const people = Math.min(peopleAt.length, env.people());
    for (let k = 0; k < people; k++) {
      const q = peopleAt[k]!;
      bit(
        toTableX(q.x),
        tableY(18) + 0.012,
        toTableZ(q.z),
        0.016,
        0.024,
        0.016,
        ['#e4574a', '#3f8ee0', '#f0c030'][k % 3]!,
      );
    }
    // What moves: the machine, the trains.
    for (const v of env.movers()) {
      const x = toTableX(v.x - ORIGIN.x),
        y = tableY(v.y) + 0.03,
        z = toTableZ(v.z - ORIGIN.z);
      if (v.kind === 'machine') bit(x, y, z, 0.07, 0.05, 0.1, '#f2b134');
      else bit(x, y, z, 0.05, 0.05, 0.13, '#d8392b');
    }
    // You.
    const b = me.body;
    if (b) {
      const x = toTableX(b.position.x - ORIGIN.x),
        z = toTableZ(b.position.z - ORIGIN.z),
        y = tableY(b.position.y);
      bit(x, y + 0.09, z, 0.014, 0.18, 0.014, '#ff8a1a');
      bit(x, y + 0.2, z, 0.05, 0.05, 0.05, '#ffa94a');
    }
    bits.count = n_;
    bits.instanceMatrix.needsUpdate = true;
    if (bits.instanceColor) bits.instanceColor.needsUpdate = true;
  }

  r.outside.add(keep(roomMesh(parts('column-0', 'column-1', 'column-2', 'column-3', 'apron'))));
  r.over.add(keep(roomMesh(parts('cornice'))), get('sign').root);
  // ---------------------------------------------------------------- the frame
  let acc = 0;
  return {
    update(dt: number) {
      if (!r.near.visible) return;
      core.rotation.y += dt * 0.5;
      acc += dt;
      if (acc < 0.1) return;
      acc = 0;
      drawBits();
    },
    /** For the evals: how many bits the table drew last. */
    shown: () => bits.count,
  };
}
export type Museum = ReturnType<typeof createMuseum>;
