# Principles audit: the shared wallet and the paused world

> **Verdict:** Shared wallet and paused world need amended principles; approved as worded.
> **Top recommendations:** 1. Amend the principles for a shared wallet, shared progression and a paused world. 2. Annotate older reports that recommend a spendable personal wallet.
> **Status:** adopted. See [Progress and rewards](../decisions.md#progress-and-rewards).

_6 November 2026; **approved by the owner as worded the same day** ([economy principles amended](../decisions.md#progress-and-rewards)). This audit is for the owner's answers to the [ring-and-economy brief](../brainstorms/ring-and-economy.md):_

- _a shared wallet anyone may spend;_
- _a world that is paused while nobody is in it, with a capped "while you were away" credit to producers on the next
  join;_
- _everything automatable in the end, then a new tier of goals;_
- _numeric costs;_
- _no optional areas;_
- _a mostly linear progression with doubling back._

_It lists every recorded principle, decision, contract and code path that conflicts with that direction. Each item
gives the exact source line, the conflict and an amendment worded for the owner to approve. Nothing here edits those
documents. Line numbers are from the checkout at `66738570`._

**As applied (6 November):** DESIGN.md carries compact versions of items 1–5, sized to the prototype route's reading
budget. The full wallet, cosmetics and away-credit rules are in [owner-calls](../agents/owner-calls.md), and the code
changes are queued after R1b in [orchestrator-state](../agents/orchestrator-state.md).

**Summary:**

- Three DESIGN.md principles need new wording: 6 (shared wallets), 9 (the world changing while away) and Server hosts
  every room ("ticks while nobody is online").
- Two need a clarifying sentence: 1 (numbers as reasons) and 4 (spending without negotiation).
- Four decision-log entries and the production-core offline contract are superseded.
- One owner call needs a rule for how the wallet looks: anything counted has a physical form.
- Four code paths run or catch up time while nobody plays.
- Safety rules stay: nobody may ever be locked out.

## DESIGN.md

### 1. Principle 6, Communal world, personal rewards

- **Source:** [DESIGN.md:33](../../DESIGN.md), "The world and its network belong to everyone. Anything you *earn*
  (cosmetics, hats) is yours alone. No shared wallets, so nobody spends what someone else earned."
- **Conflict:** the owner now accepts a shared wallet anyone may spend, on shared or personal things.
- **Proposed amendment:** "The world, its network and its wallet belong to everyone: what connected places produce and
  sell goes into one shared wallet that anyone in the world may spend. What you *own* (cosmetics, hats) is yours alone
  once you have it, and nobody can take or spend it. The wallet is visible in the world, and the next build on the main
  route always keeps its share."
- Rename the principle to **Communal world and wallet, personal things**, and update the index in
  [context.md:19](../agents/context.md).

### 2. Principle 9, Leave something for the next visitor

- **Source:** [DESIGN.md:42](../../DESIGN.md), "Progress persists between sessions, and the world can keep changing
  while everyone is away. Returning players should notice what happened since they left."
- **Conflict:** the world is now paused while empty.
- **Proposed amendment:** "Progress persists between sessions. While nobody is in the world it is paused; when someone
  returns, the producers' yards are credited for the time away, with a soft limit, so returning players find full
  stacks and can see what changed."

### 3. Server hosts every room

- **Source:** [DESIGN.md:92](../../DESIGN.md), "...so the island never waits for a host and ticks while nobody is
  online."
- **Conflict:** an empty room should not simulate the economy.
- **Proposed amendment:** "...so the island never waits for a host. A room simulates only while a player is in it:
  empty, it is paused and saved, and on the next join the server applies one capped away credit before anyone sees the
  world."

### 4. Principle 1, Toys before chores

- **Source:** [DESIGN.md:18](../../DESIGN.md), "*Avoid:* scores, timers or quotas as the reason to do something."
- **Conflict:** this is softer than the others. Numeric costs, a wallet balance and end-game goals with big numbers
  are now intended, and incremental numbers going up are part of the appeal.
- **Proposed clarification (added, not replacing):** "Costs and progress may be shown as numbers, and numbers going
  up is part of the fun. Every number counts something that is physically in the world. The toy test still applies to
  every verb, and no timers or quotas: nothing expires or demands a deadline."

### 5. Principle 4, Cooperation is automatic, not negotiated

- **Source:** [DESIGN.md:29](../../DESIGN.md), "Nobody should need to coordinate in chat to contribute."
- **Conflict:** a wallet that anyone can spend invites arguments about what to buy.
- **Proposed clarification:** "Spending from the shared wallet happens at a place in the world (the Roundhouse, a
  works, the town), so others see it. The next main-route build always keeps its share, so nobody's spending can
  block progress."

### 6. Principle 11, Show, don't tell, with the owner call "Machines show their work physically"

- **Source:** [owner-calls.md:25](../agents/owner-calls.md), "Anything the game counts gets a visible physical form
  that changes, not just a counter."
- **Conflict:** a wallet is a counter.
- **Proposed rule, no amendment needed:** the wallet is the town's strongroom beside the Home Yard. Coin crates stack
  up as surplus sells and empty when someone buys, so the number is also a pile you can see. A HUD figure only
  supplements it.

## The decision log ([decisions.md](../decisions.md))

### 7. The audit picks, while nobody plays

- **Source:** [decisions.md:113](../decisions.md), "**While nobody plays:** the network banks one project, and
  the next step waits for players."
- **Conflict:** this banked one project during absence.
- **Proposed amendment:** mark it superseded: "Replaced 6 November: the world is paused while empty; on the next join
  producers' yards get a capped away credit, and nothing else advances."

### 8. Design Table call, 2 November

- **Source:** [decisions.md:185](../decisions.md), "**While nobody plays,** whatever you kicked off finishes,
  as a small incremental touch."
- **Conflict:** under a paused world, nothing finishes while away.
- **Proposed amendment:** this is an owner choice, open question 2 in the brief. **Recommended:** keep the small touch
  as part of the away credit. On the next join, the one funded job that was mid-laying completes, along with the yard
  credit; nothing new starts.

### 9. The production core's scope, 4 November, and its offline contract

- **Source:** [decisions.md:196](../decisions.md), "offline completion only for already-funded work".
- **Source:** [production-core.md:497](../plans/production-core.md), "Server-running empty time uses ordinary ticks;
  server-down/idle-unloaded time only completes already-started work."
- **Source:** [production-core.md:592](../plans/production-core.md), "Approve offline completion only for
  already-funded work, with no automatic harvesting or chain of new stations while nobody is there?"
- **Conflict:** empty time is no longer ticked, and producers are now credited for the time away.
- **Proposed amendment:** "Empty rooms do not tick. On the next join the server computes the time away once, from its
  saved stamp, and applies one away credit:
  - each producer's yard gains rate × H × (1 − e^(−away/H)) units, never past the yard;
  - the funded job completes, if question 2 says so.

  The credit is consumed once, like `rail.resume` today, and is never read from a client."

### 10. After round 3, 2 November

- **Source:** [decisions.md:197](../decisions.md), "**Money is a comic score**, with The Boogler's prices as a
  gag".
- **Conflict:** Bucks becomes spendable shared money.
- **Proposed amendment:** "Money is the shared wallet: town sales of surplus, spent by anyone. The Boogler's prices
  stay a gag: he charges absurd sums once you reach him." The [money brief](../brainstorms/money.md)'s "TODAY: $0" joke
  needs a new punchline; it stays proposed.

### 11. Progress and rewards, three things you earn

- **Source:** [decisions.md:282](../decisions.md), "**Three things you earn, none of them a shared wallet**",
  with som as "a personal coin, earned only and spent on looks".
- **Conflict:** this contradicts the wallet directly.
- **Proposed amendment:** "Two things you earn and one you share: shared progress and the shared wallet are the
  world's; personal looks are yours. Som stays parked (a personal coin is unnecessary once the wallet can buy looks)."

### 12. Boxes have rarity, Design Table call

- **Source:** [decisions.md:182](../decisions.md), "**Boxes have rarity.**"
- **Conflict:** this is a tension, not a contradiction. If the wallet can buy looks, boxes and the shop become two
  channels for the same things.
- **Proposed rule:** box cosmetics stay box-only, and the wallet buys a separate shop line and train fittings.

### 13. The production core's money contract

- **Source:** [production-core.md:450](../plans/production-core.md), "Do not turn the unused `score.ts:spend`
  capability into a communal purchasing wallet or invent a currency economy during conversion."
- **Conflict:** it forbids exactly what the owner now wants. It is still right for the conversion's scope.
- **Proposed amendment:** "...during conversion. The shared wallet is a separate, later feature with its own brief and
  sync review."

### 14. Supply and no lockout, 5 November

- **Source:** [decisions.md:137](../decisions.md), "Nobody may ever be locked out: dropped resources recover
  to a rack after about 20 minutes with nobody near, and cut trees regrow after about 30 minutes".
- **Conflict:** paused time no longer advances those timers.
- **Proposed rule, keeping the safety call:** recovery and regrowth count time away, because they restore access and
  aren't income. On the next join, anything that would have recovered or regrown does.

### Compatible, no change

These were checked and are consistent:

- "numbers go on what everyone shares" (:246);
- trains timetabled from the tick (a paused tick stops them too);
- "resource management stays light, never survival-craft" (:271): no upkeep, fuel or decay is added;
- "every system is ignorable" (Kept from SETTLED);
- the approved gate-puzzle and jump briefs;
- the 6 November replication decision (the server owns the shared rules, so it can apply the away credit).

## Code that runs or catches up time while nobody plays

These are implementation follow-ups only after the owner approves; none are changed here.

| # | Source | What it does now | Under the new direction |
| --- | --- | --- | --- |
| 15 | [server/src/host/rooms.ts:1–4](../../server/src/host/rooms.ts) | A room "ticks with or without players, and is saved and unloaded after cfg.roomIdleMs" (10 minutes by default, `server.ts:67`) | Stop the economy as the last player leaves, after a short grace for reloads |
| 16 | [server/src/host/world-host.ts:342–348](../../server/src/host/world-host.ts) | "Catch up the time nobody hosted, once, for the funded job" through `api.resume`, R1a's offline catch-up | Becomes the away credit: yard fills, plus the funded job if question 2 keeps it |
| 17 | [server/src/host/world-host.ts:109–110](../../server/src/host/world-host.ts) and [src/sim/bank.ts:1](../../src/sim/bank.ts) | Classic's helper bank: "helper huts keep working while nobody hosts" | Classic only; retire or leave with classic |
| 18 | [src/sim/railway-supply.ts:83, 104](../../src/sim/railway-supply.ts) | The supply pulse catches up to 1,440 minutes of regrowth and recovery after a gap | Keep, as item 14 (lockout safety), applied on join |
| 19 | [src/sim/railway-line2.ts:195](../../src/sim/railway-line2.ts) | "the forge and depot never produce offline" | The forge and the depot cart join the away credit like any producer (their racks cap it at 24) |

## Research that recommends against the new direction

These aren't binding, but should be annotated so builders don't cite them against the owner:

- [upgrade-economy.md](upgrade-economy.md) and [roundhouse-trains.md](roundhouse-trains.md) recommend "no spendable
  shared wallet".
- [incremental-game-maths.md](incremental-game-maths.md) recommends "a project cap, not a daily time allowance".

The soft-capped away credit is a compromise between the two: it's an allowance, but a capped one that is bounded by
yard size, and it never chooses or builds anything.
