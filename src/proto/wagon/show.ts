// `&v=show` on the wagon card (docs/research/train-riding.md, recs 1 and 10: dark rides' scenes, the Hogwarts
// Express's two shows, Miyazaki's quiet stretch). Three greybox trackside scenes fire as the train comes near and last
// a few seconds, so the ride has something to watch:
//   crane   a crane by the line swings a plank over the rails as the loco comes up, then clears it (outbound only)
//   gulls   twenty gulls lift off by the line, wheel away and come back to land (both ways)
//   figure  someone at a path crossing waves, the passing train blows their hat off, they pick it up (return only)
// Between Palm Walk and the gulls nothing happens on purpose (the quiet stretch). Local: each scene fires off the
// wagon's place in the timetable (`wagonAt`, shared by every tab), so riders on different tabs see the same show at the
// same moment without any messages; the gulls' scatter is Math.random (cosmetic). Silent (no wagon sounds after the
// audit). Serves DESIGN.md 1 (Toys before chores): something to watch, nothing to earn.
import * as THREE from 'three/webgpu';
import { onFrame } from '../../loop.ts';
import { scene } from '../../render/scene.ts';
import { groundHeight } from '../../island/terrain.ts';
import { carry } from '../../physics/platforms.ts';
import { reducedMotion } from '../../constants.ts';
import { protoMark } from '../mark.ts';
import { besideLine, frontOf, type WagonCtx } from './ctx.ts';

const ease = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const seg = (t: number, a: number, b: number) => ease((t - a) / (b - a));

type Scene = {
  name: string;
  d: number; // m along the line
  dirs: number; // 1 outbound only, -1 return only, 0 both
  reach: number; // m from the train's leading end at which it fires
  dur: number; // s
  t: number; // s since it fired (-1: resting)
  firedDir: number;
  play: (t: number, dt: number, dir: number) => void; // t < 0: rest pose
};

/** Builds the three scenes beside the line (hidden until `setOn(true)`); returns the switch. */
export function wagonShow(ctx: WagonCtx) {
  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);
  const mat = (color: string) => new THREE.MeshStandardNodeMaterial({ color, roughness: 0.85 });
  const yellow = mat('#e2b33a'),
    steel = mat('#5d6068'),
    plank = mat('#d8b583'),
    rope = mat('#3a3631'),
    white = mat('#ffffff'),
    grey = mat('#dfe3e8'),
    blue = mat('#4f7fb8'),
    skin = mat('#e8b48a'),
    red = mat('#c8452f'),
    path = mat('#c9b48a');
  const box = (parent: THREE.Object3D, w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  // A group standing beside the line at `d`, `lat` m to its right going out, +z along the line.
  const place = (d: number, lat: number) => {
    const s = besideLine(ctx, d, lat);
    const g = new THREE.Group();
    g.position.set(s.x, groundHeight(s.x, s.z), s.z);
    g.rotation.y = s.yaw;
    root.add(g);
    return { g, s };
  };

  // ---------------------------------------------------------------- the crane (outbound, by Palm Walk)
  // A mast 4.5 m to the right of the line; its jib rests along the line and swings 90° to reach across it, a plank
  // hanging 1.6 m under the jib (about 5 m up: over riders' heads and the follow camera's).
  const crane = place(12, 4.5);
  const CRANE_H = 6.6;
  box(crane.g, 0.8, 0.3, 0.8, steel, 0, 0.15, 0); // base
  box(crane.g, 0.3, CRANE_H, 0.3, yellow, 0, CRANE_H / 2, 0); // mast
  const jib = new THREE.Group();
  jib.position.y = CRANE_H;
  crane.g.add(jib);
  const JIB = 5.6; // m: reaches 1.1 m past the line
  box(jib, 0.25, 0.25, JIB, yellow, 0, 0.1, -JIB / 2 + 0.4); // the jib points along -z (towards the line when swung)
  box(jib, 0.6, 0.5, 0.6, steel, 0, 0.1, 0.9); // counterweight
  box(jib, 0.35, 0.35, 0.35, steel, 0, 0.35, 0); // slewing head
  const hook = new THREE.Group(); // swings on the rope like a pendulum
  hook.position.set(0, 0, -(JIB - 1.1)); // over the line's centre once swung
  jib.add(hook);
  box(hook, 0.03, 1.6, 0.03, rope, 0, -0.8, 0);
  box(hook, 2.6, 0.12, 0.35, plank, 0, -1.65, 0);
  const JIB_REST = 0; // along the line, pointing back towards the first site (swung: +x, left going out, across the line)
  jib.rotation.y = JIB_REST;
  let sway = 0,
    swayV = 0,
    lastJib = JIB_REST;
  const craneScene: Scene = {
    name: 'crane',
    d: 12,
    dirs: 1,
    reach: 25,
    dur: 8,
    t: -1,
    firedDir: 0,
    play(t, dt) {
      // swing in over 2.5 s, hold the plank over the rails while the loco passes under it, swing clear by 8 s
      const a = t < 0 ? 0 : seg(t, 0, 2.5) - seg(t, 5.8, 8);
      jib.rotation.y = JIB_REST - a * (Math.PI / 2);
      // the plank lags the swing and settles (a damped pendulum driven by the jib's turn)
      const turn = dt > 0 ? (jib.rotation.y - lastJib) / dt : 0;
      lastJib = jib.rotation.y;
      swayV += (-sway * 14 - swayV * 2.2 - turn * 3) * dt;
      sway += swayV * dt;
      hook.rotation.x = reducedMotion ? 0 : sway * 0.6;
      hook.rotation.z = reducedMotion ? 0 : sway * 0.25;
    },
  };

  // ---------------------------------------------------------------- the gulls (both ways, past the quiet stretch)
  // Twenty birds on the ground 4-9 m to the left of the line (the sea side at home; the line never reaches the sand
  // itself), past the third stop so they lift as the train pulls away from it. One instanced body and two wings; the
  // group's +x is left going out, so away from the line.
  const GULL_D = 47,
    GULL_LAT = -6.5;
  const gulls = place(GULL_D, GULL_LAT);
  const N = 20;
  const bodyMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.12, 0.34), white, N);
  const wingMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.46, 0.02, 0.14), grey, N * 2);
  bodyMesh.castShadow = wingMesh.castShadow = true;
  gulls.g.add(bodyMesh, wingMesh);
  const birds = Array.from({ length: N }, () => {
    const a = Math.random() * Math.PI * 2,
      r = Math.sqrt(Math.random()) * 2.4;
    const x = Math.cos(a) * r,
      z = Math.sin(a) * r * 1.6;
    const s = besideLine(ctx, GULL_D + z, GULL_LAT - x);
    return {
      x,
      z,
      y: groundHeight(s.x, s.z) - gulls.g.position.y + 0.09,
      yaw: Math.random() * Math.PI * 2,
      delay: Math.random() * 0.7,
      // where it flies: away from the line, spread, up
      fx: 6 + Math.random() * 9,
      fz: (Math.random() - 0.5) * 14,
      fy: 6 + Math.random() * 5,
      flap: 9 + Math.random() * 4,
      ph: Math.random() * 6,
    };
  });
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler(0, 0, 0, 'YXZ'),
    pos = new THREE.Vector3(),
    one = new THREE.Vector3(1, 1, 1),
    folded = new THREE.Vector3(0.35, 1, 1),
    off = new THREE.Vector3(),
    at = new THREE.Vector3();
  const GULL_UP = 4, // s: up and away
    GULL_BACK = 6.5, // s: they start gliding back
    GULL_DUR = 11; // (under the 12 s from pulling away to coming back past them)
  const gullScene: Scene = {
    name: 'gulls',
    d: GULL_D,
    dirs: 0,
    reach: 5.5,
    dur: GULL_DUR,
    t: -1,
    firedDir: 0,
    play(t, _dt, dir) {
      const now = performance.now() / 1000;
      for (let k = 0; k < N; k++) {
        const b = birds[k];
        const tt = t < 0 ? 0 : t - b.delay;
        // 0..1 out (lift-off, wheel away) and 0..1 back (glide in to land)
        const out = tt <= 0 ? 0 : Math.min(1, tt / GULL_UP),
          back = seg(tt, GULL_BACK, GULL_DUR - 0.2);
        const u = out * (1 - back);
        const lift = 1 - (1 - u) * (1 - u); // fast off the ground
        const drift = dir * 3 * u; // they go off a little the train's way
        pos.set(b.x + b.fx * u, b.y + b.fy * lift, b.z + (b.fz + drift) * u);
        const flying = u > 0.001;
        const heading = flying ? Math.atan2(b.fx, b.fz + drift) + (back > 0 ? Math.PI : 0) : b.yaw;
        e.set(flying ? -0.25 : 0, heading, 0);
        q.setFromEuler(e);
        m4.compose(pos, q, one);
        bodyMesh.setMatrixAt(k, m4);
        // wings: folded on the ground, beating going up, held out gliding back in
        const beat = !flying ? -1.2 : back > 0 && back < 0.9 ? 0.15 : Math.sin(now * b.flap + b.ph) * 0.9;
        for (const side of [-1, 1]) {
          e.set(flying ? -0.25 : 0, heading, side * (flying ? beat : 1.2));
          q.setFromEuler(e);
          off.set(side * (flying ? 0.22 : 0.06), 0.03, 0).applyQuaternion(q);
          m4.compose(at.copy(pos).add(off), q, flying ? one : folded);
          wingMesh.setMatrixAt(k * 2 + (side > 0 ? 1 : 0), m4);
        }
      }
      bodyMesh.instanceMatrix.needsUpdate = wingMesh.instanceMatrix.needsUpdate = true;
    },
  };

  // ---------------------------------------------------------------- the figure at the crossing (return only)
  // A plank crossing over the rails and a blocky walker beside it, 2.5 m to the left of the line, facing it, a little
  // larger than life. Just past the third stop going back, so the train's tail reaches them as it pulls away.
  const FIG_D = 27;
  const crossing = place(FIG_D, 0);
  box(crossing.g, 4.4, 0.05, 1.5, path, 0, 0.18, 0);
  const fig = place(FIG_D, -2.5);
  fig.g.scale.setScalar(1.3);
  const who = new THREE.Group(); // turns to watch the train, then to the hat
  fig.g.add(who);
  who.rotation.y = -Math.PI / 2; // facing the line (the group's +x is left going out)
  box(who, 0.34, 0.6, 0.2, blue, 0, 0.3, 0); // legs
  const torso = new THREE.Group();
  torso.position.y = 0.6;
  who.add(torso);
  box(torso, 0.46, 0.62, 0.26, red, 0, 0.31, 0);
  box(torso, 0.3, 0.3, 0.3, skin, 0, 0.8, 0); // head
  const arm = new THREE.Group(); // the waving arm, pivoting at the right shoulder
  arm.position.set(0.27, 0.55, 0);
  torso.add(arm);
  box(arm, 0.12, 0.5, 0.12, red, 0, -0.25, 0);
  box(torso, 0.12, 0.5, 0.12, red, -0.29, 0.3, 0); // the other arm, down
  const hat = new THREE.Group();
  root.add(hat);
  hat.scale.setScalar(1.3);
  box(hat, 0.46, 0.04, 0.46, blue, 0, 0.02, 0); // brim
  box(hat, 0.3, 0.2, 0.3, blue, 0, 0.14, 0); // crown
  const headTop = new THREE.Vector3(),
    hatFrom = new THREE.Vector3(),
    hatTo = new THREE.Vector3();
  const onHead = () => {
    torso.updateWorldMatrix(true, false);
    return headTop.set(0, 0.95, 0).applyMatrix4(torso.matrixWorld);
  };
  let hatSpin = 0;
  const FLY_AT = 2.8, // s: the train's end is about level with them
    LAND_AT = 4.3,
    PICK_AT = 5.2,
    FIG_DUR = 6.7;
  const figScene: Scene = {
    name: 'figure',
    d: FIG_D,
    dirs: -1,
    reach: 6,
    dur: FIG_DUR,
    t: -1,
    firedDir: 0,
    play(t, dt, dir) {
      const r = t < 0 ? 0 : t;
      // wave: the arm comes up and swings; down once the hat goes
      const up = seg(r, 0, 0.5) * (1 - seg(r, FLY_AT + 0.2, FLY_AT + 0.7));
      arm.rotation.z = up * (2.6 + Math.sin(r * 9) * 0.45);
      // turn to the hat as it lands; bend to pick it up; straighten
      const look = seg(r, FLY_AT + 0.3, LAND_AT);
      who.rotation.y = -Math.PI / 2 - look * (1 - seg(r, PICK_AT + 0.6, FIG_DUR)) * dir * 1.4;
      torso.rotation.x = (seg(r, PICK_AT - 0.6, PICK_AT) - seg(r, PICK_AT + 0.2, PICK_AT + 0.9)) * 0.8;
      const head = onHead();
      if (t < 0 || r < FLY_AT) {
        hat.position.copy(head);
        hat.rotation.set(0, who.rotation.y + fig.g.rotation.y, 0);
        hatSpin = 0;
        // where it will land: 2.5 m down the line the way the train goes, a little back from the rails
        const s = besideLine(ctx, FIG_D + dir * 2.6, -3.4);
        hatTo.set(s.x, groundHeight(s.x, s.z) + 0.02, s.z);
        hatFrom.copy(head);
        return;
      }
      if (r < LAND_AT) {
        const u = (r - FLY_AT) / (LAND_AT - FLY_AT);
        hat.position.lerpVectors(hatFrom, hatTo, u);
        hat.position.y += Math.sin(u * Math.PI) * 1.4;
        hatSpin += dt * 11 * (1 - u);
        hat.rotation.set(Math.sin(hatSpin) * 0.8, hatSpin, 0);
        return;
      }
      // on the ground, then back up to the head once picked up
      const pick = seg(r, PICK_AT - 0.2, PICK_AT + 0.6);
      hat.position.lerpVectors(hatTo, head, pick);
      hat.position.y += Math.sin(pick * Math.PI) * 0.3;
      hat.rotation.x *= 1 - pick;
    },
  };

  const scenes = [craneScene, gullScene, figScene];
  for (const s of scenes) s.play(-1, 0, 1);
  let on = false;
  onFrame(
    ({ dt }) => {
      if (!on) return;
      const w = ctx.state();
      const d = w ? w.dist / 100 : NaN;
      const dir = w && w.stop < 0 ? Math.sign(w.speed) : 0;
      const riding = ctx.cars.some((c) => carry.on === c.platform);
      for (const s of scenes) {
        if (s.t >= 0) {
          s.t += dt;
          if (s.t >= s.dur) s.t = -1;
          s.play(s.t, dt, s.firedDir || 1);
          continue;
        }
        s.play(-1, dt, 1);
        if (!w || !dir) continue;
        // ready again once the train runs the other way, or is far off
        if (s.firedDir && (dir !== s.firedDir || Math.abs(d - s.d) > 40)) s.firedDir = 0;
        if (s.firedDir || (s.dirs && s.dirs !== dir)) continue;
        const ahead = (s.d - frontOf(ctx, d, dir)) * dir;
        if (ahead > -1 && ahead < s.reach) {
          s.t = 0;
          s.firedDir = dir;
          if (riding) protoMark('beat'); // a scene seen from the train
        }
      }
    },
    { phase: 'update', order: 9 },
  );
  return {
    setOn(v: boolean) {
      on = v;
      root.visible = v;
      if (v) return;
      for (const s of scenes) {
        s.t = -1;
        s.firedDir = 0;
        s.play(-1, 0, 1);
      }
    },
    /** For the look evals: each scene's place and state. */
    scenes: () => scenes.map(({ name, d, t, firedDir }) => ({ name, d, t, firedDir })),
  };
}
