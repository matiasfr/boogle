// Bounded request coordination on the existing room transport, installed only in the isolated/playable T1 namespaces.
import { railInt, RAILWAY_MAX_INT, RAILWAY_WINDOW, type RailResult } from '../../../src/sim/railway.ts';
import type { RailwayApi } from '../../../src/world/rules/railway.ts';
import type { createSync } from '../../../src/world/sync.ts';
import type { RailwayResponse } from '../../../src/world/railway-wire.ts';

type Obj = Record<string, unknown>;
type Session = { sid: string; epoch: number; next: number; opening: boolean; pending: Set<number> };
const object = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const token = (v: Obj) => railInt(v.epoch, RAILWAY_MAX_INT, 1) && railInt(v.request, RAILWAY_MAX_INT, 1);

export function createRailwayRequests({
  sync,
  api,
  pidOf,
  send,
  available,
}: {
  sync: ReturnType<typeof createSync>;
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
      const allowed = ['rail.wake', 'rail.chop', 'rail.take', 'rail.rackTake', 'rail.drop', 'rail.deposit'].includes(
        String(e.op),
      );
      // Strip unrelated client fields so the bounded recovery tail contains only this op's wire shape.
      const clean: Obj = { op: e.op, epoch, request, i: 0, j: 0 };
      if (e.op === 'rail.chop' || e.op === 'rail.take') clean.id = e.id;
      if (e.op === 'rail.chop' && api.railway.falls) {
        clean.yaw = e.yaw;
        clean.collapsed = e.collapsed;
      }
      if (e.op === 'rail.deposit') {
        clean.station = e.station;
        clean.n = e.n;
      }
      if (e.op === 'rail.drop') {
        clean.x = e.x;
        clean.z = e.z;
        clean.n = e.n;
        if (api.railway.falls) clean.y = e.y;
      }
      const accepted = allowed && sync.receiveEdit(clean, from);
      if (!accepted && !sync.submitEdit({ op: 'rail.reject', i: 0, j: 0, pid, epoch, request })) {
        state(from, sync.worldStatus().recoveryError ? 'storage' : 'busy', e);
        return;
      }
      current.pending.add(request);
      current.next++;
    },
  };
}
