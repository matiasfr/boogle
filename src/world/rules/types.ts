// Types for rules modules (./README.md, "Contract"): the view of sync a module installs on, the land, the edits it
// handles and the replay test's generator stream. Types only, so it costs nothing at runtime.
import type { Cell } from '../../sim/sources.ts';

/** An edit as apply sees it: the op's own fields, plus the session (p) and player id (u) the host stamped. */
export type Edit<F = object> = { op: string; i: number; j: number; p: string; u: string } & F;
/** validate's context: who sent it, the host tick, and host-only facts (../README.md, setEnv). */
export type Ctx = { from: string; tick: number; env: Record<string, unknown> };
export type OpHandlers<F> = {
  hostOnly?: boolean; // only the host's own submit is stamped
  validate?: (e: Edit<F>, ctx: Ctx) => boolean; // e's fields are unchecked here: validate checks them
  apply: (e: Edit<F>, tick: number) => unknown; // returns the result onApplied listeners get
};
export type StateHandlers = {
  serialize: () => unknown;
  load: (json: unknown) => void;
  hash: () => number;
  version?: number;
  migrate?: Record<number, (json: unknown) => unknown>;
};
export type SyncView = {
  world: { tick: number; seed: number; epochMs: number };
  registerOp: <F>(op: string, handlers: OpHandlers<F>) => void;
  registerState: (key: string, handlers: StateHandlers) => void;
  onTick: (fn: (tick: number) => void, label?: string) => void;
  onApplied: (fn: (e: Edit, tick: number, result: unknown) => void, label?: string) => void;
  onSnapshot: (fn: (tick: number) => void) => void;
};
/** The static land every peer builds the same: grid size and the gifts layout (filled before tick 1). */
export type Land = { n: number; layout: { trees: Cell[]; perches: (Cell & { kind: number })[] } };
/** Every module's API, keyed by its name: what installRules returns (./index.js). */
export type Rules = {
  mushrooms: ReturnType<typeof import('./mushrooms.ts').install>;
  gifts: ReturnType<typeof import('./gifts.ts').install>;
  roster: import('./roster.ts').RosterApi;
  stacks: import('./stacks.ts').StacksApi;
  piles: import('./piles.ts').PilesApi;
  sites: import('./sites.ts').SitesApi;
  sources: import('./sources.ts').SourcesApi;
  bank: import('./bank.ts').BankApi;
  ball: import('./ball.ts').BallApi;
  tune: import('./tune.ts').TuneApi;
  opening: import('./opening.ts').OpeningApi;
};
/** The replay test's seeded stream (./edit-gen.js). */
export type Stream = {
  int: (lo: number, hi: number) => number;
  pick: <T>(a: readonly T[]) => T;
  chance: (p: number) => boolean;
  next: () => number;
};
