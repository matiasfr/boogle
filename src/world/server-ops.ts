// The Server-kind command boundary (server-owned-state, step 2). Roster, seat and rail tune commands use it.
// Validation sees authenticated identity and host facts; apply only receives the edit and rule tick. Results stay
// local to the host; the existing railway receipt carries acceptance (ok=1), never an arbitrary result on the wire.
import type { Actor } from './railway-server.ts';
import type { Ctx } from './rules/types.ts';
import type { Fields } from './replicate.ts';

export type ServerEdit = Record<string, unknown> & { op: string; p: string; u: string };
export type ServerOpContext = Ctx & { actor: Actor; protoRoom: boolean; tuneController: (from: string) => boolean };
export type ServerOpHandlers = {
  validate: (e: ServerEdit, ctx: ServerOpContext) => boolean | 'taken' | 'rate';
  apply: (e: ServerEdit, tick: number) => unknown;
  /** Replicated output after successful apply; the actor already played its local prediction. */
  event?: (e: ServerEdit, tick: number) => Fields;
  durable?: boolean;
};
export type ServerOpResult = {
  status: 'accepted' | 'rejected';
  result: unknown;
  durable: boolean;
  reason?: 'taken' | 'rate';
  event?: Fields;
};

export function createServerOps() {
  const ops = new Map<string, ServerOpHandlers>();
  const refusals = new Map<string, number>();
  const refuse = (op: string): ServerOpResult => {
    if (ops.has(op)) refusals.set(op, (refusals.get(op) ?? 0) + 1);
    return { status: 'rejected', result: null, durable: false };
  };
  return {
    refuse,
    refusals: (op: string) => refusals.get(op) ?? 0,
    define(op: string, handlers: ServerOpHandlers) {
      if (!op || ops.has(op)) throw new Error(`server op already defined or empty: ${op}`);
      ops.set(op, handlers);
    },
    has: (op: string) => ops.has(op),
    run(pid: string, input: Record<string, unknown>, ctx: ServerOpContext): ServerOpResult {
      if (typeof input.op !== 'string') return refuse('');
      const handlers = ops.get(input.op);
      if (!handlers) return refuse(input.op);
      const e: ServerEdit = { ...input, op: input.op, p: ctx.from, u: pid };
      try {
        const valid = handlers.validate(e, ctx);
        if (valid !== true) return { ...refuse(e.op), ...(valid === false ? {} : { reason: valid }) };
      } catch {
        return refuse(e.op); // malformed input must not crash the room
      }
      // An apply error may follow mutation: the coordinator stops the room rather than claiming a clean refusal.
      const result = handlers.apply(e, ctx.tick);
      return {
        status: 'accepted',
        result,
        durable: handlers.durable === true,
        ...(handlers.event ? { event: handlers.event(e, ctx.tick) } : {}),
      };
    },
  };
}
export type ServerOps = ReturnType<typeof createServerOps>;
