// Local celebrations from the displayed Owner ball. The course and the splash spot are walk-through props.
import { Line3, Vector3 } from 'three';
import { cheerAround } from '../../place/folk.ts';
import { cheerSite, continuous, cupStroll } from './play.ts';
import { discPath, enters } from './disc-path.ts';
import { GOLF_CUPS } from '../../place/town-plan.ts';
import { toWorld } from '../../place/layout.ts';
import { surfaceHeight } from '../../place/terrain.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { confetti, fanfare, near } from '../../render/fanfare.ts';
import { chordSound } from '../../features/honk.ts';
import { me } from '../../player/state.ts';
import { inputState } from '../../player/input-state.ts';
import { aboard } from '../../physics/platforms.ts';
import { momentBusy } from '../../render/buddy-frame.ts';
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
  const cheer = cheerSite(cheerAround);
  const sweep = discPath(owner);
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
  let sink = cupStroll();
  const path = new Line3();
  const closest = new Vector3();
  let previousTime = NaN,
    epoch = -1,
    shown = 0;
  // A hidden tab may receive no frames until it becomes visible again.
  const resetPath = () => {
    previousTime = NaN;
  };
  document.addEventListener('visibilitychange', resetPath);
  owner.cleanup(() => document.removeEventListener('visibilitychange', resetPath));
  return {
    describe: () => ({ kind: shown, hits: targets.map((t) => t.last) }),
    update(kind: number, now: number) {
      if (shown !== kind) {
        sink = cupStroll();
        shown = kind;
        tee.setEnabled(kind === PLOT_KIND.golf);
        for (const t of targets) {
          t.record.setEnabled(t.kind === kind);
          t.inside = false;
          t.last = -Infinity;
        }
        previousTime = NaN;
      }
      const flight = sweep(now);
      if (!shown) return;
      path.end.copy(ball.pose.p);
      const dt = (now - previousTime) / 1000;
      const speed = ball.pose.v.length();
      // A recall by the current owner can keep its epoch. Reject a discontinuous step as well as a new epoch.
      const moving = !document.hidden && !ball.held && continuous(epoch, ball.e, path.distance(), speed, dt);
      for (const t of targets) {
        if (t.kind !== shown) continue;
        const inside = path.end.distanceToSquared(t.centre) <= t.radius ** 2;
        if (
          (moving &&
            !t.inside &&
            path.closestPointToPoint(t.centre, true, closest).distanceToSquared(t.centre) <= t.radius ** 2) ||
          (t.kind === PLOT_KIND.dunk && enters(flight, t.centre, t.radius))
        ) {
          t.last = now;
          cheer(now, t.centre.x, t.centre.z);
          if (t.kind === PLOT_KIND.golf) {
            const volume = near(t.centre.x, t.centre.z);
            fanfare(false, volume);
            if (sink(targets.indexOf(t))) {
              chordSound([392, 494, 587], volume * 0.12);
              confetti(t.centre.x, t.centre.y + 1, t.centre.z, 24);
            }
          } else {
            const p = bakery.root.position;
            const body = me.body;
            if (
              body &&
              me.coyote > 0 &&
              !inputState.held &&
              !inputState.seated &&
              !aboard() &&
              !momentBusy() &&
              !me.swimming &&
              !me.down &&
              body.velocity.y <= 0.4 &&
              !me.jumpQueued &&
              Math.hypot(body.position.x - p.x, body.position.z - p.z) <= 1.2 &&
              Math.abs(body.position.y - p.y) < 1.4
            ) {
              body.velocity.y = 5.5;
              me.coyote = 0;
              splash(body.position.x, body.position.z, 0.4, body.position.y);
            }
            clank(t.centre.x, t.centre.z);
            splash(p.x, p.z, 0.85, p.y, p.y + 2.4);
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
