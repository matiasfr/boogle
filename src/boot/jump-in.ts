// `?from=<stage>` (docs/plans/playtest-jump-in.md): before the game loads, ask the server for a fresh private room seeded
// at that stage, then boot into it. The address becomes `?room=<its name>`, so a reload re-enters the same room and
// never seeds again, and the Room page's invite link carries only the room. The server decides what may be seeded
// (server/src/jump.ts); this only asks. Loaded by ./index.ts only when the address has `from`.
import { JUMP_ADDRESS_ERROR, JUMP_DAY_ERROR, jumpOf, type JumpReply } from '../world/railway-jump.ts';
import { RAILWAY_PLAY_NS } from '../world/railway-namespace.ts';
import { splashNote } from './splash.ts';

/** A refusal: the HTTP status (0: no answer) and the server's `error`, which tells its 429s apart. */
type Refused = { status: number; error: string };

async function ask(stage: string): Promise<JumpReply | Refused> {
  const server = import.meta.env.VITE_BOOGLE_SERVER;
  try {
    if (!server) return { status: 0, error: '' };
    const r = await fetch(new URL('/jump', server), {
      method: 'POST',
      // text/plain JSON: no CORS preflight (the /report pattern)
      body: JSON.stringify({ stage, ns: RAILWAY_PLAY_NS }),
      signal: AbortSignal.timeout(90_000),
    });
    const body = (await r.json().catch(() => null)) as (JumpReply & { error?: unknown }) | null;
    if (!r.ok) return { status: r.status, error: typeof body?.error === 'string' ? body.error : '' };
    return typeof body?.room === 'string' ? body : { status: 500, error: '' };
  } catch (error) {
    console.warn('[jump-in] could not reach the server:', error);
    return { status: 0, error: '' };
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
  if ('status' in reply) return stuck(reply, label);
  const url = new URL(location.href);
  for (const key of ['from', 'room', 'fresh', 'coop']) url.searchParams.delete(key);
  url.searchParams.set('room', reply.room);
  history.replaceState(history.state, '', url);
  splashNote(null); // the ordinary loading steps from here
}

/** What the splash says for a refusal (server/src/jump.ts's statuses and errors). */
export function refusalLine({ status, error }: Refused, label: string): string {
  if (status === 409) return 'Boogle just updated. Reload to jump in.';
  if (status === 400) return `There's no jump-in called ${label}.`;
  if (status === 0) return "Couldn't reach the server.";
  if (status === 404) return "This server can't make jump-ins yet.";
  if (status === 507) return 'There are too many test rooms right now. Try again later.';
  if (status === 429 && error === JUMP_ADDRESS_ERROR) return "You've used today's jump-ins. Try again tomorrow.";
  if (status === 429 && error === JUMP_DAY_ERROR) return 'No more jump-ins today. Try again tomorrow.';
  if (status === 429) return 'Too many jump-ins at once. Try again in a minute.';
  return 'The server is busy. Try again in a moment.';
}

// A failed jump never boots: the reason, and three ways on.
function stuck(refused: Refused, label: string): Promise<never> {
  splashNote(refusalLine(refused, label));
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
