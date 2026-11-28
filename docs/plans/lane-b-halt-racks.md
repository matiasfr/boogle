# Quarry gifts for the Pier

## What travels

While Q7 owes logs, a player at the existing Quarry yard can put down timber for the Pier. The outgoing Line 2 car picks it up and pours it at the existing Q7 frame. At both stations the same board reports the Q7 bill, the giver's name and the timber queued or aboard. The gift works solo and persists when its giver leaves.

The yard catalog contains Village, Camp, Quarry and Far Head. Park Camp, Far Head, new yards at Ring Island and High Gorge, other destination bills, and remote rails and stone. The Quarry log bin already serves recovery, kiln deliveries and hand pickup. Only timber explicitly offered during Q7 may ride.

## Implementation and witnesses

1. Write contention tests before changing rules. Track the attributed subset of Quarry logs separately from Home stock. Reserve up to the Q7 shortage, less cargo aboard and already accepted Quarry timber. Give the balance to Home dispatch. Exercise withdrawal against pickup, Home against Quarry, two carriers, recovery stock, a full ordinary Q7 car and a racing hand feed. Check railwayCheck at every transfer and checkpoint/replay with a marked load aboard.
2. Reuse rail.haltPut, rail.haltTake and the saved Q7 car manifest. Request an outward Quarry service only for a compatible car with an outstanding pickup. A full car leaves the gift reserved for the next pickup. Ordinary logs on a passing car lack a source mark, so exchanging them here could cancel the wrong job's production credit. Use the existing Q7 return path if a hand feed fills the frame first. Bump the namespace and regenerate the fixture. Exercise a reach-checked host deposit.
3. Show the Home gift pennant and verb at the Quarry log bin while room remains. Use the accepted Quarry bin position for the loading flight and the existing Thanks and On the way rows on the board. Update the owning game-design section. Start from crossing-done, give at Quarry and capture the Pier board with the named donor and quantity in transit.

Run ship-check after each build step, then the server suite, network suite and route loop. Rebase after Part 7 and refresh pins with rule-rebase.

## Design review (2026-11-28)

| Call | Kind | Grounds |
| --- | --- | --- |
| Show names without ranking, alongside the same needs and gives at both stations | Decided | 2 November Thanks and 27 November course change, A2 and A4 |
| Pour delivered logs up to the Q7 shortage and leave the crossing gate intact | Decided | 28 November pre-leg pours |
| Extend the source of Q7 timber to Quarry and call an outward train for the accepted load | New | Widens the Village source in the pre-leg ruling. The existing middle halt can otherwise be passed indefinitely after the crossing. |
| Reserve the accepted Quarry share before the next Home dispatch, with ordinary yard pickup available until loading | Default | An already announced pickup can finish, and the same bay still lets a player retrieve a load. |
| Mount the works panels above the Quarry and Pier maps, in front of the platform posts | Default | The first Pier captures showed a post cutting through Thanks. From standing height the raised, forward panel keeps the map and all six rows readable. |

The brief names two towns without catalogued yards. Step 1 limits the build to one actual middle halt. Shared-construction and wordless-onboarding research favor the visible bin-to-deck transfer in step 3. No route geometry, prices or character lines change. No owner question.

## Stock audit

| Stock or claim | Takers and reservations found before the rule change | Witness |
| --- | --- | --- |
| Quarry log bin | A player's haltTake draws logs. Recovery and unlit-kiln deliveries add ordinary timber. The kiln shortage already deducts the bin. Q7 opens after the crossing, when the kiln is lit. | Withdrawal releases only the marks that exceed remaining physical stock. A back that takes only the excess leaves both yards' commitments intact. |
| Q7 log shortage | Direct hand feed, marked Home dispatch, the new Quarry pickup, and cargo already aboard a second service. Minted Q7 kit uses depotNeed and workQueued and lands on the depot. | Both orders of gifts at the two yards, a racing hand feed with the marked car already aboard, full car at the Quarry stand, saved manifest through replay. |
| Village logs | rackTake, kiln dispatch from rideableLogs, donated Q6/Q7/steel dispatch, leg log substitution, forge conversion after direct rails, and whole castBatch loads. takeGivers selects permanent accounts and skips the steel reservation for legs and conversions. Refused logs are hand-pickup stock. | A Quarry pickup spends only Quarry marks. Existing pre-leg, cast, conversion and yard-leg tests exercise the Home takers. |
| Village stone and rails | rackTake and single-material cast batches compete for stone. haltTake and direct rail gifts compete for the Village rail shelf. giftPourRoom reserves by frame, including the relay. | These materials are outside Quarry dispatch. The existing Village rail withdrawal/Thanks case is a named TODO in the suite. |

The verified fixture replay preserves the 86 seed-stage ticks and the six streams of op labels and accepted results. The new saved account field changes hashes. The host still judges the existing yard reach and rail.haltPut shape.

One contention witness initially selected stop 3 for a Home car while Quarry already covered all eight remaining Q7 logs and four Home logs could buy a cast. Home dispatch now chooses its stop from the same unreserved quantity it uses to load. The test observes four aboard for the cast, eight retained for the Pier, and a separate Thanks list for each.

In the [two-player Pier capture](lane-b-halt-racks/pier-works.png), the player named Second lifts eight ordinary logs from the Quarry bin and presses Give to works there after the pickup flight. Their friend sees Thanks · Second and 0 queued, 8 aboard at the Pier. Its bill still reads 0/20 logs. Both clients observed one named contributor and the dispatch. The replay and host tests follow the same route to the pour. The co-op seed places ordinary stock in the bin before Q7 opens.
