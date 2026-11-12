// Rapier backend of the physics facade (./engine.ts documents the API; docs/plans/done/rapier.md). Rapier's WASM loads with ready(); bodies made before that are kept as mirrors and built in Rapier once it is
// in. Each body is a mirror: game code writes position, velocity, force, quaternion on it in preStep hooks; every fixed
// step pushes those into Rapier, steps, and pulls the result back. A position or rotation that differs from what Rapier
// last reported was set by the game (a teleport, a ride) and is written through.
import type * as RAPIER from '@dimforge/rapier3d';
import { FIXED, GRAVITY } from '../constants.ts';
import { AssetDownloadError } from '../boot/asset-fetch.ts';
import type { Body, BodyKind, BodyOptions, Material, MaterialProps, RayHit, Shape, StepOpts, V3 } from './engine.ts';

type R = typeof RAPIER;
const PREDICTION_DISTANCE = 0.002; // m: solver envelope, also the bounded player-support allowance
const DEFAULT_STEP_ORDER = 1000; // past every pinned hook (src/loop.ts): prototypes and anything unnumbered run last
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
  previousRotation = new Quat();
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
const thinColliders = new Set<number>(); // handles, for sweepSphere
const THIN = 0.8; // m: half the width under which a shape counts as thin
const ZERO = { x: 0, y: 0, z: 0 },
  ONE = { x: 1, y: 1, z: 1 },
  IDENTITY = { x: 0, y: 0, z: 0, w: 1 };
// Across the ground: a tree's height doesn't make it wide, unless it's lying down (a rotated cylinder or box).
function isThin(s: Shape) {
  if (s.kind === 'sphere') return s.r < THIN;
  if (s.kind === 'box') return Math.max(s.hx, s.hz, s.rotation ? s.hy : 0) < THIN;
  if (s.kind === 'cylinder') return Math.max(s.rTop, s.rBottom, s.rotation ? s.h / 2 : 0) < THIN;
  return false;
}
type StepHook = { fn: () => void; order: number };
const pre: StepHook[] = [],
  post: StepHook[] = [];
let acc = 0,
  time = 0;

// Rapier's SIMD build steps about 1.4x faster (a 1024-body pile: 0.50 vs 0.70 ms a step in Chrome on an M-series Mac;
// docs/research/webgpu-on-ipad.md, recommendation 11). It needs WASM SIMD, which every WebGPU browser has (Safari since
// 16.4); if it fails to instantiate anyway, the plain build loads instead. Same version, same API.
const load = (): Promise<R> =>
  (import('@dimforge/rapier3d-simd') as Promise<unknown> as Promise<R>).catch((e) => {
    if (e instanceof AssetDownloadError) throw e; // another engine cannot fix an exhausted HTTP download
    console.warn('[physics] Rapier SIMD build failed to load, using the plain one:', e);
    return import('@dimforge/rapier3d');
  });

export function ready() {
  return load().then((mod) => {
    if (!mod?.World) throw new Error('Boogle could not load its physics engine. Please reload to try again.');
    R = mod;
    world = new R.World({ x: 0, y: -GRAVITY, z: 0 });
    world.timestep = FIXED;
    // Rapier 0.20's 20mm prediction lifts the player at plank seams, interrupting glide takeoffs and braking.
    // Retain the 0.19 envelope; current-pose contact queries below handle grounding independently.
    // Thin-wall stress checks and the tradeoff with upstream's wider margin: docs/research/rapier-021-upgrade.md.
    world.integrationParameters.normalizedPredictionDistance = PREDICTION_DISTANCE;
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
    nz = s.heights[0]!.length - 1;
  const data = new Float32Array((nx + 1) * (nz + 1));
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) data[nz - j + i * (nz + 1)] = s.heights[i]![j]!;
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
    // A kinematic body's shapes weigh nothing: its mass is put at its origin below (test/kinematic-turn.test.ts).
    else if (b.kind === 'kinematic') d.setDensity(0);
    const col = w.createCollider(d, rb);
    b.colliders.push(col);
    byCollider.set(col.handle, b);
    if (isThin(s)) thinColliders.add(col.handle);
  });
  // Rapier turns a body about its centre of mass, but every mover sets its velocity for its origin and the carry turns
  // riders about that (src/entities/railway/car.ts moveCar, src/physics/platforms.ts carryStep). A kinematic body is
  // never pushed, so its mass can be anything: put it all at the origin. Off-centre shapes (the engine's boiler and cab)
  // otherwise slid every rider sideways by that offset times each turn of the line.
  if (b.kind !== 'static')
    rb.setAdditionalMassProperties(
      b.kind === 'kinematic' ? 1 : 0,
      ZERO,
      b.kind === 'kinematic' ? ONE : ZERO,
      IDENTITY,
      false,
    );
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
  if (b.kind !== 'static') d.setCanSleep(false); // a woken body would skip a step
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
    thinColliders.delete(col.handle);
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
  b.previousRotation.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
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
export const setCcd = (body: Body, on: boolean) => void m(body).rb?.enableCcd(on);
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
  b.previousRotation.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
  b.interpolatedPosition.set(x, y, z);
}

// Rapier has no pair table: each collider carries its material's own friction and restitution, and a contact uses
// their product (CoefficientCombineRule.Multiply).
export const material = (name: string, props: MaterialProps): Material => ({ name, ...props }) as Mat;

// Lower order first, ties in registration order. Only registering allocates; a step walks the sorted list.
function addStepHook(list: StepHook[], fn: () => void, order: number) {
  let k = list.length;
  while (k > 0 && list[k - 1]!.order > order) k--;
  list.splice(k, 0, { fn, order });
}
export const onPreStep = (fn: () => void, { order = DEFAULT_STEP_ORDER }: StepOpts = {}) => addStepHook(pre, fn, order);
export const onPostStep = (fn: () => void, { order = DEFAULT_STEP_ORDER }: StepOpts = {}) =>
  addStepHook(post, fn, order);

function push(b: MBody) {
  const rb = b.rb!,
    p = b.position,
    q = b.quaternion,
    l = b.last;
  if (p.x !== l.x || p.y !== l.y || p.z !== l.z) rb.setTranslation(p, true);
  if (q.x !== l.qx || q.y !== l.qy || q.z !== l.qz || q.w !== l.qw) rb.setRotation(q, true);
  // After pre-step teleports/riding edits, before integration: actual f32 poses for contact timing.
  rb.translation(b.previousPosition);
  rb.rotation(b.previousRotation);
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
  for (const h of pre) h.fn();
  for (const b of bodies) if (b.rb) push(b);
  world.step();
  for (const b of bodies) if (b.rb) pull(b);
  time += FIXED;
  for (const h of post) h.fn();
}
let lastAlpha = 1;
function interpolate(alpha: number) {
  lastAlpha = alpha;
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
  if (acc >= FIXED) acc %= FIXED; // too far behind: drop the rest
  interpolate(acc / FIXED);
}
export function stepFixed() {
  step();
  interpolate(1);
}
export const physicsTime = () => time;
export const physicsClock = () => ({ time, acc });
export function setPhysicsClock(clock: { time: number; acc: number }) {
  time = clock.time;
  acc = clock.acc;
}
export const stepAlpha = () => lastAlpha;
export function forEachStatic(mask: number, fn: (body: Body, shapes: Shape[]) => void) {
  for (const b of bodies) if (b.kind === 'static' && b.group & mask) fn(b as unknown as Body, b.shapes);
}

// Rapier recycles manifold distances and anchors. Reproject each manifold at the current collider poses;
// one fresh pair normal loses simultaneous floor/wall support, while stale normals can ground a wall touch.
const contactPoint1 = new Vec(),
  contactPoint2 = new Vec(),
  contactPosition1 = new Vec(),
  contactPosition2 = new Vec(),
  contactRotation1 = new Quat(),
  contactRotation2 = new Quat(),
  contactNormal = new Vec();
const pairContact: RAPIER.ShapeContact = {
  distance: 0,
  point1: new Vec(),
  point2: new Vec(),
  normal1: new Vec(),
  normal2: new Vec(),
};
const startContactPosition = new Vec(),
  startContactRotation = new Quat(),
  startOtherPosition = new Vec(),
  startOtherRotation = new Quat(),
  startRotationDelta = new Quat();
function multiplyRotation(a: RAPIER.Rotation, b: RAPIER.Rotation, out: Quat) {
  out.set(
    a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  );
}
function touchingAtStepStart(own: RAPIER.Collider, collider: RAPIER.Collider, other: MBody) {
  const body = contactBody!,
    p = body.previousPosition,
    q = body.previousRotation,
    op = other.previousPosition,
    oq = other.previousRotation;
  // Move the small queried shape's old pose into the other body's current frame. This tests both old poses
  // without copying the terrain shape, moving a live collider, or needing a pair in the old narrow phase.
  own.translationWrtParent(startContactPosition);
  own.rotationWrtParent(startContactRotation);
  rotateContact(startContactPosition, q);
  startContactPosition.x += p.x - op.x;
  startContactPosition.y += p.y - op.y;
  startContactPosition.z += p.z - op.z;
  multiplyRotation(q, startContactRotation, startContactRotation);
  other.rb!.translation(startOtherPosition);
  other.rb!.rotation(startOtherRotation);
  startRotationDelta.set(-oq.x, -oq.y, -oq.z, oq.w);
  multiplyRotation(startOtherRotation, startRotationDelta, startRotationDelta);
  rotateContact(startContactPosition, startRotationDelta);
  startContactPosition.x += startOtherPosition.x;
  startContactPosition.y += startOtherPosition.y;
  startContactPosition.z += startOtherPosition.z;
  multiplyRotation(startRotationDelta, startContactRotation, startContactRotation);
  const contact = collider.contactShape(
    own.shape,
    startContactPosition,
    startContactRotation,
    contactSupportGap,
    pairContact,
  );
  return !!contact && contact.distance <= contactSupportGap;
}
let contactCast: { ray: RAPIER.Ray; hit: RAPIER.RayIntersection } | undefined;
function rotateContact(v: V3, q: RAPIER.Rotation) {
  const tx = 2 * (q.y * v.z - q.z * v.y),
    ty = 2 * (q.z * v.x - q.x * v.z),
    tz = 2 * (q.x * v.y - q.y * v.x);
  v.x += q.w * tx + q.y * tz - q.z * ty;
  v.y += q.w * ty + q.z * tx - q.x * tz;
  v.z += q.w * tz + q.x * ty - q.y * tx;
}
function touching(manifold: RAPIER.TempContactManifold, flipped: boolean) {
  const p1 = flipped ? contactPosition2 : contactPosition1,
    p2 = flipped ? contactPosition1 : contactPosition2,
    q1 = flipped ? contactRotation2 : contactRotation1,
    q2 = flipped ? contactRotation1 : contactRotation2;
  manifold.localNormal1(contactNormal);
  rotateContact(contactNormal, q1);
  for (let i = 0; i < manifold.numContacts(); i++) {
    if (!manifold.localContactPoint1(i, contactPoint1) || !manifold.localContactPoint2(i, contactPoint2)) continue;
    rotateContact(contactPoint1, q1);
    rotateContact(contactPoint2, q2);
    const gap =
      (contactPoint2.x + p2.x - contactPoint1.x - p1.x) * contactNormal.x +
      (contactPoint2.y + p2.y - contactPoint1.y - p1.y) * contactNormal.y +
      (contactPoint2.z + p2.z - contactPoint1.z - p1.z) * contactNormal.z;
    if (!(gap <= contactSupportGap)) continue;
    // Reprojection alone extends a finite face's plane past its edge. Validate this feature, not just the pair.
    // Strict contacts end on the anchor. Player support may extend by the solver envelope, never a stale plane.
    const lift = Math.max(0, -gap) + 0.001,
      length = lift + contactSupportGap,
      anchor = flipped ? contactPoint2 : contactPoint1,
      position = flipped ? p2 : p1,
      sign = flipped ? -1 : 1;
    contactCast ??= { ray: new R!.Ray(new Vec(), new Vec()), hit: new R!.RayIntersection(0, new Vec()) };
    const { ray, hit: target } = contactCast;
    const dir = ray.dir,
      origin = ray.origin;
    dir.x = contactNormal.x * sign;
    dir.y = contactNormal.y * sign;
    dir.z = contactNormal.z * sign;
    origin.x = anchor.x + position.x - dir.x * lift;
    origin.y = anchor.y + position.y - dir.y * lift;
    origin.z = anchor.z + position.z - dir.z * lift;
    const hit = contactOtherCollider!.castRayAndGetNormal(ray, length, false, target);
    if (!hit || hit.normal.x * dir.x + hit.normal.y * dir.y + hit.normal.z * dir.z >= 0) continue;
    contactNormal.set(-hit.normal.x * sign, -hit.normal.y * sign, -hit.normal.z * sign);
    return true;
  }
  return false;
}
// Reuse callbacks and transform buffers. Not reentrant: a `fn` can't call forEachContact.
type ContactFn = (nx: number, ny: number, nz: number, other: Body) => boolean | void;
let contactFn: ContactFn,
  contactBody: MBody | undefined,
  contactSinceStepStart = false,
  contactSupportGap = 0,
  contactCol = 0,
  contactOther: MBody | undefined,
  contactOtherCollider: RAPIER.Collider | undefined,
  contactDone = false;
function contactManifold(manifold: RAPIER.TempContactManifold, flipped: boolean) {
  if (contactDone || !touching(manifold, flipped)) return;
  const n = contactNormal,
    s = flipped ? 1 : -1;
  if (contactFn(n.x * s, n.y * s, n.z * s, contactOther as unknown as Body) === true) contactDone = true;
}
function contactPairWith(handle: number) {
  if (contactDone) return;
  const other = byCollider.get(handle);
  if (!other) return;
  const collider = world!.getCollider(handle);
  // Anchors alone extend a finite floor's plane past its edge. Require actual pair overlap as well.
  // Solver-contact counts/impulses cannot replace this: both can be zero on resting heightfield contacts.
  const own = world!.getCollider(contactCol);
  if (contactSinceStepStart && !touchingAtStepStart(own, collider, other)) return;
  const contact = own.contactCollider(collider, contactSupportGap, pairContact);
  if (!contact || contact.distance > contactSupportGap) return;
  // The fresh normal is already a valid contact. Only search cached manifolds if a caller needs another surface
  // (e.g. the floor behind a deeper wall contact). Starting with anchors alone can miss support while sliding.
  const fresh = contact.normal1;
  if (contactFn(-fresh.x, -fresh.y, -fresh.z, other as unknown as Body) === true) {
    contactDone = true;
    return;
  }
  const a = own.shapeType(),
    b = collider.shapeType();
  if (
    a !== R!.ShapeType.TriMesh &&
    a !== R!.ShapeType.HeightField &&
    b !== R!.ShapeType.TriMesh &&
    b !== R!.ShapeType.HeightField
  ) {
    // Convex pairs need no secondary manifold search.
    return;
  }
  contactOther = other;
  contactOtherCollider = collider;
  collider.translation(contactPosition2);
  collider.rotation(contactRotation2);
  world!.narrowPhase.contactPair(contactCol, handle, world!.bodies, contactManifold);
}
export function forEachContact(body: Body, fn: ContactFn, { sinceStepStart = false, support = false } = {}) {
  const b = m(body);
  if (!world) return;
  contactFn = fn;
  contactBody = b;
  contactSinceStepStart = sinceStepStart;
  contactSupportGap = support ? PREDICTION_DISTANCE : 0;
  contactDone = false;
  for (let k = 0; k < b.colliders.length && !contactDone; k++) {
    contactCol = b.colliders[k]!.handle;
    b.colliders[k]!.translation(contactPosition1);
    b.colliders[k]!.rotation(contactRotation1);
    world.narrowPhase.contactPairsWith(contactCol, contactPairWith);
  }
}

const isThinCollider = (handle: number) => thinColliders.has(handle),
  notThinCollider = (handle: number) => !thinColliders.has(handle);
// A camera sweeps twice a frame, and world.castShape makes four WASM objects a call, each registered for finalization, and
// a hit with four vectors. So this calls what's under it with the same arguments, on inputs it keeps (npm run hitches).
type RawVector = ReturnType<typeof RAPIER.VectorOps.intoRaw>;
type RawRotation = ReturnType<typeof RAPIER.RotationOps.intoRaw>;
type RawShape = ReturnType<RAPIER.Shape['intoRaw']>;
let sweep: { from: RawVector; by: RawVector; turn: RawRotation; r: number; ball: RawShape } | undefined;
const sweepHit = new Float32Array(16); // Rapier's scratch-buffer size; getComponents puts TOI at index 0.
export function sweepSphere(from: V3, to: V3, r: number, o: { mask: number; thin: 'skip' | 'only' }) {
  if (!R || !world) return -1;
  const dx = to.x - from.x,
    dy = to.y - from.y,
    dz = to.z - from.z;
  const len = Math.hypot(dx, dy, dz);
  if (len === 0) return -1;
  sweep ??= {
    from: R.VectorOps.intoRaw(from),
    by: R.VectorOps.intoRaw(from),
    turn: R.RotationOps.intoRaw({ x: 0, y: 0, z: 0, w: 1 }),
    r,
    ball: new R.Ball(r).intoRaw(),
  };
  if (sweep.r !== r) {
    sweep.ball.free();
    sweep.r = r;
    sweep.ball = new R.Ball(r).intoRaw();
  }
  sweep.from.x = from.x;
  sweep.from.y = from.y;
  sweep.from.z = from.z;
  sweep.by.x = dx;
  sweep.by.y = dy;
  sweep.by.z = dz;
  const filter = ((0xffff << 16) | (o.mask & 0xffff)) >>> 0;
  const flags =
    R.QueryFilterFlags.EXCLUDE_SENSORS | R.QueryFilterFlags.EXCLUDE_DYNAMIC | R.QueryFilterFlags.EXCLUDE_KINEMATIC;
  const only = o.thin === 'only' ? isThinCollider : notThinCollider;
  // 1 s at this velocity is the whole sweep. Not stopping at penetration: what it starts inside doesn't hold it.
  const h = world.broadPhase.raw.castShape(
    world.narrowPhase.raw,
    world.bodies.raw,
    world.colliders.raw,
    sweep.from,
    sweep.turn,
    sweep.by,
    sweep.ball,
    0,
    1,
    false,
    flags,
    filter,
    undefined,
    undefined,
    only,
  );
  if (!h) return -1;
  h.getComponents(sweepHit);
  const at = sweepHit[0]! * len;
  h.free();
  return at;
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
