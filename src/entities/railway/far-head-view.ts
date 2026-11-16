// Far Head's Local payoff: two instanced lamp rows and an ephemeral show on the live Q5 completion edge only. The rockets
// and a camera pull-out over them wait behind any reward card, so the show is seen whole (owner, 9 November: "got no
// cutscene I could see"). The shot's last 2.5 s cut to the forge, where the boiler was just cast, and the forge's call
// sounds as the cut lands (docs/plans/forge-call-handoff.md, step 1; owner, 15 November).
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Body } from '../../physics/engine.ts';
import { emit } from '../../render/particles.ts';
import { readableIntensity, readableUnlit } from '../../render/readable-unlit.ts';
import { whistle } from '../../render/machine-sfx.ts';
import type { ShotShape } from '../../render/camera-pull-out.ts';
import { farHeadEnd, farHeadShot } from './far-head-show.ts';
import { holdForgeCall, soundForgeCall } from './forge-call.ts';

/** Seconds: the longest the show holds the forge's call (behind a reward card, then the shot), and when the call
 * sounds with no cut to carry it (reduced motion, a vehicle's seat): after the show's own two whistles. */
const CALL = { hold: 30, bare: 3 } as const;

type Deps = {
  layout: typeof import('../../place/layout.ts');
  rail: typeof import('./rail-kit.ts');
  land: typeof import('../../place/land.ts');
  flat: (typeof import('../../render/flat.ts'))['flat'];
  sounds: typeof import('../../render/fanfare.ts');
  /** A reward card has the screen: the show waits for it. */
  busy: () => boolean;
  /** The line's camera pull-out (createCameraPullOut): from, drifting to, looking at, seconds, the travel's seconds
   * and its shape; false when no shot was queued (reduced motion, a vehicle's seat). */
  shot: (
    from: THREE.Vector3,
    to: THREE.Vector3,
    at: THREE.Vector3,
    seconds: number,
    drift: number,
    shape: ShotShape,
  ) => boolean;
  /** The camera is coming home from the forge cut: turn it toward the forge (line2-view.ts decides for whom). */
  handBack: () => void;
};
export function createRailwayFarHead(
  owner: OwnedView,
  { layout, rail, land, flat, sounds, busy, shot, handBack }: Deps,
) {
  const line = layout.LINKS[1]!.line;
  // The rail's end, in world metres (besideLine already includes ORIGIN, as it does for every production rail view).
  const farHead = farHeadEnd();
  const shotSeconds = farHeadShot().seconds;
  const slots: THREE.Vector3[] = [];
  // Rim outward, preserving Place's 27 stations (490, 483, ... 308), two lamps each, 1.72 m in from each edge of the
  // deck: on the left that is the up track's edge since the second track (generic-lines step 2).
  for (let s = 308; s <= 490; s += 7)
    for (const side of [-1, 1]) {
      const up = side < 0 ? (layout.offsetLat(layout.FORMATION.quarry, s) ?? 0) : 0;
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
    waiting = false, // the edge came while a reward card had the screen
    // The forge's call for this show: held from the edge, sounded once (at the cut, the hand-back, or `CALL.bare`).
    call: 'none' | 'held' | 'cut' = 'none';
  const cue = () => {
    if (call === 'none') return;
    call = 'none';
    soundForgeCall();
  };
  const v = (p: { x: number; y: number; z: number }) => new THREE.Vector3(p.x, p.y, p.z);
  function celebrate() {
    waiting = false;
    show = 0;
    secondWhistle = false;
    sounds.fanfare(true);
    whistle(farHead.x, farHead.z);
    barrage(farHead.x, farHead.y + 6, farHead.z, 10, 0.4, 36, 2.2);
    barrage(layout.VILLAGE.x + layout.ORIGIN.x, layout.VILLAGE.y, layout.VILLAGE.z, 5, 0.6, 26, 1.6);
    const { from, to, at, seconds, leg, title, back, end } = farHeadShot();
    holdForgeCall(CALL.hold);
    call = shot(v(from), v(to), v(at), seconds, leg, {
      back,
      titleS: title,
      end: { pos: v(end.pos), to: v(end.to), at: v(end.at) },
      onCut: cue,
      // A skip before the cut, or the cut's end: the call has sounded by the time the camera is home.
      onHome: () => {
        cue();
        handBack();
      },
    })
      ? 'cut'
      : 'held';
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
      cue();
      rockets.length = 0;
      lamps(done ? slots.length : 0);
    },
    update(dt: number, done: boolean) {
      if (done && !completed) {
        waiting = true;
        // The boiler is cast on this same frame: its call waits for the cut.
        holdForgeCall(CALL.hold);
        call = 'held';
      }
      if (waiting && done && !busy()) celebrate();
      if (!done && completed) {
        show = -1;
        waiting = false;
        cue();
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
        // No cut to carry it, or the shot was dropped (a seat taken mid-shot): the call sounds in the clear anyway.
        if (call === 'held' ? show >= CALL.bare : show >= shotSeconds + 2) cue();
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
      if (show > 11 && rockets.length === 0) show = -1;
    },
    inspect: () => ({
      farHead,
      trestleLamps: posts.count,
      farHeadRockets: rockets.length,
      farHeadWaiting: waiting,
      farHeadCall: call,
    }),
  };
}
