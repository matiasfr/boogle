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

Code: [src/sim/piles.js](../../src/sim/piles.js), [src/world/rules/piles.js](../../src/world/rules/piles.js),
[src/adapters/piles.js](../../src/adapters/piles.js). Lockstep state `piles`; ops `pile.drop`, `pile.take`.

## The haul stack

What you pick up goes onto a stack on your back: one material at a time (you can't pick up ore while carrying logs),
up to 60 pieces (at most 40 drawn). A chip above the hotbar shows the material and count while you carry anything.
Past 20 (the soft cap) the stack sways harder and the chip turns orange; jumping then knocks the top pieces (up to 3,
never below 20) into a pile behind you. Walking into a pile takes as much of it as fits; its pieces fly to your back at
once, and the count follows when the host confirms (about half a second). Your stack belongs to the room: it waits for
you after a reload, and other players see it on your avatar. No new control: pickup is walking, pouring is walking
into a site's ring.

Code: [src/sim/stacks.js](../../src/sim/stacks.js), [src/world/rules/stacks.js](../../src/world/rules/stacks.js),
[src/features/haul-stack.js](../../src/features/haul-stack.js). Lockstep state `stacks` (by roster index), changed by
other ops (`pile.take` adds, `pile.drop` spills). Remote stacks are matched to avatars through presence `u`.

## Sources: palms give logs

In the wood age the 36 home palms are the log sources. Each holds 2 charges, shown as a small bundle of logs at its
foot. The palm's Shake (E, in reach) now does both: drops ripe fruit (the toy, unchanged) and, while the palm holds
logs, spends a charge and puts 4 logs straight onto your stack (they fly to your back). What doesn't fit (another
material on your back, or a full stack) drops as a pile beside the palm. The ball still knocks fruit loose but never
logs: the ball is never income. Every palm refills when a section is laid, and every 20 s one empty palm, picked from
the room seed and the tick, refills on its own.

Code: [src/sim/sources.js](../../src/sim/sources.js), [src/world/rules/sources.js](../../src/world/rules/sources.js),
[src/features/log-sources.js](../../src/features/log-sources.js), the Shake in
[src/adapters/gifts.js](../../src/adapters/gifts.js). Lockstep state `sources` (the current age's charges only); op
`src.take {id}`.

## Work sites, plaques and tiers

The railway is preset ([src/sim/route.js](../../src/sim/route.js)). The 0.1 testbed has three wood sections from the
court toward the lighthouse, at (11, 6), (10, -12) and (8, -30), each with a work site: a sign with the section's plaque
and two rings on the ground, Track (left, gold) and Helper hut (right, green). Only the open site (the first section
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

**While nobody plays.** Helper huts keep working offline. When a tab starts hosting a saved world, it measures how
long nobody hosted (wall clock against the save's tick), and the huts' freight for that time (one piece per hut per
27 s) lands in the open Track ring, capped at one section. The machine still waits for a player to start it. Absences
under a minute bank nothing.

Code: [src/sim/scripted-run.js](../../src/sim/scripted-run.js) (`runAt`, `MACHINE_RUN`), op `site.run {s}` and the
`sites` tick; the bank: [src/sim/bank.js](../../src/sim/bank.js), [src/world/rules/bank.js](../../src/world/rules/bank.js),
[src/features/helper-bank.js](../../src/features/helper-bank.js), op `bank.wake`, state `bank`. Scenario: `npm run scenario -- haul-loop`.

Code: [src/sim/sites.js](../../src/sim/sites.js), [src/sim/tiers.js](../../src/sim/tiers.js),
[src/world/rules/sites.js](../../src/world/rules/sites.js), [src/features/work-sites.js](../../src/features/work-sites.js).
Lockstep state `sites`; op `site.stock {s, ring, n}` (validated against your own stack, the age's material and the open
site). Ring reach is not checked by the host, like every reach today.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
