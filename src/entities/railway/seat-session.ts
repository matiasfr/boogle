// Reversible seat prediction over the server command boundary. The adapter owns request retries; this owner
// reconciles the displayed chair with a complete seat mirror once a second, including after a fresh server.
import type { RailwayAdapter, CommandAccepted, CommandRefusal } from '../../adapters/railway-session.ts';
import type { SeatSit } from '../../sim/seats.ts';

export function createSeatSession(
  session: RailwayAdapter,
  seats: { seatOf(pid: string): string | null },
  now: () => number,
  correct: { move(id: string): void; taken(): void },
) {
  let desired: SeatSit | null = null;
  let pending: { epoch: number; request: number } | null = null;
  let sentAt = -Infinity;
  let retry = false;
  const matches = (e: CommandAccepted | CommandRefusal) => pending?.epoch === e.epoch && pending.request === e.request;
  const send = () => {
    sentAt = now();
    const request = session.act(desired ? 'seat.sit' : 'seat.stand', desired ?? {});
    pending = request === false ? null : { epoch: session.read.debug().epoch, request };
  };
  const move = (id: string) => {
    if (!desired || desired.id === id) return;
    // Keep the original reachable group for a later reclaim, including the original chair if it frees up.
    desired = { id, alt: [desired.id, ...(desired.alt ?? [])].filter((other) => other !== id).slice(0, 7) };
    correct.move(id);
  };
  const off = [
    session.onAccepted((e) => {
      if (!matches(e)) return;
      pending = null;
      retry = false;
      const id = seats.seatOf(session.read.pid);
      if (id) move(id);
    }, 'command'),
    session.onRefused((e) => {
      if (!matches(e)) return;
      pending = null;
      retry = desired !== null;
      if (e.reason === 'taken' && desired) {
        desired = null;
        retry = false;
        correct.taken();
      }
      // Rate, lost receipts and session changes never undo a predicted sit. The next reconciliation retries it.
    }, 'command'),
    session.onReset(() => {
      pending = null;
      retry = false;
    }),
  ];
  return {
    sit(fields: SeatSit) {
      desired = { id: fields.id, alt: fields.alt?.slice() };
      retry = true;
      send();
    },
    stand() {
      desired = null;
      retry = false;
      send();
    },
    pending: () => (pending ? { ...pending } : null),
    update() {
      if (pending || !session.read.ready() || now() - sentAt < 1000) return;
      sentAt = now();
      const id = seats.seatOf(session.read.pid);
      if (desired) {
        if (retry || !id) send();
        else move(id);
      } else if (id) send();
    },
    dispose() {
      for (const stop of off) stop();
    },
  };
}
