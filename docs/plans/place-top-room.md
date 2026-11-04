# Put Place in the top-level room

## Goal

The bare URL opens Round 4 Place in `boogle`, with a bare invite and a `boogle` pause title. Classic keeps `beach` and its existing server save; explicit prototypes keep their isolated rooms. This implements the owner's 4 November brief and serves **Designed for drop-in, drop-out** and **Leave something for the next visitor**. The brief authorizes implementation of this design.

## Design

- Launch selection, invite presentation, last-launch recall and local-save migration are **Local**. `DEFAULT_ROOM` becomes `boogle`; a separate classic fallback stays `beach`, including when `location` does not exist. `pageQuery()` assigns `boogle` only in its implicit Place branch, before the existing explicit Place room fallback. Explicit `room`, `proto`, `fresh` and `coop` choices retain their precedence.
- Place progression retains its existing temporary **Host** authority: the oldest visible co-op participant, elected by `placeCoopCargo1` presence, publishes snapshots and accepts events through the room interface. `job.ts` still persists each browser's shared and personal slices locally. Solo progression and its reset are **Local**. No authority transfer, message shape, presence field or rule changes are needed.
- Solo **Start over** calls the existing `startOver()` directly. Co-op keeps `coop.askStartOver()` and its existing confirmed `reset` message. Place no longer uses `tune.reset` as an indirect local reset signal. Keep `env.protoRoom` validation, `tune.*`, `open.lay`, `RULES` and `WORLD_NS` unchanged.
- Before restoring the `boogle` co-op save, copy `boogle-place-coop-v2:proto-place-coop` to `boogle-place-coop-v2:boogle` only if the destination key is absent. Preserve the old key and all existing destinations. Storage errors remain nonfatal. The existing explicit **Fresh start** operation clears this person's Round 4 saves and identity; it must not immediately import an old save on reload. No startup migration deletes saved data or alters server volumes.
- Identity (`boogle.pid`, `boogle.key`) is already global and needs no migration. Room memories (`boogle.visit.<room>`) stay scoped to their actual rooms; Place restores its own saved pose, while `return-spot.ts` skips effective `PROTO` routes. Do not copy classic or old-room positional memories into the new room.
- Normalize a remembered room-only `room=proto-place-coop` launch to the default entry when recalling an installed app's saved launch, including cookie fallback. Do not rewrite an explicit address or remembered explicit `proto` launch. A normalized empty recall must not fall back to the stale cookie and reopen the old room.

## Steps

1. [ ] Edit `src/constants.ts`, `src/proto/flags.ts`, `src/netplay/net.ts` and, if needed, `src/features/pause.ts`: split default versus classic fallback, assign implicit Place to `boogle`, preserve sanitized explicit rooms and headless/classic `beach`. Confirm the pause title derives from `getRoomId()` and the bare invite derives from `DEFAULT_ROOM`. Read `src/netplay/AGENTS.md` before editing. Verify with `npm run check` and the broker's bare/classic/explicit-route inspection.
2. [ ] Edit `src/proto/place/panel.ts` and `index.ts`: remove the solo `submitEdit(tune.reset)` path and corresponding Place `onApplied` listener/import; keep direct local reset and the existing co-op reset protocol. Audit Place, pause, `src/debug/dev/room.ts`, debug Place tools and return-spot for room-prefix assumptions. Verify solo Start over, co-op shared Start over and each player's confirmed Fresh start through the broker; ensure public-room tuning remains rejected.
3. [ ] Edit `src/proto/place/job.ts`, `src/last-launch.ts` and/or `src/features/home-app.ts`: add copy-if-absent co-op progress migration before restore and recall-only normalization. Preserve the old save during migration; preserve an existing new save, even if its contents are empty or invalid. Verify seeded old-save import, reload, destination precedence, explicit old invites and Fresh start without resurrection. Verify installed-app recall for both localStorage and cookie, preserving explicit prototype launches. Read player state-consumer guidance before any player-file edit; avoid such edits unless the audit proves necessary.
4. [ ] Audit `src/proto/playdata/record.ts`, `src/features/telemetry.ts`, report readers and `dev/playtest/`: existing writers use `getRoomId()` and readers group actual metadata room names, so retain that behavior rather than adding a legacy-name filter. Keep `dev/look/playthrough.ts`'s disposable prototype `ROOM`. Update `docs/game-design/place.md`, `multiplayer.md`, the current decision routing/dated entry in `docs/proposals/boogle-2.md`, and the stale default-room sentence in `src/net/README.md`. The map warning in `dev/scan/task-routes.ts` currently names no room; change only if clarification is useful.
5. [ ] Parent owns broker evidence and final verification: read the tool table and look references, name the visual question (two visible players in `boogle`, pause room name and bare invite, working reset), then use trusted broker commands only. Inspect generated PNGs. Run `npx prettier --write` on changed files, `npm run check`, and `npm run test:net` through the broker if supported; changing `src/netplay/net.ts` also triggers `check:full`. Read every failed bot report. Repeat affected evidence after code edits. Review and simplify the diff, then commit small imperative units with the DESIGN principle in each body. Do not push or ship.

## Risks and limits

- `submitEdit()` returning true means queued, not accepted; a public room cannot rely on `tune.reset` to trigger a local effect. Removing that dependency avoids any public tuning exception.
- Copying a legacy save on every missing destination could resurrect deleted progress. Check the explicit Fresh start path together with migration, not in isolation. Preserve the pre-existing intentional Fresh start behavior without deleting data as part of startup migration.
- A fresh co-op room can adopt a joining player's save (`coop.ts`'s `mine` path); an existing progressed authority wins. Migration must finish before Place restore/co-op initialization, not after snapshots begin.
- An installed app's recalled old room is distinct from a user explicitly following the old invite; only the former is normalized.
- No new rendering work, lockstep math, ops, state registrations, wire versions or namespace migration is planned. Preserve The Boogler's copy.
- `npm run inflight` fetches remote refs and is omitted under the owner's local-network-only restriction. Use the supplied branch and local current-main evidence; do not fetch.

## Open questions

None. The owner's brief fixes the design and authorizes the narrow local-save migration despite the general guidance to skip migrations. Broker capability limits must be reported rather than worked around by launching Chromium directly.

## Implementation and verification handoff

- [x] Room selection, classic invites and direct solo reset implemented; co-op reset protocol unchanged.
- [x] Copy-if-absent migration and recall-only app reopening implemented. Identity is global; Place's safe pose travels with its save. Visit memories remain scoped to their rooms. No old-name filter exists in playdata/report readers, and the map warning names no room.
- [x] Prettier, scoped lint, `npm run check`, and all 34 server tests passed. The server tests include refusal of tuning/reset outside prototype rooms. Sixteen direct route/recall assertions passed, including absent-location flags, old invites, explicit prototypes and cookie recall.
- [x] Broker `world-inputs` and `smoke` passed: `.look/evidence/1793820576408-15393/evidence.json`. The full Place bot passed every expected beat with zero errors: `.look/evidence/1793820585642-15649/evidence.json`; its report and end still were inspected. Crystal discovery and doing something together were not marked by this solo bot.
- [x] Both direct game pages showed `boogle`, both people, and the reset railway; clipboard interception confirmed the bare invite. Both pause stills were opened: `.look/evidence/1793820567000-14696/evidence.json`.
- [x] Seeded old saves retained their railway and original key; both players completed Fresh start reloads with new identities and recovered their partner's railway. Those assertions passed in `.look/evidence/1793820470843-11500/evidence.json`, but that observer capture failed because its disconnected outer pages stopped ticking. A retry hit GPU/context errors (`1793820515475-12710`); the direct capture above passed cleanly. These failed capture statuses are retained, not reported as full passes.
- [x] Solo Start over and Fresh start passed with no resurrection; its `boogle` pause still was opened: `.look/evidence/1793820607752-15873/evidence.json`. Existing destination-save precedence and actual no-room `?classic=1` entry/invite passed; its `beach` pause still was opened: `.look/evidence/1793820738647-16434/evidence.json`.
- [x] Diff reviewed and simplified: no Boogler copy, rules, namespace, server save or message-shape changes. Startup migration deletes nothing; deliberate Fresh start retains its existing clearing behavior.
- [ ] `test:net` / complete `check:full`: the supplied broker exposes only look, playthrough, scenario and cold-start. Direct Chromium is prohibited by the brief. Check and server-test portions passed separately; trusted smoke covers two-player transport/world behavior.
- [ ] Installed-app/device execution and real-time feel: recall helpers were checked locally, not on an installed device. Fresh start probes used `intro=0`, so the introductory fall was not judged.

The manifests identify the tested product tree. Subsequent edits to this handoff document only record results; product code stayed unchanged throughout the runs. No push or ship is authorized.
