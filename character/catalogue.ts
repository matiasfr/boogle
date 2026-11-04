import { entries, totals } from 'virtual:asset-catalogue';
import { descriptors } from './descriptors.ts';
import { codeDescriptors, type CodeId } from './code-descriptors.ts';
import type { AssetHealth } from '../dev/assets/manifest.ts';

const urls = import.meta.glob<string>('../assets/built/*.glb', { query: '?url', import: 'default', eager: true });
type Context = {
  id: string;
  assetId: string;
  node: string;
  label: string;
  category: string;
  source: string;
  flags: string[];
  triangles: number | null;
  animations: string[];
  reviewStatus: 'unreviewed';
  defaultNode?: string;
  clipAsset?: string;
  rootNote?: string;
};
export type CatalogueEntry = Context &
  ({ sourceKind: 'built'; url: string | null; health: AssetHealth } | { sourceKind: 'code'; codeId: CodeId });
export const catalogue: CatalogueEntry[] = entries.flatMap((entry): CatalogueEntry[] => {
  const descriptor = descriptors[entry.id];
  const base: CatalogueEntry = {
    ...entry,
    ...descriptor,
    assetId: entry.id,
    node: '',
    label: descriptor?.label ?? entry.id,
    category: descriptor?.category ?? 'kit',
    reviewStatus: 'unreviewed',
    sourceKind: 'built',
    health: entry,
    animations: entries.find((e) => e.id === descriptor?.clipAsset)?.animations ?? entry.animations,
    url: entry.available ? (urls[`../assets/built/${entry.id}.glb`] ?? null) : null,
  };
  return [
    base,
    ...(base.category === 'kit'
      ? entry.parts.map((part): CatalogueEntry => ({
          ...base,
          id: `${entry.id}/${part.name}`,
          node: part.name,
          defaultNode: part.name,
          label: part.name.replaceAll('_', ' '),
          triangles: part.triangles,
        }))
      : []),
  ];
});
catalogue.push(
  ...codeDescriptors.map((d): CatalogueEntry => ({
    ...d,
    id: `code:${d.id}`,
    codeId: d.id,
    assetId: `code:${d.id}`,
    node: '',
    sourceKind: 'code',
    flags: [],
    triangles: null,
    animations: [],
    reviewStatus: 'unreviewed',
    rootNote: 'Shared code geometry. Static representative preview; no world, behavior or authored clips.',
  })),
);
export function assetHref(entry: CatalogueEntry) {
  const url = new URL('/character/', location.href);
  url.searchParams.set('asset', entry.assetId);
  if (entry.node || entry.category === 'kit') url.searchParams.set('node', entry.node);
  url.searchParams.set('t', '0');
  return url.href;
}
export const catalogueTotals = totals;
export const catalogueScope = 'Hashes and budgets checked at serve/build time; reload after changing assets.';
