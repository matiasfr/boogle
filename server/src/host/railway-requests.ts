// Bounded request coordination on the existing room transport, installed only in the isolated/playable T1 namespaces.
import { railInt, RAILWAY_MAX_INT, RAILWAY_WINDOW, type RailResult } from '../../../src/sim/railway.ts';
import type { RailwayApi } from '../../../src/world/rules/railway.ts';
import type { createSync } from '../../../src/world/sync.ts';
import type { RailwayResponse } from '../../../src/world/railway-wire.ts';

type Obj = Record<string, unknown>;
type Session = { sid: string; epoch: number; next: number; opening: boolean; pending: Set<number> };
const object = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const token = (v: Obj) => railInt(v.epoch, RAILWAY_MAX_INT, 1) && railInt(v.request, RAILWAY_MAX_INT, 1);
/** Validation facts a client action carries (docs/plans/replication.md, revision 1): where the actor stood
 * (centimetres) and the client's action clock (ms). Judged while stamping; never saved or broadcast. */
export type ActorFacts = { pid: string; epoch: number; request: number; at: [number, number, number]; ms: number };
const position = (v: unknown): v is [number, number, number] =>
  Array.isArray(v) && v.length === 3 && v.every((n) => railInt(n, 200000, -200000));

/** The edit a client request stamps, saves and broadcasts: only this op's wire shape, so the bounded recovery tail
 * never holds unrelated client fields. The actor's `at`/`ms` are validation facts and are left out. */
export function railwayRequestEdit(e: Obj, epoch: number, request: number, room: { falls: boolean; line: boolean }) {
  const clean: Obj = { op: e.op, epoch, request, i: 0, j: 0 };
  if (e.op === 'rail.chop' || e.op === 'rail.take' || e.op === 'rail.mine') clean.id = e.id;
  if (e.op === 'rail.chop' && room.falls) {
    clean.yaw = e.yaw;
    clean.collapsed = e.collapsed;
  }
  if (e.op === 'rail.deposit') {
    clean.station = e.station;
    clean.n = e.n;
  }
  if (room.line && ['rail.deposit', 'rail.drop', 'rail.take', 'rail.rackTake'].includes(String(e.op)))
    clean.kind = e.kind;
  if (['rail.beamTake', 'rail.beamDrop', 'rail.beamDeposit'].includes(String(e.op))) clean.revision = e.revision;
  if (e.op === 'rail.beamDeposit') clean.station = e.station;
  if (e.op === 'rail.beamDrop') {
    clean.x = e.x;
    clean.y = e.y;
    clean.z = e.z;
  }
  if (e.op === 'rail.drop') {
    clean.x = e.x;
    clean.z = e.z;
    clean.n = e.n;
    if (room.falls) clean.y = e.y;
  }
  return clean;
}

export function createRailwayRequests({
  sync,
  api,
  pidOf,
  send,
  available,
  withActor,
}: {
  sync: ReturnType<typeof createSync>;
  /** Runs the stamp with these facts visible to the host's railReach/railCadence/railHeight. */
  withActor: <T>(facts: ActorFacts, fn: () => T) => T;
  api: RailwayApi;
  pidOf: (sid: string) => string | null;
  send: (message: RailwayResponse) => void;
  available: () => boolean;
}) {
  const sessions = new Map<string, Session>();
  const state = (to: string, status: Extract<RailwayResponse, { t: 'r:state' }>['state'], identity?: Obj) =>
    send({
      t: 'r:state',
      to,
      state: status,
      ...(identity && token(identity) ? { epoch: identity.epoch as number, request: identity.request as number } : {}),
    });
  const answer = (to: string, result: RailResult) => send({ t: 'r:result', to, ...result });
  const sessionAnswer = (s: Session) => send({ t: 'r:session', to: s.sid, epoch: s.epoch, next: s.next });

  sync.onApplied((e: Obj, _tick: number, result: unknown) => {
    if (e.op === 'rail.session') {
      const s = sessions.get(String(e.pid));
      if (!s || s.epoch !== e.epoch) return;
      if (result !== true) {
        sessions.delete(String(e.pid));
        state(s.sid, 'invalid');
        return;
      }
      s.opening = false;
      sessionAnswer(s);
      return;
    }
    if (!object(result) || !token(result) || typeof result.pid !== 'string') return;
    const s = sessions.get(result.pid);
    if (!s || s.epoch !== result.epoch) return;
    s.pending.delete(result.request as number);
    // The stamp was durable before application; this terminal result is reproducible from its saved tail.
    answer(s.sid, result as RailResult);
  });

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
      if (!available()) {
        state(from, sync.worldStatus().recoveryError ? 'storage' : 'starting', object(message.e) ? message.e : message);
        return;
      }
      const current = sessions.get(pid);
      if (message.t === 'r:open') {
        if (current?.sid === from) {
          if (current.opening) state(from, 'starting');
          else sessionAnswer(current);
          return;
        }
        // Takeover retires the prior outstanding window. Already stamped edits retain their stored order.
        if (current?.opening) {
          state(from, 'busy');
          return;
        }
        const epoch = (api.account(pid)?.epoch ?? 0) + 1;
        if (!sync.submitEdit({ op: 'rail.session', i: 0, j: 0, pid, epoch })) {
          state(from, 'busy');
          return;
        }
        sessions.set(pid, { sid: from, epoch, next: 1, opening: true, pending: new Set() });
        return;
      }
      if (!current || current.sid !== from || current.opening) {
        state(from, 'snapshot-required');
        return;
      }
      if (message.t === 'r:status') {
        if (!token(message)) {
          state(from, 'invalid');
          return;
        }
        const result = api.outcome(pid, message.epoch as number, message.request as number);
        if (result) answer(from, result);
        else state(from, 'busy', message);
        return;
      }
      if (message.t !== 'r:edit' || !object(message.e) || !token(message.e)) {
        state(from, 'invalid');
        return;
      }
      const e = message.e;
      const epoch = e.epoch as number,
        request = e.request as number;
      const old = api.outcome(pid, epoch, request);
      if (old) {
        answer(from, old);
        return;
      }
      if (epoch !== current.epoch) {
        state(from, 'snapshot-required', e);
        return;
      }
      if (current.pending.has(request)) {
        state(from, 'busy', e);
        return;
      }
      if (request !== current.next) {
        // A durable write can refuse an earlier token in this same ordered pipeline. Later tokens
        // need to retry too; a snapshot cannot admit the missing token and only stalls those retries.
        const waiting = request > current.next && request < current.next + RAILWAY_WINDOW;
        state(from, waiting ? 'busy' : 'snapshot-required', e);
        return;
      }
      if (current.pending.size >= RAILWAY_WINDOW) {
        state(from, 'busy', e);
        return;
      }
      // Host-only ops cannot enter through a material request. Invalid material requests become durable rejections.
      const ordinary = ['rail.wake', 'rail.chop', 'rail.take', 'rail.rackTake', 'rail.drop', 'rail.deposit'];
      const lineOps = [
        'rail.mine',
        'rail.axe',
        'rail.beamChop',
        'rail.beamTake',
        'rail.beamDrop',
        'rail.beamDeposit',
        'rail.jump',
        'rail.forgeTake',
        'rail.depotTake',
        'rail.lever',
        'rail.hook',
      ];
      const allowed = ordinary.includes(String(e.op)) || (!!api.railway.line && lineOps.includes(String(e.op)));
      const clean = railwayRequestEdit(e, epoch, request, { falls: !!api.railway.falls, line: !!api.railway.line });
      // Every client action carries its actor's position and action time; one without them is an invalid request.
      const facts: ActorFacts | null =
        position(e.at) && railInt(e.ms, RAILWAY_MAX_INT)
          ? { pid, epoch, request, at: [e.at[0], e.at[1], e.at[2]], ms: e.ms }
          : null;
      const accepted = allowed && !!facts && withActor(facts, () => sync.receiveEdit(clean, from));
      if (!accepted && !sync.submitEdit({ op: 'rail.reject', i: 0, j: 0, pid, epoch, request })) {
        state(from, sync.worldStatus().recoveryError ? 'storage' : 'busy', e);
        return;
      }
      current.pending.add(request);
      current.next++;
    },
  };
}
