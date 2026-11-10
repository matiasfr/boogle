Before changing rules, adapters, presence, room transport or persistence, read these room safety rules.

## Don't (each of these has broken a room)
- **Effects in `apply`.** Apply changes state and returns a result; splashes, sounds, inventory go in the adapter's `onApplied(e, tick, result)`.
- **Treat `submitEdit` as done.** It returns true when *queued*: the host may reject it, and edits held while reconnecting can be dropped. Take items, spend inventory, play the effect in `onApplied`.
- **Save or serve unverified state.** A client persists only hash-verified ticks, and a state that failed to load (a fresh fallback) must never be uploaded as the host's save. Keep these guards when you touch `sync.ts`.
- **Leave a presence field set.** The getter returns `null` when the thing stops (deletes the key); receivers treat a missing key as "off".
- **Patch another module's action by string id** (`actionById(id).down = ...`): use `wrapAction`.
- **`Math.random`, wall clock or per-peer counters in apply or ticks.** The replay test catches these; don't silence it.
- **Import a new shared file into the server without listing it for the image.** Add it to `server/Dockerfile`, `dev/server-build.ts` and deploy-server.yml's `paths:`; `test/server-image.test.ts` fails until all three have it.
