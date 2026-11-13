# Server-owned players, step 3: his land for the server

Implemented on `codex/server-players-step-3`, from `origin/main` at `f00736aec` (v41).
DESIGN.md: **Clear authority**, **Server hosts every room**, **Small and readable**.
The two-commit series is local only. No push or ship.

## Change

The server can load a pinned copy of the initialized client's island as a headless `BooglerLand`:
bilinear height samples in metres, bucketed obstacle-disc queries, POI keep-outs and the mainland bounds.
The existing `heightIn` arithmetic moved unchanged from `src/island/ground.ts` to `src/world/heights.ts`;
the island re-exports it, so client sampling is unchanged. No server brain is installed or run. No
replicated state, wire field, saved shape, seat code or namespace changes; `WORLD_NS` remains v41.

**Designer call B18:** he may clip a newly placed prop until the bake is re-pinned. This is the design
review's accepted P3 tradeoff. `world-inputs` detects drift; the bake does not update itself at runtime.

## Bake and pin

Canonical command: `node dev/bake-boogler-land.ts`. `--check` captures and compares without writing.
Under `run.ts` it uses the existing `.look/see-client.ts` broker; outside a broker it uses the existing
look runner. There is no custom browser launcher. It writes only after the capture and its health
checks finish successfully. `UPDATE_FIXTURE=1 npm run scenario -- world-inputs` also stages the capture
and writes only on successful runner exit, after pages have closed.

`dev/boogler-land-input.ts` reads the initialized game's actual `baseCm`, `obstacles`, `island.keepOut`
and `MAINLAND`. It includes the mushroom-stall disc appended during startup; rebuilding only the
prop scatter would miss that obstacle. Heights are explicitly signed little-endian Int16 centimetres,
base64 encoded, in `i*n+j` order. The JSON also carries `n`, obstacle and keep-out `[x,z,r]` tuples,
and mainland bounds. Formatted size: **459,799 bytes**; 409×409 cells (334,562 decoded bytes),
241 obstacle discs and six keep-outs. [Capture manifest](../../.look/evidence/1794609575926-46283/evidence.json).

`dev/scenarios/world-inputs.ts` compares every serialized value exactly and fails with the command
`node dev/bake-boogler-land.ts` when the island differs. The server loader validates the grid size,
decoded byte count and disc/mainland numbers before constructing its queries. The runtime client
does not import the JSON; only the server loader and development checks read it.

## Server image

The existing `src/world` directory entries already cover the bake, types and sampler. The sampler's
new server dependency, `src/math-pure.ts`, is explicitly added to `server/Dockerfile`,
`dev/server-build.ts` and `.github/workflows/deploy-server.yml`. The server-image test explicitly
requires the bake, sampler and math file in the reachable import closure before checking all three
lists. The prepared loader is an explicit test entry because production does not import it until step 5.
All six image tests pass. No deployed image was built or published here.

## Files

- `src/world/boogler-land.json`, `boogler-land.ts`, `heights.ts`; `src/island/ground.ts`.
- `server/src/host/land.ts`, `server/test/boogler-land.test.ts`.
- `dev/bake-boogler-land.ts`, `dev/boogler-land-input.ts`, `dev/look/evals/boogler-land.ts`.
- `dev/scenarios/world-inputs.ts`, `test/server-image.test.ts`.
- `server/Dockerfile`, `dev/server-build.ts`, `.github/workflows/deploy-server.yml`, this report.

## Verification

Tests cover a known meadow at `(30, 2.5)`, sea and off-grid points, the initialized stall disc,
1,536 exact `heightIn` cell/fractional samples, bucketed queries against a full obstacle-disc scan,
keep-out/mainland readback, and rejection of a malformed height buffer. Tests first failed with the
missing sampler, then all **10 focused land/image tests passed**. Full checks and stamp follow below;
the final step 4 report records the series network/scenario checks.

No Boogler dialogue, barks or other copy moved or changed; there are no old/new copy-line mappings.
No new suspect copy was found in the edited files. No ROM data, prefab lint or room-replacement edits.

## Limits

`npm run check` passed (lint, types, unit tests, registry, level/assets and build); server tests **254/254**.
`node dev/ship-check.ts origin/main HEAD` passed **388 assertions / 43 affected files**, with 11 lint files,
typecheck and registry. Logs: `.look/step3-check.log`, `step3-server.log`, `step3-ship-check.log`.
The initial ship-check found a missing eval command header; the corrected run above is green.

No server behavior has been enabled, so this is preparation for later steps, not server-authority
evidence. Fresh remote state and deployed packaging are unverified; network access was local only.
Opened `boogler-land-bake-still.png`: the island draws without an error overlay. This is startup evidence,
not a walk verdict. The successful capture reports WebGPU, advancing frames, no graphics errors and
`changedDuringRun: false`. The full captured JSON is preserved in its `output.txt`.
Two earlier bake-driver attempts are retained: one rejected `--frames 1` before launch; the other
captured successfully but a pipe lost stdout's tail on process exit, so the driver refused to write.
The final driver uses a regular log file and only writes after a successful completed capture.
Fresh `inflight` was not run because it fetches and calls GitHub; cached refs were inspected instead.
**Not tested on a device.**
