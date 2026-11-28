# Quarry gifts for the Pier

## What travels

While Q7 owes logs, a player at the existing Quarry yard can put down timber for the Pier. The outgoing Line 2 car picks it up and pours it at the existing Q7 frame. At both stations the same board reports the Q7 bill, the giver's name and the timber queued or aboard. The gift works solo and persists when its giver leaves.

The yard catalog contains Village, Camp, Quarry and Far Head. Park Camp, Far Head, new yards at Ring Island and High Gorge, other destination bills, and remote rails and stone. The Quarry log bin already serves recovery, kiln deliveries and hand pickup. Only timber explicitly offered during Q7 may ride.

## Implementation and witnesses

1. Write contention tests before changing rules. Track the attributed subset of Quarry logs separately from Home stock. Reserve up to the Q7 shortage, less cargo aboard and already accepted Quarry timber. Give the balance to Home dispatch. Exercise withdrawal against pickup, Home against Quarry, two carriers, recovery stock, a full ordinary Q7 car and a racing hand feed. Check railwayCheck at every transfer and checkpoint/replay with a marked load aboard.
2. Reuse rail.haltPut, rail.haltTake and the saved Q7 car manifest. Request an outward Quarry service only for a compatible car with an outstanding pickup. Exchange ordinary Q7 logs if its deck is full. Use the existing Q7 return path if a hand feed fills the frame first. Bump the namespace and regenerate the fixture. Exercise a reach-checked host deposit.
3. Show the Home gift pennant and verb at the Quarry log bin while room remains. Use the accepted Quarry bin position for the loading flight and the existing Thanks and On the way rows on the board. Update the owning game-design section. Start from crossing-done, give at Quarry and capture the Pier board with the named donor and quantity in transit.

Run ship-check after each build step, then the server suite, network suite and route loop. Rebase after Part 7 and refresh pins with rule-rebase.

## Design review (2026-11-28)

| Call | Kind | Grounds |
| --- | --- | --- |
| Show names without ranking, alongside the same needs and gives at both stations | Decided | 2 November Thanks and 27 November course change, A2 and A4 |
| Pour delivered logs up to the Q7 shortage and leave the crossing gate intact | Decided | 28 November pre-leg pours |
| Extend the source of Q7 timber to Quarry and call an outward train for the accepted load | New | Widens the Village source in the pre-leg ruling. The existing middle halt can otherwise be passed indefinitely after the crossing. |
| Reserve the accepted Quarry share before the next Home dispatch, with ordinary yard pickup available until loading | Default | An already announced pickup can finish, and the same bay still lets a player retrieve a load. |

The brief names two towns without catalogued yards. Step 1 limits the build to one actual middle halt. Shared-construction and wordless-onboarding research favor the visible bin-to-deck transfer in step 3. No route geometry, prices or character lines change. No owner question.
