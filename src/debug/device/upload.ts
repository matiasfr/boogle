// One way to our server: a device run's events as playdata batches (POST /playdata, text/plain so there is no
// preflight, keepalive so a closing tab still delivers). Sent in order, one at a time; a failed batch is retried three
// times with a growing wait and then waits for the card's "Retry" button, with the same batch number (readers drop
// repeats). Nothing is sent when VITE_BOOGLE_SERVER is unset. Local, debug only.
import type { PlayEvent } from '../../../server/src/playdata.ts';
import { playBatch } from './wire.ts';

export type UploadState = 'idle' | 'sending' | 'ok' | 'failed' | 'offline';
const BACKOFF_MS = [1000, 2000, 4000];

export function createUploader(session: string, onState: (s: UploadState, note: string) => void) {
  const server = import.meta.env.VITE_BOOGLE_SERVER;
  const clock = (ms = performance.now()) => Math.round(ms / 100) / 10;
  const waiting: string[] = []; // serialized batches, oldest first
  let next = 0;
  let chain: Promise<void> = Promise.resolve();
  let state: UploadState = server ? 'idle' : 'offline';
  const set = (s: UploadState, note = '') => onState((state = s), note);
  if (!server) set('offline', 'no server in this build');

  async function post(body: string): Promise<{ ok: boolean; note: string }> {
    try {
      const r = await fetch(new URL('/playdata', server), { method: 'POST', body, keepalive: true });
      return r.ok ? { ok: true, note: '' } : { ok: false, note: `the server answered ${r.status}` };
    } catch (e) {
      return { ok: false, note: e instanceof Error ? e.message : 'no answer' };
    }
  }

  async function drain() {
    while (waiting.length) {
      let result = await post(waiting[0]!);
      for (let i = 0; !result.ok && i < BACKOFF_MS.length; i++) {
        await new Promise((r) => setTimeout(r, BACKOFF_MS[i]));
        result = await post(waiting[0]!);
      }
      if (!result.ok) return set('failed', result.note);
      waiting.shift();
    }
    set('ok');
  }

  return {
    /** Queues events as one batch and sends what is waiting. */
    send(ev: PlayEvent[]) {
      if (!server || !ev.length) return;
      waiting.push(JSON.stringify(playBatch(session, next++, clock(), ev)));
      if (state !== 'failed') set('sending');
      chain = chain.then(() => (state === 'failed' ? undefined : drain()));
    },
    /** The "Retry" button. */
    retry() {
      if (state !== 'failed') return Promise.resolve();
      set('sending');
      chain = chain.then(drain);
      return chain;
    },
    /** Resolves when everything queued so far was sent or has failed. */
    settled: () => chain,
    state: () => state,
    pending: () => waiting.length,
  };
}
