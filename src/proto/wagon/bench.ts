// `&v=bench` on the wagon card (docs/research/train-riding.md, rec 2 and the camera rules of rec 13: Disneyland's
// flatcars, Train Sim World's window seat, RDR2's travel camera, Sky's benches). Each flatbed carries a back-to-back
// bench, one seat facing each side of the line. The interact button sits you on the seat on your side of the bench
// ("Sit"); Interact or Jump stands you up. Seated, the camera eases round to look out over your shoulder, side-on to the
// line and turned a little towards where the train is going: level, no roll, and the deck's bumps filtered out (it
// follows the car's level frame, not its rocking look, and its height through a 2 Hz low-pass). Looking around pans up
// to 70° either way and eases back after 2 s idle.
// Sync: Owner. Presence `seat` = [car, side] (car: index from the loco; side: 1 the car's +x, left going out, -1 right) beside
// `riding`; missing while you stand. Other tabs draw you sitting on their own copy of that bench (theirs shows the bench
// while anyone sits, whatever variant they play); old tabs ignore the key. Serves DESIGN.md 1 (Toys before chores):
// somewhere to be on the train, nothing to do.
import * as THREE from 'three/webgpu';
import { onFrame } from '../../loop.ts';
import { camera } from '../../render/scene.ts';
import { addBody, removeBody, teleport } from '../../physics/engine.ts';
import { carry } from '../../physics/platforms.ts';
import { PLAYER_R, reducedMotion } from '../../constants.ts';
import { angleLerp, clamp } from '../../math.ts';
import { me, cam } from '../../player/player.ts';
import { registerInteractable, NO_TARGETS, type Interactable } from '../../player/hands.ts';
import { addPresenceField, onRemotePresence, remotes, sendPresence } from '../../netplay/net.ts';
import { protoMark } from '../mark.ts';
import type { WagonCar, WagonCtx } from './ctx.ts';

const wrap = (a: number) => angleLerp(0, a, 1);
const SEAT_X = 0.3, // m from the bench's middle to where a sitter's body is
  SEAT_Y = 0.44, // the seat's top over the deck
  REACH = 1.4, // m from the bench's middle you can sit from
  PAN = 1.22, // rad the look can pan from the seated view (70°)
  IDLE_S = 2, // s without looking before the view eases back
  LEAD = 0.1, // rad the seated view turns towards where the train goes
  CAM_BACK = 3.8, // m behind your head
  CAM_UP = 1.15, // m over it
  CAM_SIDE = 1.1, // m back along the train (from the way it's going), so you sit low and off-centre, ahead of the view
  AIM_UP = 1.1, // m above straight out that the view aims 10 m away (keeps the horizon in the upper half)
  PITCH = -0.02,
  CUTOFF_HZ = 2, // the camera's height follows the deck through this low-pass
  EASE_IN_S = 0.9,
  EASE_OUT_S = 0.6;

/** Builds a bench on every flatbed (hidden unless needed) and the seating; returns the variant's switch. */
export function wagonBench(ctx: WagonCtx) {
  const wood = new THREE.MeshStandardNodeMaterial({ color: '#8a6a45', roughness: 0.85 }),
    dark = new THREE.MeshStandardNodeMaterial({ color: '#5b4630', roughness: 0.9 });
  // Where each flatbed's bench stands (its middle, z along the car) and how long it is: the rear one sits ahead of the
  // crates.
  const benches = ctx.cars.map((c, k) => {
    if (k === 0) return null; // the loco
    const rear = k === ctx.cars.length - 1;
    const z = rear ? 1.12 : 0,
      len = rear ? 0.72 : 1.5;
    const g = new THREE.Group();
    g.position.set(0, c.spec.top, z);
    g.visible = false;
    const part = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, zz = 0) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, zz);
      mesh.castShadow = mesh.receiveShadow = true;
      g.add(mesh);
    };
    for (const s of [-1, 1]) part(0.42, 0.06, len, wood, s * 0.27, SEAT_Y - 0.03); // the seats
    part(0.08, 0.5, len, wood, 0, SEAT_Y + 0.25); // the shared back
    for (const e of [-1, 1]) part(0.7, SEAT_Y - 0.06, 0.08, dark, 0, (SEAT_Y - 0.06) / 2, e * (len / 2 - 0.08)); // ends
    c.rock.add(g);
    return { g, z };
  });

  let on = false;
  let seated: { k: number; side: number } | null = null;
  const seats = new Map<string, { k: number; side: number }>(); // remote peers sitting, by peer id

  // ---------------------------------------------------------------- the pose
  const v = new THREE.Vector3();
  // A sitter's body point in world space: on the car's rocking look, so they rock with the bench.
  const seatPoint = (c: WagonCar, side: number, z: number, out: THREE.Vector3) =>
    c.rock.localToWorld(out.set(side * SEAT_X, c.spec.top + SEAT_Y + PLAYER_R * 0.55, z));
  // Which way a sitter on `side` faces (avatar yaw: the avatar looks down its -z): straight out from the car.
  const facing = (c: WagonCar, side: number) => c.mesh.rotation.y - (side * Math.PI) / 2;
  // Seated: low and leaning back a little, no walk cycle (after animateAvatar, which sets these every frame).
  const sit = (avatar: THREE.Object3D) => {
    const inner = (avatar.userData as { inner?: THREE.Object3D }).inner;
    if (!inner) return;
    inner.position.y = -0.05;
    inner.rotation.x = 0.12;
    inner.scale.set(1.05, 0.86, 1.05);
  };
  const place = (avatar: THREE.Object3D, k: number, side: number) => {
    const c = ctx.cars[k],
      b = benches[k];
    if (!b) return;
    avatar.position.copy(seatPoint(c, side, b.z, v));
    avatar.rotation.y = facing(c, side);
    sit(avatar);
  };

  // ---------------------------------------------------------------- sitting down and standing up
  const cam0 = { p: new THREE.Vector3(), q: new THREE.Quaternion() }; // the camera when the blend began
  let blendIn = 0,
    blendOut = 0,
    pan = 0,
    tilt = 0,
    idle = 0,
    setYaw = 0,
    setPitch = 0,
    headY = NaN,
    going = 1; // the way the train runs, eased (+1 out, -1 back): the view swings across as it turns round
  function sitDown(k: number, side: number) {
    if (!me.body || seated) return;
    seated = { k, side };
    removeBody(me.body); // put on the seat each frame from now on
    cam0.p.copy(camera.position);
    cam0.q.copy(camera.quaternion);
    blendIn = reducedMotion ? 0 : EASE_IN_S;
    blendOut = 0;
    pan = tilt = idle = 0;
    headY = NaN;
    setYaw = NaN; // the seated view takes over cam.yaw on the next frame
    protoMark('sit');
    sendPresence();
  }
  function standUp() {
    if (!seated || !me.body) return;
    const c = ctx.cars[seated.k],
      b = benches[seated.k];
    // in front of your seat, on the deck, moving with it
    const p = c.rock.localToWorld(v.set(seated.side * 0.75, c.spec.top + PLAYER_R + 0.12, b ? b.z : 0));
    teleport(me.body, p.x, p.y, p.z);
    const bv = c.body.velocity;
    me.body.velocity.set(bv.x, 0, bv.z);
    carry.x = bv.x;
    carry.z = bv.z;
    addBody(me.body);
    seated = null;
    cam0.p.copy(camera.position);
    cam0.q.copy(camera.quaternion);
    blendOut = reducedMotion ? 0 : EASE_OUT_S;
    blendIn = 0;
    sendPresence();
  }

  // ---------------------------------------------------------------- the interact button
  const promptAt = new THREE.Vector3();
  registerInteractable((): Interactable[] => {
    if (!me.body) return NO_TARGETS;
    if (seated) {
      promptAt.copy(me.body.interpolatedPosition).setY(me.body.interpolatedPosition.y + 1.3);
      return [{ id: 'wagon-stand', verb: 'Stand up', at: promptAt, run: standUp }];
    }
    if (!on) return NO_TARGETS;
    const k = ctx.cars.findIndex((c) => carry.on === c.platform);
    const b = k > 0 ? benches[k] : null;
    if (!b) return NO_TARGETS;
    const c = ctx.cars[k];
    const l = c.mesh.worldToLocal(v.copy(me.body.interpolatedPosition)); // you in the car's frame
    if (Math.hypot(l.x, l.z - b.z) > REACH) return NO_TARGETS;
    const side = l.x >= 0 ? 1 : -1;
    seatPoint(c, side, b.z, promptAt).y += 0.7;
    return [{ id: `wagon-sit-${k}-${side}`, verb: 'Sit', at: promptAt, run: () => sitDown(k, side) }];
  });

  // ---------------------------------------------------------------- sync (Owner)
  addPresenceField('seat', () => (seated && me.entered ? [seated.k, seated.side] : null));
  onRemotePresence((r, pr) => {
    const s = pr.seat as unknown;
    const ok =
      r.entered &&
      Array.isArray(s) &&
      s.length === 2 &&
      Number.isInteger(s[0]) &&
      s[0] > 0 &&
      s[0] < ctx.cars.length &&
      (s[1] === 1 || s[1] === -1);
    if (ok) seats.set(r.peer, { k: s[0] as number, side: s[1] as number });
    else seats.delete(r.peer);
  });

  // ---------------------------------------------------------------- each frame: after the cars are drawn
  const head = new THREE.Vector3(),
    fwd = new THREE.Vector3(),
    want = new THREE.Vector3(),
    q = new THREE.Quaternion(),
    look = new THREE.Vector3(),
    m4 = new THREE.Matrix4(),
    UP = new THREE.Vector3(0, 1, 0);
  onFrame(
    ({ dt }) => {
      const w = ctx.state();
      if (seated && (!w || !me.entered || !me.body)) standUp();
      // benches show in the variant, or while anyone sits on one
      let shown = on || !!seated;
      for (const [peer, s] of seats) {
        const r = remotes.get(peer);
        if (!r?.avatar || !r.entered || !w) {
          seats.delete(peer);
          continue;
        }
        shown = true;
        place(r.avatar, s.k, s.side);
      }
      for (const b of benches) if (b) b.g.visible = shown;
      if (seated && me.body && me.avatar) {
        const { k, side } = seated;
        const c = ctx.cars[k],
          b = benches[k]!;
        if (me.jumpQueued > 0) {
          me.jumpQueued = 0;
          standUp();
          return;
        }
        const p = seatPoint(c, side, b.z, v);
        teleport(me.body, p.x, p.y, p.z);
        me.body.velocity.set(0, 0, 0);
        me.coyote = 0; // so the physics step leaves a queued jump for this hook
        me.yaw = facing(c, side);
        place(me.avatar, k, side);
        // The view: out over your shoulder, from the car's level frame (no roll, no dip), the height low-passed.
        c.mesh.localToWorld(head.set(side * SEAT_X, c.ground + c.spec.top + SEAT_Y + 0.9, b.z));
        headY = headY === headY ? headY + (head.y - headY) * (1 - Math.exp(-dt * 2 * Math.PI * CUTOFF_HZ)) : head.y;
        head.y = headY;
        if (w && Math.abs(w.speed) > 0.05) going += clamp(Math.sign(w.speed) - going, -dt * 0.7, dt * 0.7);
        const base = facing(c, side) - side * going * LEAD; // turned towards where the train goes
        // your looking around since the last frame pans the view, within PAN; idle, it eases back
        if (setYaw === setYaw) {
          const moved = wrap(cam.yaw - setYaw),
            tilted = cam.pitch - setPitch;
          if (Math.abs(moved) > 1e-4 || Math.abs(tilted) > 1e-4) idle = 0;
          pan = clamp(pan + moved, -PAN, PAN);
          tilt = clamp(tilt + tilted, -0.45, 0.35);
        }
        idle += dt;
        if (idle > IDLE_S) {
          const e = Math.exp(-dt * 1.6);
          pan *= e;
          tilt *= e;
        }
        cam.yaw = setYaw = base + pan;
        cam.pitch = setPitch = PITCH + tilt;
        const cp = Math.cos(cam.pitch);
        fwd.set(-Math.sin(cam.yaw) * cp, Math.sin(cam.pitch), -Math.cos(cam.yaw) * cp);
        want.copy(head).addScaledVector(fwd, -CAM_BACK);
        const yaw = c.mesh.rotation.y; // back along the train from where it's going
        want.x -= Math.sin(yaw) * going * CAM_SIDE;
        want.z -= Math.cos(yaw) * going * CAM_SIDE;
        want.y += CAM_UP;
        look.copy(want).addScaledVector(fwd, 10);
        look.y += AIM_UP - CAM_UP;
        m4.lookAt(want, look, UP);
        q.setFromRotationMatrix(m4);
        camera.position.copy(want);
        camera.quaternion.copy(q);
        if (blendIn > 0) {
          blendIn = Math.max(0, blendIn - dt);
          const u = 1 - blendIn / EASE_IN_S,
            e = u * u * (3 - 2 * u);
          camera.position.lerpVectors(cam0.p, want, e);
          camera.quaternion.copy(cam0.q).slerp(q, e);
        }
      } else if (blendOut > 0) {
        // back to the follow camera (already placed this frame), from where the seated view was
        blendOut = Math.max(0, blendOut - dt);
        const u = 1 - blendOut / EASE_OUT_S,
          e = u * u * (3 - 2 * u);
        want.copy(camera.position);
        q.copy(camera.quaternion);
        camera.position.lerpVectors(cam0.p, want, e);
        camera.quaternion.copy(cam0.q).slerp(q, e);
      }
    },
    { phase: 'update', order: 8 },
  );

  return {
    setOn(v: boolean) {
      on = v;
      if (!v) standUp();
    },
    get seated() {
      return seated;
    },
    /** For the look evals: sit on car k's bench, on `side`. */
    sit: (k: number, side: number) => sitDown(k, side),
    stand: standUp,
  };
}
