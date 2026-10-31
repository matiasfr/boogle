// cannon-es backend of the physics facade (./engine.ts, which documents the API). The default backend.
import * as CANNON from 'cannon-es';
import { FIXED, GRAVITY } from '../constants.js';
import type { Body, BodyKind, BodyOptions, Material, MaterialProps, Quat, RayHit, Shape, V3 } from './engine.ts';

type CBody = CANNON.Body;
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -GRAVITY, 0) });
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = false;

export const ready = () => Promise.resolve();
const TYPE = { dynamic: CANNON.Body.DYNAMIC, static: CANNON.Body.STATIC, kinematic: CANNON.Body.KINEMATIC };
const c = (body: Body) => body as unknown as CBody;

const shapesOf = new WeakMap<CBody, Shape[]>(); // the descriptions each body was built from
const vec = (v?: V3) => (v ? new CANNON.Vec3(v.x, v.y, v.z) : undefined);
const quat = (q?: Quat) => (q ? new CANNON.Quaternion(q.x, q.y, q.z, q.w) : undefined);
function addShape(body: CBody, s: Shape) {
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

export function createBody(o: BodyOptions = {}): Body {
  const body = new CANNON.Body({
    mass: o.mass ?? 0,
    material: o.material as CANNON.Material | undefined,
    collisionFilterGroup: o.group,
    collisionFilterMask: o.mask,
    fixedRotation: o.fixedRotation,
    linearDamping: o.linearDamping,
    angularDamping: o.angularDamping,
  });
  if (o.type !== undefined) body.type = TYPE[o.type as BodyKind];
  if (o.response === false) body.collisionResponse = false;
  if (o.position) body.position.set(o.position.x, o.position.y, o.position.z);
  if (o.rotation) body.quaternion.set(o.rotation.x, o.rotation.y, o.rotation.z, o.rotation.w);
  for (const s of o.shapes ?? []) addShape(body, s);
  shapesOf.set(body, o.shapes ?? []);
  return body;
}
export function setShapes(body: Body, shapes: Shape[]) {
  const b = c(body);
  while (b.shapes.length) b.removeShape(b.shapes[0]);
  for (const s of shapes) addShape(b, s);
  shapesOf.set(b, shapes);
  b.updateMassProperties();
  b.aabbNeedsUpdate = true;
}
export function setMotion(body: Body, motion: 'dynamic' | 'kinematic', response = motion === 'dynamic', mass?: number) {
  const b = c(body);
  b.type = TYPE[motion];
  b.collisionResponse = response;
  if (mass !== undefined) {
    b.mass = mass;
    b.updateMassProperties();
  }
  if (motion === 'kinematic') {
    b.velocity.set(0, 0, 0);
    b.angularVelocity.set(0, 0, 0);
  }
}
export const getMask = (body: Body) => c(body).collisionFilterMask;
export function setMask(body: Body, mask: number) {
  c(body).collisionFilterMask = mask;
}
export const addBody = (body: Body) => world.addBody(c(body));
export const removeBody = (body: Body) => world.removeBody(c(body));
export function teleport(body: Body, x: number, y: number, z: number) {
  const b = c(body);
  b.position.set(x, y, z);
  b.previousPosition.set(x, y, z);
  b.interpolatedPosition.set(x, y, z);
}

// cannon uses the pair table; a material's own values only matter to Rapier.
export const material = (name: string): Material => new CANNON.Material(name) as Material;
export function contactMaterial(a: Material, b: Material, o: MaterialProps) {
  world.addContactMaterial(new CANNON.ContactMaterial(a as CANNON.Material, b as CANNON.Material, o));
}

export const onPreStep = (fn: () => void) => world.addEventListener('preStep', fn);
export const onPostStep = (fn: () => void) => world.addEventListener('postStep', fn);
export const stepPhysics = (dt: number) => world.step(FIXED, dt, 4);
export const stepFixed = () => world.step(FIXED);
export const physicsTime = () => world.time;
export function forEachStatic(mask: number, fn: (body: Body, shapes: Shape[]) => void) {
  for (const body of world.bodies)
    if (body.type === CANNON.Body.STATIC && body.collisionFilterGroup & mask) fn(body, shapesOf.get(body) ?? []);
}

// cannon's contact normal points from bi to bj; flip it so it points into `body`.
export function forEachContact(body: Body, fn: (nx: number, ny: number, nz: number, other: Body) => boolean | void) {
  for (const k of world.contacts) {
    if (!k.enabled || (k.bi !== body && k.bj !== body)) continue;
    const s = k.bi === body ? -1 : 1;
    if (fn(k.ni.x * s, k.ni.y * s, k.ni.z * s, k.bi === body ? k.bj : k.bi) === true) return;
  }
}

export const rayHit = (): RayHit => new CANNON.RaycastResult();
export function raycastClosest(from: V3, to: V3, o: { mask?: number; skipBackfaces?: boolean }, hit: RayHit) {
  const h = hit as CANNON.RaycastResult;
  h.reset();
  return world.raycastClosest(
    from as CANNON.Vec3,
    to as CANNON.Vec3,
    { collisionFilterMask: o.mask, skipBackfaces: o.skipBackfaces },
    h,
  );
}
