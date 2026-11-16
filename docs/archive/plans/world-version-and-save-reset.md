# World version, local progress reset and obsolete-save cleanup

Owner, 8 November: show a low-key world version on Pause, reset personal progress on a world wipe and clean up
server saves that are no longer used. The follow-up authorizes automatic cleanup: "just delete them, i dont care
about any existing save data"; it "can cover everything". This revision supersedes the original staged inventory,
digest approval and manual switch-flip proposal. Current-world files and live-room files remain protected.

**Restart-review correction:** unprefixed files are not demonstrably legacy. The current generic server writes bare
room IDs, including the network test's `ws<random>`, so cleanup must keep the entire supported bare-ID family.
The current-room contract below supersedes the original proposal to move all unprefixed JSON files.

## Authority and scope

- Pause and browser progress are Local. Disk inventory and cleanup are server-only.
- No lockstep math, ops, presence fields, shared save shape or world namespace change is needed.
- Ship through the normal main deployment. No agent touches production, pushes or ships as part of this job.
- `WORLD_NS` is the authority for classic room prefixes; `RAILWAY_PLAY_NS` derives the railway prefix from it.
- Room saves and recovery checkpoints are the same `DATA_DIR/<roomId>.json` files. Interrupted atomic writes can
  leave `<roomId>.json.<pid>.<8 hex>.tmp` files.

## Current writer audit and restart invariant

`server/src/store.ts` is the only root-room file writer. Both classic `createWorldHost` (its storage adapter) and
`createRailwayWorldHost` (its recovery writer) call `store.write(roomId, document)` in `server/src/host/world-host.ts`.
There is no separate crash/recovery file and no snapshot upload endpoint. Store writes a temp with the same room
ID, then atomically renames it to `<roomId>.json`; the lock uses that exact ID too.

| Current producer | Actual durable room IDs |
| --- | --- |
| Normal browser, classic island and prototypes (`src/netplay/net.ts`) | `worldRoomId(getRoomId())`, currently `v19-*` |
| Production railway (`src/netplay/net.ts`) | `railwayRoomId(getRoomId())`, currently `rail-v19-*` |
| Browser look/scenario/video tools | Go through the normal browser entry above; their plain URL `room=` names are not disk IDs |
| Network runner (`dev/peer-test/ws-run.ts`) | Now uses `worldRoomId('ws' + random)`; previously wrote the bare `ws<random>.json` that cleanup misclassified |
| Headless network page and Node worker (`ws-page.ts`, `node-player.ts`) | Explicit room query is already a wire/disk ID; fallback now uses `worldRoomId('test')` |
| Transport with omitted room (`src/net/ws-room.ts`) | Fallback now uses `worldRoomId('default')`; explicit IDs remain opaque |
| Railway network, load, cart, adapter and staging probes (`ws-railway.ts`, `staging-load.ts`) | All call `railwayRoomId`, including long-name hashing |
| Generic host/WebSocket callers and explicit `SERVER_ROOMS` | Bare valid IDs such as `beach`, `one`, `proto-tunables`, `manifest`, and arbitrary test names remain supported |
| Direct classic/headless host fixtures | Bare IDs or `worldRoomId`; stale `v02`, `v06`, `v07`, `v14` literals in current writer fixtures were replaced |
| Direct railway host/crash/supply fixtures | `railwayRoomId`; deliberately obsolete inventory fixtures are seeded with filesystem calls, not current writers |
| Reports, playdata and reviews | Separate subdirectory writers; never root room candidates |

`server/src/room-ids.ts` is shared by admission, Store and inventory. A valid room ID is current if it has the active
classic/railway prefix, has no reserved `v<number>-` / `rail-v<number>-` prefix, or is explicitly listed in this
process's `SERVER_ROOMS`. The wildcard `*` does not exempt obsolete namespaces. Admission refuses those namespaces
and Store independently rejects writing them, so **every successful current Store write is classified current**
under the same configuration. Read-only inventory exposes its explicit `currentRooms` list; cleanup and trash purge
use that same list. Bare JSON files and bare temp writes are retained, including former `t1v01-*` names: the generic
host can still use them as classic rooms. Legacy counts/lists remain zero rather than guessing they are unused.

Do not add a namespace only to Store's filename: a raw room and a namespaced room could then become two live
authorities writing the same file. Prefix first-party producers at room creation instead, while retaining the
supported generic raw-ID API. No saved payload migration or wire shape change is introduced.

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
counts/bytes and idle counts; obsolete namespaces with counts/bytes/newest mtime; stale-temp counts/bytes;
directory sizes; unknown names; sorted candidate lists and observational digests. Old classic rooms are included
unless explicitly configured. Current classic, railway, bare and configured files and their temps are protected
even when idle or stale.
Fresh non-current temp files (under one hour old) are kept. Unknown entries and symlinks are never candidates.

### Cleanup, enabled by default

After `store.init()` and inventory, **before `createRoomHost` or listening**, call `cleanupSaves`. The only switch is
`SAVE_CLEANUP=off`, which disables both moves and purging. Unset or any other value enables cleanup. Remove the
obsolete digest and legacy configuration fields; digests remain inventory metadata only.

- Move only obsolete-namespace classic/railway saves and their stale temp files into a
  unique `DATA_DIR/.trash/<UTC ISO timestamp, - for :>-<suffix>/files/` folder (as built 11 November for Windows;
  the colon form is still read). Keep the audit manifest in the parent run
  folder, so a room named `manifest` cannot overwrite it. Never delete a root save directly.
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
   seven-day boundary; freed capacity; kill switch; manifest-name collisions; and a no-op repeat cleanup.
3. Enable boot cleanup and expose `lastCleanup`; update server docs. A real service temp-directory test verifies
   moves before hosting, API reporting, manifest contents, current bytes/mtime, untouched auxiliary directories,
   older trash removal, newer retention, and a second process boot doing nothing. The classic resume proof uses a
   current namespaced room, a raw `ws` room under wildcard hosting, and an explicitly configured older-looking room.
   Each produces a real accepted item and durable tick, restarts with cleanup enabled and verifies both survive.
   Store/inventory tests cover every producer family above and ensure obsolete/invalid writes cannot create files.
4. Format changed files. Run `npm run check` and `npm --prefix server test` after the final edit. Run the network
   restart proof through `node .look/see-client.ts net` and require 111/111. Use the restarted broker for relevant
   captures, open new PNGs,
   inspect new desktop/phone label stills and distinguish execution health from visual quality. Preserve failures.
5. Run a local seeded service and capture the first/second boot cleanup summaries and authenticated inventory.
   Commit in small imperative steps naming a DESIGN.md principle. Do not push, ship or operate production.
