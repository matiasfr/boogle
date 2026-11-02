// The logic behind src/entity/entity.ts: kinds, their lists, the walks and teardown. No three.js, DOM or physics, so
// test/entity-walker.test.ts runs it in Node; entity.ts injects those through WalkerHost. The contract is at the top of
// entity.ts. Walking and tearing down allocate nothing: a hook is one closure per kind and phase, made in defineKind.
import type { FrameCtx } from '../loop.ts';

export const ENTITY_PHASES = ['fixedPre', 'fixedPost', 'prePhysics', 'postPhysics', 'update', 'lateUpdate'] as const;
export type EntityPhase = (typeof ENTITY_PHASES)[number];
export type KindOrders = Partial<Record<EntityPhase, number>>;
export type WalkerEntity = {
  readonly kind: string;
  alive: boolean;
  dispose?(): void;
} & { [P in EntityPhase]?: (ctx: FrameCtx) => void };

export type WalkerHost<E> = {
  /** Runs `walk` in that phase at that order, from now on. `name` is `<kind> <phase>`. */
  addHook(phase: EntityPhase, order: number, name: string, walk: (ctx: FrameCtx) => void): void;
  attach(e: E): void; // the mesh and bodies join the world
  detach(e: E): void; // and leave it
  reportError(err: unknown, where: string): void;
};

export function createWalkers<E extends WalkerEntity>(host: WalkerHost<E>) {
  const lists = new Map<string, E[]>(); // kind -> its entities, oldest first
  const orders = new Map<string, KindOrders>();
  const spawned = new WeakSet<E>(); // an entity spawns once: teardown drops its parent, so it couldn't come back as it was
  const dying = new WeakSet<E>(); // despawned, once
  const dead: E[] = []; // despawned, waiting for flush

  function walker(list: E[], phase: EntityPhase, name: string) {
    let reported = false; // once per phase for the session: an entity that keeps throwing would report at frame rate
    return (ctx: FrameCtx) => {
      const n = list.length; // cached first: an entity spawned during this walk starts on the next one
      for (let k = 0; k < n; k++) {
        const e = list[k]!;
        if (!e.alive) continue;
        try {
          e[phase]?.(ctx);
        } catch (err) {
          // Never rethrown: the rest of this walk, the other kinds, the teardown flush and the render run whatever this
          // one does, and it gets its turn again next time.
          if (!reported) host.reportError(err, name);
          reported = true;
        }
      }
    };
  }

  return {
    defineKind(kind: string, kindOrders: KindOrders) {
      if (lists.has(kind)) throw new Error(`defineKind: '${kind}' is defined twice`);
      const list: E[] = [];
      lists.set(kind, list);
      orders.set(kind, kindOrders);
      for (const phase of ENTITY_PHASES) {
        const order = kindOrders[phase];
        if (order === undefined) continue;
        const name = `${kind} ${phase}`;
        host.addHook(phase, order, name, walker(list, phase, name));
      }
    },

    spawn<T extends E>(e: T): T {
      const list = lists.get(e.kind);
      if (!list) throw new Error(`spawn: no kind '${e.kind}'; call defineKind at module top level`);
      if (spawned.has(e)) throw new Error(`spawn: this '${e.kind}' was already spawned; a new one needs a new object`);
      const declared = orders.get(e.kind)!;
      for (const phase of ENTITY_PHASES)
        if (e[phase] && declared[phase] === undefined)
          throw new Error(`spawn: '${e.kind}' has ${phase}() but its defineKind gives ${phase} no order`);
      host.attach(e); // first: if it throws, nothing half-spawned is left walking
      e.alive = true;
      spawned.add(e);
      list.push(e);
      return e;
    },

    despawn(e: E) {
      e.alive = false;
      if (!spawned.has(e) || dying.has(e)) return;
      dying.add(e);
      dead.push(e);
    },

    /** Dev tools: every kind, its orders and its live list. Read it now; don't keep it. */
    kinds() {
      return [...lists].map(([kind, entities]) => ({
        kind,
        orders: orders.get(kind)!,
        entities: entities as readonly E[],
      }));
    },

    /** Dev tools: every distinct method of a live entity, keyed `<kind> <phase>|<n>`. */
    methods() {
      const out: Record<string, (ctx: FrameCtx) => void> = {};
      const seen = new Set<unknown>();
      for (const [kind, list] of lists)
        for (const e of list)
          for (const phase of ENTITY_PHASES) {
            const m = e[phase];
            if (!m || seen.has(m)) continue;
            out[`${kind} ${phase}|${seen.size}`] = m;
            seen.add(m);
          }
      return out;
    },

    /** Tears down what was despawned: the end of a phase. Never during a walk, so lists don't shift under one. */
    flush() {
      // A dispose can despawn another entity: the length is read on every turn.
      for (let k = 0; k < dead.length; k++) {
        const e = dead[k]!;
        const list = lists.get(e.kind)!;
        const at = list.indexOf(e);
        list.copyWithin(at, at + 1);
        list.length--;
        try {
          host.detach(e);
        } catch (err) {
          host.reportError(err, `${e.kind} teardown`);
        }
        try {
          e.dispose?.();
        } catch (err) {
          host.reportError(err, `${e.kind} dispose`);
        }
      }
      dead.length = 0;
    },
  };
}
