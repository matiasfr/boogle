// Read-only observation of the mounted railway. Debug setup lives outside the production entry.
import type { RailwayInspection } from '../../adapters/railway.ts';

let read: (() => RailwayInspection) | null = null;
/** The adapter's cached read (the same object until something changes): cheap enough for every frame, unlike
 * inspectRailway, which walks the railway's scene. Null until the railway is mounted. */
export const railwayRead = () => read?.() ?? null;
/** Lifecycle owner only. */
export function setRailwayRead(fn: (() => RailwayInspection) | null) {
  read = fn;
}

export type RailwayViewInspection = RailwayInspection & {
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
    ReturnType<Awaited<ReturnType<typeof import('./cart-view.ts').createRailwayCart>>['inspect']>;
  reward: ReturnType<Awaited<ReturnType<typeof import('./reward.ts').createRailwayReward>>['inspect']>;
  hookShot: ReturnType<Awaited<ReturnType<typeof import('./hook-shot.ts').createRailwayHook>>['inspect']>;
  glider: ReturnType<Awaited<ReturnType<typeof import('./glide.ts').createRailwayGlide>>['inspect']>;
};
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
