# Rail as play: could building and running the network be a core system?

*Research report, 30 October 2026. Whether laying and running track can be a core play system for the Boogle 2.0 concept, from Mini Metro, Factorio, Tracks, Railroads Online, Townscaper, Dorfromantik and others. Feeds [docs/proposals/progression-paths.md](../proposals/progression-paths.md).*

**Markers.** *Verified*: a research agent fetched the page and matched the text word for word. *Secondary*: seen only in a summary, review or snippet. *Paraphrase*: a journalist's words, not the designer's.

**Short answer: yes, if the track is a toy before it is a network.** The building games that work share four things:
- one main verb (Mini Metro, Townscaper);
- pre-made pieces that snap at fixed sockets, with no freehand precision (Tracks, Dorfromantik);
- a payoff you can see within seconds: a train runs on what you laid (Tracks);
- mistakes that cost little or nothing.

Railroads Online proves the co-op fantasy and shows its cost. Its host-simulated trains have rubber-banded for clients for years, and its roles come from host permissions. Both clash with DESIGN.md: principle 4, principle 10, and "physics is never Lockstep".

**Recommendation: Variant B.** Players lay era pieces on an integer node grid as Lockstep state. Mainline trains stay timetabled, now derived from the built network. One drivable Owner toy, the handcar, shares the rails.

## 1. What makes network-building fun rather than a chore

**Mini Metro (Peter and Robert Curry, Dinosaur Polo Club).**
- The game began by inverting the usual idea: "I suggested that reversing the idea, and having the computer travel on the subway that the player builds, would be more fun." (Peter, MCV, verified)
- Robert "found the daily task of planning the commute on the tube surprisingly satisfying" (verified).
- "how ironically liberating it is operating within tight constraints" (postmortem, verified); "It's predictable chaos" (Pocket Tactics, verified).
- **Lesson:** the player builds and the system runs it. Watching your network work is the reward.

**Railroads Online (Stefan Kelnberger).** I found no design interview; the evidence is changelogs and publisher posts.
- Roles are permissions: "player 1 can build tracks while player 2 is allowed to drive trains" (Steam, verified).
- Track is hand-drawn splines. Since 2024 they auto-follow the slope and preview green or red before you commit (secondary).
- **Lesson:** a slow craft sim for long co-op evenings; Boogle-like in spirit, far heavier.

**Factorio (Wube).** Signals serve the automation, not the player.
- "In Factorio, trains know exactly where to go, and signals are mainly just preventing them from crashing to each other" (kovarex, FFF #81, verified).
- Building track was hard to make easy: "The problem with rail building is that it has too many states" (kovarex, FFF #290, verified).
- The fix was a grid: "every connection point has to be located on integer grid coordinates. This is necessary to make rail planner, and rail signal positions work reasonably simply" (V453000, FFF #377, verified). **This is Boogle's data-model lesson.**

**Transport Tycoon and OpenTTD (Chris Sawyer).**
- "I think I've always felt I was happier being the guy on the ground doing things rather than remotely running them" (PCGamesN, verified).
- The network's purpose: "a superior transportation system can bring prosperity and growth to a devastated area" (verified).
- **Lesson:** a network is fun when it visibly changes the places it serves. "Playing with a model railway" in that article is the journalist's paraphrase.

**Train Valley (Flazm).** I found no designer quote. The press kit (verified, unnamed) shows two ideas:
- a stress valve: "you can build railways and schedule trains while on pause";
- terrain as the cost: rail is "cheap when laid across bare fields ... but ... rather expensive when demolishing forests".
- **Lesson:** sand can be Boogle's terrain cost, with no money.

**Tracks: The Train Set Game (Whoop Group, led by Tom Malinowski; publisher Excalibur).**
- "The game is very much a sandbox at the moment" (studio, PC Gamer, verified). PC Gamer adds that the studio calls it "a creativity toy first and foremost" (paraphrase).
- The loop: unlimited pieces snap at sockets, then you ride in first person.
- An early patch replaced every piece "to improve alignment… [and] fix some derailment bugs" (devlog, verified). **Snap precision is what makes the slapstick safe.**

**Townscaper (Oskar Stålberg).**
- "When you keep score, you play to the score… You stop watching the actual world you're building" (PC Gamer, verified).
- "how simple the interaction model is and how clear the division of labor between the user and the algorithm is" (verified).
- **Lesson:** the player picks the spot; the algorithm makes it pretty. ("More of a toy than a game" is Tommy Thompson's paraphrase.)

**Islanders (Grizzly Games).**
- Friedemann Allmenröder: "Can we make it simpler? Can the game still be fun if we cut this feature?" and "Preserve simplicity, especially accessibility" (Game World Observer, verified).

**Dorfromantik (Toukana).**
- Timo Falcke: "the interaction the player does the most has to feel as satisfying as possible. Tiny animations and sound effects are great ways to give the player's actions more impact" (Game Developer, verified).
- Goals are soft demands ("the train wants to travel at least X train tracks"), "designed none of them to be too punishing for someone just building for aesthetics" (verified).
- Rail tiles that must continue are its most-cited frustration (secondary). **Rigid connection rules are where toys become chores.**

## 2. Co-op building with friends

- **Railroads Online.** The host sets per-player permissions (since July 2024, verified) and simulates the trains (secondary). One player drives each loco: "added 'is controlled' query before entering a vehicle" (verified). The roles are negotiated, against principle 4.
- **Satisfactory.** No developer source. The world pauses when the host leaves, and clients report rubber-banding trains (secondary).
- **Valheim.** I found no Iron Gate source. A community mod page (verified, community author): "Valheim simulates each creature, ship and workbench on exactly one machine: whichever client owns it. Ownership goes to whoever was in range first". The cost: "Its frame time becomes your input delay." This is Boogle's Owner kind at scale.

**For Boogle:**
- **Roles come from verbs, not permissions.** Anyone lays track, grades with the shovel, throws switches, rides or pumps.
- **Two builders at one open end share a ghost.** The first press places the piece and the other's ghost moves on.
- **Drop-in is free.** Track arrives with the snapshot.
- **Principle 5.** You can remove only your own piece, and only within 30 s. After that the piece is communal, and only the world (the tide) can damage some kinds.

## 3. Track-laying UX on desktop, touch and gamepad

What goes wrong (secondary, from reviews): pointer-on-gamepad ports (Train Valley, Dorfromantik, Tracks on Switch) and 3D cursors; touch works when there is one verb (Townscaper, Mini Metro).

**Proposal: no cursor. The track grows from where you stand.**
- **Held item.** A track bundle (one per era) comes from a railyard stall.
- **Ghost.** While held, the nearest open end within 6 m shows the next piece, chosen from your facing: straight, a 45° curve, or a switch when you stand beside existing track.
- **Place** with use (click, pad X, touch main button).
- **Undo** with interact on your own fresh piece ("Pick up", `registerInteractable`), so there is no new key. Factorio: "anything you do will be undone" (FFF #412, verified).
- **Preview** in green or red with a reason, like the shovel ring ("Too steep: flatten first").
- **Slapstick over precision.** The ghost always snaps. Crooked layouts are valid and funny to ride. Auto-dressing (sleepers, ballast, buffers) makes rough plans look intentional, as in Townscaper. Placement juice is a thunk, dust and sleepers zipping into place (Falcke).

## 4. Operating trains

### Driving, timetables or switching

| | Tracks | Railroads Online | Mini Metro |
|---|---|---|---|
| Player's job | Ride, drive and toot | Fire, drive, couple, switch | Draw lines |
| Trains | Driven | Driven | Automatic |
| Failure | None | Derail, run dry | Overcrowding ends the run |

Boogle sits between Tracks and Mini Metro:
- **Mainlines run themselves** (Mini Metro), so the network you built gets used.
- **Switching is the one operating verb.** Interact on a points lever sends the next train down your branch; a last-second throw is funny.
- **The handcar is Tracks-style driving with no failure.**

### Netcode: who owns a train?

**Timetabled train: Lockstep without state.**
- Its position is a pure function of (tick, line state), so it costs no bandwidth.
- Every tab knows where it is with no lag, so every tab can place a kinematic body there. The ball's owner collides with the train locally: "the train bats the ball" is free and fair. This is the strongest argument for timetabled mainlines.

**Driven train: Owner kind.**
- **The warning.** Railroads Online simulates trains on the host, and clients send controls ("the server command to set a new regulator value is sent after the regulator position has not changed for 0.5s", keume changelog, verified). Years of "desync and stuttering issues when running trains as a client" followed (verified).
- **Why Boogle can do better.** Rails reduce motion to one dimension:
  - the owner integrates `(pieceId, s, v)` with simple 1D physics, with no cannon-es body;
  - it publishes those numbers as presence `hc`;
  - other tabs interpolate along the same deterministic curve with `createSnaps`;
  - ownership uses the ball's epoch rule (the last pumper owns it);
  - an abandoned handcar submits its rest position as an edit, so it persists.
- **Handcar meets mainline train.** The owner sees the deterministic train and takes a slapstick bonk, off the rails and back onto the nearest piece. Mainline trains never react, so they stay pure functions.

## 5. Proposal for Boogle

### Track-building: the era decides the pieces

| Era | Pieces | New toy (never a gate) |
|---|---|---|
| Castaway | Plank wagonway, push-cart | Lies on sand; floats off at high tide |
| Steam wagons | Wooden rail, gentle curves | Shallow grades only |
| Iron and coal | Iron rail, switches | Branches; links the caves' abandoned mine (rails and a minecart already exist) |
| Steel and harbour | Steel, trestle, pier | Crosses shallow water |
| Diesel | Long straights, level crossings | Faster lines, flatcars |
| Electric | Overhead-wire pieces | Lines glow at night |
| Monorail | Beam on pylons | Ignores ground height within a span |
| Maglev | Guideway | Long spans between islands |

Old pieces stay available.

### Operating

- Mainlines stay timetabled, derived from the network.
- The handcar is the drivable Owner toy from the castaway era; two pumpers go faster, so cooperation is automatic. A heritage loco can come later with the same netcode.

### What the network is for

- **Reaching.** A line that reaches a discovered islet opens a station there.
- **Carrying.** Flatcars carry gifts (fruit, crates, the ball) as Lockstep cargo. An era advances when the network delivers a landmark's wants (direction H, "restore"), not on a mini-game score.
- **Connecting.** Each new connection visibly changes the place it reaches: lamps lit, a dock restored. This is Sawyer's "prosperity" made visible.

### Interaction with the existing toys

- **Sand as railbed.** A piece checks the terrain heights under it against its era's maximum rise per piece. The shovel's flatten is the grader, and piling sand makes an embankment. Pieces read terrain and never write it, so `TERRAIN_OPS` and the water stay correct.
- **Digging under laid track** is refused ("Track here"). This protects others' work.
- **Water.** Flooded pieces are awash: trains splash through slowly (cosmetic). Bridge pieces cross water.
- **The tide**, if built, floats off castaway planks only. The world is the antagonist, and wood is fragile and rebuildable.
- **The ball.** Trains and the handcar bat it. It rides flatcars. Throwing it into a passing wagon and catching it at the next station is the signature trick (principle 2).

### Data model sketch (`src/sim/rail.js` and `src/world/rules/rail.js`)

- **Grid.** Nodes sit every 4 terrain cells (5 m) at integer `(ni, nj)`, with 8 headings. A socket is a node plus a heading (Factorio's lesson). Curves are fixed shapes with precomputed integer lengths in cm, so the sim needs no trigonometry; rendering is Local.
- **State `rail` (version 0):**
  - `pieces[{ id, kind, a, b, by, tick }]`, sorted by id;
  - `switches{ id: 0|1 }`;
  - `lines[{ id, stations, t0, s0, len }]`;
  - `handcarRest`.
- **Ops:**
  - `rail.place { kind, ni, nj, h }`;
  - `rail.remove { id }`: only by the piece's builder, within 300 ticks;
  - `rail.switch { id }`;
  - `rail.rest { id, s }`.
- **Validation:**
  - one end joins an open socket, a station or the depot;
  - the piece's era is unlocked;
  - the footprint is free;
  - terrain rise and water depth are within the piece's limits;
  - each player places at most one piece per 3 ticks.
- **Timetable derivation** (integers only, recomputed only when the network changes):
  1. A line is the cycle walked from a station through the current switch settings, in piece-id order.
  2. On a change that affects a line, store `s0` (the position now) and `t0` (this tick), then recompute `len`.
  3. Position is `s = (s0 + v·(tick − t0)) mod len`, so a train never jumps.
  4. On a broken route the train stops at the break, which is visible.
- **Tests:** `test/rail.test.mjs` covers validation, cycle finding and continuity of `s`; add `edits` and `invariants` for the world replay test.

### Three variants, from light to deep

**A. Stations only.** Track appears along authored corridors per era. Players claim stations at discovered spots. This is close to the current draft: cheap, but building isn't play.
- *Smallest prototype:* a fixed loop around home, three authored station sites, a `station.place` op and one timetabled train.
- *Test:* do people ride to somewhere unprompted, and do they wait for the train?

**B. Laying track segments (recommended).** Everything above.
- *Smallest prototype:* behind `?rail=1` on home sand, three pieces (straight, 45° curve, buffer) from one stall. A toy train appears when a loop closes.
- *Test:* do two friends close a loop together without chat, then start a second unprompted? Target under 2 minutes to the first loop, checked with a `dev/scenarios/` motion sheet.

**C. Full Railroads Online-style build.** Freehand splines, cuts and fills, every train driven by hand, coupling, fuel and water.
- Deep, but it fights principles 4 and 10 and inherits Railroads Online's netcode trouble.
- *Smallest prototype:* one Owner handcar on one authored spline (1D physics, presence `hc`) and two-player pumping.
- *Test:* is pumping together funny for five minutes with no destination? If not, deeper driving won't be either. Run this test anyway, because the handcar is B's drivable toy.

**Notes for B:** no new pad slot; instance meshes per piece kind (`npm run perf`); `rail` is a new state, so mixed builds are safe; the draft's "pure function of time" survives through `t0`/`s0`.

## Sources

| # | Source | Status |
|---|---|---|
| 1 | MCV, Mini Metro story: https://www.mcvuk.com/business-news/going-underground-the-story-of-dinosaur-polo-clubs-mini-metro/ | Verified |
| 2 | Mini Metro postmortem: https://www.gamedeveloper.com/audio/postmortem-dinosaur-polo-club-s-i-mini-metro-i- | Verified |
| 3 | Pocket Tactics, Dinosaur Polo Club: https://www.pockettactics.com/dinosaur-polo-club/interview | Verified |
| 4 | Railroads Online, permissions: https://store.steampowered.com/news/app/1696810/view/5842939267349920934 | Verified |
| 5 | Railroads Online, rubber banding: https://store.steampowered.com/news/app/1696810/view/6339469370200509286 | Verified |
| 6 | Railroads Online, client desync: https://store.steampowered.com/news/app/1696810/view/5589599109280058790 | Verified |
| 7 | Railroads Online changelogs by keume, Steam news feed for app 1696810, Oct–Dec 2021 | Verified (feed only) |
| 8 | Factorio FFF #81: https://factorio.com/blog/post/fff-81 | Verified |
| 9 | Factorio FFF #290: https://factorio.com/blog/post/fff-290 | Verified |
| 10 | Factorio FFF #377: https://factorio.com/blog/post/fff-377 | Verified |
| 11 | Factorio FFF #412: https://factorio.com/blog/post/fff-412 | Verified |
| 12 | PCGamesN, Chris Sawyer: https://www.pcgamesn.com/chris-sawyer-transport-tycoon-management-games-and-why-he-hasnt-come-back-pc | Verified |
| 13 | OpenTTD desync docs (command model like Boogle's edits): https://github.com/OpenTTD/OpenTTD/blob/master/docs/desync.md | Verified |
| 14 | Flazm, Train Valley press kit: https://flazm.com/pr-train-valley | Verified (unnamed) |
| 15 | PC Gamer on Tracks: https://www.pcgamer.com/build-the-wooden-train-set-of-your-childhood-dreams-in-tracks/ | Verified ("toy" line is a paraphrase) |
| 16 | Tracks devlog: https://dr-whoop.itch.io/tracks/devlog/43238/update-2nd-august-2018 | Verified |
| 17 | PC Gamer, Stålberg: https://www.pcgamer.com/townscapers-developer-on-how-its-radically-casual-design-is-inspiring-a-new-wave-of-low-stress-builders-to-adapt-the-blueprint/ | Verified |
| 18 | Game Developer, How Townscaper works: https://www.gamedeveloper.com/blogs/how-townscaper-works-a-story-four-games-in-the-making | Verified (paraphrase) |
| 19 | Game World Observer, Islanders: https://gameworldobserver.com/2019/06/14/islanders | Verified |
| 20 | Game Developer, Dorfromantik: https://www.gamedeveloper.com/disciplines/sparking-joy-through-tile-placement-in-idyllic-village-builder-i-dorfromantik-i- | Verified |
| 21 | SpreadTheLoad, Valheim ownership: https://thunderstore.io/c/valheim/p/DeathMonger/SpreadTheLoad/ | Verified (community) |
| 22 | Switch reviews and Steam forums: Train Valley, Tracks, Dorfromantik, Townscaper, Satisfactory | Secondary |
| 23 | Railroads Online spline auto-grade and session size (patch summaries) | Secondary |

**Gaps:** no primary source for Railroads Online's design intent, Satisfactory or Valheim netcode, Train Valley's design, gamepad or touch building UX, or why Mini Metro's line-drawing is fun.
