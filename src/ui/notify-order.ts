// Who gets the notification lane (src/ui/notify.ts) when a notice arrives: pure, so the order is tested without a DOM.
export type Arriving = { key: string; ttl: number; kind: 'info' | 'deny' | 'news'; urgent?: boolean };
/** `refresh`: the same notice again, replaced in place. `show`: the lane is free for it (empty, or a sticky that
 * gives way). `cut-in`: it takes the lane from the transient showing, which resumes after it. `wait`: it queues. */
export type Placement = 'refresh' | 'show' | 'cut-in' | 'wait';

export function placement(n: Arriving, showing: { key: string; ttl: number } | null): Placement {
  if (showing?.key === n.key) return 'refresh';
  if (!showing || !showing.ttl) return 'show';
  // A deny answers a press; an urgent notice (a countdown) cannot wait behind a twelve-second line.
  return n.kind === 'deny' || n.urgent ? 'cut-in' : 'wait';
}
