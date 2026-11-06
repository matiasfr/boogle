// Read-only observation of the mounted railway. Debug setup lives outside the production entry.
import type { RailwayInspection } from '../../adapters/railway.ts';

export type RailwayViewInspection = RailwayInspection & {
  owned: { meshes: number; bodies: number; geometries: number; animations: number };
  head: number;
  targetHead: number;
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
  reward: {
    claims: number;
    claimed: boolean;
    owned: boolean;
    busy: boolean;
    error: string | null;
    revealCount: number;
    multiReveals: number;
    showing: boolean;
    visible: boolean;
    x: number;
    y: number;
    z: number;
  };
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
