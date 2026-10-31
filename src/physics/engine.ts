// The physics facade (docs/plans/rapier.md): the only door to a physics library. Game code builds bodies from plain
// shape descriptions and reads and writes the body fields every backend keeps: position, velocity, angularVelocity,
// force, quaternion, interpolatedPosition (the pose to draw, between the last two fixed steps). Use only their x, y, z
// (w) and set(): no backend's own vector methods.
//
// Backends: cannon-es (./backend-cannon.ts, the default) and Rapier (./backend-rapier.ts, `?physics=rapier`, step 2 of
// the plan). `physicsReady` resolves once the backend can step (Rapier loads its WASM first); main.js waits for it.
//
//   createBody({ mass, type, material, group, mask, response, position, rotation, shapes })   not yet in the world
//   setShapes(body, shapes)        replace its shapes (a growing mushroom); mass and bounds follow
//   getMask(body), setMask(body, mask)   which collision groups it collides with (the caves swap them)
//   setMotion(body, 'dynamic' | 'kinematic', response, mass)   switch how it moves; kinematic stops it (response:
//                                  pushes; mass: set it too)
//   addBody(body), removeBody(body), teleport(body, x, y, z)
//   material(name, { friction, restitution }), contactMaterial(a, b, { friction, restitution })   cannon uses the pair
//                                  table; Rapier multiplies the two materials' own values
//   onPreStep(fn), onPostStep(fn)  around every fixed step, in registration order
//   stepPhysics(dt)                fixed 60 Hz steps for dt seconds (up to 4), main.js only
//   stepFixed()                    exactly one fixed step, hooks included (scenarios that drive physics by hand)
//   forEachContact(body, fn)       fn(nx, ny, nz, other) for each touching contact; normal points into `body`
//   raycastClosest(from, to, { mask, skipBackfaces }, hit)   true on a hit; hit.distance, hitPointWorld, hitNormalWorld
//   physicsTime()                  seconds of simulated time
//   forEachStatic(mask, fn)        fn(body, shapes) for each static body in a group of `mask`, with the shapes it was
//                                  built from (src/guest/collision.js triangulates them; heightfields included)
import * as cannon from './backend-cannon.ts';
import * as rapier from './backend-rapier.ts';

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
type Vec = V3 & { set(x: number, y: number, z: number): unknown };
export type Body = {
  position: Vec;
  velocity: Vec;
  angularVelocity: Vec;
  force: Vec;
  quaternion: Quat & { set(x: number, y: number, z: number, w: number): unknown };
  interpolatedPosition: Vec;
};
export type BodyKind = 'dynamic' | 'static' | 'kinematic';
export const BODY = { DYNAMIC: 'dynamic', STATIC: 'static', KINEMATIC: 'kinematic' } as const;
export type Material = { name: string };
export type MaterialProps = { friction: number; restitution: number };
export type BodyOptions = {
  mass?: number;
  type?: BodyKind; // default: dynamic with a mass, static without
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
export type RayHit = { hasHit: boolean; distance: number; hitPointWorld: V3; hitNormalWorld: V3 };

const backend = new URLSearchParams(globalThis.location?.search ?? '').get('physics') === 'rapier' ? rapier : cannon;
export const physicsBackend = backend === rapier ? 'rapier' : 'cannon';
export const physicsReady: Promise<void> = backend.ready();

export const createBody: (o?: BodyOptions) => Body = backend.createBody;
export const setShapes: (body: Body, shapes: Shape[]) => void = backend.setShapes;
export const setMotion: (body: Body, motion: 'dynamic' | 'kinematic', response?: boolean, mass?: number) => void =
  backend.setMotion;
export const getMask: (body: Body) => number = backend.getMask;
export const setMask: (body: Body, mask: number) => void = backend.setMask;
export const addBody: (body: Body) => void = backend.addBody;
export const removeBody: (body: Body) => void = backend.removeBody;
export const teleport: (body: Body, x: number, y: number, z: number) => void = backend.teleport;
export const material: (name: string, props: MaterialProps) => Material = backend.material;
export const contactMaterial: (a: Material, b: Material, o: MaterialProps) => void = backend.contactMaterial;
export const onPreStep: (fn: () => void) => void = backend.onPreStep;
export const onPostStep: (fn: () => void) => void = backend.onPostStep;
export const stepPhysics: (dt: number) => void = backend.stepPhysics;
export const stepFixed: () => void = backend.stepFixed;
export const physicsTime: () => number = backend.physicsTime;
export const forEachStatic: (mask: number, fn: (body: Body, shapes: Shape[]) => void) => void = backend.forEachStatic;
export const forEachContact: (
  body: Body,
  fn: (nx: number, ny: number, nz: number, other: Body) => boolean | void,
) => void = backend.forEachContact;
export const rayHit: () => RayHit = backend.rayHit;
export const raycastClosest: (from: V3, to: V3, o: { mask?: number; skipBackfaces?: boolean }, hit: RayHit) => boolean =
  backend.raycastClosest;
