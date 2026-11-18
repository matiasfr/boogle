// Names are portable data; implementations live behind the runtime door.
// Asset ids and their node lists come from the built manifest (`npm run assets`), the one list of GLBs.
import manifest from '../../assets/built/manifest.json' with { type: 'json' };
/* oxlint-disable typescript/no-empty-object-type -- declaration-merging registries intentionally start empty */
export interface BuilderNames {}
export interface InteractionNames {
  'seat.sit': true;
  'railway.request-stop': true;
  'railway.sack': true;
  'town.shop-stock': true;
  'town.plot-buy': true;
  'town.shop-rail': true;
}
export interface GateNames {
  open: true;
}
export interface MaterialNames {}
export interface ComponentInits {}
/* oxlint-enable typescript/no-empty-object-type */
/** The built models a record may name in `visual.asset`; each is registered (`registerAsset`) by the view that loads it. */
export interface AssetNames {
  'boiler-cart': true;
  engine: true;
  'passenger-car': true;
  'track-layer': true;
  'track-wing': true;
}
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
    'railway.coach-parts',
    'railway.loader-parts',
    'seat.chair',
    'scenery.prop',
    'scenery.tree',
    'greybox.box',
    'town.workshop-parts',
    'town.shop-parts',
    'town.curio-parts',
    'town.museum-parts',
    'town.museum-exhibit',
    'town.house-parts',
    'town.room-shell',
    'town.room-proxy',
    'town.boogler-statue',
    'town.statue-scaffold',
    'town.green-kerb',
    'railway.halt-parts',
    'railway.halt-ramp',
    'railway.halt-lever',
    'railway.halt-attachment',
    'railway.till-parts',
    'roundhouse.bay',
    'roundhouse.table',
  ],
  interactions: [
    'railway.request-stop',
    'railway.sack',
    'seat.sit',
    'town.shop-stock',
    'town.plot-buy',
    'town.shop-rail',
  ],
  gates: ['open'],
  materials: [],
  assets: Object.fromEntries(Object.entries(manifest).map(([id, entry]) => [id, { nodes: entry.nodes }])),
  retired: [],
};
