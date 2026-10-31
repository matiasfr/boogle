# 6.5 Gifts

- **What and how it plays.** Things you throw land on the island and lie there for anyone to pick up (if their hotbar
  has room) until they rot. The frisbee waits on a perch on the lighthouse deck and twinkles so you can spot it; a
  perch refills a minute after its item is taken. Throwing is 6.7, what you carry is 6.6.
- **Controls.** E / pad B: Pick up (the interact button, nothing new). Logs are taken from their bundle: 6.19,
  [haul.md](haul.md).
- **Sync kind.** Lockstep. Ops `gift.take` (`id`) and `gift.toss` (`k` kind, `i, j`, `y` resting height or -1 ground /
  -3 lost, `l` launch, `n` nonce); state `gifts`. The frisbee perch is a static layout filled before tick 1.
- **Tuning** ([src/sim/gifts.ts](../../src/sim/gifts.ts)). Thrown things last 6,000 ticks (10 min); perched items never
  expire; a perch refills 600 ticks (60 s) after its item is taken; at most 48 items. When full, a new throw sweeps
  away the oldest thrown item.
- **Files.** [src/sim/gifts.ts](../../src/sim/gifts.ts), [src/sim/gift-catalog.ts](../../src/sim/gift-catalog.ts),
  [src/world/rules/gifts.ts](../../src/world/rules/gifts.ts), [src/adapters/gifts.js](../../src/adapters/gifts.js), [src/features/gifts.js](../../src/features/gifts.js).
- **Known issues and limits.** None known.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
