/** Submit URL intent once, after appearance and (for shared edits) the first room snapshot. */
export function createTuneStartup(roomReady: () => boolean, apply: () => void) {
  let requested = false;
  let needsRoom = false;
  let applied = false;
  function flush() {
    if (!requested || applied || (needsRoom && !roomReady())) return;
    // Consume before calling out: snapshot callbacks/reconnects must not replay URL intent.
    applied = true;
    apply();
  }
  return {
    start(shared: boolean) {
      if (requested) return;
      requested = true;
      needsRoom = shared;
      flush();
    },
    snapshot: flush,
  };
}
