# Sickle Isles horizon and review rides

The live game defaults to a Local, non-walkable horizon from the same map page JSON, parsed by
`src/sickle/map-data.ts`. One merged vertex-coloured material draws the White Wall, Canopy crown masses,
clipped Gorge, High Port with its harbour and cranes, Lantern Notch's arch and the mainland coast/city.
Ring Island and the Original Island retain their existing live meshes. It adds no colliders, railways,
labels, flags, panels, shared state or per-frame work. The current line-2 production area is unchanged;
Split-rock Works is a separate job. Existing outdoor fog (180–3600 m) fades the horizon.
The low-detail silhouette is used on every quality tier: no shadows, textures or individual forest trees.
The dev greybox and the walkable blockout replace this horizon while on, avoiding duplicate islands.

`?greybox=sickle` loads the full planning blockout on the dev server. Its walkable geometry, review tools and rides
remain excluded from production. It has no shared edits, saves or lockstep numbers. The live railway and its tuning are unchanged.

`?blockout=world` (any build, off by default; [world-blockout](../plans/world-blockout.md)) adds the same islands,
landmarks, harbour, line decks and halt platforms to the live game as Local static colliders for your own body: you can
walk out along a future line's deck and stand on every island. No panel, labels, rides, fog change, ops, state or saves;
other players without the flag see none of it. Its chunk loads only behind the flag. Riding a future line stays in the
greybox, since the live trains are server-owned.

Every future line is a train service in `src/sim/railway-world-lines.ts` (generated with the
[world-blockout page](../world/world-blockout.html) by `dev/level/world-blockout.ts`), in the sim's own shape: world-cm
track vertices, stops along the line, halts and the train's speed. Every corridor is double track (owner, 10 November):
two tracks on 4 m centres on a 7.6 m deck, a 40 m platform outside each track at every halt, and a crossover or a 40 m
turning loop at every terminus. Lines 1 and 2 stay single track; both blockouts draw a pale, non-solid second-track bed
4 m off them, with an orange post where it would meet a platform, the turntable or works. The greybox panel's **full loop** rides line 2's real rails from the Village halt, the crossing's bow, the
stack line, the White Wall line, the crane lift, the breakwater and the sea cave to the West landing: 8.7 km.

The map page's `#map-data` owns route points and optional per-point `heights` (metres above sea; null uses the station or terrain deck). Sea decks sit at 4 m except clearance approaches; the first crossing bows from the pier's 24.3 m to 6 m at the railhead (Ring Island brief); stations, places and land scale stay fixed. The bay shortcut, bay trestle, first crossing, Bell–Canopy and lantern causeway have a roughly 20° heading change at the last third. The south White Wall route follows the bay side at the chalk's foot. Other links retain their necessary coast and clearance turns.

Review rides default to a train with seated Buddy and a following camera at play height, with sleepers every 1.2 m and poles every 25 m measured continuously along the route. `&gbrider=0` restores the old overview camera; `bare` removes furniture for comparison. The existing camera lag and FOV experiment are unchanged. These are constant-cruise review rides, with no camera collision, running sound, acceleration or physical boarding; Buddy's physical body stays put.

The offline economy and its playable 2D page use this service ladder, shared by passenger and freight formulas:

| Cruise m/s | Acceleration m/s² | Dwell s/stop | Boarding wait s/ride |
| --- | --- | --- | --- |
| 20 | 3.5 | 5 | 20 |
| 25 | 4.5 | 4 | 15 |
| 30 | 5.5 | 3 | 10 |
| 40 | 7 | 2 | 5 |

Short rail trips use triangular acceleration; longer trips use rest-to-rest trapezoidal acceleration. Freight omits boarding and retains its transfer time. The map/greybox panel uses base-service values and plan lengths; cruise timing includes the rendered elevation. Economy hauls below the existing 0.8 km threshold remain walks. `play-sim.ts` inherits the shared ride and freight helpers. Numbers are model assumptions, not live train upgrades. Serves DESIGN 7 (Telegraph everything) and 11 (Show, don't tell).
