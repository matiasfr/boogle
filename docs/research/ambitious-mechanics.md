# Research: ambitious mechanics to prototype

*Research notes, October 2026. Ends with a ready-to-run goal prompt for an overnight prototype branch.*

> **How solid this is.** The research ran web searches across six angles. Every page fetch was blocked by this environment's network policy, so the claims below come from search-result summaries and known game-design history. None of them were checked against the full source pages. Treat the precedents as inspiration, not verified fact. The fit-to-Boogle notes are design judgment.

## What the precedents say

| Precedent | Mechanic | Why it fits Boogle |
|---|---|---|
| **Breath of the Wild / Tears of the Kingdom** (GDC 2017, GDC 2024) | A "chemistry engine" next to the physics engine, with three rules: elements change materials' states, elements change each other, materials don't change each other. Dohta's line: "rather than creating something fun, create a system that makes fun things happen." The team prototyped the rules in 2D first. | A small integer rule table over the grid we already have (sand, water, lava, rock) gives emergent results without hand-authored set pieces. It is *Toys before chores* as an engineering method. |
| **From Dust** (Chahi) | A live heightfield of sand, water and lava. Lava meeting water hardens into rock. Telegraphed tsunamis and eruptions that you redirect by reshaping the ground. | The closest shipped game to Boogle. Lava that builds permanent land is *only the world is the antagonist* plus *leave something for the next visitor*. |
| **Noita** (GDC 2019) | Falling-sand cellular automaton with dirty rects. Density swaps between materials, and fire plus water makes steam. Update order matters: a fixed scan direction, alternated by parity. | Confirms our water sim's design (active cells, parity-alternated scan). The same rules extend to a second fluid. |
| **Thermal erosion** (Unity Terrain Tools, `symbios-ground`) | Slopes steeper than the angle of repose (sand is about 33°) shed material to neighbours. Each cell gives away at most 1/4 per pass so it never oscillates. | An integer slump pass makes sand walls fail believably when wet: the sandcastle-vs-tide fantasy. Sand stays conserved and the pass is deterministic. |
| **Pirate Sea Jam** (browser multiplayer devlog) | The boat sits on the wave's tangent plane at a constant speed, with no float buoyancy. Chosen for online determinism. | A raft can ride our integer water surface without a float buoyancy sim fighting the network. |
| **Windbender.io**, per-sail lift/drag posts | Sail force from angle of attack. Boats cast wind shadows on each other. | A shared seeded wind field gives throws, rafts and sails something to argue with. Wind shadows create player-to-player effects without PvP. |
| **Electroplankton** (Iwai), **Proteus** | Goal-free music toys where you play notes indirectly and "it's nearly impossible to make it sound bad". Proteus's island scores itself from what's nearby. | Shells placed in the sand ring when the ball, a player, the tide or lava touches them, quantized to a shared beat. The ball becomes an instrument (*the ball stays the star*). |
| **Sky: Children of the Light**, **Journey** | Consent-based hand-holding (one leads, one is pulled along). Wordless chirps. No ability to harm each other. | A tether or hand-hold is automatic cooperation with no griefing surface. Good as a stretch item. |
| **Human Fall Flat**, **PEAK** | Shared physics. Heavy things need "two pairs of hands". Friends supply the slapstick. | Supports host-owned physics props that are better with more people around. |
| **Gaffer On Games** (lockstep, snapshot interpolation, state sync) | Float lockstep is nearly impossible across machines. Snapshot or state sync suits non-deterministic physics. | Keeps our split: integer grid sims run in edit lockstep, and cannon-es bodies (ball, raft) are owner-authoritative with snapshots. |

## The pick: four systems that feed each other

1. **Tide and sandcastles.** A telegraphed tide raises the sea level. Wet sand slumps, flowing water erodes piles, and a fast ball knocks walls down. This is PLAN.md Phase 6, plus the erosion that makes it dramatic.
2. **The volcano.** A telegraphed eruption sends lava, a second integer fluid, down the hill. Players dig channels to steer it. Lava that meets water or cools turns into permanent rock, so the island grows over time.
3. **Wind and the driftwood raft.** A seeded wind field nudges the airborne ball and pushes a rideable raft with a sail. The tide floats the raft off the beach, and a ball thrown into the sail shoves it.
4. **Singing shells.** Players place shells that chime on a shared beat when anything touches them: the ball, players, the rising tide, flowing lava. The tide coming in over a field of shells plays a melody.

They're chosen to multiply each other (the chemistry-engine lesson): tide floats rafts and plays shells, lava meets tide and makes rock, wind carries the ball onto shells, the ball breaks walls to let water or lava through.

## Goal prompt

Paste this into a fresh Claude Code session on this repo (web or CLI):

````text
GOAL: Build an ambitious overnight prototype of four interlocking mechanics for Boogle on a
prototype branch, so I can play them in the morning with `npm run dev`.

BRANCH AND SHIPPING (overrides AGENTS.md "Shipping" for this task)
- Work on a new branch `proto/tide-lava-wind-shells` cut from the latest `main`.
- Push with `git push -u origin proto/tide-lava-wind-shells`. Do NOT run `npm run ship`
  (it pushes to main), do NOT push to main, do NOT open a PR (automerge.yml would merge it).
- Commit after each working milestone (imperative messages; body names the DESIGN.md principle).
  Run `npm run check` before every push, and `npm run check:full` before the final push.
- A partly finished prototype that runs is better than a complete one that doesn't. Work in the
  priority order below, and keep `main`-quality code hygiene (Prettier, ESLint, no new deps).

READ FIRST: AGENTS.md, DESIGN.md, src/world/README.md, src/net/README.md, src/loop.js header,
src/sim/water.js header (it already has setSeaLevel, setSource, addWater/removeWater, wake),
src/world/terrain-logic.js and terrain-edits.js (integer sand layer), src/ball.js (owner/epoch
rule), src/controls.js (free pad slots right now: `view`, `r3`, `right`),
docs/research/ambitious-mechanics.md (this design and its precedents).

HARD RULES (from DESIGN.md, non-negotiable)
- All shared state is integer, seeded (mulberry32), a pure function of tick + seed + edits,
  registered through src/world/sync.js (registerOp / registerState with serialize, load, hash /
  onTick). Every new shared module lives in src/sim/ with no three.js and no DOM, and gets a
  fast unit test in test/ for determinism (same inputs, same hash), conservation and
  serialize/load round-trip.
- Cosmetics (particles, glow, sounds, steam, foam) are separate modules using floats freely,
  never read by the sim.
- Each mechanic is a feature file in src/features/ (own CSS, DOM from JS). Edits to shared files
  (terrain-edits.js, water-world.js, ball.js, main.js) stay small and surgical; say why in the commit.
- Every environmental event is telegraphed 30-60 s ahead with something visible in the world.
- Nothing kills or locks out a player. Hazards launch, tumble or push you (slapstick).
- Add URL debug flags so I can test fast: `?tide=fast` (cycle every 60 s), `?erupt=now`,
  `?wind=storm`, and `?proto=-tide,-lava,-wind,-shells` to switch any mechanic off.

PRIORITY 1: TIDE AND SANDCASTLES (Toys before chores; Only the world is the antagonist; Telegraph)
- src/sim/tide.js: tideAt(tick, seed) -> { seaCm, phase: 'calm'|'warning'|'rising'|'high'|'ebbing' }.
  A surge every ~4 min (seeded jitter), 45 s warning, ~20 s rise of +60..90 cm, ~40 s high, ~30 s ebb.
  Drive water.setSeaLevel from it in an onTick handler. Pure function: late joiners agree instantly.
- Telegraph: a visible swell line on the horizon that approaches during 'warning', foam along
  the new waterline, sky/sea tint, a low rumble; HUD text is secondary.
- src/sim/erosion.js: integer pass over the editable sand layer every few ticks, only on cells
  near water activity. Wet cells (water depth > 0 on or next to them) slump to neighbours when the
  height difference exceeds a wet talus threshold (dry sand slumps only past a steeper one). Flowing
  water (depth change this tick) scours piled sand at a capped rate. Move whole cm units, at most a
  quarter of the excess per pass, fixed scan order alternated by tick parity, sand exactly
  conserved. Mark changed cells so the mesh, physics heightfield and water terrain refresh like dig edits.
- Ball knocks walls: when the ball owner's ball hits piled sand above a speed threshold, submit a
  `sand.knock` edit (host validates speed claim loosely, rate limit, reach from ball position);
  apply as a slump burst around the impact. Big sand spray + thud.
- Tests: tide determinism across ticks, erosion conserves sand and is order-stable, hash round-trip.
- Scenario (dev/scenarios/): build a wall, run the tide fast, assert water crosses and the wall
  loses height. Read the images with `npm run look`.

PRIORITY 2: THE VOLCANO (From Dust; Leave something for the next visitor)
- Pick a vent cell high on the hill. src/sim/lava.js: a second integer column fluid (reuse
  createWater's approach or a slimmed copy): low flow rate, minimum thickness before it moves (so it
  creeps in lobes), no sea edges, no evaporation.
- Rules (chemistry table, integers only): lava next to water converts to rock and removes some
  water (steam, cosmetic); lava that hasn't moved for N ticks cools into rock. Rock is a new
  persisted integer layer added to terrain height (not diggable, so new land stays), saved in
  the snapshot. Lava never destroys mushrooms: it cools on contact with the mushroom patch edge.
- Eruption schedule from tick + seed (~every 12 min, `?erupt=now` forces one): 45 s of smoke
  column, glow and ground rumble first, then ~40 s of flow from the vent via setSource-style input.
- Interactions: the ball touching lava gets a hot upward bounce and steam; players touching it
  get launched with a yelp. Players steer it by digging channels and piling sand (sand walls slow it).
- Tests: lava+water conversion conserves (lava volume -> rock height), determinism, round-trip.

PRIORITY 3: WIND AND THE DRIFTWOOD RAFT (The ball stays the star; Slapstick over precision)
- src/sim/wind.js: windAt(tick, seed) -> integer direction and strength from smooth seeded value
  noise, with gusts; `?wind=storm` cranks it. Telegraph gusts with visible streaks, bending
  palms/grass and cloud speed.
- Ball: the owner applies a gentle wind force while it's airborne or floating (it's a beach ball;
  long throws should curve). Keep it fun, not frustrating; tune on feel.
- Raft: one driftwood raft with a small sail, a cannon-es body owned with the same epoch rule as
  the ball (reuse ball.js ownership logic rather than inventing a new one). It rides the
  water surface (sea level or the sim water surface under it) on the surface tangent, Pirate Sea
  Jam style, not a float buoyancy sim. Wind pushes the sail by its facing; a ball hit on the sail
  shoves it. Players can stand on it; the high tide floats it off the sand; it beaches when water
  drops. Persist its resting position in the snapshot.
- Optional if time allows: sail auto-trims toward the wind when someone stands on the raft.

PRIORITY 4: SINGING SHELLS (Toys before chores; Cooperation is automatic)
- Place a shell where you aim: new action on a free pad slot (`right`) and a key (pick an unused
  one), up to 8 shells per player; placing a 9th removes your oldest (no removing others' shells).
  Edits `shell.place` / state `shells`, persisted. Pitch = pentatonic step from the cell's height,
  so terrain shapes the melody; shell colour shows pitch.
- A shell rings when the ball, a player, rising water or lava touches it. Quantize to a shared beat
  derived from world.tick (e.g. one beat every 5 ticks), so everyone hears it in time. Sound is a
  cosmetic Web Audio module (procedural marimba/bell, short reverb), with a little bounce and glow.
- The fun target: the tide rolling in over a shell field plays a phrase; a ball bouncing down a
  shell staircase plays a run.

STRETCH (only if all four are playable): Sky-style hand-holding (walk into a friend while holding
the `r3` slot to link; the leader pulls the follower; either lets go), and Proteus-style ambient
layers whose mix follows nearby lava, tide and wind.

FINISH
- docs/prototype-notes.md: how to try each mechanic (URLs with flags, two-tab multiplayer test),
  what works, what's rough, numbers worth tuning, which principles each one serves or bends.
- Leave the branch pushed with `npm run check:full` green, and summarise the night's work and the
  test commands in your final message.
````

## Sources (search summaries only; pages could not be fetched)

- BotW chemistry engine, GDC 2017: gamesbeat.com/the-legend-of-zelda-breath-of-the-wild-makes-chemistry-just-as-important-as-physics/, thumbsticks.com/gdc-17-breath-of-the-wild-science-lies
- TotK, GDC 2024: shacknews.com/article/139210/zelda-totk-gdc-2024-panel-recap, digitaltrends.com/computing/how-nintendo-designed-tears-of-the-kingdom-physics
- Noita: 80.lv/articles/noita-a-game-based-on-falling-sand-simulation/, gdcvault.com/play/1025695, lexaloffle.com/bbs/?tid=45811
- From Dust: shacknews.com/article/65199/chahis-project-dust-renamed-from
- Thermal erosion: docs.unity3d.com/Packages/com.unity.terrain-tools@5.1/manual/erosion-thermal.html, docs.rs/crate/symbios-ground/0.3.0/source/src/erosion/thermal.rs
- Sailing: claudijo.itch.io/pirate-sea-jam/devlog/737807/part-10-sailing-physics-simulation, stuurboord.itch.io/windbender
- Networking: gafferongames.com/post/deterministic_lockstep/, gafferongames.com/post/state_synchronization/, gdcvault.com/play/1024972 (Rocket League)
- Music toys: gamespot.com Electroplankton review, en.wikipedia.org/wiki/Proteus_(video_game)
- Social: gamedeveloper.com (Journey ping and networking), gonintendo.com (Sky hand-holding), gamingbolt.com (Human Fall Flat), 80.lv (PEAK)
- Animal Crossing: primagames.com (flower breeding with visitors), nookipedia.com/wiki/Time_travel
