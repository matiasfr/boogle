# Shared physics: server Rapier or deterministic Rapier

_6 November 2026. Code read at `2e289307`. Builds on [coop-physics-vehicles-netcode.md](coop-physics-vehicles-netcode.md)
(rider frames, grab ownership, Rocket League, R.E.P.O., Gang Beasts) and doesn't repeat it. The brief cites a 6 November
Process entry in boogle-2.md; it is **not on `main` yet**, so the owner calls below are taken from the brief: the server
runs shared physics, deterministic Rapier is the alternative to evaluate, and one fixed clock drives physics at 60 Hz
with rules every N steps. Tags: [H] high, [M] medium, [L] low confidence; **[measured]** = run for this doc;
**unverified** = not checked._

## Result

1. **Server Rapier is the right call, and it matches the engines.** Unity's NGO physics is server-authoritative by
   default, with non-authority copies kinematic. Unreal's networked physics modes are all built for server-authoritative
   actors. No shipped co-op game we found locksteps a float physics engine. [H]
2. **Deterministic Rapier is real but costs more than it saves for Boogle.** The build is plain Rapier with
   `enhanced-determinism` and no SIMD. It ran at the plain build's speed and up to 1.8× slower than our SIMD build
   [measured]. The cost isn't speed, though: lockstep physics would put *every body that touches a shared object* into
   lockstep, your own avatar included. That means input delay or rollback for your own movement, plus a port of the
   player controller (13 step-hook files, sin/cos in player code). [H]
3. **This is net-roadmap phase 3's Server kind.** It replaces Host and doesn't add a fifth kind. Owner stays for your
   avatar and what you alone hold. Physics stays out of Lockstep. [H]
4. **The carrier's feel is the real risk.** A server-owned object reaches the carrier about one round trip plus
   interpolation late. Use Unreal's answer: predictive interpolation, where the carrier's tab runs a local copy pulled
   softly toward the server. [M]
5. **The server CPU budget is the first blocker, not the code.** Fly `shared-cpu-1x` gets 6.25% of a vCPU at baseline,
   and when the burst balance runs out it throttles for the rest of each 80 ms period. One room with 200 awake crates
   uses about 3.5% of an M1 core at 60 Hz [measured]. Measure on Fly before building. [H]

| Option | Who simulates shared objects | Carrier feel | Late join | Desync | Build cost | Verdict |
|---|---|---|---|---|---|---|
| **A. Server Rapier (Server kind)** | Server, 60 Hz; clients interpolate at 20 Hz | ~RTT + 120 ms late unless predicted locally | Send current poses (bytes) | None; server is truth | Server world data, Node Rapier, entity API | **Recommended** |
| B. Deterministic Rapier lockstep | Every tab, from stamped inputs | Input delay for *your own body* | Full Rapier snapshot (≈250 KB+ measured) | Any divergence grows; resync per hash | Port the player controller; lose SIMD | Not now |
| C. Owner hand-off (today, the ball) | Whichever tab claimed it | Instant for the owner; others late | Owner's next presence | None, but ownership fights | Exists | Keep for solo objects |
| D. B plus rollback | Every tab, predicted then rewound | Instant | As B | As B | B plus per-tick snapshots and resims | No (PvP-grade cost) |

## 1. How shipped games do it

- **Rocket League** (GDC 2018, read first-hand earlier): the server is fully authoritative with Bullet at 120 Hz. The
  client predicts everything and rewinds and re-simulates on a correction, costing 24 frames per correction at 200 ms.
  First they tried predicting only the car while interpolating the ball, and hits broke, because the car and ball lived
  in "two timelines". [H]
- **Unreal** ([networked physics overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/networked-physics-overview)):
  *Predictive Interpolation* is "designed for server-authoritative Actors". Clients steer toward the server's velocity
  and can apply predicted forces (pushing), and it is the cheaper mode. *Resimulation* caches state each tick for at
  least one round trip and rewinds, and it's meant for physics pawns. [H]
- **Unity NGO** ([physics](https://docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.7/manual/advanced-topics/physics.html)):
  physics is server-authoritative by default. "Non-authority instances are kinematic." The docs recommend
  `AttachableBehaviour` over joints for attaching things; under distributed authority, ownership moves with
  `ChangeOwnership`. No physics prediction. [H]
- **Godot**: there's no built-in physics netcode. netfox's guide says Godot can't step physics manually, so rollback of
  rigid bodies needs a fork or the Rapier add-on; otherwise a maintainer suggests state sync
  ([netfox physics](https://foxssake.github.io/netfox/latest/netfox.extras/guides/physics),
  [caveats](https://foxssake.github.io/netfox/latest/netfox/tutorials/rollback-caveats/)). [M]
- **Gaffer On Games** ([deterministic lockstep](https://gafferongames.com/post/deterministic_lockstep/)): a peer "can
  only simulate frame n when it has the input for that frame", and "after the smallest divergence the simulation gets
  further and further out of sync". Bandwidth scales with inputs, not objects. In
  [VR physics](https://gafferongames.com/post/networked_physics_in_virtual_reality/), a host arbitrates authority, which
  goes to whoever touches an object, and ownership, which goes to whoever grabs it. [H]
- **Teardown** (2026, [Voxagon](https://blog.voxagon.se/2026/03/13/teardown-multiplayer.html)): destruction is
  deterministic, and "most other things use state synchronization". Transforms go unreliably from the host, and clients
  run locally and get corrected. Join-in-progress replays a capped command buffer. [H]
- **Overwatch** (GDC 2017): the abstract describes server authority with determinism used for responsiveness; the
  prediction details come only from secondary write-ups. [L]
- **Valve Source**: about 100 ms of interpolation by default, server tick 66 in TF2/CS:S (wiki via search summary; the
  page refused fetch). [M]
- **R.E.P.O.** (Photon PUN): the master client simulates every physics object, so each grab waits a round trip.
  Players complained, and the game sold anyway. **Gang Beasts**: server-hosted, with stages rebuilt one by one to work
  online. Both from the earlier doc. [M]
- **Human Fall Flat, PEAK**: no developer netcode source found again. HFF had host-run lobbies and an Nvidia-based
  solution (Wikipedia). PEAK uses Photon relays ([Landfall FAQ](https://landfall.se/peak-faq)). How joint carrying is
  synced is **unverified** for both. [L]

**Pattern:** shared physical objects are simulated by the server or host. Smoothing on clients is the default, and
local prediction is added for the objects the player is touching. Determinism shows up only for non-physics command
streams (Teardown destruction, RTS) or in rollback fighting and sports games. [H]

## 2. Server Rapier for Boogle

**What the server simulates.** It builds a Rapier world per room from three.js-free world data (phase 3): the terrain
heightfield, static colliders near shared objects, the Server-kind dynamic bodies, and one **kinematic capsule per
player**, moved to that player's latest presence pose. It doesn't simulate players' controllers, the sea, Local props or
decks it can compute (timetabled wagons are already a pure function of the tick, so the server places them the same
way). It goes through `src/physics/engine.ts` unchanged; the server loads the SIMD build (Node 24 has WASM SIMD). [H]

**CPU** [measured, M1 Max, Node 24, Rapier 0.21.0, 600 steps at 1/60 s. Scene: 129² heightfield, 300 static boxes,
6 kinematic capsules, a beam jointed between two of them, N crates in a pile. Mean ms per step:]

| Awake crates | SIMD | Plain | Deterministic |
|---|---|---|---|
| 20 | 0.104 | 0.115 | 0.121 |
| 200 | 0.539 | 0.579 | 0.603 |
| 1000 | 2.046 | 3.505 | 3.638 |

At 60 Hz, 20 crates is about 0.6% of an M1 core per room and 200 is about 3.2%. Fly's `shared-cpu-1x` baseline is 5 ms
of every 80 ms (6.25%), with bursts from an accrued balance; once that balance is gone, tasks are "throttled... for the
remainder of the 80ms period" ([Fly CPU](https://docs.fly.io/machines/cpu-performance)). That would show up as hitches of
up to 75 ms in *every* room on the machine. Fly vCPU speed against an M1 is **unverified**. Rapier sleeps settled
islands, so steps cost what's awake. Skip stepping entirely when nothing shared is awake and no player is near. [M]

**Rates.** Physics at 60 Hz, the same `FIXED` step as the client, so contacts behave the same. Snapshots at 20 Hz,
matching `SEND_MS = 50` and `INTERP_MS = 120` (Fiedler's 3× rule puts 20 Hz near 150 ms). Send an object only while it
is awake, with an at-rest packet when it settles. Stamp every snapshot with the server step number, so clients
interpolate on server time, not arrival time. Halo's floor is 10 Hz; Rocket League runs 120 Hz but is competitive. [M]

**Bandwidth.** One awake object as JSON (id, position, smallest-three rotation, velocity) is about 90 bytes, so
20 Hz × 90 B ≈ 14 kbit/s per receiver. Ten awake objects to six players is about 145 kbit/s down per client and
0.9 Mbit/s out of the server. That's the same order as presence today (112 kbit/s per 100 bytes in a full room).
Quantize only after measuring. [M]

**Clients.** Non-carriers sample `createSnaps` at `now − INTERP_MS`, exactly like remote avatars, with a kinematic proxy
body so your avatar bumps into the object (Unity's "non-authority instances are kinematic"). Use Hermite interpolation
with the velocity and cap extrapolation at about 100–250 ms. [H]

**Your own body against a server object** is Rocket League's two-timelines problem: your capsule is in the present, the
object about 170–250 ms in the past (RTT/2 up, RTT/2 down, plus 120 ms of interpolation).
- *Pushing or bumping:* the proxy behaves like a wall that moves late. Accept that for things you don't hold. [M]
- *Carrying (the joint carry):* each carrier's hand target rides in presence. The server joints the object to the
  carriers' kinematic hand bodies. On a **carrier's** tab, a local dynamic copy is jointed to *your* hand in the present
  and to the other carrier's interpolated hand, and Fiedler's error offset blends it toward the server state (decay
  0.95 per frame for small errors, 0.85 for large). That is Unreal's Predictive Interpolation in Boogle's terms. Your
  grip responds at once, and the far end lags like any remote. On release, the local copy fades out and the server pose
  takes over. [M]
- The server takes player poses as given (co-op, phase 4 checks plausibility). A carrier pulling against the server's
  object never moves the carrier's own avatar, so it can't rubber-band your character. Moving the avatar would mean
  server-owned movement, which net-roadmap rules out. [H]

**Late join.** The server sends the current entity states, a few hundred bytes. No Rapier snapshot ever goes on the
wire. Drop-out releases the leaver's grips, and the object falls on the server like any other. [H]

**Sync kinds.** This is the roadmap's **Server** kind: `onServerEntities(kind, ...)` feeding `createSnaps`. Host, the
lead tab, goes away when The Boogler moves. There are still four kinds: Local, Owner, Server, Lockstep. "Physics is
never Lockstep" stays. A server physics event that changes progression (a crate entering a station) becomes an edit the
**server** submits, so "crossing kinds goes through edits" survives with an actor that can't race. [H]

**One clock.** The server's 60 Hz physics step counter is the room clock, and rules run every 6 steps (100 ms, today's
`TICK_MS`). Clients keep following the stamped lockstep tick as now. Their own 60 Hz physics stays free-running for the
local avatar and is never compared bit for bit. N = 6 keeps the 10 Hz rules and every saved schedule. [M]

## 3. Deterministic Rapier

**What it guarantees** ([JS determinism](https://rapier.rs/docs/user_guides/javascript/determinism/),
[Rust determinism](https://rapier.rs/docs/user_guides/rust/determinism)): identical results across "browsers, operating
systems, and processors", given the same Rapier version, the same parameters, bodies, colliders and joints added and
removed "in the exact same order", and initial values computed without `Math.sin`/`cos`. Snapshot hashes then match
after the same number of steps. The npm build is the `enhanced-determinism` feature with no `+simd128` flag. The plain
build is also SIMD-free but carries no cross-platform guarantee
([0.21 generator](https://github.com/dimforge/rapier/blob/js-v0.21.0/bindings/typescript/builds/prepare_builds/src/main.rs)).
Rapier says determinism relies on strict IEEE 754-2008 compliance [H]. WASM floats are deterministic apart from NaN bit
patterns (NetplayJS author, via the earlier doc) [M].

**What I measured.** All three 0.21.0 builds gave **different** hashes for the same scene, so they aren't
interchangeable: every peer must load the deterministic WASM. Two runs of the deterministic build matched
(`e26696887eaf93bd`). The deterministic build runs at plain speed (+3–5%); SIMD is 1.1× faster at up to 200 bodies and
1.8× at 1000. Gzipped WASM: 1.18 MB deterministic, 1.15 MB SIMD. A world snapshot of the test scene was **248 KB with
20 crates and 934 KB with 200**, because terrain and statics are inside it. [measured] Cross-browser and x86 matching
is **unverified** here: only Chromium is installed. One outside project reported matching hashes in five engines
(earlier doc). [M]

**How lockstep physics would work.** Clients send inputs (stick, grab, hand target) as edits stamped for tick T + delay,
and every tab steps an identical Rapier world. Late join needs `takeSnapshot` (hundreds of KB to MB) plus the inputs
since. Recovery means hash every few ticks, then a full snapshot. Rollback means snapshotting each tick and
re-simulating RTT × 60 Hz steps (9 steps at 150 ms) of the whole world on each late input. Rapier has no partial
rollback. [M]

**Failure modes for Boogle.** [H unless noted]
- **Your avatar must be in it.** A body outside lockstep that touches a lockstep body breaks determinism. So the player
  controller, `platforms.ts`, the sea and every step hook (13 files, sin/cos in `src/player/`) would move into a
  deterministic, three.js-free sim, against "Physics is never Lockstep" and our Owner avatars.
- **Input delay or rollback for your own walking.** Gaffer: a frame can't run without everyone's input. Rollback is
  Rocket League's cost, which co-op doesn't need.
- **Insertion order everywhere.** Every streamed chunk, spawned prop and prototype collider must be created in the same
  order on every tab, forever. One agent's stray `createBody` desyncs the room.
- **SIMD lost** on every client, and the snapshot payload is far larger than our lockstep grid's.
- **Mixed Rapier upgrades** (we stay on latest) change trajectories, so saved Rapier snapshots wouldn't survive an
  upgrade. Fine under `WORLD_NS`, but every Rapier bump becomes a world reset. [M]

**Where it still helps.** It makes a cheap **server-side replay check**: re-run a recorded scene and compare hashes. It
also enables a future shared simulation of something with no avatars in it, like a falling bridge everyone watches.
Keep it as a test tool, not a sync model. [M]

## 4. Place's `coopWire` and the seven findings

`coopWire` is a bag of late-bound hooks (`rung`, `forgeBill`, `wakeTrains`, `activeFrame`, `tech`, `rungsChanged`,
`techChanged`, `panelCommit`, `panelSnapshot`) behind a tab-elected authority (`authorityPeer`) that sends whole state
each second. **None of its hooks is physics.** Under the recommended model they become Lockstep ops with `onApplied`
effects, and `wakeTrains` becomes a tick schedule. The election, `applyFull` and `reconcile` are deleted. The physical
parts of `coop.ts` (big-cargo ground poses, the long beam, `great-carry.ts`'s supporting shoulder) become Server-kind
entities. Grips stay Owner presence, as hand targets.

| Finding | Under server physics |
|---|---|
| 1. Railway state in tabs | Lockstep rules on the server; shared physical cargo becomes a Server entity; no tab authority |
| 2. Landing completes gameplay | Server physics detects the delivery and submits the edit; clients play arcs from `onApplied` |
| 3. Phase order and lifetime | One server step order (physics, then rules every 6 steps); Server entities spawn and despawn on the server, with client proxies as entities |
| 4. Geometry imports gifts | Unchanged, plus a new constraint: server colliders come from three.js-free shape data, never render modules |
| 5. Slice schema | One typed, validated schema per Server entity and per rules state; Rapier snapshots never on the wire |
| 6. Debug coupled to startup | Unchanged; the typed inspect surface adds server entity and step-time stats |
| 7. Default URL versus prototype dependencies | Unchanged; only promoted objects get server physics |

## 5. Recommendation

1. **Record the decision** in boogle-2.md Process and DESIGN.md's table (Host becomes Server; Owner stays the avatar).
   The 6 November entry isn't on `main`.
2. **Measure the server first.** Run the same scene and benchmark inside a Fly `shared-cpu-1x` machine: step time,
   burst-balance drain with 1, 3 and 10 rooms. If it drains, budget `shared-cpu-2x` or `performance-1x` (owner call:
   cost).
3. **World data for one area** (phase 3): heightfield plus statics as data that both sides load, starting with
   Station 3's footprint only.
4. **Server entity API**: tick, compact state, latest-wins 20 Hz, step-stamped; client `onServerEntities` into
   `createSnaps`.
5. **Smallest proof: the great beam as a two-grip Server entity.** Two tabs on `?proto=place&coop=1` plus a third
   watcher, carrying it 30 m, over a bump and through a turn, under 0, 100 and 200 ms of added latency. Measure: grip-end
   gap on each carrier's tab (target under 10 cm locally), remote-pose error against the server, correction pops per
   minute, server ms per step, and kbit/s per client. Compare local prediction on and off. Then the owner's 2-minute
   feel check: "does carrying together feel like Human Fall Flat or like dragging through mud?"
6. **Move The Boogler to Server kind** and delete `addHostField` and the lead election (roadmap).
7. **Promote big cargo** off `coop.ts` with finding 2's server-submitted delivery edit.
8. **Keep deterministic Rapier as a test**: a `dev/` cross-engine hash run (WebKit, Firefox, x86) when someone needs
   replay checks.

**Takes:** about one Codex track for steps 3–5 on a branch (world data for one area, Node Rapier in the room host, the
entity API, the beam), with the Fly measurement first.

**Risks:** Fly CPU throttling (high until measured); carrier feel at 200 ms+ round trips; a joint between two
kinematic hands can launch the beam when the carriers pull apart (cap the joint force, break the grip beyond a
stretch); the server and client contact envelopes drifting (`PREDICTION_DISTANCE` must match).

**Unverified:** Fly vCPU speed; cross-browser and x86 determinism; how HFF, Gang Beasts and PEAK network joint carrying;
the Overwatch details (only secondary write-ups found); real-room bandwidth; carrier feel. Not tested on a device.

## Sources

[Unreal networked physics](https://dev.epicgames.com/documentation/en-us/unreal-engine/networked-physics-overview) ·
[Unity NGO physics](https://docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.7/manual/advanced-topics/physics.html) ·
[netfox physics](https://foxssake.github.io/netfox/latest/netfox.extras/guides/physics) ·
[Rapier JS determinism](https://rapier.rs/docs/user_guides/javascript/determinism/) ·
[Rapier Rust determinism](https://rapier.rs/docs/user_guides/rust/determinism) ·
[Rapier 0.21 build generator](https://github.com/dimforge/rapier/blob/js-v0.21.0/bindings/typescript/builds/prepare_builds/src/main.rs) ·
[Gaffer: deterministic lockstep](https://gafferongames.com/post/deterministic_lockstep/) ·
[Gaffer: VR physics](https://gafferongames.com/post/networked_physics_in_virtual_reality/) ·
[Rocket League GDC 2018](https://media.gdcvault.com/gdc2018/presentations/Cone_Jared_It_Is_Rocket.pdf) ·
[Overwatch GDC 2017](https://gdcvault.com/play/1024001/-Overwatch-Gameplay-Architecture-and) (abstract only) ·
[Teardown multiplayer](https://blog.voxagon.se/2026/03/13/teardown-multiplayer.html) ·
[Fly CPU performance](https://docs.fly.io/machines/cpu-performance) ·
[Valve Source networking](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking) (search summary) ·
[Human: Fall Flat](https://en.wikipedia.org/wiki/Human:_Fall_Flat) · [PEAK FAQ](https://landfall.se/peak-faq).
Benchmark script: a scratch file (`run.mjs`), not committed. Its scene is described in §2.
