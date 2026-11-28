import * as THREE from 'three/webgpu';
import { float, instanceIndex, positionGeometry, positionLocal, sin, time, vec3 } from 'three/tsl';
import { defineKind, spawn } from '../entity/entity.ts';
import { railwayWorldRead } from '../entities/railway/state.ts';
import { onGraphicsChange } from '../graphics-settings.ts';
import { remotes, type Remote } from '../netplay/net.ts';
import { platformById } from '../physics/platforms.ts';
import { H } from '../place/terrain.ts';
import { reducedWildlife, wildlifeZone, wings } from '../place/wildlife.ts';
import { me } from '../player/state.ts';
import { createPool } from '../render/instances.ts';
import { patchNode } from '../render/material-patch.ts';
import { LINE2, RAIL_HALTS, RAIL_TRAINS } from '../sim/railway-lines.ts';
import { works } from '../sim/railway-rows.ts';

// The gorge rim follows terrain. The quarry ledges follow the 40 m wall caps of Split-rock Works.
const sites = [
  { x: 987, z: 106, cap: false, yaw: 0 },
  { x: 1001, z: 86, cap: false, yaw: 0 },
  { x: 1144, z: 75, cap: true, yaw: Math.atan2(24, 6) },
  { x: 1114, z: 102, cap: true, yaw: Math.atan2(2, 16) },
] as const;
const halt = RAIL_HALTS.find((h) => h.line === LINE2 && h.name === 'Quarry')!.platforms[0];
const engines = RAIL_TRAINS.flatMap((train, i) => (train.line === LINE2 ? ['railway:train' + i + '-0'] : []));

// A low faceted back, four splayed feet and a long taper for the animated tail.
function scuttleGeometry() {
  const outline = [
    [0, 1],
    [0.55, 0.82],
    [0.52, 0.49],
    [1.4, 0.52],
    [0.68, 0.25],
    [0.55, -0.12],
    [1.5, -0.5],
    [0.52, -0.4],
    [0.25, -0.52],
    [0.23, -1],
    [-0.35, -1.65],
    [-0.12, -0.97],
    [-0.25, -0.52],
    [-0.52, -0.4],
    [-1.5, -0.5],
    [-0.55, -0.12],
    [-0.68, 0.25],
    [-1.4, 0.52],
    [-0.52, 0.49],
    [-0.55, 0.82],
  ] as const;
  const vertices = [0, 1, 0.15];
  const indices = [];
  for (let i = 0; i < outline.length; i++) {
    const [x, z] = outline[i]!;
    vertices.push(x, 0, z);
    indices.push(0, i + 1, 1 + ((i + 1) % outline.length));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function population(flying: boolean, count: number) {
  const geometry = flying ? wings() : scuttleGeometry();
  const material = new THREE.MeshStandardNodeMaterial({
    color: flying ? '#435171' : '#bb6536',
    side: THREE.DoubleSide,
  });
  const beat = sin(time.mul(flying ? 9 : 5).add(float(instanceIndex).mul(1.7)));
  patchNode(material, 'positionNode', (prev) =>
    (prev ?? positionLocal).add(
      flying
        ? vec3(0, beat.mul(positionGeometry.x.abs()).mul(0.4), 0)
        : vec3(beat.mul(positionGeometry.z.min(0)).mul(0.3), 0, 0),
    ),
  );
  const pool = createPool(geometry, material, count);
  pool.mesh.name = flying ? 'quarry-flock' : 'quarry-colony';
  const animals = Array.from({ length: count }, (_, i) => {
    const site = sites[flying ? i % sites.length : 2 + (i % 2)]!;
    const phase = i * 2.4;
    const spread = 0.6 + 2.6 * (i / count);
    const along = Math.sin(phase) * (site.cap ? 6 : spread);
    const lateral = Math.cos(phase) * (site.cap ? 0.42 : spread);
    return {
      x: site.x + along * Math.sin(site.yaw) + lateral * Math.cos(site.yaw),
      z: site.z + along * Math.cos(site.yaw) - lateral * Math.sin(site.yaw),
      site,
      floor: site.cap ? 40 : H(site.x, site.z),
      toEdge: 1.75 - lateral,
      phase,
      alarm: 0,
      lift: 0,
    };
  });
  return { flying, pool, animals, material };
}

defineKind('quarry-wildlife', { update: 1 });
defineKind('quarry-wildlife-zone', { update: 3 });
function mount() {
  const mesh = new THREE.Group();
  const groups = [population(true, 24), population(false, 36)];
  for (const g of groups) mesh.add(g.pool.mesh);
  let low = reducedWildlife();
  const unsubscribe = onGraphicsChange(() => {
    low = reducedWildlife();
  });
  let lastSeams = -1;
  function disturb(x: number, z: number, radius: number, y?: number) {
    for (const g of groups)
      for (const p of g.animals) {
        if (Math.hypot(x - p.x, z - p.z, y === undefined ? 0 : y - p.floor) < radius) p.alarm = 3;
      }
  }
  function visitor(r: Remote) {
    if (r.avatar && r.speed >= 3) disturb(r.target.x, r.target.z, 4, r.target.y);
  }
  return spawn({
    kind: 'quarry-wildlife',
    mesh,
    update({ dt }) {
      const read = railwayWorldRead();
      const seams = read?.whole() ? works(read.world()).seams : -1;
      const strike = lastSeams >= 0 && seams >= 0 && (seams & ~lastSeams) !== 0;
      lastSeams = seams;
      let trainAtHalt = false;
      for (const id of engines) {
        const body = platformById(id)?.body;
        if (body && body.position.y > -30 && Math.hypot(body.velocity.x, body.velocity.z) > 0.1) {
          disturb(body.position.x, body.position.z, 22);
          if (Math.hypot(body.position.x - halt.x / 100, body.position.z - halt.z / 100) < 18) trainAtHalt = true;
        }
      }
      if (me.entered && me.body && Math.hypot(me.body.velocity.x, me.body.velocity.z) >= 3)
        disturb(me.body.position.x, me.body.position.z, 4, me.body.position.y);
      remotes.forEach(visitor);
      for (const { flying, animals, pool } of groups) {
        pool.begin();
        pool.mesh.castShadow = flying && !low;
        for (let i = 0; i < animals.length / (low ? 2 : 1); i++) {
          const p = animals[i]!;
          if ((strike && flying) || (trainAtHalt && p.site.cap)) p.alarm = 3;
          p.alarm = Math.max(0, p.alarm - dt);
          p.lift = Math.min(1, Math.max(0, p.lift + (p.alarm ? 2.8 : -1.6) * dt));
          if (!flying && p.lift === 1) continue;
          p.phase += dt * (flying ? 1.8 : 0.3);
          const reach = flying ? 1.1 + p.lift * 2.4 : p.lift * p.toEdge;
          const heading = flying ? p.phase : p.site.yaw + Math.PI / 2;
          const x = p.x + Math.sin(heading) * reach;
          const z = p.z + Math.cos(heading) * reach;
          const y = (p.site.cap ? 40 : H(x, z)) + (flying ? 2 + 0.45 * Math.sin(p.phase) + 4.5 * p.lift : 0.07);
          const yaw = (flying ? Math.PI / 2 + heading : p.site.yaw) / 2;
          pool.push(
            x,
            y,
            z,
            0,
            Math.sin(yaw),
            0,
            Math.cos(yaw),
            flying ? 1.3 : 0.14,
            flying ? 1 : 0.08,
            flying ? 1 : 0.42,
          );
        }
        pool.end();
      }
    },
    dispose() {
      unsubscribe();
      for (const { pool, material } of groups) {
        pool.mesh.dispose();
        pool.mesh.geometry.dispose();
        material.dispose();
      }
    },
  });
}
wildlifeZone('quarry-wildlife-zone', 1051, 80, 105, 125, mount);
