# Shared state at open-world scale

_2026-10-31. How games with many players and a big world share simulation state, and what that means for Boogle's
lockstep world, a sim worker and the dedicated server. Sources are listed at the end; Epic's and Blizzard's material
was read through their docs and talk summaries, not the full talks._

## The short answer

At Fortnite scale nobody runs the whole shared simulation on every client. The pattern that shipped games converged on
is a **server-authoritative simulation with interest management**: the server owns and steps the world, decides per
client which parts are relevant (a spatial grid of cells is the standard tool), and sends each client
**delta-compressed snapshots** of just those parts against a baseline the client has acknowledged. Clients keep a
**read-only mirror** of what they were sent, **predict** their own actions so input feels instant, and **interpolate**
everyone else.

For Boogle this means the "sim in a client worker" question goes away: a client stops simulating the shared world
and only applies what the server sends for the chunks around it. Lockstep determinism stays useful, on the server and
in tests (replays, save/load equivalence), but it stops being how clients agree.

## What the big games do

- **Fortnite (Unreal's Replication Graph).** A Battle Royale match starts with about 100 players and roughly 50,000
  replicated actors, and the default per-actor, per-client relevancy check became the server's CPU bottleneck. The
  Replication Graph replaces it with nodes that build shared, cached replication lists, including a spatial grid
  where actors are filed in the cells they can be seen or heard from and each client takes the lists of the cells
  around it ([Epic docs](https://dev.epicgames.com/documentation/en-us/unreal-engine/replication-graph-in-unreal-engine),
  [80.lv overview](https://80.lv/articles/introduction-to-replication-graph-reducing-network-bandwidth-in-ue5)).
- **Overwatch.** An ECS gameplay architecture on a dedicated authoritative server; the client predicts its own
  movement and abilities and rolls back and replays when the server disagrees, which works because the movement
  simulation is deterministic. Only a few systems (movement, weapons, state scripts) carry the netcode
  ([GDC 2017](https://gdcvault.com/play/1024001/-Overwatch-Gameplay-Architecture-and),
  [Edgegap summary](https://edgegap.com/blog/game-backend-deep-dive-overwatch-2016-netcode-architecture-rollback)).
- **Delta snapshots.** Send only what changed since a baseline both sides agree on (the last snapshot the client
  acknowledged); fall back to a full copy when the baseline is too old
  ([state sync design notes](https://www.techinterview.org/post/3233469921/lld-game-state-sync/)). ECS engines do this
  per component with change bitmasks, and partition entities into spatial chunks so a client only gets its area
  ([networking survey](https://orion-ecs.github.io/keen-eye/docs/research/networking.html)).
- **Browser-side precedent.** Colyseus (a Node game server for browser games) syncs a schema'd state incrementally,
  only changed properties, and filters per client through views
  ([@colyseus/schema](https://github.com/colyseus/schema)). It is a reference for the encoding, not a dependency we
  need: our state is already plain serializable modules.
- **Shared memory in the browser** (`SharedArrayBuffer` between a worker and the page) needs cross-origin isolation:
  COOP `same-origin` and COEP `require-corp` or `credentialless` headers
  ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/CrossOriginIsolated)). GitHub Pages cannot send them.

## What it means for Boogle

1. **The server becomes the only simulator of shared state** (server-host.md). Its first version keeps today's
   lockstep protocol with the server as the host: every client still steps the whole world. That works for today's
   island and buys a host that never leaves.
2. **Then the server stops sending the whole world.** Each rules state serializes by chunk (for example 32×32 cells);
   the server tracks dirty chunks per state, and for each client sends the chunks near it that changed since that
   client's acknowledged baseline, and whole chunks when one comes into range. This replaces lockstep for clients:
   they no longer run ticks for shared state.
3. **Clients keep a read-only mirror** shaped like today's rules state (`rules.gifts.gifts.items`, garden plots, ...),
   so render and adapter code keeps reading it as now. Decoding can move into a worker later if it shows up in
   `?prof=1`; with cross-origin isolation (a hosting move) the mirror could live in shared typed arrays.
4. **Prediction for edits.** A client shows its own pending edit at once (a cosmetic preview, as
   deterministic-sim-at-scale.md recommends) and settles when the server's delta arrives.
5. **Players and physics stay Owner** (each tab moves its own body) until cheating matters; then the server checks
   movement and clients predict and reconcile, the Overwatch pattern.

## What this changes in the plans

- architecture.md, phase 3: "the lockstep sim in a worker" is replaced by "interest-managed state from the server"
  (step 2 above) after the server lands. A client-side sim worker is not needed.
- The chunk grid of phase 4 (game-loop.md step 6) becomes the same grid the server uses for relevance.
