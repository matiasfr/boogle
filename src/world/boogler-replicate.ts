// One global Server leg. No steady pose traffic; complete packets publish immutable metre/radian legs.
import { defineReplicated, GLOBAL_CELL } from './replicate.ts';
import type { Replicator } from './replicate-server.ts';
import type { Mirror } from './replicate-client.ts';
import type { BooglerLeg } from './boogler-shadow.ts';

export const BOOGLER_LEG = defineReplicated('booglerLeg', {
  x0: 'int',
  z0: 'int',
  yaw0: 'int',
  x1: 'int',
  z1: 'int',
  start: 'int',
  speed: 'u16',
  mode: 'u8',
  look: 'str',
});
const quantize = (n: number, scale: number) => Math.round(n * scale) || 0;
export function projectBoogler(replication: Replicator, get: () => BooglerLeg) {
  const row = () => {
    const l = get();
    return {
      x0: quantize(l.x0, 100),
      z0: quantize(l.z0, 100),
      yaw0: quantize(l.yaw0, 1000),
      x1: quantize(l.x1, 100),
      z1: quantize(l.z1, 100),
      start: l.start,
      speed: quantize(l.speed, 100),
      mode: l.mode,
      look: l.look ?? '',
    };
  };
  replication.define({ schema: BOOGLER_LEG, ids: () => [0], project: row, cell: () => GLOBAL_CELL });
  let last = '';
  return () => {
    const next = JSON.stringify(row());
    if (last === next) return;
    last = next;
    replication.touch(BOOGLER_LEG.kind, 0);
  };
}

export function createBooglerMirror(mirror: Mirror) {
  let leg: BooglerLeg | null = null;
  let revision = 0;
  const listeners = new Set<() => void>();
  mirror.onPacket((packet) => {
    if (!mirror.whole() || packet.m) return;
    const r = mirror.get(BOOGLER_LEG.kind, 0);
    const next = r
      ? {
          x0: Number(r.x0) / 100,
          z0: Number(r.z0) / 100,
          yaw0: Number(r.yaw0) / 1000,
          x1: Number(r.x1) / 100,
          z1: Number(r.z1) / 100,
          start: Number(r.start),
          speed: Number(r.speed) / 100,
          mode: Number(r.mode),
          look: String(r.look),
        }
      : null;
    if (!packet.w && JSON.stringify(next) === JSON.stringify(leg)) return;
    leg = next;
    revision++;
    for (const fn of listeners) fn();
  });
  return {
    leg: () => leg,
    revision: () => revision,
    onLeg(fn: () => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
