# Agent-call triage — 16 November 2026

Baseline: `origin/main` at `4bde3a35f66a8ad5541e8d2b1c98321dc1caa63c` (fetched at start). IDs are one-based positions within each baseline topic table, padded to three digits. They do not renumber when another row is removed. Audio has no data rows. The actual baseline has **695 calls**, rather than the approximate 675 in the brief.

Research only: no design verdicts or changes to calls, decisions or game code. The [JSON sheet](agent-calls-triage-2026-11-16.json) covers every row and records its plan/source context. Dates are the original row dates. Evidence references and original line numbers are pinned to the baseline, even if shipping rebases this report.

Conservative rule: uncertainty stays live. Archiving a completed implementation plan does not retire the behavior it introduced. A narrow confirmed component does not settle an entire mixed row. A directly contradicted commitment is classified superseded with its surviving parts called out in evidence; those parts still need owner review and must not be silently discarded. Duplicate detection here requires identical Call text. No inference from code renaming alone is used to retire a call.

| Topic | live | superseded | owner-answered | obsolete | duplicate | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Core loop, pacing and progression | 108 | 16 | 1 | 0 | 0 | 125 |
| Rail, construction, levels and travel | 386 | 16 | 1 | 0 | 0 | 403 |
| Rewards, co-op and town roles | 48 | 2 | 1 | 0 | 0 | 51 |
| Characters, cosmetics and story | 16 | 0 | 1 | 0 | 0 | 17 |
| Graphics, water, sky and devices | 5 | 1 | 0 | 1 | 0 | 7 |
| Audio | 0 | 0 | 0 | 0 | 0 | 0 |
| Controls, HUD and arrival | 17 | 0 | 1 | 0 | 0 | 18 |
| Architecture, tools and prototype lifecycle | 67 | 4 | 0 | 0 | 3 | 74 |
| **Total** | 647 | 39 | 5 | 1 | 3 | **695** |

## Core loop, pacing and progression

- **CL-001 — Additional fast boiler proposed for High Gorge** · `superseded`. [docs/decisions-core-loop.md#d-2026-11-15-garage-trade-answers](../decisions-core-loop.md#d-2026-11-15-garage-trade-answers): The later garage trade answers explicitly rule out the proposed trade for line two at High Gorge.

- **CL-006 — Slow overloaded travel and reposition early delivery racks** · `superseded`. CL-005, [docs/agent-calls.md:23](../agent-calls.md) (baseline line 23): The later Fix3 restores the bounded 128-pile table and explicitly replaces unbounded/recycling drop policies. The speed and rack choices remain; this row is classified for its contradicted drop policy.

- **CL-007 — Prototype harvesting and carrying choices before the boiler** · `superseded`. [docs/decisions-core-loop.md#d-2026-11-16-first-line-choice-two-stages](../decisions-core-loop.md#d-2026-11-16-first-line-choice-two-stages): The newer owner-approved staged experiment is an early double-jump versus carry-12 choice; the earlier whetstone-versus-sling prototype is replaced, with current progression retained until built.

- **CL-027 — Preload kits for an entire newly opened leg** · `superseded`. RC-127, [docs/agent-calls.md:280](../agent-calls.md) (baseline line 280): All remaining kits are due together, limited to running trains minus one, amending the earlier kitLead policy.

- **CL-029 — Keep the next section's kit travelling ahead** · `superseded`. CL-027, [docs/agent-calls.md:45](../agent-calls.md) (baseline line 45): Whole-leg preloading explicitly amends the older one-section-ahead rule; RC-127 subsequently refines allocation.

- **CL-035 — Initially represent extra carrying capacity only in the readout** · `superseded`. CL-021, [docs/agent-calls.md:39](../agent-calls.md) (baseline line 39): The later build adds an actual steel car to each fitted line-two train, replacing the readout-only interim state.

- **CL-037 — Share the installer's lifting anticipation with nearby players** · `superseded`. CL-023, [docs/agent-calls.md:41](../agent-calls.md) (baseline line 41): The first boiler install shares the moment only from acceptance; shared anticipation is deferred to the second install. This narrows the earlier all-installs policy.

- **CL-043 — Deliver the steel car alongside its boiler upgrade** · `superseded`. CL-025, [docs/agent-calls.md:43](../agent-calls.md) (baseline line 43): The later staged delivery explicitly bends the same-build requirement; CL-021 then supplies the actual car.

- **CL-059 — Expose kiln interaction even without suitable cargo** · `superseded`. CL-014, [docs/agent-calls.md:32](../agent-calls.md) (baseline line 32): The later kiln prompt explicitly replaces the older either-material wording with combined requirements and counts.

- **CL-065 — Raise and relocate the lookout's secret approach** · `superseded`. CL-064, [docs/agent-calls.md:82](../agent-calls.md) (baseline line 82): The subsequent measured shelf correction lowers the top from 20.4 m to 20.0 m.

- **CL-068 — Add a small kiln direction sign after the throat opens** · `superseded`. CL-056, [docs/agent-calls.md:74](../agent-calls.md) (baseline line 74): The later path and fingerpost appear at breaker collection rather than throat opening; other sign choices remain.

- **CL-069 — Paint a walkable-looking route from the quarry halt** · `superseded`. CL-056, [docs/agent-calls.md:74](../agent-calls.md) (baseline line 74): The same path now appears at breaker collection rather than the later throat strike.

- **CL-081 — Choose upgrades beside the affected machine** · `superseded`. [docs/decisions-core-loop.md#d-2026-11-10-open-calls-answered-the-train-upgrade](../decisions-core-loop.md#d-2026-11-10-open-calls-answered-the-train-upgrade): The later owner answer permits the garage upgrade screen. The absolute no-menu clause is replaced; choosing at the physical machine remains.

- **CL-098 — Teach the dedicated glide control before the jump move** · `superseded`. [docs/agents/owner-calls.md#jump-is-the-gliders-button](../agents/owner-calls.md#jump-is-the-gliders-button): The owner explicitly replaces teaching Glide/Q/LB with the Jump glyph, while retaining Q and LB as alternates.

- **CL-105 — Have the bot pull the summit switch on its first visit** · `superseded`. [docs/decisions-core-loop.md#d-2026-11-15-fly-first](../decisions-core-loop.md#d-2026-11-15-fly-first): The switch moves off the summit to the sea gate and arrives with Q4, replacing the bot policy of pulling it on the first summit visit; the pack choice is not separately settled.

- **CL-110 — Open gliding after available air jumps are spent** · `superseded`. [docs/agents/owner-calls.md#jump-is-the-gliders-button](../agents/owner-calls.md#jump-is-the-gliders-button): The owner explicitly replaces Jump doing nothing while the canopy is open: Jump now closes it. Opening after air jumps are spent remains.

- **CL-121 — Teach gliding with a pulsing jump symbol** · `owner-answered`. [docs/agents/owner-calls.md#jump-is-the-gliders-button](../agents/owner-calls.md#jump-is-the-gliders-button): Owner: "Jump is the glider’s button". The entry explicitly states that the first-fall teaching displays Jump, confirming this original glyph choice after an intervening Glide-glyph default.

## Rail, construction, levels and travel

- **RC-036 — Collapse completed frames and leave sleeper decoration** · `superseded`. CL-017, [docs/agent-calls.md:35](../agent-calls.md) (baseline line 35): Completed frames now leave no sleeper stack; this directly replaces the decoration choice.

- **RC-040 — Replace generic depot text with the actual cargo** · `superseded`. CL-015, [docs/agent-calls.md:33](../agent-calls.md) (baseline line 33): The shipment tag now compares stock against outstanding needs instead of simply naming the load.

- **RC-061 — Provide a temporary stair between landing and commons** · `superseded`. RC-001, [docs/agent-calls.md:149](../agent-calls.md) (baseline line 149): The later opening-area change removes the temporary grey stair and parapets, using shore access instead. Other leg-two calls remain.

- **RC-074 — Propose paired trains exchanging service at Ring Island** · `superseded`. RC-068, [docs/agent-calls.md:221](../agent-calls.md) (baseline line 221): The later ruling explicitly parks this held short-turn proposal and withdraws its owner question.

- **RC-075 — Show a proposed short turn before passengers board** · `superseded`. RC-068, [docs/agent-calls.md:221](../agent-calls.md) (baseline line 221): The later ruling explicitly parks the pre-boarded short-turn mechanism pending failure on a future leg.

- **RC-084 — Compare fourth-car performance against an older fixed sheet** · `superseded`. RC-066, [docs/agent-calls.md:219](../agent-calls.md) (baseline line 219): The later row explicitly replaces this same-day checkpoint bar with a comparison against rebased main.

- **RC-090 — Reserve the old table's turning envelope and controls** · `superseded`. RC-085, [docs/agent-calls.md:238](../agent-calls.md) (baseline line 238): The later garage placement expressly amends this original stand, jib and camera placement.

- **RC-126 — Expand the fleet earlier along the stack leg** · `superseded`. RC-069, [docs/agent-calls.md:222](../agent-calls.md) (baseline line 222): The subsequent fleet choice uses six trains from the first stack section instead of the earlier five/fallback schedule.

- **RC-154 — Leave all four greybox operations unpredicted initially** · `superseded`. RC-129, [docs/agent-calls.md:282](../agent-calls.md) (baseline line 282): Kit deposits become predicted while the other named greybox actions remain server-confirmed, replacing the blanket no-prediction rule.

- **RC-158 — Defer the installation spectacle until the Home flip** · `superseded`. RC-088, [docs/agent-calls.md:241](../agent-calls.md) (baseline line 241): The garage moment is mounted at the existing Home table before the layout flip, replacing the earlier wait-for-flip staging.

- **RC-162 — Grow line two's fleet gradually by section** · `superseded`. RC-126, [docs/agent-calls.md:279](../agent-calls.md) (baseline line 279): The later fleet row expressly replaces the progressive 3/4/5/5 schedule; RC-069 subsequently increases the fleet again.

- **RC-179 — Keep the folded wing within the machine's footprint** · `superseded`. RC-185, [docs/agent-calls.md:338](../agent-calls.md) (baseline line 338): The measured folded wing is expressly accepted as larger than the old footprint; this contradicts the original size constraint.

- **RC-189 — Keep the balcony inaccessible without gliding** · `superseded`. RW-008, [docs/agent-calls.md:569](../agent-calls.md) (baseline line 569): The later economy call accepts bought-house rooftop access to the balcony without gliding; other safety constraints remain.

- **RC-243 — Build the bay route through Bell Rock to Canopy** · `superseded`. [docs/decisions-core-loop.md#d-2026-11-12-campaign-outline-answered](../decisions-core-loop.md#d-2026-11-12-campaign-outline-answered): The owner fixes High Gorge before the Canopy branch, replacing the Canopy-first order; the bay-line layout details are not separately ruled here.

- **RC-341 — Replace automatic platform calls with request levers** · `owner-answered`. [docs/decisions-rail.md#d-2026-11-10-trains-stop-on-request-at-the](../decisions-rail.md#d-2026-11-10-trains-stop-on-request-at-the): Owner: "Stop on request". The entry specifies request levers at halts and otherwise running through, confirming replacement of automatic walk-on calls.

- **RC-343 — Reverse trains early toward requests behind them** · `superseded`. RC-289, [docs/agent-calls.md:442](../agent-calls.md) (baseline line 442): The later rule explicitly drops early turn-back and requires each train to run end to end.

- **RC-373 — Arrange recovered crates beside the trophy plinth** · `superseded`. RC-365, [docs/agent-calls.md:518](../agent-calls.md) (baseline line 518): The revised crate arrangement expressly supersedes the old placement beyond the plinth.

## Rewards, co-op and town roles

- **RW-010 — Retain unbought building blocks until layout approval** · `superseded`. RW-009, [docs/agent-calls.md:570](../agent-calls.md) (baseline line 570): The later economy implementation explicitly replaces holding unbought blocks until owner sign-off with outlines in A2.

- **RW-033 — Exclude all construction errands from freight stopping** · `superseded`. RW-018, [docs/agent-calls.md:579](../agent-calls.md) (baseline line 579): The later exemption allows stone stops for kits whose destination is not open, narrowing the blanket ban on loaded kit trains.

- **RW-041 — Use shared money with physical coins as props** · `owner-answered`. [docs/decisions-rewards.md#d-2026-11-11-boogles-the-five-open-questions-answered](../decisions-rewards.md#d-2026-11-11-boogles-the-five-open-questions-answered): Owner: "I like your recommendations for 1-5". Answer 1 explicitly confirms no personal balances, automatic shared fares and carried coins as props.

## Characters, cosmetics and story

- **CH-005 — Suggest resident occupations without authoring their identities** · `owner-answered`. [docs/decisions-rewards.md#d-2026-11-11-boogles-the-five-open-questions-answered](../decisions-rewards.md#d-2026-11-11-boogles-the-five-open-questions-answered): Owner: "I like your recommendations for 1-5". Answer 5 accepts the brief's roles as a starting list, including the retired driver, baker and lost-property keeper; characters and lines remain the owner's.

## Graphics, water, sky and devices

- **GX-005 — Limit the initial terrain kit and seek a style selection** · `superseded`. [docs/decisions-look.md#d-2026-11-15-plain-path-climbs](../decisions-look.md#d-2026-11-15-plain-path-climbs): The owner orders painted timber risers and their highlights removed, contradicting their retention in this mixed kit row. Other kit defaults still need review.

- **GX-006 — Compare water before extending the lighting treatment** · `obsolete`. [docs/archive/README.md:105](../archive/README.md) (baseline line 105) and docs/archive/plans/water-sunshine.md: the water-only comparison is closed; selected B is default and Ultra/A were removed. This is the completed comparison-stage sequencing instruction, not the still-live swell choice in GX-007.

## Audio

No rows in the baseline table.

## Controls, HUD and arrival

- **HU-017 — Trial spring lag for the carried beam** · `owner-answered`. [docs/decisions-process.md#d-2026-11-08-the-summit-switch-opens-early-switch](../decisions-process.md#d-2026-11-08-the-summit-switch-opens-early-switch): Owner: "Try option 1 for log". The entry identifies that option as local visual spring lag and a clearer grip for the great beam.

## Architecture, tools and prototype lifecycle

- **AT-006 — Route work through the former two-mode model scheme** · `superseded`. [docs/agents/models.md#models-and-effort](../agents/models.md#models-and-effort): The current policy cites the owner, 15 November: "just have one schema for model routing that I will update when we need to". One table with no modes replaces withCodex-mode routing.

- **AT-011 — Keep sensitive implementation on the former Opus route** · `superseded`. [docs/agents/models.md#models-and-effort](../agents/models.md#models-and-effort): Current routing puts high-risk implementation on Astra and ordinary implementation on Sol; the former Opus/Sonnet implementation split is replaced by the one-table policy.

- **AT-024 — Report the kiln's existing prompt as insufficient signalling** · `duplicate`. Identical Call text to AT-015, [docs/agent-calls.md:696](../agent-calls.md) (baseline line 696); keep AT-015, remove only the repeated occurrence in a later owner-approved cleanup.

- **AT-025 — Prioritize one-to-three-player grind measurements** · `duplicate`. Identical Call text to AT-016, [docs/agent-calls.md:697](../agent-calls.md) (baseline line 697); keep AT-016, remove only the repeated occurrence in a later owner-approved cleanup.

- **AT-026 — Flag ordering defects only against owner-decided dependencies** · `duplicate`. Identical Call text to AT-017, [docs/agent-calls.md:698](../agent-calls.md) (baseline line 698); keep AT-017, remove only the repeated occurrence in a later owner-approved cleanup.

- **AT-049 — Remove glider code during Place retirement and restore it later** · `superseded`. CL-106, [docs/agent-calls.md:124](../agent-calls.md) (baseline line 124): The later row explicitly replaces removal-and-later-restoration with porting the glider before D1.

- **AT-052 — Give each player independent station-completion rewards** · `superseded`. RC-397, [docs/agent-calls.md:550](../agent-calls.md) (baseline line 550): Production station rewards cover Q2 through Q6, explicitly correcting the broader T3 and Q1-through-Q6 row.

## Spot-check and scope notes

All non-live evidence is included above, so classes with fewer than five results expose every result. Live is the conservative research outcome, not an assertion that the owner has agreed or that code still matches every detail. In particular, temporary measurements, held proposals, copy candidates and archived-plan defaults stay live unless the cited replacement or completed stage is explicit.

The JSON has 695 distinct IDs, exact topic cardinalities and dates, nonempty single-line paraphrases and plan/source context for every row; each non-live row has evidence and each duplicate points to its retained baseline occurrence. Only these two report files are changed.
