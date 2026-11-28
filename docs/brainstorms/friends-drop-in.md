> **Status: proposed (2026-11-28).** Light brainstorm, one pass through three lenses (play designer, systems architect,
> creative director), with its design review, against `origin/main` `860e2de21` (world v87). Docs only: nothing here is
> built, no stills were taken, and nothing is tested on a device. Seed: P3 backlog row *"Friends drop in: arriving by
> train where your friends are, and a welcome-back board"* ([backlog](../backlog.md);
> [decision](../decisions-process.md#d-2026-11-28-backlog-beyond-rail-rules)), from
> [friends-drop-in](../proposals/friends-drop-in.md#what-to-try-first) items 12 and 15 (owner: *"I really like a lot of
> these"*, 17 November; *"yes please!"*, 28 November). The proposal's first pair (items 7, 9 and 10) is already built
> under [friends-voice](../plans/friends-voice.md).

# Friends drop in: welcome-back board and arriving by train

## Pitch

Drop-in friends have two cold moments today: coming back to a room that moved on without them (the 3.5 s Welcome back
card fades before they read it and misses every greybox leg and town building), and returning after a break to stand
alone at Home while their friends are 1.5 km down the line. Put a matching **welcome-back board** in Home station's
south bay—mirroring the works board in the north bay—so anyone can read what the room laid and built since their last
visit (or built so far, on a first visit), built purely from state the server already saves. Then let a **returning
player** whose return window expired step off the train (or onto the platform) at their friends' nearest standing halt
when trains are running, while keeping the decided first-visit fall at Camp or Home's hall untouched.

**Serves** [DESIGN.md](../../DESIGN.md) **8** (Enjoyable alone and together: drop-in friends catch up and find each
other fast, while solo play stays intact), **9** (Leave something for the next visitor: progress made while away is
visible in the world), **11** (Show, don't tell: world signs before fading HUD text) and **7** (Telegraph everything).
Bends no principle. Build 2 widens two recorded return/invite rules for returning players (noted in the design review
and logged for the owner's daily list per [widenings proceed](../decisions-process.md#d-2026-11-28-widenings-proceed-and-are-logged)).

## Gut question

When a friend drops back in after a day away, do they smile at what the group built and reach their friends on the line
without asking "where are you guys?"

## Best suggestions

1. **Ship the welcome-back board first, view-only, with zero new saved state** _(systems architect)_. Diffing
   already-replicated `Job`, `QJob`, `Leg`, `Plot`, milestones, `rules.roster` and `worksThanks` against this browser's
   existing `boogle.visit.<room>` memory needs no `src/sim`, wire, server or `WORLD_NS` change, runs in parallel with
   every in-flight rail-rule branch, and immediately fixes `welcome-railway.ts` (which today counts only Line 1 and
   Line 2). _Tension:_ without new saved state, the board cannot name *which* already-known friend built a completed
   section after they log off (see plain breakdown below). Recommendation: ship v1 without a world bump; add a small
   server milestone log only if playtests miss historical names.
2. **Pair the welcome-back board with the works board in Home's hall south bay** _(creative director)_. Home's hall
   (`src/place/home-station.ts`) is 13 m wide with four open bays facing the Round's green; the works board
   (`HALL_BOARD`) stands in the north bay, and the south bay is open. Mirroring it there puts "what's next" on the left
   and "what happened" on the right (~10–12 m from the hall pad, 2 s walk), obeying [World signs first](../agents/owner-calls.md#world-signs).
   _Tension:_ a returning player who arrives at a friend's halt (Build 2) won't see Home's hall first. Recommendation:
   keep the existing top-centre Welcome back toast fed by the same upgraded diff helper so they still see the summary
   on arrival, and see the board whenever they ride Home.
3. **Keep the first-time fall untouched; aim "arrive by train" at returning players after a break** _(play designer)_.
   A fresh player's landing is settled ([first fall at the works](../decisions-controls.md#d-2026-11-28-first-fall-lands-at-the-works)):
   Camp ridge while line 1 builds, Home's hall board after, so they get the trolley fall through `BOOGLE` and clear the
   two-minute contribution checkpoint. A recent reload (< 30 min) keeps their saved spot
   ([recent reload](../decisions-controls.md#d-2026-11-14-a-recent-reload-returns-you-where)). The player who actually
   gets stranded at Home today is a **returning player** whose 30-minute window expired (or who rejoined on a second
   device via Account PIN) while friends are already out at Ring Island, High Gorge, Canopy or Port Quay.
4. **Arrive on a standing train's deck when one is at the friend's halt, else on the halt's checked platform**
   _(systems architect)_. Spawning onto a train moving at 20 m/s races distance-mounted scenery (`routeAreasPending`,
   `ringAreaPending`). If a train on that line is currently standing at the friend's nearest standing halt
   (`TRAIN_PHASE.STAND && r.at === stop`), place the joiner on a free standing spot on its passenger car deck (checked
   against `remotes`, never taking a seat); otherwise place them on the halt's checked platform via `arrival.ts`'s
   existing `createReturnSearch` + `haltLandings()`.
5. **Give the platform arrival a train-just-left cue** _(creative director)_. When no train is standing at the halt,
   play a soft local receding whistle + brief steam puff at the track edge as the cover lifts, so it reads as *"just
   stepped off the train"* rather than a teleport—like *Animal Crossing*'s station step-out or *Deep Rock Galactic*'s
   drop-in beat, kept quiet and local.
6. **Show a room summary when nothing changed since your last visit** _(play designer)_. On a first visit to town, a
   second device, or a quiet solo return, the south-bay board should never look empty: flip its header from
   `[placeholder: While you were away]` to `[placeholder: Room log]` and show the latest connected places, built town
   hangouts, and unranked roster names.

## The two ideas, scoped

### Idea 15: Welcome-back board at Home station (Build 1 — recommended first)

- **Routing / scope:** **View only (Local).** No `src/sim`, server, wire or save change; no `WORLD_NS` bump. Ships on
  orchestrator read and touches none of the railway rule files held by in-flight branches (`codex/lane-b-conversions`,
  `codex/lane-b-preleg`, `codex/lane-c-part7`).
- **Where it stands:** Home station's hall, **south front bay**, mirroring `HALL_BOARD` (`src/place/home-station.ts`,
  line 154) across the hall's centreline (`axisPoint(HALL.a + HALL.d / 2 - 1, HALL.c + HALL.w / 2 - 2)`), angled toward
  the hall landing (`SPAWN`, local `(-97, 14)`). Clear of the north-wall `TILL`, `goodsDoor`, and the finders' bay
  outside the south end at `(-89.19, 21.80)` ([town-layout](../plans/town-layout.md)). Reuses the existing
  `railway.works-post` / `SignBoard` prefab (`src/entities/railway/works-board.ts`).
- **What it shows:**
  - **When this browser's `boogle.visit.<room>` sees new progress since last visit** (`[placeholder: While you were away]`):
    1. **Track & places connected:** newly finished Line 1/2 stretches (`Job`, `QJob`), newly laid greybox route
       sections and newly reached places (`Leg.laid` across Stack, Incline, Bay, Canopy, Cave, White Wall, Notch,
       Causeway), and newly lit landmarks (`Forge.lit`, `Works.lit`, `Aperture.joined`, `Steel.lit`, `Route.arrived`).
    2. **Town buildings chosen & built:** newly completed `Plot` rows (`Plot.at >= 0`) and their hangout kind
       (`Plot.kind`, e.g. `[placeholder: Built: Horn Pavilion]`).
    3. **People (unranked, no counts, capped at 6 names per [Thanks](../decisions-core-loop.md#d-2026-11-02-thanks)):**
       new friends who joined `rules.roster` since last visit (`[placeholder: New friends: ...]`), plus anyone
       currently credited on `worksThanks(w)` for the active step (`[placeholder: Helping now: ...]`).
  - **When nothing changed, on a first visit, or on a second device with no local memory** (`[placeholder: Room log]`):
    latest connected place, count of stretches/sections laid, built town hangouts, and unranked room roster names (up to
    6).
  - The existing ephemeral Welcome back HUD card (`src/features/welcome-back.ts`) reads the same upgraded diff helper
    (`src/player/welcome-railway.ts`), keeping the Act line first when an act changed ([acts](../decisions-controls.md#d-2026-11-11-the-game-has-acts)).
- **Saved state — plain answer:**
  - **Can v1 be built from state the server already saves?** **Yes.** Every line stretch, route leg, landmark, town plot
    and hangout choice, roster member, and current-step `worksThanks` is already saved and replicated in
    `src/sim/railway-components.ts` and `rules.roster`. Diffing them against `localStorage` (`boogle.visit.<room>`)
    needs **zero** new saved state and **no** `WORLD_NS` bump.
  - **What v1 loses without new saved state:**
    1. **No historical "who built X" for past steps.** `Job`, `QJob`, `Leg`, `Plot`, `Forge`, `Works`, `Aperture` and
       `Steel` store no builder `pid`, and `Account.thanks` is a single `u8` overwritten on each lay (`thanksStep + 1`).
       If an *already-known* friend (already in `rules.roster` from an earlier session) came back while you were away,
       laid two sections and bought a house, and logged off before you returned, v1 tells you **what** was laid and
       built, but **cannot name that friend**.
    2. **No cross-device "since last visit" diff.** Visit memory lives in `localStorage` per browser, so signing into a
       second device with an Account PIN shows `[placeholder: Room log]` instead of a personal away diff until that
       device has a prior visit.
  - **What v2 would need (parked):** a small saved ring buffer of the last ~6–8 completed room milestones (`kind`, `id`,
    `tick`, unranked `pids`) or per-`Account` `lastActiveTick`, which is a `src/sim` schema change, a `WORLD_NS` bump
    and an independent review.

### Idea 12: Arriving by train where your friends are (Build 2)

- **Routing / scope:** **View only (Local).** Reads `remotes` (already replicated Owner presence), `railwayMirror.confirmed()`
  (`Rail.trains`, `Train` rows, `trainStops`, `haltStands`), and `haltLandings()` / `createReturnSearch()` inside
  `src/entities/railway/arrival.ts`. No `src/sim`, wire, server or save change; no `WORLD_NS` bump.
- **How it sits with decided landings:**
  - **First-time visit (`isFirstVisit()`):** **Unchanged.** Keeps the decided trolley fall onto the Camp ridge while
    line 1 is unbuilt and onto Home's hall pad after ([first fall at the works](../decisions-controls.md#d-2026-11-28-first-fall-lands-at-the-works)).
    Does not reopen that decision. (If the owner ever wants first-time joiners to skip the Home hall fall and arrive by
    train at a friend's halt, that is Open Question 3, marked **waiting on the owner**.)
  - **Recent reload (< `railway.returnMinutes`, default 30 min):** **Unchanged.** Resumes their saved spot (or the halt
    their train was running to) per [recent reload](../decisions-controls.md#d-2026-11-14-a-recent-reload-returns-you-where).
  - **Returning player after a long absence (> 30 min) or with no saved spot (e.g. second device / expired return):**
    when `Rail.trains >= 0` and at least one entered remote friend (`remotes`) is > 150 m from Home's hall and within
    250 m of a **standing** halt (`haltStands`), arrive at that friend's nearest standing halt (picking the friend
    closest to the room's current `roomWorks` site if friends are split across halts):
    - **Train standing at that halt** (`TRAIN_PHASE.STAND && r.at === stop`): place the joiner on a free standing spot
      on that train's passenger car deck (checked with `taken()`), facing the platform/friend, so they step right off
      the train.
    - **No train standing at that halt:** place the joiner on that halt's checked platform landing via
      `createReturnSearch`, facing the track/friend, with a quiet local receding whistle + steam puff so it reads as
      stepping off the train that just passed.
- **When no train or no friend is near:**
  - `Rail.trains < 0` (before trains wake), OR no entered remote friend is online, OR every online friend is near Home
    (<= 150 m), OR no online friend is within 250 m of a standing halt (e.g. swimming or exploring off-line), OR
    `createReturnSearch` exhausts its 8 s budget: fall back to today's decided `worksLanding()` (Camp while line 1
    builds, Home's hall board after).
- **What a rider already aboard sees:**
  - `arrival.ts` holds `returnSettle` behind `cover-hold.ts` (and publishes no presence pose until settled), so a rider
    already aboard **never** sees the joiner flicker at Home first.
  - If the joiner spawns on a standing train's passenger car deck, the rider already aboard sees their friend appear on
    a free deck spot (never stealing an occupied seat, because seats stay server-arbitrated and untouched) with a small
    arrival hop/puff, ready to step off together. If the joiner spawns on the platform, a rider pulling in sees them
    standing on the platform beside the track.

### Recommended order and the one first build

1. **Build 1 (the one first build, small enough for one job):** **Welcome-back board at Home station (v1, View only).**
   Zero conflicts with in-flight rule branches, zero widened decisions, helps solo and co-op players alike, and fixes
   the existing Welcome back card's railway diff at the same time.
2. **Build 2 (one follow-up view-only job):** **Arriving by train where your friends are (v1, View only).** Runs after
   Build 1 with no rule/save dependency, once the presence-wait timing behind `cover-hold.ts` is checked in a two-tab
   `look`.

## Shape

- **Sync kind:** **Local** for both builds. No server commands, no wire messages, no `src/sim` changes, no `WORLD_NS`
  bump. Build 1 reads replicated railway + roster mirrors against `localStorage` (`boogle.visit.<room>`). Build 2 reads
  replicated `Train` / `trainStops` / `haltStands` and Owner presence (`remotes`).
- **Reuses:** `src/player/arrival.ts` (`addWelcomeItem`, `roomMemory`, `nameList`), `src/player/welcome-railway.ts`,
  `src/features/welcome-back.ts`, `src/entities/railway/works-board.ts` (`railway.works-post`, `SignBoard`),
  `src/entities/railway/home-station-view.ts` & `src/place/home-station.ts` (`HALL`, `HALL_BOARD`),
  `src/entities/railway/works-live.ts` (`worksThanks`), `src/entities/railway/arrival.ts` (`createReturnSearch`,
  `taken`, `returnSettle`), `src/place/return-spot.ts` (`haltLandings`), `src/entities/railway/return-halts.ts`
  (`haltStands`), `src/sim/railway-queries-trains.ts` (`trainStops`, `runningLine`).
- **Smallest first build (Build 1):**
  - Expand `src/player/welcome-railway.ts` with a pure `railwayProgressSnapshot(w)` + `railwayProgressDiff(then, now)`
    covering Line 1/2 stretches, greybox `Leg.laid`, landmarks, and bought `Plot` hangouts.
  - Add `src/entities/railway/welcome-board.ts` (reusing `railway.works-post` / `SignBoard`) and mount it in Home's hall
    south bay in `src/entities/railway/home-station-view.ts` (with `HALL_WELCOME_BOARD` in `src/place/home-station.ts`).
  - Feed both the board and `src/features/welcome-back.ts` from the same diff + `worksThanks` + `rules.roster` names.
  - Update `docs/game-design/first-run.md` (and `place.md` for Home's hall south bay).
- **Risks:**
  - _Build 1:_ `localStorage` schema change for `boogle.visit.<room>`—keep old numeric `laid` values readable so
    existing browsers don't throw or print nonsense on their first return after deploy. Keep board rows to 4–5 short
    lines so text stays legible at 390 px phone width and ~10 m from the hall pad.
  - _Build 2:_ **Presence race on connect.** When a returning tab loads, `remotes` populates ~100–300 ms after the
    railway mirror is ready. Wait up to 1.5 s behind `cover-hold.ts` (exiting immediately as soon as any `remote.entered`
    pose arrives) so solo loads pay at most 1.5 s only on expired returns, never on recent reloads.
  - _Build 2:_ **Standing train departs mid-settle.** Check `TRAIN_PHASE.STAND && r.at === stop` right when placing; if
    the train has already started rolling, place on the halt's checked platform instead of chasing a moving deck.

## Done means

Each is a `look` the builder opens and reads.

1. **Build 1 — Home hall south bay (first visit / room log):** `--rail-seed gorge-open` (or a seed with a bought town
   plot), standing at the hall pad (`SPAWN`, local `(-97, 14)`) at desktop and `390 × 844`: both boards are visible in
   Home's hall (works board left/north, welcome-back board right/south), clear of posts and paths, and the south board
   reads legibly with `[placeholder: Room log]`, connected places and built hangouts.
2. **Build 1 — Returning player diff:** seed `boogle.visit.<room>` via `--eval` with an earlier snapshot (fewer laid
   sections, fewer bought plots, one fewer roster pid), reload on `--rail-seed gorge-open`: the south board shows
   `[placeholder: While you were away]` with the newly laid stretches/places, built hangout, and unranked names, and
   the Welcome back card shows the matching summary.
3. **Build 2 — Returning friend arrives at friend's halt:** `look --players 2` on `--rail-seed ring-joined` (or
   `gorge-open`), peer 1 standing at Ring Island's platform, peer 2 joining with an expired return record (cleared
   `boogle.railway-pose.v1:...` and saved `boogle.name`): peer 2 settles dry on Ring Island's platform (or on a
   standing train's passenger deck if one is dwelling) facing the track/peer 1, with both peers visible in one frame and
   zero flicker at Home.
4. **Build 2 — Solo / no-friend fallback:** solo expired return on `--rail-seed ring-joined` lands at Home's hall pad
   facing the boards as today; no error and `level-check` stays green.

## Open questions

Each proceeds on its recommendation unless marked as waiting on the owner.

1. **Build order: Welcome-back board first (Build 1), then Arrive by train (Build 2), both view-only?**
   Recommended: **yes.** Build 1 has zero rule/save risk, zero conflict with in-flight branches, and helps solo and
   co-op players immediately.
   Answer: ___
2. **Keep v1 of the welcome-back board free of new saved state (no `WORLD_NS` bump), accepting that it cannot name
   already-known friends who built and logged off while you were away?**
   Recommended: **yes** for v1; log full per-milestone builder attribution as v2 only if playtests miss it.
   Answer: ___
3. **Should a first-time player joining a room with friends out on the line ever skip the Home hall fall and arrive by
   train at a friend's halt instead?** _(Waits on the owner: would change the decided 28 November first-fall landing
   [d-2026-11-28-first-fall-lands-at-the-works](../decisions-controls.md#d-2026-11-28-first-fall-lands-at-the-works) and
   the 2 November title fall [d-2026-11-02-the-first-visit-is-a-fall](../decisions-controls.md#d-2026-11-02-the-first-visit-is-a-fall).)_
   Recommended: **no.** Keep the first-visit trolley fall at Camp (line 1) or Home's hall board (after line 1) so every
   newcomer sees the title fall and the two-minute works/gift flow; apply train arrival to returning players after a
   break.
   Answer: ___
4. **For Build 2, when friends are spread across different halts, pick the friend closest to the room's current
   `roomWorks` site (rather than the first friend in `remotes` order)?**
   Recommended: **yes.** Drops the returning player where the active work is happening.
   Answer: ___
5. **Placeholder wording for the welcome-back board** (`[placeholder: While you were away]`, `[placeholder: Room log]`,
   `[placeholder: Built]`, `[placeholder: Connected]`, `[placeholder: New friends]`, `[placeholder: Helping now]`):
   proceed with marked placeholders until the owner sets the words?
   Recommended: **yes.**
   Answer: ___

## Design review (2026-11-28)

Run by the brief's author in the same context per [design-review](../../.claude/skills/design-review/SKILL.md), after
rereading this brief from the top. Read: [DESIGN.md](../../DESIGN.md), [owner-calls](../agents/owner-calls.md#index),
[decisions](../decisions.md#decided), Current rules of [core-loop](../decisions-core-loop.md#current-rules),
[controls](../decisions-controls.md#current-rules), [rail](../decisions-rail.md#current-rules),
[rewards](../decisions-rewards.md#current-rules) and [process](../decisions-process.md#current-rules),
[direction](../direction.md), [playtests](../playtests.md), [context](../agents/context.md#design-work-rules),
[course-change](../plans/course-change.md), [lane-b](../plans/lane-b.md), [start-flow](start-flow.md),
[start-landing](../plans/start-landing.md), [town-layout](../plans/town-layout.md), and research top blocks
([returning-player](../research/returning-player.md), [friend-group-return](../research/friend-group-return.md)).
Checked live code in `src/entities/railway/arrival.ts`, `src/place/return-spot.ts`, `src/entities/railway/return-halts.ts`,
`src/sim/railway-components.ts`, `src/sim/railway-queries-gift.ts`, `src/entities/railway/works-live.ts`,
`src/entities/railway/works-board.ts`, `src/entities/railway/home-station-view.ts`, `src/place/home-station.ts`,
`src/player/arrival.ts`, `src/player/welcome-railway.ts` and `src/features/welcome-back.ts`. Nothing is ported from
Place (the classic island's old welcome board was retired with Place; Home's hall south bay earns its place directly
under the course-change drop-in goal). No stills were taken (docs-only pass).

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | First-time visit keeps the trolley fall to Camp (line 1) or Home's hall board (after line 1) | Decided | [28 November](../decisions-controls.md#d-2026-11-28-first-fall-lands-at-the-works), [2 November](../decisions-controls.md#d-2026-11-02-the-first-visit-is-a-fall) |
| 2 | Recent reload (< 30 min) resumes the player's saved spot (or their train's destination halt) | Decided | [14 November](../decisions-controls.md#d-2026-11-14-a-recent-reload-returns-you-where) |
| 3 | Returning visit goes straight in with a light Welcome back (Act line first when changed), never stacking two full-screen cards | Decided | [1 November](../decisions-controls.md#d-2026-11-01-first-visit-and-returning-visit-are), [2 November](../decisions-controls.md#d-2026-11-02-a-return-goes-straight-in-and), [11 November](../decisions-controls.md#d-2026-11-11-the-game-has-acts) |
| 4 | Credits and friend names on the board are unranked, with no counts or tiers | Decided | [Thanks](../decisions-core-loop.md#d-2026-11-02-thanks), [no tier labels](../decisions-controls.md#d-2026-11-01-no-contribution-tier-labels-on-the) |
| 5 | In-world board before HUD text; copy stays marked `[placeholder: ...]` and The Boogler's copy is untouched | Decided | [World signs first](../agents/owner-calls.md#world-signs), [Keep Boogler copy](../agents/owner-calls.md#boogler-copy), [course change](../decisions-core-loop.md#d-2026-11-27-course-change) |
| 6 | Place the welcome-back board in Home's hall south bay, mirroring `HALL_BOARD` (`axisPoint(HALL.a + HALL.d / 2 - 1, HALL.c + HALL.w / 2 - 2)`), angled toward `SPAWN` | Default | Keeps Home's hall symmetrical, 10–12 m from the hall pad, clear of `TILL`, `goodsDoor` and the finders' bay |
| 7 | Show `[placeholder: Room log]` on the south board when nothing changed or on a first/second-device visit; cap displayed names at 6 | Default | Avoids a blank board for solo players and newcomers; matches `works-live.ts`'s existing `.slice(0, 6)` cap |
| 8 | Friend-arrival thresholds: friend > 150 m from Home, within 250 m of a standing halt, up to 1.5 s presence wait behind `cover-hold.ts`, tie-break toward `roomWorks` | Default | Cheap tunables; avoids teleporting when friends are already at Home or swimming off-line, and avoids racing `remotes` |
| 9 | Local receding whistle + brief steam puff when arriving on a platform with no standing train | Default | Sells "just stepped off the train" locally without blocking input or adding server state |
| 10 | Build 1 ships the welcome-back board using existing server state + browser `localStorage` (no `WORLD_NS` bump), trading off historical per-milestone builder names for already-known offline friends | New | Recommended: ships immediately in parallel with rail-rule branches ([backlog beyond rail rules](../decisions-process.md#d-2026-11-28-backlog-beyond-rail-rules)); v2 milestone log can follow if missed |
| 11 | Build 2 arrives an expired-return / no-spot returning player at their friend's nearest standing halt (aboard a standing train's passenger car deck if present, else on the platform) when trains run and friends are out on the line | New (widens) | Widens [14 November](../decisions-controls.md#d-2026-11-14-a-recent-reload-returns-you-where) / [16 November](../decisions-controls.md#d-2026-11-16-batch2-controls-confirmed) (expired return starts at Home) and narrows [2 November](../decisions-process.md#d-2026-11-02-an-invite-doesn-t-land-you) for returning players; proceeds and logged per [28 November](../decisions-process.md#d-2026-11-28-widenings-proceed-and-are-logged) |

**Tally:** **5 Decided, 4 Default, 2 New** (1 of the New calls widens recorded return/invite rules and proceeds logged;
none touches the first-time landing, which stays Question 3 waiting on the owner if he wants it changed). Note: because
this docs-only brief does not edit `docs/agent-calls.md`, the orchestrator or builder logs the 4 Default and 2 New
calls in `docs/agent-calls.md` when Build 1 and Build 2 start.

### Findings

1. **Existing `welcome-railway.ts` misses the whole greybox route and town economy.** Today `stretchesLaid` counts only
   Line 1 (`jobs`) and Line 2 (`line2Completed`). Expanding it in Build 1 fixes both the new Home board and the existing
   Welcome back card in one pass.
2. **Research alignment.** [friend-group-return](../research/friend-group-return.md) warns that spread-out players turn
   multiplayer into "a solo mode with a chat box" and cites *Animal Crossing*'s async boards and *Deep Rock Galactic*'s
   drop-in arrival; [returning-player](../research/returning-player.md) says the first seconds back should show what
   grew, not chores. Both ideas directly answer those findings without adding daily-chore pressure.
3. **Level design (Home's hall south bay & halt arrivals).** Checked against `src/place/home-station.ts` and
   `docs/plans/town-layout.md`: Home's hall is 13 × 6 m on `HALL.floor` (18.34 m) with four even bays; `HALL_BOARD`
   stands in the north bay (`c - w/2 + 2`), `TILL` is in the north end wall's back bay, and the finders' bay stands
   outside the south end at `(-89.19, 21.80)`. Mirroring `HALL_BOARD` in the south bay (`c + w/2 - 2`) keeps ~10–12 m
   (2 s walk) from `SPAWN` with clear sightlines and leaves all four walking lanes open. The three firm rules of
   [progression-flow-layout](../research/progression-flow-layout.md#the-rules-as-lenses) hold: (1) next goal stays
   findable (works board stays in the north bay; Build 2 lands at a standing halt that already has its own works face);
   (2) no gate loses its meaning (Build 2 only lands at **standing** halts the room has already built and opened, never
   past a closed barrier); (3) nobody is stranded (every standing halt has train service back to Home). *Not seen:* no
   browser stills were taken for this docs-only pass; the builder verifies the south-bay framing and clearances with
   `look` and `npm run level-check`.
4. **Solo vs. co-op.** Solo players get full value from Build 1 (`[placeholder: Room log]` and `[placeholder: While you
   were away]` on next-day returns) and zero overhead from Build 2 (falls straight through to `worksLanding()` when
   `remotes` is empty). Co-op players get both async catch-up (Build 1) and instant reunion on the built line (Build 2).
5. **Copy.** Zero Boogler copy, story, character or name changes. All new board headings and labels are marked
   `[placeholder: ...]`.

## Suspect or placeholder lines

None of The Boogler's copy, story, characters or names are touched. New placeholder words for the owner:

- `[placeholder: While you were away]` (welcome-back board header when new progress happened since last visit)
- `[placeholder: Room log]` (welcome-back board header when nothing changed, on a first visit, or on a second device)
- `[placeholder: Connected]` (newly reached places / laid track row)
- `[placeholder: Built]` (newly built town hangouts row)
- `[placeholder: New friends]` (roster newcomers row)
- `[placeholder: Helping now]` (current `worksThanks` row)

## Parked

- **v2 server-saved milestone log (`WORLD_NS` bump):** a small saved ring buffer of the last 6–8 completed milestones
  and town buys with unranked builder `pids`, so the board can name already-known friends who built and logged off
  before you returned.
- **Cross-device last-seen snapshot:** storing a compact per-account last-seen milestone cursor on the server (or
  account service) so signing in on a second device still gets a personal "while you were away" diff.
- **Voluntary "Ride to friend" prompt on Home's hall board:** for a player already standing at Home who wants to catch
  the next train straight to a friend's halt (sits beside the existing express/line map design).
- **Honks left on things friends built / postcards and gifts** (proposal items 16 and 17): separate follow-ups once
  boards and accounts feel good in play.
