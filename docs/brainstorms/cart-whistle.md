> **Status: building (approved, owner, 2026-11-05).** Variant A's "Call cart to forge" handle is **cut** (owner,
> 2026-11-09, [decision](../decisions.md#trains-and-the-world)): the live cart already serves the next rack by itself.
> The rack's delivery status is **kept**.

# Cart whistle: do I trust the little guys to bring the rest?

Seed (owner, 4 and 5 November, solo on iPhone): "It helped that the little guys brought me some, but then I had to go all the way back to get the rails from the forge." "I was confused on how to use the whistle, how to trigger it and where, and what it did." Whistled twice in the run.

## Pitch

The whistle isn't the real problem. Rails already reach the last stations by themselves, but nothing says so. Line 2's station 5 needs 24 rails and the cart carries 16, so the shelf empties between loads and reads as "walk home". Show the promise at the rack: more rails are coming, and whether the forge is holding them up. Then give the whistle one honest job at one visible place, a handle at the forge's stop labelled "Call cart to forge". This serves DESIGN.md 7, Telegraph everything, and 11, Show, don't tell. It has to keep 1, Toys before chores: calling must never become permission for routine deliveries.

## Gut question

**When you ran short, did you trust the little guys to bring the rest, or feel you had to walk home?**

Same station, one shipment too few, and the same delivery, speed and capacity. One thing differs:

- **A, readable service:** a status indicator at the rack, and nothing to press there.
- **B, readable service plus a request:** the same indicator, plus an optional "Bring rails here" at the rack. It acknowledges a shipment already coming, or asks for the next.

Owner on the solo run: felt they had to walk home, and did not trust them to bring the rest.

## Best suggestions

1. **Keep the rack truthful across the gap** (all three). Loading, travelling, unloading and waiting for the forge each look different, and an empty shelf with more due doesn't look finished.
2. **Put the whistle where it acts** (design, creative). A chunky handle at the forge's stop, called "Call cart to forge", links the action to its destination.
3. **Stop a whistle undoing a delivery** (all three). Today a recall can reverse a loaded cart. Let it finish unloading, then come back, and acknowledge the call straight away.
4. **Add the frontier request only if needed** (systems, creative). If readable service still feels detached, B shows whether pressing a button adds anything.
5. **After a yes, one earnest salute** (design, creative). A little guy acknowledges you, and a friend can arrive atop the loaded cart.

## Tensions

- **Frontier call now or later?** Creative started with "Bring rails here" and then backed down. Systems wants it deferred, because a command with nothing to change teaches a ritual. Recommendation: A first, B only if A leaves you walking home.
- **Mechanical indicator or helpers?** Helpers are more charming but cost animation and must read on mute. Recommendation: mechanical first, with the helper as polish.
- **Before or after the replay?** Panelists assumed after, under the earlier cart-first deferral. You've since asked for everything before the replay. Recommendation: build the indicator, handle and label now, since they explain what exists. Cart-first stays after the replay.

## Shape

- **Sync:** the indicator and prompt are Local, derived from existing cart state. Cargo, dispatch and stop stay with the prototype authority. A queued recall needs authority-owned state, a snapshot and additive messages, keeping the old `cartCall` meaning.
- **Reuses:** `pair.ts` interaction, `depot.ts` cart state, `registerInteractable`, existing cargo flights.
- **Smallest build:** one status function beside the cart in `depot.ts`, reading phase, cargo, pending unload and rack stock. Not `railsOwed()` alone: it reaches zero before a shipment arrives. Add the rack indicator, the forge handle and the new label. Bills, capacity and speed stay as they are.
- **Risks:** clear waiting isn't enjoyable waiting, and a past bot waited 1:49 here. Two players can pull against each other.

## Done means

Capture with `look`, on the normal phone camera with sound off:

- Line 2's station 5 with one shipment too few: the rack shows more coming after you take the last rail.
- The forge holding things up: a distinct waiting state.
- The forge stop: handle and stopping space together, and its prompt.
- A recall during a loaded delivery: the delivery finishes, and the call is acknowledged at once.
- Two players calling together, and authority leaving mid-delivery.

Whether it feels good stays the playtest's question. Not tested on a device.

## Open questions

1. Build the indicator, handle and label before the replay? **Recommended: yes.** They explain what already exists.
   Answer (owner): yes as recommended.
2. Should a recall wait for a loaded cart to finish unloading? **Recommended: yes, with an instant acknowledgement.** It changes behaviour, and needs some networking.
   Answer (owner): yes as recommended.
3. Add "Bring rails here" at the rack now? **Recommended: no, only if the readable version still leaves you walking home.**
   Answer (owner): yes as recommended.

## Parked

- A little guy's salute and one answering sound, after a yes.
- A friend arriving on top of the loaded cart.
- Cart-first progression and any riding changes, after the replay.

## Disposition

**Proceed.** It clarifies existing service without changing progression. Test readable service alone first (variant A); "Bring rails here" only follows if that isn't enough.
