// Replication from an E world (docs/plans/ecs-e.md): a replicated component is its own projection, and what changed
// is what the world marked, so a domain on E writes no projection and no list of what an action touched.
//
//   worldProjections(world, cells)   one projection per replicated component of the world (./replicate-server.ts)
//   touchChanges(world, touch)       drain every replicated component's changes into the replicator
import type { AnyComponent, World } from '../ecs/index.ts';
import type { EntityId, Fields } from './replicate.ts';
import type { Projection } from './replicate-server.ts';

/** cells[kind](id, fields) places an entity; a kind without one is global. */
export type Cells = Record<string, (id: number, fields: Fields) => string>;

export function worldProjections(world: () => World, cells: Cells, global: string): Projection[] {
  return world()
    .components.filter((c) => c.replicate)
    .map((c) => ({
      schema: c,
      ids: () => world().ids(c),
      project(id: EntityId) {
        const row = typeof id === 'number' ? (world().get(c, id) as Fields | undefined) : undefined;
        if (!row) return null;
        const out: Fields = {};
        for (const f of c.names) out[f] = row[f]!;
        return out;
      },
      cell: (id: EntityId, fields: Fields) => cells[c.kind]?.(id as number, fields) ?? global,
    }));
}

export function touchChanges(world: World, touch: (kind: string, id: EntityId) => void, only?: AnyComponent[]) {
  for (const c of only ?? world.components) if (c.replicate) for (const id of world.changes(c)) touch(c.kind, id);
}
