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

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
