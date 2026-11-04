// Start work at the call site; observe rejection without making a frame, event or startup hook wait.
// Use explicit void instead when the callee already owns failure handling.
export function background(task: PromiseLike<unknown>, label: string): void {
  void Promise.resolve(task).catch((error: unknown) => console.error(`[${label}]`, error));
}
