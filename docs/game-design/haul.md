# 6.19 Haul: piles, the stack, sources and work sites

The 0.1 groundwork ([docs/plans/0.1-groundwork.md](../plans/0.1-groundwork.md), research in
[docs/research/0.1/](../research/0.1/10-groundwork.md)): one material per age (wood first: logs), carried on your back,
poured into work sites that lay the railway. Placeholder visuals throughout. Every part is optional: nothing blocks a
place or a toy, and credit only ever adds.

## Ground piles

Loose material lies in piles: integer counts, drawn as a little heap (at most 12 pieces shown, whatever the count).
Walk over a pile to pick it up (1.3 m from its centre). A drop joins a pile of the same kind within 2 cells (2.5 m);
a pile holds 64, then a new pile starts beside it. A room holds 128 piles; when it is full, more of a kind goes onto
the nearest pile of that kind, so nothing is lost. Piles never age or vanish.

Code: [src/sim/piles.ts](../../src/sim/piles.ts), [src/world/rules/piles.ts](../../src/world/rules/piles.ts),
[src/adapters/piles.ts](../../src/adapters/piles.ts). Lockstep state `piles`; ops `pile.drop`, `pile.take`.

## The haul stack

What you pick up goes onto a stack on your back: one material at a time (you can't pick up ore while carrying logs),
up to 60 pieces. It is drawn as a lashed bundle: logs lying crosswise across your back, stacked up and out from it,
with two rope bands round them. It fills out rather than towers: at most 22 logs are drawn (every piece up to 12,
then about one in five more), and the logs get longer as the count grows (half as long again at 60), so a full load is
wider than you and only reaches the top of your head. It has no motion of its own (it rides your walk's bob and lean)
and nothing falls off: jumping with any load is safe. A chip above the hotbar shows the material and count while you
carry anything. Walking into a pile takes as much of it as fits; its pieces fly to your back at
once, and the count follows when the host confirms (about half a second). Your stack belongs to the room: it waits for
you after a reload, and other players see it on your avatar. No new control: pickup is walking, pouring is walking
into a site's ring.

Code: [src/sim/stacks.ts](../../src/sim/stacks.ts), [src/world/rules/stacks.ts](../../src/world/rules/stacks.ts),
[src/features/haul-stack.ts](../../src/features/haul-stack.ts). Lockstep state `stacks` (by roster index), changed by
other ops (`pile.take` adds, `site.stock` pours). Remote stacks are matched to avatars through presence `pid`.

## Sources: log bundles

In the wood age a log bundle lies at the foot of each of the 36 home palms. Each holds 2 charges. E (pad B, the touch
action) on a bundle with charges says Take logs, spends a charge and puts 4 logs straight onto your stack (they fly to
your back). What doesn't fit (another material on your back, or a full stack) drops as a pile beside the bundle. The
ball never gives logs: the ball is never income. Every bundle refills when a section is laid, and every 20 s one empty
bundle, picked from the room seed and the tick, refills on its own.

Code: [src/sim/sources.ts](../../src/sim/sources.ts), [src/world/rules/sources.ts](../../src/world/rules/sources.ts),
[src/features/log-sources.ts](../../src/features/log-sources.ts) (the bundles and Take logs). Lockstep state `sources` (the current age's charges only); op
`src.take {id}`.

## Work sites, plaques and tiers

The railway is preset ([src/sim/route.ts](../../src/sim/route.ts)). The 0.1 testbed has three wood sections from the
court toward the lighthouse, at (11, 6), (10, -12) and (8, -30), each with a work site: a sign with the section's
plaque (beside the Helper ring, off the line) and two rings on the ground, Track (left, gold, dashed like sleepers) and Helper
hut (right, green, a double line). Only the open site (the first section
not yet laid) takes material; the others are grey and say "later". Stand in a ring carrying the age's material and
your stack pours in, 2 pieces every 0.3 s. A wood section costs 60 logs; a helper hut 36 (brief 7: about 0.6 of a
section). Sleepers pile up in the Track ring as it fills; a full Helper ring builds the hut (one per site) and closes.
The rings' signs and the plaque shrink and fade as the camera comes within about 14 m (to about half size and a third
opacity at 4 m; src/render/near-fade.ts), so standing at a site or riding the machine past one keeps the view clear,
while signs further off read at full size.

Every pour is credited on that site's plaque: 1 point per 1% of the age's section cost (a log is 1.67 points), with
the remainder kept per player so rounding never loses anything. The plaque lists the top four by points, names from
the roster; nobody is listed for not pouring. Your contribution tier is derived from your points in this room (Hand
25, Porter 100, Navvy 300, Ganger 600, Foreman 1,000, Engineer 1,600, Stationmaster 2,500; brief 8) and shows only to
you, on the haul chip. Tiers give nothing yet.

## Machine runs, helpers and the age change

Once the open site's Track ring holds a whole section, anyone standing by it gets "Start the machine" (E, the
Interact button). The run is scripted and the same for everyone, including a late joiner: 3 s warming up, 45 s
crawling the section laying sleepers and rails behind it, 2 s whistle (500 ticks; drawn at smooth shared time). Then
the section is laid, whoever started it gets 5 points on that plaque, every palm refills, and the next site opens.
A built helper hut adds one piece of freight to the open site's Track ring every 27 s (it waits while that ring is
full or running). When an age's last section is laid the age moves on; whatever is left of the old material on
anyone's back pours itself into that last site and is credited to them. In the testbed the third section ends the
wood age, and no iron sources exist yet.

**While nobody plays.** Helper huts keep working offline. When a tab starts hosting a saved world (or the server
restarts a room it hosts), it measures how
long nobody hosted (wall clock against the save's tick), and the huts' freight for that time (one piece per hut per
27 s) lands in the open Track ring, capped at one section. The machine still waits for a player to start it. Absences
under a minute bank nothing.

**The machine.** A little red steam loco with a sleeper chute at the front parks a few metres up the open section.
Started, it backs onto the railhead while warming up (fast chuffs, a shudder), then crawls the section dropping
sleepers off its chute one by one: each thumps down with a ring of dust and the machine bumps, every other one a rail
clanks down with sparks, the funnel chuffs as it goes and the Track ring's pile shrinks. It whistles and steams at the
end, then rolls up to park on the next section. Its deck is a platform: hop on and ride it. Once the whole route is
laid it sinks away. With the ?proto=wagon train standing at the end of the line (its loco overhangs the railhead by
about 5 m), the machine waits just ahead of the loco's nose instead of backing into it, and drops back to the head
as the train pulls away (drawn only: the run's timing is the same).

**Run variants** (`?room=proto-lay&proto=lay&v=crawl|quick|push`, docs/plans/find-the-fun.md step 3). The room's run
is the `run` tune key (proto- rooms; never changed mid-run): crawl (0, the default above), quick (1: 1.5 s warm, 11 s
lay, 1.5 s whistle) and push (2: 2 s warm, then it lays only while someone walks into its back: each `site.push {s}`
buys 5 ticks of laying and a pusher sends one every 5 ticks, so solo it takes ~25 s and more pushers go faster; a
"Push me!" sign shows while it waits). The `?proto=lay` panel switches variant, fills the open Track ring
(`tune.fill`, as freight with no plaque credit) and starts over (`tune.reset`). Scenario: `npm run scenario -- lay-run`.

Code: [src/sim/scripted-run.ts](../../src/sim/scripted-run.ts) (`runAt`, `MACHINE_RUN`, `RUNS`), op `site.run {s}` and the
`sites` tick; the bank: [src/sim/bank.ts](../../src/sim/bank.ts), [src/world/rules/bank.ts](../../src/world/rules/bank.ts),
[src/features/helper-bank.ts](../../src/features/helper-bank.ts), op `bank.wake`, state `bank`. Scenario: `npm run scenario -- haul-loop`.

Code: [src/sim/sites.ts](../../src/sim/sites.ts), [src/sim/tiers.ts](../../src/sim/tiers.ts),
[src/world/rules/sites.ts](../../src/world/rules/sites.ts), [src/features/work-sites.ts](../../src/features/work-sites.ts),
[src/features/track-machine.ts](../../src/features/track-machine.ts) (the machine, the railway, riding and pushing).
Lockstep state `sites`; op `site.stock {s, ring, n}` (validated against your own stack, the age's material and the open
site). Ring reach is not checked by the host, like every reach today.

## Playtest kit

With `?proto=haul` a **Haul kit** panel opens top right (checklist: [docs/playtest-kits/haul.md](../playtest-kits/haul.md)).
Its feel knobs (pour cadence and handful, pickup flight) change only your tab
([src/player/haul-feel.ts](../../src/player/haul-feel.ts)). In a room whose name starts with `proto-` its room knobs
(wood section and helper cost, hard cap, logs per take, takes per bundle, bundle refill) change the
world for everyone at the same tick, and Reset haul empties every stack and pile and puts the sites and bundles back to
the start, keeping the tuning. Elsewhere the host refuses both. Without the flag nothing changes. Plaque points always
use the default section cost.

Code: [src/features/haul-kit.ts](../../src/features/haul-kit.ts), [src/debug/haul-kit.ts](../../src/debug/haul-kit.ts),
[src/sim/tune.ts](../../src/sim/tune.ts), [src/world/rules/tune.ts](../../src/world/rules/tune.ts). Lockstep state
`tune` (overrides only); ops `tune.set {key, v}`, `tune.reset`. Scenario: `npm run scenario -- haul-kit`.

## Prototype: haul variants (?proto=haul&v=barrow | toss | wave | magnet)

Other ways to get logs from the palms to the work site, so the owner can compare them with the back bundle in one
sitting (find the fun, step 1: "if hauling is a chore, test a different core loop"). Each variant has its own room on
the protos page (`proto-haul-barrow`, `proto-haul-toss`, `proto-haul-wave`), so their saves never mix (magnet
shares the default `proto-haul`: it changes only the look and sound). With barrow or toss on, walking into a ring no
longer pours; without `v` the loop above is unchanged. Starting numbers from
[docs/research/carrying-and-logistics-play.md](../research/carrying-and-logistics-play.md) (recs 1, 3, 5, 6).

- **`v=barrow`:** a wheelbarrow stands beside the first work site, and stays wherever you leave it. E grabs its
  handles (or walk into it to shove it); it rolls ahead of you at arm's length and swings to where you walk, at 85% of
  your pace on the flat and a little faster downhill. It holds 150 logs (rec 6: 2-3 sections): the tray is your stack,
  so in a `proto-` room the barrow raises the room's hard cap to 150 (elsewhere the room's cap stays). Take logs only
  works with the barrow within 4.5 m of the bundle, and the logs fly into its tray instead of onto your back. Too fast
  for the slope and the load (it rocks first), or a hard hit, and it goes over: the load bursts out as physics logs.
  E stands it back up. Rolling it over a pile scoops it up. Push its front lip over a ring of the open site and E says
  Tip it in: it pitches over the wheel and the logs tumble out.
- **`v=toss`:** take logs as usual, then with empty hands the use button (click, pad X, or the touch Grab button when
  nothing is in reach) lobs a handful of 4 logs; holding it keeps tossing, one handful every 0.6 s, so a full bundle empties in about 9 s (rec 5).
  It never tests aim: a ring of the open site within 10 m and roughly where the camera looks is aimed for you;
  otherwise the handful lands 8 m ahead. A log that lands within the ring's radius plus 1 m counts there ("+1" and a
  gold burst); a miss settles as a pile.

- **`v=wave`** (docs/research/roblox-patterns.md, pattern 1: a trip home under a world threat, the kind version; asks
  whether tension makes hauling fun without rewards): a sandbar lies off the home beach south of the court, at the end
  of an awash spit you wade out along (60% of your pace; the bar's dry top and the beach are full speed). Its three
  big bundles (yellow pennants) are nine of the palms' bundles moved out there (the ones farthest from the first site,
  so they vanish from their palms): Take logs on one spends three charges at once, 12 logs where a palm gives 4,
  refilled like any palm. Walk-in pouring and pile pickup work as usual. Every 60-90 s a wave comes. 25 s before it
  reaches the bar a horn sounds and a swell line rises on the horizon and comes on, a rumble grows (with a little
  camera shake in the last seconds), and a countdown pill says "Wave! 18 get above the stakes"; at 10 s two short
  horn blasts and the pill turns red. Then the surge runs over the bar and the beach in 5 s, up to a line of red-banded
  stakes behind the beach, and drains back in 4. Seaward of the stakes when the front passes you: you tumble (the
  tumble flop, src/features/feel.ts), the surge carries you a few metres shoreward, and half your load flies up the
  beach as physics logs that settle as piles on the dry sand (`pile.drop` from your stack): nothing is lost, only
  moved, and you pick it up again by walking over it. The wave is a function of shared time and the room seed
  (src/proto/haul/wave-time.ts), so every tab sees the same wave with nothing on the wire; whether it caught you is
  your own tab's call. The sandbar is a Local overlay (a static heightfield body and a sand mesh; the island's terrain
  is untouched). Tuning in `window.__wave.TUNE`; `__wave.next(s)` brings the next crest s seconds away in your tab
  (the look evals' shortcut).

- **`v=magnet`** (`?room=proto-haul&proto=haul&v=magnet`): today's back bundle with Ratchet & Clank bolt pickups
  ([docs/research/ratchet-and-clank-feel.md](../research/ratchet-and-clank-feel.md), recs 1, 2 and 3). Asks: does
  collecting logs feel like collecting bolts? Walking pours as usual. A pile notices you from 3 m instead of 1.3
  (`&reach=2.2` or `&reach=4` to compare; the host never checks reach). Each piece pauses 50-70 ms and lifts 0.3-0.5
  m, then homes on the top of your bundle as you move (2 m/s, +60 m/s², up to 16 m/s, so it always catches a sprint),
  bowing 0.6 m to alternate sides, spinning 2-3 turns a second until it settles into the bundle's lie, and shrinking
  to the bundle's size; pieces leave 40 ms apart, at most 8 drawn, with a soft swell as they set off. Each one that
  lands clinks like a bolt (mostly metal, a little wood; [collect-sounds.md](../research/collect-sounds.md)): a major
  pentatonic step higher each time from C6 to C7, then a payout shimmer among the top three notes, starting over after
  0.7 s with nothing landing, ±6 cents, panned to alternate sides; every 4th is accented and a pickup of 4 or more
  closes on a cha-ching (C6, G6, C7 clinks 40 ms apart, E7 too after 10, a shimmer and a low knock). Undrawn pieces
  tick in 45 ms apart up to 12 ticks a pickup; the rest are counted with the last. At most 8 tick voices. The
  chip's number and the logs on your back go up with each landing, then follow the host's count. Take logs spills the
  bundle's 4 logs out in a fan toward you (up 4-4.5 m/s, out 1.5-2.5 m/s, tumbling), one bounce, a puff of dust,
  120-160 ms lying there, then the magnet takes them: about a second from E to the last tick. Same ops as ever
  (`pile.take`, `src.take`); everything new is Local. Tuning: `window.__magnet.T`. Look evals:
  `dev/look/evals/haul-magnet-spill.js`, `haul-magnet-sprint.js`.

Every loose log (a spill, a pour, a toss) is a real physics log (half as big again as a pile's piece) that rolls and
then settles; the counting reuses the existing ops, so nothing new goes on the wire: a log in a ring is a `site.stock`
from your stack, one that comes to rest anywhere else a `pile.drop` where it lies (a full ring piles the rest beside
it). Until the host applies that, the logs are still on your stack, so a refused edit loses nothing. Tuning lives in
`window.__barrow.T` and `window.__toss.TOSS`.

With `?proto=haul` (any variant) every pickup also squashes your avatar 7% for 110 ms and knocks a wooden "thock" with
a clink on top, a pentatonic step higher every 6 logs you carry (rec 3), and the haul kit counts the chores of the
open section in this tab: Take-logs presses, palms used, metres walked and seconds from your first take to the
machine's start (rec 1: is the chore the gathering?). Copy values includes that line.

Code: [src/player/haul-variant.ts](../../src/player/haul-variant.ts) (the flag), [src/proto/haul/](../../src/proto/haul/index.ts)
(`loose-logs.ts`, `barrow.ts`, `barrow-mesh.ts`, `toss.ts`, `pickup-feel.ts`, `wave.ts`, `wave-look.ts`, `wave-time.ts`), the chore counter in
[src/debug/haul-kit.ts](../../src/debug/haul-kit.ts). The barrow is Owner kind (presence `barrow`); loose logs are
Local. Look evals: `dev/look/evals/haul-barrow-push.js`, `haul-barrow-tip.js`, `haul-toss-ring.js`, `haul-wave-warn.js`,
`haul-wave-caught.js`, `haul-wave-dash.js`.

## Prototype: era swap (?proto=era)

Asks "from the court, can you tell at a glance which era it is?" with greybox blocks (no ceremony, no mayor, no
story). With `?proto=era`, low brown huts with steep A-frame roofs and a campfire stand around the court and along the
route (era 1, the wood age), and a platform with a bell post stands at the far end of the route, by the lighthouse.
Once the age's last section is laid, anyone on the platform gets "Start opening day" (E, the Interact button; before
that it shows greyed with "Lay the whole route first"). The first start wins, and opening day runs in two phases:

- **The gathering call**, up to 45 s (`CALL_S` in [src/sim/era.ts](../../src/sim/era.ts)): a yellow column of signal
  smoke rises over the platform, visible from anywhere on the island; a ring of yellow segments 9 m round the
  platform burns down with the time left; a banner above the hotbar says "Gather at the platform". The call ends
  early once every online player is inside the ring (any tab that sees it submits `open.here`; the first one stamps
  the tick), so alone at the platform it is straight to the bell. It never waits for a head count, and nobody can
  reset or cancel it.
- **The bell**, 10 s (`BELL_S`): a big number on everyone's screen; the ring turns red.

Opening day is silent for now: the call's tolls, the countdown's rings and the swap's big ring were cut in the sound
audit (2026-11-02); better ones come later.

Then the era turns to 2 (steam wagons), on several channels at once: the huts sink and tall striped stalls with
smoking chimneys, a town hall with a clock tower and a chimney, a works stack and shed, a water tower (the landmark,
the tallest thing on the island, left of the court), bunting lines and yellow posts where the wagon will run pop up,
rippling out from the court in about two seconds; over 4 s the sky and fog cross to an amber haze with the fog much
closer in (era 1 is clear), and the ambience bed crosses from wood (a breeze, mallet knocks, gulls) to steam (a works
rumble, a chuffing beat, a whistle), with the same five-note island motif coming round in each (plucked, then brass
with an oompah bass). One era-1 hut (east of the court) and the first site's helper hut (built, as in
`?proto=build`) stay standing in era 2: the heritage test, "history or leftovers?". After the swap a paper postcard
shows the court before (taken when opening day started) and after, side by side, for 14 s (click to put it away);
each tab takes its own, so a late joiner gets none. The era is derived (age, sections laid, whether opening day has
run out), so a late joiner or a reload sees the same island, landing in the same phase of the call or the bell. In a
`proto-` room a "Lay the whole route" button (top left) lays every remaining section at once, so a solo tester
reaches opening day in seconds; Reset haul (the haul kit) also undoes opening day. Without the flag nothing is drawn
and the sky is untouched; the state and ops exist but nothing submits them.

Code: [src/sim/era.ts](../../src/sim/era.ts), [src/world/rules/opening.ts](../../src/world/rules/opening.ts),
[src/features/era-swap.ts](../../src/features/era-swap.ts), [src/proto/era/](../../src/proto/era/index.ts) (each era's
kit, blocks, sky tint and ambience bed, is one table, [blocks.ts](../../src/proto/era/blocks.ts); the call, sky,
ambience and postcard are `call.ts`, `atmosphere.ts`, `ambience.ts` and `postcard.ts`). Lockstep state `opening`
(`t0`, plus `h` once the call ended early and `la` once the shortcut was used); ops `open.start`, `open.here`,
`open.lay` (`proto-` rooms only). Scenario: `npm run scenario -- era-swap`.

## Prototype: construction you can watch (?proto=build)

Asks "is watching it go up satisfying?" with greybox boxes only. With `?proto=build` each site's helper hut builds
up as its Helper ring fills, instead of appearing whole when the ring is full: a faint ghost of the whole hut shows
from the first log, scaffolding poles rise, then sills, posts, top plates, wall planks (a doorway facing the ring), the
ridge, four roof boards and the station sign go up one after another, as far as the ring's stock has reached. Pieces
keep their own beat (0.38 s apart, down to 0.24 s while a long queue catches up) whatever the pour's speed, in five
phases (ground, frame, walls, roof, topping out) with a 0.45 s pause between them. Most pieces fly in on an arc from
the ring and settle with a springy overshoot (planks bounce, roof boards flap, the sign's board swings); posts drop
in with a thud. Each landing puffs dust and plays a thump with a wooden knock that steps up a pentatonic scale
through its phase (at most three sounds per site per 0.3 s); a phase's last piece resolves it with a chord and a
wider ring of dust. When the ring fills, the sign's board goes up last and the scaffolding falls over as loose poles
(Local physics) you can kick about for 6 s before they puff away. The stage is derived from the ring's lockstep
stock, so every player sees the same pieces; the motion is drawn by each tab, and a late joiner or a reload sees the
stage as it is, without the drops. Reduced motion places pieces without the flight or settle. The build is one data table (every
piece with the stock fraction it appears at), shaped for a later "projects as data" system. In a `proto-` room
(`?room=proto-build&proto=build`) a **Pour 10 logs** button (top left) takes logs from the bundles and pours ten
into the open site's Helper ring with the usual ops (`src.take`, `site.stock`), so one tester builds a hut in four
presses; **Reset** is the haul kit's reset. Without the flag the hut is the old box.

Code: [src/proto/build/blueprint.ts](../../src/proto/build/blueprint.ts) (the pieces),
[src/proto/build/index.ts](../../src/proto/build/index.ts), [src/features/build-proto.ts](../../src/features/build-proto.ts).
No new state or ops. Scenario: `npm run scenario -- build-proto`.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.

## Prototype: wagon (?proto=wagon)

A greybox steam wagon (a loco and two flatbeds, the rear one loaded with crates) runs the timetable of
[src/sim/wagon.ts](../../src/sim/wagon.ts) along the **laid** sections only: nothing laid, no wagon; the first laid
section brings it out standing at the first site; each newly laid section extends its run from the next stop it
reaches (no teleport). It stops 6 s at each site, cruises at 3 m/s, and shuttles back and forth push-pull (the loco
stays at the lighthouse end). Every car is a kinematic platform (src/physics/platforms.ts): stand on a flatbed, or
jump onto the boiler, and you're carried; jump off and you keep its speed. It puffs smoke with speed, rocks over rail
joints every 4.5 m, and bursts steam just before leaving a stop; it is silent for now (the whistle and rail clacks were
cut in the sound audit, 2026-11-02, until better sounds come). Its wheels turn with the distance covered, the
loco's side rods, connecting rods and pistons follow its wheels, and the cars shuffle on a little buffer slack as it
starts and stops (src/proto/wagon/look.ts). `&v=lively` (rockier, bouncier, more smoke, a
camera jolt per joint while riding) against the default `&v=calm`, render and feel only; `&v=fast` is lively at
6.5 m/s, through two room tunables (`wagonCruise` cm per tick, `wagonAccel` ticks to reach it; default 30 and 30, so
other rooms are unchanged) that the page sets for the whole proto- room on load (calm and lively put the defaults back).
Jumping off a moving car keeps its speed and slides it away on landing in a dust trail (longer at the fast pace),
opening on the tumble flop's held beat (docs/game-design/player.md); the crates on the rear flatbed are solid.

**The rail takes over** (src/proto/wagon/freight.ts, Local). With a helper hut built and the wagon running, helper freight
arrives by wagon: crates hop off the rear flatbed in an arc into the open site's Track ring and land (silently for now:
the thump was cut in the sound audit) with a ring of dust, then sink into the pile, at the stop nearest that ring.
When the wagon stands there on the freight tick (one piece per hut every 27 s), the crates are thrown early so they land on that tick, as the ring's count goes up;
freight that lands while the wagon is elsewhere rides along and hops off 0.8 s after it next stands there (the count
went up already: only the show waits). Nothing changes when or how much freight counts; with no wagon running (nothing
laid yet) the pile just grows as before. Look eval: `wt=freight` in dev/look/evals/wagon.js.

**Stoking** (`&v=stoke`, src/proto/wagon/stoke.ts; docs/research/roblox-patterns.md, pattern 2: Dead Rails'
furnace). The loco has a firebox on the back of its cab, facing the flatbed, with a steam gauge above it. Walk up to it
with logs on your back and press the interact button (Stoke): up to 3 logs fly off your stack into the fire, which
flares and throws sparks. Anyone's logs count. Steam is speed: each log burns 10 s, the firebox holds 12 (2 min), and
from 3 logs' worth up the wagon runs flat out at 6.5 m/s; below that it slows in a straight line to walking pace
(1.5 m/s) when the fire is out. It never stops for want of steam, and it still stands 6 s at each stop (the fire burns
on while it stands). Speed eases in and out over about 4 s. The glow, the embers, the gauge's needle and the chimney
follow the fire: a hot one puffs big sooty clouds, a cold one thin wisps. No sound for now: the fire's roar and the
chimney's chuffs were cut in the sound audit (2026-11-02). The steam is lockstep (the
`wagon` state, `wagon.stoke {n}` spending logs from your own stack, in `proto-` rooms only; src/world/rules/wagon.ts):
the wagon's place is
its timetable read at its own clock, which steam runs faster, so every tab sees the same speed. Reset the route
empties the firebox. The prototype jumps the wagon when the laid count changes (Lay the whole route). Look evals:
`wt=stoke` and `wt=rundown` in dev/look/evals/wagon.js.

Solo shortcuts: in a `proto-` room the panel's Lay the whole route (`open.lay`, which records the tick and the first
section it laid in the `opening` state, so a late joiner's wagon runs the same timetable) and Reset the route
(`tune.reset`);
anywhere, its −/+ (or `&laid=N`) fake the laid count for your tab only, drawing plain rails for faked sections
(prototype only). Each tab drives its own bodies from the shared tick, so every tab sees the same wagon with no
messages. A rider on another tab is drawn on your copy of their car: while you stand on a car you send your place in
its frame (presence `riding`), so riders stay put on the deck through stops and corners instead of trailing it.
Scenario: `npm run scenario -- wagon-riders` (two tabs; on a Mac, not in PR CI).

Code: [src/features/proto-wagon.ts](../../src/features/proto-wagon.ts), [src/proto/wagon/](../../src/proto/wagon/)
(the look is one function, `wagonLook` in look.ts).
