> **Status: proposed (2026-11-09).**

# Starting-area folk: a few talkers, many movers, one place for their lines

Seed (owner, 9 November): "Can we brainstorm and also streamline adding more goofy lines from little guys in the
starting area? Shouldn't be a ton you need to talk to, and any you do talk to should be slightly distinctive in their own
ways?" The same day he said "there shouldn't be a hard rule against words or beacons, just shouldn't over-use them" and
"I like the idea of using diagetic signage instead of large hovering text" (owner call "Signs in the world before
hovering text"), and asked that the bigger engine show "a little guy in the conductor seat". Home is being rebuilt as
one station (`docs/plans/home-station.md`, `?home=b`).

One agent, three lenses (light mode). Every line below is a **draft** for the owner to react to; none is written into
the game by this brief, and nothing The Boogler says is touched.

## What exists today

- **Six talkers at Home already.** Sleeves the greeter at the square (`src/entities/railway/greeter.ts`, five progress
  stages, three lines each) and five residents in their rooms (`src/proto/place/residents.ts`, words in
  `src/proto/place/town-lines.ts`): Pip (house: wants a job, owns a stamp), Button and Nell (shop: free things, huge
  prices; a customer saving for a hat), Moss and Wren (museum: a literal curator; a believer in The Boogler's powers).
- **Ambient folk:** up to 28 strollers plus porters, riders, commuters and pushers (`folk.ts`), with nonsense babble
  between them (`chatter.ts`) and street barks (`STREET_NOTICE`, `STREET_RUMOURS`).
- **Selection already works:** first meeting → the newest town fact you haven't heard → the next ordinary line, plus
  asks and "The Boogler?" rumours, remembered per player in localStorage (`src/entities/town/memory.ts`).
- **They're less distinct than their writing.** Sleeves and Pip share one voice exactly (330 Hz, 34 cps, 1.25, 4200);
  every talker has the same vowel mix, grain and pitch range, so voices differ only in pitch and speed. Sleeves and
  Wren share the same yellow. Sleeves' lines live in a different file from everyone else's.

## Pitch

Keep the talkers few and make each one unmistakable; let everyone else be life you watch, not people you have to
visit. At Home, five little guys offer Talk, each with one fixation, one prop, one gesture and a voice that differs on
more than pitch; the rest babble, work and bark in passing. Their lines change on what the player can see happen
(progress), on coming back after a while, and on having a friend along, and none of them ever gates anything. Adding a
line is one row in one typed file that `npm run check` validates and a `look` eval previews. Serves **11. Show, don't
tell** (folk react to the world rather than explain it; directions move to the station's real board) and **3. Side
activities are never required**. It bends nothing.

## Gut question

**Did you want to talk to each of them again, and could you tell them apart without reading their names?**

## Best suggestions

1. **Five Talk prompts at Home, everyone else ambient** (design). Sleeves, Pip, Button, Moss, and a new driver in the
   engine's cab. Nell and Wren keep every line but become barkers: they say one to you when you walk in or pass, with no
   Talk prompt. Answers "shouldn't be a ton" without losing any writing, and drops the count from six to five even with
   the driver.
2. **One lines file with typed triggers** (systems). Move `GREETER_LINES` into `town-lines.ts` and add a single
   `EXTRA_LINES` table of rows (`who`, `when`, `say`, optional `weight`, `once`). `who` and `when` are literal unions, so a
   misspelt character or trigger fails `npm run typecheck`; a unit test checks length, duplicates and once-only ids.
   Adding a line becomes one row.
3. **Each talker gets one of everything, and no two share any** (creative). One fixation (the joke engine; Untitled Goose
   Game's villagers get one distinctive reaction each), one prop from the existing `held` boxes, one gesture from the
   existing moods, a unique colour, and a voice that differs in vowel mix, pitch range and cadence as well as pitch
   (`docs/research/npc-babble-voices.md` §4: pitch is only one axis). Fixes Sleeves = Pip and Sleeves = Wren today.
4. **Three kinds of trigger, newest wins, at most one special line per visit** (design, systems). Progress (the existing
   town facts and Sleeves' stages), back after a while (a per-player last-visit time in the same memory), and co-op (two
   or more players in the room, read locally). One special line per character per visit keeps the silence budget from
   `docs/research/little-guys.md`.
5. **A driver in the conductor seat, talkable only while the train stands at the platform** (creative, design). The
   owner's own ask; the `rider` job already seats folk on moving things. When the train is moving he waves and pulls the
   whistle cord: a moment worth a clip, and nobody has to catch a train to hear him.
6. **Directions move into the world** (creative). Under `?home=b`, Sleeves stands by the live line map board at the
   hall's front and points at it as he talks. His stage lines stay as written; the board carries the direction, and he
   carries the joke.
7. **Preview any line in one command** (systems). Add `townsay=<text>` (and `townwho=sleeves`) to
   `dev/look/evals/railway-town.ts`, which already walks up to a resident and talks: a still of the card with that line,
   in that voice, without waiting for its trigger.

## Tensions

- **A new talker against "few".** The driver adds a Talk prompt. Recommendation: he takes the slot Nell and Wren give
  up, so the total still falls.
- **Sleeves gives directions; principle 11 and the signs call prefer the world.** His "Follow the path up to the machine"
  came from the owner's own 8 November ask and stays. Recommendation: keep the copy, and let the station board carry
  direction under `?home=b` so his later lines can stay pure jokes.
- **More triggers against the silence budget.** Away and co-op lines are new reasons to speak. Recommendation: they slot
  into the existing "something new to say" step (one per character per visit), never into barks on a timer.
- **Voice speed.** Talkers type at 26–42 characters/s; the research suggests 8–10 voiced syllables/s. Out of scope
  here; the distinctness pass should tune vowels and range first and leave rate alone.

## The cast at Home

Where they stand assumes `?home=b`; the residents keep their rooms either way.

| Who | Where | Fixation | Prop / gesture | Voice (change from today) | When lines change |
| --- | --- | --- | --- | --- | --- |
| **Sleeves** (talks) | The square; under `home=b` beside the line map board at the hall front | Head of the welcoming department, of one | Sleeves past his hands; waves so they flap, points at the board | Keep 330 Hz; open /a o/ vowels, wide range (±4): eager | Railway stage (as today), back after a while, co-op |
| **The driver** (talks, draft name **Cinders**) | The engine's cab, seated; Talk only while it stands at the island platform | Always exactly on time, though there is no timetable | Whistle cord; pulls it on arrival | Low for a little guy (250 Hz), narrow range (±1.5), clipped grains: a deadpan professional | Each arrival at Home, trains running, co-op |
| **Pip** (talks) | The house | Moved here for the jobs; hasn't found one | Stamp; hammers it | Higher (355 Hz), /e i/ vowels, rising contour: earnest | Town facts (as today), the new station, back, co-op |
| **Button** (talks) | Fine Prices | The prices climb; the things are free | Price board; holds it up | Keep 285 Hz; fast (44 cps), /i/ heavy: a salesman | Town facts (as today), back, co-op |
| **Moss** (talks) | The museum | Everything goes on the table, smaller | Duster; polishes | Keep 240 Hz; slow, /o u/ rounded, narrow range: careful | Town facts (as today), the station on the table, back |
| Nell, Wren (bark, no Talk) | Shop, museum | As today | As today | As today, with Wren off Sleeves' yellow | Their existing lines, said once when you walk in |
| Everyone else (ambient) | Strollers in the square; porters on the island; one hammering at the open stall, one sitting on each ruin outline; commuters on the trains | None | Their jobs | Nonsense babble only | The newest fact and rumours as street barks (as today) |

### Draft lines (for reaction only)

**Sleeves**
- "Welcome back. I kept your spot warm. It's the whole island." *(back after a while)*
- "Two of you! I'll have to welcome twice as hard." *(co-op)*
- "That board shows where the trains are. I show where the board is." *(home=b)*
- "I tried rolling my sleeves up. They rolled me up instead."
- "The station's new. I've welcomed it. It didn't say much."

**The driver (Cinders)**
- "Right on time. I decide what the time is when I get here."
- "Best seat on the island. Also the only seat."
- "Mind the gap. I left it there so you'd have something to mind."
- "Back already? I've been round twice. Same view, faster." *(back after a while)*
- "Room for everyone. Not in here. Out there, on the logs." *(co-op)*

**Pip**
- "There's a station now. Stations have jobs. I'll start by standing near it."
- "You were away ages. I didn't find a job either. We've both been very busy." *(back)*
- "Two of you. Does either of you need an assistant? I have a stamp." *(co-op)*

**Button**
- "You've been away. I kept the prices going up without you." *(back)*
- "Two customers! I'll have to make it free twice." *(co-op)*
- "New station, new prices. The station's not for sale. Yet."

**Moss**
- "We've added the station to the table. It's the small one, for now."
- "You were gone a while. I dusted the sea." *(back)*
- "Two of you. Please lean on the table one at a time." *(co-op)*

## Streamline: adding a line in under a minute

**Where lines live today:** `src/proto/place/town-lines.ts` (residents, street barks, boards, shop, the shore ask),
`src/entities/railway/greeter.ts` (`GREETER_LINES`, Sleeves), `src/proto/place/chatter.ts` (nonsense babble, never
shown). Selection is in `residents.ts` (`open`, `noticeFor`, `turn`) and `greeter.ts` (`stage`).

**Proposed format**: one table in `town-lines.ts`, one row per line:

```ts
// who: a talker or barker id. when: 'any' | a town Fact | a Sleeves stage | 'back' | 'coop' | 'arrival'.
{ who: 'pip', when: 'back', say: '…', once: true },
{ who: 'button', when: 'coop', say: '…' },
{ who: 'moss', when: 'trains', say: '…', weight: 2 },
```

- `'any'` rows join that character's ordinary rotation (`weight` repeats a row in it); trigger rows join the "something
  new" step, newest first, one per visit; `once` rows are remembered by their text in the existing per-player memory.
- **Validation:** literal unions make a bad `who` or `when` a type error in `npm run check`; a unit test (in
  `npm run test:unit`) fails on a line over the card's length, a duplicate, an empty line, or a `who` of `boogler`
  (his copy lives in `src/boogler/` and is never added to here).
- **Preview:** `node dev/look/look.ts --query 'townat=house&townact=talk&townwho=pip&townsay=…' --eval
  dev/look/evals/railway-town.ts` gives a still of the card in that character's voice and colour. A dev-menu entry is
  parked until the eval proves the need.
- **From chat or a doc:** the owner writes `Pip, after the trains: "…"` (or a list of them in a doc); the agent adds the
  rows, runs `npm run check` and the preview, and ships on his say-so. Lines it thinks are weak go back to him as a list,
  never silently trimmed.

## Shape

- **Sync:** Local (cards, barks, voices, poses) and Personal Local (what each player has heard, plus a new last-visit
  time) in `boogle.railway-town.v0:<room>:<pid>`. No op, presence field, message, save or `WORLD_NS` change. The co-op
  trigger reads the room's player count locally.
- **Reuses:** `residents.ts` selection and `Seen` memory (`seenFrom` already drops bad data), `greeter.ts` `stage()`,
  `talk.ts` card, `npc-voice.ts` `VoiceSpec`, `folk.ts` `addGreeter`, the `rider` job and `held` boxes, the look evals
  `railway-town.ts` and `place-town-coop.ts`.
- **Smallest first build:** move `GREETER_LINES` into `town-lines.ts`; add `EXTRA_LINES` with `any`, Fact, `back` and
  `coop`; merge it into the residents' and Sleeves' picks; the unit test; `townsay=`; give every talker a unique voice
  and colour. No new characters and no new lines beyond what the owner approves. Then, on his answers: Nell and Wren to
  barkers, Sleeves beside the board (after home-station's hall lands), the driver (after the engine visual pass).
- **Risks:** `residents.ts` is shared with `?proto=place` until Place retirement, so changes must keep Place working;
  the home-station build moves the square, hall and `sites.ts` feet, so Sleeves' new spot waits for it; a "back" line
  that fires on every reload would grate, so the threshold must be real time away, not a new page.

## Done means

Capture with `look` (`dev/look/evals/railway-town.ts`, seeding stages with `--rail-seed`):

- `townact=talk` for each of `sleeves`, `pip`, `button`, `moss`: the card shows, each in its own colour; in motion,
  each voice is recognisably different from the others with the sound on.
- `townsay=` with a test line for Pip: the card shows that exact line.
- `townat=sleeves` in the asleep, forge and onward stages: his stage line is unchanged.
- A seeded memory with last visit 13 hours ago: the first talker says a `back` line once; a reload does not repeat it.
- Two players (`--players 2`, `place-town-coop.ts`): a `coop` line appears; solo it never does.
- Shop and museum with Nell and Wren as barkers (if answered yes): no Talk prompt on them, and each says one line on
  entry.
- Measurable: `npm run check` fails on a row with `who: 'pipp'`; no two talkers share a colour or a whole `VoiceSpec`.

Whether they're funny and distinct enough stays the playtest's question. Not tested on a device.

## Open questions

1. How many little guys should you be able to talk to at Home? **Recommended: five (Sleeves, the driver, Pip, Button,
   Moss); Nell and Wren keep every line but only bark, with no Talk prompt.**
   Answer: ___
2. Should the driver talk? **Recommended: yes, only while the train stands at the Home platform, one line per arrival;
   built after the engine visual pass. Waving and the whistle when it's moving.**
   Answer: ___
3. Where does Sleeves stand in the new station? **Recommended: beside the live line map board at the hall's front,
   pointing at it while he talks; his lines unchanged.**
   Answer: ___
4. Should folk notice you've been away? **Recommended: yes, one line, once, from each talker after 12 hours or more
   away; never on a reload.**
   Answer: ___
5. Should folk notice you've brought a friend? **Recommended: yes, a few lines only when two or more players are in the
   room, about "two of you", never naming anyone.**
   Answer: ___

## Parked

- `npm run folk`: print every line by character, with trigger, for a writing pass and a list of suspect lines (systems).
- A dev-menu "Say a line" entry for previewing on a device (systems).
- Folk react to a honk or a pratfall with one gesture each, Goose-style (creative).
- A running gag that pays off across characters: Pip's stamp turns up on Moss's table (creative).
- Recorded syllable banks per talker instead of the synth (`npc-babble-voices.md` recommendation 2) (creative).
- A Short / Off setting for NPC babble (`npc-babble-voices.md` §5) (systems).

## In flight

`npm run inflight` (9 November): no branch touches the folk, residents, greeter, talk or town-lines files. Two ship
branches (`ship/matias-franco-d110a43`, `ship/matias-franco-4225d8b`) edit `docs/brainstorms/README.md`; the
home-station plan (proposed, not building) owns the square, hall and `sites.ts`, so Sleeves' move waits for it.
