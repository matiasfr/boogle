// Globals the game puts on window.
declare global {
  interface Window {
    /** Debug handle for the console and the look/scenario harness (src/main.ts, src/features/debug-handle.ts). */
    boogle: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- a grab bag by design
    /** Critter state for scenarios (src/features/critter-*.ts). */
    __fish?: unknown;
    __gulls?: unknown;
    __feel?: unknown; // src/features/feel.ts tuning, for scenarios
    __carry?: unknown; // src/physics/platforms.ts tuning and state
    __ride?: unknown; // src/proto/ride/index.ts (?proto=ride) tuning and state
    __soapbox?: unknown; // src/proto/soapbox/index.ts: tuning and state, for ?proto=soapbox evals
    __wagon?: unknown; // src/proto/wagon/index.ts (?proto=wagon) state and the look evals' shortcuts
    __grind?: unknown; // src/proto/grind/index.ts (?proto=wagon&grind=1) tuning and state
    __moves?: unknown; // src/proto/moves/index.ts (&jump2=1, &glide=1) tuning and state
    __freight?: unknown; // src/proto/wagon/freight.ts: its tunables and drop log, for the look evals
    __debugCam?: { set(pos: number[], look: number[], fov?: number): void; clear(): void }; // src/debug/debug-cam.ts
  }
}
export {};
