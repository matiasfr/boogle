> **Status: proposed (2026-11-05).**

# Recovery rack and regrowth

**Pitch.** Your lost logs turn up on a crooked outdoor rack you already pass on the way through town. Cut trees come back as young growth around the pale stumps you left, so the return journey shows your railway, your clearing and your cargo at once. The [supply rules](../decisions.md) are the owner's and stay fixed: this covers only how they read. It serves DESIGN.md's **Show, don't tell**.

**Gut question.** After noticing a bundle was gone, did you work out where it went without being told?

Variants differ in one thing:

- **A:** A bare rack.
- **B:** The same rack with a silent worker tidying it.

## Best suggestions

1. **One permanent outdoor rack on the town route** (all three). It's open before the forge is built, with ordinary pickup and no collection errand. Its crooked roof sets it apart from the cart's delivery rack.
2. **Keep the cut visible through regrowth** (all three). Pale stumps stay under shoots and young trees, and the finished track's clearing stays bare. Replenishing then can't look like a rollback.
3. **Keep recovered stock separate from made goods** (design, creative). Identical logs beside a worker can read as "this place makes wood", so the panel treats this as the main thing to observe.
4. **After a yes: the interrupted tidier** (all three). Your friend takes the bundle mid-straightening, and the worker finishes holding nothing, followed by one wooden tap. Pickup is never delayed, and stock is always available.

## Tensions

- **Where exactly?** Design chose the village entrance or railhead route; creative chose the forge courtyard; systems would test both. Recommendation: forge courtyard first, as the view and inventory stay the same if it has to move. Pick whichever players pass twice.
- **Show each drop's exact bundle?** Creative and design like recognisable bundles, but systems warns that counted stock may not keep that history. Recommendation: no second inventory or bundle history, using pile identity only if it already exists.
- **Bigger back load as a joke?** Creative pushes back, and I agree: keep Buddy's compact bundle.

## Shape

- **Sync:** counts, rack stock and growth stage come from `slice2-supply`'s accepted, conserved state. The rack's reaction, the worker and tree visuals are local presentation, and never decide what's harvestable.
- **Reuse:** existing instanced stump and tree meshes, and ordinary pickup.
- **Smallest first build:** the rack in one spot plus stump-with-shoot stages, without the worker.
- **Risks:** a tidy rack may not explain a missing drop; a worker animation must never hold up a transfer.

## Done means

- Bot setup with a drop past its timer: logs appear on the rack, and pickup works with the same counts. Check it in a game-camera still from the town path.
- Empty room, reload and restart with stock on the rack: nothing is lost or duplicated.
- Stills at each growth stage show the pale stump, and no regrowth by finished track.
- Variant B: taking stock mid-tidy is immediate, in real-time motion.

## Open questions

1. Rack location? **Recommended: forge courtyard, open before the forge.** Alternative: village entrance. Answer: ___
2. Worker in the first build? **Recommended: no, add after a bare rack reads.** Answer: ___

## Parked

- The worker's genuine delivery when someone witnesses it.
- Recognisable bundles, if the supply model ever keeps them.

**Disposition:** proceed with `slice2-supply`'s rules; presentation may land after it. Slice 2's merge doesn't wait for the worker.
