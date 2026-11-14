# 6.8 The Boogler

A lavender blob (`#b99cff`, about three times as wide as tall) with a face and feet, who speaks with Uzbek words and
dreams of a restaurant. He wears a comically tall black top hat (cosmetic, no collider): brim radius a third of his,
crown half the brim's, about 0.9 m tall (one and a half times his height). It lags and wobbles on springs when he hops and
walks, and is crushed flat like an opera hat while someone rides him, popping back up after. His HUD stays quiet, like Fortnite's NPC markers: a small talk-bubble mark over his head at range, and within
10 m his name plate and the interact prompt (hidden again past 12 m). While wary, the plate says "avoiding you". His speech bubbles
show only while you are on his island (dry land of its grid; Local presentation), not from across the sea or the railway world. Off screen, the same mark sits on the screen edge with his distance (full within 35 m, gone by 60 m).

## Wander

- **Sync kind.** Server. His 10 Hz brain publishes a `booglerLeg` only when the walk, mode or look target changes.
  Every client computes the continuous walk against the room presentation clock, easing from the shown pose on
  a changed leg (snapping beyond 6 m). Joining clients start at the server pose. Sessionless previews run the same
  brain locally; a disconnected live client finishes its leg without inventing a new walk. His position and facing
  are saved, revalidated against dry unblocked land on load, and reset to his start by a room reset or world bump.
  He stands still while the room is empty and resumes there. He has a kinematic body, so the ball
  bounces off him and you can stand on him.
- **Behaviour.** Starts on dry land near (6, 22). Home is the meadow (30, 2.5): he potters within 22 m and is
  pulled back the further he strays; each stop near home has an 8 % chance to start a trip, 70 % of the time to a POI
  (stopping 6 m outside its keep-out disc), otherwise a random mainland spot; he gives up a trip 3 % of the time per
  stop. Walks 1.5 m/s, turns 3.2 rad/s, stays on land between 0.45 and 30 m high, avoids slopes over 0.55 per metre,
  obstacles. Stops and faces anyone talking within 5 m; turns to look at players within 7 m;
  hurries at 2.3 m/s while ridden; flees at 3.4 m/s from wary players within 9 m.
- **Files.** [src/boogler/boogler.ts](../../src/boogler/boogler.ts), [src/boogler/hud.ts](../../src/boogler/hud.ts),
  [src/boogler/fx.ts](../../src/boogler/fx.ts), [src/features/boogler.ts](../../src/features/boogler.ts).
  His pure brain and continuous travel live in `src/world/boogler-brain.ts` and `boogler-shadow.ts` (the name comes
  from its pre-authority validation). Decisions use a private seeded RNG; cosmetic hops cannot change his walks.

## What he remembers

- **Sync kind.** Local (localStorage `boogle.boogler`, one global key); each player publishes `bg: [act, wary, ev, evN]`
  so the server's brain knows who is talking, riding or wary, and clients play ride and gift reactions.
- **Memory** ([src/boogler/memory.ts](../../src/boogler/memory.ts)): whether you have met, learned chapters, answer
  flags, bookmarks, recent small-talk topics, presents and the short-lived grudge after rides. There is no score or
  relationship progression. Existing saves keep their story progress; positive old points or any learned chapters
  count as having met him, and retired fields are dropped when saved.
- **Presents.** He reacts by taste, refuses key items, and remembers repeated kinds and the four-present window
  over 20 minutes for his repeat/capped remarks. Presents still forgive rides; they do not unlock conversations.

## Talk

- Your own talk holds him at his shown spot immediately and turns him toward you, then eases to the server's
  attending leg. Activity changes send presence immediately; its four fields and local copy are unchanged.

- Open with E / pad X within 3.6 m ("Talk" shows in his name tag). The talk box types his line at 48 characters per
  second, pausing on punctuation, and lists answers, with button hints along the bottom; its controls are the shared NPC talk input
  ([npcs.md](npcs.md)): A / E goes on or says the selected answer, D-pad or stick / ↑ ↓ picks, B / Esc leaves; a
  present answer offers what is in your hand (he turns down key items: the ball). His portrait shows his mood and
  squishes when he reacts; it is not a button (no petting).
  On a phone the card keeps off the move stick (the left 45 %): to the right in landscape, at the top in portrait.
- **His voice.** As a line types he speaks in babble, Animal Crossing style with no recordings: a formant synth
  ([src/render/npc-voice.ts](../../src/render/npc-voice.ts)) at 155 Hz says one sound per syllable, shaped by the line's
  letters, so a line always sounds the same. His mood moves the pitch and pace; a question lifts at the end. Skipping,
  leaving or a new line cuts it. Only you hear your talk. He plays on the mix's voice bus, and music and ambience dip 9 dB under him. His speech bubbles stay silent, and so does a line shown at
  once under reduced motion.
- **Easy in, easy out.** Talks are short. You stand still while one is open (the camera turns to frame him), and
  pressing Esc / pad B / the close button (on a phone, also the main button, which says Leave while you talk), opening
  the pause view, hopping on his back or ending up more than 4.6 m away (a ball knocks you) ends it at once, with his
  farewell as a speech bubble over his head (none while he is cross: a kick-off or wary talk). A finished chapter,
  small talk or present also ends the talk, with a "What else?" line as a bubble; E opens the menu again.
  The kick-off telling-off ignores distance (you may have flown far), but Esc / pad B still close it.
- **Bookmarks.** Leave a story chapter halfway and he remembers where (flag `at.<thread>` = `<chapter>.<node>`); asking
  about that thread again picks it up there, opened with "Now, where was I? Ah, yes." or "As I was saying, before you
  ran off..." (`RESUME`).
- **Menu:** "How's it going?" (small talk), one entry per story thread, a present, and goodbye (one press: his farewell
  is a bubble). The first-ever talk uses the introductory greetings and the farewell explaining "goodbye".
  After that, greetings and farewells are picked randomly from all the other former tiers: his instant familiarity
  is the joke. The saved `met` flag remembers the introduction.
- **Loading.** The conversations (`talk.ts` and `lines.ts`) are their own chunk, fetched right after start; a talk
  opened before it arrives waits for it. What he says outside a talk (ride complaints, "Nope!") is in
  the small eager [src/boogler/barks.ts](../../src/boogler/barks.ts) ([src/boogler/play.ts](../../src/boogler/play.ts)).
- **Story threads** ([src/boogler/lines.ts](../../src/boogler/lines.ts), [src/boogler/talk.ts](../../src/boogler/talk.ts)):
  `home`, `mom`, `biz`, six, five and six chapters (see [the lore and chapter list](boogler-lore.md)). Every thread
  appears from the first talk; chapters play in order within each thread, with retells and bookmarks preserved.
  Asking questions never causes a nosiness lockout, and answers have no trust gate.
- **Flags** set by answers fill later lines: `mom`, `idea`, `slogan`, plus `kicked` (count) and `recent` (last three
  small-talk topics, so they rotate).
- **As Mario** (6.17, the guest) he is starstruck whatever his mood: one of four short conversations (not the one from
  last time; melon pitch, autograph, haggling, questions), every answer a Mario catchphrase ("Wahoo!", "It's-a me,
  Mario!"). Presents keep their usual reactions and forgiveness.

## Riding and launch

- Stand on him and he carries you. He puts up with a rider for 3.5 seconds (1.5 s if wary), complaining
  at 35 %, 60 % and 82 % of that ("Um.", "Hey. Hey!", "Okay, that is enough..."). Then he puffs up for 750 ms and, if
  you are still on, launches you at 10.5 m/s up and 5.5 m/s out (air control is locked for up to 1.1 s), and tells you
  off once you land. Jump off in time and he says "Hmph. Smart."
- Patience recovers at half speed while you are off. Talking while riding: "Get off me first!"

## Forgiveness

- Three unforgiven launches make him **wary**: he runs from you and the talk opens on a "Stay back!" menu with only
  "I'm really sorry about the rides.", a present, and goodbye.
- One launch is forgiven every 4 minutes; a present forgives two; an apology forgives one, at most every 10 minutes.

## Known issues and limits

Lead changes no longer restart his position or trip. His memory is per browser, shared by every room. The `bg` presence
shape and all `ACT`/`EV` numbers stay reserved, including retired reactions sent by older tabs. The `ACT` value 3
(old PET) must never be reused. His existing dialogue is preserved, including lines that assume closeness or
patting; inaccessible lines are parked outside the player bundle for the owner's later narrative pass.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
