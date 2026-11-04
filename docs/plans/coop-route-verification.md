# Continuous co-op route: tooling ready for review, full execution blocked

4 November 2026. Branch `codex/coop-route`. No push or ship. This does **not** close risk 2 in [replay readiness](replay-readiness.md).

## Changes

- `5d7ba4da`: bridge the disposable server clock through the broker and accept explicit long playthroughs. Ordinary requests still have a seven-minute broker limit; `--long` permits 30 minutes of playthrough work, 35 minutes in the broker and 36 minutes in the client. DESIGN.md: **Server hosts every room**.
- `b00dd42f`: add the two-peer branch of the existing playthrough, using the existing Game wrapper, Place bot, observers and co-op clock diagnostics. Alternate station bills, forge bills and ability tasks; require positive material contributions from both peers. Reload player 2 after Q2; navigate player 1 away for five seconds and back after Q4, retaining identity and the surviving room. This departure is not the menu Leave button. Check both dry arrivals at Far Head, stations, rack, shared rewards and trains (2 m position tolerance over three consecutive samples). Record personal cosmetics without requiring them to match. DESIGN.md: **Designed for drop-in, drop-out**.

The route uses no debug skips, staged saves or recovery teleports. Harness checkpoint bookkeeping lives in sessionStorage; the game restores itself. Each uninterrupted warped segment records independent clocks and world ticks; navigation runs at 1x. Reports, per-peer observers/checkpoints, telemetry sessions, state snapshots and end stills are retained on route failures. The full runner and its reload/rejoin handling have **not** been exercised by the current broker.

Command, also in [tools](../agents/tools.md):

```sh
node .look/see-client.ts playthrough --players 2 --long --warp-speed 5 --query 'proto=place&shot=play'
```

## Verified extent

The existing broker rejected that full command with `Unsupported playthrough argument: --players`, before browser execution. Its process runs `/Users/matiasfranco/Developer/boogle-daily/dev/codex/look-broker.ts`, not this worktree's edited harness. Its request rejection has no execution manifest; the original response is copied beside the final opening evidence as `full-request-rejected.json`.

The broker's supported `look --players 2 --real` exercised the new bot through its first barrier, using `place-job.ts` and `coopRoute=1`. It did not release the bot into T1 work.

- [Final opening manifest](../../.look/evidence/1793813386054-61544/evidence.json): both reached the wake checkpoint at **86.1 game seconds**, **87.66 seconds** measured at **1.00x**, final world ticks **926/926**, one remote on each page, machine idle, zero station logs. No `NEVER`, page, console or graphics errors. **No first chop was verified.**
- Opened `coop-opening-final-still.png` and `p2-coop-opening-final-still.png`: both avatars stand on dry ground beside the awake machine; both show the multi-axe reward. The prototype feedback panel obscures part of the scene. This answers the opening-arrival question, not continued work or subjective feel.
- [Initial opening manifest](../../.look/evidence/1793813166713-55941/evidence.json): opened both `coop-opening-still.png` and `p2-coop-opening-still.png`. Both avatars arrived dry, but the checkpoint fired while the machine was still waking. Tightened the new bot's checkpoint to wait for idle and the multi-axe, then repeated the capture above. Initial evidence predates that correction.
- [Trusted world-inputs manifest](../../.look/evidence/1793813492774-63568/evidence.json): passed all fixture assertions, WebGPU, zero graphics errors. It does not verify the Place route.
- Final `npx prettier --write` completed on all changed code and documentation. `npm run check` passed: lint, TypeScript, **298/298 tests**, registry, level checks, assets and production build. Check log copied beside final opening evidence as `check.txt`. No new tests or scenarios; no network/world/server changes requiring `check:full`.

## Ranked remaining work

1. **Execution blocker:** review/apply the two implementation commits to the caller's trusted harness, then relaunch/resume through its updated `run.ts` so both broker and copied client refresh. Worker-only edits cannot update a running broker. No alternate browser or replacement harness was launched.
2. **Unverified route:** run the command above. Alternate work after the opening, reload/rejoin, faster-than-real-time clock health, the pier and final agreement assertions remain unexecuted. The requested 5x is a cap, not a measured result. Lower it if clock diagnostics fail; `--real --long` retains an honest 1x option.
3. **Prior cargo risk:** replay-readiness risk 1 still requires its own conservation investigation. This task made no gameplay fixes and did not reproduce or resolve in-transit kit loss. The planned interruptions precede train unlock and therefore would not establish reload safety with a pier kit aboard.

No gameplay, pacing or copy changed. No nonlocal network access, push, ship or direct Chromium use. `npm run inflight` was intentionally omitted because it fetches origin. Only a read-only process inspection used sandbox escalation. The final documentation commit changes the tree after the accepted captures; their manifests identify the exact tested implementation tree.
