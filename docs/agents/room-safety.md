Before changing rules, adapters, presence, room transport or persistence, read these room safety rules.

## Don't (each of these has broken a room)
- **Effects in `apply`.** Apply changes state and returns a result; splashes, sounds, inventory go in the adapter's `onApplied(e, tick, result)`.
- **Treat `submitEdit` as done.** It returns true when *queued*: the host may reject it, and edits held while reconnecting can be dropped. Take items, spend inventory, play the effect in `onApplied`.
- **Save or serve unverified state.** A client persists only hash-verified ticks, and a state that failed to load (a fresh fallback) must never be uploaded as the host's save. Keep these guards when you touch `sync.ts`.
- **Leave a presence field set.** The getter returns `null` when the thing stops (deletes the key); receivers treat a missing key as "off".
- **Patch another module's action by string id** (`actionById(id).down = ...`): use `wrapAction`.
- **`Math.random`, wall clock or per-peer counters in apply or ticks.** The replay test catches these; don't silence it.
- **Import a new shared file into the server without listing it for the image.** The image holds only what `server/Dockerfile` copies; a file outside its COPY lines crash-loops the deployed server (10 November) while every test passes from the checkout. Add it to the Dockerfile's COPY lines, `dev/server-build.ts` and the `paths:` of `.github/workflows/deploy-server.yml`; `test/server-image.test.ts` walks the server's imports and fails until all three have it, and CI boots the built image (`scripts/server-boot-check.sh`).
