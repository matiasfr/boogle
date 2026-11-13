// Classic commands' Server-kind boundary (server-owned-state, step 2). No production op is defined yet.
// Validation sees authenticated identity and host facts; apply only receives the edit and rule tick. Results stay
// local to the host; the existing railway receipt carries acceptance (ok=1), never an arbitrary result on the wire.
import type { Actor } from './railway-server.ts';
import type { Ctx } from './rules/types.ts';

export type ServerEdit = Record<string, unknown> & { op: string; p: string; u: string };
export type ServerOpContext = Ctx & { actor: Actor };
export type ServerOpHandlers = {
  validate: (e: ServerEdit, ctx: ServerOpContext) => boolean;
  apply: (e: ServerEdit, tick: number) => unknown;
  durable?: boolean;
};
export type ServerOpResult = { status: 'accepted' | 'rejected'; result: unknown; durable: boolean };

export function createServerOps() {
  const ops = new Map<string, ServerOpHandlers>();
  return {
    define(op: string, handlers: ServerOpHandlers) {
      if (!op || ops.has(op)) throw new Error(`server op already defined or empty: ${op}`);
      ops.set(op, handlers);
    },
    has: (op: string) => ops.has(op),
    run(pid: string, input: Record<string, unknown>, ctx: ServerOpContext): ServerOpResult {
      const refused: ServerOpResult = { status: 'rejected', result: null, durable: false };
      if (typeof input.op !== 'string') return refused;
      const handlers = ops.get(input.op);
      if (!handlers) return refused;
      const e: ServerEdit = { ...input, op: input.op, p: ctx.from, u: pid };
      try {
        if (!handlers.validate(e, ctx)) return refused;
      } catch {
        return refused; // malformed input must not crash the room
      }
      // An apply error may follow mutation: the coordinator stops the room rather than claiming a clean refusal.
      return { status: 'accepted', result: handlers.apply(e, ctx.tick), durable: handlers.durable === true };
    },
  };
}
export type ServerOps = ReturnType<typeof createServerOps>;
