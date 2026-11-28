import * as THREE from 'three/webgpu';
import { reducedMotion } from '../constants.ts';
import { railwayGlideOpen } from '../entities/railway/glide.ts';
import { ballMesh } from '../entities/ball/view.ts';
import { AREA_CENTRES, FREE_MORE, MOUNT_NEAR } from '../entities/route-greybox/leg2-layout.ts';
import { gorgeAt } from '../entities/route-greybox/massing.ts';
import { defineKind, spawn } from '../entity/entity.ts';
import { onGraphicsChange } from '../graphics-settings.ts';
import { platformById } from '../physics/platforms.ts';
import { reducedWildlife, sampledSpeed, wildlifeEngineIds, wildlifePool, wildlifeZone } from '../place/wildlife.ts';
import { me } from '../player/state.ts';
import { LINE2 } from '../sim/railway-lines.ts';

const engines = wildlifeEngineIds(LINE2);
const mouth = gorgeAt(49.6, 45, 3.2);

function population(flying: boolean, count: number) {
  const kind = flying ? 'flock' : 'school';
  const pool = wildlifePool(kind, count, flying ? '#ffe7be' : '#ff9962', !reducedMotion);
  pool.mesh.name = 'critter-gorge-' + kind;
  const animals = Array.from({ length: count }, (_, i) => {
    const phase = i * 2.4;
    const along = flying ? -49 - (i % 3) * 8 : 22 + (i % 3) * 4;
    const home = gorgeAt(along + 2 * Math.sin(phase), -22 + 2 * Math.cos(phase));
    return { home, ...home, phase, alarm: 0, lift: 0, dx: 0, dz: 0 };
  });
  return { flying, animals, pool };
}

defineKind('gorge-wildlife', { update: 1 });
defineKind('gorge-wildlife-zone', { update: 3 });

function mount() {
  const mesh = new THREE.Group();
  const school = population(false, 36);
  const groups = [population(true, 18), school];
  for (const g of groups) mesh.add(g.pool.mesh);
  let low = reducedWildlife();
  const unsubscribe = onGraphicsChange(() => {
    low = reducedWildlife();
  });
  let clock = 0;
  let lastBallY = ballMesh.position.y;
  return spawn({
    kind: 'gorge-wildlife',
    mesh,
    update({ dt }) {
      if (!reducedMotion) clock += dt;
      const ball = ballMesh.position;
      const splash = sampledSpeed(lastBallY - ball.y, dt) > 1.2 && ball.y < 0.6;
      lastBallY = ball.y;
      const player = me.entered && me.body;
      const passing =
        player && (railwayGlideOpen() || Math.hypot(player.velocity.x, player.velocity.y, player.velocity.z) >= 3);
      let flare = false;
      let closestTrain = null;
      let closest = 40;
      for (const id of engines) {
        const b = platformById(id)?.body;
        if (!b || Math.hypot(b.velocity.x, b.velocity.z) < 0.1) continue;
        // The incline runs south-east into the bore, so an exiting engine heads back toward the split.
        if (b.velocity.z < 0 && Math.hypot(b.position.x - mouth.x, b.position.y - mouth.y, b.position.z - mouth.z) < 12)
          flare = true;
        const site = school.animals[0]!.home;
        const d = Math.hypot(b.position.x - site.x, b.position.y, b.position.z - site.z);
        if (d < closest) {
          closest = d;
          closestTrain = b.position;
        }
      }
      for (const { flying, pool, animals } of groups) {
        pool.begin();
        pool.mesh.castShadow = flying && !low;
        for (let i = 0; i < animals.length / (low ? 2 : 1); i++) {
          const p = animals[i]!;
          const a = p.phase + clock * (flying ? 0.48 : 0.85);
          const s = Math.sin(a),
            c = Math.cos(a);
          const x = p.home.x + s * (flying ? 13 : 1.5);
          const z = p.home.z + c * (flying ? 10 : 1.5);
          const y = flying ? 23 + 12 * Math.sin(a * 2) + (i % 4) : -0.1;
          const near =
            !reducedMotion &&
            player &&
            Math.hypot(player.position.x - p.x, player.position.y - p.y, player.position.z - p.z) < (flying ? 13 : 6);
          if (!reducedMotion && flying && (flare || (passing && near))) p.alarm = 1.4;
          if (!flying && !reducedMotion) {
            const source =
              near && me.swimming
                ? player.position
                : splash && Math.hypot(ball.x - p.x, ball.y - p.y, ball.z - p.z) < 6
                  ? ball
                  : closestTrain && Math.hypot(closestTrain.x - p.x, closestTrain.y - p.y, closestTrain.z - p.z) < 30
                    ? closestTrain
                    : null;
            if (source) {
              if (!p.alarm) {
                const dx = x - source.x,
                  dz = z - source.z,
                  length = Math.hypot(dx, dz);
                p.dx = length ? dx / length : s;
                p.dz = length ? dz / length : c;
              }
              p.alarm = 0.9;
            }
          }
          p.lift = reducedMotion ? 0 : THREE.MathUtils.clamp(p.lift + dt * (p.alarm ? 2.5 : -0.8), 0, 1);
          p.alarm = Math.max(0, p.alarm - dt);
          p.x = x + p.dx * 3 * p.lift;
          p.z = z + p.dz * 3 * p.lift;
          p.y = y + (flying ? 10 * p.lift : 0);
          const yaw = (!flying && p.alarm ? Math.atan2(p.dx, p.dz) : Math.atan2(c, -s)) / 2;
          const bank = flying ? 0.17 * c : 0;
          const sy = Math.sin(yaw),
            cy = Math.cos(yaw),
            sb = Math.sin(bank),
            cb = Math.cos(bank);
          pool.push(p.x, p.y, p.z, sy * sb, sy * cb, cy * sb, cy * cb, 1.45, 1.45, 1.45);
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
const centre = AREA_CENTRES.gorge;
wildlifeZone('gorge-wildlife-zone', centre.x, centre.z, MOUNT_NEAR, MOUNT_NEAR + FREE_MORE, mount);
