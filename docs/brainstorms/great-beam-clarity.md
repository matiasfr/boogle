> **Status: approved (owner, 2026-11-07): the recommendations.** First build queued after the track-chunk and pile fixes land.

# The great beam: what it needs, when, and how it moves

Design only; no game code. Three owner notes from the 6 November playtest, in one pass:

> "it wasn't really clear to me that I need to deliver all the logs before I get the axe for the great beam. So we
> should definitely take a game design [pass on it]."

> "it also feels really early to get one axe and then get a better axe right away."

> "we fixed the great beam carrying so it's not clipping me, but the animation still looks weird. Two options: carrying
> something big like that can have the same magical particle animation as the axe, to make it clear it's a bit
> fantastical how it's moving; or we attach a small rope to it and it's dragged along with physics."

Earlier, the owner also asked: "I can't figure out where to get the great beam. Where is it? Can I mine it?"

- **Page:** [great-beam-clarity.html](../world/great-beam-clarity.html), a small storyboard of today's chain, the
  recommended chain and the three carries, in light and dark.
- **Builds on:** the 3 November [trees call](../proposals/boogle-2.md#the-shape-of-the-game) ("the great tree needs no special
  axe"), the 5 November [solo design pass, topic 9](../research/solo-design-pass.md#9-move-the-proper-axe-before-the-great-tree-without-shortening-station-3s-ordinary-work)
  (the proper axe moved before the beam), the 5 November boiler call (an empty matching saddle on the old train), the
  [beam weight](../plans/beam-weight.md) carry and the floating axe (#1098, [place.md](../game-design/place.md)).
- **Principles:** DESIGN.md 4 (Cooperation is automatic), 7 (Telegraph everything), 10 (Slapstick over precision) and
  11 (Show, don't tell). Owner calls: Machines show their work physically; Gameplay shapes the environment; Input gets
  instant feedback; Start animation simple; Visualize in 2D HTML first; server physics only for what's shared (6 Nov).
- **Place rules:** no objective marker (3 November), and the [signposts brief](signposts.md) found direction boards
  heavy-handed: explain a blockage at the blockage, and take away before adding.

## Pitch

**Let the frame show the gap, let the tree wear the same rope, and let your first axe do it.**

When Station 3 opens, its frame has two empty timber saddles with loose gold lashings: a beam-shaped hole, like the
boiler's empty saddle on the old train. At the same moment the great tree up by Station 1 gets the same gold rope
round its trunk. Your first axe fells it in twelve strokes, and logs and beam go in whichever order you like. You drag
the trunk down on a short rope, one end scraping the ground; a friend who lifts the other end makes it level and fast.
The proper axe stops being a second axe a few minutes after the first: the forge makes it later, near the two
hardwoods it opens.

This takes the order puzzle away rather than explaining it. Of today's seven steps, two (the chest appearing, opening
it) disappear and a third (all 40 logs first) stops being a rule; the rest each get a physical sign.

## Gut question

**Standing at Station 3 for the first time, could you tell what was missing and where to get it, without asking?**

**Owner amendment, 7 November:** also judge whether moving the beam together is a satisfying shared job. Evaluate solo
viability and cooperative quality alongside each other; deliberate coordination is allowed. The approved chain and
rope-drag design remain unchanged. Principles 1 and 4 are retired, so older citations below do not constrain this review.

## What happens today

Walked as a first-time player from the production code (`src/sim/railway-line.ts`, `src/entities/railway/`), with look
captures of the default game (bare address) reached by the real-input railway bot (`dev/look/bots/railway.ts`
checkpoints `T2 laid`, `T3 axe available` and `T3 beam carried`). Local, unshipped captures in `.look/`:
`gb-t3open-uphill`, `gb-t2-player2`, `gb-tree-close`, `gb-chop-great-starter` and `gb-chop-great-starter2` (real-time), `gb-axe-available-player`,
`gb-axe-available-frame` and `gb-beam-carry-solo` (real-time). Not captured: the two-player Help carry, and a phone
camera. Stills from a placed camera show composition, not what a first-timer notices.

| Beat | What's on screen | Where it fails |
| --- | --- | --- |
| **Station 1 work (minute 1 on)** | The great tree stands a few metres from Station 1's frame, beside the camp's red chimney and shed. In production it's a scaled-up ordinary conifer: a tall brown trunk and one big cone crown. The buttress roots, pale ridged bark and split crown in the 5 November call exist only in the old `proto/place` model. | Nothing says this tree is special or that it's a beam. You walk past it for two stations. |
| **Swinging at it early** | It offers the same plain **Chop** prompt as every tree, with no why line (captured: `verb=Chop`, not blocked). In production the swing calls `adapter.beamChop()`, which submits without any local check, so the response stays `bite` and the host quietly refuses it. In `gb-chop-great-starter`, with Station 3 open and no proper axe, four presses each summon the floating axe with its sparkle and a swing at the trunk; nothing comes off, the tree doesn't shake, and the accepted beam work stays 0 after every swing (`gb-chop-great-starter2`). The rebound and `treeRebound` sound only play if the submit itself fails (offline). | A swing that looks like it bit and does nothing reads as a bug, not "not yet". This breaks the 3 November rule that "a swing always answers". |
| **Station 3 opens** | The floating bill above the pile reads `Station 3` / `logs 0/40  great beam 0/1`, the second line in small type (`gb-t3open-uphill`). The frame looks like Stations 1 and 2. Beside it stands a bare pale block (the chest stand, 2.2 m square), empty. Uphill, the great tree is the tallest tree on the skyline beside Station 1's red chimney, but nothing ties it to the bill. From where you stand when Station 2 finishes (`gb-t2-player2`, follow camera), neither is in view. | The frame has no place for a beam, so "great beam" is a word with no object. The stand is a lock nobody can read. |
| **Delivering the 40 logs** | The pile grows. Nothing points at the stand or the tree while it does. | The hidden rule: the proper axe, and so the beam, wait for the 40th log. `railAxeAvailable` needs `stock === 40`; `beamDeposit` also needs it. |
| **The 40th log** | A wooden crate with a red seal appears on the stand and bobs gently (`gb-axe-available-player`, `gb-axe-available-frame`). From the receiver it's in view, left of the 40-log stack, under `logs 40/40  great beam 0/1`. **Open** offers within 3.4 m. It uses the T1 reward crate's parts. | It reads as another cosmetic box, not "the tool for the tree", and nothing on it points uphill. A player who turns away as the last log lands sees nothing change. |
| **The proper axe** | The full "You got" show: *A proper axe*. | It comes about four minutes (bot floor) after the multi-axe, the owner's "really early" note. |
| **Back up to the tree** | 53 m uphill from the receiver; you have to turn round to see it. Twelve strokes with chips and a deepening notch, a slow fall and a thud. | Good once you're there. Nothing connected the axe to this tree. |
| **Picking up the trunk** | **Pick up** (place.md still says "Shoulder the trunk"). With logs or stone on your back it's greyed with "Empty your back first". "A proper axe first" is effectively unreachable: the trunk can't exist without the axe. | One more blocked prompt after a chain of hidden ones. |
| **The carry** | The 5.4 m trunk is rigidly parented beside Buddy's head (`BEAM_CARRY_POSITION`), arms down, at 2.2 m/s with no sprint. With Help carry, the same beam is re-aimed between both shoulders and the carrier walks at 5 m/s. From the follow camera (`gb-beam-carry-solo`, a real-time clip walking off from the stump) the trunk points along the view, so it reads as a short stub by Buddy's head that swings round as he turns. | The owner's "looks weird": a heavy log pinned by the ear with no grip, and nothing that shows *why* it's slow alone and fast together. |
| **Laying it** | Walk to the receiver; the beam flies onto the frame and sits across its top. The feed starts. | Good: this is where the frame finally shows the beam's place. |

**Why the proper axe sits at Station 3.** On 3 November the owner approved [tree tiers](../research/tree-tiers.md):
every ordinary tree works with the first axe and "the great tree needs no special axe"; that research warned that
gating the beam on the axe "would create a progression cycle" while the axe came after the path. On 5 November, after
a solo run, the owner suggested "felling only with the proper axe and a different look". The solo design pass then
moved the axe to Station 3's 40 logs so the gate wouldn't deadlock, and the decision log already noted "a guess that
may need tuning, since it can feel too soon after Station 1's axe". Today's note confirms that guess was early. Nothing
else depends on the axe being at Station 3: the [progression](progression.md), [co-op abilities](coop-abilities.md)
and [ring and economy](ring-and-economy.md) briefs don't place it.

## Research: telegraphing a requirement without markers

Brief, for what transfers to Boogle.

- **Zelda: show the lock before the key.** Classic dungeons show the cracked wall or the big door before the bombs or
  the key ([how Zelda gets lock and key right](https://howtomakeanrpg.com/r/a/zelda-lock-and-key.html);
  [Boris the Brave on lock-and-key dungeons](https://www.boristhebrave.com/2021/02/27/lock-and-key-dungeons)). The lock
  primes curiosity, so the key reads as an answer. *Boogle:* the lock is Station 3's frame, so it needs a visible empty
  place for the beam from the moment the station opens. Today the "lock" is a word on a sign.
- **Breath of the Wild's shrines.** An orange glow you can see from far away says "a thing to do is there" without
  saying what. *Boogle:* the great tree is already a landmark by size, but it doesn't say "beam". A shared material (the
  same rope on frame and tree) links the two without a marker.
- **A Short Hike.** The peak is visible from the start, and the gate is felt in the body: you run out of stamina on the
  cliff ([Wikipedia](https://en.wikipedia.org/wiki/A_Short_Hike)). *Boogle:* the honest refusal is the lesson. A swing
  that rebounds with a clear boing says "not yet"; today's silent bite says "broken".
- **Animal Crossing's Nook projects.** A bridge or house site is staked out on the ground before it's built, and the kit
  itself teaches where you can build ([iMore](https://www.imore.com/animal-crossing-new-horizons-how-make-new-bridges-and-inclines)).
  *Boogle:* the empty saddles are the stakes.
- **Death Stranding.** Unfinished structures stand at their site showing what they still need, and anyone can add to
  them ([building guide](https://gameplay.tips/guides/5742-death-stranding.html)). Its floating carrier also trails
  behind you on a tether: big loads move with you without being in your arms. *Boogle:* the requirement lives at the
  site. We skip the hologram (it's a marker by another name) and use timber and rope instead.
- **Mini Motorways.** Demand shows as pins piling up on a building, a counter that is part of the thing itself.
  *Boogle:* the log pile already does this for logs. The beam needs its own physical counter: one empty saddle pair.
- **The Witness.** A solved panel lights the cable that runs to what it powers, so you can trace the dependency by
  walking it. *Boogle:* the gold rope does the tracing, from saddle to tree.
- **Diegetic progress: Satisfactory and Factorio.** Satisfactory's space elevator is fed parts at one big machine whose
  phases you watch ([wiki](https://satisfactory.wiki.gg/wiki/Project_Assembly)); Factorio's labs visibly eat science
  packs. *Boogle:* Station 3's frame is our elevator. Its saddles and pile should show both parts of the bill.
- **Show the next thing before it's needed.** All of the above put the destination in view early and the requirement
  at the destination. The great tree already stands in view from minute one, which is an asset. It just needs to change
  visibly at the moment it becomes the next job, which is also DESIGN.md 7's "announce consequential changes".

For the carry: Tears of the Kingdom's Ultrahand makes floating heavy objects plausible with a glow and particles, but
they feel weightless. Pikmin's carriers make a big object faster with every helper, which is the same rule as Boogle's
2.2 to 5 m/s. Real horse logging drags one end of a log and lets the other scrape.

## Part 1: clarity. The options differ in where the chain is shown

These apply to whichever pacing option is chosen; option C3 only matters if today's order stays.

### C1. The frame shows the gap (recommended)

Station 3's frame gets two empty timber saddles on top, with gold rope lashings hanging loose. When the beam lands,
it seats in them and the lashings tie off. The same move the owner chose for the boiler (an empty matching saddle on
the old train). Readable from the Station 2 approach and from the receiver.

*Cost:* small. Local presentation in `src/proto/place/stations.ts` beside the existing hidden beam mesh, which already
sits "across the frame's top". No state, ops or saves. Needs a look capture at phone distance.

### C2. The tree wears the same rope, and answers truthfully (recommended)

When Station 3 opens (a change announced at the moment it matters), a gold rope sling appears round the great tree's
trunk, the same rope as the saddles. Before that, a swing rebounds with the existing recoil and `treeRebound` sound;
after, every stroke bites with chips. Also give the production tree the 5 November look (buttress roots, pale ridged
bark, split crown), which only the old prototype has.

*Cost:* small to medium. The truthful rebound is a local check in `sources.ts` before `adapter.beamChop()` (the same
`beamNeeded` facts the sim uses), so the refusal shows on the next frame with no network wait. The look is a tree-view
change in `src/render/place-tree-view.ts`. Local only.

### C3. A counter rack on the chest (only if today's order stays)

Move the chest onto the frame under a 40-peg rack. Each log lands on a peg; the 40th's weight trips the lid. The lock
is visible from the start and fills as you work. A physical counter, in the spirit of "anything the game counts gets a
visible physical form".

*Cost:* medium. New rigid parts and their motion (a storyboard and parts sheet first, per Machines show their work),
and it duplicates the log pile's job. It explains the order without removing it.

### C4. A villager glances

A little guy at Station 3 turns to look uphill at the tree when you arrive. No new words.

*Cost:* medium (NPC look-at and placement) for a weak signal. Parked unless C1 and C2 fail.

### C5. One prompt line

A greyed **Chop** on the great tree with a short why line while it isn't needed yet.

*Cost:* tiny. But it's text, the thing the signposts brief took away; keep it as the fallback if a blind playtest still
gets stuck. Wording is the owner's.

## Part 2: pacing. The options differ in what fells the great tree

Each also says where the proper axe goes, because the owner's note is that it comes "right away".

### P0. Today: the proper axe, after the 40 logs

Keep the chain and telegraph it with C1, C2 and C3. Fixes clarity only; the second axe still arrives about four minutes
(bot floor) after the first.

### P1. Your first axe, any order (recommended)

The multi-axe fells the great tree in its twelve strokes as soon as Station 3 opens, as the 3 November call had it. The
beam can go on the frame before, during or after the logs; whichever arrives last starts the feed. The proper axe
leaves Station 3 and becomes a real later step up: **the forge's first made thing**, shown on the forge when it's lit.
The two hardwoods that rebound the first axe already stand about 40 m north of the forge on the return route, so the lock
(trees that bounce) sits near the key (the forge's axe).

*What changes:*
- Sim (`railway-line.ts`): `beamNeeded` drops `l.axe`; `beamDeposit` stops requiring `stock === 40`, and the 40th log
  deposit funds the job if the beam is already allocated. This is lockstep rule math: [lockstep](../agents/lockstep.md)
  applies and the world resets with a `WORLD_NS` bump rather than a migration (owner call, No old builds).
- `railAxeAvailable` moves from Station 3's stock to the forge's lit state; the chest and stand move from
  `tools.ts`'s Station 3 placement to the forge.
- The gap between axes: in the 4 November bot run (a floor, not a person's time) the multi-axe came at 1:28, the forge
  was lit at 7:48 and Line 2's depot opened at 8:51. Today's proper axe lands at roughly 5:30 (estimated from that run, not measured), about four minutes after
  the first; at the forge it would be about six, with the first path, the pack frame and the forge build in between.
  If that still feels soon, the depot (question 2) or later is the next step.
- The axe's place in the economy: the proper axe still speeds up Line 2 and later bills, but no longer the forge's
  own. Measure with `npm run playthrough` before and after; the bot's T3 times will drop by the chest detour.
- Docs: a decision log entry superseding the 5 November axe-at-Station-3 choice; place.md's Station 3 and proper-axe
  paragraphs.

*Fit:* removes the confusing order instead of explaining it (signposts: take away first). Solo stays pleasant; co-op
splits naturally (one chops and drags, one hauls logs). It drops the owner's 5 November "felling only with the proper
axe" suggestion, so it needs the owner's yes (question 1).

### P2. A two-person saw

A big two-handle crosscut saw hangs on Station 3's frame from the moment it opens: the frame shows the gap *and* the
tool. Take it up to the great tree and saw. Alone, the far handle flops and it's slow; a friend on the other handle
doubles the pace. The proper axe moves later as in P1.

*Cost:* high. A new tool, a new two-player action with its own presence (Help carry's pattern), new motion on a rig
that warps easily (against Start animation simple). Strong DESIGN.md 4 moment, but solo becomes slower, and a second
"carry the tool there" step adds to the chain we're trying to shorten. Park it for a later, bigger tree.

### P3. Already down

The great tree is already lying on the slope from the start, wind-thrown, its root plate still holding. Once Station 3
opens you chop the root plate free (any axe) and drag the trunk. The beam itself is in view from minute one, the
strongest "show the next thing before it's needed". Proper axe as P1.

*Cost:* medium: new fallen and freed poses for the tree, its colliders and the fall's sound. It loses the slow fall
and ground shake that tree tiers kept as the great tree's memorable moment, and a fallen trunk by Station 1 may invite
early pick-up attempts.

### P4. One axe

Merge the multi-axe and proper axe: one axe for the whole run, with numbers between the two. Simplest, but it deletes
a rung the economy counts (12 presses to 5 per eight logs), the hardwoods lose their reason, and there's no "step up"
moment left. Not recommended.

## Part 3: the carry. The options differ in how the trunk moves with you

Today: rigid on the load frame beside the head, arms down. Rules stay the same in every option: one beam, a 2.2 m/s
solo pace with no sprint, Help carry at 5 m/s while the helper stays within 5 m, Drop puts it down, departures
recover it.

### K1. Float (the owner's first option)

The trunk hovers beside you (not behind: the follow camera is there) at about shoulder height with a slow bob, wrapped
in the floating axe's ivory, gold and lilac glints from `axe-sparkle.ts` (#1098). Help carry: it floats between the
two of you, still sparkling.

*Fit with speeds:* weak. Magic that floats a log makes it look easy, so the 2.2 m/s solo pace looks arbitrary and the
5 m/s helped pace has no visible cause. Floating along your path it is still seen end-on from the follow camera, the
stub problem; floated crosswise it shows its length but sweeps a 5 m bar through everything beside you.

*Cost:* tiny. `line-cargo.ts` sets the worn beam's pose (bob, side offset) and calls `sparkleAxe` on it, with reduced
motion suppressing the glints like the axe's. About one file. Aura particles are already budgeted for the axe; one more
emitter is cheap on mobile.

### K2. Rope drag (the owner's second option, recommended)

A short gold rope (the same rope as C1 and C2) runs from Buddy's load frame over the shoulder to the trunk's near end,
which hangs at hip height. The far end drags on the ground, leaving small dust puffs and a low scrape. No arm pose:
Buddy just leans a little into the rope.

*How it moves:* not a physics solver. The far end follows like a towed rod: each frame it's pulled toward the near
end and kept 5.4 m away (the follow-the-leader rule that gives a towed log its natural swing on turns), with its height
from one downward ray against the ground or deck under it. The rope is a sagging curve between two points, straight
when it's taut. On the 6 November physics call this is Local presentation derived from the carrier's pose, so every
tab computes the same look from the carrier's smoothed position; nothing new goes on the wire. A true Rapier rope with
a dynamic trunk can come later as an Owner object if the cheap version looks wrong, but it risks snagging on stumps and
rocks, jitter on the trestle and the slope, and solver cost on phones.

*Help carry:* the friend's **Help carry** lifts the dragging end. Over about 0.3 s the trunk rises level between your
two shoulders (today's helper re-aim already does the level span) and you both walk at 5 m/s. When they let go, the end
drops back to the ground with a thump and a puff.

*Fit with speeds:* strong. Alone it scrapes, so it's slow; lifted, it's fast. The speed rule becomes something you
see. Slapstick (DESIGN.md 10) comes free: the tail swings wide on corners and thumps over bumps. It also fixes the
stub: a trunk sloping from hip to ground shows its whole length to the camera above and behind.

*To a friend:* they see the same rope, slope and dust, from your smoothed pose. Their Help carry prompt moves from your
body (today) to the dragging end, which is where they'd reach for it anyway.

*Cost and risks:* small to medium. `line-cargo.ts` (worn pose, rope, the tail's follow), `carry-models.ts` (rope mesh)
and maybe one small module for the follow rule. One ray and one short rope mesh per carried beam: cheap on mobile.
Risks: the trailing trunk can sit between the camera and Buddy on downhill walks (trail it off the shoulder side, and
check from the phone camera); the tail clipping through rocks or fence posts (accepted: loose, not precise); the beam
crossing the receiver's feeder at the very end (the existing deposit flight takes over).

*Instant feedback:* the rope should snap taut and the near end lift on your own screen the frame you press **Pick
up**, before the host accepts it, which is the replication plan's acceptance bar.

### K3. Rollers, or the little guys

The trunk rides on two short log rollers you push from behind, or two little-guy workers carry it with you. Charming,
but rollers that leapfrog and NPCs that path and lift are new animation. Parked.

## Recommendation

**P1 + C1 + C2 + K2.** Your first axe fells the great tree as soon as Station 3 opens, in either order with the logs;
the frame shows two empty saddles and the tree wears the same gold rope; the tree answers every swing truthfully; you
drag the trunk on that rope and a friend lifts the end; the proper axe becomes the forge's first made thing.

It answers all three notes with one idea (the rope is the link, the gap is the lock, the first axe is enough), takes two
hidden steps and one hidden rule away instead of signposting them, and gives the slow solo carry a visible reason. If the owner wants
to keep the order, C1 + C2 + C3 is the fallback; if K2 looks wrong in motion, K1 is a one-file swap.

## Best suggestions, ranked

1. **Fix the silent bite now**, whatever else is chosen. A swing at the great tree that the sim will refuse should
   rebound on the next frame with the existing recoil and sound. It's a correctness fix under the 3 November "a swing
   always answers" rule. (`sources.ts`, small.)
2. **Drop the axe gate and the order (P1).** It removes the owner's confusion at the root and the "two axes in a row"
   pacing. Needs the owner's yes.
3. **Empty saddles on Station 3's frame (C1).** The lock, visible from the moment the station opens.
4. **The same gold rope on the tree when Station 3 opens (C2)**, plus the production great tree's distinct look.
5. **Drag the trunk on that rope (K2)**, with the friend lifting the end for Help carry.
6. **Move the proper axe to the forge**, near the hardwoods it opens. Check its timing with the playthrough bot.
7. **Picking up the trunk sets your logs down.** Instead of "Empty your back first", **Pick up** drops what's on your
   back in a neat pile beside the stump (the existing drop and recovery rack handle it), then takes the rope. One fewer
   blocked prompt. Two ops in order from one press; measure that it stays one press.

## Shape

- **Sync:** P1 changes lockstep rule math (`beamNeeded`, `beamDeposit`, where `railAxeAvailable` points) and resets
  the world with a `WORLD_NS` bump. C1, C2 and K2 are Local presentation from accepted state and the carrier's smoothed
  pose; no new ops, presence fields or saves. Suggestion 7 sequences two existing ops.
- **Reuses:** the hidden T3 beam mesh and frame in `stations.ts`; `treeRebound` and the rebound pose; `sparkleAxe` (K1);
  today's helper re-aim in `line-cargo.ts`; the existing chest and reward show for the moved axe.
- **Risks:** a still can't show whether the drag reads; judge it from real-time capture on the phone camera. Bot
  timings are a floor, not a first-timer's experience; only a blind player can answer the gut question.

## Smallest first build

One branch, a few files, no carry change yet:

1. `src/sim/railway-line.ts`: the great tree needs Station 3 active and the beam still needed, not the proper axe;
   the beam and the 40th log fund Station 3 in either order. `railAxeAvailable` points at the lit forge. Tests in
   `test/railway-line-authority.test.ts` for both orders and the moved axe. `WORLD_NS` bump.
2. `src/entities/railway/sources.ts`: rebound locally when the sim would refuse the stroke (suggestion 1).
3. `src/proto/place/stations.ts`: two empty saddles with loose gold lashings on Station 3's frame; they tie off when the
   beam lands.
4. `src/render/place-tree-view.ts` (or the tree catalog): the gold sling on the great tree once Station 3 is active.
5. `src/entities/railway/tools.ts`: the chest and stand move to the forge.
6. place.md and the decision log, after the owner answers.

The drag (K2) is the second build: `line-cargo.ts`, `carry-models.ts` and at most one small helper. Try things early
applies: an address flag `&beamcarry=float` can show K1 beside it for one comparison at almost no cost.

## Done means

Captured with `look` through the real-input railway bot on the default game, follow camera at walking height, HUD on,
plus the phone portrait size for the first two:

- **Station 3 opens** (bot beat `T2 laid`), from the receiver: the empty saddles and loose rope read; the bill is
  unchanged; uphill, the great tree shows the gold sling.
- **Before Station 3 opens**, at Station 1: a swing at the great tree rebounds with its sound and no chips, in a
  real-time clip.
- **After it opens:** the first axe's twelve strokes bite with chips and fell the tree (clip).
- **Both orders:** beam first, then 40 logs, starts the feed on the 40th; logs first, then beam, starts it on the
  beam. Accepted-state checks in the bot, stills of the beam seated with lashings tied.
- **The proper axe** appears at the forge when it's lit; the hardwoods rebound before and fell after.
- **Carry (second build):** a real-time clip of a solo drag from the stump to the receiver, from the follow camera; a
  two-player clip of Help carry lifting the end and walking together; the friend's view of a solo drag.
- `npm run playthrough` before and after, for the moved axe's timing.

What it feels like, and whether a first-timer gets it, stays the playtest's question. Not tested on a device.

## Lines that may need the owner's wording

No Boogler or NPC copy changes; none of their lines mention the axe, tree or beam. These prompts are agent-written
and change or retire under the recommendation:

- "A proper axe first" (the trunk's blocked pickup): unreachable today, retired under P1.
- "Empty your back first": retired if suggestion 7 is taken; otherwise it stays.
- "Pick up" on the trunk: with K2 a rope verb may read better (place.md still says "Shoulder the trunk").
- "Help carry": with K2 the friend lifts the dragging end; maybe a different verb.
- "Let go": unchanged.
- The proper axe's reward name "A proper axe" stays; if it comes from the forge, its line (empty today) could say so.
- C5's why line, only if the fallback is ever needed.

## Open questions

1. Should your first axe fell the great tree, with logs and beam in either order (P1)? This reverses your 5 November
   "felling only with the proper axe" suggestion. **Recommended: yes. It removes the hidden order instead of
   signposting it, and the frame and rope still make the tree special.**
   Answer: as recommended (owner, 2026-11-07).
2. Where should the proper axe go? **Recommended: the forge's first made thing, near the two hardwoods it opens.**
   Alternatives: Line 2's depot, much later; or merge the two axes (P4).
   Answer: as recommended (owner, 2026-11-07).
3. How should the trunk move? **Recommended: rope drag (K2), with the friend lifting the end for Help carry, and a
   float link (K1) beside it for one comparison.**
   Answer: as recommended (owner, 2026-11-07).

## Parked

- The two-person saw (P2), for a later and bigger tree.
- An already-fallen trunk (P3).
- A villager glancing at the tree (C4).
- Rollers, or the little guys carrying it (K3).
- A true Rapier rope with a dynamic trunk, if the cheap follow looks wrong in motion.
