# Business for Beginners: a lore tech tree for Boogle

*Proposal, 29 October 2026. A progression tree that grows out of The Boogler's story and unlocks features. It is a menu to pick from, not a plan. Each idea cites the game or designer it borrows from; the evidence is in [progression-feel-exploration.md](../research/progression-feel-exploration.md) and [_primary-source-notes.md](../research/_primary-source-notes.md). Nothing here is built.*

*Updated 30 October 2026 against `main` at `8b3517c`: it now fits with the newer [communal-progression.md](../research/communal-progression.md) and [ambitious-mechanics.md](../research/ambitious-mechanics.md) reports and the owner's decisions in [docs/tech-plan.md](../tech-plan.md). The changes are summarised in "What changed on main, and what it means for the book" below.*

## The conceit

A book has already washed up on the beach. It's a gift in `src/sim/gift-catalog.ts`:

> *"'Business for Beginners.' The pages are stuck together. I will read it cover to cover. Again."*

The Boogler has read chapter one ten times. He guesses chapter two "is probably about friends". **The tech tree is that book.** Each node is a stuck page. When the island finishes what a page needs, the page peels open. The Boogler reads it aloud and gets it gloriously wrong, and something new appears on the island.

The device does several jobs at once:

- **It's diegetic and readable.** The book is a real object you can open. Stuck pages show a corner and a smudged title, so you can guess at them but not read them. Shouldice wanted Tunic's manual to feel like it "was made for someone else", where "getting to study a mysterious page feels like mystery-solving." Unread pages are the telegraph (principle 7), and the reveal is a surprise (Candy Box: "this surprise aspect is what I'm trying to achieve").
- **It gives every page a narrator.** The Boogler misreads business advice the way Olimar misnames Pikmin treasures ("ridiculous names and descriptions by the clueless Captain Olimar"). The lore lives in his marginal notes, not in tutorials ("A full-screen tutorial popup feels deeply invasive", Shouldice).
- **The arc is already written.** In `src/boogler/lines.js` the Emporium earns enough to buy a boat, and he goes to Samarqand to tell Oyijon "I did it". She told him to "Come back fed". The book's last chapter is that trip, so the tree zooms out from a beach stall to the whole sea. That is A Dark Room's "Chinese box": "the scope of the game 'zooms out' to reveal more and more of the world."

## What changed on main, and what it means for the book

- **The owner keeps The Boogler** ("a playtest hit", tech plan, 2026-10-30). The communal report had suggested turning his personal friendship into one island-wide bond. The owner's call stands, so the book keeps the personal ladder and adds the communal layer around it: the pages are the island's, and friendship stays yours.
- **The book wraps the restoration arc; it doesn't compete with it.** The communal report recommends a short, finite restoration: the lighthouse starts dark and the windmills start still, each wants 3–5 *different* things, and progress shows only as world state. That is this book's mechanism. So the stuck pages *are* the landmark wants: the lighthouse lamp is chapter 5's post office (5.3), the windmills are chapter 4's wind (4.5), the stall is chapter 3. The book adds a narrator and a reason, not a second system.
- **It has to end.** The communal report suggests about 8–15 wants across 3–4 landmarks, finishable "in a few weeks of casual sessions" (Terra Nil, Stardew's ~30 bundles). This book has about 45 pages, so it is split into **seasons** (see "Seasons" below). Season 1 is about a dozen pages. The rest come later, the way Sky and Deep Rock Galactic bring seasons back.
- **Nothing grows while nobody hosts, yet.** `world.epochMs` is saved but never read, so every "while you were away" idea here (the Boat Fund, the apricot, Oyijon's letters) needs the communal report's capped, grow-only **`world.catchup(n)` op** first. The snapshot server isn't deployed either; that's the owner's pending call in the tech plan. Until both exist, a different friend hosting can start from an empty island. These are the two prerequisites for everything below.
- **Grow while away, never decay while away.** This rule comes from Animal Crossing's history in the communal report, and it now applies to every page: nothing players made or planted expires.
- **Together moments use the honk chord.** `src/sim/social.ts` already detects 3+ *different* players acting within about a second. The bell (3.4), the sumalak stirring (6.4) and any "ring it together" page use that detector. Once it changes shared state, the host detects it and stamps an op. Each gate also has a slower solo path (`min(3, players online)`).
- **The storm tide is the clock.** The ambitious-mechanics report recommends a telegraphed tide and a king-tide crate that needs two pushers. Here, the sandbar (8.2) uses the same tide function, Gary's boat parts arrive in king-tide crates (8.1), and that report calls rafts (4.6) "the best next bundle".
- **No goal asks for a shape of sand.** The communal report: "keep sand as a toy and stop asking it to carry progression", and simplify the shovel to one dig verb. Chapter 7's stitch-the-sand idea broke that rule, so it now offers a coarse version (7.2).
- **Controls are tight.** Every interaction now goes through one button with a glyph prompt, and pad slots are close to full (check `freeSlots()` in `src/player/controls.ts`). Vehicles board with the interact button and drive through a context layer (`wrapAction`, the way `feel.js` turns pile into a dive while swimming), not new buttons. See [vehicles.md](vehicles.md).

## Rules every page follows

1. **The book is communal and the rewards are personal** (principle 6). Which pages are open, and how far each page has got, is island state. Each player keeps a **partner card** (localStorage, like Boogler friendship) listing the pages they helped open. That card is where cosmetics come from: hat colours, ball patterns, your name on the sign, your bread stamp.
2. **Nobody spends anybody's anything.** Players *give* things to pages, the way Stardew's Community Center bundles take items "designed not to be grindy, but rather to encourage players to explore the various facets". The one pot of money on the island is **The Boogler's Boat Fund**, and only The Boogler spends it, on his own upgrades. There is no shared wallet, because the wallet isn't ours.
3. **Pages are gated by *partners*, not by piles.** Universal Paperclips caps compute with "human trust". Animal Crossing's flower odds climb with each *different* visitor who waters. So each chapter also needs a number of **regulars**: different people who have helped the book, plus one extra regular for every three different days someone came back alone. A solo player still progresses, just more slowly (principle 8).
4. **No timers as gates, and no pay-to-skip.** Cow Clicker's "click on once every six hours" is the anti-pattern. Elapsed time *adds* to the island; it never locks you out.
5. **Something new when you come back.** "I wanted there to always be something new on the screen when the player tabbed back" (Townsend). The Boat Fund, the apricot tree, Oyijon's letters and the overnight sumalak all move while the island is empty, through the `world.catchup(n)` op. Grow while away, never decay. On join, the change is shown *in the world*: a page that opened while you were away flutters, and the plaque names who did it. The communal report's test is that a returning player should feel grateful to a friend within 60 seconds.
6. **Toys before chores** (principle 1). Every page unlocks a toy that is fun with no goal. If the only reason to do a thing is that a page wants it, the page is wrong.
7. **The ball stays the star** (principle 2). Every chapter gives the ball something new: a ride, a pattern, a goal, a way to deliver. That tie-in is marked 🏐 below.
8. **Some pages do nothing.** aniwey kept candies on the floor as "one of the two useless features of the game!". Each chapter has a joke page that does nothing, or something gloriously pointless.
9. **Counters stay out of sight.** Townscaper's designer left score out because "when you keep score, you play to the score" (communal report). Page needs show as things in the world (a half-filled jar, a lamp with two of four lenses), not numbers. Sky's team found that clear, compelling goals made players ignore each other, so keep needs soft.

## Shape of the tree

```
                               [ Back cover: Exit Strategy ]
                                           |
                      [ 8. Expansion — "Gary. Boats." ]
                         /                          \
   [ 4. Logistics ]  [ 5. Correspondence ]  [ 6. Hospitality ]  [ 7. Branding ]
   carts, buggies,     coconut post,          the qozon,           suzani patterns,
   land yacht, raft    lighthouse, letters    sumalak night        pattern stones
             \              |                   |               /
              +------ [ 3. Location, Location, Location ] -----+
                       the stall, the sign, the bell, the Boat Fund
                                           |
                      [ 2. Friends (assumed) ]  partners, regulars
                                           |
                      [ 1. Know Your Product ]  what exists today
```

Chapters 4–7 can open in any order once chapter 3 is open. Following Soren Johnson's Old World tech deck ("there is no longer a golden path"), each island could get a seeded **order** in which the stuck pages loosen. That way, two friend groups' islands tell the story in a different sequence.

---

## Chapter 1: Know Your Product *(already open)*

What exists today: palms that drop all kinds of fruit, wash-ups, the seed stall, mushrooms, the hotbar, Boogler friendship, the ball. The Boogler's note: *"Chapter one says: know your product. My product is... me? I know me very well. Next chapter."*

## Chapter 2: Friends *(the pages are stuck, so he assumes it)*

- **Unlocks:** the partner card, and the book as an object you can open. It sits on The Boogler's crate, or you take it from his hand.
- **Opens when:** any one player reaches Friend level with The Boogler. This builds on the existing friendship ladder.
- **Sync:** the book's open pages are Lockstep (`registerState`, a bitmask plus integer counters). The partner card is Local, in localStorage.
- **Joke page, *Coin per Bonk*:** a tally of how often the ball has hit The Boogler on the head, island-wide. It does nothing. He quotes it at you. 🏐
- *Draws on:* Hades reactivity ("moments where you feel the game is paying attention"), Candy Box.

## Chapter 3: Location, Location, Location *(the spine)*

The Boogler stops walking around and opens a stall. This chapter is the incremental core.

| Page | The Boogler reads it as | Unlocks | Needs |
| --- | --- | --- | --- |
| 3.1 **A Place of Business** | "Location! I will stand in one location. Revolutionary." | A crate stall by the seed stall, where he spends part of each day. | 10 driftwood, 1 regular |
| 3.2 **Pricing** | "Everything must have a price. The price is: a smile." | Hand him anything and he "sells" it to imaginary customers (seagulls, a crab). He pays in **coins into the Boat Fund jar**, not to you. | 3.1, any 5 different gift kinds |
| 3.3 **Signage** | "A sign! With the slogan!" | A painted sign with the slogan someone picked in his dialogue (the `{slogan}` flag), plus the names of everyone who helped. | 3.2, paint (crushed pomegranate + shell), 2 regulars |
| 3.4 **The Little Bell** | "Ding. That is the sound of business." | A bell anyone can ring. Its chord follows the honk pitch table (`src/sim/social.ts`), so several ringers sound good. Ring it and he shows up. Three *different* ringers within a second (the honk-chord detector, host-detected) count as a "grand opening": confetti, and he gives a speech. | 3.3 |
| 3.5 **Passive Income** | "Money that comes while you sleep! I am very good at sleeping." | **The Boat Fund grows on its own while the island is empty**, at a rate set by the stall's level and how many different visitors came today. | 3.4, 3 regulars |
| 3.6 **Haggling** | "Never pay the first price." | When you hand him something, a timing mini-toy: let him walk away slowly and call him back. A better haggle earns *you* a cosmetic stamp; the fund still gets its coin. | 3.5 |
| 3.7 *Seashell Consulting* (joke) | "Chapter 3, part 7: consult the experts." | You can arrange shells in rows. Over a few minutes they slowly drift back to where they were. "They did not listen. Again." | none |

**The Boat Fund** is the one number the island watches grow, and it is a *thing*, not a HUD counter: a big glass jar that visibly fills with coins, melons and odd wash-ups (Lantz: "hold them in your hands and feel the weight of them").

- The Boogler spends it himself, on a cost curve (Pecorella's seesaw; Cookie Clicker's 1.15). Each purchase is visible: a bigger awning, a second crate, a teapot for the piyola, a hammock, a boat part.
- Purchases are timed to land just as a returning player would notice them. Townsend: "New resource types and buildings appear just as you're reaching the required resources for the next hut".
- Regulars push the rate up. Distinct visitors per day add a multiplier, Animal Crossing style (1 → ×1.2, 2 → ×1.3, 3 → ×1.45, 4 → ×1.6, 5+ → ×1.75, as integer percentages).
- The jar fills while the island is empty, capped at about 12 hours of growth so a month away doesn't skip the whole story. The cap is a tuning guess; no source sets one.
- **Sync:** Lockstep. Coins are an integer counter in the book's state. Growth is a pure function of the elapsed ticks and the counters. The host applies it through the `world.catchup(n)` op on load. That op is the communal report's: the host turns the elapsed wall-clock time into a capped integer tick count once, so `Date.now()` never enters sim code. Costs come from an integer table, because `Math.pow` and `**` are banned:

  ```js
  // cost of the n-th upgrade, 15% growth, integer only (no Math.pow in lockstep code)
  export function upgradeCost(n, base = 40) {
    let c = base;
    for (let i = 0; i < n; i++) c = Math.floor((c * 115 + 99) / 100);
    return c;
  }
  ```

- 🏐 The *Ball Insurance* idea from his dialogue becomes a joke upgrade he buys and is proud of. It pays out a single coin whenever the ball hits him.
- **Bends:** principle 1 if the jar becomes the reason to play. Watch for players grinding gifts into the stall; if they do, lower the coins per gift and raise the visitor multiplier.

## Chapter 4: Logistics *(vehicles and contraptions)*

"Logistics is how melons get from A to B. Last time, B was the bottom of the sea."

Feel numbers and sync for every vehicle are in [vehicles.md](vehicles.md).

| Page | The Boogler reads it as | Unlocks | Sync |
| --- | --- | --- | --- |
| 4.1 *Raft* (joke) | "I built this before. It turned into a hat." | Weave palm leaves into a raft, and it is a hat. A personal cosmetic. | Local |
| 4.2 **The Melon Cart** | "A cart! For carrying! Melons, coconuts, friends." | A two-wheeled push cart. Anyone can push it, and more pushers make it faster (cooperation without asking). Things in the basket stay in the basket. 🏐 The ball rides in it and bounces out on bumps. | Owner (the pusher with the highest epoch, like the ball) |
| 4.3 **Coconut Wheels** | "Round things roll. Coconuts are round. I am round. I will not be a wheel." | Four coconut wheels turn the cart into a **soapbox buggy**: gravity-powered, with no engine, raced down from the lighthouse hill. Other players can give it a push-start. | Owner |
| 4.4 **Puff Boost** | "When I am annoyed I puff up. Puffing is power." | At Good Friend or above (personal), The Boogler will sit in the back of your buggy for a moment. Hold drift and he puffs up (an integer charge, with sparks as the telegraph); let go and he launches you. Then he tells you off, as he does now. | Owner (the driver), friendship Local |
| 4.5 **Doubly Landlocked** | "You cannot sail to Uzbekistan. So: a boat that does not need the sea." | The **land yacht**: a three-wheeled sand-sailer that runs on the island's wind. The windmills show the wind's direction (telegraph). | Owner; the wind is Lockstep without state (a function of tick + seed) |
| 4.6 **Seven Hundred Melons** | "Melons float. Blobs float. Together we float." | The **melon raft**: lash 12 melons (wash-ups or palm fruit) to driftwood, and paddle it out past the surf. 🏐 The ball rides along, and the raft is a moving platform for water polo. With the storm tide, it rides the rising water; the ambitious-mechanics report calls rafts "the best next bundle". | Owner, or Host if seats make ownership messy (the report suggests a host-owned raft with paddle inputs) |
| 4.7 **Buggy Ball** | "Ball insurance pays off." | Dig two sand goals and push the ball between them with buggies. That's a Rocket League nod, but slapstick: soft bumpers, loose physics. | the ball and buggies stay Owner; the goals are terrain edits |

*Draws on:* Lonely Mountains: Downhill (faked stability, simple input, scenic route plus shortcuts), Mario Kart Wii (integer charge, short +20% window, sparks as the telegraph), TotK ("create a system that makes fun things happen"), Rocket League, Sable (the hoverbike came "from the asset store for like, €5").

**Leaves traces:** buggy and yacht wheels leave shallow ruts in sand, sent as tiny dig edits with a rate limit. They fade only when someone smooths them. Kojima: "you can't see other people's faces, but you can see the tracks and traces."

## Chapter 5: Correspondence *(the coconut post)*

"Coconuts are a terrible postal service. Most of them come back. This chapter says: that is a feature."

| Page | Unlocks | Sync |
| --- | --- | --- |
| 5.1 **Write It Down** | Write up to three short lines, put them in a coconut and throw it into the sea. It washes up later on the beach for **whoever visits next**. Letters are anonymous; the coconut is tinted in your colour. Kind Words had no likes so people were "free to talk"; Journey left names out because "most peoples names are very aggressive." | The letter text is Lockstep shared state with a length cap, saved in the snapshot. The beach-arrival time is a seeded function of tick. |
| 5.2 **Return to Sender** | Anyone who finds a letter can add a line and throw it back. Each letter gets three exchanges, then it settles as a keepsake on the shore. This borrows Kind Words 2's "three couplets". | Lockstep |
| 5.3 **The Lighthouse Post Office** | This is the communal report's lighthouse restoration with a story attached. The lamp starts dark and is lit in stages by 3–4 different wants: a fruit the ball knocked down, a shell, a grown mushroom, a three-friend bell. Once lit, the lighthouse becomes a mailbox. Its beam sweeps differently when letters are waiting, so you can read it from across the island (principle 7). The mailbox shows what arrived since your last visit (principle 9). | Lockstep for the mail; the beam is Local, read from it |
| 5.4 **Seagull Courier** | The existing gulls (`critter-gulls`) carry a letter straight to a player who is online, wherever they are. Reliable, unlike coconuts, and much more annoyed. 🏐 A gull can also carry the ball back if it is lost at sea. | Host (one gull, a few numbers) |
| 5.5 **Smiles** | Stamp a smile on something someone built, like a sand castle or a channel. Things with smiles from *different* people slowly earn sparkles, and a big one survives the tide's smoothing. Positive only: there is no frown. This borrows Death Stranding's "Giving 'likes' is giving unconditional love". | Lockstep (an integer count per stamped cell, with a distinct-stamper set) |
| 5.6 **Letters from Oyijon** | Replies from Oyijon arrive on a real-day schedule, one every couple of days. They tell her side: the bazaar, the suzani, what "come back fed" meant, and the fourth melon. The Boogler reads them aloud to whoever is around; anyone who missed one finds it in the mailbox. These are A Dark Room's "a bunch of narrative in their feed" for players coming back. | Lockstep without state (the letter index is a function of the island's day and seed); the lines are pure data like `boogler-lines.js` |
| 5.7 *Ocean Spam* (joke) | Every so often a bottle washes up: "Act now for a free cruise." He complains. | Lockstep (it's already a gift) |

**Risk:** free text, even among friends. Ziba Scott spent "so much of my development time ... on the moderation systems". Rooms are private friend groups, so a length cap and a host-side "clear letters" switch may be enough. The alternative is phrase pickers instead of free text, like Dark Souls' templated messages, which Sky's message system drew on (PC Gamer, secondary). This is a call for the group.

## Chapter 6: Hospitality *(Oyijon's kitchen; optional, like all farming)*

"Hospitality: if they walk in, they eat. Not hungry? They eat. Oyijon wrote this chapter. I am sure of it."

| Page | Unlocks | Sync |
| --- | --- | --- |
| 6.1 **Find the Qozon** | The big iron pot is lost in the abandoned mine in the caves. It is heavy: one player drags it slowly, two carry it at walking pace (R.E.P.O.-style carrying, slapstick on stairs). This is the first reason to go deep into the caves. | Owner while carried; resting place is Lockstep |
| 6.2 *Coconut Osh* (joke) | Cook coconuts in the qozon. The result is a "crime". He will not talk about it, and the item gets the "dislike" reaction from him forever. | Lockstep (it's an item) |
| 6.3 **The Tandir** | Pile sand into a clay oven and bake non: flat, round and stamped with **your own pattern** (a personal cosmetic). Non flies like the frisbee, using the glide in `src/physics/flight.ts`. 🏐 Hit the ball with a flying non and the ball spins. | the oven is terrain plus a prop (Lockstep); a non in flight is Local replay |
| 6.4 **Sumalak Night** | A real-world event in the lore: "Everyone takes turns stirring and singing ... it takes forever." Start the pot at dusk (day-night already exists). Anyone who stirs adds to it, and **more different stirrers make it sweeter**. A steam column marks it for the whole island. At dawn, everyone who stirred gets a bowl (a personal keepsake); visitors who missed it find the pot scraped clean and a thank-you note. | Lockstep (a stir counter and a distinct-stirrer set); the pot is a function of the day cycle |
| 6.5 **Oyijon's Apricot** | Plant one apricot sapling. It grows over **real weeks** into the tallest tree on the island and becomes a landmark, a big triangle in BotW's terms. The Boogler sits under it and counts apricots. Mirrors the tree Oyijon "planted the year I was born". | Lockstep, grown from elapsed time like the planned garden |

## Chapter 7: Branding *(suzani, patterns and the island's nonsense)*

"Every business needs a brand. Oyijon's brand is flowers and pomegranates, stitched on everything. Mine is... round."

This is the fantastical chapter. It answers The Boogler's complaint that "magic should be more practical": the island's magic is *pattern*, and the island obeys patterns stitched into its sand.

| Page | Unlocks | Sync |
| --- | --- | --- |
| 7.1 **Suzani Scraps** | Embroidered scraps wash up and hide in the caves and on islets. Each shows a pattern drawn like a Tunic manual page, with The Boogler's guess written in the margin. Collect them in the book. | each scrap is a Lockstep item; your scrap collection is Local |
| 7.2 **Lay the Pattern** | Each scrap marks 3–5 **pattern stones** somewhere on the island. Bring a matching thing to each stone (a pomegranate, a shell, the ball), or have that many different friends stand on them, and the island responds, once per pattern per day: the **pomegranate stitch** makes nearby palms bear pomegranates; the **wave stitch** calms the surf for a minute; the **sun stitch** spins the windmills fast; the **melon stitch** grows a single golden melon. The input is coarse (be there, drop it there), which follows the communal report's rule that no goal asks for a shape of sand. *Alternative, if you want sand magic anyway:* dig the pattern into the sand. That is more magical, but it bends principle 10 and that rule. | Lockstep: a bitmask of satisfied stones per pattern (the sand version would need a pattern match over terrain edits) |
| 7.3 **Knowing Is Owning** | Once you have seen a pattern work, you know it (it's marked on your card), with no item needed. This is Outer Wilds' "learning new things is the only feedback the player gets". Friends learn by watching each other stitch, which is how Journey and Sky teach without words. | Local (knowledge) |
| 7.4 **Blue Tiles** | The Registon page. Lay the *tile* pattern and a flat patch glazes blue. Glazed patches glow at noon, "like this sea at noon". Players end up tiling a little plaza. | Lockstep (cell paint) |
| 7.5 **Your Pattern** | Patterns you've stitched become **ball skins** and doppi hat embroidery, personal and earned. 🏐 | Local |
| 7.6 *The Fourth Melon* (joke) | A pattern that seems to do nothing. Much later, a letter from Oyijon explains that it is how she carries the fourth melon. It still does nothing. | none |

**Risk:** a pattern that feels fussy breaks principle 10 (slapstick over precision). Keep the patterns big and few, show satisfied stones glowing in the world, and add good sound when a stitch "takes".

## Chapter 8: Expansion — "Gary. Boats."

A business card is already in the gift catalogue: *"'Gary. Boats.' Gary! Gary, if you are out there, call me!"* This chapter is about Gary, who is never seen.

| Page | Unlocks | Sync |
| --- | --- | --- |
| 8.1 **Call Gary** | Once the lighthouse is lit (5.3), the beam can flash out to sea. At the next **king tide** (from the storm-tide cycle), a heavy crate washes up: it takes two pushers to get it above the tideline (the ambitious-mechanics crate). Inside is a boat part and a note: "Gary. Boats. Back soon." Pushers also get the crate's personal hat. | the crate is Host (Boogler pattern); the parts collected are Lockstep |
| 8.2 **The Sandbar** | At low tide a sandbar appears out to the nearest islet and floods again on schedule (principle 7: you watch the water drop). It uses the same `tideAt(tick, seed)` as the storm tide. | Lockstep without state (the tide function) |
| 8.3 **Islets** | Two or three tiny islands, all **visible from the beach** (BotW large triangles; Sable: "seeing something in the distance and journeying out to it"). Each one holds one mystery and one scrap. Reach them on the melon raft, across the sandbar, or by being launched by The Boogler. The playtest note on 2026-10-29 says the big island felt "still sort of empty", so islets should be small and dense, not more acres. | terrain is a pure function; contents are Lockstep |
| 8.4 **Currents** | Coconut letters drift along currents. The book draws them once enough letters have washed up, and then the raft rides them. Knowledge is the map. | Lockstep (a function), drawn Locally |
| 8.5 **Gary's Boat** | The Boat Fund's last purchase: Gary's boat, assembled on the beach from the parts. Big, slow and pushable. Everyone fits; the ball fits. | Owner |

*Draws on:* A Short Hike ("interesting landmarks that would pique people's curiosity"), Lonely Mountains' tiers of shortcuts (sandbar = official, current = semi-official, Boogler launch = unofficial), and Townsend's warning when you "explored beyond their means": waves grow and The Boogler shouts from the shore.

## Back cover: Exit Strategy

The book's final page is the zoom-out. **This is where you, the designers, choose what the story means.** Townsend knew his phases before his story ("everything fell into place"), so this can wait until chapters 3–5 are played. Three candidate endings, each a different direction:

1. **He goes, and comes back fed.** The boat leaves with The Boogler on it, and the island is quiet for a few real days (telegraphed long before). Then he returns with Oyijon, who stays as a second NPC with her own suzani stall and her own rules ("If you walk into her house, you eat"). This is a Stardew-style "permanent, positive change", and it doubles the cast.
2. **The island is a blob.** The last page reveals why every palm grows something different and why everything washes up here: the island is a vast, sleeping blob, drifting past every coast on Earth and collecting seeds for centuries. Blobs float. The new toy is steering it, slowly, toward Uzbekistan, which is doubly landlocked, so it can never arrive. The goofiest option, and it would make the island itself a character.
3. **Bring Samarqand here.** Being doubly landlocked means no boat ever reaches home. The Boogler decides that "Come back fed" meant *be fed*, not *come back*. The ending is the island becoming a little Samarqand: blue tiles, a bazaar, an osh party that people "come from three streets away" for. It's the quietest option and it keeps everyone where they are.

## Seasons

The communal report says the arc should end, after roughly 8–15 wants that a few friends can finish in a few weeks. So the book comes out a season at a time:

| Season | Chapters | Wants | Ends with |
| --- | --- | --- | --- |
| **1: Opening day** | 2, 3.1–3.5, 5.3 | about 12 | The stall open, the sign up, the lighthouse lit, the Boat Fund filling |
| **2: Getting around** | 4 (cart, buggy, raft), 8.1–8.2 | about 10 | A raft at the sandbar and the first king-tide crate pushed ashore |
| **3: The kitchen and the post** | 5.1–5.6, 6 | about 12 | Sumalak night and Oyijon's letters |
| **4: Gary** | 7, 8.3–8.5, back cover | about 10 | Gary's boat and your chosen ending |

Each season can be "finished", and the island stays a toy box afterwards. Later seasons are optional. Season 1 is a complete game on its own.

## Sync summary

Today's APIs (DESIGN.md, "In code"): Owner is `addPresenceField` + `onRemotePresence`, Host is `addHostField` (both in `src/netplay/net.ts`, smoothed with `createSnaps`), and Lockstep is `registerOp`/`registerState`/`onTick` with `submitEdit` from features. One-off events (a bell ring, a page fluttering) are room messages, not state.

| State | Kind | Where it would live |
| --- | --- | --- |
| Open pages, page progress, regulars, Boat Fund coins, contributor names | Lockstep | `src/sim/ledger.js` (pure, integer; it joins the ESLint lockstep list), `registerState('ledger')` |
| Catch-up growth while nobody hosted | Lockstep op | `world.catchup(n)` from the communal report, a capped integer advance |
| Partner card, cosmetics, known patterns, last-seen tick | Local (localStorage) | like `src/boogler/friendship.js` |
| Carts, buggies, yachts, rafts, the qozon while carried | Owner | `addPresenceField`, epoch rule as in `src/physics/ball.ts` |
| The Seagull Courier, the king-tide crate | Host | `addHostField`, like The Boogler |
| Wind, tide, Oyijon's letter schedule, sumalak night | Lockstep without state | functions of tick + seed (`src/sim/sky-clock.ts` style; the tide is the storm-tide `tideAt`) |
| Letters, smiles, pattern stones, ruts, blue tiles | Lockstep, as edits | `registerOp` |
| Bell chords that change state | Lockstep op, host-detected | the honk-chord detector in `src/sim/social.ts`, run on the host |
| Sparks, steam, page-peel effects, the jar's glint | Local | feature modules |

## Where to start, if you want a first slice

1. **Prerequisites, not features.** Deploy the snapshot server and set `VITE_BOOGLE_SERVER` (the owner's pending call in the tech plan), then add the `world.catchup(n)` op. Without both, nothing below survives a change of host or grows between visits.
2. **Season 1's first three pages, behind a proto flag** (`?proto=book`): the book object (chapter 2), the stall (3.1) and the sign with the slogan and contributors' names (3.3). It is a few days of work.
3. **Then the lighthouse lamp (5.3)** as the first real restoration want-set. This is also the communal report's recommended first landmark, so both reports agree on it.

It tests the core bet: **do friends enjoy opening a stuck page together, and do they come back to see what changed and who did it?** If they do, season 2 (cart, buggy, raft, king-tide crate) is the strongest next pick. It rides the storm tide if that lands.
