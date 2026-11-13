Before changing rules, adapters, presence, room transport or persistence, read these room safety rules.

## Don't (each of these has broken a room)
- **Effects in `apply`.** Apply changes server state and returns a result. Effects follow accepted receipts or replicated events; declared predicted effects must not play twice on confirmation.
- **Treat a queued command as done.** Only an authoritative receipt establishes acceptance. A reconnect or lost receipt can leave the outcome unknown; never interpret a timeout as success. Prediction remains reversible until confirmation.
- **Save unverified state.** Clients never persist room state. Verify server checkpoint checksum, loads and state hash; never save a failed-load fallback. Fatal command/rule failure blocks later checkpoints, including queued writes not yet started. Preserve these guards.
- **Leave a presence field set.** The getter returns `null` when the thing stops (deletes the key); receivers treat a missing key as "off".
- **Patch another module's action by string id** (`actionById(id).down = ...`): use `wrapAction`.
- **`Math.random`, wall clock or per-peer counters in apply or ticks.** The replay test catches these; don't silence it.
- **Import a new shared file into the server without listing it for the image.** Add it to `server/Dockerfile`, `dev/server-build.ts` and deploy-server.yml's `paths:`; `test/server-image.test.ts` fails until all three have it.
