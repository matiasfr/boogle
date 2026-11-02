// Which build each player runs. main auto-deploys while friends keep tabs open for hours, so a room can hold several
// builds at once. This tab's build (import.meta.env.VITE_BUILD, set by vite.config.ts; 'dev-...' in development) rides
// in presence as `bv` (Owner state: your own build); every remote record gets r.build (null = a peer from before
// builds were published, so an older one). src/features/updates.ts reloads old tabs; the net debug overlay and
// connection reports use mixedBuilds().
import { addPresenceField, onRemotePresence, remotes } from './net.ts';

export const BUILD = String(import.meta.env.VITE_BUILD || 'dev').slice(0, 12);

addPresenceField('bv', () => BUILD);
onRemotePresence((r, pr) => {
  r.build = typeof pr.bv === 'string' ? pr.bv.slice(0, 12) : null;
});

// Other builds among the peers we have heard from, as Map(build -> count); null is a peer older than `bv`.
export function otherBuilds() {
  const n = new Map<string | null, number>();
  for (const r of remotes.values())
    if (r.build !== undefined && r.build !== BUILD) n.set(r.build, (n.get(r.build) || 0) + 1);
  return n;
}
export const mixedBuilds = () => otherBuilds().size > 0;
