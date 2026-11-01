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
    __ride?: unknown; // src/features/proto-ride.ts (?proto=ride) tuning and state
    __soapbox?: unknown; // src/proto/soapbox/index.ts: tuning and state, for ?proto=soapbox evals
    __debugCam?: { set(pos: number[], look: number[], fov?: number): void; clear(): void }; // src/debug/debug-cam.ts
  }
}
export {};
