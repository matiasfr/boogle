import * as THREE from 'three/webgpu';
import { defineKind, spawn } from '../entity/entity.ts';
import { onGraphicsChange } from '../graphics-settings.ts';
import { railheadDrawn } from '../entities/railway/railhead-state.ts';
import { railwayGlideOpen } from '../entities/railway/glide.ts';
import { ballMesh } from '../entities/ball/view.ts';
import { remotes, type Remote } from '../netplay/net.ts';
import { platformById } from '../physics/platforms.ts';
import { me } from '../player/state.ts';
import { reducedWildlife, sampledSpeed, wildlifeEngineIds, wildlifePool, wildlifeZone } from '../place/wildlife.ts';
import { ringAnchor, ringCounts, type RingGroup } from '../place/ring-wildlife-sites.ts';
import { LINE2 } from '../sim/railway-lines.ts';
import { createPool } from '../render/instances.ts';
import { skyNow } from '../render/sky.ts';

const engines = wildlifeEngineIds(LINE2);
function population(kind: RingGroup, color: string) {
  const pool = wildlifePool(kind, ringCounts[kind], color);
  pool.mesh.name = 'critter-ring-' + kind;
  const animals = Array.from({ length: ringCounts[kind] }, (_, i) => ({
    ...ringAnchor(kind, i),
    phase: i * 2.4,
    alarm: 0,
    lift: 0,
    dx: 0,
    dz: -1,
  }));
  return { kind, pool, animals };
}

defineKind('ring-wildlife', { update: 1 });
defineKind('ring-wildlife-zone', { update: 3 });
function mount() {
  const mesh = new THREE.Group();
  const flock = population('flock', '#fff2d6'),
    school = population('school', '#ff9148'),
    swarm = population('swarm', '#f8db65');
  const groups = [flock, school, swarm];
  for (const g of groups) mesh.add(g.pool.mesh);
  // A single static batch of low shore stones carries the beached roosts.
  const rockMaterial = new THREE.MeshStandardNodeMaterial({ color: '#706e76', flatShading: true });
  const rocks = createPool(new THREE.IcosahedronGeometry(1), rockMaterial, flock.animals.length);
  rocks.mesh.name = 'critter-ring-rocks';
  rocks.begin();
  for (const p of flock.animals) {
    if (p.bent) continue;
    rocks.push(p.x, p.y - 0.8, p.z, 0, Math.sin(p.phase), 0, Math.cos(p.phase), 1.5, 1.4, 1.15);
    p.y += 0.36;
  }
  rocks.end();
  mesh.add(rocks.mesh);
  let low = reducedWildlife(),
    lastBallY = ballMesh.position.y;
  const unsubscribe = onGraphicsChange(() => {
    low = reducedWildlife();
  });
  function disturb(g: typeof flock, x: number, y: number, z: number, radius: number, train = false) {
    for (const p of g.animals) {
      const dx = p.x - x,
        dz = p.z - z;
      if (Math.hypot(dx, dz, p.y - y) > radius) continue;
      if (g === school && !p.alarm) {
        const length = Math.hypot(dx, dz);
        p.dx = length ? dx / length : Math.sin(p.phase);
        p.dz = length ? dz / length : Math.cos(p.phase);
      }
      if (g === flock && (train || !p.alarm)) p.dz = train ? -1 : dz < 0 ? -1 : 1;
      p.alarm = g === flock ? 3 : 1.2;
    }
  }
  function visitor(x: number, y: number, z: number, moving: boolean, swimming: boolean) {
    if (swimming) disturb(school, x, y, z, 5);
    if (moving) {
      disturb(swarm, x, y, z, 6);
      disturb(flock, x, y, z, 5);
    }
  }
  function remote(r: Remote) {
    if (r.avatar) visitor(r.target.x, r.target.y, r.target.z, r.speed >= 3, r.state === 2);
  }
  let clock = 0;
  return spawn({
    kind: 'ring-wildlife',
    mesh,
    update({ dt }) {
      clock += dt;
      const body = me.body;
      if (body && me.entered) {
        const { position: p, velocity: v } = body;
        visitor(p.x, p.y, p.z, railwayGlideOpen() || (me.sprint && Math.hypot(v.x, v.z) >= 3), me.swimming);
      }
      remotes.forEach(remote);
      const ball = ballMesh.position;
      if (ball.y < 0.6 && sampledSpeed(lastBallY - ball.y, dt) > 1.2) disturb(school, ball.x, ball.y, ball.z, 5);
      lastBallY = ball.y;
      for (const id of engines) {
        const train = platformById(id)?.body;
        if (train && train.velocity.z < -0.1)
          disturb(flock, train.position.x, train.position.y, train.position.z, 38, true);
      }
      for (const g of groups) {
        const { pool, animals } = g;
        pool.begin();
        pool.mesh.castShadow = g === flock && !low;
        const n = g === swarm && skyNow.day < 0.35 ? 0 : animals.length / (low ? 2 : 1);
        for (let i = 0; i < n; i++) {
          const p = animals[i]!;
          p.alarm = Math.max(0, p.alarm - dt);
          p.lift = Math.max(0, Math.min(1, p.lift + dt * (p.alarm ? 1.8 : -0.65)));
          const a = clock * (g === swarm ? 1.8 : 0.9) + (g === school ? Math.sin(i) * 0.2 : p.phase);
          let x = p.x,
            y = p.y,
            z = p.z,
            yaw = (Math.PI / 2 + a) / 2,
            bank = 0;
          const size = g === swarm ? 0.42 : 1.15;
          if (g === flock) {
            if (p.bent && (!railheadDrawn.live || railheadDrawn.u < p.bent)) continue;
            // Rise away from the deck and travel along its seaward side.
            x += (Math.sin(a) * 1.4 - (p.bent ? 3 : 0)) * p.lift;
            z += (Math.cos(a) * 1.4 + p.dz * 9) * p.lift;
            y += 0.13 + 11 * p.lift;
            yaw = p.lift ? Math.atan2(Math.cos(a) * 0.4, p.dz) / 2 : p.bent ? Math.PI / 4 : p.phase / 2;
            bank = Math.sin(a) * 0.24 * p.lift;
          } else if (g === school) {
            x += Math.sin(a) * 1.4 + p.dx * 3 * p.lift;
            z += Math.cos(a) * 1.4 + p.dz * 3 * p.lift;
            if (p.alarm) yaw = Math.atan2(p.dx, p.dz) / 2;
          } else {
            x += Math.sin(a) * 0.7;
            z += Math.cos(a) * 0.7;
            y += 0.9 + 1.8 * p.lift + 0.25 * Math.sin(a);
          }
          const sy = Math.sin(yaw),
            cy = Math.cos(yaw),
            sb = Math.sin(bank),
            cb = Math.cos(bank);
          pool.push(x, y, z, sy * sb, sy * cb, cy * sb, cy * cb, size, size, size);
        }
        pool.end();
      }
    },
    dispose() {
      unsubscribe();
      rocks.mesh.dispose();
      rocks.mesh.geometry.dispose();
      rockMaterial.dispose();
      for (const { pool } of groups) {
        pool.mesh.dispose();
        pool.mesh.geometry.dispose();
        (pool.mesh.material as THREE.Material).dispose();
      }
    },
  });
}
wildlifeZone('ring-wildlife-zone', 1350, -1010, 495, 530, mount);
