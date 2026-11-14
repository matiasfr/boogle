// Names are portable data; implementations live behind the runtime door.
/* oxlint-disable typescript/no-empty-object-type -- declaration-merging registries intentionally start empty */
export interface BuilderNames {}
export interface InteractionNames {
  'seat.sit': true;
  'town.shop-stock': true;
  'town.shop-rail': true;
}
export interface GateNames {
  open: true;
}
export interface MaterialNames {}
export interface AssetNames {}
export interface ComponentInits {}
/* oxlint-enable typescript/no-empty-object-type */
export type BuilderName = keyof BuilderNames;
export type InteractionName = keyof InteractionNames;
export type GateName = keyof GateNames;
export type MaterialName = keyof MaterialNames;
export type AssetId = keyof AssetNames;
export type NameRegistry = {
  builders: readonly string[];
  interactions: readonly string[];
  gates: readonly string[];
  materials: readonly string[];
  assets: Readonly<Record<string, { nodes: readonly string[] }>>;
  retired: readonly string[];
};
export const names: NameRegistry = {
  builders: [
    'seat.chair',
    'greybox.box',
    'town.workshop-parts',
    'town.shop-parts',
    'town.curio-parts',
    'town.museum-parts',
    'town.museum-exhibit',
    'town.house-parts',
    'town.room-shell',
    'town.room-proxy',
    'railway.halt-parts',
  ],
  interactions: ['seat.sit', 'town.shop-stock', 'town.shop-rail'],
  gates: ['open'],
  materials: [],
  assets: {},
  retired: [],
};
