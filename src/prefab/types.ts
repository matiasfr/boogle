import type { AssetId, BuilderName, ComponentInits, GateName, InteractionName, MaterialName } from './names.ts';

export type Vec3 = readonly [number, number, number];
export type Json = null | boolean | number | string | readonly Json[] | JsonObject;
export type JsonObject = { readonly [key: string]: Json };
export type PrefabKey = `${string}.${string}`;
export type Transform = { pos: Vec3; rot?: Vec3; scale?: Vec3 };
export type ColliderDef = { at: Vec3; rot?: Vec3; group?: 'scenery' | 'room' } & (
  | { shape: 'box'; half: Vec3 }
  | { shape: 'sphere'; r: number }
  | { shape: 'capsule'; r: number; halfHeight: number }
  | { shape: 'trunk'; r: number; h: number }
  | { shape: 'trimesh'; vertices: readonly number[]; indices: readonly number[] }
);
export type Attach =

  | {
      kind: 'seat';
      at: Vec3;
      yaw: number;
      exit: Vec3;
      forward?: number;
      perch?: number;
      /** Preserve pre-prefab wire ids and contention groups. Defaults retain workshop naming. */
      idSuffix?: string;
      group?: string;
      anchorView?: true;
    }
  | { kind: 'label'; at: Vec3; facing: Vec3; w: number; h: number; posts?: 'one' | 'two' | 'none' }
  | { kind: 'point'; at: Vec3 };
export type PrefabDef = {
  key: PrefabKey;
  visual:
    | { asset: AssetId; node?: string }
    | { builder: BuilderName; params: JsonObject; batch?: string; instances?: readonly Transform[] }
    | { none: true };
  colliders: readonly ColliderDef[];
  attach?: Readonly<Record<string, Attach>>;
  interactions?: readonly { action: InteractionName; at?: string; gate?: GateName }[];
  components?: Partial<ComponentInits>;
  scope: 'owner' | 'place' | 'room';
  material?: MaterialName;
};
export type Placement = {
  id: string;
  prefab: PrefabKey;
  pos: Vec3;
  rot?: Vec3;
  scale?: Vec3;
  params?: JsonObject;
  parent?: string;
  /** Attachment name -> authored text key. Text stays with its copy author, outside the prefab. */
  labels?: Readonly<Record<string, string>>;
};
export type LevelDef = { place: string; placements: readonly Placement[]; layout?: JsonObject; analysis?: JsonObject };
export const definePrefab = <T extends PrefabDef>(record: T): T => record;
export const defineLevel = <T extends LevelDef>(record: T): T => record;
export const metadata = {
  version: 1,
  units: 'metres',
  axes: 'x east, y up, z south, right-handed',
  rotation: 'yaw, pitch, roll in radians, order YXZ',
} as const;
export type PrefabArtifact = typeof metadata & { format: 'boogle-prefabs'; prefabs: Record<string, PrefabDef> };
export type LevelArtifact = typeof metadata & {
  format: 'boogle-level';
  place: string;
  placements: readonly Placement[];
  layout?: JsonObject;
  analysis?: JsonObject;
};
