// The world namespace moves room transport and durable saves together on a clean development break.
// The URL (?room=) and everything shown to players keep the plain room name. No old-save migration is maintained.
// History: v01 (0.1 groundwork); v02 (2026-11): refocus cleanup: no fruit, no shore leftovers, catalog renumbered;
// v03 (2026-11-01): one 14 s laying run: the crawl and push variants, site.push and the `run` tune key removed;
// v04 (2026-11-01): the wagon's steam gone (stoke cut after the second run-through): the `wagon` state and wagon.stoke.
// v05 (2026-11-02): mushrooms stopped being shared state: the `mushrooms` state, mush.plant and mush.water gone.
// v06 (2026-11-02): the watering can left the catalog, renumbered: frisbee 1, ball 2.
// v07 (2026-11-05): classic tunables pin full defaults, revision and catalog; incompatible catalogs cannot join.
// v08 (2026-11-05): panel track and machine deck seats cannot share a room lead with continuous-track builds.
// v09 (2026-11-05; encoding corrected 2026-11-06): line-one material/beam authority and panel timings;
// production uses rail-v09, disjoint from every classic v09-<room> name. No save migration.
// v10 (2026-11-05): remove state versions/migrations, frozen recovery and tuning catalog fingerprints.
// v11 (2026-11-06): the ball stopped being saved: the `ball` state and ball.rest gone.
// v12 (2026-11-06): src.take spends a charge only when the whole handful still fits.
// v13 (2026-11-06): line two's forge, Q1-Q3, depot, lever and hook join the railway state; rails ride the back.
// v14 (2026-11-06): replication R1a: the railway is Server-kind state (replicated, saved by pid with the server's
// checkpoint), its lockstep ops and hash gone; the isolated t1v01 railway rooms removed.
// v15 (2026-11-06): the `railBeamGraceS` tunable (an absent carrier keeps the beam, then it goes down where they stood).
// v16 (2026-11-07): the great beam pass: the first axe fells the great tree in either order with the 40 logs, and the
// proper axe comes from the lit forge (a save holding the axe before the forge no longer loads).
// Pure: read by room routing and tests.
export const WORLD_NS = 'v16';

// The id a room's world lives under. The server takes [a-z0-9-]{1,32}: a room name too long to fit keeps
// its start plus a short hash of the whole name, so two long names practically never share a world.
const MAX = 31 - WORLD_NS.length;
function shortHash(s: string): string {
  let h = 2166136261;
  for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619);
  return (h >>> 0).toString(36);
}
export function worldRoomId(room: string): string {
  const r = String(room);
  const id = r.length <= MAX ? r : `${r.slice(0, MAX - 8)}-${shortHash(r).padStart(7, '0').slice(0, 7)}`;
  return `${WORLD_NS}-${id}`;
}
