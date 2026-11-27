> **Status: proposed (2026-11-27).** Light brainstorm (one pass, three lenses: play designer, systems architect,
> creative director). Characters, their names, story and every line they say belong to the owner
> ([decision](../decisions-characters.md#d-2026-11-11-the-story-and-characters-are-the-owner-s)): every new guide is
> described by role only and every sample line is a marked placeholder.

# Phase guides: a new little guy to discover at each station

**Seed** (owner, 27 November 2026):
- "Send a brainstorm session to think how we can improve the direction at different points of the game. There should be
  a little guy you can talk to at each phase that tells you what to do to progress, in character."
- "Also maybe it should be a new little guy at each station, so we can have more fun characters to discover"

## Pitch

Boogle hides its objective HUD on purpose ([3 November](../game-design/place.md#guidance-after-removing-the-objective)),
so when a stretch spans two disconnected places — the forge pedestal to the old train, the pier to the kiln, Ring
Island's steel back to Home's Roundhouse, or Bell Rock's junction out to the greybox legs — players stall with nobody
to ask. Today only three spots have talkers with progress lines: Sleeves at Home's entrance (`greeter.ts`), the forge
foreman at the pedestal (`forge-guide.ts`), and Ring Island's folk (`ring-folk/view.ts`, who have no `…` cue or
progression stages). Make **one new little guy per station** the leading shape: reaching a new station rewards you
with a fresh character to discover — distinct colour/prop, distinct voice, and a local quirk — who also tells you what
this stretch needs next in character. All of them run on one shared `createPhaseGuide` helper over accepted server
state, stay quiet until you want them (`…` within 24 m while they have news, `Talk` within 3.3 m, with a one-line
approach bark only at proven stall points), point toward the next local site when useful, and settle into one relaxed
idle line once their phase is done. Serves **DESIGN.md 7 (Telegraph everything)** and **8 (Enjoyable alone and
together)**; bends **11 (Show, don't tell)** slightly, contained by keeping world boards/ghosts primary and making the
character a discovery you walk up to.

## Gut question

**When you pull into a new station, does spotting its new little guy with `…` feel like meeting a fun local — and
leave you clear on what to do next in one press, without feeling nagged?**

## Station & phase map: who you discover where, and what they read

Every guide derives its stage from accepted server rows (`adapter.read.world()`), sharing the same state predicates as
`playObjective` (`leg-view.ts`, `greeter.ts`, `forge-guide.ts`) with no new wire, op or save state. Boards and gold
ghosts carry counts and exact slots; the station's little guy carries the *why* and the *where next* across sites.

| Wave | Station / phase | Little guy (role; unnamed for new) | Where they stand | Reads from accepted state | Covers (every line `[placeholder — owner's line: ...]`) |
| --- | --- | --- | --- | --- | --- |
| *Built* | **Home & line 1** | Sleeves + Camp resident | Town entrance; beside T1 wake | `railPhase`, `rail`, `forge`, `line2Completed`, `line2SeaOpen` | Axe, T1–T3, forge, line 2, Needle Bell, onward |
| *Built* | **Forge pedestal** | Forge crew's foreman | Forge pedestal (`FOREMAN`) | `boilerRow`, `worksRow` (`breaker`, `seams`) | Boiler → old train; trains carry Q6; breaker → first seam |
| **Wave 1** | **Quarry halt (Works)** | **The kiln hand** *(new)* | Quarry halt platform end, beside roller road / "Kiln" post | `worksRow` (`breaker`, `seams`, `kiln`, `pierSet`), `shedRow` (`stall`) | Unstruck throat seam; kiln wants Home logs + bowl stone; shoulder footings to Home's Roundhouse |
| **Wave 1** | **Home Roundhouse** | **The roundhouse hand** *(new)* | Beside Home's turntable / garage post (clear of 3.2 m post reach) | `shedRow` (`stall`, `cradle`, `cradleRails`, `table`), `worksRow` (`pierSet`), `steelRow`, `line` boiler | Stall footings → cradle rails → turn the table; steel in bay for longer boiler; Quick/Strong trade |
| **Wave 1** | **Ring Island halt** | Hooter *(existing body, upgraded)* | By the `RINGWORKS` board (`HOOTER_UV`) | `aperture`, `steelRow` (`works`, `bay`), `legRow('stack')` | The Meet; feed steel works; ride steel Home to Roundhouse; start High Gorge line on west platform |
| **Wave 2** | **High Gorge** | **The gorge watch** *(new)* | High Gorge concourse / stair foot, clear of rack & incline barrier | `legDone('stack')`, `grants` (`pick`), `gates` (`incline`), `legDone('incline')` | Climb stair for powered pick; open incline barrier; lay incline to Bell Rock |
| **Wave 2** | **Bell Rock** | **The junction signalman** *(new)* | Bell Rock central deck near the stair tower | `legDone('incline')`, `grants` (`seeds`, `lantern`), `legDone('bay-cut')`, `gates` (`canopy`, `causeway`), `legDone('bell-canopy')`, `legDone('causeway')` | Crystal seeds; bay line is built from Home's West landing; Canopy barrier (or cave order choice); later causeway with lantern |
| **Wave 2** | **West landing** | **The landing hand** *(new)* | West landing apron, off bay-cut & cave frames | `legDone('incline')`, `legDone('bay-cut')`, `grants` (`pick`), `gates` (`plug`), `legDone('cave')` | Build bay cut to Bell Rock; break sea-cave plug with powered pick; lay cave line to Port Quay |
| **Wave 2** | **Canopy Town** | **The canopy hand** *(new)* | Canopy platform near the Notch frame | `legDone('bell-canopy')`, `grants` (`cloth`), `legDone('wall')`, `gates` (`notch`), `legDone('notch-tunnel')` | Glider cloth; once White Wall closes, open Notch barrier and build to Lantern Notch |
| **Wave 2** | **Port Quay** | **The quay hand** *(new)* | Port Quay platform near Wall frame / Roundhouse approach | `legDone('cave')`, `legDone('bell-canopy')`, `legRow('wall')`, `gates` (`deep-span`), `legDone('wall')` | White Wall back to High Gorge (notes Canopy if cave-first); deep span needs crystal seeds; ring closes |

**Intentionally no guide:** Far Head (short pier beat already covered by the foreman + pier show), Saltpan (single-verb
halt), Lantern Notch (one-beat arch with lantern 33 m off buffers; Canopy and Bell Rock frame it), and the **Original
Island** (The Boogler is the destination; never put a guide in front of him or touch his copy). Bram (retired engine
driver in Plot 1) stays optional flavour with his model railway.

## Best suggestions

1. **One new little guy per station, built in two waves: 3 now, 5 next** (`design`, `creative`). Every station gets
   its own character to discover — distinct coat/prop and voice — turning arrival into a social payoff, not just a
   signpost. Ship **Wave 1 (3 spots: Quarry halt, Home Roundhouse, Ring Island)** first to close every gap on the
   art-dressed route, then **Wave 2 (5 greybox hubs)** right after.
2. **One shared `createPhaseGuide` helper + pure phase query** (`systems`). Lift `greeter.ts` and `forge-guide.ts`'s
   stage/cursor/speech-cue/bark/point loop into `src/components/phase-guide/view.ts`, and lift `leg-view.ts`'s `note()`
   state checks into a pure `src/sim/railway-phase.ts` reader so guides and `playObjective` never drift.
3. **Quiet by default, approach bark only at proven stall handovers** (`design`, `creative`). Every guide shows `…`
   within 24 m while they have an unread line for the active phase and waves within 8 m, but only **three proven stall
   points** (foreman at the pedestal, kiln hand at Quarry halt, roundhouse hand at the cradle/table) fire a one-line
   approach bark once per stage per page within 10 m — catching stuck players without turning every platform noisy.
4. **Upgrade Hooter for Ring Island instead of adding a fourth Ring talker** (`creative`, `systems`). Hooter already
   stands still by the `RINGWORKS` board (`ring-folk/view.ts`); giving him `createSpeechCue` and the phase-guide stage
   table makes him Ring Island's station guide with zero extra folk slots.
5. **Guides point with their arm and stay after their phase with one idle line** (`creative`, `design`). Reuse
   `folk.ts`'s `point` mood toward the next local object while their phase is active; once done, drop `…` and waving
   and leave them at their station with one short in-character idle remark so discovered characters never vanish.
6. **Co-op stays local-talk over shared-room state** (`systems`, `design`). Stage reads `ReadWorld`, so all 1–4
   players (including late joiners and reloads) see the same guide in the same phase, `Talk` stays Local per player
   (`place/talk.ts`), and friends split across two stations (e.g., Canopy vs. West landing during the order choice)
   each have a local character who knows what their station needs.
7. **Two-beat placeholder structure per stage** (`creative`, `design`). Every placeholder is marked
   `[placeholder — owner's line: <what it must tell>]`: first Talk gives the plain next step in character; optional
   second Talk adds a local quirk, dry joke or co-op tip, matching Sleeves and the foreman's cadence.

**Tensions.**
- **One new character per station vs. one guide who travels with you** (like Kass in *Breath of the Wild*).
  A single travelling guide shrinks the cast and gives the owner only one voice to write, so every station would stay
  cheap to author. But a travelling guide breaks in co-op when friends split across two hubs or two open branches
  (Canopy + Cave), always stands somewhere nobody has reached yet, and forfeits the fun of meeting a fresh local at
  each new stop. **Recommendation:** **one new character per station** (the owner's leading shape). Contain the
  writing load by rolling out **3 stations first (Wave 1)**, then **5 greybox hubs (Wave 2)**, with marked placeholders
  so every station works immediately and the owner can name and write them at his own pace.
- **Approach barks everywhere vs. `…` + Talk only.** Barks catch players who walk past `…`, but firing on every
  platform makes train stops chatty. **Recommendation:** barks only on the three proven Home/Works stall points;
  `…` + wave + Talk everywhere else.

## Shape

- **Sync kind:** Local presentation over the replicated railway mirror (`ReadWorld`). Zero new sim state, ops,
  presence fields, saved fields or `WORLD_NS` bump. Per-player `heard` cursor and once-per-stage `barked` set live in
  memory per page load (see Q4).
- **Reuses:** `src/place/folk.ts` (`addLooker`, `point`/`wave`/`chat` moods; bump `COUNT` by 7 slots — zero extra draw
  calls), `src/place/talk.ts` (`startTalk`, `updateTalkCard`), `src/components/speech-cue/view.ts` (`createSpeechCue`),
  `src/entities/railway/forge-guide.ts` (bark bubble + `quiet()` guard), `src/entities/ring-folk/view.ts` (Hooter).
- **Smallest first build (Wave 1, 3 stations):** Extract `src/components/phase-guide/view.ts` from `forge-guide.ts`
  and `greeter.ts`; add the **kiln hand** (Quarry halt), the **roundhouse hand** (Home turntable/garage), and upgrade
  **Hooter** (Ring Island) (~250 lines, marked placeholders). **Wave 2 (5 stations):** drop the five greybox station
  guides on existing `leg-view.ts` platform anchors.
- **Risks:**
  1. *Prompt competition:* Talk (3.3 m) must never steal `Feed the frame`, `Take logs/rails`, `Open the barrier`,
     `Shoulder a footing` or the garage post. Place every guide ≥ 3.5 m off the nearest work prompt and check in stills.
  2. *300 m Home folk sleep:* `folk.ts` sleeps village folk past 300 m (`world-streaming` call 2). Station guides
     outside Home must follow their area's residency (`near(areaCentre, 450)` / `ringIslandNear.mounted`).
  3. *Train clearance:* All guides use `addLooker` (never `waiting`, avoiding the 4-little-guys train-stop rule) and
     stand clear of the rail gauge.

## Done means

Capture with `npm run look` at walking height (plus one phone-width frame at Quarry halt):
- `--rail-seed works-open`: Quarry halt platform shows the kiln hand by the roller road with `…`, pointing into the
  cut; within 3.3 m `Talk` shows without blocking `Shoulder a footing` at the rack.
- `--rail-seed stall-done`: Home's Roundhouse shows the roundhouse hand clear of the garage post and stall sockets,
  with `…` and `Talk` while the garage post still wins at the post.
- `--rail-seed ring-meet` (or steel-works seed): Ring Island shows Hooter with `…` by the `RINGWORKS` board and his
  steel-works / High Gorge placeholder stage line on `Talk`.
- `--rail-seed gorge-open` (Wave 2): High Gorge watch stands at the stair foot with `…`, clear of the incline barrier.
- Reload / late-join check: loading mid-Works or mid-route puts every guide straight into the matching stage with no
  stale bark replay.

## Open questions

1. **Wave 1 count (3 stations now, 5 greybox stations next)?**
   **Recommended:** yes — build **3 first** (Quarry halt, Home Roundhouse, Ring Island/Hooter) to cover every gap on
   the art-dressed route, then **5 greybox stations** (High Gorge, Bell Rock, West landing, Canopy, Port Quay) in Wave 2.
   Alternative: build all 8 at once, or wait on the 5 greybox hubs until their depth pass. Answer: ___
2. **Ring Island: upgrade Hooter, or add a brand-new station hand on the west platform?**
   **Recommended:** upgrade Hooter (already stationary by the `RINGWORKS` board and discovered on arrival), keeping
   the cast tight. Alternative: add a new little guy on the west platform for the High Gorge handoff. Answer: ___
3. **Where should unprompted one-line approach barks fire?**
   **Recommended:** only at the three proven Home/Works stall points (foreman, kiln hand, roundhouse hand); every other
   station guide uses `…` + wave + Talk only. Alternative: `…` + Talk only for all new guides, or approach barks on
   every new station's first arrival. Answer: ___
4. **After a station's phase is finished, does its little guy stay with one idle remark or step away?**
   **Recommended:** stay at their station with no `…` or wave and offer one relaxed idle remark on Talk (foreman keeps
   his return-to-work rule), so discovered characters remain in the world. Alternative: hide once their phase ends.
   Answer: ___
5. **Should "already heard this stage" reset per page load (like Sleeves and the foreman) or persist in `localStorage`?**
   **Recommended:** reset per page load (simpler, and returning after a break re-lights `…` as a gentle nudge).
   Alternative: persist in `localStorage` like town residents. Answer: ___

## Parked

- **Sleeves' late-game recap:** once Home is built out, Sleeves could point returning players at whichever far station
  is currently open (design).
- **Far Head / Saltpan / Lantern Notch locals:** small optional characters for the shorter halts during each area's
  depth pass (creative).
- **Co-op carry reactions:** station hands cheering when two players haul a boiler or footing past them (creative).
- **One typed dialogue table for all station guides** (`src/content/guide-lines.ts`), so the owner can name and write
  every character in one file (systems).

---

## Design review (2026-11-27)

Reviewed against [DESIGN.md](../../DESIGN.md), [owner-calls.md](../agents/owner-calls.md),
[decisions-characters.md](../decisions-characters.md), [decisions-core-loop.md](../decisions-core-loop.md),
[decisions-controls.md](../decisions-controls.md), [direction.md](../direction.md), the newest entries in
[playtests.md](../playtests.md) (14 November owner + Grant), and research
([wordless-onboarding.md](../research/wordless-onboarding.md),
[progression-flow-layout.md](../research/progression-flow-layout.md),
[finding-the-fun.md](../research/finding-the-fun.md),
[comedy-in-games.md](../research/comedy-in-games.md)).

**Scope & evidence note:** Docs-only brainstorm; no coordinates are placed yet, and `npm run look` / `npm run loop`
were not run (`node_modules` absent in this worktree). Every new guide's exact position, sightline and prompt
clearance will be proved with `level-check` and `look` stills in its build plan.

### Calls table

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Characters, names, story and every line belong to the owner; build with role labels and marked placeholders; never touch The Boogler's copy | Decided | [decisions-characters.md](../decisions-characters.md#d-2026-11-11-the-story-and-characters-are-the-owner-s), [owner-calls.md](../agents/owner-calls.md#boogler-copy) |
| 2 | One NPC bubble (`…` within 24 m, becomes `Talk` within reach); no HUD objective box or edge arrows | Decided | [owner-calls.md](../agents/owner-calls.md#npc-bubble), [decisions-characters.md](../decisions-characters.md#d-2026-11-18-decisions-page-characters), [place.md](../game-design/place.md#guidance-after-removing-the-objective) |
| 3 | Forge crew's foreman stays at the pedestal with once-per-stage approach bark + Talk + point until the first seam is struck | Decided | [decisions-characters.md](../decisions-characters.md#d-2026-11-18-decisions-page-characters), [boiler-guide.md](boiler-guide.md) |
| 4 | Local presentation over accepted server state (`ReadWorld`), no new wire/op/save state or `WORLD_NS` bump; Talk is Local per player | Decided | [DESIGN.md](../../DESIGN.md#pick-how-each-feature-shares-state), [sync.md](../agents/sync.md) |
| 5 | Words allowed sparingly where they are the clearest answer | Decided | [decisions-core-loop.md](../decisions-core-loop.md#d-2026-11-09-signposting-words-and-beacons-are-allowed) |
| 6 | One new little guy per station (7 new station roles + Hooter upgraded on Ring Island; none at Far Head, Saltpan, Lantern Notch or Original Island), rather than one travelling guide | New | Owner-seeded leading shape (27 Nov): adds discovery delight per station and works when co-op friends split across hubs. Logged in `docs/agent-calls.md` (Characters) |
| 7 | Roll out in two waves: Wave 1 = 3 stations (Quarry halt, Home Roundhouse, Ring Island/Hooter), Wave 2 = 5 greybox hubs (High Gorge, Bell Rock, West landing, Canopy, Port Quay) | Default | Recommended: proves the shared helper on the art-dressed route first, then covers the whole playable route. Logged in `docs/agent-calls.md` (Characters) |
| 8 | Unprompted one-line approach barks (10 m, once per stage per page) fire only at the three Home/Works stall points (foreman, kiln hand, roundhouse hand); all other station guides use `…` + wave + Talk only | New | Recommended: prevents platform chatter on repeat train rides while catching players at the proven Works/cradle stall beats. Logged in `docs/agent-calls.md` (Characters) |
| 9 | Completed-phase station guides remain at their station with no `…` or wave and offer one relaxed idle remark on Talk (foreman keeps his return-to-work rule) | Default | Recommended: discovered characters stay part of the world without false unread cues. Logged in `docs/agent-calls.md` (Characters) |
| 10 | Unread/heard cursor and once-per-stage bark memory reset per page load (not persisted in `localStorage`) | Default | Recommended: matches Sleeves and the foreman, and gives returning players a gentle `…` reminder. Logged in `docs/agent-calls.md` (Characters) |
| 11 | Guide placement clearance: ≥ 3.5 m from any frame, rack, barrier or garage post prompt, off the rail gauge, using `addLooker` (never `waiting`) | Default | Recommended: prevents Talk (3.3 m) from stealing work prompts and avoids the 4-little-guys train-stop rule. Logged in `docs/agent-calls.md` (Rail) |

### Findings

1. **Order-choice branch awareness (Canopy vs. Cave).** Since 25 November ([order-choice](../plans/order-choice.md)),
   a room can open Canopy Town and the sea-cave leg in either order or at once. Bell Rock's signalman and West
   landing's hand read both `gates` (`canopy`, `plug`) and `legDone` (`bell-canopy`, `cave`) so each speaks to its
   local branch and notes the other is open; Port Quay's hand notes Canopy if the room went cave-first.
2. **Solo vs. co-op late join & split parties.** Checked against
   [progression-flow-layout.md](../research/progression-flow-layout.md) rule 1 (the next goal can be found) and
   [wordless-onboarding.md](../research/wordless-onboarding.md) rec 7 (late joiners arrive without stopping anyone).
   Per-station guides over `ReadWorld` satisfy both: late joiners never trigger stale barks, and split-up friends at
   two stations each have a local character to ask.
3. **Overlap with the "Kiln" fingerpost and gold ghosts.** Checked against [works-signposting.md](works-signposting.md):
   the Quarry halt's kiln hand stands beside the roller road's start, reinforcing the trodden path and "Kiln" post
   rather than replacing them, and only barks once per stage.
4. **Game-direction fit.** Fits `docs/direction.md`: small Local presentation work that directly addresses the
   "what comes next" stops logged in the 14 November owner and Grant playtests while adding character discovery per
   station, touches no sim/wire/save code, and does not block choice-and-payoff or greybox route work.
   **Disposition:** proceed within existing scope once the build plan runs its placement `level-check` and `look` stills.

### Owner questions

Same five questions as [Open questions](#open-questions) above (Wave 1/2 count, Ring Island Hooter vs. new hand,
approach-bark scope, post-phase idle vs. retire, per-page vs. saved heard state).
