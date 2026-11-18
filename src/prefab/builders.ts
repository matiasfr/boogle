import type { Object3D, InstancedMesh, BufferGeometry, Matrix4 } from 'three/webgpu';
import type { Box } from '../render/box-plan.ts';
import type { Plan } from '../place/building-plans.ts';
import type { BuilderName } from './names.ts';
import type { JsonObject, Placement } from './types.ts';
import type { Part } from '../render/part-geometry.ts';
export type PartBuild = { parts: Part[]; glass?: { x: number; y: number; z: number }[] };
/** Vertex-coloured pieces in the record's frame, unbaked: `instantiate` returns them in the owner's frame for the
 * caller to merge into its area's draws (`layer` names which one). Matrices compose in full precision first. */
export type Piece = { geometry: BufferGeometry; matrix: Matrix4; color: string; layer?: string };
export type PieceBuild = { pieces: Piece[] };
export type ConstructionBuild = { construction: { plan: Plan; phase: 'pieces' | 'scaffold'; parts: Box[] } };
export type ObjectBuild = { object: Object3D; dispose: () => void };
export type Builder = (
  params: JsonObject,
  batch?: { mesh: InstancedMesh; index: number },
  placement?: Placement,
) => Object3D | PartBuild | PieceBuild | ConstructionBuild | ObjectBuild;
export const builders = new Map<BuilderName, Builder>();
export function registerBuilder(name: BuilderName, build: Builder) {
  if (builders.has(name)) throw new Error(`prefabs: duplicate builder ${name}`);
  builders.set(name, build);
  return build;
}
