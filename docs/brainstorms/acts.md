> **Status: proposed (2026-11-11).** Light brainstorm (one agent, three lenses). Not yet designer-reviewed.

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
