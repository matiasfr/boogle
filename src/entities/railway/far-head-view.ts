// Far Head's Local payoff: two instanced lamp rows and an ephemeral show on the live Q5 completion edge only. The rockets
// and a camera pull-out over them wait behind any reward card, so the show is seen whole (owner, 9 November: "got no
// cutscene I could see").
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Body } from '../../physics/engine.ts';
import { emit } from '../../render/particles.ts';
import { readableIntensity, readableUnlit } from '../../render/readable-unlit.ts';
import { whistle } from '../../render/machine-sfx.ts';
import { farHeadEnd, farHeadShot } from './far-head-show.ts';

type Deps = {
  layout: typeof import('../../place/layout.ts');
  rail: typeof import('./rail-kit.ts');
  land: typeof import('../../place/land.ts');
  flat: (typeof import('../../render/flat.ts'))['flat'];
  sounds: typeof import('../../render/fanfare.ts');
  /** A reward card has the screen: the show waits for it. */
  busy: () => boolean;
  /** The line's camera pull-out (createCameraPullOut): from, drifting to, looking at, seconds. */
  shot: (from: THREE.Vector3, to: THREE.Vector3, at: THREE.Vector3, seconds: number) => void;
};
export function createRailwayFarHead(owner: OwnedView, { layout, rail, land, flat, sounds, busy, shot }: Deps) {
  const line = layout.LINKS[1]!.line;
  // The rail's end, in world metres (besideLine already includes ORIGIN, as it does for every production rail view).
  const farHead = farHeadEnd();
  const slots: THREE.Vector3[] = [];
  // Rim outward, preserving Place's 27 stations (490, 483, ... 308), two lamps each, 1.72 m in from each edge of the
  // deck: on the left that is the up track's edge since the second track (generic-lines step 2).
  for (let s = 308; s <= 490; s += 7)
    for (const side of [-1, 1]) {
      const up = side < 0 ? (layout.upLat(layout.FORMATION.quarry, s) ?? 0) : 0;
      const p = rail.besideLine(line, s, side * 1.72 + up);
      slots.push(new THREE.Vector3(p.x, layout.railY(line, s) + 0.75, p.z));
    }
  const postGeo = new THREE.BoxGeometry(0.12, 1.5, 0.12),
    glowGeo = new THREE.BoxGeometry(0.26, 0.26, 0.26);
  const glow = readableUnlit(new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(3, 2.1, 0.9) }));
  const posts = new THREE.InstancedMesh(postGeo, flat('#5c4530'), slots.length);
  const glows = new THREE.InstancedMesh(glowGeo, glow, slots.length);
  const o = new THREE.Object3D();
  slots.forEach((p, k) => {
    o.position.copy(p);
    o.updateMatrix();
    posts.setMatrixAt(k, o.matrix);
    o.position.y += 0.8;
    o.updateMatrix();
    glows.setMatrixAt(k, o.matrix);
  });
  // Two colour draws total, including posts; no additional shadow draw for these thin distant sticks.
  posts.frustumCulled = glows.frustumCulled = false;
  posts.count = glows.count = 0;
  owner.add(posts, glows);
  const bodies: Body[] = [];
  function lamps(count: number) {
    while (bodies.length > count) owner.removeBody(bodies.pop()!);
    while (bodies.length < count)
      bodies.push(
        land.addStatic(
          { kind: 'box', hx: 0.06, hy: 0.75, hz: 0.06 },
          slots[bodies.length]!,
          undefined,
          undefined,
          owner,
        ),
      );
    posts.count = glows.count = count;
  }
  const colours = ['#ffcc63', '#39e6c6', '#ff7272', '#b9a0ff'].map((c) => new THREE.Color(c));
  const trail = new THREE.Color('#ffe9b0');
  type Rocket = { t: number; x: number; y: number; z: number; height: number; size: number; colour: THREE.Color };
  const rockets: Rocket[] = [];
  let completed = false,
    show = -1,
    secondWhistle = false,
    waiting = false; // the edge came while a reward card had the screen
  const v = (p: { x: number; y: number; z: number }) => new THREE.Vector3(p.x, p.y, p.z);
  function celebrate() {
    waiting = false;
    show = 0;
    secondWhistle = false;
    sounds.fanfare(true);
    whistle(farHead.x, farHead.z);
    barrage(farHead.x, farHead.y + 6, farHead.z, 10, 0.4, 36, 2.2);
    barrage(layout.VILLAGE.x + layout.ORIGIN.x, layout.VILLAGE.y, layout.VILLAGE.z, 5, 0.6, 26, 1.6);
    const { from, to, at, seconds } = farHeadShot();
    shot(v(from), v(to), v(at), seconds);
  }
  function barrage(x: number, y: number, z: number, count: number, gap: number, spread: number, size: number) {
    for (let k = 0; k < count; k++)
      rockets.push({
        t: -k * gap,
        x: x + (Math.random() - 0.5) * spread,
        y,
        z: z + (Math.random() - 0.5) * spread,
        height: 24 + Math.random() * 16,
        size,
        colour: colours[Math.floor(Math.random() * colours.length)]!,
      });
  }
  owner.cleanup(() => {
    rockets.length = 0;
    glow.dispose();
    postGeo.dispose();
    glowGeo.dispose();
  });
  return {
    restore(done: boolean) {
      completed = done;
      show = -1;
      secondWhistle = false;
      waiting = false;
      rockets.length = 0;
      lamps(done ? slots.length : 0);
    },
    update(dt: number, done: boolean) {
      if (done && !completed) waiting = true;
      if (waiting && done && !busy()) celebrate();
      if (!done && completed) {
        show = -1;
        waiting = false;
        rockets.length = 0;
        lamps(0);
      }
      completed = done;
      if (show >= 0) {
        show += dt;
        lamps(Math.min(slots.length, 1 + Math.floor(show / 0.09)));
        if (!secondWhistle && show >= 1.4) {
          secondWhistle = true;
          whistle(farHead.x, farHead.z);
        }
      }
      for (let k = rockets.length - 1; k >= 0; k--) {
        const r = rockets[k]!;
        r.t += dt;
        if (r.t < 0) continue;
        if (r.t >= 0.8) {
          for (let n = 0; n < Math.round(44 + r.size * 8); n++) {
            const a = Math.random() * Math.PI * 2,
              u = Math.random() * 2 - 1,
              radius = Math.sqrt(1 - u * u),
              speed = (10 + Math.random() * 3) * r.size;
            emit({
              x: r.x,
              y: r.y + r.height,
              z: r.z,
              vx: Math.cos(a) * radius * speed,
              vy: u * speed,
              vz: Math.sin(a) * radius * speed,
              life: 1.5 + Math.random() * 0.5,
              size: 0.55 * r.size,
              color: r.colour,
              intensity: readableIntensity(),
              gravity: 7,
              drag: 1.4,
              shrink: 0.4,
            });
          }
          rockets.splice(k, 1);
        } else
          emit({
            x: r.x,
            y: r.y + r.height * (1 - (1 - r.t / 0.8) ** 2),
            z: r.z,
            vx: 0,
            vy: -1,
            vz: 0,
            life: 0.5,
            size: 0.35 * r.size,
            color: trail,
            intensity: readableIntensity(),
            shrink: 0.5,
          });
      }
      if (show > 6 && rockets.length === 0) show = -1;
    },
    inspect: () => ({ farHead, trestleLamps: posts.count, farHeadRockets: rockets.length, farHeadWaiting: waiting }),
  };
}
