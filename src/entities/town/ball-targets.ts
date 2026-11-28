// Local celebrations from the displayed Owner ball. The course and the splash spot are walk-through props.
import { Line3, Vector3 } from 'three';
import { GOLF_CUPS } from '../../place/town-plan.ts';
import { toWorld } from '../../place/layout.ts';
import { surfaceHeight } from '../../place/terrain.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { fanfare, near } from '../../render/fanfare.ts';
import { clank } from '../../render/machine-sfx.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { splash } from '../../render/splash.ts';
import { PLOT_KIND } from '../../sim/railway-trade-layout.ts';
import { ball } from '../ball/state.ts';

type XZ = { x: number; z: number };

export function createBallTargets(owner: OwnedView, porch: XZ, yaw: number) {
  function prop(prefab: 'town.golf-tee' | 'town.golf-cup' | 'town.dunk', id: string, point: XZ, angle: number) {
    const x = toWorld(point.x);
    return instantiate(
      prefab,
      { id, prefab, pos: [x, surfaceHeight(x, point.z), point.z], rot: [angle, 0, 0] },
      { owner },
    );
  }
  const tee = prop('town.golf-tee', 'town.golf-tee', porch, yaw);
  const bakery = prop('town.dunk', 'town.dunk', porch, yaw);
  const cups = GOLF_CUPS.map((p, i) => {
    const from = GOLF_CUPS[i - 1] ?? porch;
    return prop('town.golf-cup', `town.golf-cup.${i}`, p, Math.atan2(from.x - p.x, from.z - p.z));
  });
  function target(record: typeof tee, centre: Vector3, part: string, radius: number, kind: number) {
    return {
      record,
      centre: record.root.localToWorld(centre),
      pivot: record.root.getObjectByName(part)!,
      radius,
      kind,
      inside: false,
      last: -Infinity,
    };
  }
  const targets = [
    ...cups.map((cup) => target(cup, new Vector3(0, 0.46, 0), 'flag', 0.62, PLOT_KIND.golf)),
    target(bakery, new Vector3(0.78, 1.5, 0.05), 'bucket', 0.72, PLOT_KIND.dunk),
  ];
  const path = new Line3();
  const closest = new Vector3();
  let previousTime = NaN,
    epoch = -1,
    shown = 0;
  return {
    describe: () => ({ kind: shown, hits: targets.map((t) => t.last) }),
    update(kind: number, now: number) {
      if (shown !== kind) {
        shown = kind;
        tee.setEnabled(kind === PLOT_KIND.golf);
        for (const t of targets) {
          t.record.setEnabled(t.kind === kind);
          t.inside = false;
          t.last = -Infinity;
        }
        previousTime = NaN;
      }
      if (!shown) return;
      path.end.copy(ball.pose.p);
      const dt = (now - previousTime) / 1000;
      const speed = ball.pose.v.length();
      // A recall by the current owner can keep its epoch. Reject a discontinuous step as well as a new epoch.
      const moving =
        !document.hidden &&
        !ball.held &&
        epoch === ball.e &&
        dt > 0 &&
        dt <= 0.25 &&
        speed > 0.05 &&
        path.distance() <= speed * dt + 0.5;
      for (const t of targets) {
        if (t.kind !== shown) continue;
        const inside = path.end.distanceToSquared(t.centre) <= t.radius ** 2;
        if (
          moving &&
          !t.inside &&
          path.closestPointToPoint(t.centre, true, closest).distanceToSquared(t.centre) <= t.radius ** 2
        ) {
          t.last = now;
          if (t.kind === PLOT_KIND.golf) fanfare(false, near(t.centre.x, t.centre.z));
          else {
            const p = bakery.root.position;
            clank(t.centre.x, t.centre.z);
            splash(p.x, p.z, 0.85, p.y + 2.4);
          }
        }
        t.inside = inside;
        const age = (now - t.last) / 1000;
        if (t.kind === PLOT_KIND.dunk) t.pivot.rotation.x = age < 1.2 ? Math.sin((Math.PI * age) / 1.2) * 1.9 : 0;
        else t.pivot.rotation.z = age < 0.8 ? Math.sin(age * 22) * Math.exp(-age * 5) * 0.55 : 0;
      }
      path.start.copy(path.end);
      previousTime = ball.held || document.hidden ? NaN : now;
      epoch = ball.e;
    },
  };
}
