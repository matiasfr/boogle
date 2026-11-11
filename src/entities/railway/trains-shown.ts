// Whether the trains are drawn (train-view.ts step). They stand hidden only until the first whole state is in; from
// then on they are drawn from the world the views see, which the adapter never leaves half-filled (a refill keeps the
// last shown world). read.ready() is not that: it is also false while RAILWAY_WINDOW actions are pending or the link
// is down, and the trains must not vanish then. A latch of a session value, not a memo: the caller still re-reads
// read.world() each step.
export function createTrainsShown(ready: () => boolean) {
  let seen = false;
  return () => (seen ||= ready());
}
