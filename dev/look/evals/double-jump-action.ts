// driven by: dev/look/evals/gpu-portability.ts (it defines window.__gpuJump); this file calls window.__doubleJumpRun, which nothing defines: command: unknown, needs that page function (a leftover; delete if no one revives it)
// Start after the look harness's warm-up, so curves and video include the measured inputs.
void (window as unknown as { __doubleJumpRun: () => Promise<void> }).__doubleJumpRun();
export {};
