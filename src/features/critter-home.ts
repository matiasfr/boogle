import * as THREE from 'three/webgpu';
import { defineKind, spawn } from '../entity/entity.ts';
import { ballMesh } from '../entities/ball/view.ts';
import { railwayWorldRead } from '../entities/railway/state.ts';
import { onGraphicsChange } from '../graphics-settings.ts';
import { reducedWildlife, sampledSpeed, wildlifeEngineIds, wildlifePool, wildlifeZone } from '../place/wildlife.ts';
import { remotes, type Remote } from '../netplay/net.ts';
import { platformById } from '../physics/platforms.ts';
import { waterField } from '../physics/water-field.ts';
import { LINKS, ORIGIN, TOWN_BLOCKS, VILLAGE, railY, toWorld } from '../place/layout.ts';
import { H } from '../place/terrain.ts';
import { CAMP_PAD } from '../place/works-landing.ts';
import { me } from '../player/state.ts';
import { skyNow } from '../render/sky.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 } from '../sim/railway-layout.ts';
import { rail, tree } from '../sim/railway-rows.ts';

type Species = 'school' | 'flock' | 'swarm';
const sites: Record<Species, readonly (readonly [number, number])[]> = {
  school: [
    [-36, -67],
    [-226, 10],
    [-44, -76],
    [-226, 10],
  ],
  flock: [
    [-8, -132],
    [-3, -159],
    [-40, -82],
    [-202, 15],
  ],
  swarm: [
    [-8, -132],
    [-3, -159],
    [-38, -142],
    [-39, -82],
    [-33, -78],
  ],
};
const counts = { school: 40, flock: 12, swarm: 38 };
const depth = (x: number, z: number) => waterField.surfaceAt(x, z) - H(x, z);

function clear(x: number, z: number, margin: number, aquatic: boolean) {
  if (
    Math.hypot(x - toWorld(VILLAGE.x), z - VILLAGE.z) <= VILLAGE.r + margin ||
    Math.hypot(x - CAMP_PAD.x, z - CAMP_PAD.z) < 8 + margin
  )
    return false;
  for (const plot of TOWN_BLOCKS) {
    if (Math.hypot(x - toWorld(plot.x), z - plot.z) <= 40 + margin + Math.hypot(plot.w, plot.d) / 2) return false;
  }
  for (const { line } of LINKS) {
    for (let i = 0; i < line.xs.length; i++) {
      if (Math.hypot(x - toWorld(line.xs[i]!), z - line.zs[i]!) < 6 + margin && (!aquatic || railY(line, i) < 6))
        return false;
    }
  }
  return true;
}

function anchor(kind: Species, i: number) {
  const [cx, cz] = sites[kind][i % sites[kind].length]!;
  for (let radius = 0; radius < 28; radius++) {
    for (let k = 0; k < 12; k++) {
      const a = i * 2.4 + (k * Math.PI) / 6;
      const x = toWorld(cx) + Math.cos(a) * (radius + 1.8 * Math.sin(i));
      const z = cz + Math.sin(a) * (radius + 1.8 * Math.sin(i));
      if (!clear(x, z, 3, kind === 'school')) continue;
      if (kind === 'school') {
        if (Math.min(depth(x, z), depth(x + 2, z), depth(x - 2, z), depth(x, z + 2), depth(x, z - 2)) <= 0.7) continue;
      } else if (H(x, z) <= 0.3) continue;
      return {
        x,
        z,
        y: kind === 'school' ? waterField.surfaceAt(x, z) - 0.065 : H(x, z),
        px: x,
        pz: z,
        yaw: i * 2.4,
        lift: 0,
        clock: kind === 'school' ? Math.sin(i) * 0.18 : i * 0.31,
        alarm: 0,
      };
    }
  }
  throw new Error('Home critter site has no clear habitat');
}

type Animal = ReturnType<typeof anchor>;
const probes = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;
// Follow a common heading through each school; an alarm fans the headings apart until they regroup.
function swim(p: Animal, index: number, clock: number, dt: number) {
  const phase = clock + Math.sin(index) * 0.18;
  let dx = p.x + Math.sin(phase) * 1.8 - p.px;
  let dz = p.z + Math.cos(phase) * 1.8 - p.pz;
  if (p.alarm && Math.hypot(p.px - p.x, p.pz - p.z) < 2.5) {
    dx += 4 * Math.sin(p.clock + index * 2.4);
    dz += 4 * Math.cos(p.clock + index * 2.4);
  }
  const ground = H(p.px, p.pz);
  if (ground > p.y - 0.35) {
    let best = ground;
    for (const [sx, sz] of probes) {
      const bed = H(p.px + sx, p.pz + sz);
      if (bed < best) {
        best = bed;
        dx = sx;
        dz = sz;
      }
    }
  }
  p.yaw = Math.atan2(dx, dz);
  const step = Math.min(Math.hypot(dx, dz), dt * (p.alarm ? 5 : 1.8));
  p.px += Math.sin(p.yaw) * step;
  p.pz += Math.cos(p.yaw) * step;
  if (H(p.px, p.pz) > p.y - 0.1 || Math.hypot(p.px - p.x, p.pz - p.z) > 3) {
    p.px = p.x;
    p.pz = p.z;
  }
}
function population(kind: Species) {
  const color = kind === 'school' ? '#f67530' : kind === 'flock' ? '#f5f1de' : '#ffb633';
  const pool = wildlifePool(kind, counts[kind], color);
  pool.mesh.name = 'critter-home-' + kind;
  return { kind, pool, animals: Array.from({ length: counts[kind] }, (_, i) => anchor(kind, i)) };
}

defineKind('home-wildlife', { update: 1 });
defineKind('home-wildlife-zone', { update: 3 });
function mount() {
  const mesh = new THREE.Group();
  const groups = (['school', 'flock', 'swarm'] as const).map(population);
  for (const group of groups) mesh.add(group.pool.mesh);
  let low = false;
  function detail() {
    low = reducedWildlife();
  }
  detail();
  const unsubscribe = onGraphicsChange(detail);
  const roosts = groups[1]!.animals;
  const sources = RAILWAY_SOURCES.map(([, x, z], slot) => ({
    slot,
    x: x / 100,
    z: z / 100,
    work: -1,
    hit: false,
  })).filter((source) => roosts.some((p) => Math.hypot(source.x - p.x, source.z - p.z) < 6));
  const engines = wildlifeEngineIds().map((id) => ({
    id,
    x: Infinity,
    z: Infinity,
  }));
  type Visitor = { x: number; z: number; run: boolean; swim: boolean };
  const visitors: Visitor[] = [];
  let visitorCount = 0;
  function addVisitor(x: number, z: number, run: boolean, swim: boolean) {
    const v = visitors[visitorCount] ?? (visitors[visitorCount] = { x, z, run, swim });
    v.x = x;
    v.z = z;
    v.run = run;
    v.swim = swim;
    visitorCount++;
  }
  function addRemote(r: Remote) {
    if (r.avatar) addVisitor(r.target.x, r.target.z, r.speed >= 3, r.state === 2);
  }
  let schoolClock = 0;
  let lastAwake = -1,
    lastBallX = ballMesh.position.x,
    lastBallY = ballMesh.position.y,
    lastBallZ = ballMesh.position.z;
  return spawn({
    kind: 'home-wildlife',
    mesh,
    update: ({ dt }) => {
      visitorCount = 0;
      if (me.body && me.entered) {
        const { position, velocity } = me.body;
        addVisitor(position.x, position.z, Math.hypot(velocity.x, velocity.z) >= 3, me.swimming);
      }
      remotes.forEach(addRemote);
      schoolClock += dt;
      const read = railwayWorldRead(),
        world = read?.whole() ? read.world() : null;
      for (const e of engines) {
        const body = platformById(e.id)?.body;
        const moving = body && body.position.y > -30 && Math.hypot(body.velocity.x, body.velocity.z) > 0.1;
        e.x = moving ? body.position.x : Infinity;
        e.z = moving ? body.position.z : Infinity;
      }
      let woke = false;
      if (world && read) {
        const tick = read.tickNow();
        const awake = rail(world).awake;
        woke = lastAwake < 0 && awake >= 0 && awake >= tick - 2;
        lastAwake = awake;
        for (let i = 0; i < sources.length; i++) {
          const source = sources[i]!,
            work = tree(world, source.slot).work;
          source.hit = source.work >= 0 && source.work !== work;
          source.work = work;
        }
      }
      const bp = ballMesh.position,
        ballMoving = sampledSpeed(Math.hypot(bp.x - lastBallX, bp.y - lastBallY, bp.z - lastBallZ), dt) > 0.6;
      lastBallX = bp.x;
      lastBallY = bp.y;
      lastBallZ = bp.z;
      for (const { kind, pool, animals } of groups) {
        const bird = kind === 'flock',
          aquatic = kind === 'school';
        pool.begin();
        pool.mesh.castShadow = bird && !low;
        const n = kind === 'swarm' && skyNow.day < 0.35 ? 0 : low ? animals.length / 2 : animals.length;
        for (let i = 0; i < n; i++) {
          const p = animals[i]!;
          const radius = bird ? 4.5 : aquatic ? 3.5 : 3;
          let scare = false;
          for (let k = 0; k < visitorCount; k++) {
            const visitor = visitors[k]!;
            if (
              (bird ? visitor.run : aquatic ? visitor.swim : true) &&
              Math.hypot(visitor.x - p.px, visitor.z - p.pz) < radius
            )
              scare = true;
          }
          if (ballMoving && Math.hypot(bp.x - p.x, bp.y - p.y, bp.z - p.z) < (bird ? 5 : 3.5)) scare = true;
          for (const engine of engines)
            if (Math.hypot(engine.x - p.x, engine.z - p.z) < (bird ? 14 : aquatic ? 10 : 8)) scare = true;
          if (bird && world) {
            if (woke && Math.hypot(p.x - RAILWAY_T1.wake.x / 100, p.z - RAILWAY_T1.wake.z / 100) < 14) scare = true;
            for (const s of sources) if (s.hit && Math.hypot(s.x - p.x, s.z - p.z) < 6) scare = true;
          }
          p.alarm = scare ? (bird ? 6 : 2) : Math.max(0, p.alarm - dt);
          p.clock += dt * (bird ? 1.7 : 1);
          if (aquatic) {
            swim(p, i, schoolClock, dt);
            pool.push(p.px, p.y, p.pz, 0, Math.sin(p.yaw / 2), 0, Math.cos(p.yaw / 2), 1, 1, 1);
            continue;
          }
          const lift = (p.lift = Math.min(1, p.alarm, p.lift + dt * 2.8));
          const reach = bird ? 2.6 * lift : 0.7 + lift;
          const x = p.x + Math.sin(p.clock) * reach,
            z = p.z + Math.cos(p.clock) * reach;
          const y = Math.max(H(x, z), p.y) + (bird ? 0.15 + lift * 4 : 1 + 0.28 * Math.sin(p.clock * 1.8) + lift * 1.6);
          p.px = x;
          p.pz = z;
          const yaw = (Math.PI / 2 + p.clock) * 0.5,
            size = bird ? 1 : 0.34;
          pool.push(x, y, z, 0, Math.sin(yaw), 0, Math.cos(yaw), size, size, size);
        }
        pool.end();
      }
    },
    dispose() {
      unsubscribe();
      for (const { pool } of groups) {
        pool.mesh.dispose();
        pool.mesh.geometry.dispose();
        (pool.mesh.material as THREE.Material).dispose();
      }
    },
  });
}

wildlifeZone('home-wildlife-zone', ORIGIN.x, ORIGIN.z, 260, 300, mount);
