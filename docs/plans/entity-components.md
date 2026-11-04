# Plan: small owned behaviours on entities

> **Status: proposed; wait for owner approval before implementation.** The owner authorised this plan and research, not a build. Source inspected at `050d6e252f5d`, 3 November 2026. No game code changes in this task.

## Short research and recommendation

**Use a convention, not a component framework.** Ball state is 248 lines, player state 265, remote-player 256 and camera 63. The largest mixed modules are place gifts (1,522), folk (1,179), tech (994) and rail (987); they remain prototype-owned and already share several helpers. Carrying, buoyancy and seating resemble each other across objects but differ in authority and behaviour. They are poor first abstractions.

One concrete duplication earns a small proof: remote-player and the arrival preview both cache name text, replace a label child and dispose its texture/material. Extract that behaviour into one typed object owned by each entity. The [research](../research/entity-components.md) contains the line inventory, live Unity/Unreal/Godot comparison and seven recommendations. Unity offers automatic lifecycle/dependency lookup; Unreal also permits owner-driven component calls; Godot favours explicit dependencies. Epic's current UEFN Scene Graph is Beta and UE6 remains future direction. Matching their composition idea is useful; future migration is only a small bonus.

**Disposition:** approve just the two label conversions below, or retain only this convention until a gameplay object needs it. No component runtime is a prerequisite for round-4 play or the railway conversion. This proposal does not expand the independent-work exceptions in [owner-calls](../agents/owner-calls.md).

## Goal

Let reusable behaviour belong to an entity without making entity factories or phase methods hard to read. Serve DESIGN's **Small and readable**, **Understandable at a glance** and **Clear authority**, with unchanged player-visible behaviour and no new dependency, wire shape or simulation rule.

## Design

### Alternatives and chosen API

**A: typed owned objects, explicit forwarding (chosen).** A factory returns a behaviour with only the methods it needs. An entity stores it in a named typed field, calls it in its existing methods and disposes it. No base class or compulsory `Component` interface. A stateless operation remains a function.

**B: automatic component bag (rejected for now).** `attach/get/detach` with typed tokens could centralize teardown and inspection. It would also require a second lifecycle, deferred mutations, dependencies, failure policy and scheduling. A component called inside `ball.prePhysics(-90)` cannot run after `player-intent(-80)` without a separate global slot. Do not hide that problem behind list order.

**C: owned entities of another kind (existing fallback).** Use a separate kind when a second global slot or independent lifetime is actually needed. Keep literal orders and explicitly linked disposal; do not turn every helper into a kind. Ball and ball-carry remain unchanged.

For the proof, create only `src/components/name-label/view.ts`:

```ts
// Proposed public API, not implemented by this plan.
export function createNameLabel(parent: Object3D): NameLabel;
export type NameLabel = {
  setText(key: string, display?: string): void;
  describe(): { text: string; attached: boolean; disposed: boolean };
  dispose(): void;
};
```

`Object3D` is a type import. The view imports the existing `makeLabel` from `src/player/avatars.ts`; it does not change label geometry, canvas, font, material, position or warm-up. The **key** is change detection; **display** defaults to key. Cache key `''` initially with no sprite, matching both existing callers. Same key returns immediately. On a new key: remove/dispose the old sprite, call `makeLabel(display)`, parent the result, then retain the new key. Construction itself creates no label.

### Attachment, detachment, ownership and failures

- **Attach** means create the behaviour and store its typed reference on the owner, e.g. `nameLabel: createNameLabel(avatar)`. It is not `scene.add`, a registry operation, an inherited transform, or a new walker. Required dependencies arrive as constructor arguments; missing dependencies are a TypeScript error, not automatic `RequireComponent` creation.
- Prefer construction before `spawn`. Lazy resources may be created exactly once inside an already-owned method: the fall preview creates its avatar on its first update today. Store the nullable label field beside that avatar and create both in the same existing branch. This event allocation does not introduce steady-frame work.
- **Sibling access** is a direct argument/reference, e.g. `createCarry(bodyState, ownerSync)`, never `get('owner')`, a type-token registry, scene traversal or a hidden current-world global. Pass a narrow interface; do not pass the entire entity merely for convenience. A component that needs every sibling probably belongs in the owner.
- **Detach** is terminal `dispose()` followed by clearing the owner's nullable field, if independently removable. This proposal needs only owner teardown. Dispose marks itself disposed first, removes its owned child, frees its texture/material once, drops references, and is idempotent; later `setText` is a no-op. Reattachment needs a new instance. No component stealing or live dependency rewiring.
- The owner still registers its root mesh and all bodies exactly once through `spawn`. Components may own child visuals, scratch state and genuinely removable subscriptions, but never call `addBody`, `removeBody`, `scene.add`, `onFrame` or fixed-step registration themselves. Shared geometry/materials remain their creator's responsibility; no recursive “dispose every descendant” utility.
- `despawn` marks the owner dead immediately; the existing walker skips it. At the existing end-of-frame-phase flush, core detaches mesh/bodies, then calls owner `dispose`, which calls owned disposers in reverse dependency order. Fixed-step despawns still wait for the next frame-phase flush. A component must not expect a live registered body in `dispose`.
- Preserve walker exception semantics: a throwing component call aborts the remainder of that entity's method, not other entities; the existing walker reports once per kind/phase and retries next time. Teardown must use `try/finally` when the owner has multiple independent resources, so an avatar-material disposal failure cannot skip label cleanup. Factory/spawn failures must dispose any already-created owned resources before rethrowing; no new rollback engine.

### Ordering and allocation

Entity methods remain the **only scheduled methods**. Call components explicitly in source order inside them; components have no `order` fields, Awake, Start, enable, event bus or automatic Update. Construction/module loading does initialization. No arrays of bound methods, spreads, sorting, dependency searches or object argument creation per frame. Reuse scratch vectors; diagnostics allocate only on request. The name-label helper allocates only on construction, actual text changes and inspection. Existing caller string processing is not a claim of zero allocation across the whole game.

Keep these exact contracts, as defined by [entity.ts](../../src/entity/entity.ts), [walker.ts](../../src/entity/walker.ts) and [loop.ts](../../src/loop.ts):

| Clock/phase                   | Existing order that composition must preserve                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| prePhysics, once per frame    | remote-player -100 → ball owner resolution -90 → player intent -80 → ball-carry sample/prepare -70                     |
| fixedPre, 0–4 times per frame | platforms 10 → player-jump 30 → remote-player 39 → player controller 40 → ball surf 45 (place seat separately uses 21) |
| fixedPost                     | ball 15 → player 20; other existing hooks unchanged                                                                    |
| postPhysics (`world`)         | ball -300 → player -290 → ball-carry -280                                                                              |
| update                        | ball-view -300 → player-view -290 → remote-player -280 → camera -200; fall-preview remains 15                          |

One kind still gets one slot per phase. Spawned entities first run at the next walk of that phase that starts after spawn; cached list length prevents same-walk insertion. Components add no competing walk semantics. A second global slot still means a second kind, per the [owner's decision](../proposals/boogle-2.md#process).

### Inspection and profiling

Use existing `describe`, e.g. `describe: () => ({ components: { nameLabel: nameLabel.describe() } })`. For the lazy preview return `nameLabel: null` until created. Existing [inspect.ts](../../src/entity/inspect.ts) sanitizes this into `entity.state.components.nameLabel`; it requires no new schema or traversal. Component names in this returned JSON are **diagnostic keys**, never runtime lookup keys. Report text, attachment and disposed state, not a Sprite or owner reference.

Cost stays in existing profiler rows: label maintenance in **`remote-player prePhysics`** and **`fall-preview update`**, cleanup in **`entity teardown`**. There is **no independent component timing row** in A; do not label the owner's entire time as the component's time or add nested `mark()` calls that corrupt the flat profiler. Named `setText` frames can be examined with the existing allocation harness if needed. If independent scheduling/budgeting becomes necessary, use a separately defined kind or propose a measured profiler extension then. No inspector, walker, profiler or `dev/look/hitches.ts` changes for the proof.

### State, headless and sync

Components inherit no authority automatically. Every state field still names its writer and sync kind:

| State                                                    | Authority and API                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name-label cache/sprite, decorative bob, animation state | **Local** view; no network API. Remote names are read from existing presence, not republished by the label.                                                                                                                                                                                                                 |
| Player movement; ball pose/held claim                    | **Owner**, current owner writes. Keep `addPresenceField`/`onRemotePresence`, `createSnaps`, and ball's `createOwnerSync`; preserve epochs, held semantics, null/off handling, wire keys and 20 Hz delivery.                                                                                                                 |
| A later shared NPC behaviour                             | **Host** where the lead tab computes it, with existing `addHostField`; restarts on lead replacement. Components do not create persistence.                                                                                                                                                                                  |
| Durable world counts, gifts, accepted edits              | **Lockstep**, server-stamped edits and pure rules. **Rules never touch components:** no imports, lookup, callbacks into them, component state in hashes, or three.js/physics in rules. Adapters may read rule state and call view components; irreversible effects still wait for `onApplied`, and snapshots rebuild views. |

The proof is Local only. No rule file/type entry, op, state key, `edits`, invariant, `env` fact, control ID or pad slot is added. Entity IDs remain local, never protocol identity.

For future stateful reuse, use `src/components/<behaviour>/state.ts` for render-free state/logic and `view.ts` only if it draws. `state.ts` may use the physics facade for Owner work; this does not make it deterministic Lockstep. Headless entity `headless.ts` constructs state behaviours, while browser `index.ts` constructs views; no barrel combining both, no component autoload glob. `dev/sim/world.ts` continues loading only entity headless entrypoints. Node runs prePhysics/fixed/world, not update/late; do not put required gameplay in view callbacks. The label proof is intentionally browser-only and makes no claim to add remote players or place objects to headless simulation.

**Permanent registrations are not detachable resources.** `createOwnerSync` currently installs `onPeerRemoved` and `keepPresenceWhile` listeners with no unregister; `addPresenceField`, `onRemotePresence`, `addHostField` and interaction providers also cannot be assumed to unsubscribe. Keep literal registrations at module/kind lifetime, reading a live typed instance where necessary and returning null when absent. Do not instantiate owner-sync per short-lived component or implement generic `PresenceComponent`. Any new transient subscription contract is separate work with network verification.

### Files, lint, registry and agent rules

Shared behaviours with a demonstrated second owner go in `src/components/<kebab-name>/{state,view}.ts`, only creating the files needed. Keep one-owner extraction beside its entity until reuse exists. Export descriptive factories (`createNameLabel`) and infer concrete types; no `BaseComponent`, decorators, mixins, universal `enabled` or `components: any[]`.

In `eslint.config.js`, when the first shared folder lands:

- Include `src/components/*/state.ts` in the current entity-state restrictions and forbid any `**/components/**/view.ts` import from state files, alongside existing scene/DOM bans. Preserve existing rule arrays rather than replacing them accidentally.
- Add `**/components/**` to the game-layer import bans for `src/netplay`, `src/net`, `src/world` and physics infrastructure as appropriate; preserve the existing type-import policy of each block. Sim/rules already use import allow-lists—verify they reject components, do not weaken them.
- For `src/components/**/*.ts`, prohibit value imports of lifecycle/registration APIs (`defineKind`, `spawn`, `despawn`, `onFrame`, `onStart`, `onPreStep`, `onPostStep`, `addBody`, `removeBody`, presence/host/listener registration and `registerInteractable`). Owners call these. Keep `boogle/use-an-entity` active; add no ignore or suppression. Components may attach their own child to an explicitly supplied parent.

**Registry changes: none.** `dev/scan/read.ts` and `dev/registry/scan.ts` continue seeing literal `defineKind`, presence keys and actions at their current sites. No generic wrapper that hides a registration, inferred order, component catalogue or component ID registry. Before/after `npm run registry -- --json` must retain the same scheduling and network registrations, with no new knot/debt allowances.

An agent uses a behaviour only for **two matching implementations with the same ownership contract**, or one independently understandable domain making a real entity difficult to maintain. Cite those sites in its change. Keep a plain function for stateless arithmetic, an ordinary module for a service, and a pool for hundreds of visual instances. Do not extract because a file crossed a line threshold, an engine has the class, or a later port might want it.

## Proof: two conversions, one behaviour

These sketches show the seam, not full replacement files. Existing method bodies around it stay in their original order.

**1. Remote-player label.** Before, `index.ts:210–218` compares `r.name`, removes/disposes `label`, calls `makeLabel`, then adds it to the avatar; `disposeLabel` is also called on leave. After:

```ts
const nameLabel = createNameLabel(avatar);
const entity = spawn({
  kind: 'remote-player',
  mesh: avatar,
  bodies: [body],
  nameLabel,
  prePhysics({ now }) {
    // Existing snapshot/ride/first-pose and paint logic, unchanged.
    nameLabel.setText(r.name); // exactly where the old label block stood
  },
  // Existing fixedPre and update methods, unchanged.
  describe: () => ({ components: { nameLabel: nameLabel.describe() } }),
  dispose() {
    try {
      avatar.userData.mat.dispose();
    } finally {
      nameLabel.dispose();
    }
  },
});
```

Delete the local `label`, `labelText`, `disposeLabel` and replacement block. Retain the early `!r.snaps.length` return, all ride/pose timing, `Remote` augmentation and `r.avatar` consumers. Empty initial remote names still create no label; a transition from a nonempty name to empty still calls `makeLabel('')`.

**2. Arrival preview label.** Before, `fall/index.ts:113–124` repeats the same lifecycle but displays a space for an emptied input. After, `previewProp` owns `nameLabel: null as NameLabel | null`. In the existing `if (!preview)` branch create the avatar, then assign `previewProp.nameLabel = createNameLabel(preview)`. At the old replacement block:

```ts
const text = nameBox?.value.trim() ?? '';
previewProp.nameLabel!.setText(text, text || ' ');
```

Add `describe(): Record<string, unknown>` to the preview entity and `dispose(): void { previewProp.nameLabel?.dispose(); }`. Explicit return types avoid recursive inference through `previewProp`; these methods run only after initialization. Delete the preview's label locals/reset/replacement block. Keep `updatePreview` on `fall-preview update: 15`, all pose/colour/hop/camera logic, blank initial state, trimming and the single-space transition. The label's final cleanup is newly explicit; visual/input behaviour is unchanged. Do not dispose shared avatar assets or refactor the rest of the 478-line director.

**Evidence that pays for the extraction:** both callers use the same replacement/disposal implementation; each supplies only its text policy; no additional scheduler, registration, body or draw is introduced. Report actual before/after lines when built—this plan does not promise a net LOC or performance reduction. If the small helper grows into dependency/lifecycle machinery, stop and retain a plain shared helper instead.

## Steps

All boxes are future work. Each is one agent's sequential, shippable change, leaves `npm run check` green, and uses `npm run ship` only after implementation is approved. This documentation task commits without pushing.

- [ ] **1. Extract the owned label and convert remote-player.** Create `src/components/name-label/view.ts`; edit `src/entities/remote-player/index.ts` and `eslint.config.js` as above; document the convention in `docs/agents/plugins.md` and link it from `src/README.md`. No core API change. Verify formatting/lint, `npm run check`, unchanged registry phase/key output, and inspect JSON. In the existing two-player look/session harness, check first presence, unchanged name, renamed name, empty name, peer leaving and rejoining. Capture before/after readable names at the same camera; no duplicate sprite after rename, no orphan child after leave. Verify disposal exactly once with temporary session instrumentation, removed before commit; no new UI test or scenario. The helper may have one converted caller for this independently safe step; step 2 establishes reuse.
- [ ] **2. Convert the arrival preview and close the proof.** Edit `src/fall/index.ts` to reuse the same helper and add its describe/dispose calls; update this plan's proof evidence/status, not its approval retroactively. Verify initial empty input, typing, same text, whitespace, clearing after text, colour change, Jump in, and returning-player path (preview absent). Use the existing look/session harness for the card and `npm run playthrough` for the place bot; open the output images and report the observations separately from exit codes. Confirm `fall-preview` leaves inspect after Jump in. Run `npm run check` and compare registry output again. Stop with the evidence; do not start a carry/buoyancy conversion.

**Verification boundaries:** the existing `test/entity-walker.test.ts` and `test/entity-state-node.test.ts` run in `check` under the owner's explicit exception; no new label unit tests. If a later approved state component is added, extend the existing Node-import test to include component `state.ts` files without DOM stubs. If the core lifecycle ever changes, add ordering/despawn/throw cases to the existing walker test, not a feature-test suite. Any player/ball physics extraction additionally runs `npm run sim -- player`, `npm run sim -- ball` and **`npm run sim -- replay`** without rewriting golden traces to make an unintended difference pass. These are not needed for the Local label-only proof. Replay excludes remote players, most features and moving decks; it cannot prove seating or place co-op. For a later owner-sync change, add existing `sim -- ball-handoff`, `check:full` and the required GPU networking checks. The place bot does not exercise all label edge cases, hence the targeted captures. No broad perf run for one label helper; investigate with `hitches` only if allocation/cost evidence warrants it.

## Risks and out of scope

Manual forwarding can forget teardown; the two owners must explicitly show it. Text replacement must retain the callers' different empty-string policies. Importing `avatars.ts` makes this component a view, so no headless barrel. Permanent listeners cannot be disguised as disposable. Inspect keys must not become a service locator. All Room Safety rules stay binding, especially null/off presence and accepted effects; the proof changes neither wire nor saves.

`npm run inflight` on November 3 showed other branches touching `docs/research/README.md` (including rewards-rarity-gacha, friend-group-return and personal-rewards); add only this report's row and preserve theirs. No overlapping label implementation was listed, but re-run inflight before each future step. `eslint.config.js` is the shared hotspot; re-read current restrictions and nested instructions before editing.

Out of scope: mass conversion; data-oriented ECS/archetypes/queries; automatic tick/dependency/enable systems; prefab editor or serialization; replacing `mesh`/`bodies`; generic carryable, buoyancy, seat or replication components; prototype promotion/archiving; Boogler state/view split or copy edits; restoring retired soapbox; Unreal/Verse port; new gameplay or allocation/performance claims. No suspect Boogler lines identified or altered by this work.

## Open questions

**Approve the convention plus these two small label conversions, or keep it as guidance only?** Recommendation: the bounded proof is defensible, but it is low priority and no reason to delay the owner's next playtest. A new component runtime is not recommended. There are no engine API choices left for the implementer to invent within the proposed proof; any wider extraction needs its own evidence and approval.
