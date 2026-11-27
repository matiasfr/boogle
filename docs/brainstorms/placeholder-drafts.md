> **Status: taken 26 November 2026 (owner: "For now, let's take your recommendations on the dialogue.  We can always refine later."); items 1 to 4 apply to kept[0] only and item 17 took A**

# Placeholder copy drafts

Every item below quotes the current placeholder with its `file:line`, notes in one line who says or shows it and when, and offers three short options in Boogle's voice (goofy, warm, brief). One option per item is marked **(Pick)**.

---

## 1. Button's lines for the kept item (`SHOP.kept`)

Button is the clerk at Fine Prices: proud, literal, and has never once charged anyone. These four lines cycle in turn when you keep an item (`src/entities/town/shop.ts:214`).

### 1. Kept item — line 1
- **Current:** `'Yours. The receipt would cost more paper than the hat.'` (`src/entities/town/town-lines.ts:251`)
- **Who / when:** Button says this in a speech bubble when you keep an item at Fine Prices (1st in rotation).
- **A (Pick):** `Yours. Please don't tell the price tag.`
- **B:** `Sold! For nothing. My favourite number.`
- **C:** `All yours. I'll put the zeroes back in the drawer.`

### 2. Kept item — line 2
- **Current:** `"That's a fortune you've saved. Spend it wisely."` (`src/entities/town/town-lines.ts:252`)
- **Who / when:** Button says this in a speech bubble when you keep an item at Fine Prices (2nd in rotation).
- **A:** `A huge discount today. Same as yesterday.`
- **B (Pick):** `You just saved forty million. Don't spend it all at once.`
- **C:** `Put it on your tab. The tab is also zero.`

### 3. Kept item — line 3
- **Current:** `'Very official. Nobody will know.'` (`src/entities/town/town-lines.ts:253`)
- **Who / when:** Button says this in a speech bubble when you keep an item at Fine Prices (3rd in rotation).
- **A:** `Wear it proudly. Walk out slowly so it looks paid for.`
- **B:** `Sharp. The mannequins are going to be jealous.`
- **C (Pick):** `Looks expensive. Don't worry, I won't tell.`

### 4. Kept item — line 4
- **Current:** `"Suits you. That's extra. It isn't."` (`src/entities/town/town-lines.ts:254`)
- **Who / when:** Button says this in a speech bubble when you keep an item at Fine Prices (4th in rotation).
- **A (Pick):** `Suits you. That'll be nothing, plus tax, which is also nothing.`
- **B:** `No refunds! Mostly because there's nothing to give back.`
- **C:** `A fine choice. The price went up just watching you put it on.`

---

## 2. First house resident's name and lines (retired engine driver)

The resident who moves into the first bought house (`plot3`, beside the hall), whose front room holds a live model railway of the lines built so far (`docs/decisions-characters.md#d-2026-11-19-first-house-resident`, `docs/brainstorms/first-house-resident.md`). All 13 fields live in `RESIDENTS.driver` (`src/entities/town/town-lines.ts:162-186`).

### 5. Resident's name (`driver.name`)
- **Current:** `"[owner's line: his name]"` (`src/entities/town/town-lines.ts:163`)
- **Who / when:** Shown as the speaker's name on his dialogue card whenever you talk to him.
- **A (Pick):** `Bram`
- **B:** `Clack`
- **C:** `Toby`

### 6. Intro — panel 1 (`driver.intro[0]`)
- **Current:** `"[owner's line: who he is, a retired engine driver who has just moved in]"` (`src/entities/town/town-lines.ts:165`)
- **Who / when:** First dialogue panel the first time you talk to the retired engine driver inside his house.
- **A (Pick):** `Moved in for the quiet. Then I heard a train and felt right at home.`
- **B:** `Used to drive engines, years back. Retired now, mostly from the climbing-in part.`
- **C:** `Fresh off the line! Well, retired off it. Couldn't stay away from the rails.`

### 7. Intro — panel 2 (`driver.intro[1]`)
- **Current:** `"[owner's line: points at the table where his train set will go]"` (`src/entities/town/town-lines.ts:166`)
- **Who / when:** Second dialogue panel on your first talk, gesturing at the model-railway table filling his front room.
- **A:** `Put the whole railway on the table. Easier on the knees.`
- **B (Pick):** `See the table? Every track you lay outside, I lay in here. Much warmer.`
- **C:** `Brought my own railway indoors. Doesn't even rain on it.`

### 8. Hello bark (`driver.hello`)
- **Current:** `"[owner's line: says hello as you come in and points at the table]"` (`src/entities/town/town-lines.ts:168`)
- **Who / when:** Spoken aloud automatically the first time you step through his doorway.
- **A (Pick):** `Come in! Mind the table, the express is due.`
- **B:** `Oh, hallo! Stand back a bit, you're blocking the little depot.`
- **C:** `Step right in! Careful—my whole line's running on schedule.`

### 9. Ordinary line 1 (`driver.ordinary[0]`)
- **Current:** `"[owner's line: an ordinary line about the railway or the house]"` (`src/entities/town/town-lines.ts:170`)
- **Who / when:** Spoken when you talk to him and he has no new town news (1st in rotation).
- **A:** `Best thing about a little train? When it derails, you just pick it up.`
- **B (Pick):** `I gave up driving the big ones so I could stare at the small ones.`
- **C:** `Nice house. Room for a bed, a kettle, and six metres of track.`

### 10. Ordinary line 2 (`driver.ordinary[1]`)
- **Current:** `"[owner's line: a second ordinary line, said in turn]"` (`src/entities/town/town-lines.ts:171`)
- **Who / when:** Spoken when you talk to him and he has no new town news (2nd in rotation).
- **A (Pick):** `Listen to that whistle outside. Still gives me goosebumps.`
- **B:** `I keep a timetable on the wall. Nobody reads it, least of all the train.`
- **C:** `Used to haul logs all day. Now I haul a mug of tea from the stove.`

### 11. Notice — town (`driver.notice.town`)
- **Current:** `"[owner's line: notices the new neighbours, the riders from his house]"` (`src/entities/town/town-lines.ts:174`)
- **Who / when:** Said once when you visit him after the town grows and neighbours start riding the trains.
- **A:** `Full coaches out there! Nothing makes an old driver happier.`
- **B (Pick):** `Neighbours are piling onto the trains now. Proper rush hour—three of them!`
- **C:** `Heard folks cheering for the platform. Good crowd on this street.`

### 12. Notice — stone (`driver.notice.stone`)
- **Current:** `"[owner's line: notices the town building in stone]"` (`src/entities/town/town-lines.ts:175`)
- **Who / when:** Said once when you visit him after the village starts building in stone.
- **A (Pick):** `Stone walls now! Good—won't rattle when the heavy freight rolls past.`
- **B:** `Look at all that stone. Makes my little wooden station feel underdressed.`
- **C:** `Proper stonework out there. That's a railway town for real.`

### 13. Notice — pier (`driver.notice.pier`)
- **Current:** `"[owner's line: notices the pier is laid and is on his table]"` (`src/entities/town/town-lines.ts:176`)
- **Who / when:** Said once when you visit him after the pier line is laid and appears on his model table.
- **A:** `Had to bolt a leaf onto the table for that pier. Worth it.`
- **B:** `Rails right out over the water! Nearly got my table wet adding it.`
- **C (Pick):** `Put your new pier on the board this morning. Nearly ran out of table.`

### 14. Notice — breaker (`driver.notice.breaker`)
- **Current:** `"[owner's line: notices the breaker taken off its pedestal]"` (`src/entities/town/town-lines.ts:177`)
- **Who / when:** Said once when you visit him after the room takes the breaker off its pedestal at the Works.
- **A:** `Heard a mighty clang from the Works. Somebody's got the big hammer.`
- **B (Pick):** `You lifted the breaker? Mind your toes—and my little bridge.`
- **C:** `That's the sound of rock moving. Means more track for my table soon.`

### 15. Ask — question (`driver.asks[0].ask`)
- **Current:** `"[owner's line: a question about his railway days]"` (`src/entities/town/town-lines.ts:181`)
- **Who / when:** Dialogue button you can click when talking to him.
- **A (Pick):** `Miss driving trains?`
- **B:** `Ever run late?`
- **C:** `Fastest you ever went?`

### 16. Ask — answer (`driver.asks[0].say`)
- **Current:** `"[owner's line: his answer]"` (`src/entities/town/town-lines.ts:182`)
- **Who / when:** His reply when you pick his dialogue question above.
- **A (Pick):** `Every morning. Then I remember the wind in my teeth and stay inside.`
- **B:** `Only once. Blamed a very stubborn seagull. Nobody could prove otherwise.`
- **C:** `Fast enough to lose my cap. Bought a heavier cap the next day.`

### 17. Rumour about The Boogler (`driver.rumour[0]`)
- **Current:** `"[owner's line: his impression of The Boogler, like the other residents' rumours]"` (`src/entities/town/town-lines.ts:185`)
- **Who / when:** Said by the retired engine driver when you ask him `"The Boogler?"` (a resident's rumour, not spoken by The Boogler and not committing what he is).
- **A:** `Never saw him buy a ticket, yet he's always at the next station first.`
- **B (Pick):** `Some say The Boogler's got a timetable nobody else can read. Explains the hat.`
- **C:** `I waved from the cab once and he charged the whistle. Nice chap, mind.`

---

## 3. Voice and ping labels

From `docs/plans/friends-voice.md:120-121` (`Hear`, `Everyone`, `Nearby`, `far`, `Rails here`, `Train!`, `On my way`), implemented in `src/features/voice.ts`, `src/sim/social.ts`, and `src/features/ping.ts`.

### 18. Voice range label
- **Current:** `'Hear'` (`src/features/voice.ts:336`; `docs/plans/friends-voice.md:115, 120`)
- **Who / when:** Shown in the Pause menu's voice row beside the two range buttons.
- **A (Pick):** `Hear`
- **B:** `Voices`
- **C:** `Range`

### 19. Voice range button — room-wide
- **Current:** `'Everyone'` (`src/features/voice.ts:347`; `docs/plans/friends-voice.md:115, 120`)
- **Who / when:** Pressed in the Pause menu's voice row to hear all friends at full volume anywhere in the world.
- **A (Pick):** `Everyone`
- **B:** `Whole island`
- **C:** `All`

### 20. Voice range button — proximity
- **Current:** `'Nearby'` (`src/features/voice.ts:348`; `docs/plans/friends-voice.md:115, 120`)
- **Who / when:** Pressed in the Pause menu's voice row to fade friends' voices by distance.
- **A (Pick):** `Nearby`
- **B:** `Close by`
- **C:** `Earshot`

### 21. Far friend chip suffix
- **Current:** `' · far'` (`src/features/voice.ts:425`; `docs/plans/friends-voice.md:117, 120`)
- **Who / when:** Appended to a friend's dimmed name chip in Pause when Nearby mode is on and they are out of earshot.
- **A (Pick):** ` · far`
- **B:** ` · out of earshot`
- **C:** ` · way off`

### 22. Rail ping label
- **Current:** `'Rails here'` (`src/sim/social.ts:5`; `docs/plans/friends-voice.md:121`)
- **Who / when:** Shown on a world ping card when a player pings a rail stack or the next track bed.
- **A (Pick):** `Rails here!`
- **B:** `Track here!`
- **C:** `Lay here!`

### 23. Train ping label
- **Current:** `'Train!'` (`src/sim/social.ts:5`; `docs/plans/friends-voice.md:121`)
- **Who / when:** Shown on a world ping card when a player pings a train.
- **A (Pick):** `Train!`
- **B:** `All aboard!`
- **C:** `Catch it!`

### 24. Ping reply suffix
- **Current:** `' · On my way'` (`src/features/ping.ts:275`; `docs/plans/friends-voice.md:121`)
- **Who / when:** Appended after a friend's name under a live ping card when they ping back at your marker.
- **A (Pick):** ` · On my way`
- **B:** ` · Coming!`
- **C:** ` · Omw!`

---

## 4. Leg 6's ending prompts

From `docs/plans/greybox-leg6.md:253-262`, implemented in `src/features/ending-card.ts` and `src/entities/route-greybox/leg-view.ts`. None of these is spoken by The Boogler.

### 25. Ending thanks card
- **Current:** `'Thanks for playing (placeholder)'` (`src/features/ending-card.ts:45`; `docs/plans/greybox-leg6.md:262`)
- **Who / when:** Shown on the shared ending card for everyone in the room when someone activates the Original Island's meeting post.
- **A (Pick):** `You made it all the way back. Thanks for playing!`
- **B:** `End of the line—for now! Thanks for playing.`
- **C:** `Rails laid, island reached. Thanks for playing!`

### 26. Meeting post board — before arrival
- **Current:** `'Meeting (placeholder)'` (`src/entities/route-greybox/leg-view.ts:1120`; `docs/plans/greybox-leg6.md:258`)
- **Who / when:** Painted on the standing post on the Original Island's north beach before the room completes the ending.
- **A (Pick):** `End of the line`
- **B:** `Original Island`
- **C:** `Meeting post`

### 27. Meeting post board — after arrival
- **Current:** `'Arrived'` (`src/entities/route-greybox/leg-view.ts:1120`; `docs/plans/greybox-leg6.md:258`)
- **Who / when:** Painted on the same beach post after the ending card has fired (for anyone staying or joining later).
- **A (Pick):** `Arrived!`
- **B:** `Made it!`
- **C:** `Line complete`

### 28. Meeting post interact prompt
- **Current:** `'Arrive (placeholder)'` (`src/entities/route-greybox/leg-view.ts:1508`; `docs/plans/greybox-leg6.md:256`)
- **Who / when:** Interact verb shown when you stand at the Original Island's beach post.
- **A (Pick):** `Ring in`
- **B:** `Mark arrival`
- **C:** `We're here!`

### 29. Meeting post blocked reason
- **Current:** `'Not yet'` (`src/entities/route-greybox/leg-view.ts:98, 1511`; `docs/plans/greybox-leg6.md:256-257`)
- **Who / when:** Blocked prompt shown at the beach post if you swam over before a causeway train has stopped at the island halt.
- **A (Pick):** `Wait for a train first`
- **B:** `No train has arrived yet`
- **C:** `Not yet`

### 30. Post-arrival objective
- **Current:** `'Arrived (placeholder)'` (`src/entities/route-greybox/leg-view.ts:136`; `docs/plans/greybox-leg6.md:253`)
- **Who / when:** Objective line shown after the room finishes the causeway and triggers the meeting post.
- **A (Pick):** `All lines connected! Ride wherever you like.`
- **B:** `You made it to the Original Island.`
- **C:** `Arrived! The whole island's open.`

---

## 5. Garage's hold strings

Trade-line boiler pick holds and refusals (`src/entities/railway/garage-data.ts:168-179`), shown on part pills and panel notes (`src/features/garage.ts:281, 288, 293`) and as deny toasts (`src/entities/railway/garage-view.ts:825`).

### 31. Trade hold note & deny toast (`TRADE_DENIAL['trade-building']`)
- **Current:** `'Held until the line is laid'` (`src/entities/railway/garage-data.ts:170`)
- **Who / when:** Shown under the selected Quick/Strong boiler in the garage panel (and as a deny toast if a swap arrives mid-flight) while that line is still building.
- **A (Pick):** `Locked in until this line's laid.`
- **B:** `Finish laying the line to swap boilers.`
- **C:** `Held while the line's still building.`

### 32. Trade hold tile pill (`TRADE_PILL['trade-building']`)
- **Current:** `'Held while the line builds'` (`src/entities/railway/garage-data.ts:175`)
- **Who / when:** Short status pill on the other boiler's tile in the garage strip while the line is still building.
- **A (Pick):** `Locked while building`
- **B:** `Wait for lay`
- **C:** `Line building`

### 33. Re-pick used pill & deny toast (`TRADE_DENIAL['trade-repicked']` / `TRADE_PILL['trade-repicked']`)
- **Current:** `'Re-pick used'` (`src/entities/railway/garage-data.ts:171, 176`)
- **Who / when:** Status pill and deny toast after the room has already used its one free post-lay boiler swap on that line.
- **A (Pick):** `Swap used`
- **B:** `Final fit`
- **C:** `No swaps left`

### 34. Free swap available pill (`TRADE_PILL.swap`)
- **Current:** `'Swap (once)'` (`src/entities/railway/garage-data.ts:177`)
- **Who / when:** Status pill on the alternate Quick/Strong boiler once the line finishes laying and the one free swap opens.
- **A (Pick):** `Free swap (once)`
- **B:** `Swap once`
- **C:** `1 free swap`
