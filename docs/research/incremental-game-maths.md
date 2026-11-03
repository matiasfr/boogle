# Incremental maths: earn the better way

_Research report, 2 November 2026. Live primary-source research into cost curves, useful upgrades, unfolding play, offline limits and 1–2-hour sittings within Boogle's roughly eight-hour adventure. Repository inspected at `3280c6ff`; existing economy tables and sensitivities rerun with Node 24. This is research and proposed model work, not gameplay implementation, a new playtest or approval of campaign tuning._

**Evidence:** **[V]** means inspected repository code, an owner decision or a fetched primary source; **[C]** means reproduced calculation; **[H]** means a design hypothesis or proposed experiment. Source code establishes a mechanism, not why everyone enjoys it. GDC slides were read; talks and gameplay videos were not watched, and reference games were not played for this report. All proposed minutes, percentages and costs below are **[H]**, even where their arithmetic is exact.

## Answer first

**Build a finite ladder of useful changes, with mild pressure between rungs and conspicuous relief at each rung.** Boogle's growth variable should be what the crew can accomplish and reach: useful track per carrying trip, completed kits per minute at the frontier, and familiar journeys made easier. Money remains a comic score. A permanent upgrade should make a familiar job measurably easier before a new place asks something more of the player.

The latest [decision log, first entries under “The shape of the game”](../proposals/boogle-2.md#the-shape-of-the-game) and [approved round-4 plan](../plans/round-4.md) require **railway building, exploring with abilities and an incremental climb equally**. They explicitly ask for more satisfying chopping/carrying before relief, a walkable path before a train, and the ladder **tool → carry → nearby materials → faster travel → train**. Equal importance does not imply three separate 160-minute timers: one connection can satisfy all three. Offline progress completes the last committed job; it cannot choose and complete the next adventure for absent friends.

Start testing a useful improvement after roughly **5–10 active minutes in the opening**, then **12–20 minutes between smaller efficiency gains**, with **30–45-minute projects** and **60–100-minute major transformations** later. These are initial authoring bands, not findings about a universal attention span. Give every 60-minute sitting a complete useful result and every 120-minute sitting a larger payoff, without enforcing those sitting lengths. An eight-hour forecast is credible only after its minutes have named, playable activities.

Serves [DESIGN.md](../../DESIGN.md): **Toys before chores**, **Cooperation is automatic**, **Communal world, personal rewards**, **Telegraph everything**, **Designed for drop-in, drop-out**, and **Leave something for the next visitor**. No principle needs bending. Neither the find-the-fun nor round-4 checkboxes are completed by this document.

## What the existing work gets right and wrong

### The calculator is sound within its assumptions; its scope is now too narrow

**[V/C]** [`dev/economy/model.ts`](../../dev/economy/model.ts) reproduces its historical **437-second** solo fit, the proposed **8.48-minute** chapter, and the six-era **484.40-minute** solo budget. It properly uses integer loads, fixed bills, a longest-worker schedule, separate work/travel/build/wait categories, and a reserved kit rather than limitless stock. It distinguishes a new capability from another cosmetic payout. Its sensitivity switches are worth preserving.

| Reproduced result                                           | What it actually tells us                                                                      |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Campaign: 397 minutes of `content`, 82.0% of the total      | Most of eight hours is still an authoring allowance, not simulated activity                    |
| Campaign with `--content=0`: 99.97 minutes solo             | Removing content exposes additional supply waits; do not simply subtract 397 from the total    |
| Campaign solo → four: 484.40 → 480.81 minutes               | The schedule offers little scope for cooperation; this is not a measured co-op result          |
| Campaign harvest: about 0.08 minutes; 50 minimum solo loads | This table barely represents the requested harvesting and efficiency climb                     |
| Longest named novelty gap: 29.33 minutes                    | A service/destination label at the end does not establish interesting play inside the interval |
| Chapter production at 10%: 8.48 → 11.13 minutes solo        | Automation can replace a commute with a queue                                                  |

**[H] Missing model concepts:** an upgrade is not an event that changes subsequent work; `carry`, train speed and supply are assigned directly to links. There is no purchase/construction opportunity cost, tool progression, ability prerequisite, stock by good, task dependency graph, absence or return event. All players are interchangeable carriers, and the function rejects more than four. A whole supplied kit arrives before any manual work begins. Mixed goods share one production rate. These limitations matter to the requested ladder, cooperative specialisation and light offline progress; they are not arithmetic bugs.

**[V] Calibration has aged.** The model deliberately fits earlier measurements, whereas [place's measured section](../game-design/place.md#measured) now includes third-round traces and missed-train delays. Its optional `&coop=1` implementation also exists in [place/coop.ts](../../src/proto/place/coop.ts); the earlier reports' blanket description of `place` as Local is stale for that variant. Neither a Local run nor this throwaway whole-state co-op variant proves the eventual persistent economy. Keep the old fit as a labelled baseline and add current observations; do not silently replace evidence.

### Rail economy: keep the accounting, update the timing of relief

**[V/H]** [Rail-economy-model.md](rail-economy-model.md) gets the capacity cliffs, distance cost, phantom-content warning, finite stock and distinction between reward abundance and functional novelty right. Its explicit “fit, not validation” qualification is particularly useful. Its recommendation to test changes independently is still correct.

Its **24/24/12 opening, early capacity 16 and immediate frontier relief are earlier hypotheses**, not the answer to round 4. If adopted together now, they would erase the very pressure the owner and Grant want to experience. The `work >40s` and `repeat >2 loads` warnings must remain diagnostics; they cannot function as prohibitions on a good slog. Conversely, the new preference is not permission to make every frame longer. The problem is whether an understood, satisfying burden makes the promised improvement desirable, and whether the improvement actually pays off.

### Next-load motivation: good diagnosis, superseded priority

**[V/H]** [Next-load-motivation.md](next-load-motivation.md) correctly separates anticipation, route changes, capacity, freight and feedback. A larger bag that removes no journey is weak, and a visible forge cannot make an unchanged collection errand interesting indefinitely. Its falsifiable comparisons are preferable to bundling five rewards into one trial.

“Frontier supply first” and “cut station three to one load” are **not the current implementation order**. Round 4 explicitly puts the tool and carry rungs before nearby supply and keeps trains for later. Preserve those earlier trials as diagnostic alternatives if the longer loop fails. Its caution against forcing exploration must also be read narrowly: optional distractions stay optional, but ability-led exploration and a few main-line ability gates are now a core pillar. Do not model every exploratory minute as disposable filler or make all main-line travel accessible without the approved abilities.

## What the reference games actually do

### Cookie Clicker: escalating prices need discontinuous relief

**[V]** The published [web client, `Game.priceIncrease` and building `getPrice`](https://orteil.dashnet.org/cookieclicker/main.js) uses a base growth factor of **1.15**, applies it to paid building count, then applies price modifiers and rounds up. An unmodified generator's output grows with the number owned; upgrades change that relationship. The same file's offline calculation is a two-rate curve: the basic Twin Gates upgrade grants 5% of normal production for the first hour, then 0.5%; further upgrades modify the rate and duration. This is a **soft slowdown, not a hard stop after one hour**. These are the fetched web build's rules, not a claim about every platform.

**[H] Transfer:** borrow a tangible change in production and a preview of the next milestone. Do not import the long tail, prestige destruction, or upgrades that sell back permission to leave. Boogle's completed railway remains valuable. Exponential cost growth on every physical frame would become exponential walking unless capability outgrew it.

### AdVenture Capitalist and Pecorella: cost, affordability and value are different

**[V]** Anthony Pecorella, producer of AdVenture Capitalist mobile, derives exponential prices, linear production and threshold multipliers in [The Math of Idle Games, Part I](https://www.kongregate.com/en/pages/the-math-of-idle-games-part-i). His example gives lemonade stands 1.07 price growth and output doublings at ownership milestones. He warns that a mathematically efficient purchase can have an imperceptible effect, and that a simple best-ratio policy is not how every person buys. His [GDC Europe 2016 slides, pp. 7–9, 16 and 26–27](https://media.gdcvault.com/gdceurope2016/presentations/Pecorella_Anthony_Quest%20for%20Progress.pdf) distinguish incremental, idle and clicker play and describe multipliers as local victories. They do not establish an optimal number of minutes between upgrades.

**[H] Transfer:** Boogle needs a perceptible gain, not merely a positive return on investment. The next kit fitting in one load is more legible than a small handling-speed percentage. A finite project can grant the improvement directly; an abstract upgrade shop and a spendable shared wallet are unnecessary.

### Melvor Idle: choose a productive activity, then trust it

**[V]** The official [web client's `game.js`](https://melvoridle.com/assets/js/built/game.js) defines `MAX_OFFLINE_TIME = 86400000` and processes missed ticks through `runTicks`: **24 hours**, with settings/eligibility exceptions for some actions. [`CraftingSkill.action()`](https://melvoridle.com/assets/js/built/skill.js) checks ingredient ownership, consumes or preserves resources, and stops when it cannot continue. Offline processing therefore does not conjure ingredients. A saved active activity supplies the player's intention; the engine carries it out.

**[V]** Its normal [`ExperienceCalculator`](https://melvoridle.com/assets/js/built/utils.js) uses the RuneScape-style cumulative curve:

```text
XP(L) = floor( sum[k=1..L-1](floor(k + 300 * 2^(k/7))) / 4 )
```

The exponential term approximately doubles every seven levels; this is not a linear “another level costs the same” climb. The inspected [`modifyInterval`](https://melvoridle.com/assets/js/built/skill.js) combines percentage/flat modifiers, tick rounding and a 250 ms floor. Reducing an action interval and increasing its reward are distinct ways to improve output.

**[H] Transfer:** show the finite order, expected result and stopping condition before leaving. Use a full-rate, bounded job rather than a daily allowance of fungible offline hours. Importing Melvor's large XP ladder or repeated overnight skill training would occupy Boogle's entire campaign. A 24-hour idle cap is not a suitable eight-hour-adventure cap. The original game is the reference here; search results about Melvor Idle 2 were not treated as evidence about Melvor Idle.

### Universal Paperclips: change what the numbers mean

**[V]** Frank Lantz describes a **4–6-hour experience** on his [own games page](https://www.franklantz.net/work). That is a creator's scope description, not a measured completion distribution. Published [`main.js`](https://www.decisionproblem.com/paperclips/main.js) reprices AutoClippers as `1.1^owned + 5` and MegaClippers as `1000 * 1.07^owned`. [`projects.js`](https://www.decisionproblem.com/paperclips/projects.js) gates one-time upgrades by conditions and costs: early AutoClipper projects add to their production boost; later projects change the phase from human commerce to terrestrial production and then space exploration. The space transition requires both an exhausted resource condition and a funded project. It is not merely another identical generator with a larger price.

**[H] Transfer:** each era should change the crew's problem—first path, supplied frontier, sea reach, connected branches, faster revisits, final port—not just multiply bills. Keep the world's achievements; Paperclips' dismantling of earlier facilities serves its own fiction, whereas Boogle's old lines remain useful. Its short overall arc supports studying a finite incremental, but does not establish Boogle's exact cadence or an offline rule.

### A Dark Room: finite linear ladders can unfold into another kind of play

**[V]** Doublespeak's [press kit](https://press.doublespeakgames.com/adr/index.html) explicitly describes expanding mechanics and changing strategies. Its [building definitions](https://github.com/doublespeakgames/adarkroom/blob/main/script/room.js) offer a concrete counterexample to endless exponential pricing: traps cost `10 + 10*n` wood and cap at ten, huts cost `100 + 50*n` and cap at twenty, and the wood cart is a one-off 30-wood purchase. Caps and new capabilities can end a ladder without pricing the next purchase out of reach.

**[H] Transfer:** use short, authored upgrade sequences and a visible “this service is finished” state. A railway camp can reach its final useful service level. Finishing it should open another kind of activity, not demand an endless maintenance loop.

### Factorio and Rusty's Retirement: relief needs context and permission to stop

**[V]** In [Friday Facts #327](https://www.factorio.com/blog/post/fff-327), Wube describes a tutorial that tried to reach assemblers too early and broke the manual mining → automated mining → logistics → production sequence. The lesson is ordered understanding, not a universal five-minute automation deadline. **[H]** Boogle's better-tool-first order has a sound precedent: experience enough of a useful task to recognise what changed, then use the time saved on a new intention.

**[V]** Mister Morris Games' [Rusty's Retirement description](https://store.steampowered.com/app/2666510/Rustys_Retirement/) makes the attention contract explicit: the farm runs beside other work, helper robots automate tasks, and Focus Mode slows crop production. **[H]** A fast stream of new decisions is not inherently better. Boogle should be engaging during a play session and comfortably finished with its current order between sessions. Its absence behaviour should not require repeated check-ins to maintain optimum output.

## Maths to add to the model

These are **[H] design-analysis equations**, with **[C] worked arithmetic**. They belong first in [`dev/economy/model.ts`](../../dev/economy/model.ts), not directly in lockstep code. Seconds, metres, integer pieces and clearly identified kits remain the base units. Exponentials/logarithms are fine in this offline tool; gameplay lockstep must use precomputed integer tables or permitted arithmetic under [DESIGN.md](../../DESIGN.md#determinism-from-day-one).

### 1. Price the next useful result in time and trips

For a conventional generator, following [Pecorella's derivation](https://www.kongregate.com/en/pages/the-math-of-idle-games-part-i), ignoring rounding and discounts:

```text
nextCost(n)       = b * r^n
bulkCost(n, k)    = b * r^n * (r^k - 1) / (r - 1)      [r != 1]
production(n)    = p * n * M(n)
affordSeconds    = max(0, nextCost - stock) / production
```

`affordSeconds` freezes current production; buying intermediate upgrades changes the forecast. A zero production rate with positive missing stock means unreachable, not zero seconds. For Boogle's mixed recipes, costs are a **vector of goods**, not all convertible to money. If independent goods are produced simultaneously, the production lower bound is `max_g(missing[g]/rate[g])`; a single shared machine instead needs its actual schedule, often a sum. Never take a maximum across resources that compete for the same worker or machine.

**[C] Why not a global exponential bill:** a 24-piece first frame at `r=1.15` asks for about **3,196 pieces on frame 36**, before rounding—133 times as much. Even `r=1.05` reaches about 132 pieces. This follows from `24*r^35`; the existing campaign has 36 frames. That is the wrong default for a finite physical construction game.

**[H] Start with a finite table:** within one rung, try `Q_j = Q0 + j*delta`, for `j = 0,1,2`, with `delta` initially 0–4 pieces and a named geography/result for each job. At an upgrade, freeze the benchmark bill to prove relief; only subsequent new places may introduce greater scope. Alternatively, use a shallow 1.05–1.08 geometric segment for at most three or four comparable jobs, then author the next rung explicitly. These are comparison ranges, not prescribed live values.

An inverse solver is better than fitting time by eye: enumerate integer recipe quantities, run the work/supply schedule, and choose a recipe near the desired **active job duration**. Keep the recipe's material meaning, capacity thresholds and reachable sources. Do not calculate `Q = targetSeconds * rate` and ignore trips or freight latency. Do not adjust bills dynamically to cancel a fast player or a joining friend.

### 2. Make tool and carry upgrades change actual work

The existing solo benchmark is:

```text
loads       = ceil(Q / C)
workSeconds = Q*h + loads*(pickupSeconds + 2*d/v) + Q*unloadSeconds
```

Here `h` is actual harvest time per piece, not necessarily the minimum swing cooldown. For a better harvesting estimate:

```text
strokes     = ceil(Q / yieldPerStroke)                    [if output arrives each stroke]
harvestTime = strokes*observedStrokeInterval + approachAndRetargetTime
trees       = ceil(Q / yieldPerTree)                     [if output arrives on felling]
harvestTime = trees*(hitsPerTree*observedHitInterval + betweenTreeTime)
```

Use the applicable source mechanic, not both formulas. Track surplus rather than consuming a fractional tree. Decompose contact, moving between targets and collection; measure the first/last swing boundary rather than asserting cooldown equals wall time. [`chop.ts`](../../src/proto/place/chop.ts) currently yields per stroke, so a future fell-only tool must explicitly change that assumption while conserving each tree's total yield.

**[C] The axe problem:** the current model amortises `0.24/4 = 0.06` seconds per log. At `Q=24, C=12, d=30, v=5.6, pickup=1.2, unload=0.09`, total work is **27.43 s**. Halving harvesting saves **0.72 s**, only **2.6%**. Faster swing animation alone cannot establish a satisfying first efficiency rung in this model. Model wider reach, fewer retargets or more useful output per action if that is what the tool actually changes; do not manufacture a long hold delay just to sell its removal.

**[C] Carry thresholds**, same model at a hypothetical 84 m one-way route:

| Kit                       |        Carry | Minimum loads |  Work seconds | Meaning                             |
| ------------------------- | -----------: | ------------: | ------------: | ----------------------------------- |
| 24 logs, `h=.06`          | 12 / 15 / 16 |     2 / 2 / 2 |  66 / 66 / 66 | A larger number can save no trip    |
| 24 logs, `h=.06`          |           24 |             1 |         34.80 | A real saved return                 |
| 16 supplied pieces, `h=0` |      12 / 15 |         2 / 2 | 63.84 / 63.84 | Still below the useful threshold    |
| 16 supplied pieces, `h=0` |           16 |             1 |         32.64 | Capacity 16 is useful for this bill |

These are benchmarks, not a recommendation to choose carry 24 everywhere. Mixed pickups, uneven loads and multiple source routes require the full schedule. For a rucksack upgrade, promise the specific job it now fits.

### 3. Measure relief and payback on the same job

```text
relief            = 1 - workAfter / workBefore
savedPerJob       = workBefore - workAfter
paybackJobs       = upgradeEffortSeconds / savedPerJob
netTimeBenefit    = sum(savedSecondsOnRemainingRelevantJobs) - upgradeEffortSeconds
```

Nonpositive savings have no efficiency payback; route-opening rewards can still be worthwhile, but should be labelled as access. A mandatory connection granting an axe does not need an added axe fee. Attribute only **additional** work needed to obtain an optional improvement, not every earlier action in the adventure.

**[H] Starting acceptance band:** aim for a noticeable **20–40% reduction in the affected repeatable job**, or an unmistakable categorical change such as removing a full return. A major depot/train may do much more. Let an optional efficiency investment repay within **two to four relevant jobs**, and before the remaining campaign ends. An extra 90 s of optional work that saves 30 s per job repays in three; with only two relevant jobs left, it is a poor efficiency offer. Cosmetic or scenic choices need not pass this ROI test.

Small per-step increases must not erase the gain before it is felt. For comparable cost/time growth `r`, throughput gain `m`, and `k` subsequent jobs, the continuous approximation is `newTime/oldTime = r^k/m`. A 1.5× gain followed by four 8% rises leaves a ratio of **0.907**: almost all relief is gone. Use this as a warning, then rerun the discrete trip model. Make the first post-upgrade job clearly easier and keep at least two opportunities to enjoy it.

Keep reward units honest: `outputRate = usefulOutputPerAction / actionSeconds`. A 20% interval reduction gives `1/0.8 = 1.25` times the rate, not 1.20. Stacking independent multipliers gives their product, so twelve 1.5× upgrades would give about 130× output. Boogle does not need that on one stat: distribute gains across tools, trip thresholds, source location, manufactured span and travel, then evaluate the resulting bottleneck. Use `metresBuilt / carryingTrips` and `kitsReady / minute` as separate measures; a manufactured kit is not one raw log with a new label. Repeated cosmetic payouts can grow in abundance without multiplying these rates.

### 4. Model the bottleneck, not a decorative production multiplier

For steady-state **kits of one declared recipe**, with input quantity `a_g` per kit:

```text
productionKitsPerS = min_g(outputRate[g] / a_g)
freightUnitsPerS   = vehicleCapacity / (2*routeMetres/trainSpeed + dwellSeconds)
usableKitsPerS     = min(productionKitsPerS, freightUnitsPerS/kitPieces, handoffKitsPerS)
```

This assumes dedicated simultaneous production and repeatable round trips. It is a throughput bound, not first-delivery timing. Batches, recipes and terminal dwell still matter. An upgrade to a stage that is not limiting output can have zero immediate benefit. Test the before/after **usable** rate, first-ready time and player's empty time.

For a single producer followed by one shuttle, an event recurrence handles streaming without granting free overlap:

```text
producedAt[j] = producedAt[j-1] + batchUnits[j]/productionRate
loadAt[j]     = max(producedAt[j], trainBackAt[j])
departAt[j]   = max(loadAt[j] + load, routeOpenAt[j])
arriveAt[j]   = departAt[j] + outwardTravel + unload
trainBackAt[j+1] = arriveAt[j] + returnTravel
```

Initialise production and train availability from their actual starting state; loading cannot finish before its goods exist. Here `dwellSeconds` in the throughput bound is `load + unload`. Add quantity availability at every player pickup; mixed ingredients need a ready time for each good. Human harvesting can overlap factory work only when it uses a different worker; a solo player cannot simultaneously chop and carry. The current whole-kit-first calculation remains a useful conservative comparison, not the only forecast.

**[H] Keep supplied kits ahead of need without infinite accumulation.** Compare total saved commute against any new wait: `netRelief = oldFetchTime - (newCarryTime + uncoveredSupplyWait)`. Flag negative values. A kit preproduced during real exploration is legitimate; several imaginary minutes of `content` inserted to hide a queue are not. The existing chapter's 14.58-second Q3 queue remains visible in the report.

### 5. Put exploration on the dependency graph

Define each project as prerequisites → available goods and routes → player work → visible construction → unlocked capability/place. A shortcut changes `d`; a hook target changes which routes exist; a new camp changes an input rate; the train changes an already useful route's travel time. These changes belong in model state, not just `newThing` strings.

For a task graph, compute `earliestStart(task) = max(finish(prerequisites), workerAvailable, stockReady)`. This is a lower-bound schedule until route conflicts, shared resources and chosen detours are represented. Count time once even when a task serves several pillars. Report separate counts/gaps for **efficiency improvements**, **new usable routes/abilities**, and **world consequences**; cosmetics do not reset the efficiency clock.

**[C] Train comparison:** 1.2 km at 5.6 m/s is 214.3 s on foot; at 20 m/s plus a hypothetical 10 s boarding/wait allowance it is 70 s. The saved journey is 144.3 s, before acceleration and actual timetable phase. A larger nominal top speed is worthless if missed departures dominate. A sea crossing without a walkable alternative is an access unlock, not a valid before/after walking benchmark. Use a known land route to demonstrate speed and the crossing to demonstrate reach.

## Pacing the eight-hour climb

### Cadence should be nested, visible and earned

**[H] Author around these initial bands, then replace them with observations.** They combine the finite, unfolding examples above with the owner's actual goals; no source establishes these numbers as optimum.

| Scale                | Starting band                                                      | What must change                                              | What does not count                       |
| -------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------- |
| Action               | Immediate contact; a readable contribution each load               | The world visibly receives the work                           | A number rising without a physical result |
| Short job            | 45–120 s of purposeful work in a round-4 comparison                | One frame, source task or route step                          | A mandatory idle timer to hit the band    |
| Opening rung         | First useful improvement by 5–10 active min; compare earlier/later | A familiar burden becomes easier                              | A free stat with no before-state          |
| Later rung           | Roughly 12–20 active min                                           | Tool, carrying, local supply, service or traversal efficiency | A new cosmetic counted as power           |
| Project              | Roughly 30–45 min, often several different tasks                   | A usable connection or substantial place change               | Repeating the same invoice to fill time   |
| Major transformation | Roughly 60–100 min after a shorter opening                         | New reach, production relationship or traversal possibility   | Renaming the same resource                |

The short-job band intentionally exceeds the older model's 40-second warning. Try a **45/75/120-second** work comparison derived from real routes and strokes, not slower animations or imposed waits. A player can enjoy a two-minute job and dislike a thirty-second errand. The outcome is whether they wanted and recognised relief, not whether the duration matched the band. End the comparison early if the verb itself stops being fun.

The later cadence implies roughly **24–40 useful gains across eight hours**, including changes earned through routes and services, not 24–40 new mechanics or multiplicative tool tiers. Twelve link-end rewards alone average forty minutes apart. First place smaller gains on the existing frame/path/ability milestones and show their practical use; if they cannot support that cadence, revise the content or the hypothesis. Do not add empty construction jobs to meet a reward count. The two-to-four-job payback target applies to optional investments, not an extra fee on every automatic rung.

**[H] “Hungry” has observable signs:** the player sees the forthcoming better method, can name the burden it removes, still chooses to do useful work, and uses the upgrade enthusiastically. “Chore” signs: continuing only for a promised reward, idle waiting as the best action, abandoning exploration to service output, or doing an identical empty return without a new intention. Show an attainable better way before the burden peaks. Do not hide the solution to create frustration, and do not retune live costs in response to player speed.

### A provisional six-era authoring envelope

The [six-era proposal](../proposals/six-eras.md) supplies 45/60/90/100/95/90 minutes. Keep it as a **scope envelope**, not a timer. Its older opening must yield to path-before-train. Twelve links and thirty-six frames remain a planning hypothesis; more stations are not the automatic solution to missing hours.

| Era; cumulative active minutes | Proposed incremental payoff to earn                                  | Exploration/building that gives it a purpose                                                     |
| ------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Wood; 45                       | First tool, trip-saving carry, nearby supply in that order           | Open and walk the first path; test the first ability gate; the train need not arrive in this row |
| Steam; 105                     | First substantial freight/travel service once distance warrants it   | Use the network on a known route, then establish sea reach and the first remote camp             |
| Iron/harbour; 195              | Two connected sources jointly supply a useful kit                    | Explore a branch and its ability route; let older lines remain productive                        |
| Diesel/concrete; 295           | Prefabrication increases useful span per load                        | Build through a town/landform with a different traversal problem                                 |
| Electric; 390                  | Faster dependable revisits and a useful service improvement          | Use upgraded movement and rail to reinterpret known routes and reach the next connection         |
| Future; 480                    | The network supports the final construction without a huge last bill | Reach the port, complete the intended final connection and enjoy the result                      |

**[H] Reject placeholders:** replace every long `content` beat with a named route, discovery, choice, assembly or optional detour and its prerequisites. Mark uncertain durations as ranges. Unbuilt entries remain explicitly unbuilt. If playable content yields five hours, report five; neither costs nor waiting should manufacture the missing three. The final connection should use the accumulated capability, with no late exponential toll or required prestige cycle.

### One- and two-hour sittings

**[H]** Measure campaign time as the integral of time with at least one player actively playing in that world, excluding empty-room time. Separately report each player's attendance and active labour. A pair playing for one hour does not spend two campaign hours; eight hours spread over several evenings is not eight wall-clock hours including sleep.

For a one-hour visit, a starting pattern is 0–5 min to orient and use the last improvement, 5–20 to find/work toward the next, 20–40 to earn and exercise it on a different task, and 40–60 to finish a useful connection or leave its finite continuation running. For a two-hour visit, repeat the rise-and-relief pattern with a larger connection around the middle and a new intention afterwards. These are authoring prompts; there is no session-end alarm, forced homecoming or production job invented at minute 55.

In the future model, simulate cuts at **60, 90 and 120 active minutes**, not only at convenient era boundaries. Report `timeToNextUsefulResult`, the current project's remaining work, whether a safe stopping state exists, and the first useful action on return. Also run a continuous eight-hour path. Offline credit must change the resulting timeline honestly; do not pad the next sitting to restore an eight-hour total.

## Offline progress: finish an intention, bank no obligation

### Use a project cap, not a daily time allowance

**[H] Proposed rule:** one current committed project **per room**, with a frozen output envelope and required inputs reserved. While no one plays, the authorised automated portion continues at its normal rate until its envelope is complete, then rests indefinitely. No successive project selection, no overflow currency, no expiration, no catch-up multiplier for the next login and no requirement to return every few hours. If a player must still carry the kit into a frame, the result is **kit ready**, not **track magically built**. A fully funded construction already started by players may finish its own assembly.

For a constant-rate production stage, integer inputs and elapsed milliseconds:

```text
timeLimitedActions  = floor((carriedRemainderMs + elapsedMs) / actionIntervalMs)
inputLimitedActions = min_g(floor(reservedInput[g] / inputPerAction[g]))
remainingActions    = ceil((outputTarget - outputDone) / outputPerAction)
actions             = min(timeLimitedActions, inputLimitedActions, remainingActions)
```

Reserve a recipe whose batch size divides the target, or specify a partial final batch and its input costs. Preserve sub-action time while the same job is in progress; after completion discard unused absence time, not the output. A second project cannot inherit it. Count elapsed production time only while that stage can work: missing-input time must not accumulate into instant production when someone eventually supplies it. Keep the remainder below one action interval. Multiple production/freight/assembly stages use their own dependency times and remaining input/output caps; `min(rate*time, target)` alone cannot deliver goods across unbuilt track.

**[H/C] Example:** a declared 120-unit order at 0.2 units/s, sufficient reserved inputs and no travel stage, completes in ten minutes. Five minutes away produces 60; twenty minutes, eight hours and seven days away each produce 120. Return one minute after leaving and it has 108 units left; it does not require another overnight absence. Once complete, there is nothing to lose by staying away. This is a mathematical example, **not a proposal for a ten-minute blocking order or a 120-piece manual frame**. Early jobs may finish in seconds; later jobs may run during exploration. Never lengthen them merely to make absence productive.

The same job should make identical progress over the same elapsed interval whether the room is populated, empty but still ticking, or unloaded then restored. A 60-second idle-gap threshold is an implementation detail to evaluate, not a reason to grant an extra minute or penalise brief disconnects. Already accrued work and outputs survive any return.

### Existing Boogle behaviour is a starting seam, not proof of this contract

**[V]** [`server/src/host/rooms.ts`](../../server/src/host/rooms.ts) ticks empty loaded rooms but eventually saves and unloads them. [`world-host.ts`](../../server/src/host/world-host.ts) computes an offline gap on a successful snapshot load and submits `bank.wake`. [`src/sim/bank.ts`](../../src/sim/bank.ts) calculates bounded helper freight; [`rules/bank.ts`](../../src/world/rules/bank.ts) credits the older site's Track ring and leaves its machine waiting for a player. It is not a generic round-4 project queue, and the Local/experimental-co-op place economy does not automatically inherit it. Preserve its load-error guard and duplicate-credit protection when a future implementation extends or replaces this seam.

**[H] Authority recommendation:** persist project identity, recipe/version, reserved inputs, completed units, stage and credited progress under the server's authority; settle elapsed time once, before returning a current snapshot. Clients show the result. Do not let each returning player mint their own offline grant or put wall-clock reads inside deterministic `apply`. Avoid running every missed physics/render frame. No new backend is needed merely to calculate one bounded job; any implementation still needs the repository's sync review and versioning rules.

This matches established engine responsibilities rather than a browser-specific shortcut: [Unity Cloud Code](https://docs.unity.com/en-us/cloud-code/3.0.0/server-authority) places important progress and validation on the server; [Unreal SaveGame](https://dev.epicgames.com/documentation/en-us/unreal-engine/saving-and-loading-your-game-in-unreal-engine) persists game-defined fields but does not define an idle economy for the designer; [Godot Time](https://docs.godotengine.org/en/stable/classes/class_time.html) distinguishes adjustable system clocks from monotonic elapsed clocks. **Boogle differs** by already having a server-hosted deterministic world and a bounded bank operation: extend that contract carefully, rather than copying Melvor's single-player client-clock calculation. Persistent server timestamps bridge process restarts; within a running process, monotonic elapsed time avoids clock adjustments. Cap settlement by remaining authorised work even after a large forward clock jump.

### Friends who return are not another source of production

**[H]** A world capability is immediately usable by a joining friend; personal earned cosmetics remain personal. Show what finished and who contributed without ranking. The changed path, ready kit or town structure remains inspectable without a “claim” click that blocks production. Do not require absent players to repeat a tool XP ladder to join the crew. Someone playing alone may advance the shared world—drop-in play permits that—but empty-room progression stops at the single envelope. Never pretend a person personally experienced a reveal just because the world unlocked it while they were absent.

## Cooperation without scaling the bill

**[H]** Keep material costs independent of connected headcount. Extend the design model to **1, 2, 4 and 8 active participants**, plus spectators and departures. Today's 1–4 support is an analysis limit, not the server's eight-player cap. Report elapsed critical path, total player labour and spare capacity separately. More people need not make every station equally busy.

The current greedy carrier split is appropriate for interchangeable fetch trips. It misses the approved “one chopping while the other rides cargo” relationship. For a simple two-stage pipeline with `k` batches, one producer taking `a` seconds per batch and one carrier taking `b`:

```text
solo serial time = k*(a+b)
two-role time    = a+b+(k-1)*max(a,b)
```

This assumes separate workers, available buffers, no shared-source contention and the same route for each batch. At `k=4, a=20, b=30`, solo takes 200 s and the pair 140 s, a 30% elapsed reduction. It does not become 100 s simply because two players joined. Let either player switch roles, and let one finish alone. As larger capacity reduces `k`, the model may also reduce the value of a dedicated carrier; assess the whole loop before calling this a co-op upgrade. Optional two-person rewards remain optional.

## Numbered recommendations and smallest useful comparisons

All recommendations are **[H]**. They are ordered so builders first repair what the model can answer, then tune play. Each names the code/plan it touches. They do not authorise implementing unrelated systems or overriding the approved round-4 sequence.

1. **Rebase the forecast on round 4 and a real activity trace.** Keep `prototype` as the historical fit; add a separate ladder table in [`model.ts`](../../dev/economy/model.ts) with observed harvest/retarget time, path-before-train state and explicit upgrades from [round-4.md](../plans/round-4.md). **Smallest comparison:** record one ordinary source → frame → shortcut job and predict the next out of sample. Report the largest timing error. New: “The path opens before the train.” Gut: **“Did walking what you built feel like progress?”**

2. **Use short cost ramps with fixed post-upgrade benchmarks.** Use finite integer recipe tables instead of introducing a campaign-wide exponential; try `Q_j = Q0 + j*delta` and the inverse duration solver above in [`model.ts`'s recipes and era rows](../../dev/economy/model.ts). **Smallest comparison:** one 45/75/120-second purposeful work segment, same promised improvement, no slower animation or forced timer. New: “There is enough work to want the better way.” Gut: **“When did you start wanting that upgrade?”**

3. **Make each tool or carry rung remove a real burden.** Model strokes, retargets, mixed loads and `ceil(Q/C)` against [`chop.ts`](../../src/proto/place/chop.ts), [`layout.ts`](../../src/proto/place/layout.ts) and [round-4 steps 1–3](../plans/round-4.md#the-run). **Smallest comparison:** identical job immediately before/after one upgrade; preserve the bill. Aim initially for 20–40% relief or a categorical saved journey, never a percentage alone. New: “This tool or bundle changes the next job.” Gut: **“Did the better version feel better enough?”**

4. **Price optional efficiency by useful payback before the finale.** Add `upgradeEffortSeconds`, `savedPerJob`, `paybackJobs` and remaining relevant uses to [`model.ts`](../../dev/economy/model.ts); apply to the proposed [roundhouse choices](roundhouse-management.md). Target two to four useful jobs for an optional improvement; reject negative remaining time benefit unless it offers valued access or expression. **Smallest comparison:** one visible speed/capacity choice against the next two routes. New: “You can see what this improvement will save.” Gut: **“Was that worth building now?”**

5. **Schedule actual goods and bottlenecks before tuning production multipliers.** Extend `Station.supply` beyond its pooled rate and whole-kit-first assumption using the production/freight recurrence; connect the future service seam in [rail-slice.md](../plans/rail-slice.md) after its round-4 redraft. Keep the current conservative calculation alongside it. **Smallest comparison:** one mixed kit, slowest ingredient delayed, same final carry. New: “The network brings the next kit in time.” Gut: **“Did freight free you to keep playing?”**

6. **Separate efficiency rungs, discoveries and world payoffs in the cadence report.** Extend `Beat.newThing`/`novelty()` in [`model.ts`](../../dev/economy/model.ts) with explicit event kinds and first useful application; follow [movement-abilities.md](movement-abilities.md) for the approved ability sequence. Begin with 5–10-minute opening relief and 12–20-minute later gains, then revise from play. **Smallest comparison:** one 20-minute loop with an efficiency improvement and a reachable ability discovery. New: “Your new capability opens somewhere you noticed.” Gut: **“Did you want to try what had just changed?”**

7. **Earn eight hours with named projects and flexible session cuts.** Replace `eraRows`' 397-minute anonymous content allowance with task dependencies and ranges, using [six-eras.md](../proposals/six-eras.md) only as the envelope. Simulate continuous play and 60/90/120-minute cuts, with no duration enforcement. **Smallest comparison:** a playable first hour plus a separately seeded late-era 20-minute segment; neither proves a whole campaign. New: “Each visit leaves a useful piece finished.” Gut: **“Was that a satisfying place to stop?”**

8. **Cap unattended work at one committed room project, at full normal rate.** Model a frozen input/output envelope and finite stage completion against [`bank.ts`](../../src/sim/bank.ts), [`rules/bank.ts`](../../src/world/rules/bank.ts) and the [decision log's away rule](../proposals/boogle-2.md). No next-project rollover or daily cap to refill. **Smallest comparison:** the same job after 1 minute, 20 minutes, 8 hours and 7 days, including insufficient inputs. New: “The job you started finishes while you're away.” Gut: **“Did coming back feel welcoming, without needing to check sooner?”**

9. **Make loaded, unloaded and reconnecting rooms settle the same job once.** A future implementation uses the existing [`world-host.ts`](../../server/src/host/world-host.ts)/[`rooms.ts`](../../server/src/host/rooms.ts) authority boundary, versioned project state and conserved inputs. Preserve load-error and credited-time guards. **Smallest verification:** compare empty-but-ticking versus unload/reload, two simultaneous returns, a second reload and a completed job; identical elapsed time must yield identical bounded output. New: “The finished job is there when friends arrive.” Gut: **“Was it clear what had happened?”**

10. **Model cooperative roles and attendance without taxing the group.** Extend [`model(table, players)`](../../dev/economy/model.ts) to eight and schedule optional producer/carrier roles from [round-4 step 7](../plans/round-4.md#the-run), using the pipeline equation as a checked lower bound. **Smallest comparison:** same finite bill solo, with a partner, then with a mid-job departure; spectators do not add labour. New: “Splitting up helps, and either of you can finish.” Gut: **“Did working together feel naturally useful?”**

11. **Make progression guaranteed and visible, while gifts and money stay light.** Use a connection's fixed service/ability unlock for power, personal cosmetics for optional delight and comic money as decided in [boogle-2.md](../proposals/boogle-2.md); keep them separate from `finds` in [`model.ts`](../../dev/economy/model.ts). Joining friends inherit world capabilities without an XP catch-up toll. **Smallest comparison:** show one future service before its job and let it be used immediately after. New: “You know what this work makes possible.” Gut: **“Was that the thing you wanted to earn?”**

12. **Tune from sensitivity and desire, not a shortest-time bot alone.** Extend the existing `sensitivity` report with upgrade order, actual trip thresholds, ingredient scarcity, missed departures, session cuts and optional detours. Compare a focused builder, an explorer and a mixed pair; include slow/fast action measurements. **Smallest comparison:** repeat one earned rung under two schedules, then inspect the existing playtest trace and real motion via [look](../../.claude/skills/look/SKILL.md). New: “The same improvement stays useful when you play your way.” Gut: **“Did you want the next rung, or just want the current job over?”**

## Reproduction, source limits and handoff

**[V/C] Rerun in this checkout:** `node dev/economy/model.ts sensitivity --json`, plus direct calls to exported `model`, `prototype`, `chapter` and `eras` for activity totals, load counts, novelty gaps and content-free durations. The 437-second fit reproduced. Independent Node arithmetic checked the exponential frame example, carry table, harvesting saving, four-step relief erosion, train comparison, pipeline and finite-order examples. These are calculations, not new human or multiplayer measurements.

Document verification: Prettier ran on both changed Markdown files with `--ignore-path /dev/null` because the repository normally ignores research Markdown; local file links were checked for missing targets. No dependencies were installed and no gameplay, renderer or networking code changed, so no gameplay test or browser run was needed for this report.

The browser fetcher could not read several published JavaScript files, and the Melvor wiki returned 403. The official game files were instead fetched directly over HTTPS and inspected as text; no game code was executed. All factual reference-game mechanisms above cite the fetched primary files/pages. No recommendation depends on a community wiki excerpt or a claimed typical time-to-upgrade. The GDC evidence is a design account, not retention data. No source establishes the proposed 5–10/12–20-minute bands or eight-hour completion as optimum.

For future source drift checks, SHA-256 of the fetched primary code (2 November 2026):

| Source                   | SHA-256                                                            |
| ------------------------ | ------------------------------------------------------------------ |
| Cookie Clicker `main.js` | `db7cad34b86965a2ae82f05e06d8695eda53497c6c0defb55ab31ac1684499c9` |
| Paperclips `main.js`     | `ee599076de868869e533490505189ddcb72dcc8748909ceeebe11e789f1b3a0a` |
| Paperclips `projects.js` | `05034c51809bc0632e8963e671c8e68c68604ca3643da291e0c6fabc86152774` |
| Melvor `game.js`         | `b2a3e7cb1f6f3b58fe4c884e3fd16173feec11ce14acb0257e6308bd602b3cd2` |
| Melvor `utils.js`        | `9ea66086de6a5a5228843252050917381991e35120cc8c91bd20e0650e6a7050` |
| Melvor `skill.js`        | `105a282d8c656c4d42f85ee2662a6a75fd8634abbd0514cc7b591cc01144f606` |
| A Dark Room `room.js`    | `1ab0ba74c5463f451bad9e6d8e5c6e871b3e0301878f0283f779b4d1bc6c5e81` |

Only this report and its research-index entry change. Existing game/model code and the shared `node_modules` link remain untouched. Future builders should cite the relevant numbered recommendation, implement the smallest comparison, and record whether relief was both measurable and wanted. Gameplay changes still require the existing visual/feel verification; shared conservation and offline settlement require the repository's sync tests. This document makes no claim that those implementations or checks have happened.
