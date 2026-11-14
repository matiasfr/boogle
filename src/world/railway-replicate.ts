// The railway as Server-kind state (docs/plans/replication.md, R1a; docs/plans/ecs-e.md, section 4): its replicated
// components are E components (src/sim/railway-components.ts, RAIL_REPLICATED) and the server's world is its own
// projection (./replicate-world.ts). This is the client's side: the mirror writes each packet into an ingest world of
// the same components, and publishes a copy-on-write clone of it as the confirmed world once a packet has fully applied
// to a whole state (docs/plans/ecs-migration-railway.md, M12). Views and the predictor read only published worlds, so
// they never see a late join between its chunks, a split send between its chunks or a refill being staged; a world once
// published is never written again (a row held from it does not move: read the world again at each entry point).
// Headless and pure.
//
//   RAIL_SCHEMAS                       the replicated components: tree, hardwood, rock, pile, account, job, qjob,
//                                      beam, forge, rail
//   createRailwayMirror()              client: { mirror, confirmed(), world(), synced(), hash(), step(), ... }
//
// Timed things are not replicated as they run: a funded job sends its start tick, `ahead` (ticks of offline catch-up
// beyond start, so elapsed = tick - start + ahead) and, once complete, its end tick. A client works out elapsed, used
// and allocation at its estimate of the server tick with jobProgress (src/sim/railway-queries.ts), the arithmetic the
// rule tick uses, so laying, feed flights and the panel count advance smoothly without a packet per rule tick.
// Outcomes (the request history) stay on the server; a client learns its own through ack/rej.
import { createWorld, type AnyComponent, type World } from '../ecs/index.ts';
import { createMirror } from './replicate-client.ts';
import { createRailwayWorld, Rail, RAIL_COMPONENTS, RAIL_REPLICATED } from '../sim/railway-components.ts';
import { clockWorld, cloneWorld } from '../sim/railway-queries.ts';

import { CLASSIC_SCHEMAS, createClassicMirror, createRosterMirror } from './classic-replicate.ts';
import { SEAT, createSeatMirror } from './seat-replicate.ts';
import { BOOGLER_LEG, createBooglerMirror } from './boogler-replicate.ts';

export const RAIL_SCHEMAS = RAIL_REPLICATED;
/** The components whose writes are marked (the replicated ones, and any other tracked one a spawn fills). */
const TRACKED = RAIL_COMPONENTS.filter((c) => c.track);

/** Client: the mirror, the ingest world its packets write, and the confirmed world it publishes. Until a whole state
 * has arrived the confirmed world is a fresh railway (actions wait for it anyway). */
export function createRailwayMirror() {
  const mirror = createMirror([...RAIL_SCHEMAS, ...CLASSIC_SCHEMAS, SEAT, BOOGLER_LEG]);
  const tune = createClassicMirror(mirror);
  const roster = createRosterMirror(mirror);
  const seats = createSeatMirror(mirror);
  const boogler = createBooglerMirror(mirror);
  let world = clockWorld(createWorld(RAIL_COMPONENTS));
  let published: World = clockWorld(createRailwayWorld());
  let synced = false;
  let hashAt = -1,
    hashed = 0;
  // Each packet's changes go into the ingest world: a replica keeps its server id, with this side's own bookkeeping
  // components at their defaults.
  for (const c of RAIL_SCHEMAS)
    mirror.onChange(c.kind, (rawId, f) => {
      const id = rawId as number;
      if (!f) {
        if (world.has(c, id)) world.despawn(id);
        return;
      }
      if (world.has(c, id)) Object.assign(world.mut(c, id)!, f);
      else {
        world.reserve(id);
        world.spawn([c, f], ...c.requires.map((r: AnyComponent) => [r, {}] as const));
      }
    });
  // At each packet's end the marks it made are drained (nothing reads them, and a clone copies a marked table instead
  // of sharing it); once the state is whole and the packet is the last of its send, the ingest world is published.
  // Registered here, before any adapter's, so a packet's settle reads the world it published.
  mirror.onPacket((p) => {
    synced = mirror.whole();
    for (const c of TRACKED) world.changes(c);
    if (synced && !p.m && world.count(Rail) === 1) published = cloneWorld(world);
  });

  return {
    mirror,
    tune,
    roster,
    seats,
    boogler,
    /** The confirmed world: the last published clone (a fresh railway before the first whole state). Never written:
     * the predictor clones it, views read it. It stays through a refill and a reset until the next whole state. */
    confirmed: () => published,
    /** The ingest world the packets write (tools and tests; views read confirmed()). */
    world: () => world,
    /** Whether the whole state has arrived since the last reset. */
    synced: () => synced,
    /** A hash of every mirrored component (cached per packet): two peers at the same step agree on it. */
    hash() {
      if (hashAt === mirror.stats.applied) return hashed;
      let h = 2166136261;
      for (const schema of [...RAIL_SCHEMAS, ...CLASSIC_SCHEMAS, SEAT, BOOGLER_LEG]) {
        const rows = [...mirror.entries(schema.kind)].sort(([a], [b]) => (String(a) < String(b) ? -1 : 1));
        const text = JSON.stringify(rows.map(([id, f]) => [id, schema.names.map((n) => f[n])]));
        for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
      }
      hashAt = mirror.stats.applied;
      return (hashed = h >>> 0);
    },
    /** The server step the mirror is current to (-1 before a packet). */
    step: () => mirror.lastStep(),
    /** A whole state is coming again (reconnect, resync): this one stays as it is, actions wait, until it has all
     * arrived and replaces it. */
    refill() {
      mirror.refill();
      synced = false;
    },
    /** Drop everything. The confirmed world stays what was last published: the despawns the reset notifies go to a
     * fresh ingest world, which the next whole state fills and publishes. */
    reset() {
      world = clockWorld(createWorld(RAIL_COMPONENTS));
      mirror.reset();
      synced = false;
    },
  };
}
export type RailwayMirror = ReturnType<typeof createRailwayMirror>;
