# Sickle Isles review rides (dev only)

`?greybox=sickle` loads the planning map as a Local, cosmetic blockout. It has no shared edits, saves or lockstep numbers and is excluded from production. The live railway and its tuning are unchanged.

The map page's `#map-data` owns route points and optional per-point `heights` (metres above sea; null uses the station or terrain deck). Sea decks sit at 4 m except clearance approaches; stations, places and land scale stay fixed. The bay shortcut, bay trestle, first crossing, Bell–Canopy and lantern causeway have a roughly 20° heading change at the last third. The south White Wall route follows the bay side at the chalk's foot. Other links retain their necessary coast and clearance turns.

Review rides default to a train with seated Buddy and a following camera at play height, with sleepers every 1.2 m and poles every 25 m measured continuously along the route. `&gbrider=0` restores the old overview camera; `bare` removes furniture for comparison. The existing camera lag and FOV experiment are unchanged. These are constant-cruise review rides, with no camera collision, running sound, acceleration or physical boarding; Buddy's physical body stays put.

The offline economy and its playable 2D page use this service ladder, shared by passenger and freight formulas:

| Cruise m/s | Acceleration m/s² | Dwell s/stop | Boarding wait s/ride |
| --- | --- | --- | --- |
| 20 | 3.5 | 5 | 20 |
| 25 | 4.5 | 4 | 15 |
| 30 | 5.5 | 3 | 10 |
| 40 | 7 | 2 | 5 |

Short rail trips use triangular acceleration; longer trips use rest-to-rest trapezoidal acceleration. Freight omits boarding and retains its transfer time. The map/greybox panel uses base-service values and plan lengths; cruise timing includes the rendered elevation. Economy hauls below the existing 0.8 km threshold remain walks. `play-sim.ts` inherits the shared ride and freight helpers. Numbers are model assumptions, not live train upgrades. Serves DESIGN 7 (Telegraph everything) and 11 (Show, don't tell).
