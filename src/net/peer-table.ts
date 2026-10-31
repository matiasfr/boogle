// The peer table a room keeps (src/net/README.md): me first, then everyone known, as frozen entries, with changes batched
// 8 ms into one onPeers call. The same rules as peer-room.ts's own table (written fresh, so peer-room stays untouched):
// a presence older than the newest seen for that id is stale, and a dropped id keeps its seq as a tombstone so a late
// packet can't bring it back.
//
//   const t = createPeerTable(selfId)
//   t.setSelf(presence)              my presence changed
//   t.upsert(id, presence, seq)      a remote's presence; false if stale
//   t.drop(id, seq?)                 a remote left; true if it was there
//   t.has(id), t.list()              list() is me first, frozen, cached until the next change
//   t.onChange(h)                    h({ peers, joined, left, updated }); returns unsubscribe
//   t.expectBack(ms)                 after a reconnect: drop, after ms, every remote not upserted since
//   t.clear()                        stop timers
import type { PeerEntry, PeersChange } from './peer-room.ts';

type Rec = { presence: Readonly<Record<string, unknown>>; at: number; entry: PeerEntry };

export function createPeerTable(selfId: string) {
  const table = new Map<string, Rec>();
  const seqs = new Map<string, number>();
  const handlers = new Set<(c: PeersChange) => void>();
  let cache: readonly PeerEntry[] | null = null;
  let pj = new Set<string>(),
    pu = new Set<string>(),
    pl = new Map<string, PeerEntry>(),
    shown = new Set<string>(), // joined ids that list() already handed out, so a quick departure is still announced
    flushTimer: ReturnType<typeof setTimeout> | 0 = 0;
  let stale = new Set<string>(),
    staleTimer: ReturnType<typeof setTimeout> | 0 = 0;

  function set(id: string, presence: Record<string, unknown>) {
    const base = { presence: Object.freeze({ ...presence }), at: Date.now() };
    const entry: PeerEntry = Object.freeze({
      peer: id,
      sameTab: id === selfId,
      presence: base.presence,
      updatedAt: base.at,
    });
    const rec = { ...base, entry };
    table.set(id, rec);
    cache = null;
    return rec.entry;
  }
  function note(kind: 'j' | 'u' | 'l', id: string, entry: PeerEntry) {
    if (kind === 'j') {
      if (pl.delete(id)) pu.add(id);
      else pj.add(id);
    } else if (kind === 'u') {
      if (!pj.has(id)) pu.add(id);
    } else if (pj.delete(id) && !shown.delete(id)) {
      pu.delete(id); // joined and left within one batch, never seen: say nothing
    } else {
      pu.delete(id);
      pl.set(id, entry);
    }
    if (!flushTimer) flushTimer = setTimeout(flush, 8);
  }
  function flush() {
    flushTimer = 0;
    const get = (id: string) => table.get(id)?.entry;
    const change: PeersChange = {
      peers: list(),
      joined: [...pj].map(get).filter((e): e is PeerEntry => !!e),
      left: [...pl.values()],
      updated: [...pu].map(get).filter((e): e is PeerEntry => !!e),
    };
    pj = new Set();
    pu = new Set();
    pl = new Map();
    shown = new Set();
    if (!change.joined.length && !change.left.length && !change.updated.length) return;
    for (const h of [...handlers])
      try {
        h(change);
      } catch (e) {
        console.error('[peer-table] handler threw', e);
      }
  }
  function list() {
    if (!cache) {
      for (const id of pj) shown.add(id);
      cache = Object.freeze([
        table.get(selfId)!.entry,
        ...[...table].filter(([id]) => id !== selfId).map(([, r]) => r.entry),
      ]);
    }
    return cache;
  }
  function drop(id: string, seq?: number | null) {
    if (id === selfId) return false;
    if (seq != null) seqs.set(id, Math.max(seqs.get(id) ?? -1, seq));
    const rec = table.get(id);
    if (!rec) return false;
    table.delete(id);
    stale.delete(id);
    cache = null;
    note('l', id, rec.entry);
    return true;
  }
  set(selfId, {});

  return {
    setSelf: (presence: Record<string, unknown>) => note('u', selfId, set(selfId, presence)),
    upsert(id: string, presence: Record<string, unknown>, seq: number) {
      if (id === selfId || !Number.isSafeInteger(seq) || seq <= (seqs.get(id) ?? -1)) return false;
      seqs.set(id, seq);
      stale.delete(id);
      note(table.has(id) ? 'u' : 'j', id, set(id, presence));
      return true;
    },
    drop,
    has: (id: string) => table.has(id),
    list,
    onChange(h: (c: PeersChange) => void) {
      handlers.add(h);
      return () => handlers.delete(h);
    },
    expectBack(ms: number) {
      stale = new Set([...table.keys()].filter((id) => id !== selfId));
      clearTimeout(staleTimer);
      staleTimer = setTimeout(() => {
        for (const id of stale) drop(id);
        stale.clear();
      }, ms);
    },
    clear() {
      clearTimeout(flushTimer);
      clearTimeout(staleTimer);
    },
  };
}
export type PeerTable = ReturnType<typeof createPeerTable>;
