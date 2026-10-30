# Deterministic sim at scale: how shipped games detect desyncs, hash, roll back, join late and stay cheap

## How do lockstep games detect desyncs and hash state per tick?

### Takeaway
Everyone hashes; the differences are how much and how often. Factorio pairs a cheap "heuristic" CRC every tick with a slow full CRC for debugging, AoE and Supreme Commander hash the whole world on a fixed cadence, and the tooling that makes desyncs fixable is per-system checksums plus dumps of both sides' state at the bad tick.

### Cited Findings
- Factorio's default MP check is a "heuristic CRC": incomplete but very fast, computed every tick from a few key indicators (state of all players, number of active entities, a snapshot of production statistics), compared across players accounting for latency. — [FFF #55](https://factorio.com/blog/post/fff-55)
- Factorio's full CRC covers the complete game state every tick, very accurate but slow, and its cost scales with map size; used as a debugging tool. A third tool auto saves, loads and checks the game every tick to catch setup/serialization bugs. — [FFF #55](https://factorio.com/blog/post/fff-55)
- Factorio's earlier debugging method: full-map CRC every tick plus a save every tick, then replay and compare; the save diff at the bad tick usually showed a single variable. — [FFF #47 via search summary](https://factorio.com/blog/post/fff-47)
- On desync, Factorio writes a desync report containing "the game state from the server and the client"; devs diff the two. The desynced player reconnects and re-downloads the map. — [FFF #188](https://factorio.com/blog/post/fff-188); [FFF #55](https://factorio.com/blog/post/fff-55)
- Age of Empires: 200 ms turns; the team checksummed the world, objects, pathfinding and targeting; any divergent sim was tagged out of sync and the game stopped. "Very subtle differences would multiply over time"; debugging used 50 MB message traces and world dumps. In RTS3, sync-check macros were tagged per system (e.g. the RNG), recorded file and line, and could be compiled out of release builds. — [1500 Archers (Gamasutra)](https://www.gamedeveloper.com/programming/1500-archers-on-a-28-8-network-programming-in-age-of-empires-and-beyond)
- Supreme Commander: sim at 10 Hz (each SimTick must finish within 100 ms), render 60 fps interpolating; whole game state hashed once per second; on mismatch "Desync Detected" and the game closes, no recovery. Common causes: uninitialized variables, floating point (fixed by forcing strict IEEE 754 at a perf cost), a dangling pointer reused by a new allocation. Debugging is binary search over memory hashes and looping games on many machines. — [Forrest Smith, Synchronous RTS engines and a tale of desyncs](https://www.forrestthewoods.com/blog/synchronous_rts_engines_and_a_tale_of_desyncs/)
- Photon Quantum: `ChecksumInterval` default 60 frames; clients send frame-state checksums to the server; docs suggest zeroing it for release builds. A checksum error event carries the tick and per-client checksums, and `ChecksumErrorFrameDump` gathers frame dumps from other clients for diffing. — [Quantum DeterministicSessionConfig](https://doc-api.photonengine.com/en/quantum/current/class_photon_1_1_deterministic_1_1_deterministic_session_config.html); [DeterministicTickChecksumError](https://doc-api.photonengine.com/en/quantum/current/class_photon_1_1_deterministic_1_1_deterministic_tick_checksum_error.html); [ChecksumErrorFrameDump](https://doc-api.photonengine.com/en/quantum/current/class_photon_1_1_deterministic_1_1_checksum_error_frame_dump.html)
- Incremental (Zobrist-style) hashing updates a hash in O(1) by XORing out an item's old contribution and XORing in the new one. — [jugar-web ZobristTable docs](https://docs.rs/jugar-web/latest/jugar_web/trace/struct.ZobristTable.html)
- Vendor guidance (lightly sourced, single vendor): hash per subsystem so a mismatch points at the system that drifted; find the first disagreeing tick and diff; common causes are floats, unordered hash-map iteration, uninitialized memory. — [bugnet.io](https://bugnet.io/blog/how-to-debug-desync-in-deterministic-lockstep-games)

### Inferences
- Boogle's current design (one combined uint32 every 20 ticks, full snapshot on mismatch) sits between Supreme Commander (hash 1/s, no recovery) and Factorio (hash every tick, reconnect + redownload). Boogle's automatic resync is already better than the RTS norm.
- The missing piece versus Factorio/Quantum/AoE is diagnosability: per-subsystem hashes and a "both sides' state at the bad tick" dump.
- Plain XOR of per-cell contributions cancels identical pairs; contributions must mix in the cell index (the bugnet summary didn't mention this; it's a standard caveat).

### Gaps
- No primary source on StarCraft II's internal sync-check design was found.
- Factorio's current (1.x/2.0) CRC scheme may differ from the 2014 posts.

## How do rollback systems (GGPO, Overwatch, Quantum) work, and what of it applies to a slow co-op sim?

### Takeaway
Rollback exists to hide input latency for fast, twitchy, per-frame inputs; it requires cheap save/load/step-without-render and multiplies sim cost by the rollback depth. Its most transferable artifact for a slow sim is GGPO's "sync test" (roll back every frame and compare), which is a determinism test, not a netcode feature.

### Cited Findings
- GGPO predicts missing remote inputs from previous ones; when real inputs arrive and differ, it re-simulates from the divergence point to the current frame. The game supplies save state, load state, and advance-one-frame-without-rendering. — [ggpo.net](https://www.ggpo.net/)
- GGPO's save callback returns a buffer, length and checksum. Requirements: the state is "fully encapsulated and serializable"; RNG seed/state must be part of game state; wall-clock time only as an input; beware static variables hiding state. — [GGPO Developer Guide](https://github.com/pond3r/ggpo/blob/master/doc/DeveloperGuide.md)
- GGPO frame delay: make it "as high as possible without affecting the qualitative experience"; fighting games notice >1 frame, board/puzzle games tolerate 4-5. — [GGPO Developer Guide](https://github.com/pond3r/ggpo/blob/master/doc/DeveloperGuide.md)
- GGPO `ggpo_start_synctest`: a single-player session that does a 1-frame rollback every frame and compares the first execution against the rollback execution, erroring on difference; diagnose by diffing logs. — [GGPO Developer Guide](https://github.com/pond3r/ggpo/blob/master/doc/DeveloperGuide.md)
- Overwatch (GDC 2017, Tim Ford): ECS; sim runs in fixed 16 ms command frames; the client predicts its own movement and on server disagreement rolls back to the last verified state and replays buffered inputs. When the server's input buffer starves it repeats the last input and tells the client, which runs slightly faster (example 15.2 ms per frame) until the buffer recovers, then slows down. Clients send all inputs since the last acked frame (redundancy). Determinism relies on synchronized clocks, fixed update and quantization. — [GDC Vault listing](https://gdcvault.com/play/1024001/-Overwatch-Gameplay-Architecture-and); [Chinese transcript (Sohu)](https://www.sohu.com/a/148848770_466876). The 7 ms tournament figure is secondary only ([Edgegap](https://edgegap.com/blog/game-backend-deep-dive-overwatch-2016-netcode-architecture-rollback)).
- Factorio does not roll back the authoritative state; it predicts the local player in a separate "Latency State" that is "not sacred", rebuilt each tick from the authoritative Game State plus a queue of the player's own pending actions. Missing inputs are "never ignored, they are only delayed"; per-client round-trip latency is renegotiated every 5 seconds. A catching-up client may simulate up to 400 ticks at once. — [FFF #302](https://www.factorio.com/blog/post/fff-302)
- AoE scheduled commands two turns ahead (turn 1000 -> 1002) and adapted turn length to ping and the slowest machine's frame rate, rising quickly and settling slowly. Players tolerated ~250 ms unnoticed, 250-500 ms playable. — [1500 Archers](https://www.gamedeveloper.com/programming/1500-archers-on-a-28-8-network-programming-in-age-of-empires-and-beyond)

### Inferences
- Boogle's 300 ms edit delay (3 ticks at 100 ms) is inside AoE's "playable" band for sand/water edits, which are slow strategic inputs, not twitch inputs. Rollback of the shared grid buys nothing worth its cost.
- Factorio's Latency State is the right latency-hiding model for Boogle: a cosmetic local preview of your own pending edits, discarded when the authoritative edit applies.
- Overwatch's time dilation is analogous to Boogle's LAG/LEAD client clock steering.

### Gaps
- Photon Quantum's predict/verify architecture page 404'd; only API references were reachable.

## How do they handle late joiners and resync?

### Takeaway
Three patterns: full snapshot plus buffered inputs (Factorio, Quantum, Boogle), replay of a bounded command log (Teardown), or no join at all (classic RTS). Snapshot-plus-pending is the robust default; command replay only works while the log stays short.

### Cited Findings
- Factorio uploads the map in the background while others play; the joiner also receives all inputs since, then applies them as fast as it can to catch up; a joiner that can't keep up doesn't affect others. — [FFF #149](https://www.factorio.com/blog/post/fff-149)
- Quantum: `IDeterministicSnapshotProvider` replaces default snapshot sending for late joiners; protocol has a server request for a snapshot from a client and sends large snapshots in multiple messages; `SimulationStart` carries `WaitingForSnapshot`; the demo provider copies the frame before serializing on a worker thread. — [Quantum API index](https://doc-api.photonengine.com/en/quantum/current/annotated.html); [QuantumSnapshotProviderDemo](https://doc-api.photonengine.com/en/quantum/current/class_quantum_1_1_experimental_1_1_quantum_snapshot_provider_demo.html); [SimulationStart](https://doc-api.photonengine.com/en/quantum/current/class_photon_1_1_deterministic_1_1_protocol_1_1_simulation_start.html)
- Teardown MP (March 2026): considered full scene serialization, serializing changed objects, or replaying the deterministic command stream; chose replay. The command buffer is size-limited and join-in-progress is disabled when it fills. Full-scene quicksaves are often 30-50 MB. — [Voxagon blog](https://blog.voxagon.se/2026/03/13/teardown-multiplayer.html)
- Supreme Commander had no join-in-progress: syncing ~3,000 units' state was "just too much". — [Forrest Smith](https://www.forrestthewoods.com/blog/synchronous_rts_engines_and_a_tale_of_desyncs/)

### Inferences
- Boogle's grid state is small (129x129 cells, sparse water), so snapshots are cheap compared with Teardown's 30-50 MB; command replay is unnecessary and would conflict with persistence and offline growth.

### Gaps
- No source quantified Factorio map transfer sizes or compression.

## Fixed-point and float determinism, and what changes in JavaScript

### Takeaway
Shipped deterministic engines use integer or fixed-point math in the shared sim (Quantum Q48.16, Teardown destruction rewritten in fixed point) and treat float as possible-but-fragile. In JS, basic IEEE ops are exact, but transcendental functions are not guaranteed identical across engines or V8 versions.

### Cited Findings
- Quantum's `FP` uses 16 fractional bits and 48 integral bits; float conversion helpers are flagged non-deterministic/`_UNSAFE`; the safe route is `FromRaw` integers. — [Quantum FP struct](https://doc-api.photonengine.com/en/quantum/current/struct_photon_1_1_deterministic_1_1_f_p.html)
- Teardown rewrote destruction in fixed-point integer math, which suits discrete voxel volumes; transforms/velocities stay float and are state-synced instead. The author now calls float "mostly safe if you know how to navigate around the pitfalls." — [Voxagon blog](https://blog.voxagon.se/2026/03/13/teardown-multiplayer.html)
- Gaffer: determinism must be bit-exact; float results can differ across compilers, OSes, instruction sets, even debug vs release; "there's no silver bullet." Lockstep bandwidth scales with input size, not object count. — [Gaffer on Games, Deterministic Lockstep](https://gafferongames.com/post/deterministic_lockstep/)
- ECMA-262 recommends but does not require fdlibm for Math.sin/cos/tan; V8 uses fdlibm-derived code; Firefox historically used platform libm. — [Mozilla dev-platform intent](https://groups.google.com/a/mozilla.org/g/dev-platform/c/0dxAO-JsoXI)
- A JS physics engine reported Math.sin/cos outputs differing between Node and Chrome (attributed to V8 version), while Math.sqrt (exactly specified by IEEE 754) agreed; a deterministic sin/cos from basic ops cost ~1.1x native. — [bounce issue #8](https://codeberg.org/perplexdotgg/bounce/issues/8)

### Inferences
- Boogle's integer-centimetre approach is the Quantum/Teardown pattern minus the fractional part. JS lacks a fast int64, so Q48.16 isn't practical; if fractions are ever needed, Q16.16 or smaller in int32 with care over 2^53 products is the JS-native choice.

### Gaps
- Cross-engine determinism of Math.imul/bitwise ops is guaranteed by spec (int32 semantics); no source needed to be found for that, but none was fetched.

## Keeping shared sims cheap as grid and player count grow

### Takeaway
"Do less" wins: sleep idle entities/cells, track dirty rectangles per chunk, group homogeneous work; parallelism (checkerboard chunks) comes later. Input-driven sync makes bandwidth independent of grid size.

### Cited Findings
- Factorio: most entities "go to sleep" when idle and use no processing time; solar panels and accumulators are computed per group; belts/pipes were the costliest because each piece updated individually, motivating segment merging (shift an offset instead of moving items). — [FFF #148](https://factorio.com/blog/post/fff-148)
- Factorio 0.12 made belt items non-entities moving on internal "rails", checking collisions only against the item ahead. — [FFF #82 forum](https://forums.factorio.com/viewtopic.php?p=77345)
- Noita (GDC talk, Petri Purho): chunked falling-sand world; per-chunk dirty rectangles limit iteration; multithreading by updating chunks in a checkerboard pattern. Implementers report particles getting stuck at chunk borders with dirty rects. — [GDC Vault](https://gdcvault.com/play/1025695/contactUs); [BeefSand](https://github.com/BradFitz66/BeefSand); [80.lv](https://80.lv/articles/noita-a-game-based-on-falling-sand-simulation/)
- Gaffer: lockstep bandwidth is proportional to input size; a million objects can cost the same as one. — [Gaffer on Games](https://gafferongames.com/post/deterministic_lockstep/)
- Teardown: deterministic commands ("cut hole in this shape at voxel coord") keep bandwidth independent of object size; a 2021 prototype sending voxel data choked the connection; non-deterministic objects use a per-client priority queue within ~1 Mbit. — [Voxagon blog](https://blog.voxagon.se/2026/03/13/teardown-multiplayer.html)
- Factorio at 200+ players: catch-up after a connection hiccup batched ~400 input actions into one tick, a megapacket bug that took 3 weeks to fix. — [FFF #302](https://www.factorio.com/blog/post/fff-302)

### Inferences
- For Boogle, sim cost is grid-driven (water cells), net cost is player-driven (edit count), hash cost is grid-driven unless incremental. Chunk-level dirty tracking can serve all three: sim skipping, incremental hashing, and partial resync.
- Noita's border-stuck bug maps directly onto Boogle's wake() rule: a chunk border needs a wake margin.

### Gaps
- No published numbers on per-cell water sim cost in comparable browser games.
