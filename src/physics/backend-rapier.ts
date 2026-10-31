// Rapier backend of the physics facade (./engine.ts documents the API), chosen with ?physics=rapier (docs/plans/rapier.md,
// step 2). Rapier's WASM loads with ready(); bodies made before that are kept as mirrors and built in Rapier once it is
// in. Each body is a mirror: game code writes position, velocity, force, quaternion on it in preStep hooks; every fixed
// step pushes those into Rapier, steps, and pulls the result back. A position or rotation that differs from what Rapier
// last reported was set by the game (a teleport, a ride) and is written through.
import type * as RAPIER from '@dimforge/rapier3d';
import { FIXED, GRAVITY } from '../constants.js';
import type { Body, BodyKind, BodyOptions, Material, MaterialProps, RayHit, Shape, V3 } from './engine.ts';

type R = typeof RAPIER;
class Vec {
  x = 0;
  y = 0;
  z = 0;
  set(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
}
class Quat {
  x = 0;
  y = 0;
  z = 0;
  w = 1;
  set(x: number, y: number, z: number, w: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }
}
type Mat = Material & MaterialProps;
class MBody {
  position = new Vec();
  velocity = new Vec();
  angularVelocity = new Vec();
  force = new Vec();
  quaternion = new Quat();
  interpolatedPosition = new Vec();
  previousPosition = new Vec();
  last = { x: 0, y: 0, z: 0, qx: 0, qy: 0, qz: 0, qw: 1 }; // the pose Rapier last reported
  kind: BodyKind = 'static';
  mass = 0;
  material: Mat | null = null;
  group = 1;
  mask = -1;
  response = true;
  shapes: Shape[] = [];
  fixedRotation = false;
  linearDamping = 0.01;
  angularDamping = 0.01;
  inWorld = false;
  rb: RAPIER.RigidBody | null = null;
  colliders: RAPIER.Collider[] = [];
}
const m = (body: Body) => body as unknown as MBody;

let R: R | null = null;
let world: RAPIER.World | null = null;
const bodies = new Set<MBody>(); // in the world
const byCollider = new Map<number, MBody>();
const pre: (() => void)[] = [],
  post: (() => void)[] = [];
let acc = 0,
  time = 0;

export function ready() {
  return import('@dimforge/rapier3d').then((mod) => {
    R = mod;
    world = new R.World({ x: 0, y: -GRAVITY, z: 0 });
    world.timestep = FIXED;
    for (const b of bodies) build(b);
  });
}

const groups = (b: MBody) => (((b.group & 0xffff) << 16) | (b.mask & 0xffff)) >>> 0;
function colliderDesc(s: Shape): RAPIER.ColliderDesc | null {
  const r = R!;
  if (s.kind === 'sphere') return r.ColliderDesc.ball(s.r);
  if (s.kind === 'box') return r.ColliderDesc.cuboid(s.hx, s.hy, s.hz);
  if (s.kind === 'cylinder') {
    if (s.rTop === s.rBottom) return r.ColliderDesc.cylinder(s.h / 2, s.rTop);
    const pts = new Float32Array(s.segments * 6);
    for (let k = 0; k < s.segments; k++) {
      const a = (k / s.segments) * Math.PI * 2,
        cx = Math.cos(a),
        sz = Math.sin(a);
      pts.set([cx * s.rBottom, -s.h / 2, sz * s.rBottom, cx * s.rTop, s.h / 2, sz * s.rTop], k * 6);
    }
    return r.ColliderDesc.convexHull(pts);
  }
  if (s.kind === 'trimesh')
    // Merged vertices let Rapier fix contacts on internal edges, where a ball sliding along a wall would otherwise slip
    // through between two triangles.
    return r.ColliderDesc.trimesh(
      Float32Array.from(s.vertices),
      Uint32Array.from(s.indices),
      r.TriMeshFlags.FIX_INTERNAL_EDGES | r.TriMeshFlags.MERGE_DUPLICATE_VERTICES,
    );
  // Rapier's heightfield is centred on its collider, rows along +z, columns along +x, column-major.
  const nx = s.heights.length - 1,
    nz = s.heights[0].length - 1;
  const data = new Float32Array((nx + 1) * (nz + 1));
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) data[nz - j + i * (nz + 1)] = s.heights[i][j];
  return r.ColliderDesc.heightfield(nz, nx, data, { x: nx * s.cell, y: 1, z: nz * s.cell }).setTranslation(
    (nx * s.cell) / 2,
    0,
    (-nz * s.cell) / 2,
  );
}
function buildColliders(b: MBody) {
  const r = R!,
    w = world!,
    rb = b.rb!;
  b.shapes.forEach((s, k) => {
    const d = colliderDesc(s);
    if (!d) return;
    if (s.offset && s.kind !== 'heightfield') d.setTranslation(s.offset.x, s.offset.y, s.offset.z);
    if (s.rotation) d.setRotation(s.rotation);
    const mat = b.material;
    d.setFriction(mat?.friction ?? 0.5).setRestitution(mat?.restitution ?? 0);
    d.setFrictionCombineRule(r.CoefficientCombineRule.Multiply);
    d.setRestitutionCombineRule(r.CoefficientCombineRule.Multiply);
    d.setCollisionGroups(groups(b)).setSensor(!b.response);
    if (b.kind === 'dynamic') d.setMass(k === 0 ? b.mass : 0);
    const col = w.createCollider(d, rb);
    b.colliders.push(col);
    byCollider.set(col.handle, b);
  });
}
function rbType(kind: BodyKind) {
  const t = R!.RigidBodyType;
  return kind === 'dynamic' ? t.Dynamic : kind === 'kinematic' ? t.KinematicVelocityBased : t.Fixed;
}
function build(b: MBody) {
  if (!R || !world || !b.inWorld || b.rb) return;
  const d = new R.RigidBodyDesc(rbType(b.kind))
    .setTranslation(b.position.x, b.position.y, b.position.z)
    .setRotation(b.quaternion)
    .setLinearDamping(b.linearDamping)
    .setAngularDamping(b.angularDamping);
  if (b.kind !== 'static') d.setCanSleep(false); // like cannon's allowSleep = false: a woken body skips a step
  if (b.kind === 'dynamic') d.setCcdEnabled(true);
  if (b.fixedRotation) d.lockRotations();
  b.rb = world.createRigidBody(d);
  buildColliders(b);
  remember(b);
}
function remember(b: MBody) {
  const l = b.last,
    p = b.position,
    q = b.quaternion;
  l.x = p.x;
  l.y = p.y;
  l.z = p.z;
  l.qx = q.x;
  l.qy = q.y;
  l.qz = q.z;
  l.qw = q.w;
}
function dropColliders(b: MBody) {
  for (const col of b.colliders) {
    byCollider.delete(col.handle);
    world!.removeCollider(col, false);
  }
  b.colliders = [];
}

export function createBody(o: BodyOptions = {}): Body {
  const b = new MBody();
  b.mass = o.mass ?? 0;
  b.kind = o.type ?? (b.mass > 0 ? 'dynamic' : 'static');
  b.material = (o.material as Mat | undefined) ?? null;
  b.group = o.group ?? 1;
  b.mask = o.mask ?? -1;
  b.response = o.response !== false;
  b.shapes = o.shapes ?? [];
  b.fixedRotation = !!o.fixedRotation;
  b.linearDamping = o.linearDamping ?? 0.01;
  b.angularDamping = o.angularDamping ?? 0.01;
  if (o.position) b.position.set(o.position.x, o.position.y, o.position.z);
  if (o.rotation) b.quaternion.set(o.rotation.x, o.rotation.y, o.rotation.z, o.rotation.w);
  b.previousPosition.set(b.position.x, b.position.y, b.position.z);
  b.interpolatedPosition.set(b.position.x, b.position.y, b.position.z);
  return b as unknown as Body;
}
export function setShapes(body: Body, shapes: Shape[]) {
  const b = m(body);
  b.shapes = shapes;
  if (!b.rb) return;
  dropColliders(b);
  buildColliders(b);
}
export function setMotion(body: Body, motion: 'dynamic' | 'kinematic', response = motion === 'dynamic', mass?: number) {
  const b = m(body);
  b.kind = motion;
  b.response = response;
  if (mass !== undefined) b.mass = mass;
  if (motion === 'kinematic') {
    b.velocity.set(0, 0, 0);
    b.angularVelocity.set(0, 0, 0);
  }
  if (!b.rb) return;
  b.rb.setBodyType(rbType(motion), true);
  b.rb.enableCcd(motion === 'dynamic');
  dropColliders(b); // sensor flag and mass live on the colliders
  buildColliders(b);
}
export const getMask = (body: Body) => m(body).mask;
export function setMask(body: Body, mask: number) {
  const b = m(body);
  b.mask = mask;
  for (const col of b.colliders) col.setCollisionGroups(groups(b));
}
export function addBody(body: Body) {
  const b = m(body);
  b.inWorld = true;
  bodies.add(b);
  build(b);
}
export function removeBody(body: Body) {
  const b = m(body);
  b.inWorld = false;
  bodies.delete(b);
  if (!b.rb) return;
  for (const col of b.colliders) byCollider.delete(col.handle);
  world!.removeRigidBody(b.rb);
  b.rb = null;
  b.colliders = [];
}
export function teleport(body: Body, x: number, y: number, z: number) {
  const b = m(body);
  b.position.set(x, y, z);
  b.previousPosition.set(x, y, z);
  b.interpolatedPosition.set(x, y, z);
}

// Rapier has no pair table: each collider carries its material's own friction and restitution, and a contact uses
// their product (CoefficientCombineRule.Multiply). The pair table only serves cannon.
export const material = (name: string, props: MaterialProps): Material => ({ name, ...props }) as Mat;
export function contactMaterial() {}

export const onPreStep = (fn: () => void) => void pre.push(fn);
export const onPostStep = (fn: () => void) => void post.push(fn);

function push(b: MBody) {
  const rb = b.rb!,
    p = b.position,
    q = b.quaternion,
    l = b.last;
  if (p.x !== l.x || p.y !== l.y || p.z !== l.z) rb.setTranslation(p, true);
  if (q.x !== l.qx || q.y !== l.qy || q.z !== l.qz || q.w !== l.qw) rb.setRotation(q, true);
  if (b.kind === 'static') return;
  rb.setLinvel(b.velocity, true);
  rb.setAngvel(b.angularVelocity, true);
  if (b.kind === 'dynamic') {
    rb.resetForces(true);
    rb.addForce(b.force, true);
  }
}
function pull(b: MBody) {
  const rb = b.rb!;
  b.previousPosition.set(b.position.x, b.position.y, b.position.z);
  if (b.kind === 'static') return;
  const t = rb.translation(),
    r = rb.rotation(),
    v = rb.linvel(),
    w = rb.angvel();
  b.position.set(t.x, t.y, t.z);
  b.quaternion.set(r.x, r.y, r.z, r.w);
  b.velocity.set(v.x, v.y, v.z);
  b.angularVelocity.set(w.x, w.y, w.z);
  b.force.set(0, 0, 0);
  remember(b);
}
function step() {
  if (!world) return;
  for (const fn of pre) fn();
  for (const b of bodies) if (b.rb) push(b);
  world.step();
  for (const b of bodies) if (b.rb) pull(b);
  time += FIXED;
  for (const fn of post) fn();
}
function interpolate(alpha: number) {
  for (const b of bodies) {
    const a = b.previousPosition,
      p = b.position;
    b.interpolatedPosition.set(a.x + (p.x - a.x) * alpha, a.y + (p.y - a.y) * alpha, a.z + (p.z - a.z) * alpha);
  }
}
export function stepPhysics(dt: number) {
  acc += dt;
  let n = 0;
  while (acc >= FIXED && n < 4) {
    step();
    acc -= FIXED;
    n++;
  }
  if (acc >= FIXED) acc %= FIXED; // too far behind: drop the rest, like cannon's maxSubSteps
  interpolate(acc / FIXED);
}
export function stepFixed() {
  step();
  interpolate(1);
}
export const physicsTime = () => time;
export function forEachStatic(mask: number, fn: (body: Body, shapes: Shape[]) => void) {
  for (const b of bodies) if (b.kind === 'static' && b.group & mask) fn(b as unknown as Body, b.shapes);
}

// Rapier also keeps speculative contacts a little before shapes meet; cannon reports only touching ones, and game code
// (the mushroom bounce, ground checks) expects that.
function touching(manifold: RAPIER.TempContactManifold) {
  for (let i = 0; i < manifold.numContacts(); i++) if (manifold.contactDist(i) <= 0.005) return true;
  return false;
}
// A manifold's normal points from its first collider to its second; flip it so it points into `body`.
export function forEachContact(body: Body, fn: (nx: number, ny: number, nz: number, other: Body) => boolean | void) {
  const b = m(body);
  if (!world) return;
  let done = false;
  for (const col of b.colliders) {
    world.contactPairsWith(col, (col2) => {
      if (done) return;
      const other = byCollider.get(col2.handle);
      if (!other) return;
      world!.contactPair(col, col2, (manifold, flipped) => {
        if (done || !touching(manifold)) return;
        const n = manifold.normal(),
          s = flipped ? 1 : -1;
        if (fn(n.x * s, n.y * s, n.z * s, other as unknown as Body) === true) done = true;
      });
    });
    if (done) return;
  }
}

export const rayHit = (): RayHit => ({
  hasHit: false,
  distance: 0,
  hitPointWorld: { x: 0, y: 0, z: 0 },
  hitNormalWorld: { x: 0, y: 0, z: 0 },
});
export function raycastClosest(from: V3, to: V3, o: { mask?: number; skipBackfaces?: boolean }, hit: RayHit) {
  hit.hasHit = false;
  if (!R || !world) return false;
  const dx = to.x - from.x,
    dy = to.y - from.y,
    dz = to.z - from.z,
    len = Math.hypot(dx, dy, dz);
  if (len === 0) return false;
  const ray = new R.Ray(from, { x: dx / len, y: dy / len, z: dz / len });
  const filter = ((0xffff << 16) | ((o.mask ?? -1) & 0xffff)) >>> 0;
  const h = world.castRayAndGetNormal(ray, len, true, R.QueryFilterFlags.EXCLUDE_SENSORS, filter);
  if (!h) return false;
  const t = h.timeOfImpact;
  hit.hasHit = true;
  hit.distance = t;
  hit.hitPointWorld.x = from.x + (dx / len) * t;
  hit.hitPointWorld.y = from.y + (dy / len) * t;
  hit.hitPointWorld.z = from.z + (dz / len) * t;
  hit.hitNormalWorld.x = h.normal.x;
  hit.hitNormalWorld.y = h.normal.y;
  hit.hitNormalWorld.z = h.normal.z;
  return true;
}
