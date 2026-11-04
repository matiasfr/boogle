# Put Place in the top-level room

## Owner's current call

The bare URL opens Round 4 Place in `boogle`, with a bare invite and a `boogle` pause title. Classic and headless tools keep `beach` and its saved world; explicit prototype links keep their isolated rooms. This serves DESIGN.md **Designed for drop-in, drop-out**.

**4 November follow-up:** no progress migration. The owner will start fresh in `boogle`. The old `boogle-place-coop-v2:proto-place-coop` save is simply unused by `boogle`, not deleted. Remove the copy-if-absent code and its seeded-save checks. Retain `reopenQuery`: an installed app remembering `?room=proto-place-coop` still reopens the new default. An explicit old invite continues to open the old room.

## Implementation

- [x] `DEFAULT_ROOM` is `boogle`; `CLASSIC_ROOM` is `beach`. The implicit Place branch in `pageQuery()` assigns `boogle`, while explicit room/prototype choices retain precedence. Classic invites keep `classic=1`.
- [x] Solo **Start over** calls Place's local `startOver()` directly, including in `?proto=place` / `proto-place`. Co-op retains the existing confirmed reset message. Neither path needs `tune.reset`; public tuning validation, rules and `WORLD_NS` remain unchanged.
- [x] `job.ts` restores only its current room's key. No old-room progress or saved pose is imported. Existing saves are not deleted by changing rooms. The deliberately confirmed **Fresh start** action retains its existing clearing behavior.
- [x] Keep recall-only installed-app normalization for both localStorage and cookie recall. Preserve explicit prototype/classic/variant destinations. Identity is global; visit memories and saved positions remain scoped to their rooms.
- [x] Playdata/report readers use actual room metadata, with no old-name filter. The map warning names no room. Keep the bot's disposable prototype room.
- [x] Update place, multiplayer and decision-log documentation to reflect the owner's follow-up; remove the obsolete seed/copy checks from the local broker evals.

## Verification for the follow-up

Run after the last code/documentation edit:

- `npx prettier --write` on changed files and `npm run check`.
- Through `node .look/see-client.ts`, confirm two players share the bare URL's `boogle` room and inspect fresh pause/roster PNGs. Confirm a Fresh start completes through the real pause action and reload.
- Confirm the tester panel's solo Start over clears a progressed railway in explicit `?proto=place`, whose room is `proto-place`.
- Check `reopenQuery` still normalizes the old room-only remembered launch without rewriting explicit prototype links.

Earlier manifests describe the previous tree and are historical, including the removed seeded-save checks. New manifests and the final report own the follow-up results; do not treat old evidence as a current pass. No new UI unit tests or scenarios are needed for this local removal. The broker owns Chromium and the local stack. Do not edit source during a run.

## Limits

No changes to wire messages, state ownership, rules, namespace, server data or The Boogler's copy. Place's existing co-op snapshot exchange still shares progress within the selected room; it does not import a different room's local save. Installed-device behavior and real-time feel require separate observation. The supplied broker does not expose `test:net`; direct Chromium remains prohibited. No fetch, push or ship.
