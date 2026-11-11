// The stations trains stop at: a platform, a roof, a bench, a signal and a board. The owner asked "what is the platform", so
// they don't exist until there's a train to wait for: they drop into place, piece by piece, when trains come. You call a train
// by standing on one: the signal drops, a bell rings and the board says how long (no schedule to learn and no whims of a
// timetable; "controlling this is not really relevant yet", so nothing to operate either). Local.
import * as THREE from 'three/webgpu';
import { scene } from '../../render/scene.ts';
import { clank, thump } from '../../render/machine-sfx.ts';
import { flat } from '../../render/flat.ts';
import { box, place, type Box } from '../../render/boxes.ts';
import { label } from './label.ts';
import { forEachStatic, removeBody, teleport, type Body } from '../../physics/engine.ts';
import { GROUP } from '../../physics/physics.ts';
import { carry } from '../../physics/platforms.ts';
import { HEAD_OFFSET, PLAYER_R } from '../../constants.ts';
import { me } from '../../player/player.ts';
import { H, addStatic, slab } from '../../place/land.ts';
import { ORIGIN, lineAt, railY, type Line, type LinePoint } from '../../place/layout.ts';
import { boardMaterial } from '../../place/look.ts';
import { dropSet, dustRing } from '../../place/pieces.ts';
import { addFoot } from '../../place/sites.ts';

const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
const WOOD = '#a9794c',
  POST = '#7f5630',
  STONE = '#bdb8ac',
  ROOF = '#c4453a',
  IRON = '#3a3d44';
const lateral = (l: number, out: { x: number; z: number }) => {
  out.x = P.x - P.uz * l + ORIGIN.x;
  out.z = P.z + P.ux * l + ORIGIN.z;
  return out;
};
/** A platform along one side of `line`, `s0` to `s1` metres along, at `lat` from the rails, with a ramp off its side. */
function makeHalt(name: string, k: number, line: Line, s0: number, s1: number, lat: number, stop: number) {
  const boxes: Box[] = [];
  const mid = (s0 + s1) / 2,
    half = (s1 - s0) / 2,
    sign = Math.sign(lat);
  const low = Math.min(railY(line, s0), railY(line, s1)) + 0.72;
  lineAt(line, mid, P);
  const yaw = Math.atan2(P.ux, P.uz);
  const c = lateral(lat, { x: 0, z: 0 });
  const part = (
    dl: number,
    dy: number,
    ds: number,
    w: number,
    h: number,
    d: number,
    color: string,
    tilt?: THREE.Euler,
  ) => {
    // In the platform's own frame: +z along the line, +x across, y from the ground under its middle.
    const b = box(c.x, c.z, place(dl, dy, ds, w, h, d, yaw, tilt), color);
    b.y = low;
    boxes.push(b);
    return b;
  };
  const ground = H(c.x, c.z);
  // The deck, in lengths, with its edge stones.
  const lengths = Math.ceil((half * 2) / 6);
  for (let k = 0; k < lengths; k++) {
    const ds = -half + ((k + 0.5) * half * 2) / lengths;
    part(0, -0.5, ds, 2.5, 0.5, (half * 2) / lengths + 0.02, STONE);
  }
  for (const sl of [-1, 1]) part(sl * 1.1, -0.04, 0, 0.3, 0.05, half * 2, '#f2d36a'); // a bright edge: this is the place
  // Under it, down to the ground.
  part(0, ground - low, 0, 2.5, low - 0.5 - ground, half * 2, '#9a9184');
  // Local +sign x points toward the rails. Face the train from the outer edge,
  // along from the middle entrance so the rear ramp and the aisle stay clear.
  const post = 3.2,
    shelter = -4.8;
  for (const ds of [-3, 3]) part(-sign * 0.95, 0, shelter + ds, 0.22, post, 0.22, POST);
  part(-sign * 0.4, post, shelter, 2.4, 0.16, 8, WOOD);
  part(-sign * 0.4, post + 0.16, shelter, 2.7, 0.14, 8.4, ROOF);
  part(-sign * 0.75, 0, shelter - 1.2, 0.5, 0.42, 0.16, POST);
  part(-sign * 0.75, 0, shelter + 1.2, 0.5, 0.42, 0.16, POST);
  part(-sign * 0.75, 0.42, shelter, 0.56, 0.1, 3, WOOD);
  part(-sign * 1.02, 0.5, shelter, 0.1, 0.5, 3, WOOD);
  // The signal's mast, at the end the train comes in.
  part(sign * 0.95, 0, half - 0.8, 0.14, 4.4, 0.14, IRON);
  const set = dropSet(boxes, (k) => {
    const b = boxes[k]!;
    if (k % 3 === 0) thump(b.x, b.z);
    dustRing(b.x, low, b.z, 4, 1.4, 0.2);
  });
  set.mesh.material = boardMaterial(set.mesh.material as THREE.Material);
  boxes.forEach((_, k) => set.snap(k, false));
  // The arm, its own thing: up for nothing coming, down for a train on its way.
  const arm = new THREE.Group();
  const armBlade = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.05), flat('#e8392a'));
  armBlade.position.x = 0.5;
  arm.add(armBlade);
  {
    const cosY = Math.cos(yaw),
      sinY = Math.sin(yaw);
    const dl = sign * 0.95,
      ds = half - 0.8;
    arm.position.set(c.x + dl * cosY + ds * sinY, low + 4.2, c.z - dl * sinY + ds * cosY);
    arm.rotation.y = yaw + (sign > 0 ? 0 : Math.PI);
  }
  arm.visible = false;
  scene.add(arm);
  const board = label(3, 1.5);
  board.sprite.position.set(c.x, low + 5.2, c.z);
  board.sprite.visible = false;
  scene.add(board.sprite);

  let bodies: Body[] = [];
  const addBodies = () => {
    const cosY = Math.cos(yaw),
      sinY = Math.sin(yaw);
    const q = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
    const at = (dl: number, dy: number, ds: number) => ({
      x: c.x + dl * cosY + ds * sinY,
      y: low + dy,
      z: c.z - dl * sinY + ds * cosY,
    });
    bodies.push(addStatic({ kind: 'box', hx: 1.25, hy: 0.25, hz: half }, at(0, -0.25, 0), q));
    bodies.push(
      addStatic(
        { kind: 'box', hx: 1.25, hy: (low - 0.5 - ground) / 2 + 0.2, hz: half },
        at(0, (ground - low - 0.5) / 2, 0),
        q,
      ),
    );
    for (const ds of [-3, 3])
      bodies.push(
        addStatic({ kind: 'box', hx: 0.11, hy: post / 2, hz: 0.11 }, at(-sign * 0.95, post / 2, shelter + ds), q),
      );
    bodies.push(addStatic({ kind: 'box', hx: 0.3, hy: 0.28, hz: 1.5 }, at(-sign * 0.8, 0.28, shelter), q));
    bodies.push(addStatic({ kind: 'box', hx: 0.07, hy: 2.2, hz: 0.07 }, at(sign * 0.95, 2.2, half - 0.8), q));
    // Ramps: off each end, and off the back at the middle.
    const a = { x: 0, z: 0 },
      b = { x: 0, z: 0 };
    lineAt(line, s0, P);
    lateral(lat, a);
    lineAt(line, s0 - 6, P);
    lateral(lat, b);
    bodies.push(slab(b.x, b.z, a.x, a.z, H(b.x, b.z) + 0.05, low, 2.5, undefined, undefined, 'grass'));
    lineAt(line, s1, P);
    lateral(lat, a);
    lineAt(line, s1 + 6, P);
    lateral(lat, b);
    bodies.push(slab(b.x, b.z, a.x, a.z, H(b.x, b.z) + 0.05, low, 2.5, undefined, undefined, 'grass'));
    lineAt(line, mid, P);
    lateral(lat + sign * 1.25, a);
    lateral(lat + sign * 7, b);
    bodies.push(slab(b.x, b.z, a.x, a.z, H(b.x, b.z) + 0.05, low, 2.5, undefined, undefined, 'grass'));
    // A halt can arrive around someone, including a partner who did not fit the boiler. Rapier cannot
    // lift a sphere already trapped between the ground and a new ramp. Only displace actual overlaps,
    // testing in each box's frame so the pitched ramps and every halt's orientation are covered.
    const player = me.body;
    if (!player) return;
    let trapped = false;
    const local = new THREE.Vector3(),
      inverse = new THREE.Quaternion();
    forEachStatic(GROUP.SCENERY, (body, shapes) => {
      if (!bodies.includes(body)) return;
      inverse.copy(body.quaternion).invert();
      for (const up of [0, HEAD_OFFSET]) {
        local
          .set(player.position.x, player.position.y + up, player.position.z)
          .sub(body.position)
          .applyQuaternion(inverse);
        for (const shape of shapes) {
          if (shape.kind !== 'box') continue;
          const dx = Math.max(0, Math.abs(local.x) - shape.hx);
          const dy = Math.max(0, Math.abs(local.y) - shape.hy);
          const dz = Math.max(0, Math.abs(local.z) - shape.hz);
          if (dx * dx + dy * dy + dz * dz < (PLAYER_R - 0.01) ** 2) trapped = true;
        }
      }
    });
    if (trapped) {
      // The middle lane clears the bench, posts and signal; keep the player's place along the halt.
      const ds = Math.max(
        -half + PLAYER_R,
        Math.min(half - PLAYER_R, (player.position.x - c.x) * sinY + (player.position.z - c.z) * cosY),
      );
      teleport(player, c.x + ds * sinY, Math.max(player.position.y, low + PLAYER_R + 0.05), c.z + ds * cosY);
      player.velocity.set(0, 0, 0);
      carry.on = null;
      carry.x = carry.y = carry.z = 0;
    }
  };
  // Drawn ramps, one mesh each: they're long, plain and don't change.
  const ramps = new THREE.Group();
  const rampMesh = (ax: number, az: number, bx: number, bz: number, ya: number, yb: number) => {
    const dx = bx - ax,
      dz = bz - az,
      len = Math.hypot(dx, dz),
      dy = yb - ya,
      full = Math.hypot(len, dy);
    const m = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.4, full), flat(STONE));
    m.quaternion.setFromEuler(new THREE.Euler(-Math.atan2(dy, len), Math.atan2(dx, dz), 0, 'YXZ'));
    m.position.set((ax + bx) / 2, (ya + yb) / 2 - 0.2, (az + bz) / 2);
    m.castShadow = m.receiveShadow = true;
    ramps.add(m);
  };
  {
    const a = { x: 0, z: 0 },
      b = { x: 0, z: 0 };
    lineAt(line, s0, P);
    lateral(lat, a);
    lineAt(line, s0 - 6, P);
    lateral(lat, b);
    rampMesh(b.x, b.z, a.x, a.z, H(b.x, b.z) + 0.05, low);
    lineAt(line, s1, P);
    lateral(lat, a);
    lineAt(line, s1 + 6, P);
    lateral(lat, b);
    rampMesh(b.x, b.z, a.x, a.z, H(b.x, b.z) + 0.05, low);
    lineAt(line, mid, P);
    lateral(lat + sign * 1.25, a);
    lateral(lat + sign * 7, b);
    rampMesh(b.x, b.z, a.x, a.z, H(b.x, b.z) + 0.05, low);
    lineAt(line, mid, P);
  }
  ramps.visible = false;
  scene.add(ramps);
  addFoot(c.x, c.z, yaw, 1.4, half + 0.3);

  const halt = {
    name,
    k,
    stop,
    x: c.x,
    y: low,
    z: c.z,
    up: false,
    calling: false,
    /** It's built: down the pieces come. */
    build(delay = 0) {
      if (halt.up) return;
      halt.up = true;
      boxes.forEach((_, k) => set.drop(k, 3.4, delay + k * 0.05));
      setTimeout(() => (ramps.visible = arm.visible = true), (delay + boxes.length * 0.05) * 1000);
      addBodies();
    },
    snap(on: boolean) {
      for (const b of bodies) removeBody(b);
      bodies = [];
      halt.up = on;
      boxes.forEach((_, k) => set.snap(k, on));
      ramps.visible = arm.visible = on;
      board.sprite.visible = false;
      if (on) addBodies();
    },
    /** A body at (x, y, z) stands on it; margin retains an already occupied halt through edge jitter. */
    onIt(x: number, y: number, z: number, margin = 0) {
      if (!halt.up) return false;
      const dx = x - c.x,
        dz = z - c.z;
      const cosY = Math.cos(yaw),
        sinY = Math.sin(yaw);
      const l = dx * cosY - dz * sinY,
        s = dx * sinY + dz * cosY;
      return Math.abs(l) < 1.6 + margin && Math.abs(s) < half + 0.4 + margin && Math.abs(y - low) < 1.6 + margin;
    },
    /** The signal and the board, for a train on its way in `eta` s; null for nothing coming. */
    signal(eta: number | null) {
      const on = eta !== null;
      if (on && !halt.calling) clank(c.x, c.z);
      halt.calling = on;
      arm.rotation.z = on ? -0.75 : 0;
      board.sprite.visible = on && eta! > 0;
      if (on && eta! > 0) board.set(`${eta} s`);
    },
    update: (dt: number) => set.update(dt),
  };
  return halt;
}
export const halts: ReturnType<typeof makeHalt>[] = [];
export function buildHalt(...a: Parameters<typeof makeHalt>) {
  const h = makeHalt(...a);
  halts.push(h);
  return h;
}
