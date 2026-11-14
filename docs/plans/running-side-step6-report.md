# Running-side step 6: bots, tools and words

14 November 2026. Base `790483990` (local v45/stack); implementation through `eea64750a` on
`codex/running-side-6`. Local commits only. No push, ship, deployment or additional namespace bump.

## What changed

- Shared rides select the live lever and its physical platform, including retained terminal authority. Homeward
  approaches and exits use the plank crossings; the Q7 Pier arrival follows the train's actual direction, remains
  on the west platform and boards there for Home. The aboard cord waits for the named destination, including a
  homeward-only stop reached after turning back. Arrival, named-prompt, support and no-recovery assertions remain.
- Ported the handling read with `git show origin/main:dev/look/bots/railway-ride.ts` (PR 1816): turn away when Sit
  competes aboard, approach the leaving-end lever on its platform, and hop onto the arrival deck. No cherry-pick
  or external network use was needed. The main repair remains recognisable for merging.
- Updated railway/legs/return audits, all six named evals, and level tools. The island's stack frame is reached
  from the east arrival by the south crossing, then the bot crosses back to the outward lever. Return proof already
  reads the production landing instead of holding a left-hand coordinate fixture. Corrected the ring bot's stale
  west-outward comment too. Ring/stack evals were statically checked, not separately rendered.
- The continuity tool had both the old directional ring-array order and an obsolete splice: layout s 743 back to
  ring s 742, omitting the production 12 m blend. It now samples `line2World`/`line2Y`, marks those drawn tracks live
  and enforces the existing thresholds. **No threshold was relaxed.** `ring-up` now has zero kinks over 2 degrees,
  maximum 0.2 degrees; the intermediate tool repair still reported a spurious 3.3-degree kink.
- The generated rail map shows both Pier decks, the inactive east deck after Q7, west homeward service and the
  production 726.5 m mark (0.8 m crossing clearance), replacing the obsolete 725 m proposal. Directional platform
  labels and physical obstacle keys now agree. The proposed Home bay joins the homeward track: its future outward
  routing/backing/headway claims need their planned review, and the tool says so.
- Updated layout comments, Place's as-built description, generic-lines' current running rule and turnouts' geometry
  and routing words. `d7d9d4e77` separately renames `upLat`, `UP_LAT`, `UP_HALTS` to `offsetLat`, `OFFSET_LAT`,
  `OFFSET_HALTS`, including their consumers and the ring's lateral field. `UpHalt`, `upFull`, inspector `up/down`
  platform tags and level report IDs such as `ring-up` remain physical geometry names, not a directional rule.

[Source audit](../../.look/running-side-6/source-audit.txt): all 24 changed `src` files match the base after reversing
the three requested names and ignoring comments, whitespace and trailing commas. No sim, world, net or server
behaviour changed. No player-facing string, Boogler copy or ROM data was changed or added.

## Checks and machine load

Every required command had an explicit timeout. [Command records](../../.look/running-side-6/final-commands.json)
preserve the final tool command lines, exit codes and start loads; [logs](../../.look/running-side-6/) retain earlier
attempts too. Load is the machine's one-minute average, not an exclusive-GPU claim. Process inventory was denied by
the sandbox. An editor lint hook timed out while load exceeded 100; subsequent full lint/checks passed.

| Check | Timeout | Result | Start load |
| --- | --- | --- | --- |
| `npm run check` | 900 s | 2,100 tests: 2,099 pass, zero fail, one existing TODO; lint, registry, level, assets and build pass | 3.71; final wording pass 10.63 (`check-last.log`) |
| `node dev/ship-check.ts` | 900 s | 1,675 tests: 1,674 pass, zero fail, one existing TODO; 128 lint files, typecheck, 168 affected files | 10.31 |
| `npm run registry` | 180 s | 19 presence keys, nine message types, three ops, two states | 9.94 |
| `npm run level-check` | 180 s | 14 reports, 18 tracks, seven joins; zero production failures, zero `ring-up` kinks over 2 degrees | 9.94 |
| `npm run loop -- run` | 600 s | Canonical plus five alternatives for 1–4 players: 24 completed orders, zero softlocks | 10.05 |

The TODO remains the existing longer-fleet wait bound (1,146 ticks against 1,050). The first full check stopped on
this new eval's missing command header; it was fixed and full checks repeated. Planned/non-drawn geometry warnings
remain visible, including the old ring sim path and undrawn loop; they are not suppressed. Areas 4–9 in the loop
remain modelled stand-ins. `test:net` is deliberately reserved for the orchestrator.

## Broker proofs and opened images

All successful final runs used real time, the provided broker and accepted host seeds, with **no source edits while
any run was active**. Each had an outer 2,100 s timeout; the older broker retains its seven-minute browser cutoff.
The trusted harness is `d87c05719`; final manifests identify clean worker `eea64750a` before and after. Later edits
only clarify map/ring-comment wording and record this report; evaluated browser logic is unchanged.

- [Return ride manifest](../../.look/evidence/1794684291101-24142/evidence.json): pass, `deck-laid`, Village–Pier–Village,
  no recovery. `RIDE PIER` records stop 3, track 1, origin 0 and the active west homeward lever naming Village.
  Question: does the rider reach the Q7 Pier's serving platform and return? Opened `right-hand-return-final-still.png`:
  the rider is back on Village's island platform beside the trains. The Pier platform assertion is diagnostic,
  not pictured by this end still. Load 12.59 to 10.12; no graphics errors.
- [Works retry manifest](../../.look/evidence/1794684292239-24147/evidence.json): pass, `works-arrive` through the
  named `stall built` segment. Six checkpoints, two hand deliveries, `shed.stall = 2` at tick 6770, no recovery or
  missed beat. Read the complete output/checkpoint report. Question: can the seeded Works route deliver both
  footings via the revised Quarry platforms? Opened `right-hand-works-retry-still.png`: player beside the rotunda
  stall, reward card closed. Load 10.12 to 13.94; no graphics errors. This is not the full Works-to-crossing route.
- [Request-stop manifest](../../.look/evidence/1794684293414-24152/evidence.json): pass, two peers, `trains-on`.
  Question: does the south outward lever serve the nearby train while the rider requests Quarry aboard? Opened
  `right-hand-request-final-still.png` and `p2-right-hand-request-final-still.png`: the train is beside the south
  platform and the second player is aboard. The latter still offers Sit; logs confirm the earlier aboard prompt
  `Request stop: Quarry`, slot 2 served at stop 1 on track 0, and the south lever's Far Head plaque. Plaque/amber-lamp
  detail is not resolved by these frames. `passedDown` is empty: no claim of a witnessed homeward pass. Load 4.37
  to 12.59; both peers seen, no graphics errors.

Opened earlier images too: the [first ride](../../.look/evidence/1794683386753-14247/evidence.json)'s
`right-hand-return-still.png` showed the default camera at the world origin, so was replaced for the visual question;
the [first Works run](../../.look/evidence/1794683408020-14309/evidence.json)'s `right-hand-works-still.png` showed a
station-box reward card holding movement at the second Quarry crossing approach. It failed under load (9.34 to
42.5), and was rerun once after porting the full-route bot's ordinary read-then-E card handling into the seeded eval.
The successful retry above replaces it, without weakening the crossing assertion. The [earlier request run](../../.look/evidence/1794683409186-14315/evidence.json)
also passed; opened both its player stills. Eight PNGs opened in total. A prior `--wall` attempt was rejected before
browser launch; retry used supported broker flags, without bypassing it.

## Departures, remaining words and handoff

Departures from the short step-6 list: added a small ride eval entry using the existing shared bot; ported station-box
E handling into the seeded Works eval after its observed failure; sampled the production Pier blend instead of
loosening continuity checks; corrected the generated maps and the ring bot's comment. The tested Works segment ends
at `stall built`. Mechanical names are isolated in their own commit. Step 6 is ticked; the combined ship checkpoint
is not: net and the coordinated three proof looks remain with the orchestrator.

No active left-hand platform/track expectation remains in the requested bots/evals/tools. Historical generic-lines
decision 22 and original step records still describe the superseded left-hand choice; Place retains the owner's
verbatim complaint. Physical `up/down` geometry tags remain as noted above. The Home bay's routing is unresolved,
not asserted to work under the new rule. Ring/stack crossing/lever and reload evals were audited and statically
checked, not run individually here. No full fresh campaign, late-join rider, real-time smoothness or performance
claim. Not tested on a device.

Review-stamp output (no fetch): [whole shared branch](../../.look/running-side-6/review-stamp.txt),
`85b625942046` (62 review files since local origin/main); [step 6](../../.look/running-side-6/review-stamp-step6.txt),
`58072651ceba` (10 review files since `790483990`). Step 6's review-path changes are mechanical names only; these
stamps are identities, not a new independent review of the inherited rotunda/running-side implementation.
