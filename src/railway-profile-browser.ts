// Browser claims use the headless atomic profile contract under one real cross-tab lock. No unlocked fallback.
import { createRailwayProfile } from './railway-profile.ts';

export function createBrowserRailwayProfile(pid: string, cosmetics: readonly string[]) {
  if (!navigator.locks) throw new Error('Railway cosmetic claims require Web Locks');
  return createRailwayProfile({
    pid,
    cosmetics,
    storage: localStorage,
    exclusive: (name, work) => navigator.locks.request(name, { mode: 'exclusive' }, work),
  });
}
