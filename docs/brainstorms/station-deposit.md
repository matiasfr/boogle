> **Status: proposed (2026-11-10).** Light brainstorm (one agent, three lenses: play designer, systems architect,
> creative director). Not built.

# Spares at the station (station-deposit)

The owner's seed, 10 November 2026: "I also encountered situations where I was carrying extra resources and had to drop
them in place. I'm wondering if it makes sense to be able to explicitly deposit extra resources into the shared bank
somewhere like stations"

## Pitch

Every halt gets a **yard**: a low timber bay at the cargo end of the platform with a log cradle, a rails shelf and a
stone bin. Walk up with spares on your back and Interact (**Leave it here**): the pieces fly off your back and stack
in the bay, one mesh per piece, where everyone can see them and anyone can take them back out. What lies in a yard
stays in that yard; nothing appears anywhere else. Later the train's cargo car takes a yard's goods to whatever on its
line still owes that material, so your spares ride to the next job. And you are never refused a big load for having a
full back: shouldering the boiler, the great beam or a footing sets your load down in the nearest yard, or beside you.
It serves **6, Communal world** (the stack is the room's, in a place everyone passes) and **11, Show, don't tell** (the
stock is the stack). It deliberately is **not** a bank: deposit-here-withdraw-there would bend **"the rail builds the
world"** (decisions.md, 2 November), where the network, not a menu, moves things.

## Gut question

With a back full of things you don't need, does leaving them at the halt feel like tidying up for the team, rather
than throwing them away?

## Today (what the repo says)

- **What a back holds:** logs and stone share eight slots, sixteen once the pack is open; rails share them too
  (`carried = carry + stone + rails`, `free`, `src/sim/railway-systems.ts:124`–`127`; place.md "Materials and recovery"
  and "A pack frame"). A footing, the great beam or the boiler fills the back alone and needs an **empty** one
  (`heldBig`, `roomFor`, `:123`, `:133`; `beamTake` `carried(a) !== 0`, `:407`; `boilerTake`, `:502`). There is no
  steel anywhere in `src/` yet: it comes with Ring Island build 2 ([ring-island](ring-island.md), "Build 2").
- **Every sink is a bill that takes only what it still needs:** line 1 stations (logs, stone; `rail.deposit`, `:287`),
  the forge frame and line 2's Q frames (logs, rails; never stone; `deposit2`, `:621`), the kiln (16 logs, 16 stone;
  `:784`, `WORKS`, `src/sim/railway-works-layout.ts:5`), the cradle (8 rails, `:868`), the stall and pier (footings,
  `footSet`, `:834`), the great beam's saddles, the boiler's saddles. Station 6 takes nothing by hand until trains run
  (decisions.md, 9 November). Nothing accepts "extra".
- **Racks you can take from but never put into:** the recovery rack (`rail.rack`, `rail.stoneRack`; `rackTake`,
  `:355`), the forge rack (rails, `forgeTake`, `:667`, which since the late-game pass hands out only what the cradle
  still needs, so a back is not filled with useless rails), the depot rack and rails shelf (`depotTake`,
  `depotRailTake`), the Works and pier footing racks (`footTake`). The cart and trains load themselves.
- **Dropped things:** Drop puts down one piece per press, rails first, then stone, then logs, merging into a pile of up
  to 8 on that spot (`drop`, `:314`; `pileCap`, `:131`; at most 128 piles, `RAILWAY_PILES`, `src/sim/railway.ts:27`).
  Piles persist and anyone can **Pick up** (`rail.take`). After 21 host minutes with nobody within 12 m they recover:
  logs and stone to the recovery rack at world (905, 1), rails to the forge rack, a footing to the Works rack (the
  `rail.supply` pulse, `:1444`–`1475`; `RECOVERY_RACK`, `src/sim/railway-supply.ts:6`). Nothing vanishes. The rack
  stands about 23 m from the Village halt (`RAIL_HALTS`, `src/sim/railway-lines.ts:54`).
- **No shared bank exists in the railway.** `src/sim/bank.ts` is classic rooms' offline helper bank and never wakes in
  a railway room. The shared wallet is decided (owner-calls, "Shared progression and one shared wallet") but unbuilt;
  the [money](money.md) brief is still proposed. The engine-garage brief (branch `worktree-agent-af97bb1c3273e66ff`,
  `docs/brainstorms/engine-garage.md`, section 4) prices upgrades in steel "from the room's store": no such store
  exists, and nothing on main defines one.

**Where spares really come from** (playtests.md and the rules; the loop trace has no drop column):

1. **A big load needs an empty back.** 10 November: Daniel took five "Empty your back first" refusals at the boiler,
   then dropped his logs. Every footing (`works-view.ts:833`, `crossing-view.ts:552`, `footing-view.ts:234`), the beam and
   the boiler (`boiler-view.ts:576`) do this.
2. **The bill filled under you.** Two players carrying 16 each to a 16-log Q frame; the last 24-log rack after the cart
   delivered too; the kiln's 16 and 16 with stone left over from the Works rocks (8 each).
3. **The wrong material for this bill:** stone at line 2's frames, anything at Station 6 before trains.
4. **Nothing needs it any more:** after the kiln, logs and stone have no sink; after the cradle, rails have none.
5. **Changing task or boarding a train:** your load rides with you (place.md "Keeping your load"), which is fine
   until case 1 meets you at the far end.

Also from the playtests: dropped piles were invisible from some camera angles (6 November); 41 drops in one iPad
session, mostly to re-pick rails (8 November); "dropped items might expire on a long timer" (3 November).

## The four shapes, ruled

| Shape | Verdict | Why |
| --- | --- | --- |
| **(a) A yard at every halt** | **Recommended** | Stock is where it lies, so it can't teleport; anyone adds or takes; trains can draw from it later. |
| (b) One bank, deposit points at stations | Rejected | Chop at the grove, deposit at the Camp, withdraw at Far Head: the walk and the network both stop mattering. One count in many places also breaks 11 ("what's on screen is true"). The wallet already covers "one shared pot" for money. |
| (c) No store; a tidy, reliable pile | Partly taken | The recovery rule already makes piles safe; what's missing is that they read. The recovery rack becomes the Village yard (Q5). |
| (d) Fix the situations | Taken alongside (a) | Case 1 is a rule problem with an existing precedent: the one-thing-in-hand call puts what you held "by you" (decisions.md, 2 November, "The hotbar is cut"), and "Keeping your load" puts it "down where you stood". |

## Best suggestions

1. **Never refuse a big load for a full back** (design). Shouldering a footing, the beam or the boiler with a loaded
   back puts the load into a yard in reach, else into a tidy pile at your feet, in the same press. Fixes the most
   common real case outright and costs one rule.
2. **A yard at every open halt, take only where it lies** (design + systems). Logs, stone and rails only; withdraw at
   the same yard; up to 24 of each (the cart's load), shown piece by piece. It doesn't shorten a haul, because
   someone had to carry the goods there first.
3. **The recovery rack becomes the Village yard** (creative + systems). It already holds logs and stone 23 m from the
   Village halt; give it the rails shelf and the **Leave it here** press. Recovered drops then land in the one place
   players already think of as "where spares go".
4. **The yard is the stack** (creative). No number board: one mesh per piece on reused rack, shelf and stone-pile
   batches (`shelf-view.ts`, `line2-view.ts`, the station stone pile). Pieces fly in with the deposit flight and land
   with the stack's wooden knock; a full bay gives the existing full-back cue. Machines show their work (owner-calls).
5. **Trains draw from yards toward a debt, not a hub** (systems; build 2). When a train stops, its cargo car takes a
   yard's goods only if something on its line still owes that material (Station 6's kit, the steel works' bill later),
   and brings them there. Otherwise they stay put. This is the owner's "no routing or quotas" (2 November): connected
   goods flow to need by themselves.
6. **The yard is a loader source** (systems + creative; with engine-garage's loaders). The yard stands off the
   platform's cargo end, beyond the passenger mark, so when trains are longer than platforms the passenger cars still
   align and the cargo cars stop by the yard; its loader is the same short gantry the brief gives every source.
7. **After a yes: a little guy keeps the yard** (creative). He squares up the stack after you leave, and pats the pile
   when a friend takes from it; never delays a take (the recovery-rack brief's "interrupted tidier").

**Tension:** (2) and (5) together make yards a slow, visible, train-moved store, which is close to what the seed calls
a bank. The line held here is that a piece is only ever in one place you can see, and only the railway moves it.

## Shape

- **Sync:** each yard's stock is accepted railway state, server-owned like the racks (a `HaltYard` row per halt:
  logs, stone, rails), saved and replicated; flights and the keeper are Local. Deposit and take play on the press with
  the existing instant-feedback rollback (place.md "Instant feedback").
- **Reuses:** `rail.deposit`'s pattern for put (`station` = a halt id) and `rackTake`'s for take; `credit`,
  `balanceOf`, `roomFor`; the supply pulse's recovery branch (aim it at the nearest open yard); the rack/shelf view
  batches; `RAIL_HALTS` for positions.
- **Conservation:** `railCounts` (`src/sim/railway.ts:115`) and the line-authority witnesses must count yard stock for
  logs, stone and rails, or the totals break.
- **Smallest first build:** suggestion 1 (the swap) plus yards at every open halt and the Village yard from the
  recovery rack, with put and take; no train draw. One new op pair (or two new station ids on existing ops), one new
  saved component, optional `x, y, z` on the big-cargo take ops for the swap pile: a wire and save change, so one
  `WORLD_NS` bump, shipped when ready and not mid-session (owner-calls, "Nothing waits on a world bump").
- **Build 2**, with engine-garage's cargo cars and loaders: trains draw from yards toward a debt.
- **Risks:** yards becoming hoards that make bills trivial late on (the 24 cap and per-halt stock bound it); a
  `railway-systems.ts` hotspot (put the rules in a new `railway-yard.ts` with one wiring hunk); pile and yard
  recovery double-counting (one recovery destination per pile, tested).

## Done means

- **The swap:** `--eval` with a back of 8 logs at the boiler pedestal; press Pick up. The boiler is on the rope in
  one press and 8 logs sit in a pile at the pickup spot (or in the Village yard if in reach); no refusal.
- **Leave it here:** `--eval` at the Quarry halt with 10 logs and 4 rails; one press and `--video` shows the pieces
  fly into the bay; the cradle shows 10 and the shelf 4; a second tab sees the same stack.
- **Take back:** the same setup, Pick up at the yard with an empty back fills it to the back's cap; the rest stays.
- **Recovery reads:** `--eval` with a pile aged past 21 minutes near the forge; after the pulse the pieces are on the
  Village yard's stack in a still from the town path.
- **Nothing duplicates:** reload and empty-room restart with yard stock; `railCounts` totals unchanged
  (a focused test, not a full run).

## Open questions

1. **A yard at each halt, or one bank you can reach from every station?**
   Recommended: **a yard at each halt; what's in it is taken only there, and only trains move it on.**
   Answer: ___
2. **What can go in a yard?**
   Recommended: **the back's materials only (logs, stone, rails); footings, the beam, the boiler and later steel keep
   their own homes (the Works rack, the pedestal, the Roundhouse bay).** Answer: ___
3. **Do trains take from yards?**
   Recommended: **yes, in build 2 with the cargo cars and loaders, and only towards something on their line that still
   needs that material; the first build's yards just hold.** Answer: ___
4. **Shouldering big cargo with a full back?**
   Recommended: **your load goes into a yard in reach, else down at your feet as a tidy pile, in the same press; never
   "Empty your back first".** Answer: ___
5. **Does the recovery rack become the Village yard, with recovered drops going to the nearest open yard?**
   Recommended: **yes; before trains, when there are no halts, drops recover to the Village yard as they do today.**
   Answer: ___

## Draft strings for the owner

- **Leave it here**: Interact at a yard with something on your back that it takes (new).
- **Pick up**: the existing verb, reused at a yard.
- A full yard: no words, the existing full cue.

No Boogler lines are added or changed. If question 4 is taken, the existing system prompt "Empty your back first"
(`src/entities/railway/works-view.ts:833`, `crossing-view.ts:552`, `footing-view.ts:234`, `boiler-view.ts:576`) stops
being reachable; it is not his copy,
but it is listed here for the owner rather than deleted silently.

## Parked

- Yards feeding town growth (the "rail builds the world" heap that grows buildings from what arrives).
- A yard tally on the halt's island-map display, if stacks ever stop reading at a glance.
- The steel store engine-garage assumes: steel waits as a physical stack in the Roundhouse bay, brought by train, and a
  Fit spends that stack; a yard is not that store, and a wallet is the money brief's job.
- Hold Drop to put down your whole back at once.
