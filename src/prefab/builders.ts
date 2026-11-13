import type { Object3D } from 'three/webgpu';
import type { BuilderName } from './names.ts';
import type { JsonObject } from './types.ts';
export type Builder = (params: JsonObject) => Object3D;
export const builders = new Map<BuilderName, Builder>();
export function registerBuilder(name: BuilderName, build: Builder) {
  if (builders.has(name)) throw new Error(`prefabs: duplicate builder ${name}`);
  builders.set(name, build);
  return build;
}
