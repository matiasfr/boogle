import { entries, totals } from 'virtual:asset-catalogue';
import { descriptors } from './descriptors.ts';
import type { AssetHealth } from '../dev/assets/manifest.ts';

const urls = import.meta.glob<string>('../assets/built/*.glb', { query: '?url', import: 'default', eager: true });
export type CatalogueEntry = AssetHealth & {
  label: string;
  url: string | null;
  defaultNode?: string;
  clipAsset?: string;
  rootNote?: string;
};
export const catalogue: CatalogueEntry[] = entries.map((entry) => ({
  ...entry,
  ...descriptors[entry.id],
  label: descriptors[entry.id]?.label ?? entry.id,
  url: entry.available ? (urls[`../assets/built/${entry.id}.glb`] ?? null) : null,
}));
export const catalogueTotals = totals;
export const catalogueScope = 'Hashes and budgets checked at serve/build time; reload after changing assets.';
