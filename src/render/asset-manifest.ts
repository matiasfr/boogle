// The content manifest: every authored file the game can load (models, textures, audio, data), what it is for and how
// soon it is wanted, so content loads by need as islands, eras and prototypes multiply (docs/plans/loading.md,
// "Content manifest"). Small and eager, with no three.js: features register their files at import, the loaders stay
// lazy (./assets.ts loads models by id).
//
//   registerAsset({ id, url, kind, priority, when? })   a feature's file; `url` from a `?url` import (hashed on build)
//   assetUrl(id)                                         its URL (throws for an unknown id: a typo fails loudly)
//   prefetchAssets()                                     main.ts, after the first frame: fetch the `soon` files that
//                                                        apply here, one at a time in idle time, into the HTTP cache
//                                                        and the service worker's (src/boot/sw-worker.ts)
//
// Priorities:
//   first   the first frame needs it where it applies: its feature loads it at start (the boot waits, or it pops in)
//   soon    wanted within a minute or so (the next area along, a held item's model): prefetched after the first frame
//   later   only on demand (a rare prop, a far island, a debug tool): never prefetched
// `when` narrows where it applies: { proto: 'assets' } only with ?proto=assets; { area } and { era } are for the
// multi-island world (matched once areas and eras exist; until then an asset that names one is never prefetched).
// Local only: what one tab downloads changes nothing for anyone else.

export type Priority = 'first' | 'soon' | 'later';
export type AssetKind = 'model' | 'texture' | 'audio' | 'data';
export type AssetWhen = { proto?: string; area?: string; era?: string };
export type AssetEntry = { id: string; url: string; kind: AssetKind; priority: Priority; when?: AssetWhen };
/** Where this tab is: the prototype from the URL, and later the area and era it is in. */
export type AssetPlace = { proto: string | null; area?: string | null; era?: string | null };

const entries = new Map<string, AssetEntry>();

export function registerAsset(entry: AssetEntry) {
  const had = entries.get(entry.id);
  if (had && had.url !== entry.url) throw new Error(`assets: id ${entry.id} is taken by ${had.url}`);
  entries.set(entry.id, entry);
  return entry.id;
}

export function assetUrl(id: string) {
  const e = entries.get(id);
  if (!e) throw new Error(`assets: no asset registered as ${id}`);
  return e.url;
}

export const assetEntries = () => [...entries.values()];

/** Whether an entry applies in this place (pure). */
export function applies(e: AssetEntry, place: AssetPlace) {
  const w = e.when;
  if (!w) return true;
  if (w.proto !== undefined && w.proto !== place.proto) return false;
  if (w.area !== undefined && w.area !== place.area) return false;
  if (w.era !== undefined && w.era !== place.era) return false;
  return true;
}

/** The URLs to prefetch after the first frame, in registration order (pure). */
export function prefetchList(list: AssetEntry[], place: AssetPlace) {
  return list.filter((e) => e.priority === 'soon' && applies(e, place)).map((e) => e.url);
}

export const here = (): AssetPlace => ({ proto: new URLSearchParams(location.search).get('proto') });

type IdleWindow = { requestIdleCallback?: (fn: () => void, o?: { timeout: number }) => number };
const idle = (fn: () => void) => {
  const w = window as unknown as IdleWindow;
  if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 2000 });
  else setTimeout(fn, 200); // Safari before 26.2 has no requestIdleCallback
};

let started = false;
export function prefetchAssets(place: AssetPlace = here()) {
  if (started) return;
  started = true;
  const queue = prefetchList(assetEntries(), place);
  const next = () => {
    const url = queue.shift();
    if (!url) return;
    // Low priority, one at a time, each in an idle moment: never in the way of the game's own requests.
    fetch(url, { priority: 'low' } as RequestInit)
      .then((r) => r.arrayBuffer())
      .catch(() => {})
      .finally(() => idle(next));
  };
  idle(next);
}
