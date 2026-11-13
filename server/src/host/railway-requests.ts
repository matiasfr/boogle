// A railway room's client actions (docs/plans/replication.md, R1a): sessions, ordering and acknowledgement on the
// room's ordered socket. An action applies the moment it arrives; the client hears `ack` (the highest request of its
// session applied) and `rej` (refused ones) on its next replication packet, and sees the result in the components.
//
//   client -> server  { t:'r:open' }                       open (or take over) this player's session: a new epoch
//                     { t:'r:edit', e:{ op, epoch, request, at, ms, ...fields } }
//                     { t:'r:resync' }                     the mirror diverged: send me the whole state again
//   server -> client  { t:'r:session', to, epoch, next }   the session's identity; requests count up from next
//                     { t:'r:state', to, state, epoch?, request? }   sent at once, outside the room clock (which a
//                       storage failure or startup holds): 'starting' (not ready yet: ask again), 'storage' (the
//                       room lost its storage: stop), 'full' (no session for this player: the account cap)
//                     replication `ack` [epoch, request]: every request up to it is settled (applied or refused)
//                     replication `rej` [epoch, request, reason]:
//                       refused   validated and recorded as rejected (out of reach, too fast, malformed fields)
//                       session   not this socket's current session: reopen
//                       order     not the next request of the session: reopen
//                     replication `ok` [epoch, request, n]: an accepted request and what it moved, the answer to
//                       its actor's prediction (R1b, src/world/railway-predict.ts); the actor of a predicted op gets
//                       no event for it, everyone else does
//                     replication `ids` [['p:<epoch>:<request>', pileId]]: the pile an accepted drop landed in, for
//                       the actor's predicted pile
//                     a wake's `tk` (the tick its actor pressed at) sets its start, bounded by railWakeTick
import { railInt, RAILWAY_MAX_INT, type RailAction } from '../../../src/sim/railway.ts';
import { RAIL_ACTIONS, type Actor, type RailwayApi } from '../../../src/world/railway-server.ts';
import { railTempPile, RAIL_PREDICTED } from '../../../src/world/railway-predict.ts';
import type { Replicator } from '../../../src/world/replicate-server.ts';
import type { RailwayResponse } from '../../../src/world/railway-wire.ts';

type Obj = Record<string, unknown>;
type Session = { sid: string; epoch: number; clockStep: number };
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
  if (
    e.op === 'rail.chop' ||
    e.op === 'rail.take' ||
    e.op === 'rail.mine' ||
    e.op === 'rail.call' ||
    e.op === 'rail.strike' ||
    e.op === 'rail.grant' ||
    e.op === 'rail.gate'
  )
    clean.id = e.id;
  // The greybox route's frame feed names its leg (a RAIL_LEGS index); the rules validate it.
  if (e.op === 'rail.legStock') clean.leg = e.leg;
  if (e.op === 'rail.footTake') clean.rack = e.rack;
  if (e.op === 'rail.footSet') clean.site = e.site;
  if (e.op === 'rail.turn') clean.to = e.to;
  if (e.op === 'rail.call') clean.dir = e.dir;
  // A rider's ask names their train (docs/plans/generic-lines.md, 7); the rules validate it.
  if (e.op === 'rail.call' && e.train !== undefined) clean.train = e.train;
  if (e.op === 'rail.chop') {
    clean.yaw = e.yaw;
    clean.collapsed = e.collapsed;
  }
  if (e.op === 'rail.deposit') {
    clean.station = e.station;
    clean.n = e.n;
  }
  if (['rail.deposit', 'rail.drop', 'rail.take', 'rail.rackTake', 'rail.steelTake'].includes(String(e.op)))
    clean.kind = e.kind;
  if (e.op === 'rail.install') {
    clean.line = e.line;
    clean.part = e.part;
  }
  if (
    [
      'rail.beamTake',
      'rail.beamDrop',
      'rail.beamDeposit',
      'rail.boilerTake',
      'rail.boilerDrop',
      'rail.boilerFit',
      'rail.turn',
      'rail.brace',
      'rail.install',
    ].includes(String(e.op))
  )
    clean.revision = e.revision;
  if (e.op === 'rail.beamDeposit') clean.station = e.station;
  if (e.op === 'rail.beamDrop' || e.op === 'rail.boilerDrop' || e.op === 'rail.drop') {
    clean.x = e.x;
    clean.y = e.y;
    clean.z = e.z;
  }
  if (e.op === 'rail.drop') clean.n = e.n;
  // The tick the actor pressed wake at (R1b): only a well-formed one is kept; railWakeTick bounds it.
  if (e.op === 'rail.wake' && railInt(e.tk)) clean.tk = e.tk;
  return clean as RailAction;
}

/** The fields an accepted action's effect event carries (the intent and the actor; the count moved is `accepted`, a
 * felled tree's fall is in the state, and a kind of 0 is left out). */
const EVENT_FIELDS = [
  'id',
  'station',
  'kind',
  'revision',
  'x',
  'y',
  'z',
  'rack',
  'site',
  'to',
  'dir',
  'line',
  'part',
] as const;
/** What the result adds for effects (src/world/railway-predict.ts RailEffect), without what the intent already says:
 * a drop's pile stands at its x/y/z, and a take's pile is its id (its position still comes from here: it may be gone). */
const EFFECT_FIELDS = ['carried', 'level', 'pile', 'px', 'py', 'pz'] as const;
const implied = (op: string, k: (typeof EFFECT_FIELDS)[number]) =>
  (op === 'rail.drop' && (k === 'px' || k === 'py' || k === 'pz')) || (op === 'rail.take' && k === 'pile');

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
  // Room status goes out at once: the clock (and so the flush) is held while the room starts or after its storage
  // failed, and a client must hear that rather than wait.
  const state = (to: string, s: 'starting' | 'storage' | 'full', id?: { epoch: number; request: number }) =>
    send({ t: 'r:state', to, state: s, ...(id ?? {}) });
  // Every settled request is acknowledged; a refused one is also named, with its reason, and an accepted one with what
  // it moved (the actor's prediction is answered by this, not by its event).
  const settle = (sid: string, epoch: number, request: number, refused: boolean, moved: number) => {
    ack(sid, epoch, request);
    if (refused) rej(sid, epoch, request, 'refused');
    else if (moved > 0 && replication.has(sid)) replication.accepted(sid, epoch, request, moved);
  };
  return {
    /** Whether pid has a live session (its socket is here and has opened one). */
    active: (pid: string) => sessions.has(pid),
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
      if (message.t === 'r:clock') {
        const step = api.step();
        if (!available() || current?.sid !== from || !railInt(message.at) || step < current.clockStep) return;
        current.clockStep = step + 6; // at most ten replies/second/session, independent of the echoed client clock
        send({ t: 'r:clock', to: from, at: message.at, step });
        return;
      }
      if (message.t === 'r:resync') {
        // Whole state again, from change tick -1; the mirror reset itself before asking.
        if (replication.has(from)) replication.resync(from);
        return;
      }
      if (message.t === 'r:open') {
        if (!available()) return state(from, unavailable());
        const account = api.account(pid);
        if (current?.sid === from && account)
          return send({ t: 'r:session', to: from, epoch: current.epoch, next: 1 + account.request });
        // A new page, a takeover, or a session whose account a load replaced: a new epoch retires whatever the old
        // one had in flight.
        const epoch = (account?.epoch ?? 0) + 1;
        if (epoch > RAILWAY_MAX_INT || !api.session(pid, epoch)) return state(from, 'full');
        sessions.set(pid, { sid: from, epoch, clockStep: 0 });
        send({ t: 'r:session', to: from, epoch, next: 1 });
        return;
      }
      // A non-string op is malformed, dropped like a missing token: nothing below may coerce a wire object.
      if (message.t !== 'r:edit' || !object(message.e) || !token(message.e) || typeof message.e.op !== 'string') return;
      const e = message.e;
      const epoch = e.epoch as number,
        request = e.request as number;
      if (!available()) return state(from, unavailable(), { epoch, request });
      if (!current || current.sid !== from || current.epoch !== epoch) return rej(from, epoch, request, 'session');
      const account = api.account(pid);
      // A session whose account is gone (a load replaced the accounts): refused with no change, and dropped so the
      // client's reopen makes a fresh one.
      if (!account) {
        sessions.delete(pid);
        return rej(from, epoch, request, 'session');
      }
      if (request <= account.request) {
        // Already settled (a resend): answer again from its recorded outcome.
        const old = api.outcome(pid, epoch, request);
        return settle(from, epoch, request, old?.status === 'rejected', old?.status === 'accepted' ? old.accepted : 0);
      }
      if (request !== account.request + 1) return rej(from, epoch, request, 'order');
      const clean = railwayRequestEdit(e, epoch, request);
      // Every action carries its actor's position and action time; one without them is a recorded rejection.
      const facts: ActorFacts | null =
        position(e.at) && railInt(e.ms, RAILWAY_MAX_INT)
          ? { pid, epoch, request, at: [e.at[0], e.at[1], e.at[2]], ms: e.ms }
          : null;
      const result = api.act(pid, clean, RAIL_ACTIONS.has(String(e.op)) && facts ? actor(facts) : null);
      settle(from, epoch, request, result.status === 'rejected', result.accepted);
      if (result.effect) {
        const event: Record<string, string | number | boolean> = {
          op: clean.op,
          pid,
          request,
          accepted: result.accepted,
        };
        for (const k of EVENT_FIELDS) {
          const v = (clean as Obj)[k];
          if ((typeof v === 'number' && !(k === 'kind' && v === 0)) || typeof v === 'string') event[k] = v;
        }
        for (const k of EFFECT_FIELDS)
          if (typeof result.effect[k] === 'number' && !implied(clean.op, k)) event[k] = result.effect[k]!;
        // The actor showed a predicted action on its press: its `ok` answers it, and it needs no echo.
        replication.emit(event, RAIL_PREDICTED.has(clean.op) ? from : undefined);
        // The actor predicted this drop's pile under a temporary id (R1b): name the server's.
        if (clean.op === 'rail.drop' && result.effect.pile !== undefined && replication.has(from))
          replication.remap(from, railTempPile(epoch, request), result.effect.pile);
      }
    },
  };
}
