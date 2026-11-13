import { runtime } from './becsy.ts';

export async function probe(perf: boolean, kind: 'read' | 'write' | 'readonly' | 'cycle' | 'workers') {
  const { World, System, Type } = await runtime(perf);
  class Marker {
    static schema = { id: Type.uint32 };
    declare id: number;
  }
  class Value {
    static schema = { value: Type.float64 };
    declare value: number;
  }
  let observed = 0;
  class Bad extends System {
    entities = this.query((q) => {
      void q.current.with(Marker).read;
      if (kind === 'readonly') void q.using(Value).read;
    });
    override execute() {
      const e = this.entities.current[0]!;
      if (kind === 'read') observed = e.read(Value).value;
      else if (kind === 'write') e.write(Value).value = 9;
      else Object.assign(e.read(Value), { value: 9 });
    }
  }
  class A extends System {
    order = this.schedule((s) => s.before(B));
  }
  class B extends System {
    order = this.schedule((s) => s.before(A));
  }
  let world: Awaited<ReturnType<typeof World.create>> | undefined;
  let error: string | null = null;
  try {
    world = await World.create({
      defs: kind === 'cycle' ? [A, B] : [Marker, Value, Bad],
      threads: kind === 'workers' ? 2 : 1,
    });
    if (kind !== 'cycle') {
      world.createEntity(Marker, { id: 1 }, Value, { value: 4 });
      await world.execute(0, 0.1);
    }
  } catch (e) {
    error = String(e);
  }
  // A failed execute poisons the frame; termination can rethrow. Preserve the original error.
  if (world)
    try {
      await world.terminate();
    } catch {
      /* failed-frame cleanup */
    }
  return { perf, kind, error, observed };
}

export async function orderProbe(perf: boolean, ordered: boolean, ids: number[]) {
  const { World, System, Type } = await runtime(perf);
  class StableId {
    static schema = { id: Type.float64 };
    declare id: number;
  }
  let seen: number[] = [];
  class Walk extends System {
    entities = this.query((q) => {
      void q.current.with(StableId).read;
      if (ordered) q.orderBy((e) => e.read(StableId).id);
    });
    override execute() {
      seen = this.entities.current.map((e) => e.read(StableId).id);
    }
  }
  const world = await World.create({ defs: [StableId, Walk] });
  for (const id of ids) world.createEntity(StableId, { id });
  await world.execute(0, 0.1);
  await world.terminate();
  return seen;
}
