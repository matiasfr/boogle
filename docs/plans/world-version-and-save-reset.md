# World version label, save reset on a wipe, server save cleanup

Owner, 8 November: "We should add a world version number label to the pause screen somewhere, can be lowkey. Then
when we wipe the world we should reset everyone's save data for now. We should also clean up any old save data on the
server that isn't used."

## Goal

Players can see which world they're in. A world wipe (`WORLD_NS` bump) also resets each player's own progress in this
browser. The server's disk loses saves no build can load any more. This serves the dev-phase owner call "No old builds
in development" (docs/agents/owner-calls.md): old worlds are dead data and we don't keep them around. Part 3 deletes
production data, so it ships in two stages and nothing is deleted until the owner has seen the inventory.

## Facts the design rests on (verified in the tree, 8 Nov)

- `WORLD_NS = 'v19'` in `src/world/namespace.ts`. Classic room ids are `worldRoomId(room)` = `v19-<room>`. Production
  railway ids are `railwayRoomId(room)` = `rail-v19-<room>` (`src/world/railway-namespace.ts`, `RAILWAY_PLAY_NS`).
- The build id is `BUILD` (first 12 characters) in `src/build-id.ts`. It comes from `<meta name="boogle-build">`, which
  `vite.config.ts` (plugin `boogle-version`) writes, along with `dist/version.json`.
- **Server saves are one file per room id**: `DATA_DIR/<id>.json` (`server/src/store.ts`, `fileFor`). Railway "recovery
  documents" and the 2 s "crash checkpoints" are the **same file**, written through `store.write` from
  `server/src/host/world-host.ts`. There are no separate recovery or checkpoint files. The only orphans possible are
  temp files from a write that died mid-way: `<id>.json.<pid>.<hex>.tmp`.
- Other `DATA_DIR` contents: `reports/` (already pruned to 30 days in `server.ts`), `playdata/`, `reviews/` (including
  `.upload-*` temp dirs). The cleanup must never touch these.
- `store.init()` counts every `<id>.json` against `MAX_ROOMS` (1000). Old-namespace files use up that budget, so after
  enough wipes new rooms get 507. That's a second reason to clean up.
- Per-player state on the server (railway accounts keyed by pid, the roster) lives **inside** the room save. A
  `WORLD_NS` bump already resets it, so no server-side per-player data needs its own reset.
- Production is `boogle-server` on Fly, with the volume `boogle_data` at `/data` and `server/fly.toml` `[env]`. It is
  deployed only from main by `.github/workflows/deploy-server.yml`.

## Design

All three parts are **Local** or server-only. No ops, no lockstep state, no presence fields, no wire shape changes. The
one new HTTP endpoint is additive. Nothing here needs a `WORLD_NS` bump.

### Part 1: the label

- A `<p class="pause-version">` as the last child of the main page's `.pause-list` (`renderMain` in
  `src/features/pause.ts`), after Leave. Text: `` `World ${WORLD_NS} · ${BUILD.slice(0, 7)}` `` (for example
  `World v19 · 905a6d8`, or `World v19 · dev` locally). If a step bumps `WORLD_NS`, the label follows on its own.
- CSS in `src/features/pause.css`: about 11px, `opacity: 0.45`, centred, `margin-top: 6px`, `user-select: text` (so it
  can be copied into bug reports). It isn't a button, so keyboard and pad navigation (`stops()`, `focusFirst`) skip it.
  It goes on the main page only.

### Part 2: reset progress when the world changes

New local key: `boogle.worldSeen`, holding the `WORLD_NS` this browser last ran under.

The reset works in two layers, so a player who missed several wipes (v16 to v22) is handled in one pass. It never
steps through versions.

1. **Namespaced keys are pruned on every boot, whatever the marker says.** This is idempotent and cheap. Any key whose
   embedded room id is not the current namespace is dead. A player away for several wipes has keys from several old
   namespaces, and all of them go.
2. **Plain (un-namespaced) progress keys are cleared only when the marker is present and differs from `WORLD_NS`.** A
   missing marker (the first boot after this ships, or a brand-new player) just writes the marker. This means shipping
   the feature mid-v19 does not wipe anyone's current v19 welcome-back memory.

| Key | What it is | Decision | Layer |
| --- | --- | --- | --- |
| `boogle.railway-seen.v0:<roomId>:<pid>` | Ability flourish / teach moments already shown (`src/entities/railway/ability-arrival.ts`) | **Reset**: delete if `<roomId>` doesn't start with `${RAILWAY_PLAY_NS}-` | 1 |
| `boogle.railway-pose.v0:<roomId>:<pid>` | Last standing spot in a railway room (`src/entities/railway/arrival.ts`) | **Reset**, same rule | 1 |
| `boogle.railway-profile.v0.<pid>` claims | Personal cosmetics (`src/railway-profile.ts`; `reward.ts` counts `owned` across every world) | **Reset**: drop claims whose `world` doesn't start with `${RAILWAY_PLAY_NS}-`; remove the key if none are left | 1 (under the Web Lock) |
| `boogle.visit.<room>` | Welcome-back memory and saved spot (`src/player/arrival.ts`) | **Reset** | 2 |
| `boogle.boogler` | The Boogler's memory of you: chats, presents, grudge (`src/boogler/play.ts`) | **Reset** (it's what you did in the old world; see Q1) | 2 |
| `boogle.name`, `boogle.color` | Name and colour | Keep | |
| `boogle.pid`, `boogle.key` | Identity and its secret (server accounts in the save are keyed by pid; the bump already reset those) | Keep | |
| `boogle.lastVisit` | `{at, room}` of the last visit | Keep | |
| `boogle.graphics.v1`, `boogle.detail.v1` (phone-tier rung), `boogle.resolution` | Graphics and device tuning | Keep | |
| `boogle.volume`, `boogle.muted`, `boogle.loadDetails`, `boogle.lastLaunch` + cookie `boogle_last` | Preferences | Keep | |
| `boogle.dev.*`, `boogle.water-tuning.v1` | Dev preferences | Keep | |
| `boogle.minis.*` | Proto mini-game personal bests (not tied to a world) | Keep | |
| `boogle-place-v4:*`, `boogle-place-coop-v2:*` | Proto place jobs; already self-cleaning in `src/proto/place/job.ts` | Leave alone | |
| `boogle.world.*` | Already swept by `dropOldSaves` in `src/netplay/net.ts` | Leave alone | |
| IndexedDB `boogle-decomp` | The player's own engine/ROM files | **Never open or touch** | |
| sessionStorage `boogle-chunk-retries`, `boogle-update-reloaded-for`; SW caches | Session/boot plumbing | Keep | |

There is no separate "card-seen" or "tutorial" key. The first-visit card keys off `boogle.name`, which we keep. The
reward card's "claimed" check is per world, so a new world shows it again anyway. The teach hints are the
`railway-seen` records above.

Files:

- `src/player/world-reset.ts` (new). This module is pure apart from the `Storage` it is given:
  - `export const WORLD_SEEN_KEY = 'boogle.worldSeen'`
  - `export function staleKeys(keys: string[], marker: string | null, ns: { world: string; rail: string }): string[]`
    returns layer 1 plus (if `marker !== null && marker !== ns.world`) layer 2.
  - `export function pruneClaims(text: string, rail: string): string | null | undefined` returns new text, `null` to
    remove the key, or `undefined` to leave it. Invalid JSON or an invalid shape is `undefined`: never delete what
    can't be read, because reward.ts already reports a broken profile.
  - `export function resetForWorld(storage: Storage, ns): { removed: string[] }` (sync): runs `staleKeys`, then
    `removeItem`s, then writes the marker. Each storage call sits in try/catch, because blocked storage must not break
    boot.
  - `export function pruneProfiles(storage, locks: LockManager | undefined, rail): Promise<void>` rewrites each
    `boogle.railway-profile.v0.*` key inside `locks.request(key, { mode: 'exclusive' }, …)`. The lock name must be the
    same as `createBrowserRailwayProfile`'s, which is the key itself. With no `navigator.locks` it skips (no unlocked
    fallback, per the contract in railway-profile.ts). It always resolves.
- `src/boot/world-reset.ts` (new): runs `resetForWorld(localStorage, { world: WORLD_NS, rail: RAILWAY_PLAY_NS })` at
  import and exports `claimsPruned = pruneProfiles(...)`.
- `src/main.ts`: `import './boot/world-reset.ts';` as the **first** line, before `./dev-preferences.ts`. It must
  evaluate before `src/player/arrival.ts` (which reads `boogle.lastVisit` / `boogle.name` at module evaluation) and
  before any feature `onStart`.
- `src/entities/railway/reward.ts`: after the initial `load()`, add
  `void claimsPruned.then(() => { if (!disposed) load(); });`. A same-tab rewrite fires no `storage` event, so this is
  the only way the in-memory `owned`/`claimed` catches up.

### Part 3: server save inventory and cleanup

New `server/src/save-inventory.ts`, read-only by default:

- `classify(name: string, ns: { world, rail }): 'current' | 'old-ns' | 'legacy' | 'tmp' | 'dir' | 'unknown'`
  - `current`: `/^[a-z0-9-]{1,32}\.json$/` and the id starts with `${rail}-` or `${world}-`.
  - `old-ns`: a room file whose id matches `/^(rail-)?v\d{2}-/` but isn't current. Record the namespace (`v18`,
    `rail-v17`, ...) and whether it's a railway or classic room.
  - `legacy`: a room file with no namespace prefix (pre-namespace snapshots, the removed `t1v01-*` rooms).
  - `tmp`: `/^[a-z0-9-]{1,32}\.json\.\d+\.[0-9a-f]{8}\.tmp$/`.
  - `dir`: `reports`, `playdata`, `reviews`, `.trash`. These are only measured.
  - `unknown`: anything else. It is reported and never touched.
- `export async function inventorySaves(dataDir, { ns, now, tmpAgeMs = 3_600_000, idleDays = 30 }): Promise<Inventory>`
  uses `readdir` + `stat` only, never reads file contents. It returns:
  `{ ns, rail, current: {count, bytes, idle: {count, bytes}}, candidates: { oldNs: {[ns]: {count, bytes, newest}}, legacy: {count, bytes}, tmp: {count, bytes} }, dirs: {[name]: bytes}, unknown: string[], files: string[], digest }`.
  - `idle` counts current-namespace rooms whose mtime is older than `idleDays`. It is **information only**: (b) forbids
    deleting them.
  - `tmp` candidates must be older than `tmpAgeMs`.
  - `files` is the sorted list of old-ns + tmp candidate names; `legacyFiles` is the sorted list of legacy names (Q3).
  - `digest` is `sha256(files.join('\n'))`, first 16 hex characters. `digestWithLegacy` is the same over
    `[...files, ...legacyFiles].sort()`. Both are always reported, so the owner can approve either exact list.
- `export async function trashCandidates(dataDir, inv, store, log): Promise<{ moved: string[] }>`. For each name it
  calls `assertNotCurrent(name, ns)`, which **throws** on a current-namespace name (a guard independent of `classify`),
  then runs under `store.withLock(id)`. It moves the file with `fs.rename` into
  `DATA_DIR/.trash/<ISO stamp>/` and calls `store.forget(id)`. It writes `.trash/<stamp>/manifest.json`
  (`{ at, ns, digest, files }`). It **moves, it doesn't delete**: the moves are reversible by hand, and purging
  `.trash` is a later, separate owner call.
- `server/src/store.ts`: add `forget: (id) => knownRooms.delete(id)`.
- `server/src/server.ts`:
  - `loadConfig` gains `saveCleanup: env.SAVE_CLEANUP === 'trash' ? 'trash' : 'off'`,
    `saveCleanupDigest: env.SAVE_CLEANUP_DIGEST || ''`, `saveCleanupLegacy: env.SAVE_CLEANUP_LEGACY === '1'`, and adds
    them to `ServerConfig`.
  - In `listen()`, between `store.init()` and `createRoomHost` (no room is loaded yet, so no writer is live), run the
    inventory. Log it as **one line**: `save inventory <digest>: keep N (X MB); old-ns v18 n (MB), …; legacy n; tmp n; idle-current n; unknown n`.
  - Only then: the list is `cfg.saveCleanupLegacy ? [...files, ...legacyFiles]` (digest `digestWithLegacy`) or
    `files` (digest `digest`). If `cfg.saveCleanup === 'trash'`, the digest matches `cfg.saveCleanupDigest` and the
    list is non-empty, call `trashCandidates` on that list and log `save cleanup moved n files to .trash/<stamp>`. If the digest doesn't match, log
    `save cleanup skipped: digest <want> != <have>` and move nothing.
  - An inventory failure is logged and never stops boot.
  - `GET /admin/saves` behind the existing `authed` (REPORT_TOKEN bearer) returns a fresh inventory JSON, including
    `files`.
- `server/fly.toml` `[env]`: add `SAVE_CLEANUP = "off"` with a comment pointing to this plan.

Authority: the server alone. The switch is **two values that must agree**: the mode and the exact digest the owner saw.
Any change to the candidate set turns a stale approval into a no-op, whether it's a new tmp file or a `WORLD_NS` bump
that makes v19 "old". Turning the switch on is a normal PR to main that edits `fly.toml`, deployed by the usual
workflow. It needs no `fly secrets`, no restart by hand and no volume change.

## Steps

Each step leaves `npm run check` green. Server steps also run `npm --prefix server test`.

- [ ] **1. Label.** In `src/features/pause.ts`, import `WORLD_NS` from `../world/namespace.ts` and `BUILD` from
  `../build-id.ts`, then append the `pause-version` paragraph in `renderMain`. Add the CSS to `pause.css`. Add a
  sentence to `docs/game-design/pause.md` ("a faint World vNN · build line at the foot of the main page").
  **Proof:** `npm run check`. Then capture a look still with `--hud` and an eval that opens the menu
  (`const m = await import('/src/features/pause.ts'); m.openPause(); export {};`), on desktop and on a phone-sized
  view. Open the PNGs and confirm the line is legible but faint and nothing moves or clips. Then
  `scripts/pr-shot.sh <png>`.
- [ ] **2. Pure reset logic.** Create `src/player/world-reset.ts` (no browser globals at module level) and
  `test/world-reset.test.ts`. Test cases:
  1. With the marker absent, only layer 1 goes and the marker is written.
  2. A marker of `v19` with ns `v19` removes nothing.
  3. A marker of `v16` with ns `v22` (away for several wipes) removes `boogle.visit.*` and `boogle.boogler`, keeps
     every Keep-row key, removes `railway-seen`/`railway-pose` keys for `rail-v16-…`, `rail-v18-…` and `rail-v21-…`,
     and keeps the `rail-v22-…` keys.
  4. `boogle.railway-seen.v0:v22-a:p` (a classic-style id, no `rail-` prefix) is removed: only `rail-v22-` survives.
  5. `pruneClaims` keeps current-world claims, drops old ones, returns `null` when it empties the list, and returns
     `undefined` on bad JSON.
  6. A storage whose `removeItem` throws doesn't throw out of `resetForWorld`.
  7. `pruneProfiles` with no `locks` changes nothing.

  **Proof:** `npm run test:unit`.
- [ ] **3. Wire it in.** Create `src/boot/world-reset.ts`, add the first-line import in `src/main.ts`, and add the
  `claimsPruned` reload in `reward.ts`. Update `docs/game-design/identity.md` (what a wipe keeps and resets) and
  `src/world/README.md`'s `namespace.ts` row ("a bump also resets players' local progress:
  src/player/world-reset.ts").
  **Proof:** `npm run check`. Then a look run with an eval that seeds `boogle.worldSeen = 'v17'`,
  `boogle.visit.x`, `boogle.railway-seen.v0:rail-v17-a:p` and `boogle.graphics.v1`, reloads, and prints
  `Object.keys(localStorage)`: the stale keys are gone, graphics remains, and the marker is `v19`.
  `dev/look/bots/coop-unlock.ts` (it reads `railway-seen.v0`) and `dev/look/bots/railway-reload.ts` (profile claims)
  must still pass. Run both.
- [ ] **4. Read-only inventory.** Create `server/src/save-inventory.ts` with `classify`, `inventorySaves` and
  `assertNotCurrent`. Wire in the boot log line, `GET /admin/saves` and the `SAVE_CLEANUP` config fields (accepted
  but **not yet acted on**: no trash code in this step). Add `server/test/save-inventory.test.ts`. It seeds a temp dir
  with `v19-a.json`, `rail-v19-b.json`, `v18-c.json`, `rail-v17-d.json`, `garden-1.json`, an old and a fresh `.tmp`,
  `reports/x.jsonl`, `reviews/r/card.json` and `notes.txt`, then asserts each class, the per-namespace counts, the
  sizes, that the fresh tmp is not a candidate, that `unknown` is `['notes.txt']`, and that the digest is stable and
  changes when a file is added. In `server/test/server.test.ts`: `/admin/saves` returns 404 without a token and 401
  with a wrong one, and the JSON is right with the token.
  **Proof:** `npm --prefix server test`, `npm run check`. Then run the server locally on a seeded copy:
  `DATA_DIR=<scratch>/data REPORT_TOKEN=t npm --prefix server start`, check the log line, and run
  `curl -H 'Authorization: Bearer t' localhost:9000/admin/saves`. Paste both into the PR.
  **Ship this step alone.** Once it is deployed from main, the orchestrator reads the production boot line
  (`fly logs -a boogle-server`, read-only) and `/admin/saves` with the REPORT_TOKEN, and shows the owner the counts,
  sizes, namespaces and digest. **Stop here until the owner confirms.**
- [ ] **5. Trash, behind the switch (code only; switch stays off).** Add `trashCandidates` and `store.forget`, and act
  on `SAVE_CLEANUP=trash` + digest in `listen()`. Add `SAVE_CLEANUP = "off"` to `fly.toml`. Tests:
  1. With the switch off, nothing moves.
  2. With the switch on and a wrong digest, nothing moves and the skip is logged.
  3. With the switch on and the right digest, exactly `files` move into `.trash/<stamp>/` with a manifest. `v19-*` and
     `rail-v19-*` are byte-identical afterwards, `reports/`, `playdata/` and `reviews/` are untouched,
     `store.count()` drops by the number of moved room files, and a fresh room can still be written.
  4. `assertNotCurrent('rail-v19-x.json')` throws even if handed a doctored inventory.
  5. A boot right after a cleanup computes a new digest, so the old approval is a no-op.

  **Proof:** `npm --prefix server test`, `npm run check:full`. This step can ship before the owner confirms, because
  it is inert.
- [ ] **6. Flip the switch (owner-approved only).** Make a one-line PR to `server/fly.toml`:
  `SAVE_CLEANUP = "trash"`, `SAVE_CLEANUP_DIGEST = "<digest the owner saw>"`. If Q3 says yes, add
  `SAVE_CLEANUP_LEGACY = "1"` and use `digestWithLegacy` instead. It is deployed by the normal workflow. Check the boot log for `moved n files`, then call `/admin/saves`
  again: no candidates, current rooms unchanged. Then make a follow-up PR setting `SAVE_CLEANUP = "off"`. Purging
  `.trash` is a later owner call, not part of this plan.

## Risks

- **Deleting production data.** Five things guard against it:
  1. Nothing deletes; files are moved to `.trash` on the same volume.
  2. The move only happens with mode and digest both set, and the digest is recomputed at every boot.
  3. `assertNotCurrent` re-checks every name independently of `classify`.
  4. The move runs before any room loads.
  5. Directories and unknown files are never candidates.

  A `WORLD_NS` bump between the inventory and the flip changes the digest, so the move is skipped (the intended
  outcome).
- **Production rules.** No `fly secrets`, `fly deploy`, scale, restart, ssh write or volume change from an agent. The
  only production effect is the normal deploy from main. Reading logs and `/admin/saves` is read-only. `.trash` does
  not free volume space until it is purged; `reviews.ts`'s `statfs` space check sees the same usage as before.
- **Classifier mistakes.** A classic room literally named `v18-…` becomes `v19-v18-…`, which is still current, because
  the check is on the prefix. Test it.
- **Boot order (client).** If `world-reset` doesn't run first, `arrival.ts` reads the stale `boogle.visit.*` for this
  load. That's why it is the first import in `main.ts`; don't move it below the feature globs.
- **Cross-tab claims.** A profile rewrite without the Web Lock could lose a claim another tab is making, which is why
  `pruneProfiles` only runs under `navigator.locks`. An old-build tab still open after a deploy can write old-world
  keys back. That's accepted in dev (mixed-builds), and the next boot prunes them.
- **Room safety.** No apply, ops, presence or saves are touched. The verified-save guards in `sync.ts` and
  `world-host.ts` are unchanged. The new endpoint is authed and additive; old clients never call it.
- **Hotspots.** `src/features/pause.ts`, `src/main.ts` and `server/src/server.ts` are hotspot files, so keep the edits
  small. `npm run inflight` on 8 Nov showed no open branch touching these files (only stale ship branches, more than
  130 h old). Re-run it before each step.
- **Performance.** There are no meshes, lights or tick work. The boot reset is one `Object.keys(localStorage)` pass.
  The server inventory is `readdir` + `stat` (about 1000 files at most), once per boot.

## Open questions for the owner

1. **Is the keep/reset list right?** *Recommended: yes, as in the table.* On a wipe, reset the ability flourishes and
   teach moments, saved spots, cosmetics claimed in old worlds (you lose the old hat), welcome-back memory and the
   Boogler's memory of you. Keep your name, colour, identity, graphics/phone tier, volume and controls. If the Boogler
   should remember you across worlds, move `boogle.boogler` to Keep.
2. **Should the cleanup cover the classic island's rooms?** *Recommended: yes for old namespaces, no for current
   ones.* Move old `vNN-*` classic rooms along with old `rail-vNN-*`. Never touch current `v19-*` classic rooms, even
   idle ones. The inventory reports idle current rooms only as numbers.
3. **Unprefixed legacy files** (pre-namespace saves and the removed `t1v01-*` rooms): include them? *Recommended: yes,
   once you've seen their count in the inventory.* They are off by default (`SAVE_CLEANUP_LEGACY`). Including them
   uses the separate `digestWithLegacy`, so you approve exactly that list.
