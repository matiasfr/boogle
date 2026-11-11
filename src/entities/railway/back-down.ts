// Putting your back down in one press (docs/brainstorms/station-deposit.md build 0, docs/game-design/place.md "Setting
// the load down"). Composed on the client from the ops that exist: `rail.drop` for every pile (it takes up to 8 a pile,
// so a full back of 16 is two), then whatever the press was for. The host applies them in order; nothing new is on the
// wire. Used by hold Drop (sources.ts) and by shouldering a footing, the great beam or the boiler with a loaded back.
import type { RailwayAdapter, RailwayInspection } from '../../adapters/railway.ts';
import { me } from '../../player/player.ts';
import { heldId } from '../../player/inventory.ts';
import { PLAYER_R } from '../../constants.ts';
import { plan, type Pile } from './back-down-plan.ts';
import { account, beam, boiler, piles, type ReadWorld } from '../../sim/railway-rows.ts';

/** How far from you the set-down lands, and the gap between neighbouring piles. */
const REACH = 1.5,
  GAP = 1.0;

let groundAt: ((x: number, z: number) => number) | null = null;
/** The terrain height, once it has loaded (sources.ts); until then a pile lands at your feet's height. */
export const useGround = (fn: (x: number, z: number) => number) => void (groundAt = fn);

/** Logs, stone and rails on your back (what a set-down moves), per pile kind 0, 1, 2. */
export const loadOf = (s: RailwayInspection): [number, number, number] => [
  s.availableCarry,
  s.availableStone,
  s.availableRails,
];
/** The same load, read off the rows (logs, stone, rails on `pid`'s back; your pending actions are in the predicted
 * world already). The other groups' callers still pass an inspection to `loadOf`; they move here with their group. */
export const loadIn = (w: ReadWorld, pid: string): [number, number, number] => {
  const a = account(w, pid);
  return [a?.carry ?? 0, a?.stone ?? 0, a?.rails ?? 0];
};
const total = (w: ReadWorld, pid: string) => loadIn(w, pid).reduce((a, b) => a + b, 0);

/** The only thing between you and a big load is a load of logs, stone or rails: no footing, great beam or boiler on
 * your back, nothing in your hand. (Those cases stay refused: "Empty your back first" is reachable only there.) */
export const onlyALoad = (s: RailwayInspection, hand = true) =>
  loadOf(s).some((n) => n > 0) &&
  !s.foot &&
  s.beam?.holder !== s.pid &&
  s.line2.boiler.holder !== s.pid &&
  (!hand || !heldId());

/** `onlyALoad` on the rows. */
export const onlyALoadIn = (w: ReadWorld, pid: string, hand = true) =>
  total(w, pid) > 0 &&
  !account(w, pid)?.foot &&
  beam(w).holder !== pid &&
  boiler(w).holder !== pid &&
  (!hand || !heldId());

let busy = false,
  after: (() => void) | null = null;
/** Between two drops (the host's unloadMs is 90 ms), and the longest to wait for the host to settle them. */
const DROP_GAP_MS = 100,
  WAIT_MS = 2000;
const cm = (m: number) => Math.round(m * 100) || 0;

/** Put everything on your back down as tidy piles by your feet (`away`: a point to put your back to, the big thing
 * you are about to take, so the pile lands on the other side of you and not under its prompt). True when every drop
 * was taken by the rule now (the rest follow 100 ms apart); false when there was nothing to put down, a set-down is
 * already under way, or the first was refused. */
export function setDown(adapter: RailwayAdapter, away?: { x: number; z: number }): boolean {
  const w = adapter.read.world(),
    pid = adapter.read.pid;
  const body = me.body;
  if (busy || !adapter.inspect().ready || !body || !total(w, pid)) return false;
  const p = body.interpolatedPosition;
  // Behind you when you are facing the thing, else in front of you as a tap drops it.
  let dx = -Math.sin(me.yaw),
    dz = -Math.cos(me.yaw);
  if (away) {
    const len = Math.hypot(p.x - away.x, p.z - away.z);
    if (len > 0.05) {
      dx = (p.x - away.x) / len;
      dz = (p.z - away.z) / len;
    }
  }
  const feet = p.y - PLAYER_R;
  const spots = Array.from({ length: 6 }, (_, i) => {
    // The first beside you, the rest in a row across the way.
    const side = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * GAP;
    const x = p.x + dx * REACH - dz * side,
      z = p.z + dz * REACH + dx * side;
    const ground = groundAt?.(x, z) ?? feet;
    return { x, z, y: Math.abs(ground - feet) < 1.5 ? ground : feet };
  });
  const drops = plan(loadIn(w, pid), piles(w) as readonly (Pile & { kind?: number })[], spots);
  const send = (d: (typeof drops)[number]) => adapter.drop(cm(d.x), cm(d.y), cm(d.z), d.n, d.kind as 0 | 1 | 2);
  if (!send(drops[0]!)) return false;
  busy = true;
  let i = 1;
  const next = () => {
    const d = drops[i++];
    // The host spaces one kind of action by unloadMs (90 ms) on your clock: a back of 16 is two drops, 100 ms apart.
    if (d && send(d) && i < drops.length) setTimeout(next, DROP_GAP_MS);
    else finish();
  };
  if (drops.length > 1) setTimeout(next, DROP_GAP_MS);
  else finish();
  return true;
}
function finish() {
  busy = false;
  const then = after;
  after = null;
  then?.();
}

/** Shoulder a big thing with a loaded back: the load goes down first (one press, no second step), then `take` is
 * sent. `confirmed` waits for the host to settle the drops first, as the boiler and the great beam need (adapter:
 * their take is not predicted over pending actions). A back with nothing on it just takes. False when the set-down
 * was refused or one is already under way; the take is then not sent (the load that did go down stays down). */
export function setDownThen(
  adapter: RailwayAdapter,
  take: () => boolean,
  away?: { x: number; z: number },
  confirmed = false,
) {
  if (busy) return false;
  if (total(adapter.read.world(), adapter.read.pid) === 0) return take();
  after = () => {
    if (!confirmed) return void take();
    const t0 = performance.now();
    const wait = () => {
      const s = adapter.inspect();
      if (s.pending === 0) return void take();
      if (performance.now() - t0 < WAIT_MS) setTimeout(wait, 30);
    };
    wait();
  };
  const ok = setDown(adapter, away);
  if (!ok) after = null;
  return ok;
}
