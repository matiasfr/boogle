> **Status: proposed (2026-11-28).** Light one-pass brainstorm (one agent, three lenses: Play Designer, Systems Architect, Creative Director) and author design review for Lane C Part 8, following Parts 1–4 on Home ([lane-c](../plans/lane-c.md)), Part 5 on Ring Island ([lane-c-next](lane-c-next.md), #2691, v85), Part 6 on High Gorge ([lane-c-part6](lane-c-part6.md), #2710, v87), and Part 7 on Canopy Town ([lane-c-part7](lane-c-part7.md), built & reviewed on `codex/lane-c-part7`, v90 — treated as done) for [course-change](../plans/course-change.md#lane-c-towns-are-the-hangout). Baseline: `origin/main` `887306137`. `npm run inflight`: `ship/matias-franco-bd12998` (Lane B pre-leg); [orchestrator-state](../agents/orchestrator-state.md) also lists `codex/lane-b-preleg`, `codex/lane-c-part7`, `codex/living-world-2`, `codex/look-card16`, and `codex/welcome-board`. All building names, board words and prompts below are `[placeholder]` for the owner ([d-2026-11-11-the-story-and-characters-are-the-owner-s](../decisions-characters.md#d-2026-11-11-the-story-and-characters-are-the-owner-s)); none of The Boogler's copy is touched.

# Lane C Part 8: Towns come alive (hangout cross-play, crowd cheer, and passing-train greetings)

## Pitch

Parts 1 through 7 stood up seven room-picked hangout builds across four towns — Home's four Round plots plus one arrival plot each on Ring Island, High Gorge, and Canopy Town — at the cost of six `WORLD_NS` bumps in a row. Because each pass raced to stand up one plot, the built hangouts still behave like isolated props: on Home's Round, the Frisbee Boathouse's disc passes straight through the Cowbell Court goals, Horn Pavilion pads, and Dunk Bakery paddle; the Dunk Bakery tips its bucket without splashing anyone standing under it; nearby little guys stroll blindly past goals, chords, and splashes without reacting; and a rider honking from a passing train gets silence from every built signal/musical hangout along the line.

**Part 8 makes the hangouts already built feel alive and connected — with ZERO railway rule changes, ZERO server edits, and ZERO `WORLD_NS` bump.** In one small, client-only pass that runs in parallel beside every in-flight rule branch ([d-2026-11-28-backlog-beyond-rail-rules](../decisions-process.md#d-2026-11-28-backlog-beyond-rail-rules)), Part 8 wires three high-payoff local interactions over state and messages the game already has:

1. **Home Round toy cross-play & slapstick payoff:** let the Boathouse's Owner-synced frisbee (`disc.p`) ring Cowbell Court goals, blast Horn Pavilion brass pads, and tip the Dunk Bakery paddle alongside the beach ball; give a player standing under the Dunk Bakery bucket (`≤ 1.2 m`) a brief local slapstick splash-hop (`vel.y ≥ 5.5 m/s`, no stun or seat lock); and give Caddy Shed's three golf cups a local 3-cup stroll flourish (`chordSound` + sparkle burst, no HUD score).
2. **Townsfolk crowd cheer:** hook Home's existing `cheerAround(x, z, 16, 1.4)` (`src/place/folk.ts`, throttled per 3 s) to Cowbell goals, 3-pad Horn chords, Dunk splashes, Golf sinks, and Boathouse can clatters so nearby little guys turn, hop, and cheer whenever a player messes with a hangout.
3. **Passing-train town greetings:** add a tiny local `onHonk` listener in `src/features/honk.ts` (over the existing `{ t: 'honk' }` message) so honking from a passing train — or anywhere within 260 m — makes any resident town's built musical/signal hangout (`[Placeholder: Horn Pavilion]` on Home, `[Placeholder: Signal Bellhouse]` on Ring Island, `[Placeholder: Echo Horn House]` on High Gorge, `[Placeholder: Treetop Wind Chime]` on Canopy Town) answer after 0.4 s with a soft, 4 s-throttled welcome chord/ring/echo/chime and sky-mote or steam puff.

**Railway rules / world bump:** **None.** Touches zero `src/sim/railway-*.ts` files, zero `server/src/` files, zero wire or save schemas, and takes **no `WORLD_NS` bump**. Ships on orchestrator read ([d-2026-11-28-faster-reviews](../decisions-process.md#d-2026-11-28-faster-reviews)) and never wipes a live room.

**Principles served:** Core loop ("choice and hanging out live in the towns, where every building adds something to do"), **2. Physics toys are optional fun**, **3. Side activities are never required**, **7. Telegraph everything**, **8. Enjoyable alone and together** (a guest landing at Home's hall board or taking their first train ride immediately feels the town react around them), **10. Slapstick over precision**, and **11. Show, don't tell**. **Principles bent:** None.

## Gut question

When a returning friend or fresh guest messes with a built hangout on Home's Round — or honks from a train rolling past Ring Island, High Gorge, or Canopy Town — does the town feel genuinely alive around them (toys answering each other, little guys hopping to cheer, and built towns waving back in sound and sky-rings) without a single rule, menu, or score?

---

## Candidates weighed

| Candidate | Verdict | Why |
| --- | --- | --- |
| **1. Next hub town getting its first plot: Port Quay Offer 1 (`town = 4, slot = 64`)** | **Deferred to Part 9** | Port Quay (`Area 7`, reached by `cave`, `RAIL_LEGS[4]`) is the fifth and final plot hub town in [campaign-outline](../plans/campaign-outline.md#towns-at-the-hubs) and [greybox-route](../plans/greybox-route.md) (Bell Rock is a connection-grown market hub with stalls, not a plot town, per [d-2026-11-12-market-hub-answered](../decisions-rewards.md#d-2026-11-12-market-hub-answered)). Port Quay already has its Roundhouse (#2563–#2598) and a flat 30 × 30 m `town` reserve (`src/content/levels/leg4.ts:1013`), **but** adding `TRADE_TOWNS = 5, slot = 64` requires railway rule edits, an independent review, and a fourth consecutive Lane C `WORLD_NS` bump — queuing behind `codex/lane-b-preleg` and `codex/lane-c-part7`. It also sits late in the campaign (past the sea cave plug), doing nothing for a guest's first two minutes, and its signature parked hangout (`[Placeholder: Soapbox Garage]`) deserves its own focused pass once rule-branch traffic clears. |
| **2. Second plot at an already-built hub town (Ring Island `slot 17`, High Gorge `slot 33`, or Canopy `slot 49`)** | **Deferred** | Also requires railway rule edits and a `WORLD_NS` bump. Worse, [d-2026-11-25-recommendations-taken-pool](../decisions-rewards.md#d-2026-11-25-recommendations-taken-pool) establishes that hub town plots are staked by their own outward freight deliveries; Parts 5–7 only widened that rule for zero-freight Offer 1 on arrival, leaving Offer 2+ for outward Quarry stone, Ringworks steel, and Gorge copper yards that do not exist yet. |
| **3. Something a guest can do at a built hangout in their first two minutes that counts as helping (`first contribution`)** | **Rejected** | Under [first-contribution-check](../reports/first-contribution-check.md), the checkpoint measure only counts server-accepted route work (deposits, yard drops, footings, and material fed to work sites). Making a hangout toy (ball goal, horn pad, mushroom, dunk) advance a bill or mint materials/Boogles would directly bend **DESIGN.md Principles 2 & 3** ("Physics toys are optional fun... nothing depends on them"; "Side activities are never required") and [d-2026-11-10-open-calls-answered-riders-and-boogles](../decisions-rewards.md#d-2026-11-10-open-calls-answered-riders-and-boogles) ("Boogles come from fares only"), AND would still require a sim/server rule change and `WORLD_NS` bump. Guests already reach `first contribution` through real route work at the Camp ridge or Home's hall/gift bin ([d-2026-11-28-first-fall-lands-at-the-works](../decisions-controls.md#d-2026-11-28-first-fall-lands-at-the-works)). |
| **4. Zero-rule-change, zero-bump pass at the hangouts already built ("Towns Come Alive": cross-play, crowd cheer, passing-train greetings)** | **Recommended (Part 8)** | Touches **zero railway rule files** and takes **zero `WORLD_NS` bump**, so it ships on orchestrator read right alongside `codex/lane-b-preleg` and `codex/lane-c-part7` ([d-2026-11-28-backlog-beyond-rail-rules](../decisions-process.md#d-2026-11-28-backlog-beyond-rail-rules)). Directly upgrades Home's Round — where every guest lands once line 1 reaches Home — and ties all four built towns (Home, Ring Island, High Gorge, Canopy Town) together for solo players and friends riding trains between works. |

---

## Best suggestions (ranked)

1. **`[Systems]` + `[Creative]` Wire Home's existing `cheerAround(x, z, r, seconds)` (`src/place/folk.ts:1125`) to every built Home hangout beat.** *Why:* `cheerAround` already animates a staggered anticipation, ballistic hop, and arm cheer on nearby little guys with zero new state machine code. Firing `cheerAround(x, z, 16, 1.4)` (throttled per 3 s per hangout) on Cowbell goals, 3-pad Horn chords, Dunk splashes, Golf cup sinks, and Boathouse can clatters instantly fulfills the parked note from [lane-c-towns-hangout](lane-c-towns-hangout.md#parked) and gives solo and drop-in players an in-world audience (`comedy-in-games.md` #8, like *Untitled Goose Game* and *Wii Sports*).
2. **`[Play]` + `[Systems]` Let the Boathouse's Owner-synced frisbee (`disc.p`) cross-play with Home's Cowbell Court, Horn Pavilion pads, and Dunk Bakery paddle.** *Why:* [lane-c-towns-hangout](lane-c-towns-hangout.md#wave-2--later-home-plots--hub-towns-ring-island-canopy-town-port-quay-high-gorge) already pitched Dunk Bakery as *"Throw the beach ball (or frisbee) at a porch target paddle"*, yet `ball-targets.ts`, `court.ts`, and `hangout.ts` currently inspect only `ball.pose.p`. Adding a swept `disc.p` check in those three view files turns Home's four built plots into one emergent playground (like *Tears of the Kingdom* / *Rocket League* toy-first cross-play) with zero new physics bodies or server messages.
3. **`[Creative]` + `[Play]` Add passing-train town greetings across all four built towns over the existing `{ t: 'honk' }` broadcast.** *Why:* Parked in [lane-c-part7](lane-c-part7.md#parked) (*"Train-mounted bell/horn reply from riders passing a signalling town"*). Adding a tiny local `onHonk` callback in `src/features/honk.ts` lets a rider's honk (from a train or within 260 m) elicit a soft, 0.4 s-delayed, 4 s-throttled welcome answer from any resident town's built musical/signal hangout — Horn Pavilion chord + steam puff at Home, Bellhouse ring + sky-ring at Ring Island, Echo Horn hum + mist ring at High Gorge, Wind Chime shimmer + leaf-motes at Canopy Town — reusing Part 7's local sympathetic-answer pattern with zero server edits.
4. **`[Play]` + `[Creative]` Give Dunk Bakery a local slapstick splash-pop for anyone standing under the bucket, and give Caddy Shed a 3-cup stroll flourish.** *Why:* Right now `ball-targets.ts` tips the bucket and spawns droplets, but a friend standing right in the splash zone doesn't budge. Adding a pure-local `me.body.vel.y = Math.max(me.body.vel.y, 5.5)` hop + water spray when `me.body` is within `1.2 m` horizontally of the tub (no seat lock, no stun, zero server state) delivers the *Gang Beasts* / *Fall Guys* slapstick punchline (`comedy-in-games.md` #1–2). Tracking the 3 golf cups in a local `Set<number>` per stroll (lifted flag + celebratory `chordSound` when all 3 drop, then reset; zero HUD/score) gives solo players a wordless mini-arc (`minigames-and-physics-minigames.md` #8).
5. **`[Creative]` Add a local works-aimed pennant streamer on Ring Island's `[Placeholder: Lookout Tower]` deck.** *Why:* `ring-island/town-plots.ts` already reads `roomWorks(w)` to aim the brass telescope; adding a tiny fluttering cloth pennant beside the spyglass that points along the same horizontal vector gives arriving players a wordless visual cue toward the room's current works even before pressing Interact (DESIGN 7 & 11).

### Real tensions resolved

- **Audio clutter when a player spams honk on a train or chains hangout hits:** `[Play]` and `[Creative]` wanted passing-train greetings and crowd cheers to feel snappy; `[Systems]` warned that rapid honks or repeated ball bounces could overlap audio and make little guys hop non-stop. **Resolved:** Throttle each town's passing-train greeting to **once per 4 s** (sharing Part 7's 4 s sympathetic-answer cooldown, at reduced distant volume, suppressed while a talk box is open), and throttle `cheerAround` to **once per 3 s** per hangout site with a short `1.4 s` duration (never overriding a little guy's active `scaffold`, `platform`, or `rider` job).
- **Dunk Bakery splash-pop vs. server/physics safety:** `[Creative]` initially imagined a dedicated dunk-tank seat that dumps a seated friend into water; `[Systems]` flagged that a new seat touches server-owned seat arbitration (`src/world/railway-server.ts` + `WORLD_NS` bump). **Resolved:** Keep it 100% Local and seat-free — standing in the painted splash spot under the bucket (`≤ 1.2 m` horizontal) triggers a small local upward hop (`5.5 m/s`, less than a normal jump, so it breaks zero height gates) and splash particles on that player's own tab, visible to friends through normal Owner avatar presence.
- **No overlap with in-flight `codex/lane-c-part7`:** `[Systems]` noted `codex/lane-c-part7` edits `ring-island/town-plots.ts`, `gorge-town-plots.ts`, and adds `canopy-town-plots.ts`. **Resolved:** Part 8 lands right after `codex/lane-c-part7` merges today (per the brief: treat Part 7 as done), or builds its passing-train listener cleanly against Part 7's shared sympathetic-answer helper once Part 7 is on `main`; none of Part 8's files touch `codex/lane-b-preleg`, `codex/living-world-2`, `codex/look-card16`, or `codex/welcome-board`.

---

## Shape

- **Rough build shape:** **View / local play only — ZERO railway rule files, ZERO server edits, ZERO wire/save changes, ZERO `WORLD_NS` bump.** Ships on orchestrator read (`review-stamp` marks `read`).
- **Sync kinds:**

| State | Kind | Authority | Saved |
| --- | --- | --- | --- |
| Frisbee cross-play hits on Home's Cowbell Court, Horn Pavilion pads, and Dunk Bakery paddle | **Local** (derived from existing Owner `disc.p` / `disc.e` and `ball.pose.p` already on every tab) | Each tab | No |
| Dunk Bakery splash-pop (`vel.y` hop + droplets) & Caddy Shed 3-cup stroll `Set<number>` | **Local** (hop applies to own `me.body`, seen by friends via existing Owner avatar presence) | Each tab | No |
| Townsfolk crowd cheer (`cheerAround(x, z, 16, 1.4)`) | **Local** (reuses existing `src/place/folk.ts` cheer state) | Each tab | No |
| Passing-train town greetings across Home, Ring Island, High Gorge, and Canopy Town | **Local** reaction to existing `{ t: 'honk' }` message (`src/features/honk.ts` `onHonk`) + existing replicated `Plot` rows | Each tab | No |
| Lookout Tower works-aimed deck pennant | **Local** (derived from existing `roomWorks(w)` query) | Each tab | No |

- **Existing code reused:**
  - Home hangouts: `src/entities/town/court.ts`, `src/entities/town/hangout.ts`, `src/entities/town/ball-targets.ts`, `src/entities/town/boathouse.ts`, `src/entities/frisbee/state.ts`.
  - Townsfolk cheer: `cheerAround` (`src/place/folk.ts:1125`).
  - Honk & audio: `src/features/honk.ts` (`honkSound`, `chordSound`, `honkNotes`), `src/render/machine-sfx.ts` (`bell`, `clank`, `canyonHorn`), `src/render/fanfare.ts`, `src/render/splash.ts`.
  - Outer-town built hangouts & Part 7's sympathetic answer hook: `src/entities/ring-island/town-plots.ts`, `src/entities/route-greybox/gorge-town-plots.ts`, `src/entities/route-greybox/canopy-town-plots.ts` (from Part 7).
- **Files it would touch:**
  - `src/entities/town/court.ts` (accept swept `disc.p` crossings on both cowbell goal mouths; call `cheerAround` on goal).
  - `src/entities/town/hangout.ts` (visit `!disc.held` `disc.p` on Horn Pavilion pads; call `cheerAround` on 3-pad chord; subscribe to `onHonk` for Horn Pavilion passing-train greeting).
  - `src/entities/town/ball-targets.ts` (accept swept `disc.p` on Dunk Bakery paddle; local splash-hop when `me.body` is within `1.2 m` of the tub on tip; local 3-cup `Set<number>` stroll flourish + `chordSound`; call `cheerAround` on dunk and cup sink).
  - `src/entities/town/boathouse.ts` (call `cheerAround` on can clatter).
  - `src/features/honk.ts` (export tiny `onHonk(fn)` listener invoked on local honk and validated remote `{ t: 'honk' }` with honker `{ x, y, z, local }`).
  - `src/entities/ring-island/town-plots.ts` (subscribe to `onHonk` for Bellhouse passing-train greeting; add small works-aimed cloth pennant on Lookout Tower deck).
  - `src/entities/route-greybox/gorge-town-plots.ts` & `src/entities/route-greybox/canopy-town-plots.ts` (subscribe to `onHonk` to trigger their existing 4 s-throttled local welcome/sympathetic answer when a honker is within 260 m).
  - Unit tests (`test/` — pure helper tests for disc goal/paddle crossing, 3-cup reset, and 4 s greeting throttle) + `docs/game-design/trade.md` / `docs/game-design/place.md`.
- **Risks & containment:**
  - *Disc discontinuity on recall/handoff triggering false hits:* Mirror `ball-targets.ts`'s exact `epoch === disc.e && !document.hidden && path.distance() <= speed * dt + 0.5` guard for swept `disc.p` checks so a rack recall or ownership handoff never rings a goal or tips the dunk bucket.
  - *Dunk splash-hop climbing roofs or skipping gates:* Cap the vertical pop at `5.5 m/s` (below a normal jump's impulse) and fire it only on the ground (`me.coyote > 0`), so it can never stack with a double jump or reach any elevated ledge (Route Contract Rule 2).
  - *`cheerAround` disrupting working little guys:* Confirm `cheerAround` in `src/place/folk.ts` only hops strolling/idle town folk (not train riders or scaffold builders) and keep `r = 16 m, seconds = 1.4` with a 3 s cooldown per toy.
  - *Stale `onHonk` listeners when outer islands unmount:* Register every `onHonk` unsubscribe via `owner.cleanup(...)` so streaming out Ring Island, High Gorge, or Canopy Town leaks zero listeners.

---

## Done means

1. **Home frisbee cross-play & Dunk splash-pop (`--rail-seed` with Home plots built, `--eval`):**
   - Throw/skim the Boathouse disc through a Cowbell Court goal mouth (bunting kicks, `cheerAround` fires), over a Horn Pavilion pad (pad sounds + steam puff), and into the Dunk Bakery target paddle while Buddy stands in the splash spot (bucket tips, splash droplets burst, Buddy hops locally, nearby little guys cheer) — verified in a motion sheet + still.
2. **Caddy Shed 3-cup stroll flourish (`--eval`):**
   - Sink all three golf cups on Home's Round in one stroll; confirm each sunk cup's flag pops and the 3rd cup triggers the celebratory flourish and resets the stroll set cleanly with zero HUD score added.
3. **Passing-train town greeting (two-tab `--eval` or single-tab train ride):**
   - Ride a train (or stand within 260 m) past a built Ring Island Bellhouse, High Gorge Echo Horn, Canopy Wind Chime, or Home Horn Pavilion and press Honk; verify the built town answers after ~0.4 s (sky-ring / mist ring / leaf-motes / steam puff logged and visible in still) and ignores a second honk within 4 s.
4. **Lookout Tower deck pennant (`--rail-seed ring-joined`, `--eval` buying Lookout Tower):**
   - Still showing the small cloth pennant beside the brass telescope pointing horizontally toward `roomWorks(w)`.
5. **Checks:** Focused unit tests for swept disc hits, 3-cup cycle, and greeting throttle pass; `node dev/ship-check.ts` green; zero `src/sim/railway-*.ts`, `server/src/`, or `WORLD_NS` diff.

---

## Open questions

Each proceeds on its recommendation unless the owner says otherwise; nothing waits for a playtest.

1. **Is Lane C Part 8 this zero-rule-change, zero-world-bump "Towns Come Alive" pass (Home frisbee cross-play, Dunk splash-pop, Caddy 3-cup flourish, little-guy crowd cheer, and passing-train town greetings across all four built towns), leaving Port Quay Offer 1 (`town = 4`, world bump) for Part 9?**
   - **Recommended:** **Yes.** Parts 5–7 each took a `WORLD_NS` bump; a zero-bump client pass runs in parallel beside in-flight rule branches (`d-2026-11-28-backlog-beyond-rail-rules`), ships on orchestrator read, never wipes a live room, and makes every hangout already built (especially Home's Round, where guests land) feel noticeably richer.
   - Answer: ___
2. **Keep built hangouts strictly optional fun (DESIGN 2 & 3) rather than counting toy interactions toward `first contribution`?**
   - **Recommended:** **Yes.** Counting a ball goal or horn pad as `first contribution` would blur toys into progression and require a server rule + world bump; guests already hit `first contribution` through real route work at the Camp ridge or Home's hall/gift bin.
   - Answer: ___
3. **Let a honk from a passing train (or within 260 m) trigger a soft, 4 s-throttled local welcome answer from any resident town's built musical/signal hangout (Home Horn Pavilion, Ring Bellhouse, Gorge Echo Horn, Canopy Wind Chime) over the existing `{ t: 'honk' }` message?**
   - **Recommended:** **Yes.** Zero server edits or new wire messages, works both solo on a train ride and in co-op when a friend rides past, and pairs cleanly with Part 7's cross-town sympathetic answers.
   - Answer: ___
4. **Let the Boathouse frisbee trigger Home's Cowbell Court goals, Horn Pavilion pads, and Dunk Bakery paddle (with a small local splash-hop for a player standing under the dunk bucket)?**
   - **Recommended:** **Yes.** Fulfills the original Lane C pitch for Dunk Bakery ("ball or frisbee") and turns Home's four separate plots into one cohesive playground with zero new physics bodies or server seats.
   - Answer: ___

---

## Parked

- **Port Quay Offer 1 (`town = 4, slot = 64`) & `[Placeholder: Soapbox Garage]`** (Part 9 candidate once rule-branch traffic clears: either a dedicated vehicle-promotion pass for `?proto=soapbox` on Port Quay's wide quay apron, or a quick quay hangout pick using `leg4.ts`'s flat `town` reserve).
- **Hub town Offer 2 & Offer 3 (Ring Island, High Gorge, Canopy Town)** (freight-staked plots once outward Quarry stone, Ringworks steel, and Gorge copper yards exist per [d-2026-11-25-recommendations-taken-pool](../decisions-rewards.md#d-2026-11-25-recommendations-taken-pool), with an optional same-town `spare: true` slot).
- **Ring Island & High Gorge folk crowd cheers** (extend `cheerAround`-style reactions to `ring-folk` and future hub-town folk once those towns have strolling crowds).
- **The Boogler's deadpan hat-spring / double-take near town toys** (parked from [lane-c-towns-hangout](lane-c-towns-hangout.md#parked) for post-game; never editing his existing copy).

---

## Design review (2026-11-28)

Run on this brief by its author after rereading from the top. Checked against [DESIGN.md](../../DESIGN.md), [owner-calls.md](../agents/owner-calls.md), [decisions-core-loop.md](../decisions-core-loop.md), [decisions-rewards.md](../decisions-rewards.md), [decisions-rail.md](../decisions-rail.md), [decisions-characters.md](../decisions-characters.md), [decisions-controls.md](../decisions-controls.md), [decisions-process.md](../decisions-process.md), [direction.md](../direction.md), [playtests.md](../playtests.md), [context.md#design-work-rules](../agents/context.md#design-work-rules), [first-contribution-check.md](../reports/first-contribution-check.md), [town-layout.md](../plans/town-layout.md), `src/entities/town/court.ts`, `src/entities/town/hangout.ts`, `src/entities/town/ball-targets.ts`, `src/entities/town/boathouse.ts`, `src/entities/ring-island/town-plots.ts`, `src/entities/route-greybox/gorge-town-plots.ts`, `src/place/folk.ts`, `src/features/honk.ts`, `src/content/levels/leg4.ts`, and research ([comedy-in-games](../research/comedy-in-games.md), [finding-the-fun](../research/finding-the-fun.md), [minigames-and-physics-minigames](../research/minigames-and-physics-minigames.md), [growing-towns](../research/growing-towns.md), [level-design](../research/level-design.md), [route-contract](../research/route-contract.md)).

### Calls table

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Towns are where choice and hanging out live; every building adds something to do | Decided | [d-2026-11-27-course-change](../decisions-core-loop.md#d-2026-11-27-course-change) |
| 2 | Physics toys and side activities are optional fun, never gates or income sources (Boogles come from fares only) | Decided | [DESIGN.md](../../DESIGN.md) principles 2 & 3; [d-2026-11-10-open-calls-answered-riders-and-boogles](../decisions-rewards.md#d-2026-11-10-open-calls-answered-riders-and-boogles) |
| 3 | The backlog is kept stocked with work that touches no railway rule file so free slots run side by side | Decided | [d-2026-11-28-backlog-beyond-rail-rules](../decisions-process.md#d-2026-11-28-backlog-beyond-rail-rules) |
| 4 | Beach ball and built Boathouse disc throwing are allowed in the live game | Decided | [d-2026-11-28-ball-and-disc-throw](../decisions-controls.md#d-2026-11-28-ball-and-disc-throw) |
| 5 | Hub towns' later plots (Offer 2+) are staked by their own deliveries | Decided | [d-2026-11-25-recommendations-taken-pool](../decisions-rewards.md#d-2026-11-25-recommendations-taken-pool) |
| 6 | Building names and prompts stay placeholders; none of The Boogler's copy is touched | Decided | [d-2026-11-11-the-story-and-characters-are-the-owner-s](../decisions-characters.md#d-2026-11-11-the-story-and-characters-are-the-owner-s) |
| 7 | Make Lane C Part 8 a zero-rule-change, zero-world-bump client pass ("Towns Come Alive") rather than Port Quay Offer 1 (deferred to Part 9) or a second plot at an existing hub | New | Recommend yes (open question 1); ships beside in-flight rule branches with no world wipe and improves Home's Round immediately |
| 8 | Keep built hangouts strictly optional fun rather than counting toy interactions toward `first contribution` | New | Recommend yes (open question 2); preserves DESIGN 2 & 3 and avoids a rule bump |
| 9 | Let a honk from a passing train (or within 260 m) trigger a soft, 4 s-throttled local welcome answer from any resident town's built musical/signal hangout over the existing `{ t: 'honk' }` message | New | Recommend yes (open question 3); zero server edits, works solo and co-op, connects all four built towns |
| 10 | Extend Home's Cowbell Court, Horn Pavilion pads, and Dunk Bakery paddle to accept swept hits from the Boathouse's Owner-synced frisbee (`disc.p`) alongside the beach ball | Default | Recommend yes (open question 4); reuses existing swept-segment guard and fulfills the original Lane C Dunk Bakery pitch |
| 11 | Give Dunk Bakery a local slapstick splash-hop (`vel.y ≥ 5.5 m/s`, ground-only, `≤ 1.2 m` horizontal, no stun/seat) and Caddy Shed a local 3-cup stroll flourish (`chordSound` + reset, zero HUD score) | Default | Cheap, funny co-op/solo payoff with zero server seats or route-contract risk |
| 12 | Wire Home's existing `cheerAround(x, z, 16, 1.4)` (throttled per 3 s) to Cowbell goals, 3-pad Horn chords, Dunk splashes, Golf sinks, and Boathouse can clatters | Default | Reuses `src/place/folk.ts:1125` with zero new folk state machine code; supplies an in-world audience |
| 13 | Add a small local works-aimed cloth pennant beside Ring Island's Lookout Tower telescope (reading `roomWorks(w)`) | Default | Wordless sightline cue toward the room's current works (DESIGN 7 & 11) with zero new queries or colliders |

**Counts:** **6 Decided, 4 Default, 3 New.**

### Findings

1. **Port-from-Place / reuse fit check (owner call "Port from Place only what still fits"):**
   - **Existing `cheerAround` (`src/place/folk.ts:1125`), `honk` (`src/features/honk.ts`), and Owner `disc` (`src/entities/frisbee/state.ts`):** All three are already live production systems, not Place ports; wiring them together earns its place at minimal code cost and zero server risk.
   - **Retired `?proto=soapbox`:** Still does *not* earn its place in a small Part 8 — stays parked for Port Quay (Part 9+).
2. **Level design & Route Contract check (`level-design.md`, `route-contract.md`):**
   - *No new colliders, plots, or terrain changes:* Part 8 places no new buildings, paths, or solid props (only a tiny non-solid cloth pennant on the existing Lookout Tower deck).
   - *Route contract (Rule 2: movement may skip distance, never the work; Rule 3: nobody stranded):* The Dunk Bakery splash-hop is capped at `5.5 m/s` vertical impulse (below a normal jump) and fires only while grounded (`me.coyote > 0`), so it cannot launch a player over any fence, roof, or gate. All existing walk-seconds and sightlines on Home's Round, Ring Island, High Gorge, and Canopy Town remain unchanged.
3. **First meeting, solo vs. co-op, late arrival:**
   - *First meeting:* A guest landing at Home's hall board (once line 1 is built) who picks up the ball or frisbee and hits any built toy immediately sees nearby little guys hop and cheer; a player riding out on a train who presses Honk hears a built town answer back — zero tutorial text needed (DESIGN 11).
   - *Solo:* Every interaction works alone (frisbee cross-play, 3-cup golf flourish, little-guy crowd cheer, honking from a solo train ride past any built town, Lookout Tower pennant).
   - *Co-op & late joiner:* Friends throwing the disc or ball at a friend standing in the Dunk Bakery splash spot get instant slapstick; late joiners read existing accepted `Plot` rows and immediately hear/see all reactions with zero extra sync state.
4. **Research alignment:** Follows [comedy-in-games](../research/comedy-in-games.md) recs 1, 2, 3, 8 (clean controls + messy outcomes, cheap failure, in-world audience), [minigames-and-physics-minigames](../research/minigames-and-physics-minigames.md) recs 1, 2, 6, 8 (toy first, fun to watch, place with a prop, no scoreboard/mode), and [finding-the-fun](../research/finding-the-fun.md) (multiply existing systems rather than adding isolated rules). No research recommendation contradicted.

### Suspect or placeholder lines

- None of The Boogler's copy is touched; no new UI strings, board words, or prompts are added.
- Existing placeholder building names referenced for the owner: `Seed Shed`, `Horn Pavilion`, `Frisbee Boathouse`, `Caddy Shed`, `Dunk Bakery`, `Lookout Tower`, `Signal Bellhouse`, `Echo Horn House`, `Canyon Hook-Perch`, `Canopy Bounce Net`, `Treetop Wind Chime`, `Soapbox Garage`.

*(Note: Per task scope — docs-only brief in `docs/brainstorms/lane-c-part8.md` — Calls 7 to 13 are ready to be logged in `docs/agent-calls.md` when the planner/orchestrator picks up Part 8.)*
