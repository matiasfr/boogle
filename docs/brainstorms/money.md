> **Status: proposed (2026-11-05).**

# Money

**Pitch.** Keep money as a joke you can read: the railway's growing value sits beside an absurd hat price and an unmistakable **TODAY: $0**. The number boasts about what friends built, and the clothes stay personal and free. This serves DESIGN.md's **Show, don't tell**, because the shop itself explains what the money means.

**Gut question.** Did getting richer make the free hat funnier, or did you still expect to spend the money?

Variants differ in one thing, with payouts, prices and free clothes unchanged:

- **A:** Value shows in Pause and the shop only.
- **B:** A also gets a brief earnings pulse when construction pays.

## Best suggestions

1. **Keep comic wealth for now** (all three lenses). A shared value, personal clothes and no money gate on building, movement or rewards answer the question without adding an economy.
2. **Put the joke together at the item** (design, creative). The value, asking price, **TODAY: $0** and the wearable hat share one view, so a partner's work raises the valuation while your price stays zero.
3. **One identity** (all three). Bucks, with one chunky rectangular banknote and an oversized B that reads without colour. Brass trinkets and blue specimens keep their own looks.
4. **Prove late arrival** (systems). A finishes construction; B joins, sees the value and takes their own unlocked item; both reload wearing their own clothes. Loading a total must not replay earnings.
5. **After a yes: one receipt** (creative). One overlong receipt ending in $0, a register clack and Button's silent glance, used once rather than on every item.

## Tensions

- **Spendable money or comic score?** Systems first argued that boxes give surprise and money gives choice, then revised to the comic score as the cheaper first question. Recommendation: comic score now, with real spending as a separate owner decision. The shared total must never become a wallet.
- **Earnings pulse?** Repeated flashes may teach people to save for a purchase that never comes, so test it rather than assume it.
- **"Railway value" or "Railway takings"?** The whole panel chose value, because takings sounds spendable.

## Shape

- **Sync:** no new shared fields, presence traffic or ops. `job.score.money` stays shared, and clothes stay in `personalSlice('gifts')`.
- **Reuse:** `signs.ts`, the `score.ts` formatter, and `listPrice()` and the try-on flow in `shop.ts`.
- **Smallest build:** one delivery and one existing shop item, with variants A and B.
- **Risks:** the new label wording is a draft, and Nell's saving premise may read differently. Keep The Boogler's copy and list suspect lines for the owner.

## Done means

- `proto=place`, shop with a selected item at empty-handed framing: value, asking price and **TODAY: $0** are readable together in portrait phone and desktop stills.
- `--eval` after one construction payout: B pulses once, and A shows nothing outside Pause and the shop.
- Two-player scenario: B joins late, takes the item and reloads wearing it; A keeps theirs, and the total stays the same with no replayed earnings.

Whether it's funny stays the playtest's question.

## Open questions

1. What is money for in this pass? **Recommended: a comic shared score, with free personal clothes.** The alternative is real cosmetic spending at fixed prices. Answer: ___
2. Name and icon? **Recommended: Bucks, "Railway value", chunky B banknote.** Answer: ___
3. Should Nell's saving premise change, given you can't spend? **Recommended: leave it and judge it in play; agents won't edit it.** Answer: ___

## Parked

- Receipt, register clack and Button's glance, after a yes.
- Real cosmetic spending, with full personal milestone payouts for everyone, including late visitors.
- The Boogler's eventual charging gag.

**Disposition:** bounded experiment after the owner answers, using the shop as it stands.
