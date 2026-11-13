// Optional store spike. bitECS 0.4 supports AoS as well as SoA: arrays of the existing schema-created rows keep
// get/mut's live-object contract without a proxy per field. Membership and dense queries belong to bitECS;
// stamped (including negative prediction) ids belong to Boogle. Every world owns its arrays and entity index.
import {
  createWorld,
  addEntity,
  removeEntity,
  addComponent,
  removeComponent,
  hasComponent,
  registerComponents,
  query,
} from 'bitecs';
import type { AnyComponent, FieldValue } from './schema.ts';

type Row = Record<string, FieldValue>;
export type Rows = Iterable<[number, Row]> &
  Pick<Map<number, Row>, 'get' | 'has' | 'delete' | 'size'> & {
    set(id: number, row: Row): Rows;
  };

export function createBitStore(components: readonly AnyComponent[]) {
  const world = createWorld();
  const columns: (Row | undefined)[][] = [];
  for (const c of components) columns[c.cid] = [];
  registerComponents(
    world,
    components.map((c) => columns[c.cid]!),
  );
  const eids = new Map<number, number>();
  const ids: number[] = [];
  const counts: number[] = [];
  return {
    query(cs: readonly AnyComponent[]): number[] {
      return Array.from(
        query(
          world,
          cs.map((c) => columns[c.cid]!),
        ),
        (eid) => ids[eid]!,
      );
    },
    table(c: AnyComponent): Rows {
      const data = columns[c.cid]!;
      let size = 0;
      const rows: Rows = {
        get size() {
          return size;
        },
        get(id) {
          const eid = eids.get(id);
          return eid === undefined ? undefined : data[eid];
        },
        has(id) {
          const eid = eids.get(id);
          return eid !== undefined && hasComponent(world, eid, data);
        },
        set(id, row) {
          let eid = eids.get(id);
          if (eid === undefined) {
            eid = addEntity(world);
            eids.set(id, eid);
            ids[eid] = id;
            counts[eid] = 0;
          }
          if (!hasComponent(world, eid, data)) {
            addComponent(world, eid, data);
            counts[eid]!++;
            size++;
          }
          data[eid] = row;
          return rows;
        },
        delete(id) {
          const eid = eids.get(id);
          if (eid === undefined || !hasComponent(world, eid, data)) return false;
          removeComponent(world, eid, data);
          data[eid] = undefined;
          size--;
          if (--counts[eid]! === 0) {
            removeEntity(world, eid);
            eids.delete(id);
          }
          return true;
        },
        *[Symbol.iterator]() {
          for (const eid of query(world, [data])) yield [ids[eid]!, data[eid]!] as [number, Row];
        },
      };
      return rows;
    },
  };
}
export type BitStore = ReturnType<typeof createBitStore>;
