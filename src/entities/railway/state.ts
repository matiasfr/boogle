// Read-only observation of the mounted railway. Debug setup lives outside the production entry.
import type { RailwayAdapter } from '../../adapters/railway-session.ts';

type RailwayRead = RailwayAdapter['read'];

let commandSession: RailwayAdapter | null = null;
const commandListeners = new Set<(session: RailwayAdapter | null) => void>();
/** The mounted command boundary, shared with the dev tuning panel. */
export const railwayCommands = () => commandSession;
export function onRailwayCommands(fn: (session: RailwayAdapter | null) => void) {
  commandListeners.add(fn);
  fn(commandSession);
  return () => commandListeners.delete(fn);
}
/** Lifecycle owner only. */
export function setRailwayCommands(session: RailwayAdapter | null) {
  commandSession = session;
  for (const fn of commandListeners) fn(session);
}

let worldRead: RailwayRead | null = null;
/** The adapter's read facade (docs/plans/ecs-migration-railway.md, M8): the world the views see now, its tick, the
 * local pid and the session status, for rows and queries. Null until the railway is mounted. */
export const railwayWorldRead = () => worldRead;
/** Lifecycle owner only. */
export function setRailwayWorldRead(r: RailwayRead | null) {
  worldRead = r;
}

/** The session's scalars in the view inspection: the read facade's values, flat. */
export type RailwaySession = {
  pid: RailwayRead['pid'];
  status: ReturnType<RailwayRead['status']>;
  ready: boolean;
  pending: number;
  stalled: ReturnType<RailwayRead['stalled']>;
  tick: number;
} & ReturnType<RailwayRead['debug']>;
/** The session's scalars, read now. debug()'s fields are copied as they are defined, so `hash` stays a getter: the
 * mirror is hashed only when read. The view inspection and the peer-test probe both take them from here. */
export function railwaySession(read: RailwayRead): RailwaySession {
  const out = {
    pid: read.pid,
    status: read.status(),
    ready: read.ready(),
    pending: read.pending(),
    stalled: read.stalled(),
    tick: read.tick(),
  };
  return Object.defineProperties(out, Object.getOwnPropertyDescriptors(read.debug())) as RailwaySession;
}
/** What the railway's views hold and no component does: the scene walk. */
export type RailwayScene = {
  owned: { meshes: number; bodies: number; geometries: number; animations: number };
  head: number;
  targetHead: number;
  panelCursor: number;
  machineSetback: number;
  station: { x: number; y: number; z: number; shown: number };
  machine: { x: number; y: number; z: number };
  trees: {
    id: number;
    x: number;
    y: number;
    z: number;
    cleared: boolean;
    work: number;
    remaining: number;
    falling: number;
    growth: number;
  }[];
  pathOpen: boolean;
  line2View: ReturnType<Awaited<ReturnType<typeof import('./line2-view.ts').createRailwayLine2>>['inspect']> &
    ReturnType<Awaited<ReturnType<typeof import('./shelf-view.ts').createRailwayShelf>>['inspect']> &
    ReturnType<Awaited<ReturnType<typeof import('./cart-view.ts').createRailwayCart>>['inspect']> &
    ReturnType<Awaited<ReturnType<typeof import('./train-view.ts').createRailwayTrains>>['inspect']>;
  reward: ReturnType<Awaited<ReturnType<typeof import('./reward.ts').createRailwayReward>>['inspect']>;
  hookShot: ReturnType<Awaited<ReturnType<typeof import('./hook-shot.ts').createRailwayHook>>['inspect']>;
  glider: ReturnType<Awaited<ReturnType<typeof import('./glide.ts').createRailwayGlide>>['inspect']>;
  /** The Works and Roundhouse views' own inspection, and the crossing's; null with &works=0. */
  worksView: ReturnType<WorksLive['inspect']> | null;
  crossingView: ReturnType<WorksLive['crossingInspect']> | null;
};
type WorksLive = Awaited<ReturnType<typeof import('./works-live.ts').createRailwayWorksLive>>;
/** The railway's inspection: the session's scalars and the view's scene walk, built per call. It holds no component
 * field and no fact a query computes (docs/plans/ecs-m12-m13.md, section 2): read state as rows and queries, through
 * railwayWorldRead(). */
export type RailwayViewInspection = RailwaySession & RailwayScene;
let current: (() => RailwayViewInspection) | null = null;
export const inspectRailway = () => current?.() ?? null;
/** Lifecycle owner only; observers receive detached scalar state from inspectRailway. */
export function setRailwayView(view: (() => RailwayViewInspection) | null) {
  current = view;
}

let recover: (() => void) | null = null;
/** The mounted arrival owns recovery; callers never load another gameplay entry to perform it. */
export const getRailwayUnstuck = () => recover?.();
export function registerRailwayRecovery(fn: () => void) {
  recover = fn;
  return () => {
    if (recover === fn) recover = null;
  };
}

type YouGot = Awaited<ReturnType<typeof import('./reward.ts').createRailwayReward>>['youGot'];
let youGot: YouGot | null = null;
/** The railway's one reveal queue ("You got"), for the town's shop. False when nothing's mounted to show it. */
export const railwayYouGot: YouGot = (got) => youGot?.(got) ?? false;
export function registerRailwayYouGot(fn: YouGot) {
  youGot = fn;
  return () => {
    if (youGot === fn) youGot = null;
  };
}

let hookProbe: ((id: string) => string) | null = null;
export const hookWhyNot = (id: string): string => hookProbe?.(id) ?? 'hook view unavailable';
export function registerHookProbe(fn: (id: string) => string) {
  hookProbe = fn;
  return () => {
    if (hookProbe === fn) hookProbe = null;
  };
}
