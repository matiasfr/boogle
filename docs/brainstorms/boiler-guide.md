> **Status: proposed (2026-11-18).** Light brainstorm (one pass, three lenses). Nothing built. The character, its
> name and every line it says are the owner's: this brief proposes and writes no copy.

# A guide at the boiler

**Seed** (owner, 18 November 2026, [round-4-notes](../plans/round-4-notes.md) O18-3; backlog row "A guide at the
boiler", P2, scoped): "I wish there was a little guy next to it that gave you direction or you could talk to that told
you what to do. That would help the progression of the game feel more clear." Same gap as Grant's G4 (Far Head to the
trains: found the boiler "with no one to explain it") and G11 (who to talk to next is unclear).

## Pitch

The forge's pedestal (`LINE2_BOILER`, `src/sim/railway-line2-layout.ts:204`) is where the game hands over its big
parts: the proper axe, then the boiler, then the breaker, all on the same plinth (`LINE2_AXE` :208, `WORKS_BREAKER`
`src/sim/railway-works-layout.ts:46`). Three of the forge's little guys already stand round it and wave
(`src/entities/railway/part-hoist.ts:20`), but none of them can be talked to. Give one of them something to say: a
little guy at the pedestal, from the forge's own crew, whose bubble says he has news while a part waits. Walk up, and
he tells you what the part is for and where it goes. While you haul it, he points the way. He goes quiet once the
pedestal's last part has been used. Serves DESIGN 7 (Telegraph everything: the next connection is visible in the
world) by putting a person beside the thing, not text in the HUD. It bends 11 (Show, don't tell) a little, since a
talker tells; the brief keeps the world's cues as they are and adds the guide as the place to ask.

**Gut question:** Standing at the pedestal for the first time, does a new player know what to do with the part and
where to take it, without leaving to look for help?

## What a player doesn't know at the boiler today

The order is decided in the rules: Q5 casts the boiler; fitting it wakes the trains and casts the breaker on the empty
pedestal in the same edge (`src/sim/railway-sys-line2.ts:149-150`); the breaker opens the Works
(`src/sim/railway-queries-works.ts:45`). `npm run loop -- node boiler|trains|breaker` gives each beat's single cue.

| Stage (accepted state) | What the game shows today | What the player doesn't know |
| --- | --- | --- |
| **Forge lit, axe on the pedestal** (optional) | The forge-lit cut; the board's axe mark (forge-made-rewards) | Covered well; included only because the guide could stand here first (see Q3) |
| **Q5 laid, boiler on the pedestal** | Far Head's shot ends on a 2.5 s cut to the pedestal (`forge-cut.ts:1-8`); whistle and plume, repeated every 90 s up to three times (`forge-call.ts:28`); the crane holds it 1.6 m up, the three guys wave within 30 m (`part-hoist.ts:20`); "Pick up" within 6 m (`boiler-view.ts:600-607`), blocked "Empty your back first" (`:627`); the forge rack's board draws the boiler, and "Take rails" is blocked with "These go by train" (`line2-view.ts:90`, `:1317`, `:1404`) | What the boiler is for; that Q6 waits on it; that it goes to the **old train, 172 m away** (`LINE2_OLD_TRAIN`, `railway-line2-layout.ts:209`), which nothing at the pedestal points at; that it is slow to drag and a friend can help. Grant stood 7 m off at 24:57 and the waving guys were the only welcome ([forge-call-handoff](../plans/forge-call-handoff.md)) |
| **Boiler held** | The gold rope; a dashed gold outline of the boiler in the old train's saddle (`boiler-view.ts:140-162`); Q6's sign draws the old train with its boiler dashed (`stock-sign.ts:4-5`); "Fit the boiler" only within 7 m of the train (`boiler-view.ts:634-638`); "Help carry" for a friend (`:654`) | Which way the old train is. The saddle outline and Q6's sign only help once they are in view; at the pedestal nothing faces you towards them. Grant took about 7 minutes from Far Head to the fit, the session's low point (G4) |
| **Boiler dropped** | "Pick up" within 3.6 m of where it lies (`boiler-view.ts:600`) | Nothing new; the guide's pointing would still apply |
| **Fitted: trains run, breaker cast** | The trains wake and the breaker is cast on the same edge (`railway-sys-line2.ts:149-150`); the forge call sounds over the breaker | That the trains now carry Q6's goods (G19: "a sudden lot of trains, unexplained"); that the forge has made something new; that the Works is open as well as Q6 |
| **Breaker on the pedestal** | The pier show's last cut, when Q6 completes (`forge-cut.ts:14`); "Take the breaker" within 6 m (`breaker-view.ts:302-306`); the rack board draws it (`line2-view.ts:1317`) | What it is for (the owner's O18-2: "the smasher: not clear what you are supposed to do with it"); that the Works is next after the pier. Grant passed it at 8 and 10 m, never saw the prompt and stopped: "I don't know what to do now" (G1) |
| **Breaker taken** | "Strike the seam" only within a seam's reach (`breaker-view.ts:316-323`); a glint off the head on the carrier's back (`:257`) | Where the seams are: the Roundhouse slab and the cut's throat, both out of sight of the pedestal |

**No talker covers any of this.** Sleeves, the one talker with directions, has stages that stop at `onward` once the
sea gate opens (`src/entities/railway/greeter.ts:120-128`), and his line there is "Follow the railway onwards"
(`:40`). So the boiler, the trains and the Works have nobody to ask. The Boogler stays a neighbour, not an objective
(`src/features/boogler.css:1-2`), and the acts card has no "Next stop" line: the owner turned that down
([acts](acts.md) status).

## Options

All three reuse the same parts: `folk.addGreeter` / `addLooker` for the body and its `wave` / `chat` moods
(`src/place/folk.ts:293-298`, `Mood` at `:105`); `place/talk.ts`'s `startTalk` for the card (`:64`); the one bubble
(`components/speech-cue/view.ts:7`), whose `…` becomes Talk in reach ([owner call](../agents/owner-calls.md#npc-bubble));
and greeter.ts's pattern of a stage read from accepted state with a line cursor per stage (`greeter.ts:120-149`). Each
is Local presentation over the railway mirror, with no sim, wire, save or `WORLD_NS` change, so two players see the
same guide in the same stage. None gates anything.

### A. Sleeves comes to the pedestal

- **Who:** Sleeves, the yellow greeter, as the forge-call hand-off already proposed (forge-call-handoff proposal 2).
  The owner kept Sleeves' two pedestal lines, one for the boiler and one for the breaker, "for when Sleeves at the
  pedestal is built" ([decision](../decisions-characters.md#d-2026-11-15-grant-queue-copy-good-for-now)).
- **When:** while a part waits on the pedestal. He leaves the town entrance and stands by the pedestal, then goes
  back once it is taken.
- **Talk:** on a prompt, with the unread bubble.
- **Points at:** the part. His kept lines are jokes about lifting, so a line saying where the part goes is still
  needed (owner's to write).
- **Stops:** when the breaker is taken.
- **Cast check:** a face players already know, so it reads as "the person who tells you what's next". But he is the
  welcomer. Moving him away from the town entrance while a part waits leaves his post empty, and standing him beside
  three forge workers puts a townsman among the crew.
- **Cost:** smallest. Add a second spot and two stages to greeter.ts. About 60 lines and one eval.

### B. The forge crew's foreman (recommended)

- **Who:** one of the three little guys who already wave at the pedestal, made distinct: a prop and coat from the
  existing kit, and his own voice. The look, the name and the quirk are the owner's.
- **When:** from the moment a part is cast onto the pedestal until the first seam is struck, which covers every stage
  in the table above. The other two keep waving.
- **Talk:** on a prompt, with the unread bubble while he has a line you haven't heard in this stage. On first
  approach in a stage, within about 10 m, he also says one short line in a bubble, so a player who never presses Talk
  still hears the one thing (owner's to write). The residents' barks already work this way (`residents.ts:175-223`).
- **Points at**, by stage, each line owner's to write:
  - Boiler waits: what it is for, and that it goes to the old train.
  - Boiler held: which way the train is, by pointing his arm towards it as you leave. This needs a new `point` mood.
  - Fitted: that the trains now carry Q6's goods.
  - Breaker waits: what the breaker is for, and that the Works is next.
  - Breaker taken: where the first seam is.
- **Stops:** when the first seam is struck. He goes back to work like the other two (`hammer`).
- **Cast check:** this is the cast already standing there, and the same forge crew whose villager knocks the pack
  together in [forge-made-rewards](../plans/forge-made-rewards.md) ("a little guy knocks it together"). The forge
  makes the thing, and the forge's man hands it over. Sleeves keeps the town; The Boogler is untouched.
- **Cost:** medium. A `createForgeGuide` beside part-hoist.ts that takes over one of its three bodies, plus a stage
  function over `boilerRow` state, `worksRow(w).breaker` and the seams. Factor greeter.ts's stage and cursor into a
  small shared helper so both use it. Add a `point` mood to folk.ts and one eval. About 200 lines.

### C. A guide who goes ahead of the part

- **Who:** a crew member like B's.
- **When and where:** at the pedestal while a part waits; at the old train's receivers while the boiler is held; at
  the pedestal again for the breaker; at the first seam once it is taken. He moves while no player sees him (as Kass
  is at the next shrine in *Breath of the Wild*), so he never crosses tracks in view.
- **Talk:** on approach, with Talk for more.
- **Points at:** wherever he stands, which is the next place. That is the most "show, don't tell" of the three.
- **Stops:** at the first seam.
- **Cast check:** reads as one cast, like B. But in co-op, players split between the pedestal and the train see one
  guide in one place, and he always stands at a place nobody is at yet.
- **Cost:** highest. Four spots, each checked off the rails (four or more waiting little guys stop a train,
  [decision](../decisions-rail.md#d-2026-11-10-waiting-little-guys-stop-a-train)) and against `npm run level-check`;
  an out-of-sight test for the move; one eval per spot. About 300 lines.

## Best suggestions

1. **Build B, the foreman, at the pedestal** (design, creative). The owner asked for "a little guy next to it", and
   three are already next to it, waving with nothing to say. A wave invites a talk that the game then doesn't
   deliver. This closes that gap with the cast that is already there.
2. **A second crew member waves from the old train's saddle while the boiler is held** (creative, design). An
   `addLooker` at the receivers in the same coat colours. It is C's best part at a fraction of its cost (the "key in
   sight of the lock" lens in [progression-flow-layout](../research/progression-flow-layout.md)), and he leaves when the
   boiler is fitted.
3. **One shared "which stage" helper for talkers** (systems). greeter.ts already runs stage, cursor and unread for
   Sleeves. Lift it so the foreman and any later guide declare only a table of stages. It also makes
   starting-area-folk's suggestion 2 (one typed lines file) cheaper when that is built.
4. **He points; the words stay short** (creative). The `point` mood, held towards the next place, carries direction
   for anyone who doesn't read. The line explains the part, and the arm gives the way.
5. **On a skip or a late join, he is already in the right stage** (systems). The stage is read from accepted state,
   never from what this page saw, so a reload, a late joiner or a `?from=` jump finds him saying the current thing,
   as Sleeves does.

**Tensions.** Principle 11 and "words sparingly" ([owner call](../agents/owner-calls.md#world-signs)) pull against a
talker. The answer is that the guide adds no HUD text and only speaks to someone who comes close. A, Sleeves at the
pedestal, already has owner-kept lines, which pulls towards A; B can carry those lines if the owner prefers (question
1). One more Talk prompt goes against starting-area-folk's "keep the talkers few", but that brief is about Home's
square, and the forge has no talker today.

## Shape

- **Sync kind:** Local presentation over the replicated railway rows (`boilerRow`, `worksRow`, `seams`): no new
  state, command, saved field or `WORLD_NS` bump. Talk is per player, as with Sleeves.
- **Reuses:** part-hoist.ts's three bodies and their wave logic, greeter.ts's stage and cursor, `startTalk`, the speech
  cue and the residents' approach bark.
- **Smallest first build:** B without the `point` mood. The foreman takes Talk with marked placeholder lines that say
  "owner's line: <what it must tell>", for the boiler-waits and breaker-waits stages only. Then add the held, fitted
  and seam stages and the point.
- **Risks:** the Talk prompt competing with "Pick up" and "Take the breaker" at 6 m, since Interact picks one target.
  Keep the foreman about 3 m off the pedestal on the forge side, where part-hoist puts them now, with a 3.3 m Talk
  reach as Sleeves has, so the take still wins on the pedestal. Also the three-guys inspect contract
  (`part-hoist.ts:162`), which its eval reads.

## Done means

One look proves it: `npm run look -- --rail-seed boiler`, a player teleported to (922, 6), where Grant stood 7 m off
the pedestal. In the still, the foreman is distinct from the other two at a glance, his bubble shows `…`, and stepping
within 3.3 m turns it into Talk while "Pick up" still wins on the pedestal. Then the same at `--rail-seed trains-on`
for the breaker. Measurable later through the forge-call hand-off's unbuilt "taken within 20 s of first coming within
30 m" mark ([forge-call-handoff](../plans/forge-call-handoff.md), steps table).

## Open questions

1. **Who stands there?** Recommended: B, a forge crew foreman, one of the three wavers, since he is already "a little
   guy next to it". Alternative: Sleeves, whose pedestal lines you kept. Answer: ___
2. **Talk on approach, or only on a prompt?** Recommended: both. A one-line bubble the first time you come near in
   each stage, and Talk for the rest, as the residents bark. Answer: ___
3. **When does he stop?** Recommended: at the first seam struck, so he covers the boiler, the trains and the breaker
   up to the Works. Alternative: only while a part waits. Answer: ___
4. **The second crew member at the old train's saddle while the boiler is held?** Recommended: yes. Answer: ___
5. **Lines:** for each stage, the brief lists what the line must tell (the part's use and where it goes, which way the
   train is, that the trains carry Q6, what the breaker opens, where the seam is). Recommended: build with marked
   placeholders until you write them, as with Sleeves. Answer: ___

## Parked

- A guide at each later handover (the Works rack, the garage), once this one is proven.
- The foreman reacting to a co-op haul ("Help carry"). Cheer when two players lift it together.
- Sleeves' stages past `onward` (the boiler, the trains and the Works) for the town end, if the foreman isn't enough.
