// The physics facade (docs/plans/rapier.md, step 1): the only module that imports a physics library. Today the backend
// is cannon-es; a Rapier backend comes next, behind ?physics=rapier. Game code builds bodies from plain shape
// descriptions and reads and writes the body fields both backends keep: position, velocity, angularVelocity, force,
// quaternion, interpolatedPosition (the pose to draw, between the last two fixed steps). Use only their x, y, z (w)
// and set(): cannon's vector methods (setZero, scale, vadd, ...) don't exist on the Rapier backend.
//
//   createBody({ mass, type, material, group, mask, response, position, rotation, shapes })   not yet in the world
//   setShapes(body, shapes)        replace its shapes (a growing mushroom); mass and bounds follow
//   setMotion(body, 'dynamic' | 'kinematic', response)   switch how it moves; kinematic stops it (response: pushes)
//   addBody(body), removeBody(body), teleport(body, x, y, z)
//   material(name), contactMaterial(a, b, { friction, restitution })
//   onPreStep(fn), onPostStep(fn)  around every fixed step, in registration order
//   stepPhysics(dt)                fixed 60 Hz steps for dt seconds (up to 4), main.js only
//   forEachContact(body, fn)       fn(nx, ny, nz, other) for each touching contact; normal points into `body`
//   raycastClosest(from, to, { mask, skipBackfaces }, hit)   true on a hit; hit.hitPointWorld, hit.hitNormalWorld
//   physicsTime()                  seconds of simulated time
import * as CANNON from 'cannon-es';
import { FIXED, GRAVITY } from '../constants.js';

export type V3 = { x: number; y: number; z: number };
export type Quat = { x: number; y: number; z: number; w: number };
type Placed = { offset?: V3; rotation?: Quat };
export type Shape = Placed &
  (
    | { kind: 'sphere'; r: number }
    | { kind: 'box'; hx: number; hy: number; hz: number }
    | { kind: 'cylinder'; rTop: number; rBottom: number; h: number; segments: number }
    | { kind: 'trimesh'; vertices: ArrayLike<number>; indices: ArrayLike<number> }
    // heights[i][j]: i steps +x, j steps -z, `cell` metres apart, from the body's position (the i = 0, j = 0 corner)
    | { kind: 'heightfield'; heights: number[][]; cell: number }
  );
export type Body = CANNON.Body;
export type Material = CANNON.Material;
export const BODY = { DYNAMIC: CANNON.Body.DYNAMIC, STATIC: CANNON.Body.STATIC, KINEMATIC: CANNON.Body.KINEMATIC };

const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -GRAVITY, 0) });
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = false;

const vec = (v?: V3) => (v ? new CANNON.Vec3(v.x, v.y, v.z) : undefined);
const quat = (q?: Quat) => (q ? new CANNON.Quaternion(q.x, q.y, q.z, q.w) : undefined);
function addShape(body: Body, s: Shape) {
  let shape: CANNON.Shape;
  if (s.kind === 'sphere') shape = new CANNON.Sphere(s.r);
  else if (s.kind === 'box') shape = new CANNON.Box(new CANNON.Vec3(s.hx, s.hy, s.hz));
  else if (s.kind === 'cylinder') shape = new CANNON.Cylinder(s.rTop, s.rBottom, s.h, s.segments);
  else if (s.kind === 'trimesh') shape = new CANNON.Trimesh(Array.from(s.vertices), Array.from(s.indices));
  else {
    // cannon's heightfield lies in its local x/y plane: turn the body so local y is world -z
    shape = new CANNON.Heightfield(s.heights, { elementSize: s.cell });
    body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  }
  body.addShape(shape, vec(s.offset), quat(s.rotation));
}

export type BodyOptions = {
  mass?: number;
  type?: CANNON.BodyType;
  material?: Material;
  group?: number;
  mask?: number;
  response?: boolean; // false: reports contacts, pushes nothing (a sensor)
  position?: V3;
  rotation?: Quat;
  shapes?: Shape[];
  fixedRotation?: boolean;
  linearDamping?: number;
  angularDamping?: number;
};
export function createBody(o: BodyOptions = {}): Body {
  const body = new CANNON.Body({
    mass: o.mass ?? 0,
    material: o.material,
    collisionFilterGroup: o.group,
    collisionFilterMask: o.mask,
    fixedRotation: o.fixedRotation,
    linearDamping: o.linearDamping,
    angularDamping: o.angularDamping,
  });
  if (o.type !== undefined) body.type = o.type;
  if (o.response === false) body.collisionResponse = false;
  if (o.position) body.position.set(o.position.x, o.position.y, o.position.z);
  if (o.rotation) body.quaternion.set(o.rotation.x, o.rotation.y, o.rotation.z, o.rotation.w);
  for (const s of o.shapes ?? []) addShape(body, s);
  return body;
}
export function setShapes(body: Body, shapes: Shape[]) {
  while (body.shapes.length) body.removeShape(body.shapes[0]);
  for (const s of shapes) addShape(body, s);
  body.updateMassProperties();
  body.aabbNeedsUpdate = true;
}
export function setMotion(body: Body, motion: 'dynamic' | 'kinematic', response = motion === 'dynamic') {
  body.type = motion === 'dynamic' ? CANNON.Body.DYNAMIC : CANNON.Body.KINEMATIC;
  body.collisionResponse = response;
  if (motion === 'kinematic') {
    body.velocity.set(0, 0, 0);
    body.angularVelocity.set(0, 0, 0);
  }
}
export const addBody = (body: Body) => world.addBody(body);
export const removeBody = (body: Body) => world.removeBody(body);
export function teleport(body: Body, x: number, y: number, z: number) {
  body.position.set(x, y, z);
  body.previousPosition.set(x, y, z);
  body.interpolatedPosition.set(x, y, z);
}

export const material = (name: string): Material => new CANNON.Material(name);
export function contactMaterial(a: Material, b: Material, o: { friction: number; restitution: number }) {
  world.addContactMaterial(new CANNON.ContactMaterial(a, b, o));
}

export const onPreStep = (fn: () => void) => world.addEventListener('preStep', fn);
export const onPostStep = (fn: () => void) => world.addEventListener('postStep', fn);
export const stepPhysics = (dt: number) => world.step(FIXED, dt, 4);
export const physicsTime = () => world.time;

// cannon's contact normal points from bi to bj; flip it so it points into `body`.
export function forEachContact(body: Body, fn: (nx: number, ny: number, nz: number, other: Body) => boolean | void) {
  for (const c of world.contacts) {
    if (!c.enabled || (c.bi !== body && c.bj !== body)) continue;
    const s = c.bi === body ? -1 : 1;
    if (fn(c.ni.x * s, c.ni.y * s, c.ni.z * s, c.bi === body ? c.bj : c.bi) === true) return;
  }
}

export type RayHit = CANNON.RaycastResult;
export const rayHit = (): RayHit => new CANNON.RaycastResult();
export function raycastClosest(from: V3, to: V3, o: { mask?: number; skipBackfaces?: boolean }, hit: RayHit) {
  hit.reset();
  return world.raycastClosest(
    from as CANNON.Vec3,
    to as CANNON.Vec3,
    { collisionFilterMask: o.mask, skipBackfaces: o.skipBackfaces },
    hit,
  );
}

// Until every module is on the facade (docs/plans/rapier.md, step 1): the cannon world itself. Remove with the last port.
export const legacyWorld = world;
