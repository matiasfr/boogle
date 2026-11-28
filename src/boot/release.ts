import { BUILD_ID, REQUIRED_SERVER } from '../build-id.ts';
import { WORLD_NS } from '../world/namespace.ts';
import { retryGuestRegistration } from '../player/account.ts';

const enabled = !!BUILD_ID && !BUILD_ID.startsWith('dev') && !!REQUIRED_SERVER;
const site = () => new URL(import.meta.env.BASE_URL + 'version.json', location.href);
const host = () => new URL('/version', import.meta.env.VITE_BOOGLE_SERVER);
const read = async (url: URL) => {
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
  if (!response.ok) throw new Error('release identity unavailable');
  return response.json() as Promise<{ build: string; serverBuild?: string; world?: string }>;
};
let timer: ReturnType<typeof setTimeout>;
let checking = false;
let navigating = false;
let notice: HTMLDialogElement | undefined;
let shown = 0;
let stopInput = () => {};
let displaced = () => false;

function pause(wipe: boolean) {
  if (!notice) {
    shown = Date.now();
    notice = document.createElement('dialog');
    document.body.append(notice);
    notice.addEventListener('cancel', (event) => event.preventDefault());
    notice.showModal();
    stopInput();
  }
  notice.textContent = wipe ? 'A new island is starting…' : 'Updating Boogle…';
}

// If a CDN serves yesterday's HTML after publishing its new manifest, retry the navigation
// at a bounded rate. A failed attempt must never permanently suppress the next one.
async function reload(target: string, serverBuild: string, legacy: boolean) {
  // Pages can publish its manifest before the matching HTML reaches this edge. Check the
  // navigation URL before leaving the notice. This GET never executes a jump-in.
  const response = await fetch(location.href, { cache: 'reload', signal: AbortSignal.timeout(4000) });
  if (!response.ok) return;
  const shell = new DOMParser().parseFromString(await response.text(), 'text/html');
  const meta = (name: string) => shell.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content;
  const shellHost = meta('boogle-server-build');
  if (
    meta('boogle-build') !== target ||
    (shellHost !== serverBuild && !(legacy && shellHost === undefined)) ||
    displaced()
  )
    return;
  const key = 'boogle-release-retry';
  try {
    const last = Number(sessionStorage.getItem(key + target));
    if (Date.now() - last < 10000) return;
    sessionStorage.setItem(key + target, String(Date.now()));
  } catch {
    /* storage can be disabled */
  }
  navigating = true;
  location.reload();
}

export async function checkRelease() {
  if (!enabled || checking || navigating || displaced()) return;
  clearTimeout(timer);
  checking = true;
  try {
    const [page, server] = await Promise.all([read(site()), read(host())]);
    if (displaced()) return;
    const pageChanged = page.build !== BUILD_ID;
    const hostChanged = server.build !== REQUIRED_SERVER || server.world !== WORLD_NS;
    // Pages often lands minutes before Fly. The current room is still safe while its host matches.
    const legacy = page.world === undefined;
    const ready = !!server.build && page.serverBuild === server.build && (legacy || page.world === server.world);
    if ((pageChanged && ready) || hostChanged || notice) {
      pause((!!page.world && page.world !== WORLD_NS) || (!!server.world && server.world !== WORLD_NS));
      if (page.build && ready && Date.now() - shown >= 2000) await reload(page.build, server.build, legacy);
    } else if (ready) await retryGuestRegistration();
  } catch {
    /* keep the current room through a transient status outage */
  } finally {
    checking = false;
    timer = setTimeout(() => void checkRelease(), notice ? 2000 : 30000);
  }
}

export function releaseMismatch() {
  if (!enabled || displaced()) return;
  pause(false);
  void checkRelease();
}

export const roomRelease = enabled
  ? { serverBuild: REQUIRED_SERVER, world: WORLD_NS, onMismatch: releaseMismatch, checkHost: hostMatchesPage }
  : undefined;

// Also protects the initial rollout when an older host does not understand the socket query.
export async function hostMatchesPage() {
  if (!enabled) return true;
  const server = await read(host());
  if (server.build === REQUIRED_SERVER && server.world === WORLD_NS) return true;
  releaseMismatch();
  return false;
}

export function watchRelease(stop: () => void, elsewhere: () => boolean) {
  stopInput = stop;
  displaced = elsewhere;
  if (!enabled) return;
  if (notice) stop();
  void checkRelease();
  document.addEventListener('visibilitychange', () => void checkRelease());
  window.addEventListener('pageshow', () => {
    navigating = false;
    void checkRelease();
  });
}
