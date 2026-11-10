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

## Design review (designer, 2026-11-10)

Read against DESIGN.md, owner-calls, the decision index's rail, rewards and controls routes, the 9 and 10 November
playtest entries, the owner's 10 November session data, `npm run loop`, the halt and supply code, the engine-garage
brief (its branch, then main's answered version), and ten stills of the halts at `--rail-seed wagon-on`. Nothing here is ported from Place: the
brief reuses production views (`shelf-view.ts`, `line2-view.ts`) and the production recovery rack, so the "Port from
Place" check has nothing to rule on.

**Verdict.** The yard is a sound shape and honours the decisions, but it is not the fix for what the owner hit. His
session shows the fix is smaller and can ship first with no yard, wire or save change. Split the brief into build 0
(put the back down in one press; never refused for a big load), build 1 (yards) and build 2 (trains draw from yards).

### What the owner actually hit (session data)

`node dev/playtest/cli.ts mwa8zhlg` (owner, iPad, 10 November, 27 min): **64 Drop presses, in six runs of 7 to 15**,
because Drop puts down one piece a press and a back holds 8 or 16.

| Minute | Presses | Where (world m) | Nearest halt site | Halt open then? | Same minute in the timeline |
| --- | --- | --- | --- | --- | --- |
| 4.1–4.5 | 2, 12, 7 | (945, 33) to (960, 38) | Village, line 2: 18–34 m | no | Q2 funded at 4:24 |
| 10.0 | 8 | (1164, −30) | Quarry: about 110 m | no | Q5 funded at 10:05 |
| 15.9 | 9 | (1354, −188) | Far Head: 26 m | yes (trains from 13:20) | Q6 funded at 15:56 |
| 18.5 | 15 | (926, 13), the forge apron | Village: 17 m; recovery rack 24 m | yes | nothing recorded |
| 20.0 | 8 | (1101, 76) | Quarry: 40 m | yes | nothing recorded |

Three runs fall within seconds of a bill being funded: the brief's case 2, the bill filled under him. The session
after it (`mwa9y7pw`) has one "Empty your back first" refusal at a footing and one Drop. Daniel's five refusals at
the boiler are in the playtest entry. So two things happened: a refusal before a big load (case 1), and, far more
often, emptying a back piece by piece because nothing took it. What I could not establish: what the runs at 18.5
and 20.0 were for.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | A yard at each halt; stock is taken only where it lies; no pooled bank | New | Recommended, and the first build can leave it open (finding 2). Fits "the rail builds the world" (decisions, 2 November: "you still haul for each track segment, with the network bringing materials closer") and DESIGN 11. The owner's word was "shared bank", so it is owner question 1 |
| 2 | Shouldering a footing, the beam or the boiler with a loaded back sets the load down in the same press; never "Empty your back first" | New | Recommended as build 0. It follows "Keeping your load" (6 November: "it goes down where you stood") and one-thing-in-hand (2 November) |
| 3 | Put the whole back down in one press (the brief parks "Hold Drop") | New | Recommended into build 0: hold Drop empties the back; a tap still drops one piece. This is the larger share of the 64 presses (finding 1) |
| 4 | The swap's load goes to "a yard in reach, else your feet" | Default | "In reach" means standing inside the bay's own prompt reach; otherwise your feet. Build 0 has no yards, so always your feet. Pieces never fly across a station |
| 5 | Where a set-down pile lands | Default | Beside you on the side away from the big thing, outside its prompt radius (the boiler pedestal's is 1.3 m so that "a log pile dropped against it doesn't win the prompt", `boiler-view.ts:566`), never on the rails. Up to two piles a kind (a pile holds 8) |
| 6 | A big thing on your back when you shoulder another big thing | Default | Stays refused, as today. Build 0 covers logs, stone and rails only, so "Empty your back first" stays reachable in that one case |
| 7 | A yard takes logs, stone and rails only | Default | As the brief's question 2. Footings keep the Works and pier racks (their recovery already goes there past the cap, `railway-systems.ts:1467`); the beam and boiler are single objects with their own homes |
| 8 | 24 of each, then a full cue | New | Change it: **a yard never refuses** (finding 4). Each bin shows one mesh a piece up to 24, then one strapped bundle for each further 8, so the stack stays countable and true |
| 9 | "Leave it here": one press puts everything the yard takes off your back | Default | Ships; the string is the owner's (draft) |
| 10 | "Pick up" at a yard fills your back to its cap | Default | One prompt a bin (cradle, shelf, stone bin), as the depot rack and rails shelf. Carrying anything the yard takes offers Leave it here; an empty back offers Pick up. The prompt re-arms only once the flight has landed, so a mashed press cannot put down and take back (8 November: 41 drops, 18 Pulls on 4 showings) |
| 11 | Anyone may take what anyone left | Decided | DESIGN 6; owner-calls "Shared progression and one shared wallet" (6 November) |
| 12 | Yards stand at every **open** halt | New | Change it: a yard appears when the track reaches its halt site, before trains (finding 3). Halts open only after Q5; three of the six runs in the table came before that |
| 13 | The recovery rack becomes the Village yard | New | Recommended, with three conditions (finding 5): keep the owner-picked rack model as its log cradle (decisions, 5 November); it stays uncapped; it stays at (905, 1) until the Home station plan moves it |
| 14 | Recovered drops go to the nearest open yard | Default | Logs and stone: yes, nearest yard, Village when none is nearer. Rails keep recovering to the forge rack in build 1, because that rack is the stock the cart and trains draw from; revisit in build 2 |
| 15 | Where a yard stands at a halt | New | On the ground behind the original platform, at the foot of its back ramp, never on the 2.5 m deck (finding 6). Not anchored to a "cargo end" |
| 16 | The Pier halt gets a yard | New | No yard at the Pier in build 1: the platform stands on the trestle over the sea and there is no ground (still `yard-pier`). Revisit with Q7 and the loaders |
| 17 | Trains take a yard's goods only toward something on their line that still owes that material (build 2) | New | Recommended for build 2, with the conditions in finding 7. It supports hauling instead of replacing it |
| 18 | The yard is a loader source beyond the passenger mark | Default | Defer to engine-garage; build 1 must not depend on it (finding 6). The 10 November decision gives a loader to each resource **source**; a yard is not one until build 2 says so |
| 19 | The yard is the stack; no number board | Decided | DESIGN 11; owner-calls "Machines show their work physically". [carried-resource-display](../research/carried-resource-display.md) wants exact counts where bills are exact, which a countable stack gives |
| 20 | A little guy keeps the yard | Default | After a yes, not in build 1, as the brief says |
| 21 | Steel for upgrades waits as a physical stack in the Roundhouse bay; a Fit spends it; a yard never holds it | New | Recommended, and the same as the engine-garage review's call 19 (finding 8). It follows the 9 November ruling ("upgrades wait in the world as a part beside the machine they change") |
| 22 | Stock in a yard is exempt from the 21-minute recovery | Default | It is already in a safe, visible place. Sources regrow, so parked stock strands nobody |
| 23 | Pre-staging goods in a yard before a bill opens | Default | Allowed. Precedent: "fill a gated stretch before its switch" (8 November). Station 6 still takes nothing by hand before trains (9 November) and the forge offers it no rails, so a Far Head yard cannot be used to pay it early |
| 24 | If the big thing is taken by a friend between your set-down and your take | Default | You keep a pile at your feet and one Pick up restores it. No rollback of the set-down |
| 25 | One `WORLD_NS` bump for the yards | Decided | owner-calls "Nothing waits on a world bump" (10 November): ship when ready, check `npm run heartbeat` for a live session first. Build 0 needs none |
| 26 | Proof by focused `--eval` looks and one conservation test | Decided | owner-calls "Weekly or on command; focused tests, not full runs" (10 November) |

Counts: 4 decided, 12 default, 10 new.

### Findings

1. **Build 0 is the real fix and needs no yard, wire or save change. Split it out and ship it first.** Two rules:
   hold Drop to put the whole back down, and a big-load take sets the back down first. Both can be composed on the
   client from ops that exist: `rail.drop` already accepts `n` up to the pack's 16 (`src/adapters/railway.ts:269`,
   `railway-server.ts:194`), a pile takes 8, and `adapter.drop(x, y, z, n, kind)` is already there (`:1123`). The
   client sends the drops, then the existing `rail.boilerTake`, `rail.beamTake` or `rail.footTake`; the server
   applies them in order, so `carried(a) === 0` holds when the take arrives. This is a reading of the code, not a
   proof: build 0's first test is a sim test with a back of 16 logs, two drops and a `boilerTake` in one tick,
   accepted in order, and the same predicted on the client. The brief's own first build bundles this with yards and
   a bump; it should not wait for them.
   The brief's "optional `x, y, z` on the big-cargo take ops" is then unnecessary.
2. **"Shared bank" against the yard: three options, and the first build can leave it open.**
   - **(a) A yard at each halt, taken where it lies** (the brief). Honours every decision; a spare left at Far Head is
     no use at the Village until build 2.
   - **(b) Yards whose stock rides the train toward a need** ((a) plus build 2). This is the nearest thing to a
     shared bank that keeps "the rail builds the world": the stock is shared along a line, and you watch it move.
   - **(c) One pool, put in and taken out at any station.** Closest to the owner's words. It removes the walk the
     9 November session called "the longest grind" before the trains that are meant to remove it, and one number
     drawn at five halts breaks "what's on screen is true".
   Recommended: (a) now, (b) with the cargo cars, not (c). Build 0 touches none of this. Build 1's per-halt rows
   are the superset: pooling later is a rule over the same rows, with no second reshape.
3. **Yards at open halts miss half the moments they are for.** `npm run loop`: trains (and so halts) come after
   Q5. Three of the six runs in the session table came before any halt was open, and under the brief the only yard
   a player has for the first two thirds of the route is the Village one. The three runs after trains were 17, 26
   and 40 m (3 to 7 s) from an open halt, so a yard there would have been a short walk away. Recommended: the bay
   goes up when the track reaches its halt site (Camp with station 3, Quarry and Far Head as line 2 passes), and
   the platform joins it when trains run. It also telegraphs where a halt will be (DESIGN 7). Even so a yard is
   something you use when passing, not mid-task: finding 1 is the fix for mid-task.
4. **A cap of 24 recreates the owner's problem.** Two packs are 32. The second player at a full bay is refused and
   is back to dropping in place, at the one spot built to prevent it. The Village yard cannot be capped anyway:
   recovery adds to `rail.rack` without a limit so that nothing vanishes (5 November). The hoarding risk the cap
   answers is small, since every piece in a yard was carried there by hand. So: never refuse, and keep the stack
   countable (call 8).
5. **The recovery rack as the Village yard: yes, with care.** Today its three authored logs "represent accepted
   stock, never its full ledger" (`supply-view.ts:1`), on a model the owner picked. Becoming a yard makes it show
   its real count, which is a visible change to an owner-chosen asset: keep that model as the cradle and add the
   shelf and bin beside it. The Village is the crowded halt (still `yard-village`: the forge, its crane, the rail
   rack, a log pile and the cart all within 15 m of the platform) and its layout is being redone
   ([home-station-layout](../research/home-station-layout.md): "the forge as goods side"). Leave the yard where the
   rack is, 24 m (4 s) from the line 1 platform, and let that plan place it.
6. **Level layout, halt by halt** (from `layout.ts` `HALTS`, `halts-view.ts` and the stills):

   | Halt | Platform | Room for a bay (about 4 by 2 m)? | Yard position |
   | --- | --- | --- | --- |
   | Village (both lines) | 22 m by 2.5 m, crowded by the forge | Not at the platform | The recovery rack's spot, (905, 1) |
   | Camp | 24 m, hut behind, open grass on the far side | Yes | Back ramp foot |
   | Quarry | 20 m, open grass behind; gate apron 8 m past the mast end | Yes | Back ramp foot, on the side away from the gate. A reward crate sits at that ramp foot today; keep 2 m clear of it |
   | Far Head | 22 m, open grass behind | Yes | Back ramp foot |
   | Pier | On the trestle, sea on both sides, one ramp | No | None in build 1 |

   - The deck has no room: the bench, the map display (back edge, in the shelter), the mast and the request lever
     (mast foot, at the end the train comes in) fill a 2.5 m strip. A bay there blocks the aisle.
   - The back ramp's foot is about 5 m (1 s) from the middle of the deck, is where a walking player arrives, and is
     in view from both end ramps. The bay is a medium shape (about 1.2 m high), so it must not stand between the
     ramp and the display.
   - "The cargo end, beyond the passenger mark" is not one place. On double track each direction has its own
     platform (the up platforms stand across the rails at lat −6.95) and the tail of the train is at opposite ends.
     Which cars overhang which end follows engine-garage's consist order, not yet built. Build 1 should not anchor to it;
     build 2's gantry reaches the bay from the track.
   - A player on the up platform crosses the plank crossing to reach the bay: about 12 m (2 s). Acceptable.
   - Route contract: a yard adds no travel edge and no work edge. It holds only what a player carried there. Flow
     rule 3 holds because a yard never takes a key item (calls 7 and 22).
   - Not seen: the Works and pier footing racks from the player's eye (where the swap's pile lands), the up
     platforms' crossings, and the `?home=b` Village.
7. **Trains drawing from yards supports hauling, on four conditions.** Every bill after trains run is already
   brought by a vehicle (`npm run loop`: Q6 and the crossing "all on a vehicle"), so a draw cannot trivialise a
   carry that no longer exists. What it adds is a use for spares, which today have none after the kiln and the
   cradle. Conditions for build 2: (i) the train takes yard stock before the source's own, so a deposit visibly
   shortens the next wait; (ii) the goods ride in the cargo car and are unloaded, never credited at a distance;
   (iii) it draws only for a bill that is open, never a gated one; (iv) it never empties a yard standing at the
   bill's own halt, which players can carry from themselves. Until build 2, be plain that a yard away from an
   open bill is a tidy bin and nothing more.
8. **Steel: the two briefs now agree.** The engine-garage brief on main (answered 10 November) carries its own
   design review, whose finding 4 and call 19 rule that the first steel fit is the part itself, uncounted, and that
   the counted store from the second pick on "is a physical stack in the bay that shrinks when a fit is made". That
   is this brief's parked suggestion, and it follows the 9 November ruling ("upgrades wait in the world as a part
   beside the machine they change") and Ring Island's ("steel comes home as the longer boiler first"; the steel
   works "follows the live kiln's model"). Engine-garage's body text still says "the room's store" in sections 4
   and 5; read it as that bay. A yard never takes steel (call 7); spare steel on a back is covered by build 0 and
   recovers to the works' rack, as footings do. A yard bay is a prop, not a building, under "every building can be
   walked into" (10 November: "props too small to stand in are not buildings"), so it needs no interior.
9. **Small.** The brief's list of "Empty your back first" sites misses the beam's, `line-cargo.ts:308`; five sites,
   not four. None is The Boogler's copy. The Done-means swap test names "the Village yard if in reach": the boiler
   pedestal is about 15 m from the rack, so the expected result is a pile at the pickup spot. Piles were invisible
   from some camera angles on 6 November; the set-down pile needs a still from the play camera.

### Order of work

- **Build 0 (no bump, no new op):** hold Drop; the big-load swap; the pile placement rule. Proof: the sim test in
  finding 1, and one `--eval` at the boiler pedestal with 16 logs.
- **Build 1 (one bump):** yards at Camp, Quarry and Far Head from the moment the track reaches them, the Village
  yard from the recovery rack, put and take, recovery to the nearest yard. A smaller step exists if wanted: Leave it
  here at the recovery rack alone, writing the existing `rail.rack` and `rail.stoneRack` fields. That adds an op but
  reshapes no saved state, so by [mixed-builds](../agents/mixed-builds.md) it should need no bump; the builder
  confirms.
- **Build 2:** the train draw, with engine-garage's cargo cars and loaders.

### Owner questions

1. **A yard or a bank?** Recommended: **a yard at each halt, taken where it lies; with the cargo cars, trains carry
   a yard's goods to whatever on their line needs them. Not one pool you reach from every station.**
2. **Put the whole back down in one press, and never be refused a big load?** Recommended: **yes, now, as its own
   small build: hold Drop empties your back, and shouldering the boiler, beam or a footing sets your load down
   beside you.**
3. **Can a yard fill up?** Recommended: **no. It always takes what you leave; past 24 of a kind the stack grows in
   strapped bundles of 8.**
4. **When does a yard appear, and does the Pier get one?** Recommended: **when the track reaches the halt site,
   before trains; none at the Pier for now.**
5. **Where does steel for upgrades wait?** Recommended: **as a stack in the Roundhouse bay, brought by train, spent
   in view by a Fit; no separate store and never in a yard.**
