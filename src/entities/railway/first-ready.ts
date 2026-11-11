// Whether the first whole state has arrived, latched: false until `read.ready()` is first true, then true for good.
// read.ready() itself is also false while RAILWAY_WINDOW actions are pending or the link is down, and a view must not
// treat that as "nothing loaded": the world the views see is never left half-filled after the first whole state (a
// refill keeps the last shown world). A latch of a session value, not a memo: callers still re-read read.world() each
// frame. Two users: train-view.ts (the trains hidden only until then) and leaf-view.ts (the leaf placed, never swung,
// until then). The plan's M12e step moves it to a session read.
export function createFirstReady(ready: () => boolean) {
  let seen = false;
  return () => (seen ||= ready());
}
