import type { Object3D, InstancedMesh } from 'three/webgpu';
import type { Box } from '../render/box-plan.ts';
import type { Plan } from '../place/building-plans.ts';
import type { BuilderName } from './names.ts';
import type { JsonObject } from './types.ts';
import type { Part } from '../render/part-geometry.ts';
export type PartBuild = { parts: Part[]; glass?: { x: number; y: number; z: number }[] };
export type ConstructionBuild = { construction: { plan: Plan; phase: 'pieces' | 'scaffold'; parts: Box[] } };
export type ObjectBuild = { object: Object3D; dispose: () => void };
export type Builder = (
  params: JsonObject,
  batch?: { mesh: InstancedMesh; index: number },
) => Object3D | PartBuild | ConstructionBuild | ObjectBuild;
export const builders = new Map<BuilderName, Builder>();
export function registerBuilder(name: BuilderName, build: Builder) {
  if (builders.has(name)) throw new Error(`prefabs: duplicate builder ${name}`);
  builders.set(name, build);
  return build;
}
