// Globals the game puts on window.
declare global {
  interface Window {
    /** Debug handle for the console and the look/scenario harness (src/main.ts, src/features/debug-handle.js). */
    boogle: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- a grab bag by design
  }
}
export {};
