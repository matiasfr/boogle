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
plaque (beside the Helper ring, off the line) and two rings on the ground, Track (left, gold) and Helper hut (right,
green). Only the open site (the first section
not yet laid) takes material; the others are grey and say "later". Stand in a ring carrying the age's material and
your stack pours in, 2 pieces every 0.3 s. A wood section costs 60 logs; a helper hut 36 (brief 7: about 0.6 of a
section). Sleepers pile up in the Track ring as it fills; a full Helper ring builds the hut (one per site) and closes.

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

Code: [src/sim/scripted-run.ts](../../src/sim/scripted-run.ts) (`runAt`, `MACHINE_RUN`), op `site.run {s}` and the
`sites` tick; the bank: [src/sim/bank.ts](../../src/sim/bank.ts), [src/world/rules/bank.ts](../../src/world/rules/bank.ts),
[src/features/helper-bank.ts](../../src/features/helper-bank.ts), op `bank.wake`, state `bank`. Scenario: `npm run scenario -- haul-loop`.

Code: [src/sim/sites.ts](../../src/sim/sites.ts), [src/sim/tiers.ts](../../src/sim/tiers.ts),
[src/world/rules/sites.ts](../../src/world/rules/sites.ts), [src/features/work-sites.ts](../../src/features/work-sites.ts).
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

## Prototype: haul variants (?proto=haul&v=barrow | toss)

Two other ways to get logs from the palms to the work site, so the owner can compare them with the back bundle in one
sitting (find the fun, step 1: "if hauling is a chore, test a different core loop"). Each variant has its own room on
the protos page (`proto-haul-barrow`, `proto-haul-toss`), so their saves never mix. With a variant on, walking into a
ring no longer pours; without `v` the loop above is unchanged. Starting numbers from
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

Every loose log (a spill, a pour, a toss) is a real physics log (half as big again as a pile's piece) that rolls and
then settles; the counting reuses the existing ops, so nothing new goes on the wire: a log in a ring is a `site.stock`
from your stack, one that comes to rest anywhere else a `pile.drop` where it lies (a full ring piles the rest beside
it). Until the host applies that, the logs are still on your stack, so a refused edit loses nothing. Tuning lives in
`window.__barrow.T` and `window.__toss.TOSS`.

With `?proto=haul` (any variant) every pickup also squashes your avatar 7% for 110 ms and knocks a wooden "thock" whose
pitch rises with your load (rec 3), and the haul kit counts the chores of the open section in this tab: Take-logs
presses, palms used, metres walked and seconds from your first take to the machine's start (rec 1: is the chore the
gathering?). Copy values includes that line.

Code: [src/player/haul-variant.ts](../../src/player/haul-variant.ts) (the flag), [src/proto/haul/](../../src/proto/haul/index.ts)
(`loose-logs.ts`, `barrow.ts`, `barrow-mesh.ts`, `toss.ts`, `pickup-feel.ts`), the chore counter in
[src/debug/haul-kit.ts](../../src/debug/haul-kit.ts). The barrow is Owner kind (presence `barrow`); loose logs are
Local. Look evals: `dev/look/evals/haul-barrow-push.js`, `haul-barrow-tip.js`, `haul-toss-ring.js`.

## Prototype: era swap (?proto=era)

Asks "does the island change enough at an era's end?" with blocks only (no ceremony, no mayor). With `?proto=era`,
low brown huts and a campfire stand around the court and along the route (era 1), and a platform with a bell post
stands at the far end of the route. Once the age's last section is laid, anyone on the platform gets "Start opening
day" (E, the Interact button; before that it shows greyed with "Lay the whole route first"). The first start wins: a
10 s bell countdown (one constant, `BELL_S` in [src/sim/era.ts](../../src/sim/era.ts)) shows a big number on
everyone's screen with a bell each second, then the era turns to 2: the huts sink and tall striped stalls, a town hall
with a clock tower, bunting lines and yellow posts where the wagon will run pop up, rippling out from the court in
about two seconds. The era is derived (age, sections laid, whether opening day's bell has run out), so a late joiner or
a reload sees the same island. In a `proto-` room a "Lay the whole route" button (top left) lays every remaining
section at once, so a solo tester reaches opening day in seconds; Reset haul (the haul kit) also undoes opening day.
Without the flag nothing is drawn; the state and ops exist but nothing submits them.

Code: [src/sim/era.ts](../../src/sim/era.ts), [src/world/rules/opening.ts](../../src/world/rules/opening.ts),
[src/features/era-swap.ts](../../src/features/era-swap.ts), [src/pois/era/](../../src/pois/era/index.ts) (the block
sets are one table, [blocks.ts](../../src/pois/era/blocks.ts)). Lockstep state `opening`; ops `open.start`, `open.lay`
(`proto-` rooms only). Scenario: `npm run scenario -- era-swap`.

## Prototype: construction you can watch (?proto=build)

Asks "is watching it go up satisfying?" with greybox boxes only. With `?proto=build` each site's helper hut builds
up as its Helper ring fills, instead of appearing whole when the ring is full: scaffolding poles rise with the first
logs, then sills, posts, top plates, wall planks (a doorway facing the ring), the ridge, four roof boards and the
station sign's posts drop into place one after another, each with a thump and a puff of dust, as far as the ring's
stock has reached. When the ring fills, the sign's board goes up last and the scaffolding tips over and goes. The
stage is derived from the ring's lockstep stock, so every player sees the same pieces; the drops are drawn by each
tab, and a late joiner or a reload sees the stage as it is, without the drops. The build is one data table (every
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
jump onto the boiler, and you're carried; jump off and you keep its speed. It chuffs with speed, rocks and clacks over
rail joints every 4.5 m, and whistles just before leaving a stop. `&v=lively` (rockier, bouncier, more smoke, a
camera jolt per joint while riding) against the default `&v=calm`, render and feel only; `&v=fast` is lively at
6.5 m/s, through two room tunables (`wagonCruise` cm per tick, `wagonAccel` ticks to reach it; default 30 and 30, so
other rooms are unchanged) that the page sets for the whole proto- room on load (calm and lively put the defaults back).
Jumping off a moving car keeps its speed and slides it away on landing in a dust trail (longer at the fast pace); the
crates on the rear flatbed are solid.

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
