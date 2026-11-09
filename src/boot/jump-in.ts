// `?from=<stage>` (docs/plans/playtest-jump-in.md): before the game loads, ask the server for a fresh private room seeded
// at that stage, then boot into it. The address becomes `?room=<its name>`, so a reload re-enters the same room and
// never seeds again, and the Room page's invite link carries only the room. The server decides what may be seeded
// (server/src/jump.ts); this only asks. Loaded by ./index.ts only when the address has `from`.
import { jumpOf, type JumpReply } from '../world/railway-jump.ts';
import { RAILWAY_PLAY_NS } from '../world/railway-namespace.ts';
import { splashNote } from './splash.ts';

/** The launching tab's record, for the splash text only (the landing reads the room's seed). */
export const JUMP_KEY = 'boogle.jump.v1';

async function ask(stage: string): Promise<JumpReply | number> {
  const server = import.meta.env.VITE_BOOGLE_SERVER;
  try {
    if (!server) return 0;
    const r = await fetch(new URL('/jump', server), {
      method: 'POST',
      // text/plain JSON: no CORS preflight (the /report pattern)
      body: JSON.stringify({ stage, ns: RAILWAY_PLAY_NS }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!r.ok) return r.status;
    const reply = (await r.json()) as JumpReply;
    return typeof reply?.room === 'string' ? reply : 500;
  } catch (error) {
    console.warn('[jump-in] could not reach the server:', error);
    return 0;
  }
}

export async function jumpIn(stage: string) {
  if (new URLSearchParams(location.search).has('proto')) {
    console.warn('[jump-in] ?from= opens the current game only; ignored with ?proto=');
    return;
  }
  const label = jumpOf(stage)?.label ?? stage;
  splashNote(`Setting up ${label}…`);
  const reply = await ask(stage);
  if (typeof reply === 'number') return stuck(reply, label);
  try {
    sessionStorage.setItem(JUMP_KEY, JSON.stringify({ room: reply.room, stage: reply.stage }));
  } catch {
    // Blocked storage only loses the record; the room's seed still lands everyone.
  }
  const url = new URL(location.href);
  for (const key of ['from', 'room', 'fresh', 'coop']) url.searchParams.delete(key);
  url.searchParams.set('room', reply.room);
  history.replaceState(history.state, '', url);
  splashNote(null); // the ordinary loading steps from here
}

// A failed jump never boots: the reason, and three ways on.
function stuck(status: number, label: string): Promise<never> {
  splashNote(
    status === 409
      ? 'Boogle just updated. Reload to jump in.'
      : status === 400
        ? `There's no jump-in called ${label}.`
        : status === 0
          ? "Couldn't reach the server."
          : 'The server is busy. Try again in a moment.',
  );
  const actions = document.createElement('div');
  actions.className = 'splash-actions';
  const go = (text: string, run: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.addEventListener('click', run);
    actions.append(b);
  };
  go('Try again', () => location.reload());
  go('From the beginning', () => location.assign('/?from=start'));
  go('The shared island', () => location.assign('/'));
  document.querySelector('.splash-foot')?.append(actions);
  return new Promise<never>(() => {});
}
