# Server-owned players, step 6

2026-11-13. Runtime tip **693975297**, on `codex/server-players-step-6`, based on local main **27c988886** (after c4515361c). No push or ship. Implementation complete; **Checkpoint B remains open for the browser limitations below**.

## Change and boundaries

The 10 Hz server brain now owns movement. One global `booglerLeg` row carries start/end, facing, start tick, speed, mode and look-at pid. Clients evaluate continuous legs against the presentation clock and ease changed legs from the displayed pose. The saved Server state is only `[x,z,yaw]`. Recovery checks integrity before validating the spot; wet, blocked or off-land saves use `findStart`. Extreme finite facing is normalized after verification, before wire projection. Empty rooms freeze and resume at the same position.

Opening your own talk holds his displayed position and stops his walk immediately, turns him toward you, and eases to the acknowledged server leg. Talk/activity transitions send presence immediately. A sessionless preview keeps the independent local 10 Hz brain; reconnect never invents stale autonomous walks. Initial authoritative placement is immediate.

Deleted the `g` Host registration, lead snapshot publisher/receiver/buffer, takeover branch, stale-walk timeout and lead-vs-shadow diagnostics. Reused step 5's continuous travel in `boogler-shadow.ts`; its historical name remains. WORLD_NS is **v42**, with a dated history entry; v41 peers are refused with the existing peer/4000 path before welcome.

**No dialogue string moved or changed** (old/new file:line: none). All copy remains client-side; the server sends no text. The previously unreachable frisbee copy in `src/sim/gift-catalog.ts:24` remains untouched; no new suspect line. No ROM data, prefab change, seat implementation change or room-replacement implementation change. Steps 7/8 are not implemented: `bg: [act,wary,ev,evN]`, present/puff reactions and lead election remain.

Remaining lead consumers: server election/visibility/departure/welcome/status; the client room interface; `onLeadChange` presence resend and lead-only pre-entry presence heartbeat in `netplay/net.ts`; telemetry role and room/network debug displays; test/scanner contracts. The retained `addHostField` API has no production registration after this step.

## Measurements

`test/replicate-budget.test.ts`: 60 seconds, baked land, one Boogler-only replicator/subscriber, initial full snapshot excluded. These are JSON application bytes, excluding WebSocket framing and other game kinds.

| Activity | Changed-leg packets/min | Total packets/min | Bytes/min |
| --- | ---: | ---: | ---: |
| Empty/frozen, hypothetical subscriber | 0 | 30 | 1,012 |
| Quiet awake wandering | 11 | 41 | 2,106 |
| Busy talk/ride/wary | 53 | 53 | 5,844 |

The empty total is the generic two-second replication hash heartbeat, not repeated legs. A genuinely empty room has no recipients and sends zero bytes. Busy inputs rotate every two seconds. Legs are touched only when their quantized row changes.

Headless real-host/mirror latency sweep: ten tick-phase offsets per case, 10 ms simulation increments, latency interpreted explicitly as **RTT**, split equally over presence uplink and replication downlink.

| RTT | Friend talk worst | Rider speed worst | Wary flee worst |
| --- | ---: | ---: | ---: |
| 0 ms | 100 ms | 100 ms | 100 ms |
| 80 ms | 180 ms | 180 ms | 180 ms |
| 200 ms | 300 ms | 300 ms | 300 ms |

Talk/ride meet 300 ms; wary meets 1 s. These measure received authoritative legs, not browser display latency. Same-frame local hold has both a pure presentation test and production Talk-press assertion with unchanged x/z and walking=false in that press.

[Live meter evidence](../../.look/evidence/1794616833460-49397/evidence.json): 572 decisions, 37.404 ms accumulated, mean 0.06539 ms, max 1.4373 ms, 0.6539 ms/room-second. Room timer p50/p95 gap 17.394/18.812 ms, max 33.521 ms, zero dropped steps. First sample mean was 0.09474 ms; this is within-run observation under shared load, not a controlled speedup claim. Meter excludes replication. The existing warmed CPU probe reports 3.402/1.378/1.336 microseconds per tick for 1/8/32 rooms, respectively; [raw data](../../.look/step6-brain-perf.json).

## Tests, review and fixture accounting

Tests were added first and failed for the missing authority/presentation, then passed. The extreme-facing regression reproduced the wire-projection exception before its fix. Authority coverage includes two mirrors, late join/reconnect, saved tuple/restart, invalid load preserving the last good save, actual baked-land wet/blocked/off-land fallback, namespace reset and real admin reset. Presentation coverage includes immediate talk/turn, held-to-server easing and zero-dt mid-walk rider continuity.

- `npm run check`: pass, **1,839 passing tests and one existing TODO**, lint/types, registry, level/assets/prefabs and production build; [log](../../.look/step6-check-final-runtime.log).
- `npm --prefix server test`: **307/307** on the final runtime, as part of `check:full`.
- Direct worktree `npm run test:net`: **191/191**, repeated on final runtime; [record](../../.look/step6-net-final.json) and [log](../../.look/step6-net-final.log).
- `node dev/ship-check.ts origin/main HEAD`: pass; **773 tests**, 27 lint files, 79 affected test files; [log](../../.look/step6-ship-check-final.log).
- `npm run registry` and `npm run loop -- run`: pass. No route bills or progression changes.
- `npm run check:full`: all phases through server tests passed; its nested Chromium launch failed at sandbox Mach-port permission. The same requested npm network script was separately authorized outside the sandbox. This is not reported as a successful aggregate command.
- `npx prettier --write` ran on changed files.
- `npm run review-stamp -- . --no-fetch`: **eb7dc9c08efd**, 22 classified files. No fetch, push or ship.
- Independent Astra review found a sessionless-read-facade gate error and unsafe extreme saved yaw. Both fixed in 693975297; reviewer verified both, including ±1e13/±1e308, and found no remaining actionable issue.

Fixture changes: server registry inventories add the newly saved `boogler` state (including one expected-array edit each in seat-replication/seats-host tests; no seat behavior changes). The legacy-edit refusal test compares synchronously after delivery instead of advancing the now legitimately moving NPC four ticks. The railway namespace expectation changes v41 to v42. Reset/refusal tests now cover v42. The shared host fixture accepts positions/hasPlayers and a configurable time increment for reaction measurement. No golden JSON, baked terrain or copy fixture was repinned.

Local commits: 7c9e6cd8e (authority/save), 348a5875c (presentation/talk), 693975297 (review fixes), followed by this evidence report. Each commit body names DESIGN.md principles.

## Browser evidence and observations

All captures use the supplied broker; each manifest records commit/tree and changedDuringRun=false. No source edits occurred during a run.

- [Two-player real talk/ride](../../.look/evidence/1794616153404-27801/evidence.json), captured before the final two review fixes. Opened both stills, the motion sheet and six consecutive encoded frames (30–35). Talk stopped immediately in the production press assertion. Rider stayed over the compressed hat until the intended puff launch; no obvious jump in the inspected frames. The post-launch talk overlay obscures the NPC on the first final still.
- [Final-runtime solo mid-walk rider](../../.look/evidence/1794616709586-44453/evidence.json). Opened the motion sheet: rider remains on the body through the faster leg until the intended launch. Same-frame Talk and actual contact/2.3 m/s server leg asserted.
- [Seeded step-6 walk](../../.look/evidence/1794616761772-46613/evidence.json) versus [main movement](../../.look/evidence/1794617036159-57189/evidence.json). Opened both motion sheets: similar squat stride, turns and hat bounce, with closely matched travel in these samples. Same initial brain seed `0x5eed`; baseline is main's movement module temporarily overlaid in this worktree's `proto=net` fixture, then restored, not a complete baseline build. [Exact fixture/limits](../../.look/evidence/1794617036159-57189/comparison-fixture.json). Baseline shares cosmetic RNG and frame cadence; the new brain does not.
- [Two-player T2 bot](../../.look/evidence/1794616811479-48606/evidence.json): pass, both finish, 232 matching server-step hashes, final tick 2148 on both. Read its report and opened end-still (both players and completed track visible). No missed beat. Temporary page clock deficits 3.465/3.568 game seconds under shared load; server deficit 0.005 s, final synchronized. Not a performance/smoothness claim.
- [Eight requested scenarios](../../.look/evidence/1794616264977-31027/evidence.json): boogler-tag, boogler-talk-pad, interact, second-tab pass. Opened interact Talk and rider stills: readable unchanged dialogue and rider over compressed hat. Four failures in frozen harness d87c05719: one-hand reads retired `boogle.gifts.items`; smoke/reconnect-edit reject the correct `client,client` modes; world-inputs waits for the retired gifts layout. No assertion bypass or fixture rewrite.
- [Final-runtime rerun](../../.look/evidence/1794617079249-58017/evidence.json): boogler-tag, boogler-talk-pad and interact all pass. Opened final Talk and riding stills: dialogue remains readable and the rider is centered above his body. Broker waited 249 seconds for the prior network run/load gate; no source changed.
- The live-meter capture's two stills were also opened: the final camera frames the players and misses/partly occludes the distant NPC. Those stills are not used as visual proof.

Unverified: literal first browser tab closing mid-walk while the second watches; the four blocked frozen-harness scenarios against a current harness; a full baseline build comparison; browser/display reaction delays under injected latency; real-time smoothness/feel and physical-device behavior. **Not tested on a device.** Existing player curves measure the player, not NPC cadence. These limits keep Checkpoint B open; they are not a request to hold shipping.
