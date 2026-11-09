# Every ordinary tree answers

Approved scope: owner's **2026-11-03, trees** decision in
[decisions](../decisions.md), implemented from
[tree-tiers](../research/tree-tiers.md)'s recommendations and build plan. The owner's
task authorizes implementation; this checklist does not add another approval gate.

## Goal

Every ordinary tree works with the equipped starter axe; a better axe makes familiar
work faster. Two optional, naturally distinct hardwoods test an honest future promise.
Serves DESIGN.md **1. Toys before chores**, **4. Cooperation is automatic**,
**7. Telegraph everything**, **9. Leave something for the next visitor** and
**11. Show, don't tell**. Bills, carry capacity and progression order remain fixed.

## Design

### Catalog and appearance

- Extract `land.ts:buildTrees`'s seeded numeric placement into
  `src/proto/place/tree-catalog.ts`, depending on `layout.ts` and `terrain.ts`, never
  importing `land.ts` or `chop.ts`. Preserve RNG calls, accepted placement order and
  positions before adding explicit safety exclusions. Record any necessary displacement.
- Keep the original 28 ordinary tree IDs and great tree ID 28. Append the 362 land
  records as IDs 29–390. Select two appended records near the village/forge return
  route for the hardwood species; record exact stable IDs and coordinates in the
  as-built chapter. Selection must not alter generation order. Result: 388 ordinary,
  two hardwood, one great tree. The hardwoods yield ordinary useful construction
  logs (15 each with the proper axe); no new inventory material or required bill.
- `chop.ts` owns all tree instances, collision and animation. Remove land's duplicate
  rendering/collision creation and every tree ribbon. Keep rock bands: they continue
  to identify the existing breakable rock set truthfully. Ordinary trees share the
  same conifer language. Hardwood uses broad clustered crowns, forked thick trunks,
  flared roots and bark ridges, with a natural contrasting bark value. Show a fallen
  branch with its pale cut interior near the pair as a physical payoff cue.
- Keep native instancing, settled trees asleep, small fixed particle budgets, and
  contact blobs sized to the trunk/stump rather than the former broad canopy patch.

### Finite harvest and contact

State per tree: stable ID, productive work, issued logs, extraction ceiling,
unclaimed output, fallen flag and accepted safe fall yaw. All resource counts are
integers. Great-tree work remains twelve productive strokes and one beam.

- Starter ordinary outcome: 5 productive strokes, 2 logs per stroke, 10 total.
  Proper axe: 3 productive strokes, 5 logs per stroke, 15 total.
- A partially harvested ordinary tree upgraded before felling raises its extraction
  ceiling to 15, less all already issued output. Never replenish an already felled
  tree. Preserve the current work advantage when upgrading; define work in integer
  fifteenths (starter adds 3, proper adds 5, fell threshold 15) so the transition is
  unambiguous. Outstanding output must be collected before the tree disappears as
  a source; a bag clipping the last payout cannot delete it.
- Hardwood starter contact produces zero work and yield. Proper axe produces the
  same 3 × 5 outcome. Full bag produces zero work and zero output spending, even if
  the contact began with room and another accepted action filled it meanwhile.
- `verbs.ts` offers the existing Chop action on all standing trees once equipped,
  including full-bag targets; contact itself chooses full-bag feedback. No new input,
  pad slot or player-facing text. Preserve the great-tree empty-back interaction.
- Local presentation distinguishes bite (25–40 ms axe/upper-body hold, 2–4° bend,
  delayed crown response, advancing notch, woody attack), rebound (blade recovery,
  shallow non-growing scuff, tiny bend/flecks, quiet hard tick and short ring), and
  full bag (bundle-directed gesture/rattle, no notch/chips). Repeated refusal gets
  quieter, never a rising success sequence. Use existing procedural sound/pool seams.
  Great tree keeps its longer fall and broad landing. No movement lock or world freeze.

### Authority and persistence: bounded prototype repair

The current place experiment is explicitly Local in solo and uses a prototype
Host-style authority plus localStorage snapshots under `coop=1`; its whole railway
is not registered lockstep. The research explicitly does not authorize graduating
that transport. Keep this bounded experiment on those existing seams and document
the limitation. Do not claim server-durable persistence or crash-proof distributed
transactions. No changes to `src/world`, `src/sim`, `src/netplay` or server are planned.

- Local: meshes, notch/scuff, swing and fall interpolation, particles, sounds,
  collider poses and candidate-yaw calculations. They read accepted harvest state.
- Owner: this player's back. Reserve its offered capacity for one outstanding
  harvest request; award only the authority's accepted result, once.
- Prototype Host: shared finite harvest/progress/fall records, using `coop.ts`'s
  existing oldest-visible authority. All local and remote productive contacts go
  through one acceptance function; followers do not issue wood speculatively.
- In `coop.ts`, add a versioned place protocol identity (new message type and
  presence key, e.g. `placeCoopTrees1`) for **all** co-op snapshots/events in this
  build. Old clients ignore it; new clients ignore the old `placeCoop` messages and
  never elect a legacy client. Both builds may share the underlying room harmlessly,
  but do not share the prototype railway state. Keep unrelated carried-pose fields'
  meanings unchanged. Validate sender, tree ID, integer room/tool fields, generation
  and request ID; retain rate limiting. No global WORLD_NS bump.
- Add `harvest` requests and accepted result messages using the existing reliable
  room interface. Sender + request ID + target authority + reset generation identify
  a pending action. Authority serializes requests, remembers the latest accepted
  request/result per sender for duplicate replay, and broadcasts the resulting
  progress/revision/yaw. The recipient awards only a matching unconsumed receipt;
  other peers only update views. A stale/duplicate result cannot award twice.
  Reject stale generation, wrong authority and malformed results. A request in
  doubt must not be retried as a new award after an authority transition.
- Add a new versioned `sharedSlice('treeHarvestV1', ...)` in `chop.ts` (or a small
  cycle-free harvest module) saving partial work, ceiling, issued/remainder and
  fallen yaw. Keep legacy `felled` IDs and shape meaningful. Restore legacy felled
  trees first, then validate/overlay the new slice. New saves must serialize accepted
  pending material consistently with the personal back; do not save a tree with
  issued output that is present only in an unsaved flight callback.
- Reconciliation compares and applies partial harvest, not only a union of felled
  IDs. `applyShared` must not reset a new partial tree from an absent legacy slice.
  Late join receives all progress; reset clears requests/receipts and tree state.
  Authority transitions invalidate pending targets rather than inventing success.
- Existing localStorage saves remain the durable boundary of this prototype. A
  process crash before a save/receipt is replicated remains an explicit limitation;
  cover normal simultaneous final hits, late join, reload and duplicate delivery.

### Falls and navigation

Current checkout already has 362 decorative trunk colliders batched on one body;
the research's zero-collider baseline is stale. Measure the body-count change, not
an invented 362-new-collider delta. Independently removable standing colliders may
cost more bodies; keep static settled outcomes and avoid per-tree rigid simulation.

Choose a safe fall direction before committing the fell, sampling the whole swept
canopy/trunk footprint against path/track centerlines, door/apron/bridge zones,
spawn/return spots, frame approaches and the great-beam pickup route. Try bounded
alternate yaws; where no long footprint is safe, use a short upright collapse into
the stump footprint, with matching visible remains/collision. No invisible long
log and no long mesh across a protected route. Before creating settled collision,
each client moves its own intersecting player to clear terrain outside the footprint
(use the existing static-obstacle/halts recovery pattern). Final yaw/shape comes
from the authority, so peers do not choose conflicting outcomes.

## Steps

- [x] **1. Baseline and catalog.** Parent owns baseline playthrough/frame captures;
      never edit while they run. Implementer extracts `tree-catalog.ts`, updates
      `land.ts`, `chop.ts` and `layout.ts` only as needed for hardwood constants.
      Verify legacy IDs, 362 appended placements, species count, trunk approach and
      exclusion checks. Keep check green before committing this stage with its owning
      design documentation.
- [x] **2. Accepted finite harvest.** Implementer owns `chop.ts`, `coop.ts`,
      `job.ts` only if needed, and a small prototype helper if it avoids cycles.
      Implement work/yield/remainder, versioned co-op arbitration and partial saves.
      Exercise 5+3+5+2 proper-axe collection with an eight-slot bag, final-hit clipped
      payout, mid-tree upgrade, full bag, reload and two concurrent final requests.
      Total ordinary output is 10 or 15, never 13 or duplicated.
- [x] **3. View, feedback and safe fall.** Implementer owns `chop.ts`, `verbs.ts`,
      tree geometry/catalog, and existing `src/render/place-sfx.ts` if adding recipes
      (read `src/render/AGENTS.md` first). Keep rock bands and all copy unchanged.
      Inspect chopped scenery tree, both hardwood silhouettes and a rebound frame;
      compare bite/rebound/full-bag motion sheets/curves. Test door, track, spawn and
      player-intersection fall cases plus dense felling and standing/felled frame cost.
- [x] **4. Bot and economy.** Parent owns `dev/look/bots/place.ts`,
      `dev/economy/model.ts` and measurement docs. Bot selects nearest eligible
      reachable ordinary tree (hardwood only after axe), rejects unreachable or
      zero-progress targets and respects actual scene geometry. Correct only stale
      upgraded harvest arithmetic (4 → 5); leave bills/carry untouched. Run broker
      playthrough, read report on failure, then `npm run playthrough --compare` using
      saved results without bypassing the broker to start a browser.
- [x] **5. Evidence and documentation.** Parent owns
      `docs/game-design/place.md`, updating run, sound, measured and persistence scope.
      Reuse/extend existing `dev/look/evals/place-coop.ts` for harvesting acceptance
      checks and targeted look evals for captures; no new UI unit tests or custom
      browser harness. Broker `scenario world-inputs` is the required existing core
      smoke scenario; it does not prove place harvest. Run existing place-exploring
      scenario if relevant and supported; use two-player look for this contract.
      Record first path, axe/pack, depot and trains times, and exact first-path→depot
      interval remaining from the old approximately eight-minute hunger stretch.
      Record actual frame-time samples and renderer/body counts before/after.
- [x] **6. Review and commit.** Parent rereads/simplifies diff and reviews accepted
      effects, old-build isolation, save validation and static fall collision. Run
      `npx prettier --write` and ESLint on changed files, then `npm run check`; fix
      failures. Repeat affected broker captures/checks after final source changes.
      Small imperative commits with DESIGN.md principles in each body. No push/ship.
      Final handoff names actually opened PNGs, observations, manifests, bot failures
      and device/audio/realtime limitations. Stop at the owner's hunger playtest.

## Risks and boundaries

- `depot.ts` and `pair.ts` cart cargo code belongs to another unshipped branch: do
  not edit either file. Parent ran `npm run inflight`; FETCH_HEAD permission failed.
  No network retry is permitted by this task. Preserve all existing local changes.
- `apply`/acceptance must mutate data only; inventory/sound effects follow accepted
  results. A queued request is not success. No timeout may invent a material award.
- Keep imports acyclic; this directory already contains cycles and registry debt
  cannot grow. Tree placement belongs below drawing and chopping, not in land's
  rendering module. No new framework or general transport rewrite.
- The additional bodies, active fall instances, particles and contact shadows
  need measurements. Rendering counts alone are not frame-time evidence. No device
  performance or heard audio claim follows from a successful capture.
- Preserve every existing copy string. Known now-false internal objective:
  `objective.ts:57`, **“Chop a tree with an orange band.”** It remains an internal
  progression label, not a current HUD prompt. Rock line remains true because rock
  bands stay. Search residents/Boogler lines and list further conflicts for owner.

## Open questions

None blocks the approved build. Owner playtest answers whether the remaining
hauling still makes the little guys desirable. Do not increase bills, reduce yields
or move upgrades to recover lost time. Prototype local-save/authority-crash limits
remain explicit; production shared-world persistence is later architecture work.

## Execution record

Completed on 4 November; measured results, inspected images, failed attempts and remaining
owner questions are in [place: Measured](../game-design/place.md#measured). The 362 decorative
colliders were already present on one compound body, so the standing change is +361 bodies,
not +362 shapes. No changes to depot.ts or pair.ts; no push or ship. Core harvest and its
required owning documentation form one commit; bot/evidence tooling forms the next.

## Rail-cart integration follow-up, 4 November

The owner authorized rebasing onto current main, preserving its automatic rails and ridden-cart
bonus, renaming the false internal telemetry label, and measuring without retuning. Rebased onto
`88c7c36b`; retained both cart capabilities and all cart messages under `placeCoopTrees1`.
Filtered legacy beam presence as well. `depot.ts` remains identical to main; `pair.ts` changes only
that presence guard. The internal label is now “Chop an ordinary tree.”; player-facing copy stays.
The former no-edit boundary on the then-unshipped cart branch is superseded by this explicit
integration request. Fresh baseline/after runs, Q5 strategies, failures, compatibility checks
and visual limits are recorded in [place: Measured](../game-design/place.md#measured). No retune,
push or ship. Stop at the owner's hunger playtest.
