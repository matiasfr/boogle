// Headless server registration and command context. State hashes verify checkpoints, never client lockstep.
type Cell = { i: number; j: number };

export type Ctx = { from: string; tick: number };
export type StateHandlers = {
  serialize: () => unknown;
  load: (json: unknown) => void;
  hash: () => number;
};
export type SyncView = {
  world: { tick: number; seed: number; epochMs: number };
  registerState: (key: string, handlers: StateHandlers, opts: { server: true }) => void;
  onTick: (fn: (tick: number) => void, label?: string) => void;
  onSnapshot: (fn: (tick: number) => void) => void;
};
/** The static land: grid size and legacy scenery layout, filled before the first tick. */
export type Land = { n: number; layout: { trees: Cell[]; perches: (Cell & { kind: number })[] } };
