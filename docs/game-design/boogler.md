# 6.8 The Boogler

A lavender blob (`#b99cff`, about three times as wide as tall) with a face and feet, who speaks with Uzbek words and
dreams of a restaurant. He wears a comically tall black top hat (cosmetic, no collider): brim radius a third of his,
crown half the brim's, about 0.9 m tall (one and a half times his height). It lags and wobbles on springs when he hops and
walks, and is crushed flat like an opera hat while someone rides him, popping back up after. His HUD stays quiet, like Fortnite's NPC markers: a small talk-bubble mark over his head at range, and within
10 m his name plate with your friendship hearts and the interact prompt (hidden again past 12 m). His speech bubbles
show at any range. Off screen, the same mark sits on the screen edge with his distance (full within 35 m, gone by 60 m).

## Wander

- **Sync kind.** Host. The host's brain publishes `g: { p: [x, z], r, w, m }` with `addHostField`; others
  interpolate. Solo tabs and clients that hear no host for 3 s walk him locally. He has a kinematic body, so the ball
  bounces off him and you can stand on him.
- **Behaviour.** Starts on dry land near (6, 22). Home is the garden centre (30, 2.5): he potters within 22 m and is
  pulled back the further he strays; each stop near home has an 8 % chance to start a trip, 70 % of the time to a POI
  (stopping 6 m outside its keep-out disc), otherwise a random mainland spot; he gives up a trip 3 % of the time per
  stop. Walks 1.5 m/s, turns 3.2 rad/s, stays on land between 0.45 and 30 m high, avoids slopes over 0.55 per metre,
  obstacles and the garden patch. Stops and faces anyone talking within 5 m; turns to look at players within 7 m;
  hurries at 2.3 m/s while ridden; flees at 3.4 m/s from wary players within 9 m.
- **Files.** [src/boogler/boogler.js](../../src/boogler/boogler.js), [src/boogler/hud.js](../../src/boogler/hud.js),
  [src/boogler/fx.js](../../src/boogler/fx.js), [src/features/boogler.js](../../src/features/boogler.js).

## Friendship

- **Sync kind.** Local (localStorage `boogle.boogler.<room>`); each player publishes `bg: [act, wary, ev, evN]` so the
  host's brain knows who is talking, riding or wary, and every client plays the pets, hearts and launches.
- **Levels** ([src/boogler/friendship.js](../../src/boogler/friendship.js)):

| Level | Name | Points |
|---|---|---|
| 0 | Stranger | 0 |
| 1 | Familiar face | 20 |
| 2 | Pal | 60 |
| 3 | Friend | 120 |
| 4 | Close friend | 190 |
| 5 | Best friend | 270 |

- **Points.**

| Action | Points | Limits |
|---|---|---|
| Pet (inside the talk) | +3 | 2.5 s apart, 8 scoring pets per 10 min |
| Present: love / like / meh / dislike | +12 / +7 / +3 / −3 (no live item is disliked since the seashore finds were retired) | Repeats of the same kind halve each time; 4 scoring presents per 20 min |
| New story chapter | +6, plus answer points | once per chapter |
| Answers | about −2 to +3 each | small talk scores at most every 3 min (rude answers still cost) |
| Kicked off (launched) | −6 | |
| Too nosy | −4 | goes quiet for 90 s |

Points never drop below 0. Each new level bursts hearts and plays a level-up line. A typical 15-minute visit (a pet
every 2.5 min, a talk every 5, a mango and a coconut) reaches Best friend in about four visits.

## Talk

- Open with E / pad B within 3.6 m ("Talk" shows in his name tag). The talk box types his line at 48 characters per
  second and lists answers; a present answer offers what is in your hand (he turns down key items: the ball). His portrait can be petted.
  On a phone the card keeps off the move stick (the left 45 %): to the right in landscape, at the top in portrait.
- **Easy in, easy out.** Talks are short and you keep playing: walk more than 4.6 m away, hop on his back, open the
  pause view, or press E / Esc / pad B / the close button (on a phone, the main button, which says Leave while you
  talk) and the talk ends at once, with his farewell (by level) as a
  speech bubble over his head (none while he is cross: a kick-off, wary or quiet talk). A finished chapter, small talk
  or present also ends the talk, with a "What else?" line as a bubble (or the level-up line); E opens the menu again.
  The kick-off telling-off ignores distance (you may have flown far), but E / Esc still close it.
- **Bookmarks.** Leave a story chapter halfway and he remembers where (flag `at.<thread>` = `<chapter>.<node>`); asking
  about that thread again picks it up there, opened with "Now, where was I? Ah, yes." or "As I was saying, before you
  ran off..." (`RESUME`).
- **Menu:** "How's it going?" (small talk), one entry per story thread, a present, and goodbye (one press: his farewell
  is a bubble). Greetings and farewells change with your level.
- **Loading.** The conversations (`talk.js` and `lines.js`) are their own chunk, fetched right after start; a talk
  opened before it arrives waits for it. What he says outside a talk (level-ups, pats, ride complaints, "Nope!") is in
  the small eager [src/boogler/barks.js](../../src/boogler/barks.js) ([src/boogler/play.js](../../src/boogler/play.js)).
- **Story threads** ([src/boogler/lines.js](../../src/boogler/lines.js), [src/boogler/talk.js](../../src/boogler/talk.js)):
  `home`, `mom`, `biz`, six, five and six chapters, each unlocking at a level (list in 7.2). The `mom` thread shows
  from level 1 or once `home` has started.
- **Nosiness.** Asking for a chapter above your level deflects (+1 nosy); pushing ("Oh, come on, tell me!") is +2
  nosy and −2 points; some answers are trust-gated and send you elsewhere below a level (+1 nosy). At 5 nosy he goes
  quiet for 90 s. Nosiness wears off at one per minute.
- **Flags** set by answers fill later lines: `mom`, `idea`, `slogan`, plus `kicked` (count) and `recent` (last three
  small-talk topics, so they rotate).
- **As Mario** (6.17, the guest) he is starstruck whatever his mood: one of four short conversations (not the one from
  last time; melon pitch, autograph, haggling, questions), every answer a Mario catchphrase ("Wahoo!", "It's-a me,
  Mario!"). Unscored, though a present still counts.

## Riding and launch

- Stand on him and he carries you. He puts up with a rider for 3.5 + 1.2 × level seconds (1.5 s if wary), complaining
  at 35 %, 60 % and 82 % of that ("Um.", "Hey. Hey!", "Okay, that is enough..."). Then he puffs up for 750 ms and, if
  you are still on, launches you at 10.5 m/s up and 5.5 m/s out (air control is locked for up to 1.1 s), and tells you
  off once you land. Jump off in time and he says "Hmph. Smart."
- Patience recovers at half speed while you are off. Talking while riding: "Get off me first!"

## Forgiveness

- Three unforgiven launches make him **wary**: he runs from you and the talk opens on a "Stay back!" menu with only
  "I'm really sorry about the rides.", a present, and goodbye.
- One launch is forgiven every 4 minutes; a present forgives two; an apology forgives one, at most every 10 minutes.

## Known issues and limits

His position restarts with whoever hosts next. Friendship is per room and per browser. The `ACT` value 3 (old PET)
must never be reused. Related ideas: [proposals/boogler-tech-tree.md](../proposals/boogler-tech-tree.md).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
