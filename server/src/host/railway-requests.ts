// A railway room's client actions (docs/plans/replication.md, R1a): sessions, ordering and acknowledgement on the
// room's ordered socket. An action applies the moment it arrives; the client hears `ack` (the highest request of its
// session applied) and `rej` (refused ones) on its next replication packet, and sees the result in the components.
//
//   client -> server  { t:'r:open' }                       open (or take over) this player's session: a new epoch
//                     { t:'r:edit', e:{ op, epoch, request, at, ms, ...fields } }
//   server -> client  { t:'r:session', to, epoch, next }   the session's identity; requests count up from next
//                     replication `ack` / `rej` [epoch, request, reason]:
//                       refused   validated and recorded as rejected (out of reach, too fast, malformed fields)
//                       session   not this socket's current session: reopen
//                       order     not the next request of the session: reopen
//                       starting / storage   the room cannot take actions yet (or lost its storage)
import { railInt, RAILWAY_MAX_INT, type RailAction } from '../../../src/sim/railway.ts';
import { RAIL_ACTIONS, type Actor, type RailwayApi } from '../../../src/world/railway-server.ts';
import type { Replicator } from '../../../src/world/replicate-server.ts';
import type { RailwayResponse } from '../../../src/world/railway-wire.ts';

type Obj = Record<string, unknown>;
type Session = { sid: string; epoch: number };
const object = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const token = (v: Obj) => railInt(v.epoch, RAILWAY_MAX_INT, 1) && railInt(v.request, RAILWAY_MAX_INT, 1);
/** Validation facts a client action carries (docs/plans/replication.md, revision 1): where the actor stood
 * (centimetres) and the client's action clock (ms). Judged while applying; never saved or replicated. */
export type ActorFacts = { pid: string; epoch: number; request: number; at: [number, number, number]; ms: number };
const position = (v: unknown): v is [number, number, number] =>
  Array.isArray(v) && v.length === 3 && v.every((n) => railInt(n, 200000, -200000));

/** The action as the rules see it: only this op's wire shape. The actor's `at`/`ms` are validation facts. */
export function railwayRequestEdit(e: Obj, epoch: number, request: number): RailAction {
  const clean: Obj = { op: e.op, epoch, request };
  if (e.op === 'rail.chop' || e.op === 'rail.take' || e.op === 'rail.mine') clean.id = e.id;
  if (e.op === 'rail.chop') {
    clean.yaw = e.yaw;
    clean.collapsed = e.collapsed;
  }
  if (e.op === 'rail.deposit') {
    clean.station = e.station;
    clean.n = e.n;
  }
  if (['rail.deposit', 'rail.drop', 'rail.take', 'rail.rackTake'].includes(String(e.op))) clean.kind = e.kind;
  if (['rail.beamTake', 'rail.beamDrop', 'rail.beamDeposit'].includes(String(e.op))) clean.revision = e.revision;
  if (e.op === 'rail.beamDeposit') clean.station = e.station;
  if (e.op === 'rail.beamDrop' || e.op === 'rail.drop') {
    clean.x = e.x;
    clean.y = e.y;
    clean.z = e.z;
  }
  if (e.op === 'rail.drop') clean.n = e.n;
  return clean as RailAction;
}

/** The fields an accepted action's effect event carries (the intent, the actor and the result). */
const EVENT_FIELDS = ['id', 'yaw', 'collapsed', 'station', 'n', 'kind', 'revision', 'x', 'y', 'z'] as const;

export function createRailwayRequests({
  api,
  pidOf,
  send,
  replication,
  available,
  unavailable,
  actor,
}: {
  api: RailwayApi;
  pidOf: (sid: string) => string | null;
  send: (message: RailwayResponse) => void;
  replication: Replicator;
  available: () => boolean;
  /** Why actions are not taken now: 'starting' or 'storage'. */
  unavailable: () => 'starting' | 'storage';
  /** The checks an action's facts allow, or null when they are malformed. */
  actor: (facts: ActorFacts) => Actor;
}) {
  const sessions = new Map<string, Session>();
  const rej = (sid: string, epoch: number, request: number, reason: string) => {
    if (replication.has(sid)) replication.reject(sid, epoch, request, reason);
  };
  const ack = (sid: string, epoch: number, request: number) => {
    if (replication.has(sid)) replication.ack(sid, epoch, request);
  };
  return {
    /** Only the room's actual departure/takeover calls this, never stale presence or a missed packet. */
    depart(sid: string) {
      for (const [pid, session] of sessions) {
        if (session.sid !== sid) continue;
        sessions.delete(pid);
        return { pid, epoch: session.epoch };
      }
      return null;
    },
    receive(message: unknown, from: string) {
      if (!object(message)) return;
      const pid = pidOf(from);
      if (!pid) return;
      const current = sessions.get(pid);
      if (message.t === 'r:open') {
        if (!available()) return; // the client asks again; nothing to settle yet
        if (current?.sid === from)
          return send({ t: 'r:session', to: from, epoch: current.epoch, next: 1 + (api.account(pid)?.request ?? 0) });
        // A new page (or a takeover): a new epoch retires whatever the old one had in flight.
        const epoch = (api.account(pid)?.epoch ?? 0) + 1;
        if (epoch > RAILWAY_MAX_INT || !api.session(pid, epoch)) return;
        sessions.set(pid, { sid: from, epoch });
        send({ t: 'r:session', to: from, epoch, next: 1 });
        return;
      }
      if (message.t !== 'r:edit' || !object(message.e) || !token(message.e)) return;
      const e = message.e;
      const epoch = e.epoch as number,
        request = e.request as number;
      if (!available()) return rej(from, epoch, request, unavailable());
      if (!current || current.sid !== from || current.epoch !== epoch) return rej(from, epoch, request, 'session');
      const account = api.account(pid)!;
      if (request <= account.request) {
        // Already settled (a resend): answer again from its recorded outcome.
        const old = api.outcome(pid, epoch, request);
        return old?.status === 'rejected' ? rej(from, epoch, request, 'refused') : ack(from, epoch, request);
      }
      if (request !== account.request + 1) return rej(from, epoch, request, 'order');
      const clean = railwayRequestEdit(e, epoch, request);
      // Every action carries its actor's position and action time; one without them is a recorded rejection.
      const facts: ActorFacts | null =
        position(e.at) && railInt(e.ms, RAILWAY_MAX_INT)
          ? { pid, epoch, request, at: [e.at[0], e.at[1], e.at[2]], ms: e.ms }
          : null;
      const result = api.act(pid, clean, RAIL_ACTIONS.has(String(e.op)) && facts ? actor(facts) : null);
      if (result.status === 'rejected') rej(from, epoch, request, 'refused');
      else ack(from, epoch, request);
      if (result.status === 'accepted' && result.accepted > 0) {
        const event: Record<string, string | number | boolean> = {
          op: clean.op,
          pid,
          epoch,
          request,
          accepted: result.accepted,
          tick: api.tick(),
        };
        for (const k of EVENT_FIELDS) {
          const v = (clean as Obj)[k];
          if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') event[k] = v;
        }
        replication.emit(event);
      }
    },
  };
}
