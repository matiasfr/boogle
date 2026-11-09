# World version, local progress reset and obsolete-save cleanup

Owner, 8 November: show a low-key world version on Pause, reset personal progress on a world wipe and clean up
server saves that are no longer used. The follow-up authorizes automatic cleanup: "just delete them, i dont care
about any existing save data"; it "can cover everything". This revision supersedes the original staged inventory,
digest approval and manual switch-flip proposal. Current-world files and live-room files remain protected.

## Authority and scope

- Pause and browser progress are Local. Disk inventory and cleanup are server-only.
- No lockstep math, ops, presence fields, shared save shape or world namespace change is needed.
- Ship through the normal main deployment. No agent touches production, pushes or ships as part of this job.
- `WORLD_NS` is the authority for classic room prefixes; `RAILWAY_PLAY_NS` derives the railway prefix from it.
- Room saves and recovery checkpoints are the same `DATA_DIR/<roomId>.json` files. Interrupted atomic writes can
  leave `<roomId>.json.<pid>.<8 hex>.tmp` files.

## Part 1: Pause label

The main pause page ends with a selectable, non-interactive paragraph after Leave:
`World ${WORLD_NS} · ${BUILD.slice(0, 7)}`. It uses 11px text at opacity 0.45, centered with a 6px top margin.
Keyboard and pad focus skip it. It appears only on the main page. Ownership: `src/features/pause.ts`, `pause.css`,
and `docs/game-design/pause.md`.

## Part 2: local reset on a world change

`src/player/world-reset.ts` supplies pure storage helpers; `src/boot/world-reset.ts` runs first in `src/main.ts`.

1. Every boot removes railway ability-seen and pose records whose embedded room id is outside the current railway
   namespace. Under the profile's existing exclusive Web Lock, it drops claims from old worlds. Empty profiles are
   removed; unreadable profiles remain so the ordinary reward reader can report them. No unlocked fallback.
2. When `boogle.worldSeen` exists and differs from `WORLD_NS`, remove `boogle.visit.*` and `boogle.boogler`.
   A missing marker preserves plain current-world memories when the feature first ships. Then record this world.
3. Keep name, colour, pid/key, last-visit metadata, graphics/device/control/audio preferences, dev settings and
   prototype bests. Leave prototype-job and existing world-save housekeeping to their owners. Never open or touch
   player-supplied engine files, session storage or service-worker caches.
4. Rewards reload their in-memory profile after `claimsPruned` resolves, unless disposed. A same-tab storage write
   emits no storage event. Blocked storage and denied locks must not break boot.

Owning documentation: `docs/game-design/identity.md`, `src/world/README.md`.

## Part 3: inventory, automatic trash and seven-day purge

### Inventory

`server/src/save-inventory.ts` enumerates names and metadata without reading save contents. It reports current
counts/bytes and idle counts; old namespaces with counts/bytes/newest mtime; legacy and stale-temp counts/bytes;
directory sizes; unknown names; sorted candidate/legacy lists and observational digests. Old classic rooms are
included. Current classic and railway files, and their temp files, are protected even when idle or stale.
Fresh non-current temp files (under one hour old) are kept. Unknown entries and symlinks are never candidates.

### Cleanup, enabled by default

After `store.init()` and inventory, **before `createRoomHost` or listening**, call `cleanupSaves`. The only switch is
`SAVE_CLEANUP=off`, which disables both moves and purging. Unset or any other value enables cleanup. Remove the
obsolete digest and legacy configuration fields; digests remain inventory metadata only.

- Move all old-namespace classic/railway saves, unprefixed legacy saves and stale non-current temp files into a
  unique `DATA_DIR/.trash/<UTC ISO timestamp>-<suffix>/` folder. Never delete a root save directly.
- Under `store.withLock(roomId)`, independently reject current names, recheck file type, recheck temp age and check
  `roomHost?.room(roomId)` for a loaded, closing or blocked authority. Recheck protection before rename. Normal boot
  has no loaded room or writer; the guard also protects explicit helper/relisten use.
- Atomically write `manifest.json` with `{ at, ns, rail, files: [{ name, bytes, reason }] }`; reason is `old-ns`,
  `legacy` or `tmp`. Record the next move before its rename so an interrupted run has recovery metadata. If a rename
  fails, restore the successful-moves list in the manifest. Recovery after process death compares source/destination.
- Call `store.forget(id)` only after moving a room's JSON, under that same lock. Moving an orphan temp does not
  forget the room. This returns obsolete rooms' `MAX_ROOMS` capacity.
- Unknown root entries and `reports/`, `playdata/`, `reviews/` remain in place. Log unknown names. Do not follow
  symlinks or accept arbitrary paths from a doctored candidate list.
- Purge only canonical UTC-stamped trash run folders strictly older than seven days. Keep newer/future folders,
  non-stamped entries, symlinks, and archives containing current/live files or unexpected entries; report them.
- Keep partial progress and errors in the result. An inventory failure prevents cleanup; a cleanup failure is
  logged and must not stop boot. No candidates means no new trash run folder.

### Reporting

Boot prints the existing inventory line, then exactly one `save cleanup:` summary with move counts/bytes and reasons,
purged folder count, skipped count, unknown names and errors. `GET /admin/saves` stays read-only behind the existing
REPORT_TOKEN guard (404 when unset, 401 for absent/wrong credentials). Add `lastCleanup` with the latest boot result:
`{ at, enabled, trash, moved, purged, skipped, unknown, errors }`, or null when inventory failed. A subsequent boot's
no-op is a new result; older detailed manifests remain in trash until their retention period expires.

## Implementation steps and proof

1. Label and local reset were implemented in the first four job commits. Pure reset tests cover skipped wipes,
   first marker, Keep rows, bad profiles, blocked storage and locks. Broker stills cover desktop and phone Pause;
   real reload proves stale keys gone and graphics retained. The reload/reward bot passes.
2. Add locked trash/purge helpers, store forgetting and independent protection tests. Verify exact names, sizes,
   reasons and bytes; current/nested-current/temp preservation; live ownership; symlinks and unknowns; fresh temps;
   seven-day boundary; freed capacity; kill switch; and a no-op repeat cleanup.
3. Enable boot cleanup and expose `lastCleanup`; update server docs. A real service temp-directory test verifies
   moves before hosting, API reporting, manifest contents, current bytes/mtime, untouched auxiliary directories,
   older trash removal, newer retention, and a second process boot doing nothing. The classic resume proof uses a
   current namespaced room so it exercises the retained-save contract.
4. Format changed files. Run `npm run check` and `npm --prefix server test` after the final edit. Skip `test:net` per
   the orchestrator; they run it. Run the restarted broker's `world-inputs` and relevant co-op route, open new PNGs,
   inspect new desktop/phone label stills and distinguish execution health from visual quality. Preserve failures.
5. Run a local seeded service and capture the first/second boot cleanup summaries and authenticated inventory.
   Commit in small imperative steps naming a DESIGN.md principle. Do not push, ship or operate production.
