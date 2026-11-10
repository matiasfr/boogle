> **Status: proposed (2026-11-10).** Docs only. Next: one sim branch (`WORLD_NS` v25) for steps 1–3, then the client
> steps in parallel. The owner answered five calls on 10 November (recorded in [decisions](../decisions.md)); the rest
> are recommendations, logged in [agent-calls](../agent-calls.md).
> **Built, client only (10 November):** step 4's Help carry (the quarry dismount check stays P3), step 5 and step 6.
> Steps 1–3 and step 3's client half wait for the sim branch. Step 5 also stops offering **Turn the table** once the
> wagon is commissioned (the owner's question 5), since the deck then belongs to the choreography.

# The Works' late game: from the stall's sockets to the pier

Seed: the owner's co-op session of 10 November 2026 (live v24, Matias on an iPad, a friend on a desktop; sessions
`mwa8zhlg` then `mwa9y7pw`, about 47 minutes). Overall positive. His notes on this stretch:

- "There were places like the fittings later in the game where I really didn't know what to do... Like fitting the
  moorings on the turntable" (the stall's two footings, **Fit the cradle** and **Turn the table**).
- "I don't know why I have to turn the table when there's nothing that will happen if I do, and I wasn't sure how that
  exactly worked." "The turntable... was kind of janky", and "the roof when it was built was wrong".
- "Do we plan to build up the forge? The forge never completed... It still looks half finished by the end."
- "At one point the train missed me even though I was at the station. It didn't stop for me."
- "The most pain I felt was carrying the footings, because they were really heavy. I couldn't jump sprint with them,
  even if it was slower... it should be relatively easy to bring back to the station if I have multiple people and the
  train takes me. But because the train has to travel the whole route, and it didn't stop for me always, that made that
  part take a really, really long time."

Not designed around: "the train stopped delivering footings and I never got the rockets" is a bug another agent is
fixing.

Serves DESIGN.md **7. Telegraph everything** (the request lever and lamp, the cradle's ghosts, the table only when it
does something), **8. Enjoyable alone and together** (the carry and the train both scale with a crew), **11. Show,
don't tell** and the owner call **Machines show their work physically** (the table carries the wagon round). It bends
nothing.

Research:
- [carrying-and-logistics-play](../research/carrying-and-logistics-play.md) recs 7 and 9: weight as slowness reads as a
  chore outside games built on it; keep one player able to move anything, just slower.
- [train-riding](../research/train-riding.md) recs 4, 6 and 8: one verb on board carries a lot; dead time is the main
  complaint; a train that leaves you behind is the counter-example.
- [roundhouse-trains](../research/roundhouse-trains.md) rec 3: a real trip saved before the service pays.
- [progression-flow-layout](../research/progression-flow-layout.md#the-rules-as-lenses) rules 1 and 3.
- [route-contract](../research/route-contract.md).

## The owner's answers (10 November)

Recorded in [decisions](../decisions.md) the same day; this plan builds on them.

1. **Trains: "Stop on request."** Each halt gets a request stop, a lever that calls the next train to stop, instead of
   stopping everywhere or keeping today's run-through. Then: "if trains stop on request, and otherwise go about their
   business then that means they go faster overall which is nice. maybe we can implement a stop request when on the
   train as a passenger as well". So a train stops at a halt only when someone asks: a player at the halt asks for the
   next train, and a passenger aboard asks for the next halt. Otherwise it runs straight through. Step 1.
2. **Turn the table: "Only when ready."** The prompt appears only once the cradle is fitted and the wagon is ready to go
   out. Step 3.
3. **The forge: "Later upgrade."** Its roof and chimney go on as a later upgrade; this plan proposes the trigger. Step 6.
4. **Firefox: "Yes, at P2."** Firefox is supported; its shader and audio fixes come after the P1s. Not part of this
   plan.

## What the session shows

Times are on session 2's clock (session 3 began at about 27:00 on it). Positions are world metres.

| From → to | Took | What happened |
| --- | --- | --- |
| Kiln lit (21:15) → first footing set (23:14) | 1:59 | Boarded line 2 at the quarry (21:40), sat, stood up and stepped off after 10 s: it was about to head out to Far Head. Walked home with the footing, 166 m in 78 s (2.2 m/s) |
| → second stall footing set (25:22) | 1:43 | Called at the quarry, waited 14 s, walked home again |
| Stall done → cradle rails in (27:57) | 2:35 | The table was turned five times in this gap (25:44–26:01, both players): each turn is accepted and does nothing, because the cradle isn't fitted. He tried on outfits and found a crate. The rails went in before the cradle's footings |
| Cradle footings shouldered (29:14) → set (32:09) | 2:55 | Called at 29:19, boarded at 29:52 (33 s), and the train headed **out**: it had come from Far Head for his call and kept its outward sweep. He jumped off just east of the quarry at about 30:05 and walked back over the hill with the footing (about 80 s). The friend did the same, landed in the sea and swam for 54 s. Called again, waited 21 s, rode home in 17 s |
| Table turned (32:16) → wagon out → pier (33:50) → twelfth pier footing set (35:56) | 3:40 | The wagon service itself was quick: 12 sets in 1:45 |
| **Kiln lit → wagon out** | **11:01** | |
| **Kiln lit → last pier footing** | **14:41** | Two players |

Earlier the same night (13:20–18:30) the train passed the quarry and Far Head halts without stopping on several runs
(village to Far Head at 14:48–15:15, pier to village at 17:15–18:24): it was running straight to a called halt, past
the others.

The boiler's **Help carry**: shown 8 times, pressed 9 (plus two presses with nothing in reach beside it at 12:59 and
13:03). It let go by itself and he took it again.

`npm run loop` (bot model, solo, uncalibrated here) runs kiln lit 16:21 → stall 18:02 (1:41) → cradle 19:09 (1:07) →
table 21:15 (2:06) → crossing 24:50 (3:36): **8:29**. It doesn't model the train going the wrong way, which is why the
owner's pair took 1.7 times the solo model. It lists `stall`, `cradle` and `table` as **NO CUE**, `cradle` as the
route's largest grind (378 m loaded solo), and `table / cradle` as unruled "until he has played it". He has now played
it.

## Why the train passed him (from the code)

The code is `trainStep` and `call` in `src/sim/railway-systems.ts`, and `fixedPre` in
`src/entities/railway/halts-view.ts`.

1. **A call is a run straight to that halt.** With a call pending, the next leg is `to = r.call`, skipping every halt
   between. A friend's call at Far Head sends line 2 from the village past the quarry at speed, whoever stands there.
   This is the run-through the triage saw. Note that place.md's "Trains come last" still says "with someone aboard a
   train runs straight through to the end of the line", but the live sim has no rider rule at all; place.md's line 591,
   "no mid-leg reversal or rider express", is the true one (finding 1).
2. **One call slot per line.** `call` holds one stop, so a later call anywhere on the line overwrites yours.
3. **The call is sent once.** The client calls on stepping onto the halt (`on && !inside[k]`) and never again while you
   stand there. An overwritten call is lost until you step off and on again.
4. **The train forgets which way it was going.** Serving a call behind it leaves `sweep` unchanged, so it comes back
   from Far Head for your call at the quarry and then heads out to Far Head again. Both of the owner's failed footing
   rides were this.
5. **A pending call shortens the dwell to 1.5 s** (`callDwellTicks`) at every stop, so a train standing at your halt
   leaves almost at once if anyone has called elsewhere.

Line 2's full sweep is about 2 min 15 s round: stops at the village (17 m along the line), the quarry (174 m), Far Head
(524 m) and the pier (730 m), with legs of 13.6, 23.2 and 16.0 s each way plus 5 s dwells. Carrying a footing on foot
from the quarry to the stall takes 78 s, so a train heading the wrong way is slower than walking.

## Proposals, ranked

The build order is the rank order: P1 first (the owner's biggest pain), then P2, then P3.

### 1. Trains stop on request (P1; owner-decided; sim, server and client; v25) · size M

#### At a halt: the request lever

A **request lever** stands on each halt platform at the foot of the signal mast, beside the map display: a chunky lever
in a cast frame, with the mast's arm above it. When you pull it:
- the lever stays over with a click, and a lamp on its frame lights;
- the mast's arm drops to "stop";
- the halt's ring holds lit on every map display (train rings blink; this one is steady).

When a train stops for it, the lever springs back with a clank and the arm rises. From a distance the arm is the cue, as
it already is.

- **End halts** (Village line 1, Camp, Village line 2 and the Pier; Far Head while the pier is unlaid) have one handle.
  A train must stop at the end of its line to turn. Pulling the lever there calls a train that is heading away to come
  back now: it turns at its next stop.
- **Middle halts** (Quarry, and Far Head once the pier is open) have **two handles**, one per direction. Each has a
  small enamel plaque naming the end it goes to (**Village**, **Pier**; **Far Head** before Q6). Pull the Village handle
  and the next train **heading for the Village** stops for you. These are a lift's up and down buttons, and they would
  have saved both of the owner's footing rides. (New: the owner said "a lever"; one handle would still let the next
  train carry you out to Far Head.)
- The walk-on call goes: standing on a halt no longer calls anything, only the lever does.
- Each engine carries a destination plate on its front showing the end it is running to, flipped at each turn (Local
  over `sweep`), so you can see which way a train is going before you board.

#### Aboard: the passenger request (owner, 10 November)

- **The press.** While you ride a train, the Interact prompt offers **Request stop: Quarry** (named for the next halt
  ahead that the train would run through). Pressing it makes your Buddy reach up and pull a bell cord along the car's
  roof; the cord is drawn in every car, so the prompt has a thing in the world behind it. Pad, touch and keyboard all
  use the same Interact action (owner call "Input goes through the action interface").
- **Heard.** On the press, your tab plays the cord pull and a single "ding" (Local, instant). When the server accepts
  it, everyone aboard and anyone in earshot hears the bell, a **stop lamp** on the engine's cab front lights amber, and
  the next halt's ring holds lit on the maps. So people waiting on that platform see the train is coming in. The lamp
  goes out when the train stops.
- **Several players.** A request is one bit per halt per direction; the first press sets it and the rest change
  nothing. While it is set, the prompt shows **Stop requested**, greyed, and a second press plays only the local cord
  pull. One bell, one lamp, however many ask. A request from the halt and one from aboard for the same halt and
  direction are the same bit.
- **Too late.** A train cruising at 20 m/s needs about 57 m to stop at its normal braking. A request made inside that
  distance goes to the following halt, and the prompt already names that one, so what you press is what happens. At an
  end halt the prompt isn't offered, since the train stops there anyway.

#### How a train runs

- It stops at a halt only when that halt has a request **in its direction**, or at an end of its line, or at a
  **service stop** (below). Otherwise it runs straight through at cruise, which is what makes trains faster overall.
- **The leg is replanned while running.** Today a leg always runs stop to stop, from a standstill to a standstill. A
  through run becomes one leg to the next stop it will make. When a request lands for a halt ahead that is still beyond
  braking distance, the sim replaces the leg with a shorter one from where the train is now, at its current speed, to
  that halt. The leg row gains its start (cm along the line) and its entry speed. The pose stays a pure function of the
  tick and the row, using only `+ − × ÷` and `Math.sqrt` (DESIGN.md, Determinism).
- **It turns back early** when the only requests lie behind it and none ahead (LOOK, as lifts do). If the request
  behind is at the halt it is reaching, it stops there, reverses and takes you. With nothing requested anywhere it
  sweeps end to end as today, so the world still has moving trains.
- Dwell is 5 s at every stop; the 1.5 s call dwell goes.

#### Cargo and footings need no request

Service stops are decided by the sim from state, so they never wait for a player:
- **Line 2's Q6 kit:** it loads at the village end (an end stop, as now, with its `kitWaitTicks`) and unloads at Far
  Head. Far Head is the line's end until Q6 is laid, so it stops anyway; the rule also makes Far Head a service stop
  whenever `logs` or `rails` are aboard.
- **The footing wagon:**
  - The quarry is a service stop in the outbound direction while the wagon is coupled, has room, the Works rack holds a
    footing and the pier still needs one (`pierOwed > 0`). That replaces today's "calls at every stop on its sweep while
    fetching".
  - The pier is an end, so it stops there.
  - When the wagon has nothing to fetch, the quarry is an ordinary request stop again.
- **Coupling the wagon:** its roll-out counts as a request at line 2's village end, so line 2 comes back within one leg
  to take it (today's hold for up to `rollTicks` stays).
- **Line 1** carries no cargo by train today (the depot cart is its own road), so it has only its two end stops.

#### Sync and server cost

- **State.** `Train.call` (one stop) becomes `Train.req`, a bitmask with two bits per stop, one per direction (at most
  8 bits). Line 2's leg row adds a start position and an entry speed: about three integers per train in state, the hash
  and the snapshot. It costs no bandwidth while running, because the pose is derived from them.
- **The op.** `rail.call {id, dir}`: a halt id and −1/+1 (ignored at an end). The **sim owns the request**: a server-
  stamped lockstep edit sets the bit, and the train's own tick clears it on the stop, so every tab and the headless
  server agree and it survives a save. The server validates the halt and `dir` with `railInt`, and the caller's
  accepted position against either the lever (3 m) or the train's pose at that tick, derived from the row (about 6 m;
  for a rider). A bit that is already set returns 0, so duplicate presses are free and not broadcast. Each accepted
  request is one reliable edit of a few bytes.
- **No** presence field, no new system, no host maintenance.
- The press response is on the press (owner call "Input gets instant feedback"); the lamp, the bell for others and the
  stop come from the accepted edit.
- **`WORLD_NS` v25**, shared with steps 2 and 3. Check `npm run heartbeat` for a live owner session first.
- The production bot (`dev/look/bots/railway.ts`) pulls levers and rings for its stops instead of standing on halts.
  Every route check reruns.

**Times.** A footing at the quarry with the Village handle pulled waits at most one leg (13.6 s from the village, 23 s
from Far Head), not up to the 2 min 15 s round plus the walk back. A rider from the pier to the village no longer
stops twice on the way.

### 2. The footing carry (P1; sim constants, tunables and client; v25) · size S

There are two levers, both cheap.

**a. Two footings by hand, not four (New, recommended).** The cradle takes **8 rails only**, no footings: `WORKS.cradle`
goes from 2 to 0, so `total` goes from 16 to 14 (`stall + pier`).
- The stall's two footings stay the deliberate "before" that the wagon repays.
- The cradle's two were a second "before" that teaches nothing new, and the loop calls them the route's largest grind.
- With a crew of two, the whole by-hand part is one trip.
- The invariants, the loop graph and the bot follow the constant.

**b. The pace.** The footing stops borrowing the great beam's numbers:
- new room tunables `railway.footSoloSpeed` at **300 cm/s** (was the beam's 220) and `railway.footHelpSpeed` at **540
  cm/s** (was 500). These are the boiler's pair: a footing on your back is a lighter load than a log on a rope;
- **sprint allowed** at 1.3 times the carry pace (390 cm/s solo), off while helped;
- **the plain jump allowed.** `footing-view.ts` only turns sprint off, so the "couldn't jump" is likely the slow pace (a
  hop at 2.2 m/s goes almost nowhere). The builder checks it in the build. The second jump, the glide and the hook stay
  off with a footing on your back, so carrying a work item opens no new travel edge
  ([route-contract](../research/route-contract.md)).

That keeps it heavy, a little over half a free walk, and keeps one player able to do it all. Carrying rec 7 says to keep
the speed penalty small; this cuts it from 61% to 46% below a free walk. **Help carry** stays as built (a friend with
an empty back within 5 m), at the new helped pace.

**The smallest change that makes a three-player crew fast is 2a.** With two stall footings, two players each shoulder
one and ride home together. Meanwhile the third takes the 8 rails off the forge rack, 16 m from the stall (beat 6
below), and stands ready. The cradle fits the moment the frame rises, the table prompt appears, and the wagon goes out.
No rule is needed beyond 2a and the request stops.

**Expected time from the kiln lighting to the twelfth pier footing.** These are estimates from the leg times in this
plan; the build re-runs `npm run loop -- run` to replace them.

| Crew | Today | Steps 1 and 2b only | Steps 1, 2a, 2b and 3 |
| --- | --- | --- | --- |
| Solo | 8:29 by the loop's model, more with wrong-way trains | about 7:15 | **about 6:00** |
| Two | 14:41 observed | about 6:45 | **about 4:15** |
| Three | not seen | about 6:15 | **about 3:45** |

Against the area's planned 28 minutes solo ([split-rock-roundhouse](split-rock-roundhouse.md)), this takes about two
minutes off, all of it grind, and leaves the building, the ride and the pier show alone. Through-running also shortens
every ride after it.

### 3. Clarity from the sockets to the wagon (P2; a sim rule and client work; the rule rides v25) · size S–M

The beats, with what each says or shows (built ones marked):

| # | Beat | Shows | Copy |
| --- | --- | --- | --- |
| 1 | Slab struck | Two sockets with dashed gold ghost footings (built, signposting part 2). **New:** a dashed gold ghost of the wagon on line 2 at its wait (s = 9.6 m), from the strike until the wagon stands there: the lock in sight of the key, and the answer to "why a turntable" | none |
| 2 | Two footings set | The frame rises on them and the tarp slides off (built). **New:** the wagon's empty cradle shows **eight dashed gold rails** on its arms, the ghost grammar of the kiln and the sockets | none |
| 3 | At the wagon with no rails | **New:** **Fit the cradle** shown blocked: "Bring rails" (the kiln's "Bring logs or stone" grammar) | proposed, the owner's to reword |
| 4 | Rails in | Each ghost goes as its rail bolts on; at eight the cradle turns brass (built) | none |
| 5 | Ready | **Owner, 10 November: the prompt appears only now.** **Turn the table** shows once the cradle is fitted, while the table faces the stall and the wagon isn't out. The table's handle glints gold (the breaker's glint). The rule matches: `rail.turn` needs `fitted ≥ 0` and the wagon not yet coupled, so an early or late turn is refused rather than accepted and silent | "Turn the table" (existing) |
| 6 | The turn | The shunter pushes the wagon onto the table, **the table turns with the wagon on it**, and the shunter pushes it off onto line 2 into its gold ghost (step 5 makes this physical). The roll-out requests line 2 at the village end (step 1) | none |
| 7 | Line 2 couples | The ghost goes and the train takes the wagon; the map shows it riding with the train (built) | none |

After the wagon couples, **Turn the table** isn't offered again (the owner's "nothing will happen if I do"). Turning the
table back before line 2 couples isn't offered either, so the `ready = −1` cancel path goes.

Throat-first and solo players read the same beats. In co-op, the rails in beat 3 are the natural job for a third
player.

### 4. The boiler's Help carry lets go by itself; the quarry dismount (P2; client only) · size S

**Help carry.** `help-carry.ts` keeps the claim only while the helper's avatar stays within 5 m flat and 2 m of height
of the **holder's avatar**. But the helper is sent to the **dragging end** (`at: drag.grip`), a rope's length and a
boiler's length behind the holder, so an ordinary step of lag crosses 5 m and the claim drops. The fix:
- measure the helper to the grip, not to the holder;
- start within 5 m and keep within 8 m (hysteresis), allowing 3 m of height for decks and bridges;
- while helping, ease the helper's movement toward the grip, so they follow without steering.

It stays an Owner value with the same 1.5 s stale rule. The footing's Help carry uses the same helper.

**The quarry dismount.** Both players jumped off a moving train just east of the quarry halt, and the friend landed in
the sea and swam for 54 s. Step 1 removes the reason: nobody boards the wrong way, and a passenger can ask for the next
halt. If dismounts still happen, P3: the level pass checks where the shore east of the quarry halt lets a swimmer climb
out, without adding a barrier to the railway.

### 5. The stall roof and the turntable's jank (P2/P3; client only) · size S

From the code (`src/entities/railway/roundhouse-view.ts`). **Not seen in a still:** this worktree has no
`node_modules` and the brief forbids symlinking them. The builder takes the stills (BOOGLE_BOT_RANK=2): `stall-done`
from the table toward the stall door, and a video of the turn.

- **The roof is a V.**
  - The cause: `FRAME`'s two roof slopes sit at x = −1.15 and +1.15 with roll −0.5 and +0.5. In the box batch's `YXZ`
    Euler a positive roll lifts a slab's +x end, so both slopes rise outward.
  - The result: a butterfly roof whose valley (y about 22.4) runs through the ruin's cross beams (22.5), under a ridge
    pole floating at 23.65.
  - The fix: swap the signs (+0.5 on the left, −0.5 on the right). The eaves then land on the ruin's posts at 22.4 and
    the slopes meet the ridge. Also close the 1.4 m gap between the new side walls' tops (21.0) and the eaves.
- **The socket rims ignore the stall's yaw**: their edge strips get no `STALL_YAW`. That's invisible at today's −90°
  but skewed on Home B's 190° road, so pass the yaw.
- **The turntable doesn't carry anything.**
  - Today: the deck turns on the press, before anything moves. Then the wagon drives across it at an angle along a
    straight path to the table's centre, and every vehicle's heading snaps at each path corner (`pathAt` returns the
    segment's heading).
  - The fix is one choreography from the beat 6 tick, all Local:
    1. the deck aligns with the stall road;
    2. the shunter pushes the wagon on;
    3. the deck turns for 2 s with both on it (the 3.2 m wagon and the 3.4 m shunter fit the 9.6 m deck);
    4. the wagon goes off along line 2, and the shunter returns the same way.
  - Headings ease through corners: sample the path a bogie's length ahead and behind.
  - The predicted early turn (`want`) goes, since the turn now plays only once the server has made the wagon ready.
- If Home step 6 lands first, build the choreography on Home B's spur, where the table swings 60° (decision 9
  November). It reads `stallShape`, so either order works.

### 6. The forge's finished look (P3; client only, unless the owner prefers a bill) · size S–M

**Port check (owner call "Port from Place only what still fits").** Place roofed the forge with 8 freight crates lifted
on by the dock crane ("hands started it, trains finish it"): the poles came down and it poured rails twice as fast.
Production lit it roofless and said "the roof still waits for trains" (place.md, 6 November), and place-retirement T6b
left the roof to "slice 5's cargo", which was never built. Piece by piece:
- **The roof and chimney:** keep (the owner, 10 November: "later upgrade").
- **The crate and crane economy:** cut. Production has no freight cargo, and it would add a new grind.
- **The doubled pour:** cut. Nobody asked for it, and it would change Q6's pacing.
- **The walk-in workshop (T6b):** keep, opening with the roof.

**Recommended trigger: the crossing.** When the twelfth pier footing is set, the forge is finished as the area's
closing reward. It has cast the boiler, the breaker and every footing.
- **The show:** line 1's next village arrival after `crossing ≥ 0` brings a stack of roof trusses on its car. Two little
  guys lift the roof and the finished chimney cap on, about 20 s, as the scaffold poles come down.
- **Sync:** Local over accepted state. Effects play on the live edge, and a reload or a late joiner sees it snapped. It
  costs nothing in sync and reuses the boiler wake's little guys.
- **The payoff:** the owner sees it "by the end", and every later visitor sees a finished forge.

**The alternative, if "upgrade" means paid:** once the Home works board exists (decision 9 November: upgrade choices are
made at the machine), the roof becomes the forge's first upgrade on offer, with a small bill delivered by train. That
needs sim and the board, so it waits for the board (owner question 4).

## The route, beat by beat

Today's layout. Walk 5.6 m/s; footing 2.2 m/s today, 3.0 m/s proposed; line 2's legs from `trainLegTicks`.

| # | Leg | From → to (world m) | Distance | Time, today → proposed | Lens |
| --- | --- | --- | --- | --- | --- |
| 1 | Kiln lit → rack | kiln (1128, 87) → Works rack (1088, 50) | 54 m on foot | 10 s; the first footing comes 8 s after lighting | The footings rolling down the rollers lead you (built) |
| 2 | Rack → quarry halt | (1088, 50) → (1081, 41) | 11 m loaded | 5 s → 4 s | Rule 1: the lever is on the platform you step onto, its plaque names Village |
| 3 | Wait and ride home | quarry → Village line 2 halt (928, 26) | 157 m of track | wait 14–100 s today, wrong-way rides included → at most one leg (14–23 s); ride 13.6 s | Rule 3: no wrong-way ride, so no dismount into the sea |
| 4 | Halt → stall sockets | (928, 26) → (913, 19) | 16 m loaded | 7.5 s → 5.5 s; after Home step 6, 19–36 m from the island: 9–16 s → 6–12 s | Key in sight of lock: the socket ghosts (built) |
| 5 | Second footing | legs 2–4 again solo, or alongside a friend | | a round trip of about 1:15 solo → about 1:00 | |
| 6 | Rails | stall → forge rack (914.5, 5.4) and back | 16 m each way | 15 s | Rule 1: the cradle's gold rail ghosts and the blocked "Bring rails" |
| 7 | Turn the table | stall → table (918, 12) | 10 m | one press; the shunt runs about 10 s | Ending a beat facing the next: the wagon goes into its gold ghost on line 2 |
| 8 | Couple and ride out | village → quarry (loads 6) → Far Head (runs through unless asked) → pier (1400, −358) | 713 m of track | about 68 s observed → about 55 s | One main line; the map shows the wagon |
| 9 | Pier sets | pier rack (1399, −362) → the sockets at the pier head | a few metres each | 12 sets: 1:45 observed with two | A place to meet in co-op: the pier head |

**The three rules.**
- **Rule 1 (the next goal can be found)** fails today at beats 6 and 7 (the loop's NO CUE, and the owner's "didn't know
  what to do"). Step 3 fixes it.
- **Rule 3 (nobody stranded)** bends at beat 3: a wrong-way train stranded a footing 80 s from the halt and put a player
  in the sea. Step 1 fixes it.
- **Rule 2 (a gate keeps its meaning):** no change. A footing still has to be carried; the train skips distance, not
  the work.

The lenses hold. The idle data agrees with these two findings: 21 s idle at the quarry (1080, 41) in session 3 and 10 s
there twice in session 2, all waiting for line 2.

**Co-op spacing.** The Village line-2 halt is where the crew meets, 16 m from the stall and 16 m from the forge rack.
Three can stand at the stall and the wagon without crowding (a 9 m stall, a 9.6 m table). A friend arriving late reads
the map display and the gold ghosts. The request lever needs no explanation once someone has pulled it, and a lit lamp
on an arriving engine tells the platform it is stopping.

**Reach.** No step adds a collider or a travel edge. The lever stands at the mast's foot, outside the train's clearance;
the builder checks this with `npm run level-check` and the railway bot. Steps 1–3 change order facts, so the build
re-runs `npm run loop -- run` (every order must still finish) and the bot's route with levers and requests.

## Client, sim, server and `WORLD_NS`

| Step | Client only | Sim and server | `WORLD_NS` |
| --- | --- | --- | --- |
| 1 Request stops | lever, arm, lamps, bell, cord, map ring, destination plate, prompts | `Train.req` bitmask; the leg row's start and entry speed; `rail.call {id, dir}` with a lever or train-pose check; stop, through-run, turn-back and service-stop rules | v25 |
| 2a Two footings by hand | the wagon's cradle without seats | `WORKS.cradle 0`, `total 14`, invariants, loop graph, bot | v25 |
| 2b Pace, sprint, jump | `footing-view.ts` | two new room tunables in `src/sim/tune.ts` | v25 (v24 bumped for the boiler's two tunables) |
| 3 Clarity | ghosts, the blocked prompt, the glint, prompt gating | `rail.turn` needs `fitted ≥ 0` and no wagon (a refusal only, no shape change) | rides v25 |
| 4 Help carry, dismount | `help-carry.ts`, `boiler-view.ts`, `footing-view.ts` | none | none |
| 5 Roof, rims, turntable | `roundhouse-view.ts` | none | none |
| 6 Forge | roof, chimney, little guys | none (the paid alternative needs sim) | none |

**Order:**
1. One sim branch for steps 1, 2 and 3's rule, with one bump and an independent review (sim, server and the wire).
2. In parallel, the client halves of steps 3, 4 and 5.
3. Then step 6.

## Calls

| Call | Kind | Source or recommendation |
| --- | --- | --- |
| Trains stop at a halt only on request; otherwise they run straight through | Decided | Owner, 10 November ("Stop on request"; "otherwise go about their business") |
| A passenger aboard can request the next halt | Decided | Owner, 10 November ("a stop request when on the train as a passenger as well") |
| Turn the table appears only once the cradle is fitted and the wagon is ready | Decided | Owner, 10 November ("Only when ready") |
| The forge's roof and chimney are a later upgrade | Decided | Owner, 10 November ("Later upgrade") |
| Firefox is supported; its shader and audio fixes come after the P1s | Decided | Owner, 10 November ("Yes, at P2") |
| A friend can Help carry a footing: faster together, full weight solo | Decided | decisions.md, 8 November, "Split-rock answers" |
| The boiler is hauled on a rope like the great log, a little faster | Decided | decisions.md, 9 November |
| Either seam may be struck first | Decided | decisions.md, 9 November, "Loop orders" |
| Line trains never turn on the table; the 9.6 m table stays | Decided | decisions.md, 9 November, "Home gets one coherent station" |
| Middle halts get two handles, one per direction, each plaqued with the end it goes to; end halts get one | New | Recommended: both of the owner's failed rides were wrong-way trains, and a one-way lever would still carry him out. Owner question 2 |
| The lever replaces the walk-on call; standing on a halt calls nothing | New | Recommended: one visible way to ask; the hidden call was half of "it didn't stop for me" |
| A running train replans its leg to stop at a newly requested halt beyond braking distance (about 57 m); a request inside it goes to the following halt, and the prompt names that one | New | Needed for the passenger request; adds a start and an entry speed to the leg row |
| A train turns back early when requests lie only behind it (LOOK); with none at all it sweeps end to end | New | Recommended: bounded waits, and trains still move |
| Service stops need no request: the Q6 kit at the village and Far Head, and the quarry outbound while the wagon has room, the rack a footing and the pier a need | Default | The owner's "the wagon and cargo stops must still happen"; replaces "calls at every stop while fetching" |
| The wagon's roll-out counts as a request at line 2's village end | Default | Saves up to a round trip of waiting to couple |
| Dwell is 5 s everywhere; the 1.5 s call dwell goes | Default | The short dwell left people behind |
| The lever's look: a cast-frame lever at the mast's foot with a lamp; the mast's arm drops; a steady ring on the maps; it springs back when a train stops | Default | Diegetic, reusing the arm and the map (owner call "Signs in the world before hovering text") |
| The passenger request is the Interact prompt "Request stop: <halt>", animated as pulling a bell cord along the car roof; heard as a bell and an amber stop lamp on the engine's cab front | Default | Works on pad, touch and keys; something in the world behind the prompt; others see it from the platform |
| Several requests: one bit per halt per direction; repeats show "Stop requested" greyed and play only the local cord pull; a request from the halt and one from aboard for the same halt and direction are the same bit | Default | One bell, one lamp |
| The sim owns requests (a lockstep edit sets the bit, the train's tick clears it); the server checks the lever's 3 m reach or the train's pose at about 6 m | Default | Saved, hashed, the same on every tab; no presence |
| Each engine has a destination plate on its front showing the end it runs to | Default | Shows the train's direction before you board |
| The lever's press response plays on the press; the stop comes from the server's answer | Default | Owner call "Input gets instant feedback" |
| The cradle takes 8 rails and no footings, so two footings go by hand and the kiln casts 14 | New | Recommended: halves the by-hand grind (the loop's largest); the stall's two keep the "before". Owner question 1 |
| Footing pace: solo 300 cm/s, helped 540 cm/s, as its own room tunables | Default | The boiler's pair; carrying rec 7 |
| Sprint with a footing at 1.3 times the carry pace, off while helped | Default | The owner asked to sprint "even if it was slower" |
| The plain jump with a footing; no second jump, glide or hook | Default | The owner's ask; route contract: no new travel edge with a work item. Owner question 3 |
| A dashed gold ghost of the wagon at its line-2 wait from the slab strike | Default | Gives the table its visible reason before it is offered |
| Eight dashed gold rail ghosts on the cradle once the tarp is off | Default | The ghost grammar of the kiln and the sockets |
| "Fit the cradle" shown blocked to an empty back: "Bring rails" | Default | The kiln's blocked-prompt grammar; the copy is the owner's |
| The table's handle glints gold while the turn is offered | Default | The breaker's glint grammar |
| `rail.turn` is refused unless the cradle is fitted and the wagon not yet coupled; no turn after coupling; the cancel path goes | Default | Follows "Only when ready"; no press goes silent. Owner question 5 |
| The table carries the wagon and the shunter round in one choreography; headings ease through corners | Default | "Machines show their work physically"; the owner's "janky" |
| The roof slopes' roll signs swapped, the side walls closed to the eaves, the socket rims given the stall's yaw | Default | From the code; the builder takes the stills |
| Help carry measured to the grip: 5 m to start, 8 m to keep, 3 m of height, the helper eased toward the grip | Default | The boiler's claim dropped while the helper stood where the prompt sent them |
| The forge roof's trigger: the crossing, with trusses brought by line 1's next arrival and lifted on by little guys, Local | New | Recommended: finished "by the end", at no sync cost. Owner question 4 |
| Port verdicts: keep the roof, the chimney and the workshop; cut Place's crate economy and doubled pour | Default | Owner call "Port from Place only what still fits" |
| The shore east of the quarry halt is checked for a climb-out, only if dismounts still happen | Default | P3; no barrier on the railway |

## Findings

1. **place.md's "Trains come last" describes a rider rule the live game doesn't have** ("with someone aboard a train
   runs straight through to the end of the line"); line 591's "no mid-leg reversal or rider express" is the live rule.
   The run-through the owner met is the call leg (cause 1 above). Both texts change when step 1 lands, since it
   replaces them.
2. **`rail.turn` is accepted before the cradle is fitted and does nothing visible**, which is what the owner and his
   friend did five times. It is a rule bug, which the owner's answer closes in step 3.
3. **The train keeps its old sweep after serving a call behind it** (cause 4). This is a bug on its own; step 1's LOOK
   rule replaces it.
4. **The loop's grind table doesn't count train waits or wrong-way rides**, so its 8:29 solo understates the pair's
   14:41. It deserves a loop note but doesn't block the build.

## Copy

New lines, none of them The Boogler's, all the owner's to reword:
- "Request stop" (the lever at an end halt);
- the handle plaques "Village", "Pier" and "Far Head";
- the passenger's "Request stop: <halt>" and "Stop requested";
- "Bring rails".

Kept as they are: "Turn the table", "Fit the cradle", "Shoulder a footing", "Set the footing", "Help carry" and "Let
go". No Boogler copy is touched, and none of it looks wrong against this plan.

## Owner questions

**Answered by the owner, 10 November: every recommendation taken** (1 yes, 2 yes, 3 yes, 4 free at the twelfth pier
footing, 5 no; recorded in [decisions](../decisions.md#decided)). The questions stay below as asked.

1. **Should the cradle take only the 8 rails, so that just the stall's two footings go home by hand (14 cast, not
   16)?** Recommended: **yes**. It halves what you called the most pain, a pair does it in one trip, and the wagon still
   has its "before".
2. **At the quarry and Far Head, two handles on the request lever, one per direction?** Recommended: **yes**. With one
   handle, the next train to stop could be the one heading out, which is what carried your footing the wrong way twice.
3. **With a footing on your back: 3 m/s, a little faster when you sprint, and the plain jump?** Recommended: **yes**,
   but no double jump, glide or hook while carrying, so it stays a carry.
4. **The forge's roof and chimney: put on for free when the twelfth pier footing is set, brought by train, or later as
   a paid upgrade at the works board?** Recommended: **free, at the crossing**. It's finished by the end, and a paid
   version can come with the board.
5. **Once the wagon is out, should the table stay a toy you can still turn?** Recommended: **no**. Your note was that
   turning it did nothing, so it stays the shunter's machine.
