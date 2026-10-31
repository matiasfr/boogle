# 6.5 Gifts

- **What and how it plays.** Home palms grow fruit you can shake loose (E within 2.1 m of the trunk) or knock down with
  a ball moving at 3 m/s or more; fruit falls on the side you shook from. Nothing washes up on the beach any more (removed 2026-10-30; items saved
  before that age out). The frisbee twinkles so you can spot it. Anything lying around can be picked up (if your hotbar
  has room) or was thrown there by someone.
- **Controls.** E / pad B: Pick up, or shake a palm.
- **Sync kind.** Lockstep. Ops `fruit.drop` (`t` tree, `d` direction 0..7), `gift.take` (`id`), `gift.toss`
  (`k` kind, `i, j`, `y` resting height or −1 ground / −3 lost, `l` launch, `n` nonce); state `gifts`. Palms and
  the frisbee perch are a static layout filled before tick 1.
- **Tuning** ([src/sim/gifts.js](../../src/sim/gifts.js)). Regrow 2400 ticks (4 min) after a drop; ripening fruit visibly
  grows from 25 % to 80 % size. At most 64 trees, 48 items. Saved shore items still age out after 12,000 ticks
  (20 min); the wash-up schedule is pinned to never (`NEVER`). Fruit and thrown things last 6,000 ticks (10 min);
  perched items never expire; a perch refills 600 ticks (60 s) after its item is taken. When full, a new throw sweeps
  away the oldest thrown item. Fruit per tree is fixed by a hash over the cycle coconut, mango, coconut, banana,
  pomegranate, coconut, apricot.
- **Files.** [src/sim/gifts.js](../../src/sim/gifts.js), [src/sim/gift-catalog.js](../../src/sim/gift-catalog.js),
  [src/world/rules/gifts.js](../../src/world/rules/gifts.js), [src/adapters/gifts.js](../../src/adapters/gifts.js), [src/features/gifts.js](../../src/features/gifts.js).
- **Known issues and limits.** Items saved on the old 129-cell grid stay at their old cells (now far-corner sea) until
  they rot ([tech-plan.md](../tech-plan.md) B3).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
