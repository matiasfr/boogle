// The action half of dev/look/evals/place-tech.ts: runs what the shot set up, after warm-up and once the recording's going.
void (window as unknown as { __techAct?: () => unknown }).__techAct?.();
export {};
