# Direction: where Boogle is

A derived view, not decision authority. Decisions live in [boogle-2.md](proposals/boogle-2.md#current-decision-index), principles in [DESIGN.md](../DESIGN.md), tasks in each plan, evidence in [playtests.md](playtests.md). Consult with the [game-direction skill](../.claude/skills/game-direction/SKILL.md). Background: [research](research/game-direction.md). The owner's view of this is the [Line Map](https://claude.ai/artifact/2znk2jAgbsyu7so8vA3v5C).

Reviewed: 3 November 2026, at `0562c947`, against boogle-2.md, [round-4-notes.md](plans/round-4-notes.md), [mainline-architecture.md](plans/mainline-architecture.md) and [beautiful-corner.md](plans/beautiful-corner.md). Owner installed this and adopted the phase map as the working map on 3 November; they can change it at any time. Compare these sources before quoting anything here.

## Phase

**0. Close round 4 discovery.** The round was played on 3 November. Hunger and relief worked twice, with one miss on the rail runs. More than disconnected toys, but neither a production slice nor feature-complete.

**Active gate:** the notes are worked through, and the changed loop is played again. Status: partial. All planned fixes shipped by 4 November and solo finishes; see [replay readiness](plans/replay-readiness.md). Nothing has been played since.

## Now, next, later

|           | Proof                                                                                                                                                                  | Prerequisites                                                                                                                                                                                                                                                                                                          | Done when                                                                                                    | Owner                                                                                            |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| **Now**   | The corrected loop still makes you hungry, then relieved, without an objective marker or bands                                                                         | Rails, tree and objective work on main ([tracker](plans/round-4-notes.md))                                                                                                                                                                                                                                             | Owner and Grant replay it, questioning the flow as new players. A blind test comes later (owner, 4 November) | Round 4 tracker                                                                                  |
| **Next**  | Friends build one railway that stays built: one material to station to track to payoff path with real saves, for solo and two players, surviving leaving and rejoining | Now is settled. The railway still runs on the temporary tab protocol ([findings](plans/mainline-architecture.md)). [Plan](plans/production-core.md) scope approved 4 November; slice 1 started 4 November, ahead of the replay, and each slice lands on main ([decision](proposals/boogle-2.md#the-shape-of-the-game)) | Race, departure, rejoin and restart proofs pass, and working apart still feels like one railway              | [production-core.md](plans/production-core.md)                                                   |
| **Later** | A vertical slice: a full session at the target quality, a fresh player observed, a second area's cost measured                                                         | Next. Beautiful corner's next [stage](plans/beautiful-corner.md) waits for the terrain pass; it isn't the slice                                                                                                                                                                                                        | Owner accepts the experience and quality                                                                     | Not yet planned. Terrain and terrain level design come together here, on a gray box, after water |

Bounded experiment waiting on the owner: **cart first, then trains** (leans yes), comparing a simple cart with a clearly better train on the same route, asking "was the train an upgrade you wanted?".

**Running alongside (graphics, no effect on the flow under test):** the real sea, per [water graduation](plans/water-graduation.md), under Neutral for now. The 4 November owner call authorizes removing the replaced Place/crossing sea and demo; the URL selectors are retired. Classic retains its own sea under the scenario-cost exception. This local work waits for review and the owner's replay, without shipping.

**Don't start yet:** new areas and content at scale, since content built on the temporary protocol or an unlocked loop gets redone.

## Phase map

The graph can step back for an affected risk. Exit evidence for each is in the [research](research/game-direction.md#proposed-phase-map-from-here-to-a-finished-boogle).

| Phase                                | Proves                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| **0. Close round 4 discovery (now)** | The notes are reconciled and the changed loop is played                              |
| 1. Production core                   | One durable shared construction path, solo and two players                           |
| 2. Vertical slice                    | A representative session at target quality, with a fresh player and second-unit cost |
| 3. Controlled content                | Small playable batches at a known rate, with a rough route to the ending             |
| 4. Alpha                             | Every campaign-critical feature works end to end; placeholders allowed               |
| 5. Beta                              | All intended content in; pacing, readability and devices checked                     |
| 6. Release                           | Remaining blockers fixed; the owner approves known limits                            |

## Owner decisions that change the next work

- Cart then trains: run the comparison, or not.
