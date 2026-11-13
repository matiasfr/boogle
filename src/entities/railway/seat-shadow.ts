// Shadow commands only: receipts confirm the transient server claim, never the visible pose or lead grant.
import type { RailwayAdapter, CommandAccepted, CommandRefusal } from '../../adapters/railway-session.ts';
import type { SeatSit } from '../../sim/seats.ts';

export function createSeatShadow(session: RailwayAdapter, now: () => number) {
  let desired: SeatSit | null = null;
  let settled = true;
  let pending: { epoch: number; request: number } | null = null;
  let sentAt = -Infinity;
  const matches = (e: CommandAccepted | CommandRefusal) => pending?.epoch === e.epoch && pending.request === e.request;
  const send = () => {
    sentAt = now();
    const request = session.act(desired ? 'seat.sit' : 'seat.stand', desired ?? {});
    pending = request === false ? null : { epoch: session.read.debug().epoch, request };
  };
  const off = [
    session.onAccepted((e) => {
      if (!matches(e)) return;
      pending = null;
      settled = true;
    }, 'command'),
    session.onRefused((e) => {
      if (!matches(e)) return;
      pending = null;
      // A taken chair ends this shadow claim. Rate/unknown stay local and retry; an empty stand is already done.
      settled = e.reason === 'taken' || e.reason === 'refused';
    }, 'command'),
    session.onReset(() => {
      if (desired) settled = false;
    }), // a new whole mirror can follow a server restart; an idle client has nothing to reclaim
  ];
  return {
    sit(fields: SeatSit) {
      desired = { id: fields.id, alt: fields.alt?.slice() };
      settled = false;
      send();
    },
    stand() {
      desired = null;
      settled = false;
      send();
    },
    update() {
      // The adapter owns retransmission of an outstanding request. Never fill its eight-slot window with retries.
      if (!settled && !pending && session.read.ready() && now() - sentAt >= 1000) send();
    },
    dispose() {
      for (const stop of off) stop();
    },
  };
}
