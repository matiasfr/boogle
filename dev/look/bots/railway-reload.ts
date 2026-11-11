// Run through the existing look eval/until hooks; sessionStorage carries observations, never game state.
import { background } from '../../../src/async.ts';
import { inspectRailway, piles, railCounts, railCurrentJob, railRead, rw, trees } from '../rail-read.ts';
import { me } from '../../../src/player/player.ts';
import { identity } from '../../../src/player/identity.ts';
import { net } from '../../../src/netplay/net.ts';
import { fallArrival } from '../../../src/fall/arrival.ts';
import { createBrowserRailwayProfile } from '../../../src/railway-profile-browser.ts';
import { makeBot } from '../bot.ts';
import { play } from './railway.ts';

const KEY = 'look.railway-reload';
let started = false;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
function check(ok: unknown, label: string) {
  if (!ok) throw new Error(label);
  console.log(`RAILWAY RECOVERY PASS ${label}`);
}
async function until(ok: () => unknown, label: string, ms = 60000) {
  const end = performance.now() + ms;
  while (!ok() && performance.now() < end) await wait(50);
  check(ok(), label);
}
/** The view's and the session's own fields: the reward, the scene. */
function read() {
  const state = inspectRailway();
  if (!state) throw new Error('Missing railway view');
  return state;
}
const ready = () => !!railRead()?.ready();
/** T1 stations laid: railCounts' completion is the sum over the line's jobs. */
const completion = () => railCounts(rw()).completion;
/** Every material balance, as rows read now: the trees' wood and work, the piles, the conserved counts and the
 * active station's stock (compared across a reload, so only the two sides' sameness matters). */
function balances() {
  const w = rw();
  const { job, run } = railCurrentJob(w);
  return JSON.stringify({
    sources: trees(w).map((t) => t.left),
    work: trees(w).map((t) => t.work),
    piles: piles(w),
    counts: railCounts(w),
    stock: job.stock,
    allocation: run.allocation,
    used: run.used,
    delivered: job.delivered,
    completion: railCounts(w).completion,
  });
}
type Saved = { stage: 'unopened' | 'claimed'; pid: string; balances: string; x: number; z: number; session: string };
async function reload(stage: Saved['stage']) {
  await wait(5500); // Let the ordinary safe-ground pose writer run; do not seed or edit its save.
  const p = me.body!.position;
  const saved: Saved = { stage, pid: identity.pid, balances: balances(), x: p.x, z: p.z, session: net.room!.selfId };
  console.log(`RAILWAY RELOAD BEFORE ${JSON.stringify({ ...saved, state: read() })}`);
  sessionStorage.setItem(KEY, JSON.stringify(saved));
  location.reload();
}
async function locks() {
  // A separate actual tab shares the browser profile. This diagnostic pid keeps contract fixtures out of the player's hat.
  const tab = window.open('about:blank', 'railway-lock-proof');
  if (!tab) throw new Error('Browser refused the same-profile lock proof tab');
  const pid = 'railwaylockproof';
  const profile = createBrowserRailwayProfile(pid, ['hat']);
  const entitlement = { world: 'look-verified-t1', station: 'T1' as const, completion: 1 as const };
  check(ready() && completion() === 1, 'lock fixture runs only after verified real-input T1 completion');
  try {
    check(localStorage.getItem(profile.key) === null, 'lock fixture starts empty');
    let release!: () => void;
    const held = navigator.locks.request(
      profile.key,
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    await until(() => !!release, 'first tab holds the profile Web Lock');
    const fromOther = (tab as Window & typeof globalThis)
      .eval(`import(${JSON.stringify(`${location.origin}/src/railway-profile-browser.ts`)})
      .then(m => m.createBrowserRailwayProfile(${JSON.stringify(pid)}, ['hat']).claim(${JSON.stringify(entitlement)}, 'hat'))`) as Promise<{
      status: string;
    }>;
    const fromHere = profile.claim(entitlement, 'hat');
    let queued = 0;
    for (let attempt = 0; attempt < 100; attempt++) {
      queued = (await navigator.locks.query()).pending?.filter((row) => row.name === profile.key).length ?? 0;
      if (queued === 2) break;
      await wait(50);
    }
    const before = localStorage.getItem(profile.key);
    release();
    await held;
    const results = await Promise.all([fromOther, fromHere]);
    check(queued === 2 && before === null, 'both tabs queue behind the same exclusive lock without writing');
    check(
      results
        .map((r) => r.status)
        .sort()
        .join() === 'accepted,claimed',
      'two browser tabs accept one claim',
    );
    check(
      profile.read().claims.length === 1 && profile.read().claims[0]?.cosmetic === 'hat',
      'claim and cosmetic persist together once',
    );
    console.log(`RAILWAY LOCK PROOF ${JSON.stringify({ queued, results, profile: profile.read() })}`);
  } finally {
    tab.close();
  }
}
async function run() {
  await until(() => ready() && me.body && !fallArrival.active && me.coyote > 0, 'verified dry arrival', 300000);
  const saved = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Saved | null;
  if (!saved) {
    // Drop and reconnect inside serveSnapshot's throttle window, then let the ordinary real-input bot play.
    net.room!.pause(50);
    await until(() => !ready(), 'disconnect gates railway input');
    await until(() => ready(), 'quick socket reconnect restores verified railway');
    await play({ stopBeforeReward: true });
    check(completion() === 1 && !read().reward.claimed, 'completed T1 has an unopened personal reward');
    await locks();
    await reload('unopened');
    return;
  }
  check(
    identity.pid === saved.pid && net.room!.selfId !== saved.session,
    `${saved.stage}: new page session retains player identity`,
  );
  check(balances() === saved.balances, `${saved.stage}: full reload preserves all material balances`);
  const distance = Math.hypot(me.body!.position.x - saved.x, me.body!.position.z - saved.z);
  check(distance < 1 && !me.swimming, `${saved.stage}: safe-ground return within one metre (${distance.toFixed(3)} m)`);
  check(
    read().reward.multiReveals === 0 && read().reward.revealCount === 0 && !read().reward.showing,
    `${saved.stage}: reconstruction replays no reward reveals`,
  );
  console.log(`RAILWAY RELOAD AFTER ${JSON.stringify({ stage: saved.stage, distance, state: read() })}`);
  if (saved.stage === 'unopened') {
    check(!read().reward.claimed && read().reward.visible, 'unopened reward remains available after reload');
    const bot = makeBot({
      recover: () => {
        throw new Error('Reload proof required relocation');
      },
    });
    const reward = read().reward;
    check(await bot.use(reward.x, reward.z, 'open after reload', /^Open/), 'returning player opens the real reward');
    await until(
      () => read().reward.claimed && read().reward.owned && read().reward.revealCount === 1,
      'returned reward grants exactly once',
    );
    await wait(1600);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
    await until(() => !read().reward.showing, 'returned reward dismisses');
    await reload('claimed');
    return;
  }
  check(
    read().reward.claimed && read().reward.owned && read().reward.claims === 1,
    'claimed reward and hat survive second full reload',
  );
  const before = balances();
  net.room!.pause(2500);
  await until(() => !ready(), 'completed-room departure gates input');
  await until(() => ready(), 'completed-room rejoin restores verified railway');
  check(
    balances() === before && read().reward.revealCount === 0,
    'departure and rejoin preserve balances without reward replay',
  );
  document.documentElement.dataset.railwayRecovery = 'done';
  console.log('RAILWAY RECOVERY DONE');
}
export function start() {
  if (started) return;
  started = true;
  background(
    run().catch((error: unknown) => {
      document.documentElement.dataset.railwayRecovery = 'failed';
      throw error;
    }),
    'railway reload proof',
  );
}
