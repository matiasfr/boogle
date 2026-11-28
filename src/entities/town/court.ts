import * as THREE from 'three/webgpu';
import { cheerAround } from '../../place/folk.ts';
import { cheerSite } from './play.ts';
import { discPath } from './disc-path.ts';
import { TOWN_CENTRE, TOWN_COURT, TOWN_GROUND } from '../../place/town-plan.ts';
import { ORIGIN } from '../../place/layout.ts';
import { H, insidePlace, surfaceHeight } from '../../place/terrain.ts';
import { crossedGoal, throughMouth } from './court-crossing.ts';
import { definitions } from '../../prefab/catalogue.ts';
import { instantiate, liftOrWait } from '../../prefab/instantiate.ts';
import { loadLevelArtifact } from '../../prefab/validate.ts';
import { me } from '../../player/state.ts';
import { bell } from '../../render/machine-sfx.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { ball, respawnBall } from '../ball/state.ts';
import { setToyGround } from '../../physics/toy-ground.ts';
import { frameHasRemote } from '../railway/frame-occupied.ts';
import level from '../../../content/built/levels/town-court.json' with { type: 'json' };

export function useHomeToyGround() {
  setToyGround({
    under: surfaceHeight,
    floorBelow: (x, _y, z) => surfaceHeight(x, z),
    inside: insidePlace,
    spawn: { x: ORIGIN.x + TOWN_COURT.centre.x, z: ORIGIN.z + TOWN_COURT.centre.z },
    sproutable: (x, z) => Math.hypot(x - ORIGIN.x - TOWN_CENTRE.x, z - ORIGIN.z - TOWN_CENTRE.z) <= TOWN_GROUND.r,
  });
}

export function createCourt(owner: OwnedView) {
  const [a, b] = TOWN_COURT.goals;
  const cheer = cheerSite(cheerAround);
  const sweep = discPath(owner);
  const records = loadLevelArtifact(level, definitions).placements.map((p) => {
    const point = p.id === 'town.goal-a' ? a : p.id === 'town.goal-b' ? b : TOWN_COURT.lever;
    const x = ORIGIN.x + point.x,
      z = ORIGIN.z + point.z;
    return instantiate(
      p.prefab,
      { ...p, pos: [x, H(x, z), z], rot: [point.yaw, 0, 0] },
      {
        owner,
        handlers: {
          'town.ball-return': () =>
            me.body && at.distanceTo(me.body.position) < 2.4
              ? [{ id: 'town.ball-return', verb: 'Bring the ball back', at, run: respawnBall }]
              : [],
        },
      },
    );
  });
  const lever = records[2]!;
  // The coarse land triangles start climbing the bowl beneath the outer chalk line.
  const vertex = new THREE.Vector3();
  for (const record of records)
    record.root.traverse((part) => {
      if (!(part instanceof THREE.Mesh) || part.name !== 'chalk') return;
      const positions = part.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        part.localToWorld(vertex.fromBufferAttribute(positions, i));
        positions.setY(i, positions.getY(i) + surfaceHeight(vertex.x, vertex.z) - record.root.position.y);
      }
      positions.needsUpdate = true;
      part.geometry.computeBoundingSphere();
    });
  const at: THREE.Vector3 = lever.attach('handle').at;
  const clearance = liftOrWait(
    records.map((record) => ({ shapes: record.solids, on: () => record.setEnabled(true) })),
    me.body,
    { lift: true, visitor: frameHasRemote },
  );
  const goals = records
    .filter((r) => r !== lever)
    .map((record) => ({
      root: record.root,
      previous: new THREE.Vector3(),
      string: record.root.getObjectByName('bunting')!,
      last: -Infinity,
    }));
  const current = new THREE.Vector3(),
    start = new THREE.Vector3(),
    end = new THREE.Vector3();
  let previousTime = NaN,
    previousEpoch = ball.e;
  const forget = () => {
    previousTime = NaN;
  };
  document.addEventListener('visibilitychange', forget);
  owner.cleanup(() => document.removeEventListener('visibilitychange', forget));
  return {
    targets: lever.targets,
    update(now: number) {
      if (clearance.waiting.length) clearance.retry(me.body);
      const path = sweep(now);
      for (const goal of goals) {
        goal.root.worldToLocal(current.copy(ball.pose.p));
        const previous = goal.previous;
        if (
          goal.root.visible &&
          now - goal.last >= 700 &&
          ((previousEpoch === ball.e &&
            !ball.held &&
            crossedGoal(previous, current, Math.hypot(ball.pose.v.x, ball.pose.v.z), (now - previousTime) / 1000)) ||
            (path &&
              throughMouth(goal.root.worldToLocal(start.copy(path.start)), goal.root.worldToLocal(end.copy(path.end)))))
        ) {
          goal.last = now;
          cheer(now, goal.root.position.x, goal.root.position.z);
          bell(goal.root.position.x, goal.root.position.z);
        }
        const age = (now - goal.last) / 1000;
        goal.string.rotation.x = age < 0.7 ? Math.sin(age * 24) * Math.exp(-age * 6) : 0;
        previous.copy(current);
      }
      previousTime = ball.held || document.hidden ? NaN : now;
      previousEpoch = ball.e;
    },
  };
}
