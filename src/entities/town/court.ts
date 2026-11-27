import * as THREE from 'three/webgpu';
import { TOWN_CENTRE, TOWN_COURT, TOWN_GROUND } from '../../place/town-plan.ts';
import { ORIGIN } from '../../place/layout.ts';
import { H, insidePlace } from '../../place/terrain.ts';
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
    under: H,
    floorBelow: (x, _y, z) => H(x, z),
    inside: insidePlace,
    spawn: { x: ORIGIN.x + TOWN_COURT.centre.x, z: ORIGIN.z + TOWN_COURT.centre.z },
    sproutable: (x, z) => Math.hypot(x - ORIGIN.x - TOWN_CENTRE.x, z - ORIGIN.z - TOWN_CENTRE.z) <= TOWN_GROUND.r,
  });
}

export function createCourt(owner: OwnedView) {
  const [a, b] = TOWN_COURT.goals;
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
  const current = new THREE.Vector3();
  let tracking = false;
  return {
    targets: lever.targets,
    update(now: number) {
      if (clearance.waiting.length) clearance.retry(me.body);
      for (const goal of goals) {
        goal.root.worldToLocal(current.copy(ball.pose.p));
        const previous = goal.previous;
        const t = previous.z / (previous.z - current.z);
        if (
          tracking &&
          goal.root.visible &&
          !ball.held &&
          now - goal.last >= 700 &&
          t > 0 &&
          t <= 1 &&
          current.distanceToSquared(previous) < 4
        ) {
          const x = previous.x + t * (current.x - previous.x),
            y = previous.y + t * (current.y - previous.y);
          if (Math.abs(x) <= TOWN_COURT.width / 2 && y >= 0 && y <= TOWN_COURT.height) {
            goal.last = now;
            bell(goal.root.position.x, goal.root.position.z);
          }
        }
        const age = (now - goal.last) / 1000;
        goal.string.rotation.x = age < 0.7 ? Math.sin(age * 24) * Math.exp(-age * 6) : 0;
        previous.copy(current);
      }
      tracking = !ball.held;
    },
  };
}
