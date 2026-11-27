> **Status: proposed (2026-11-27).** Panel brainstorm (`--panel`: Play Designer, Systems Architect, Creative Director; two rounds) for Lane C of the [course change](../plans/course-change.md#lane-c-towns-are-the-hangout) ([decision](../decisions-core-loop.md#d-2026-11-27-course-change)). Ground: Home's Round ([town-layout](../plans/town-layout.md), [home-flip](../plans/home-flip.md), [first-town-lesson-review](first-town-lesson-review.md)). `npm run inflight`: nothing unmerged on `wip/`, `ship/` or `claude/` this week. All building names, board strings and plaque words are `[placeholder]` for the owner ([d-2026-11-11-the-story-and-characters-are-the-owner-s](../decisions-characters.md#d-2026-11-11-the-story-and-characters-are-the-owner-s)); none of The Boogler's copy is touched. The brief proceeds on its recommended answers.

# Lane C: towns are the hangout

## Pitch

Turn Home's Round (and every later hub town) from a passive fare counter into a shared playground that the room shapes on purpose. On arrival, the beach ball and a low timber cowbell court already sit on the south-west quadrant of the Round's green—giving any drop-in guest something goofy to play with in seconds. When the room spends its first 150 Boogles on Offer 1 (`plot3`, beside the hall), twin blueprint boards offer a two-way pick between two zero-server-rule hangout buildings—`[Placeholder: Seed Shed]` (bouncy mushrooms, already tuned to bounce the beach ball at 0.95 restitution) or `[Placeholder: Horn Pavilion]` (three chorded brass pads playable by foot or thrown ball)—with the retired engine driver Bram ([d-2026-11-19-first-house-resident](../decisions-characters.md#d-2026-11-19-first-house-resident)) still moving into whichever wins, and the unchosen option staying available for Offer 3 (`plot1`).

**Principles served:** Core loop ("choice and hanging out live in the towns, where every building adds something to do"), **2. Physics toys are optional fun**, **3. Side activities are never required**, **6. Communal world, personal things**, **7. Telegraph everything**, **8. Enjoyable alone and together** (drop-in guest first), **10. Slapstick over precision**, and **11. Show, don't tell**.

**Principles bent:** None. One earlier decision is updated by the 27 November course change itself: "the first town asks no choice between its plots" ([d-2026-11-16-first-island-teaches](../decisions-core-loop.md#d-2026-11-16-first-island-teaches)) gives way to Lane C's two-way pick on Offer 1 while keeping Offer 2 (`plot2`) fixed as the Loader Yard.

## Gut question

When a friend drops into a room that has already built one town plot, do they notice the new thing on the Round and start messing with it unprompted within 30 seconds?

---

## Answers to the three brief questions

### 1. Catalogue of town buildings (each adds something to do)

**Rule:** Hangout plots always pit **Hangout vs. Hangout** (both keep the same `+1 rider / minute` baseline so neither is a progression trap, and every building is walk-in per [d-2026-11-10-every-building-can-be-walked-into](../decisions-core-loop.md#d-2026-11-10-every-building-can-be-walked-into)). Never pit a rail-works building (like `plot2`'s Loader Yard) against a toy on the same plot. All names below are **`[placeholder]`**.

#### Wave 1 — Home's Round first build (zero new server toy rules)

| Building `[placeholder]` | What you do there | Solo vs. Co-op | Sync kind & reused code |
| --- | --- | --- | --- |
| **Seed Shed** *(Offer 1, Pick A)* | Walk up to the spotted-toadstool awning / stall, grab a seed bag, and sprout 5 bouncy mushrooms anywhere on the Round for 20 s to bounce yourself or the beach ball (`0.95` restitution!) over the green and onto the central perch. Inside: Bram's front room & live model railway. | Solo: bounce onto the scaffold/statue perch or lob trick shots. Co-op: build improvised mushroom-bounce ball rallies across the Round. | **Local + one-off room message** (`{ t: 'mush', s }` already in `src/adapters/mushrooms.ts`, `mushrooms.stall` prefab). |
| **Horn Pavilion** *(Offer 1, Pick B)* | Open porch/wing with 3 chunky brass horn pads + overhead steam horns. Jump on a pad—or peg it with a thrown beach ball—to blast harmonious procedural brass chords across the Round with a roof steam puff (600 ms cooldown so even spam sounds musical). Inside: Bram's front room & live model railway. | Solo: percussive fidget & ball-target practice between trains. Co-op: chaotic 3-player town chords; hitting all 3 together gives a celebratory puff. | **Local + one-off room message** (`{ t: 'horn', pad }`, rate-limited via `createLimiter`, reusing `src/features/honk.ts` Web Audio synth + `fanfare.ts`). |

#### Wave 2 — Later Home plots & hub towns (Ring Island, Canopy Town, Port Quay, High Gorge)

| Building `[placeholder]` | What you do there | Best hub fit | Sync kind & reused code |
| --- | --- | --- | --- |
| **Frisbee Boathouse** *(step 2)* | Grab a gliding frisbee from the porch rack and skim it around the ring road or quay to clatter hanging tin-can targets. | Home (`plot1` / `plot4`), Port Quay, High Gorge | **Owner** (`createOwnerSync` on presence key `frisbee`, reusing `PROFILES.frisbee` + `stepFlight` in `src/physics/flight.ts` — **no server ops needed**). |
| **Caddy Shed** *(Town Golf)* | Tee mat + 3-hole bucket-and-flag course weaving around the town's actual buildings and central monument—each new building reshapes the shots. | Home (later plot), Ring Island | **Local** (reuses Owner beach ball + `fanfare.ts` from `docs/game-design/minis.md`). |
| **Lookout Tower** | Climb to a high deck with a fixed telescope aimed at the current works / ring, plus a glide launch perch over town. | Ring Island, High Gorge | **Local** (walkable prefab + `src/entities/lookout/`). |
| **Dunk Bakery** | Throw the beach ball (or frisbee) at a porch target paddle to dump a friend sitting on the perch into a splash tub. | Port Quay, Canopy Town | **Local + Owner** (ball/frisbee hit + existing splash/sit primitives). |
| **Soapbox Garage** | Spawns 1–2 springy soapbox carts on the town's loop with a start/finish arch (Home's 107 m ring road is an ~8 s lap). | Home (late), Port Quay, Bell Rock | **Owner** (reuses `?proto=soapbox` handling once promoted). |

*(The **Loader Yard** stays fixed on Offer 2 / `plot2` at bearing 160° as the works shed with jib from [first-town-lesson-review](first-town-lesson-review.md). Later hub towns repeat the pattern: one works plot plus two or three hangout-choice plots suited to the hub's shape.)*

### 2. How the room picks what goes on a plot

**Recommendation:** Put the first two-way pick on **Offer 1 (`plot3`, beside the hall, 8 timber, 150 Boogles)**—matching `course-change.md`'s default—and keep **Bram (the retired engine driver)** inside `rooms.rooms.plot3` whichever building wins (`Plot.kind` mounts the chosen exterior hangout wing/yard kit onto `plot3` without touching `rooms.ts`, `residents.ts`, `first-house.ts`, or `model-railway.ts`).

- **Diegetic twin boards (zero menus, DESIGN 11):** A staked choice plot stands **two side-by-side timber boards** spaced `±1.2 m` (~2.4 m apart) around `townPlotBoard(k)` so both stay inside `railway-server.ts`'s `3.2 m` reach check while keeping prompts cleanly separated. Each board carries a chunky 3D topper (toadstool vs. brass horn), a 2–3 word `[placeholder]` title, `+1 rider / minute`, and the Boogle price.
- **Live-swapping gold ghost:** Pre-mount two `createGhostOutlines` meshes on the plot; stepping near Board A vs. Board B toggles `.visible` with a soft wooden *clack* so friends standing together compare silhouettes in 3D space before committing.
- **Solo & co-op commit (no vote modal):** Hold Interact (`1 s`, matching Trade) at the chosen board. The first `rail.buy { id, kind }` to reach `railway-server.ts` wins atomically (unpredicted), deducts `Till.boogles`, records `{ at, paid, kind }`, pops the unchosen board out in a dust puff, and plays the existing 10 s `startSite` drop on every tab. A simultaneous second press is cleanly rejected and spends nothing.
- **No permanent lockout:** The unchosen building stays in the catalogue for Offer 3 (`plot1`, bearing 220° on the ring), so co-op picks stay low-stress ("which do we want *now*?") while still making each plot's spot and timing a visible room choice.

### 3. Which existing toys move to town first

1. **First build (Checkpoint item 3 — zero new server toy rules):**
   - **Beach ball + cowbell half-court on the Round's green (free from arrival):** Move the ball's spawn and `R`-respawn to Home's green on `productionRailway`. Tuck a compact chalk-lined half-pitch with **two low chunky timber goal frames + hanging brass cowbells** (no tall nets, no scoreboard—just a loud *CLANG!* and bunting flutter on crossing) onto the **south-west quadrant** of the 14 m green (bearings ~195°–245°, inside the flat `r 10` floor, clear of the 5×5 m central footing and the dock→statue→hall sightline). Add a small **sideline ball-return lever** calling `respawnBall()` so nobody needs to know `R`.
   - **Seed stand & bouncy mushrooms (Offer 1, Pick A):** *Panel code discovery:* `docs/plans/course-change.md` assumed the seed stand needed railway server edits, but `src/adapters/mushrooms.ts` **already** uses a Local one-off room message `{ t: 'mush', s }` (`createLimiter(1, 800)`). It only fails at Home because `mushrooms.json` sits on the classic island and `mushrooms.ts` checks classic `groundHeight()` + `|v| < HALF` (`HALF = 255`), silently dropping Home's `x ≈ 885`. Fixing those two lookups brings mushrooms to town in Build 1 with **zero server rules**—and `mushroomMat` already has `restitution: 1.73` (`0.95` combined with `ballMat`)!
2. **Second step (planner's follow-up — also zero server rules if Owner-synced):**
   - **Frisbee & throwing:** Instead of reviving retired lockstep `gift.toss` ops on the railway server, promote the frisbee to a `createOwnerSync` entity (like the ball, reusing `PROFILES.frisbee` + `stepFlight` in `src/physics/flight.ts`) and unlock `canThrow()` for `'frisbee'` alongside `'ball'`. Zero server ops, zero `WORLD_NS` bump.

---

## Best suggestions (ranked)

1. **`[Systems]` Reuse `mushrooms.stall` + `{ t: 'mush' }` as Offer 1 Pick A (Seed Shed) — zero server toy rules.** Fixing classic `HALF = 255` and `groundHeight()` unlocks a proven, ball-bouncing (`0.95` restitution) toy immediately instead of building new static bounce pads.
2. **`[Play]` + `[Creative]` Pair Seed Shed vs. Horn Pavilion on `plot3` and keep Bram inside whichever wins.** Preserves `d-2026-11-19-first-house-resident` with zero changes to `rooms.ts`/`residents.ts`/`model-railway.ts`, pits Hangout vs. Hangout (kinetic physics vs. musical mischief), and lets the beach ball trigger both toys (bounce on mushrooms, ring the horn pads!).
3. **`[Creative]` Free SW-quadrant cowbell half-court on arrival + sideline ball-return lever.** Low timber frames with hanging brass cowbells keep the dock→monument→hall sightline open, read wordlessly (DESIGN 11), and give a drop-in guest immediate play; the sideline lever calls `respawnBall()` so nobody hunts for `R`.
4. **`[Systems]` + `[Creative]` Twin boards (`±1.2 m`) with live-swapping gold ghosts and atomic `Plot.kind: 'u8'`.** Pre-mounted ghost outlines toggle `.visible` at zero per-frame cost; one minimal `WORLD_NS` bump (`v75 → v76`) scales cleanly to every future hub town.
5. **`[Systems]` Unify `worldGroundHeight(x, z)` / `groundProbe.under` for all toys.** Eliminates the classic-island `HALF = 255` and `island/heights.ts` traps once so future toys (frisbee, golf) work in any town on the ring.

### Real tensions resolved

- **Bram (`plot3`) vs. Offer 1 two-way choice:** Systems Round 1 proposed pitting Driver's House against Seed Shed; Play & Creative pushed back because evicting Bram until Offer 3 (1,600 Boogles) weakens `d-2026-11-19-first-house-resident` and pits a character against a toy. **Resolved:** Keep Bram's walk-in `rooms.rooms.plot3` base intact and let `Plot.kind` mount the chosen exterior hangout wing (Seed Shed vs. Horn Pavilion) onto `plot3`.
- **Green sunken bowl (`drop: 0.8`) vs. flat (`drop: 0`):** Systems warned the 0.8 m slope rolls the ball toward the statue; Creative & Play argued the shallow dish frames the monument and acts as a free natural ball-catcher that stops balls rolling into the Hall or dock street. **Resolved:** Keep `drop: 0.8` first with the court tucked inside the flat `r 10` floor, verified by one `/codex` previz still before building; flatten to `drop: 0` only if the slope clips frames or traps the ball.
- **Bounce Loft / Bounce Barn vs. roof-hop exploits:** Systems flagged that permanent high bounce pads risk re-opening the Fine Prices glider-balcony roof hop (`town-layout.md` Level Finding #8). **Resolved:** Use temporary sproutable mushrooms (Seed Shed) + Horn Pavilion for Build 1; defer permanent bounce towers. (See Design Review Finding 2 on mushroom height near Fine Prices.)
- **`[Built by <Name>]` plaque & little-guy startled hops:** Creative wanted both now; Systems flagged that `Plot.by` bloats `RAIL_REPLICATED` / `MAX_RECOVERY_BYTES` and little-guy hops touch `folk.ts`. **Resolved:** Defer both to polish so Build 1 stays small.

---

## Shape

- **Sync kinds:**
  - `Plot.kind: 'u8'` (default `0`): **Server** (`src/sim/railway-components.ts`, written only by `rail.buy { id, kind }`, replicated in `RAIL_REPLICATED`, checkpointed in saves). One **`WORLD_NS` bump (`v75 → v76`)**.
  - Beach ball & ball-return lever: **Owner that changes hands** (`createOwnerSync` on presence key `b`, `src/entities/ball/*`). Zero server rules, nothing saved.
  - SW green cowbell court & goal triggers: **Local** (static prefab + local `ball.pose.p` crossing check → Web Audio *CLANG!* + bunting impulse). Zero network messages.
  - Seed Shed (`mushrooms.stall` + sprouting) & Horn Pavilion (3 brass pads): **Local + one-off room message** (`{ t: 'mush', s }` and `{ t: 'horn', pad }`, rate-limited via `createLimiter`). Zero server rules, nothing saved.
- **Code reused:** `Plot` / `Till` / `rail.buy` (`src/sim/railway-sys-trade.ts`, `src/sim/railway-trade-layout.ts`), `src/entities/town/plots.ts`, `src/entities/town/rooms.ts`, `src/entities/town/first-house.ts`, `src/entities/ball/*`, `src/player/hands.ts`, `src/player/throw.ts`, `src/adapters/mushrooms.ts`, `src/features/honk.ts`, `src/render/fanfare.ts`.
- **Smallest first build (one `WORLD_NS` bump, two clean slices):**
  1. **Ball + SW green cowbell court (client-only):** Fix `ball/state.ts` (`HALF = 255` bounds + `H(x, z)`), enable `canThrow()` for `'ball'` in `player/hands.ts`, fix `throw.ts` & `impact.ts` ground height on Place, mount the SW green half-court prefab (chalk lines, two low timber cowbell goals, sideline `respawnBall()` lever) in `src/entities/town/streets.ts`.
  2. **Offer 1 two-way pick (`Seed Shed` vs. `Horn Pavilion`):** Add `Plot.kind: 'u8'` and `TradePlot.choices`, bump `WORLD_NS`, render twin boards (`±1.2 m` around `townPlotBoard(0)`) with live-swapping gold ghosts in `plots.ts`, mount the chosen wing on `plot3` (keeping Bram's interior untouched), and fix `adapters/mushrooms.ts` ground height + Place bounds.
- **Risks & containment:**
  - *Classic-island `HALF = 255` / `island/heights.ts` leaks:* Audit `ball/state.ts`, `impact.ts`, `throw.ts`, `adapters/mushrooms.ts`, and `ballMesh.position` readers (`blob-shadows.ts`, `splash.ts`, critters); add a Node unit test asserting Home's `TOWN_CENTRE` coordinates pass ball bounds and mushroom validation.
  - *Two-board reach check:* Keep both boards within `±1.2 m` of `townPlotBoard(0)` (or pass `kind` into `townPlotBoard`) so `railway-server.ts`'s `3.2 m` reach check passes from either board.
  - *Interact priority near the ball:* Verify picking up the ball doesn't steal `E` from plot boards or the Hall door when resting nearby.
  - *Weekly `WORLD_NS` bump batching:* Coordinate the single `v75 → v76` bump with Lane A/B if batched under `course-change.md` open question 2.

---

## Done means

1. **Dock arrival & SW green court (previz + build look):** `npm run look -- --rail-seed awake` from the top of the dock street `(-150.7, 33.1)` toward `70°` and overhead above `G` (`70 m` up), plus one phone-width (`390 px`) shot. Visible: the bright beach ball and low timber cowbell half-court tucked in the SW quadrant of the green, clear of the central scaffold/footing and the dock→hall sightline, with the sideline return lever readable.
2. **Two-way choice on Offer 1:** `npm run look -- --rail-seed house-ready` facing `plot3`'s twin boards; two stills (standing at Board A, then Board B). Visible: both boards cleanly separated with distinct 3D toppers and `[placeholder]` titles, and the breathing dashed gold outline swapping cleanly between Seed Shed and Horn Pavilion silhouettes.
3. **Seed Shed built + ball bounce:** `--eval` buying `kind = Seed Shed` on `plot3`, taking a seed bag, sprouting mushrooms on the green, and throwing the beach ball onto a cap (motion sheet + still). Measurable: Bram still stands inside `plot3` with his model railway, mushrooms sprout at Home's `x ≈ 885` on Place ground height, and the ball bounces off a cap.
4. **Horn Pavilion built + co-op/ball chord:** `--eval` buying `kind = Horn Pavilion` on `plot3`, stepping on a pad and hitting a pad with the beach ball, plus a reload/rejoin check (`test:net`). Measurable: accepted `Plot.kind` survives reload/rejoin, unchosen board is gone, and a simultaneous two-peer `rail.buy` race accepts exactly one.
5. **Goal trigger & return lever:** `--eval` throwing the beach ball through a SW goal frame (bunting impulse + no UI clutter) and pulling the sideline lever to teleport the ball back to the pitch centre.

---

## Open questions

Each proceeds on its recommendation; nothing waits for a playtest.

1. **Offer 1 (`plot3`, 150 Boogles) is `[Placeholder: Seed Shed]` vs. `[Placeholder: Horn Pavilion]`, with Bram moving into whichever wins?**
   - **Recommended:** **Yes.** Honours `d-2026-11-19-first-house-resident`, needs zero server toy rules, keeps `+1 rider/min` on both, and puts the unchosen option into Offer 3 (`plot1`).
   - Answer: ___
2. **Beach ball + low cowbell half-court free on the Round's green from arrival (not gated behind a building)?**
   - **Recommended:** **Yes.** Gives a drop-in guest an immediate town toy within 20 seconds of landing; the first bought plot expands the hangout.
   - Answer: ___
3. **Keep `TOWN_GROUND.green.drop = 0.8` (shallow meadow bowl, court inside the flat `r 10` floor) and check it in one `/codex` previz still first, or flatten to `drop = 0` now?**
   - **Recommended:** **Keep `drop = 0.8` and check in one previz still first** (the 0.8 m slope naturally catches stray balls; flatten only if it clips the court or traps the ball against the footing).
   - Answer: ___
4. **May the unchosen building on a plot reappear on a later hangout plot (Offer 3 / `plot1` or a later hub town) rather than being permanently locked out?**
   - **Recommended:** **Yes.** Keeps co-op choices low-stress without a vote modal while still making each town visibly shaped by the room's picks.
   - Answer: ___
5. **Move the frisbee (step 2) to Owner sync (`createOwnerSync`, like the ball) instead of railway server ops?**
   - **Recommended:** **Yes.** Reuses `PROFILES.frisbee` + `stepFlight` with zero server ops and zero `WORLD_NS` bump.
   - Answer: ___

---

## Parked

- **Frisbee Boathouse** (step 2: Owner-synced frisbee + hanging tin-can targets on the eaves).
- **Caddy Shed / 3-hole Town Golf** (reusing `minis.md` tee mat + buckets weaving around built town plots).
- **Dunk Bakery** (ball-hit target paddle dumping a seated friend into a splash tub).
- **Soapbox Garage** (1–2 springy carts on the Round's 107 m ring road).
- **Lookout Tower** (telescope aimed at the current works + glide perch for Ring Island / High Gorge).
- **Passing little-guy 1 s startled hop / glance** on goals and horn chords (`folk.ts` polish).
- **Unranked `[Built by <Name>]` threshold plaque** on bought plots (needs builder attribution without bloating `RAIL_REPLICATED`).
- **The Boogler's deadpan hat-spring / double-take** near town toys in post-game (never editing his existing copy).

---

## Design review (2026-11-27)

Run on this brief by its author after rereading from the top. Checked against [DESIGN.md](../../DESIGN.md), [owner-calls.md](../agents/owner-calls.md), [decisions-core-loop.md](../decisions-core-loop.md), [decisions-rewards.md](../decisions-rewards.md), [decisions-characters.md](../decisions-characters.md), [direction.md](../direction.md), [playtests.md](../playtests.md), [context.md#design-work-rules](../agents/context.md#design-work-rules), `src/place/town-plan.ts`, `src/sim/railway-trade-layout.ts`, and research ([growing-towns](../research/growing-towns.md), [level-design](../research/level-design.md), [route-contract](../research/route-contract.md), [goofy-physics-coop](../research/goofy-physics-coop.md), [minigames-and-physics-minigames](../research/minigames-and-physics-minigames.md)).

### Calls table

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Towns are where choice and hanging out live: every building adds something to do, the room picks what goes on a plot, and existing toys move to town | Decided | [d-2026-11-27-course-change](../decisions-core-loop.md#d-2026-11-27-course-change) |
| 2 | Every town building is walk-in | Decided | [d-2026-11-10-every-building-can-be-walked-into](../decisions-core-loop.md#d-2026-11-10-every-building-can-be-walked-into) |
| 3 | The first bought house's resident is the retired engine driver (Bram, placeholder lines until refined) | Decided | [d-2026-11-19-first-house-resident](../decisions-characters.md#d-2026-11-19-first-house-resident), [d-2026-11-26-placeholder-words-taken](../decisions-characters.md#d-2026-11-26-placeholder-words-taken) |
| 4 | Offer 2 (`plot2`, bearing 160°) stays fixed as the Loader Yard (0 riders, loads every line 2 train) | Decided | [d-2026-11-16-first-town-lesson-answers](../decisions-rewards.md#d-2026-11-16-first-town-lesson-answers) |
| 5 | Physics toys are optional fun; side activities never gate progress or produce income | Decided | [DESIGN.md](../../DESIGN.md) principles 2 & 3 |
| 6 | Offer 1 (`plot3`, 150 Boogles) is the first two-way pick: `[Placeholder: Seed Shed]` vs. `[Placeholder: Horn Pavilion]`, both `+1 rider / minute`, with Bram living in whichever wins | New | Recommend yes (open question 1); preserves Bram, pits Hangout vs. Hangout, zero server toy rules |
| 7 | Beach ball + low timber cowbell half-court stand free on the Round's green from arrival, with throwing enabled for `'ball'` on production | New | Recommend yes (open question 2); zero-friction drop-in toy within 20 s of landing |
| 8 | Unchosen building on a choice plot stays in the catalogue for a later hangout plot (Offer 3 / `plot1` or later hub town) | New | Recommend yes (open question 4); avoids co-op vote modal and lockout regret |
| 9 | Hangout plots always pit Hangout vs. Hangout (same rider baseline), never Works vs. Hangout | New | Recommend yes; prevents progression-minded or solo players from skipping fun |
| 10 | Frisbee (step 2) uses Owner sync (`createOwnerSync`) instead of railway server ops | New | Recommend yes (open question 5); matches ball feel, zero server ops / bump |
| 11 | SW-quadrant court placement (bearings ~195°–245°, inside flat `r 10` floor), keeping `TOWN_GROUND.green.drop = 0.8` pending one `/codex` previz still | Default | Keeps dock→monument→hall sightline and northern rider walks clear; shallow dish catches stray balls (open question 3) |
| 12 | Low timber goal frames with hanging brass cowbells (no tall net, no scoreboard, Local `ball.pose.p` crossing trigger) + sideline `respawnBall()` lever | Default | Reads wordlessly (DESIGN 11), zero net messages, solves `R` discoverability |
| 13 | Twin choice boards spaced `±1.2 m` around `townPlotBoard(0)` with live-swapping breathing gold ghosts (`0.6` opacity) and 1 s Interact hold | Default | Fits `railway-server.ts`'s `3.2 m` reach check; reuses Station 1 two-stand pattern |
| 14 | Horn Pavilion has 3 brass pads with 600 ms rate-limited `{ t: 'horn', pad }` message, triggered by player step or thrown beach ball | Default | Reuses `honk.ts` synth; cooldown keeps co-op spam musical |
| 15 | `Plot.kind: 'u8'` + optional `kind` on `rail.buy`, one `WORLD_NS` bump (`v75 → v76`), unpredicted server-atomic race resolution | Default | Minimal durable schema; scales to every hub town without future bumps |
| 16 | All building names and board titles (`Seed Shed`, `Horn Pavilion`, `Frisbee Boathouse`, `Caddy Shed`, `Lookout Tower`, `Dunk Bakery`, `Soapbox Garage`) are marked placeholders | Default | Owner owns names, story and characters ([d-2026-11-11-the-story-and-characters-are-the-owner-s](../decisions-characters.md#d-2026-11-11-the-story-and-characters-are-the-owner-s)) |

### Findings

1. **Port-from-Place fit check (owner call "Port from Place only what still fits"):**
   - **Beach ball (`src/entities/ball/`):** Earns its place—best existing slapstick co-op toy, Owner-synced, zero server cost, immediate drop-in pull.
   - **Seed stand & bouncy mushrooms (`src/adapters/mushrooms.ts`):** Earns its place—20 s temporary bounce pads that multiply the beach ball (`0.95` restitution) with zero server rules.
   - **Frisbee (`PROFILES.frisbee` + `stepFlight`):** Earns its place in step 2 *only* as an Owner-synced toy, not by reviving retired lockstep `gift.toss` ops.
   - **Classic volleyball tall net / keepy-uppy streak / `minis.md` global scores:** Cut/not ported—tall nets clutter the Round's sightline; personal/local fanfare without scoreboards fits Boogle's tone better ([minigames-and-physics-minigames](../research/minigames-and-physics-minigames.md) recs 2, 7, 8).
2. **Route-contract & level-design check on sproutable mushrooms in town ([route-contract](../research/route-contract.md)):**
   - Sproutable mushrooms bounce players `15 m/s` (~4+ m up). Because the rooftop chain to Fine Prices' glider balcony is already an accepted optional cosmetic shortcut ([d-2026-11-18-decisions-page-rewards](../decisions-rewards.md#d-2026-11-18-decisions-page-rewards)) and nothing on the railway route is gated by Home roofs, mushrooms break **zero** work edges (Rule 2 holds: movement may skip travel, never work). Still, the planner/builder should confirm sproutable mushrooms cannot launch a player onto an unbuilt railhead or out of bounds near the cove without normal water recovery (Rule 3: nobody stranded).
3. **Level design (space, walk-seconds, sightlines):**
   - *Flow & walk-seconds* (`5.6 m/s` walk, [level-design](../research/level-design.md)): Dock street top `(-150.7, 33.1)` to SW green court (~20 m, **~3.5 s**); Hall doorway to SW court (~30 m, **~5.5 s**); Hall doorway to `plot3` (`(-90.5, 33.0)`, ~22 m, **~4 s**); `plot3` to SW court (~26 m, **~4.6 s**). Meets the "something to notice every few seconds, something to do every 10–20 s on Home" guide.
   - *Sightlines:* SW quadrant (bearings 195°–245°, inside `r 10` flat floor) sits right of the dock street arrival (`250°`) without blocking the `250° → 70°` sightline past the central unfinished statue/scaffold at `G` (`5 × 5 m` footing) to the Station Hall, and leaves northern rider paths (Gate Cottage `280°`, Museum `340°`, Pip's `10°`) clear.
   - *Unseen / unmeasured:* No stills of the SW court in the `0.8 m` bowl exist yet (flagged for one `/codex` previz still before building); `plot3` sits on the quarry road facing `270°` rather than on the ring itself, so the builder's `house-ready` still must confirm both twin boards (`±1.2 m` along `z`) clear the `1.149 m` curio-shelf-to-`plot3` gap (`test/town-plan.test.ts`).
4. **First meeting, solo vs. co-op, late arrival ([goofy-physics-coop](../research/goofy-physics-coop.md)):**
   - *First meeting:* Drop-in guest sees the striped beach ball + cowbell frames immediately off the dock street; zero text needed.
   - *Solo:* Both toys work alone (bounce ball off mushrooms/monument/horn pads; ring chords; shoot cowbell goals).
   - *Co-op & late joiner:* Anyone can buy; server atomicity settles races; returning friends spawn facing the Round and see the finished building + active toy immediately; unchosen option stays available on Offer 3 (`plot1`).
5. **Research alignment:** Adopts [minigames-and-physics-minigames](../research/minigames-and-physics-minigames.md) recs 1, 2, 4, 8 (toy first, one-glance rule, slapstick, place-with-a-prop not a mode), [growing-towns](../research/growing-towns.md) rec 2 (buildings fit authored Round footprints), and [goofy-physics-coop](../research/goofy-physics-coop.md) (no opponents/winners; permissive physics). No research recommendation contradicted.

### Suspect or placeholder lines

- None of The Boogler's copy is touched.
- Placeholder names/strings for the owner: `Seed Shed`, `Horn Pavilion`, `Frisbee Boathouse`, `Caddy Shed`, `Lookout Tower`, `Dunk Bakery`, `Soapbox Garage`, and any short board label on the twin Offer 1 boards.

Calls 6 to 16 are logged in [agent-calls.md](../agent-calls.md) (status `open`).
