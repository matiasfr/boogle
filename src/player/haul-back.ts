// Read-only carry presentation seam shared by the haul bundle and active railway owner.
// No account is mutated here; the caller supplies accepted counts and Local anticipation.
import * as THREE from 'three/webgpu';
import { me } from './player.ts';
import { SHOWN, shownOf, frameOf, fitOf, slotAt } from '../render/haul-bundle.ts';
/** The kinds a back holds in rows of its own (separate capacities). */
export type CarryKind = 'logs' | 'stone' | 'rails';
/** Place's Local readout. Counts retain their owner's acceptance/landing semantics. */
export type CarryReadout = {
  logs: number;
  rails: number;
  stone: number;
  big: 'beam' | 'boiler' | 'footing' | null;
  /** Each kind's row on the back: logs 8 or 16, stone 8 or 16, rails 8 or 16. */
  capacity: Record<CarryKind, number>;
  flyingLogs: number;
  attention: boolean;
  /** The kind a swing or a take just refused because its row is full. */
  refused?: CarryKind | null;
};

// The railway supplies accepted counts for the Local bundle and carry HUD.
export const backSeam = {
  count: (n: number) => n,
  remote: null as ((peer: string) => number) | null, // ?proto=place&coop=1: a partner's logs, from their presence
  carry: null as (() => CarryReadout) | null,
  /** Whether every back wears the carry frame (the railway's shared pack); null where no owner draws one. */
  pack: null as (() => boolean) | null,
  /** Whether every back wears the Rail yoke (the railway's shared `Rail.yoke`); null where no owner draws one. */
  yoke: null as (() => boolean) | null,
};
/** Where the next piece onto your bundle goes, holding `n` now: its world position and the bundle's world rotation. */
export function myBundleNext(n: number, out: THREE.Vector3, rot: THREE.Quaternion): boolean {
  if (!me.avatar || !me.entered) return false;
  me.avatar.updateMatrixWorld();
  const f = frameOf(me.avatar);
  f.localToWorld(slotAt(Math.min(SHOWN, shownOf(n + 1)) - 1, fitOf(me.avatar), out));
  f.getWorldQuaternion(rot);
  return true;
}
