# Where Boogle could go: eight directions

*Proposal, 29 October 2026. Broad directions for the game, each with what it draws from, which [DESIGN.md](../../DESIGN.md) principles it serves and bends, a first slice to test it, and a sign it isn't working. They are meant to be mixed. The evidence is in [progression-feel-exploration.md](../research/progression-feel-exploration.md); the lore tree that can tie them together is [boogler-tech-tree.md](boogler-tech-tree.md).*

*Updated 30 October 2026 for `main` at `8b3517c`. Two directions from the newer reports on `main` are now included as G (storm tide, [ambitious-mechanics.md](../research/ambitious-mechanics.md)) and H (restore the island, [communal-progression.md](../research/communal-progression.md)). The owner's decisions in [docs/tech-plan.md](../tech-plan.md) also apply: keep the caves, The Boogler and the video pipeline; the server stack is pending.*

Today Boogle is a set of good toys (the ball, sand, water, mushrooms, gifts, The Boogler) on an island a playtester called "still sort of empty". These directions are different answers to *what keeps a group coming back*. A–F come from my research; G and H come from the other two reports on `main`. None of them is the obvious answer. Each one changes what a session feels like.

## Before any direction: two plumbing fixes

The communal-progression report found two gaps that block every direction that persists or grows.

1. **The snapshot server may not be deployed.** If it isn't, a different friend hosting next week starts from an empty island. This is the owner's pending call (Fly.io and TURN, `server/README.md`).
2. **Nothing changes while nobody hosts.** `world.epochMs` is saved but never read. The fix is a capped, grow-only `world.catchup(n)` op, applied once by the host on load.

Directions A, B, C, E, G and H all assume both. F and D mostly don't.

---

## A. The Emporium: an idle bazaar at the heart of the island

**Pitch.** The Boogler opens his stall, and the island slowly becomes a market. A Boat Fund jar fills while nobody is online. He spends it himself on visible upgrades: an awning, a teapot, a boat part. Visitors push the rate up just by turning up, and more so when there are several of them.

- **A session:** you drop in, notice the stall has a new awning, hand him a mango, ring the bell, then go play ball.
- **Draws on:**
  - Pecorella's exponential-cost seesaw;
  - A Dark Room ("always ... something new on the screen when the player tabbed back"; unlocks timed to affordability);
  - Lantz (growth you can "hold in your hands");
  - Animal Crossing's different-visitor bonus.
- **Serves:** 9 (leave something), 4 (more visitors, faster growth), 6 (the money is The Boogler's, not shared).
- **Bends:** 1 (toys before chores). Incremental loops pull people toward optimizing. Cow Clicker is the warning.
- **Cost:** low. One pure integer module (`src/sim/ledger.js`), Lockstep, plus props.
- **First slice:** pages 3.1 to 3.5 of the tech tree, which are the stall, pricing, the sign, the bell and passive income.
- **Not working if:** players hand him gifts mechanically and stop playing with the ball, or they check the jar and leave.

## B. The Long Way Home: exploration by raft, buggy and sandbar

**Pitch.** The sea opens up. A few small islets within sight, a sandbar at low tide, currents that coconut letters reveal, and vehicles to get there. The playtest finding was that "the fun will be playing together in a smaller space". So this is *more places*, not *more acres*: each islet is tiny and holds one mystery.

- **A session:** someone spots a glint on the far islet. Three of you build a melon raft, the ball comes along, the raft capsizes halfway, and you find a suzani scrap.
- **Draws on:**
  - BotW's triangle rule and "gravity";
  - A Short Hike's landmarks and collectables used as lures;
  - Sable ("seeing something in the distance and journeying out to it");
  - Lonely Mountains' scenic route plus three tiers of shortcuts;
  - A Dark Room's Dusty Path ("from a numbers game into an exploration game").
- **Serves:** 10 (capsizing), 7 (the sandbar and tide are visible), 8 (anyone can paddle along).
- **Bends:** 2 (vehicles compete with the ball unless the ball rides along). It also bends the small-island finding if islets drift too far apart.
- **Cost:** medium to high. Owner-kind vehicles, new terrain, tuning. See [vehicles.md](vehicles.md).
- **First slice:** the soapbox buggy on the existing lighthouse hill, with no new land at all. If the buggy is fun, the islets are worth building.
- **Not working if:** people ride once for the novelty, and nobody goes back without a reason.

## C. The Island Remembers: a mystery told by the place

**Pitch.** Every palm grows something different, things wash up, and there is an abandoned mine, a wine cellar and a lighthouse nobody built. Why? Knowledge is the progression: suzani scraps, stitched-sand patterns and the book's stuck pages. Once you know a pattern, you can use it.

- **A session:** you notice a pattern on a scrap matches the shape of the windmill farm. You dig it into the beach, and the windmills spin wildly. Your friend watches and does it too.
- **Draws on:**
  - Outer Wilds ("exploring because they're curious about the world, and not for any other reason");
  - Tunic's manual ("made for someone else");
  - Smith and Worch's "What happened here?";
  - Pikmin's treasure notes;
  - Hades' reactivity.
- **Serves:** 7, 9 and 1 (patterns are toys in themselves).
- **Bends:** 8 and 4. Knowledge gates are single-player by nature: someone who finds out first can spoil it, and newcomers feel behind. No designer source tells us how co-op handles this. It's an open question.
- **Cost:** low to medium. Mostly content: lines, scraps and a pattern matcher over terrain edits.
- **First slice:** one scrap, one stitch (pomegranate palms), and three Boogler margin notes.
- **Not working if:** players look the answer up from each other in chat instead of noticing it in the world.

## D. Toybox physics: systems that make fun happen

**Pitch.** Skip content and add parts. Wheels, sails, coconuts, planks and hinges combine with the ball, water and sand. The game is whatever friends build: a ball catapult, a water wheel lifting water to a terrace (already a stretch item in PLAN.md), a mushroom trampoline array.

- **A session:** someone bolts a sail to a cart and a coconut to a plank. The ball goes into orbit. Everyone screams.
- **Draws on:**
  - TotK ("Rather than create something fun, create a system that makes fun things happen"; "Everything, without exception, being physics-driven");
  - Lonely Mountains' unofficial shortcuts that the physics allowed and nobody planned.
- **Serves:** 1, 2, 10. This is the most toy-first direction.
- **Bends:** "Small and readable". Nintendo expected "chaos". Joints in multiplayer are also Owner-kind objects with tricky ownership, which is the hardest networking in this list.
- **Cost:** high, open-ended.
- **First slice:** one hinge and one plank (a seesaw catapult) that throws the ball.
- **Not working if:** building takes longer than the laugh it produces.

## E. Coconut Post: a gentle, asynchronous social layer

**Pitch.** You leave notes for whoever comes next. Letters ride coconuts and wash up later. Smiles mark things you liked, and things that collect smiles from different people last. The lighthouse is the post office. Letters from Oyijon arrive every couple of real days.

- **A session:** you arrive alone at 7 a.m. Three letters are waiting, one from your friend who played at midnight. You add a line and throw it back. Then you read Oyijon's newest letter and learn about the fourth melon.
- **Draws on:**
  - Death Stranding ("you can see the tracks and traces"; "likes" as "unconditional love");
  - Kind Words (no likes, three couplets);
  - Journey (no names; anyone can join and anyone can finish alone);
  - A Dark Room's narrative feed for returning players.
- **Serves:** 8, 9, 4 and 5 (positive-only marks), and it makes being alone on the island better.
- **Bends:** nothing in DESIGN.md. The risk is moderation of free text: Kind Words spent "so much of my development time" on it.
- **Cost:** low. Text in Lockstep state, a schedule function, lines as pure data.
- **First slice:** coconut letters (5.1) and the lighthouse mailbox (5.3).
- **Not working if:** nobody writes back.

## F. Stay tiny: polish the toys, add seasons, no progression

**Pitch.** The counter-direction, so it's a real choice. No tech tree and no jars. Boogle stays a toy, and you spend the effort on feel: better water, splashier sand, The Boogler's reactions, weekly island events (a storm, a festival, a whale). Principle 1 taken to its end.

- **Draws on:**
  - Swink (feel as "real-time response, simulated space, and polish");
  - Juice It or Lose It;
  - The Art of Screenshake;
  - PEAK ("just a terrain to climb up") and R.E.P.O. ("fail quickly"): friendslop hits are small and focused.
- **Serves:** 1, 2, 10, and "Small and readable".
- **Bends:** 9 is weaker without growth, though events can still leave marks.
- **Cost:** whatever you want, and it's always shippable.
- **Not working if:** friends stop dropping in after the novelty wears off.

## G. Storm Tide: the world's clock *(from ambitious-mechanics.md)*

**Pitch.** A telegraphed tide rises every few minutes. You see a swell line 45 s ahead, low holes flood, and walls hold water back. A king tide every third cycle brings a heavy crate that only moves with two pushers. The ball can smash a breach in a sea wall. Squalls roll in under visible clouds.

- **A session:** the swell appears, someone yells, three of you pile a wall, the ball breaches it on purpose, and the king-tide crate washes up.
- **Draws on:** From Dust, Timberborn, BotW's weather, Teardown's command sync, R.E.P.O., Helldivers 2 (all cited in that report).
- **Serves:** 7, 5, 4, 2 and 10. It is the "missing third" of DESIGN.md's core loop.
- **Bends:** maybe 1, if the tide feels like a chore. PLAN.md's open question is whether it's "fun or stressful". The communal report advises parking wet-sand slumping (walls sag "right after" building) and the forecast ghost.
- **Cost:** medium. A prototype branch was built (about +5,200 lines). Keep the tide clock and the crate first.
- **First slice:** the tide clock alone, with `?tidefast=1`.
- **Not working if:** friends feel anxious instead of building together.
- **Feeds the others:** the tide is the clock for B (rafts, sandbar) and the delivery system for H (flotsam fills wants).

## H. Restore the island: a short, finite arc *(from communal-progression.md)*

**Pitch.** The lighthouse starts dark and the windmills start still. Each wants 3–5 *different* things friends do anyway: a fruit knocked down by the ball, a shell, a grown mushroom, three friends ringing a bell together. Once satisfied, a landmark changes for good and becomes a new toy. Progress shows only as world state. A plaque names who did it. The arc ends after about 8–15 wants.

- **A session:** you come back and the lamp is half lit. A plaque says "Ana, Leo". You knock a mango down with the ball and the third lens glows.
- **Draws on:** Stardew bundles, Animal Crossing: New Leaf public works, Viva Piñata, Terra Nil, Townscaper, Death Stranding, Sky, Lost Garden.
- **Serves:** 9, 4, 6, 2 (each landmark leaves a new toy for the ball) and 1 (no visible counters).
- **Bends:** little. The risk is Sky's finding that clear goals made players ignore each other.
- **Cost:** low. Three small registered states (catch-up, landmarks, island log).
- **First slice:** the lighthouse lamp with 3–4 wants and a plaque.
- **Not working if:** someone ignores their friends to chase a want.
- **Fits the book:** H is the mechanism and the [tech tree](boogler-tech-tree.md) is its story. Its pages are the landmark wants, and The Boogler narrates them.

---

## Side by side

| | A Emporium | B Long Way Home | C Remembers | D Toybox | E Post | F Tiny | G Storm Tide | H Restore |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Toys before chores (1) | at risk | ✓ | ✓ | ✓✓ | ✓ | ✓✓ | ✓ (tune it) | ✓ |
| Ball stays the star (2) | add tie-ins | needs the ball aboard | ✓ | ✓✓ | neutral | ✓✓ | ✓✓ (breach) | ✓ |
| Automatic cooperation (4) | ✓✓ | ✓ | at risk | ✓ | ✓✓ | ✓ | ✓✓ (crate) | ✓✓ |
| Drop-in, drop-out (8) | ✓✓ | ✓ | at risk | ✓ | ✓✓ | ✓✓ | ✓ | ✓✓ |
| Leave something for the next visitor (9) | ✓✓ | ✓ | ✓ | ✓ | ✓✓ | weaker | ✓ | ✓✓ |
| Slapstick (10) | neutral | ✓✓ | at risk | ✓✓ | neutral | ✓✓ | ✓✓ | neutral |
| Build cost | low | med–high | low–med | high | low | any | medium (prototyped) | low |
| Networking risk | low | medium | low | high | low | low | low | low |

## Ways to combine them

- **Restore, with a story (a suggestion, not a decision):** H as the mechanism, the [book](boogler-tech-tree.md) as its story (season 1: the stall and the lighthouse), E's coconut post once the lighthouse is lit, G's tide clock as the rhythm, and B's raft as the next bundle. This is where all three reports agree: a short finite arc, progress as world state, growth while away, and the ball at the centre.
- **Spine plus tentpole:** E + A as the spine, B as the tentpole. Post and the Emporium are cheap, make every return visit different, and fit every principle. The buggy and the raft are the big new toys. Book chapters 3, 4 and 5.
- **Tide-first:** G + H. The tide delivers flotsam, the flotsam fills landmark wants, and the crate gives personal hats. Closest to PLAN.md's own Phase 6.
- **Mystery-first:** C + E. Letters and scraps tell the island's story. Low cost, high charm, with the spoiler risk to watch.
- **Physics-first:** D + B. Contraptions and vehicles. The most chaotic and the most expensive. Choose this if the group plays mainly for laughs together.
- **Tiny-plus:** F, plus Oyijon's letters from E. Minimal progression, but returning players still get a reason to look.

## Questions only you can answer

1. **Who is Boogle for in a year?** The same 2–4 friends, or friends of friends? The answer changes how much moderation (E) and onboarding (C) you need.
2. **How much should be unreachable alone?** Regulars gate pages in the tech tree. A solo player progresses slower but still progresses. Is that the right balance?
3. **Which ending?** The tech tree's back cover offers three: he leaves and returns with Oyijon, the island is a blob, or Samarqand comes here. You don't have to pick now. Townsend didn't ("everything fell into place").
4. **Is farming coming back?** Chapter 6 (Hospitality) is written to work with or without crops.
5. **How long should the island grow while empty?** No source in my report sets an offline cap; 12 hours is a guess. The communal report suggests capping at one to three in-game days.
6. **Deploy the snapshot server?** Every persistent direction needs it. This is your pending call in the tech plan.
7. **Sand magic or pattern stones?** The book's chapter 7 now uses coarse pattern stones, because the communal report says no goal should ask for a shape of sand. Digging the pattern is more magical, but fussier.

See [methodology.md](methodology.md) for how to build whichever mix you pick.
