> **Status: first build done (2026-11-11), on `feature/acts`; designer-reviewed and the owner has answered the review's five
> questions** ([decision](../decisions-controls.md#d-2026-11-11-the-game-has-acts)). Built: Acts 1 and 2 only, as the
> review's rulings and the owner's answers set them (Act 1 an aerial move at the first landing, Act 2 over Far Head's
> shared shot, no band); see [first-run](../game-design/first-run.md#acts). The sections below are the brief; where they
> differ (band, 4 s card, "after you stand", drafts of titles) the review and the decision win. Owed: the checkpoint look,
> `npm run look -- --players 2 --rail-seed q5` (page A lays Q5; read Far Head's show, the card once on each page over
> the lit trestle, and a walk input during it; a first-visit page with `--query intro=1` for the Act 1 move).

# Acts: chapter cards for the room's story

**Seed** (owner, 11 November 2026, verbatim): "At the beginning of the game, we should have some sort of full screen,
like, title, like, when you first start, that says, like, Act 1: the beginning. And then when we hit big checkpoints as
a server, maybe we get that on the screen as well, like Act 2, etc. And that way the players have a sense that there is
a considered story and that there are chapters, and sort of they understand that there's an intentional linear nature,
at least somewhat linear, to the game, and that is a motivating factor to progress to find out more about the story and
what changes as well."

**Pitch.** The room's railway progress is cut into a few acts. A big title card names the act: after your first landing
("Act 1"), and for everyone in the room at once when the railway finishes the moment that ends an act (Far Head's show,
the crossing finale, the Meet). The card plays over live play and never takes your hands, camera or input. It lands on
something the world has just changed, so the card names a chapter the world has already shown. The act is worked out
from railway progress that already exists: no new saved state, no wire change, no `WORLD_NS` bump. It serves
**7. Telegraph everything** (the arc and its next chapter can be seen) and **6. Communal world** (an act belongs to the
room). It strains **11. Show, don't tell**, which is why the words stay few and the card follows a change you can see
(question 4). The 1 November "Mechanics before narrative" call is not broken: the cards give the game a structure and
commit to no story details, and the owner asked for them himself.

**Gut question.** When "Act 2" came up after Far Head lit, did you want to know what Act 3 is?

## The acts (working list; every string is a draft)

Acts follow the route as built and planned (docs/direction.md; the rail decisions; the economy model's `ROUTE` in
`dev/economy/ring-data.ts`). Each act ends on a moment the whole room already shares. Titles are the owner's to write.
None is in The Boogler's voice. Only "The beginning" is his own wording.

| Act | Spans | Ends on (room-wide) | Exists today? | Title (draft) |
| --- | --- | --- | --- | --- |
| 1 | The fall, line 1 (T1–T3), the forge, line 2 to Far Head | **Far Head's show**: Q5 laid, lamps and rockets | Built, plays for everyone | "The beginning" (owner's words) |
| 2 | Q6 and the Pier, the breaker, Split-rock Works, the twelve footings | **The crossing finale**: twelfth footing, pull-out to Ring Island, "Next stop: Ring Island" | Built (J5c) | "[draft] Out to sea" |
| 3 | The bents, the glide, the leaf, the gold rivet | **The Meet** (`ring.joined`) | Planned (R4d, v27) | "[draft] The Meet" |
| 4 | The Roundhouse, the branches, High Port, the ring segments | **Closing the ring**: the first full lap | Only in the economy model | "[draft] The ring" |
| 5 | The final crossing | **The Original Island and The Boogler** (the decided ending) | Decided, not designed | "[draft] Back to the first island" |

After Act 5 the archipelago stays open as a toy box, with no card. The roadmap only goes as far as Ring Island, so acts 4
and 5 are placeholders (question 5).

**The story that exists today, honestly.** It doesn't add up to a plot yet. What is there: The Boogler's lore on the
Original Island (the melons, Oyijon, a boat home to Samarqand; he already "talks in chapters", so these are called
**acts**, never chapters); the decided ending, back on the Original Island with him; Ring Island's shard folk (planned);
and the Original Island on the horizon from the very first landing. That last one is the real through-line an act card
can point at: *the island you can see is where this ends*. The cards promise **chapters of a journey**, not a plot. A
chapter count and story teasers would promise more than the game tells (question 4).

## Best suggestions, ranked

1. **The card names the act. It never takes control** (design + systems). Big type over live play. Your camera, hands
   and input stay yours. You can be mid-jump, carrying a footing, seated on a train or on a phone, and nothing stops.
   This keeps the co-op rule "never freeze a friend for someone else's find"
   ([coop-abilities](coop-abilities.md#best-suggestions-ranked)). It also means there is nothing to skip.
2. **Acts end on moments the room already shares** (design). Far Head's show, the crossing finale and the Meet already
   play for every page. The card comes after the moment, as its last beat, so two full-screen moments never stack and no
   new trigger is invented.
3. **Derive the act. Remember only what this browser has seen** (systems). `storyAct(w)` is a pure query over the
   railway's read world. Each browser keeps the highest act it has shown, in the room's existing visit memory. One rule
   covers every case: when the current act is higher than the remembered one, show the current act once. That handles a
   live change, a late joiner, a returning player, someone who was offline for it, and a reload during it. World and
   room resets already forget the visit memory.
4. **Act 1 after the title, not instead of it** (creative). BOOGLE smashes in mid-air. You land and stand up. About a
   second later "Act 1 · The beginning" comes up while the letters lie around you. It reads as title, then chapter, as
   in a film. Use the timber letters' tone, not a new style.
5. **One sting, on the existing SFX bus** (creative). A short procedural two-chord sting. No music system: the groove
   loop is cut, and journey-music recommends proving one of the owner's tracks first. Act changes are where the score's
   arrangement could change later (parked).
6. **One queue for full-screen moments** (systems; owner call "The codebase is the agents' to own"). Today each camera
   pull-out and the reward card each check `busy` for themselves. The act card waits behind a single `momentBusy()` that
   covers active pull-outs, the reward reveal and the open pause view. That is one home for the queue, not a fourth copy
   of the check.
7. **The world answers right after** (design). Each act's first minutes should show a change: Act 2 opens on Far Head's
   lit trestle with the pier still to build, Act 3 with the raised leaf in view across the gap. The card is a caption on that change, not a promise.

**Tensions.** The owner said "full screen". Taking the screen means taking control, and the co-op rule rules that out.
Recommendation: full-screen *type* over a soft band across the picture, with play live underneath (question 1). Design
would like a teaser line under the title to pull players forward. Creative and principle 11 would keep it to number and
title. Recommendation: number and title only until the story has content to tease (question 4).

## The card

- **What and how long:** "ACT 2" small above, the title large below, centred a little above the middle, on a soft dark
  band the width of the screen. 0.6 s in, 2.8 s hold, 0.6 s out: 4 s in all. `pointer-events: none`. Type scales with
  `clamp()` and respects safe areas on phones.
- **Who sees it:** every page in the room, once each, from the derived act (suggestion 3). A newcomer joining a room
  already in Act 3 sees "Act 3" after landing, not Act 1. A returning player who missed a change sees the current act
  on arrival, before the welcome back card.
- **When it waits:** behind an active camera pull-out (it plays after the act's own shot), behind a reward card, and
  while the pause view is open. It never waits on another player.
- **Skip:** none needed, since it blocks nothing. It also takes no input of its own, so the cinematic skip rule is
  unaffected.
- **Reduced motion:** opacity fade only, with no slide or scale.
- **Sound:** one sting as it comes in (suggestion 5), at the SFX bus level of the existing fanfare.

## Shape

- **Sync kind:** Local presentation of Server-replicated railway state. Nothing new is shared. The act is derived
  (`storyAct(w)`: 1, then 2 when Q5 is laid, the same fact Far Head's show reads; 3 when the twelfth pier footing is
  set; 4 when `ring.joined` exists). The "seen" act is local memory. No op, no presence field, no message, no
  `WORLD_NS` bump.
- **Reuses:** the railway read facade (`railwayWorldRead`, `railwayKnown`) as welcome-back uses it; `src/ui/moment-banner.ts`
  (it gains the act-card variant and becomes the one presenter); arrival's room memory (`src/player/arrival.ts`);
  `reducedMotion`; `playMark` for a playtest mark ("act shown", with act, how it was reached and the wait).
- **Smallest first build** (one implementer session, about 250 lines with CSS):
  `src/sim/railway-queries-story.ts` (`storyAct`, acts 1–3 only); `src/features/acts.ts` (an auto-loaded plug-in: reads
  the act, compares it with memory, waits for the first landing on a first visit, and calls the presenter); the card
  and `momentBusy()` in `src/ui/moment-banner.ts` + `.css`; `src/render/camera-pull-out.ts` and
  `src/render/reward-reveal.ts` report to that one busy check; `src/features/welcome-back.ts` holds its card until the
  act card has gone. Greybox type, draft titles in one table in `acts.ts`. Docs: `docs/game-design/first-run.md` and
  `hud.md`.
- **Risks:** the card promises a story that isn't there yet (keep the words few). A stale facade could show a wrong act
  on arrival (only read once `status() === 'ready'`, as welcome-back does). Far Head's show could finish after the card
  if its pull-out isn't covered by `momentBusy()` (the proof checks this). Two tabs in one browser share memory (fine:
  the act is shown once per browser).

## Done means

1. **First visit:** `npm run look -- --players 2 --query 'intro=1'`. After page A stands up, "Act 1 · The beginning"
   shows for 4 s. A walk input during it moves Buddy, so input stays live. Page B, already in the room, sees nothing.
2. **The checkpoint proof (one look, two players):** `npm run look -- --players 2 --rail-seed q5`. Page A lays Q5.
   Both pages play Far Head's show and then "Act 2", each exactly once, with the card starting only after the pull-out
   ends. Page B is seated on a train or has pause open at the time; with pause open, its card comes when pause closes.
   The `act shown` marks list both pids.
3. **Arrival:** reload page B and no card shows. A page with no act memory joins the same room and sees "Act 2" before
   its welcome back card.
4. **Reduced motion and phone width:** a still at 390 px wide with reduced motion. The type fits inside the safe area
   and fades without moving.

## Open questions

Ordered by how much they change the build. The build goes ahead on the recommendations.

1. **Does the card take control?** **Recommended: no. Full-screen type over live play, with no input, camera or skip
   taken**, because of the co-op rule "never freeze a friend for someone else's find" and because a player may be
   carrying something or riding. The alternative is a 3 s held title with the camera parked, used only on the first
   visit. Answer: ___
2. **Where does Act 1 end?** **Recommended: Far Head's show (Q5 laid)**, which is built, already room-wide, and comes
   before the Pier and the Works (the Works opens after Q6). Alternatives: line 1 open (sooner, a smaller beat) or the crossing finale (making
   Act 1 all of Home's shore). Answer: ___
3. **What does a late or returning player see?** **Recommended: the current act's card, once, on arrival (after
   landing on a first visit).** No recap. "The story so far" is parked until there is a story to sum up. Answer: ___
4. **What does the card say?** **Recommended: the act number and its title, no count ("of 5") and no teaser line**,
   until acts 4–5 are designed and the story has something to tease. Titles are yours; only "The beginning" is your
   wording. Answer: ___
5. **What is the arc past Ring Island?** **Recommended: keep acts 4 (the ring, ending when it closes) and 5 (the
   Original Island and The Boogler) as placeholders that follow the economy model's route**, unbuilt until those areas
   are designed. The roadmap stops at Ring Island, so the number of acts after it is a direction call. Answer: ___

## Parked

- "The story so far": a short recap card for someone arriving several acts behind.
- The music arrangement changes per act (journey-music's "world progress selects the arrangement").
- A diegetic echo of each act in the world: the Home hall's line map gains the act's name, or a town crier reads it.
- The owner's own sting in place of the procedural one.
- An end card after Act 5 before the toy box.

## Design review (designer, 2026-11-11)

Docs-only review: no stills were taken and no bot was run, so nothing here was seen on screen. The one look the first
build owes is named at the end. Read: DESIGN.md, owner-calls, the Current rules for controls, characters and core loop
(with the entries cited below), direction.md, the playtests of 8 to 10 November and their tracker, `npm run loop`, the
economy model's `ROUTE`, [narrative-arc](../research/narrative-arc.md), [journey-music](../research/journey-music.md),
[returning-player](../research/returning-player.md), and `src/ui/moment-banner.ts`, `src/features/welcome-back.ts` and
`src/entities/railway/crossing-view.ts`.

**Verdict: cleared to build**, on the recommendations below. Three of them change the brief's build (findings 1 to 3).
Fit: the owner asked for this himself on 11 November, so "Mechanics before narrative" (1 November) is not broken as
long as the cards commit to no plot; "Collaborators may write the narrative" means agents ship no story titles of their
own (call 13). Nothing is ported from Place. No order or scope change: it is one small local feature.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | The game has acts; a full-screen title at the first start and at big room checkpoints | Decided | Owner's seed, 11 November (quoted at the top). It still needs its dated entry in decisions-controls.md |
| 2 | Acts do not use the six eras | Decided | [10 November, eras archived](../decisions-core-loop.md#d-2026-11-10-eras-become-materials-the-six-era-list). The brief complies |
| 3 | A checkpoint card plays on every page in the room | Decided | [10 November, shared moments play for everyone](../decisions-controls.md#d-2026-11-10-shared-moments-play-for-everyone) |
| 4 | They are "acts", never "chapters" | Default | The owner's own word. The Boogler says "Chapter two is probably about friends" (`src/boogler/lines.ts`), so "chapter" is his |
| 5 | Checkpoint cards take no input, camera or skip | New | Agree with the brief. The room is already held once by the act's own shot (uninterruptible, 9 November); a second hold would freeze a friend for a room event they may not be near. **Change:** where the moment has a pull-out, the card comes up over the shot's last 1.5 s and fades as the camera returns, so the title sits on the thing that changed, not on your feet. Pages with no shot (pause open, far away with no camera) get it over live play |
| 6 | Act 1 on the first landing | New | **A held moment, but the one that already exists.** The card comes up on impact, while Buddy lies knocked down among the letters, full screen with no band, and is gone as you stand. It is your own screen and your own arrival, so the co-op rule does not apply (nobody else is frozen), and it adds no time before first control (the fall is already 7.5 s, [2 November](../decisions-controls.md#d-2026-11-02-the-title-is-in-mid-air)). No new 3 s parked camera. The brief's "a second after you stand" puts it over the first seconds of free play, the weakest spot |
| 7 | Act 1 ends at Far Head's show (Q5) | New | Keep. A new room gets there in 13 to 25 minutes (13:17 on 9 November co-op; 25 from joining on 10 November; about 16 active minutes solo on 8 November; the model says 27 plus part of Q4–Q6). Three of the four recorded sessions would never have seen "Act 2" if Act 1 ran to the crossing finale (about 50 minutes for two; the 39-minute solo stalled at the kiln). Seeing one act turn in the first sitting is what teaches that acts exist |
| 8 | Act 2 ends at the crossing finale; Act 3 at the Meet | Default | Both are room-wide and decided beats. Note the lopsided arc in finding 5 |
| 9 | A card shows only for an act whose opening content is built | New | **Changes the brief.** Today that is Acts 1 and 2. Past the twelfth footing the loop graph lists Q7, the bents, the brace, the weights and the rivet as "decided, not built", and on 10 November the owner waited 2.5 minutes at the pier head. "Act 3" over a dead end promises a chapter that is not there. One `built` flag per act in the table; Act 3 turns on with Ring Island build 1 |
| 10 | Acts 4 and 5 stay out of the code; no "of 5" | Default | Agree. The number of acts past Ring Island is a direction call (question 5). Nothing is saved, so renumbering later is free |
| 11 | One small line under the title: "Next stop: (place)" | New | The smallest honest pull forward. It names a built place the line goes next, in the railway's voice, and the game already says it ("Next stop: Ring Island" at the crossing finale). It is a telegraph (principle 7), not a plot promise. No line where the next place is not built; Act 1 has none. Drafts for the owner: Act 2 "Next stop: the Pier"; Act 3 "Next stop: Ring Island" |
| 12 | No plot teaser, no recap, no count | Default | Agree. "Mechanics before narrative"; the story is the collaborators' to write |
| 13 | An act without an owner-written title shows its number only | New | **Changes the brief.** Main deploys to the live site, so a "[draft]" title is a shipped story line. Act 1 ships as "Act 1 · The beginning" (his words); Act 2 ships as "Act 2" with its line until he names it |
| 14 | 0.6 s in, 2.8 s hold, 0.6 s out | Default | Tunable. Fine |
| 15 | Small number above, large title, the timber letters' tone, a soft band at checkpoints | Default | Greybox type. No band on Act 1 (call 6) |
| 16 | One procedural sting | Default | Keep, but stay silent when the act's own show played its fanfare in the last 10 s (the crossing finale does), so two stingers do not stack |
| 17 | The card waits behind a pull-out, a reward card and the open pause view; never on another player | Default | Add the moment banner itself to the queue: the card is a variant of the same element (finding 3) |
| 18 | A first-visit late joiner sees the room's current act at their landing | Default | Same slot as Act 1, so it reads as "you are in Act 2". Principle 8 keeps late arrival secondary; this costs nothing |
| 19 | A returning player gets the act as the first line of the Welcome back card, not a second card | New | **Changes the brief.** Welcome back is the decided home for "what changed" ([1 November](../decisions-controls.md#d-2026-11-01-first-visit-and-returning-visit-are)), and a return "goes straight in" (2 November). A 4 s full-screen card and then a 3.5 s card on arrival is an interruption, and the full-screen card is for the moment, which they missed. One `addWelcomeItem`; no hold in `welcome-back.ts` |
| 20 | Each browser remembers the highest act shown, per room; resets forget it | Default | Fine. Matches "a reset starts the game over" (9 November) |
| 21 | Reduced motion: fade only | Default | Fine |
| 22 | Solo and co-op see the same card at the same beats | Default | Nothing to split; principle 8 |

Decided 3, Default 12, New 7.

### Findings

1. **Change before building: Act 3 has nothing behind it yet (call 9).** The first build ships Acts 1 and 2. This also
   removes the brief's inconsistency between "acts 1–3 only" and "4 when `ring.joined` exists".
2. **Change before building: arrival (call 19).** Done-means 3 has "a page with no act memory" seeing "Act 2" before
   its welcome back card. A page with no memory is a first visit, which falls and has no welcome back card; a returning
   page gets the line on the card. Split that check in two.
3. **Change before building: the crossing finale already has a banner.** `crossing-view.ts` shows "Next stop: Ring
   Island / The crossing has begun" for 4.5 s at the start of the 7 s shot, in the element the act card will share.
   When Act 3 is turned on, that banner becomes the act card's line (one piece of text, not the same words twice).
   Until then it stays as it is. It is UI copy already flagged for the owner, not The Boogler's.
4. **The moments the cards hang on have been missed.** Far Head's rockets were not seen on 8 and 9 November ("no
   cutscene I could see"), and the crossing finale was not seen on 10 November. The card fires from the derived act,
   so it will show either way, which is good: it may be the first thing that makes Far Head land. But "the card names
   a change the world has already shown" is unproven at Far Head. The checkpoint look must read the frame under the
   card, not only that the card appeared.
5. **The arc is front-loaded.** Acts 1 to 3 end at about 20, 50 and 85 minutes of a roughly six-hour game; "the ring"
   and "the Original Island" would hold the other four and a half hours. The 2 November call says each area is "one or
   two hours aimed at something that feels complete". That is fine for a first build of two acts, and it is the reason
   not to number or name anything past Act 3 now.
6. **Act 2's first change is steam, not the sea.** After Q5 the next cue is the forge's plume calling you back for the
   boiler, then trains, then Q6. Suggestion 7's "Act 2 opens on the lit trestle with the pier still to build" is not
   what the player is pulled to first. This matters only for the title, which is the owner's.
7. **Unverified sightline.** "The Original Island on the horizon from the very first landing" has no still behind it.
   No card leans on it in this build; do not write a line that does until a look shows it.
8. **Flow.** The cards place, gate and move nothing. Rule 1 (the next goal can be found) holds after Act 2's card: the
   boiler and Q6 both have cues in `npm run loop`. The kiln, stall, cradle and table have none; that is older than
   this brief and not made worse by it.

**Story beats a card can point at today:** the rail that runs out and drops you (the fall); the forge and steam; Far
Head lit; the Pier facing Ring Island; the crossing. Decided but not built: the Meet and Ring Island's shard religion,
the Original Island ending, and The Boogler as the entrepreneur whose project you were doing all along. His lore
(melons, Oyijon, Samarqand) stays in his own talks; no card quotes it.

**Suspect strings:** none is in The Boogler's voice. "Act 1 · The beginning" is the owner's. "Out to sea", "The
Meet", "The ring" and "Back to the first island" are agent drafts and do not ship (call 13). "Chapter" must not appear
on a card.

**Parked item worth doing second:** the Home hall's line map gaining the act's name. It is the diegetic version
("Signs in the world before hovering text", 9 November) and it lets a player check which act they are in at any time.

### Owner questions

1. **Act 1 on first landing:** the card over the knock-down you already have, full screen, no extra hold? Recommended:
   yes. Alternative: a 3 s held title with the camera parked. Answer: ___
2. **Where Act 1 ends:** Far Head (13 to 25 minutes in, so most first sittings see Act 2), or the crossing finale
   (about 50 minutes, all of Home's shore)? Recommended: Far Head. Answer: ___
3. **The line under the title:** "Next stop: (place)", and number only for acts you have not named? Recommended: yes
   to both. Your titles for Acts 2 and 3: ___
4. **Hold a card until its act is built?** Recommended: yes; Act 3 turns on with Ring Island build 1. Answer: ___
5. **Past Ring Island:** how many acts, and is the whole ring one act? Recommended: leave it unnumbered until the
   Roundhouse and branches are designed; expect more than two, at one to two hours each. Answer: ___

**The one checkpoint look the first build owes:** two players, `--rail-seed q5`, page A lays Q5. Read on both pages
that Far Head's show plays, that "Act 2" comes up once each with Far Head's lit trestle in frame under it, and that a
walk input during the card moves Buddy.
