# Game-direction skill: four prompt tests

_Research report, 3 November 2026. Manual acceptance test of the installed game-direction skill through `.agents/skills/game-direction/SKILL.md`, at checkout `75526a2ad41bd567bdfa776e7e77ff5998423348`. Four supplied prompts, seven pass criteria, reading cost and freshness findings. Live primary-source research checked the production reasoning. Recommendations only; no gameplay, skill, direction or plan changes are authorized by this report._

**Evidence:** **[R]** repository text/history inspected; **[V]** primary-source web text read this run; **[D]** interpretation or recommendation. Existing gameplay results are attributed records, not repeated tests. Not tested on a device. No video, Line Map artifact or live deployment was inspected.

## Result and method

**Pass: all four answers and all seven requested criteria in this manual, context-aware test.** The skill helped by requiring current evidence, separating prerequisites from preferences, and preserving owner authority. It did not eliminate stale documentation or supply automatic discovery of the latest tracker. This is not a blind model benchmark: the evaluator saw the pass criteria, shared context across cases, and read the earlier worked answers. It establishes that the written procedure can produce compliant answers, not that every fresh agent will reliably do so. **[D]**

The installed entry resolves through `.agents/skills -> ../.claude/skills`; the tested instructions are [game-direction/SKILL.md](../../.claude/skills/game-direction/SKILL.md). I followed its docs route, decision-index routing, current-state comparison and compact-answer fields for (a)–(c). For (d), I tested the invocation boundary and stopped before a direction consultation. The request here is to evaluate a hypothetical typo fix, not to modify receiver code. **[R]**

The initial `map --kind research` was invalid; `map --kind` identified `docs`, which is also the skill's explicit route. `map --kind docs`, the decision-index and prototype-rule section routes then succeeded. `inflight` initially hit a sandbox FETCH_HEAD permission error and succeeded on the permitted retry; `codex-status` found this job and existing rails/graphics jobs. No job was restarted or duplicated. In-flight README edits elsewhere make a narrow index addition appropriate; no other branch was modified.

## Current evidence that changes the answers

- The [3 November round-4 playtest](../playtests.md#2026-11-03-round-4-two-players-the-default-url) exists: two familiar players, about 35 minutes, hunger and relief twice, one tedious rail-fetch stretch. Neither player was blind. The survey remained outstanding in that record. This is an encouraging integrated loop, not production or campaign acceptance. **[R]**
- [Round-4 notes](../plans/round-4-notes.md) also exists, last changed at `2c5b35e6`. It separates shipped fixes, running work, unassigned notes and unanswered questions. Riding ejections, invisible partner cart/load and cart recall are recorded fixed and shipped, still to be played. HEAD history contains `9c8bda58`, `2691519c`, `4128e0aa` and `d3ba332e`; these are not fresh implementation tasks. The freeze fix is explicitly not proven to be Grant's exact case. **[R]**
- The later **3 November, trees** decision in [The shape of the game](../proposals/boogle-2.md#the-shape-of-the-game) approves ordinary trees with the first axe, finite supply, faster upgraded chopping and two visibly distinct optional hardwood trees. “The exact mechanism waits on research” is superseded for that scope. Cart first still only **leans yes**. The tracker puts it **after `little-guys-rails`**. **[R]**
- [As-built entry](../game-design.md#1-overview) already puts round 4 on the main URL. [Place ownership](../game-design/place.md#how-its-built) and [mainline findings](../plans/mainline-architecture.md) still describe tab-owned railway progression and room-keyed localStorage. A default URL and working room transport do not prove durable railway state. This report uses those owning documents; it does not independently re-audit implementation. **[R]**
- [Beautiful-corner steps 1–2](../plans/beautiful-corner.md#ordered-work-after-approval) are checked and have baseline/rough-fit evidence. The approved target is line 1 Station 3, 40 logs plus the great beam, the whole first crossing and walk home. The old Station-2/24-log research target is superseded. Only the narrow `&corner=1` rough fit was implemented; final quality and second-arrangement reuse are not complete. **[R]**

## (a) “We want real multiplayer and to make this the main game: what's next?”

**Disposition: prerequisite first. Recommendation: close the changed round-4 loop, then propose one durable shared construction path.** Friends should build something that survives their departure and return: **Cooperation is automatic**, **Designed for drop-in, drop-out**, and **Leave something for the next visitor** in [DESIGN](../../DESIGN.md). The default-entry switch is already done; repeating it is not the next milestone.

**Now:** the owner-adopted working map in [direction.md](../direction.md) calls this phase 0, closing round-4 discovery. The original round was played; the changed loop still lacks recorded owner acceptance. This report proposes no replacement phase. The [tracker](../plans/round-4-notes.md) is the task owner, and the shipped ride fixes need replay evidence, not reimplementation.

**Before production conversion:** correctness infrastructure is partly met (server rooms exist), but durable railway ownership is missing per [mainline findings 1, 2 and 5](../plans/mainline-architecture.md); loop acceptance and blind readability are missing evidence; conversion scope approval is missing. Exact current completion of jobs remains unknown from status labels alone. Do not infer “merged” from “finished”.

1. Reconcile the rails, approved tree work and objective removal with actual landed changes; prepare the corrected run without reopening shipped riding work.
2. Stop for the owner's short replay: “Did you get hungry for a better way, and did finding one feel great?” Watch a fresh player for guidance without the marker; record that separately from the familiar players' verdict.
3. Once the loop gate is satisfied, propose a bounded conversion around one material → station → track → payoff path, using the existing mainline findings. Its proof must cover solo/two-player delivery, last-piece contention, departure during delivery, rejoin and server restart with conserved materials and no duplicate rewards. The owner approves scope before implementation.

**Parallel/deferred:** systems and graphics that do not affect the flow under test may continue under the exact [owner exception](../agents/owner-calls.md#owners-standing-calls), and collaborators may ship. That does not approve a new corner stage. Defer new areas/content multiplication until the shared path and representative reuse are proven. Alternative: if the owner wants conversion before replay, request that specific ordering exception; it risks preserving a loop the replay changes.

**Did the skill help? Yes.** It separates main-URL promotion, temporary co-op, durable progression and a production slice, and prevents the original riding failures from becoming duplicate jobs.

## (b) “We want a cart first, then trains.”

**Disposition: bounded experiment; owner decision needed on its scope. Recommendation: compare a clearly modest cart with a clearly better train on the same route after `little-guys-rails`.** This serves **Toys before chores** and **Telegraph everything**: players should want and recognize the upgrade, rather than say they already had a train. [Owner call](../proposals/boogle-2.md#the-shape-of-the-game), [tracker](../plans/round-4-notes.md#trains-and-cart).

**Now:** still phase 0. “Makes sense, maybe” is a leaning, not a decided progression replacement. In this test the quoted prompt is a scenario, not a new owner decision overriding the actual record. In a real consultation an explicit later owner decision would supersede that record; the skill correctly says not to ask again for already-authorized work.

**Before the comparison:** rails relief landing is a missing/unknown ordering prerequisite; its job was still running when checked. Distinct cart/train value is missing player evidence. Rides are recorded fixed, human replay pending; another riding rewrite is not a prerequisite. A broad vehicle system or whole-campaign rebalance is unnecessary.

1. Finish/review the already-owned rails-relief track, then settle whether the owner wants this bounded comparison.
2. If authorized, use the existing route and cart/train owners referenced by [mainline findings](../plans/mainline-architecture.md) and [place as built](../game-design/place.md#how-its-built): `depot.ts` for cart and `cargo.ts`/`rail.ts` for trains. Make the capability/payoff contrast legible while keeping unrelated costs and abilities stable.
3. Stop at “Was the train an upgrade you wanted?” Accept a direction only from the owner's response, with observed behavior supporting it.

**Parallel/deferred:** approved independent graphics can continue. Defer extra vehicle tiers, new routes and campaign retiming. Alternative: retain the current vehicles and clarify their different jobs first; choose that if the comparison is declined or the problem proves to be communication rather than progression.

**Did the skill help? Yes.** It preserves the tentative decision, asks for the smallest discriminating proof and retains the tracker’s rails-first dependency. The earlier research answer alone omitted that newly available dependency.

## (c) “We want the beautiful corner now.”

**Disposition: prerequisite first for step 3; proceed only within existing approved scope. Recommendation: review the completed Station-3 baseline/rough fit and clear its named integration gate before final surfaces.** The outcome is visible pride in work becoming a crossing, serving **Toys before chores**, **Telegraph everything** and **Show, don't tell**.

**Now:** the corner is a parallel quality target within phase 0, not phase-2 acceptance. [Steps 1–2 are recorded complete](../plans/beautiful-corner.md#step-2-record--3-november-2026); do not restart them. The first playtest is no longer pending, despite older plan wording. That resolves an evidence dependency, not permission for steps 3–5.

**Before step 3:** approved real-sea integration in this working build, the once-baked demo-sky/AgX `tod=0.24`, and an owner-approved terrain adoption outcome must land. These are quality-integration dependencies **not established as met by this audit**. Comparison flags and water steps 1–3 alone are expressly insufficient. The approved scope remains steps 1–2; later scope approval is also missing. Larger material/contact defects require separately agreed scope where needed.

1. Compare the completed rough-fit record with the now-available round-4 notes, retaining its route, bills, speed, rewards, controls and Local-only presentation boundary.
2. When the integration dependencies and authority for step 3 are established, integrate the final shore/material hooks and stop at owner review 1: “Does this place belong together?” Do not build a second sea or duplicate the terrain track.
3. Only after the staged approvals: step 4 aligns construction action/contact sound and restrained life, then review 2; step 5 validates ordinary play and measures one temporary second arrangement, then review 3 and stop. Neither attractive stills nor completed bots substitute for those judgments.

**Parallel/deferred:** the existing sea/terrain owners can finish their authorized work without a new global gameplay freeze. Alternative while step 3 waits: review the existing kit evidence and audit list; no unapproved final-bank or choreography pass. Defer whole-world polish and production-slice claims until accepted quality, durable co-op and measured reuse exist.

**Did the skill help? Yes.** Its distinction between a quality target and a production slice, plus exact owner exceptions, preserves every stage boundary without blocking already-authorized independent work.

## (d) “Fix a typo in a station's receiver code.”

**Direction disposition: not applicable. Answer: make the narrow typo correction through the ordinary bug-fix route; no direction review, phase assessment or roadmap choice.** The skill's description excludes ordinary fixes within approved scope; [AGENTS](../../AGENTS.md) and [owner-calls](../agents/owner-calls.md#deferring-to-direction) agree. The `map --kind feature-fix` output also explicitly excludes the design corpus unless a design decision is being made.

Locate the actual file before choosing its ownership recipe; the generic feature route's `src/features` owner is not evidence that a station receiver lives there. An implementing worker reads TypeScript guidance and applicable nested instructions; if the typo actually changes wire semantics or accepted effects, those literal safety triggers still apply. Such checks do not automatically become a game-direction review. No actual file or typo was supplied, and no code is changed in this research task.

**Did the skill help? Yes, by staying out of the way.** Its invocation boundary is clear. This is a manual routing pass, not proof of automatic skill selection in a fresh agent session.

## Acceptance scorecard

| Criterion | Result | Evidence in this test |
| --- | --- | --- |
| Finds the 2026-11-03 playtest | **PASS** | Dated section read; two familiar players and changed-loop evidence limits appear in (a). |
| Finds `docs/plans/round-4-notes.md` | **PASS** | Tracker read; shipped/running/unassigned distinctions and rails-before-cart used. |
| Does not redo shipped riding fixes | **PASS** | Tracker and HEAD history checked; (a)/(b) request replay, not a rewrite. |
| Keeps cart first a leaning | **PASS** | Tentative call retained; comparison approval and explicit-owner-override distinction stated. |
| Keeps corner stage boundaries | **PASS** | Steps 1–2 complete; step 3 dependencies and scope gate retained; reviews 1–3 and measured reuse remain. |
| Keeps owner as decider | **PASS** | Recommendations grant no implementation authority; exceptions and later explicit decisions remain the owner's. |
| Typo fix avoids direction review | **PASS** | (d) exits at trigger classification; technical safety rules remain independent. |

## What was confusing, stale or costly

**Reading cost.** Across the four cases and report setup, 21 distinct repository documents were consulted, including partial reads. Ten complete core documents total **45,306 characters / 398 lines**: AGENTS, the skill, codex, tools, tests, owner-calls, context, shipping, DESIGN and direction. The other eleven were the research README, two report-format examples, decision log, prototype rules, round-4 tracker, corner plan, mainline findings, playtests, game-design index and place as-built. Large files were searched/section-read; some initial batched output was truncated and relevant portions were reread separately. Their whole-file size is not a claim of text read. No reliable total token/time measurement was captured. **[R]**

This is a shared cold-start cost, not 21 files per question. (a) uses the common core plus playtest/tracker/as-built/mainline findings; (b) adds the dated cart call and tracker ordering; (c) adds the corner stages and current Look calls. (d) needs **zero direction-corpus reads** beyond recognizing the exclusion. Two earlier research examples were inspected for date/scope, evidence labels, inline sources and numbered recommendations. Six primary web documents were opened. No source implementation files were read or edited; no high-risk code folder was touched/reviewed, and file discovery found no nested AGENTS under the documentation paths. The source links above are plan-owned pointers, not new code-audit claims.

| Finding | Assessment and consequence |
| --- | --- |
| Skill says “relevant current plan, playtest evidence and as-built section” without concrete discovery pointers | Not wrong, but weak for a cold start. `direction.md` supplies the tracker link; its absence would add searching. Explicit dated playtest/tracker routing would improve repeatability without requiring the entire corpus. |
| Skill requires reviewed commit **and source revisions**, but direction lists only `0562c947` and filenames | Freshness metadata is incomplete. At HEAD `75526a2a`, the tree decision changed after the reviewed base. A source-specific revision table would make refresh checks cheaper and more precise. |
| Direction says the notes must be “worked through” | Ambiguous: could mean reconcile consequential loop notes, or finish every cosmetic nit and open idea before production-core planning. Do not silently turn this into an all-checkbox gate. Owner decides blocking scope; retain unanswered observations. |
| Direction says trees/rails “in progress” and nothing played since | A dated snapshot, not a live job feed. Tracker labels and `codex-status` already differ for several jobs (finished versus running). Neither proves merged or accepted. Say “no later playtest recorded” rather than claiming knowledge of all human play. |
| Decision index's Graphics row still mentions Neutral open/original sky retained | Stale relative to its own later Look entries selecting demo sky/AgX and the corner's explicit gate. The skill's instruction to read routed dated entries rescued (c); the summary alone could misroute it. This is in `boogle-2.md`, not `direction.md`. |
| Corner opening/step 1 and mainline opening still say the owner plays tonight/before further development | Superseded by the dated playtest. Preserve the corner's separate authorization and integration gates; do not treat removal of stale timing as new approval. |
| Original `research/game-direction.md` says tracker absent and skill not installed | Accurate as a historical report at its recorded revision, stale as current instructions. Its worked examples must not be copied verbatim as fresh advice. |
| Compact answer requests six fields alongside at most three steps | Useful but easy to inflate. Put prerequisites in one paragraph/table and keep actual actions to three; omit the entire template for (d). |

No binding conflict required an owner answer to finish this report. Proposed improvements below are not applied: the authorized diff is only this report and its README entry.

## Live primary-source cross-check

**Production proof. [V]** Rami Ismail distinguishes design prototypes from a vertical slice that tests the production pipeline, and recommends making a second thing to expose repeat cost. This supports separating cart experimentation, a corner quality target and repeatable production. It does not supply Boogle's exact gates or authorize work. [Prototypes & Vertical Slice](https://ltpf.ramiismail.com/prototypes-and-vertical-slice/).

**Human evidence. [V]** Mark Cerny and Michael John's *Myth vs. Method* separates preproduction from production and stresses watching players alongside statistics: counts alone cannot tell whether play was enjoyable. This supports (a)'s distinction between a bot completing the path and the owner/fresh player's experience; their production method is precedent, not a mandatory schedule for Boogle. [Game Developer, June 2002, printed pp. 30–36](https://media.gdcvault.com/GD_Mag_Archives/GDM_June_2002.pdf).

**Joining is its own proof. [V]** Factorio's developer describes joining as loading a map while receiving inputs, then catching up without disturbing existing clients if the join fails. The useful inference is to test departure/rejoin explicitly; copying Factorio's packet design is outside this task. [Friday Facts #149](https://www.factorio.com/blog/post/fff-149).

**Engine comparison. [V/D]** [Unreal's overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/networking-overview-for-unreal-engine) places authoritative game state on the server and warns about late networking retrofits. [Unity NGO 2.7 anticipation](https://docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.7/manual/advanced-topics/client-anticipation.html) separates anticipated presentation from authoritative values. [Godot's high-level multiplayer](https://docs.godotengine.org/en/stable/tutorials/networking/high_level_multiplayer.html) distinguishes authority RPCs from any-peer calls. These support the existing [mainline findings](../plans/mainline-architecture.md), not a new engine/framework migration. Boogle's declared difference remains deterministic server-stamped persistent edits, Local presentation and Owner Rapier physics; this report proposes a proof of that existing contract, not a new ownership design.

## Numbered recommendations for Boogle

1. **Keep the skill and its narrow trigger.** Retain the ordinary-fix exclusion in [SKILL.md](../../.claude/skills/game-direction/SKILL.md) and [AGENTS](../../AGENTS.md); repeat these four prompts in fresh sessions before claiming robust automatic routing.
2. **Make current-evidence discovery explicit.** In the skill's current-state section, route to dated [playtests](../playtests.md) and the active [round-4 tracker](../plans/round-4-notes.md); keep shipped fixes separate from acceptance evidence.
3. **Refresh the derived view with source revisions and named blockers.** In [direction.md](../direction.md), distinguish loop-blocking notes from deferred work, record source revisions and qualify “no later playtest recorded”; refresh the stale Graphics index in [boogle-2](../proposals/boogle-2.md#current-decision-index) without rewriting historical calls.
4. **Close round-4 evidence before multiplying content.** Use [round-4-notes](../plans/round-4-notes.md) to reconcile rails/trees/objective work, then stop for replay; use [mainline findings](../plans/mainline-architecture.md) for the subsequent owner-approved durable-path proposal.
5. **Keep cart-before-trains a bounded, rails-dependent comparison.** Preserve the leaning and `little-guys-rails` dependency in [the tracker](../plans/round-4-notes.md#trains-and-cart); judge desired relief before changing the broader progression.
6. **Continue the corner only through its existing staged gates.** [Beautiful-corner.md](../plans/beautiful-corner.md) owns completed steps 1–2, step-3 integration dependencies, the three owner reviews and measured reuse; update stale playtest timing without granting later-stage authority.

## Verification and limits

The report checks instruction routing and documentation/history, not current gameplay correctness. The seven passes are manual judgments over the answers above. No isolated model trials, gameplay run, new device result, deployment verification or Line Map review is claimed. Live source text was read; talks were not watched. The scope is two Markdown files. `npx prettier --write` and `--check` were invoked on both; the repository ignores Markdown, so these did not format or validate their contents. Targeted ESLint likewise reported both ignored (zero errors). All 37 report link destinations were checked, with no missing local file targets; `git diff --check` passed. `npm run check` passed: lint, TypeScript, 292/292 unit tests, registry, five level fixtures, four fresh assets and production build. No push or ship is requested.
