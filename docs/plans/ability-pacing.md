# Proposal: give each ability room

**Owner decision needed; proposed pacing experiment, not approval.** Reviewed 4 November 2026 against `326dda13`. Serves [DESIGN.md](../../DESIGN.md) **1. Toys before chores**, **7. Telegraph everything** and **10. Slapstick over precision**. Goal: learn a move, use it somewhere meaningful, then want the next one.

## Recommendation and evidence

**Use hook, then glider in this slice; reserve double jump for a later area's upgrade.** The [3 November run](../playtests.md#2026-11-03-round-4-two-players-the-default-url) had ten minutes from double jump to hook, but only 49 seconds from hook to glider. The owner wants double jump later; Grant accepted the early version for the slice. These are unresolved pacing calls, not an approved reversal of [round 4's order](round-4.md#the-run).

The newer [bot measurement](../game-design/place.md#measured) is 23:54 including its tour, with the pier at 20:51.53. It does not remeasure the human ability intervals. Nearby trees cut path-to-depot from 9:09 to 2:49, so relying on hauling to space unlocks is especially fragile. Do not restore long carries, increase bills or add timers to make room for three abilities.

**What spreads them is separate access and use, not slower pickups.** Following the [movement research's teaching pattern](../research/movement-abilities.md#5-teach-on-a-little-great-plateau): place a reachable hook pickup and safe first pull by the first depot connection; use it on the quarry lever and an optional familiar side route; make the tower a later return after the quarry connection, with the glider still its summit reward and the sea gate still its consequence. A whole construction/exploration beat separates hook practice from the ascent. Preserve the tower platforms visible from the start.

That requires **physically separating the hook lesson from the tower entrance**. Relocate the entry approach to the quarry connection, within hook range only once its usable approach is built; keep the early lesson out of reach of that chain. A silent “not yet” on an otherwise reachable ring would break the promise. Exact geometry needs a greybox proof: moving the pickup alone leaves the six-pull tower climb available immediately and recreates the 49-second burst. Clever optional skips can remain; the intended route must read without an objective marker.

## What moving double jump breaks

The [as-built technology](../game-design/place.md#ancient-technology-round-4-exploring) and [`tech-layout.ts`](../../src/proto/place/tech-layout.ts) establish these dependencies:

- **Hook pickup and quarry lever:** both sit 2.2 m above their approaches, beyond the intended single jump. Give the hook a base-movement approach and the lever a reachable hook landing. Otherwise removing double jump blocks the main line before the glider/sea gate.
- **Early lesson and secrets:** the pillar block and lookout shelf teach/reward double jump; finders' bay can hand out their missed prizes at the hook. Keep them optional future revisits and defer their recovery trigger, so the later ability still opens something. The running `double-jump-challenge` job was visible in local job status; reconcile its result before relocation, without duplicating or discarding its work.
- **Movement combinations and boarding:** the owner liked double jump while gliding; that becomes a later improvement to an already-loved move. Current co-op cargo evidence boards with a double jump, so single-jump boarding, loaded carrying, recovery and controller/touch access need proof or a physical boarding step. Do not raise everyone's base jump to bypass the gates.
- **Progression consumers:** pickup demonstrations, secret recovery, saves/rejoins and bot checkpoints assume today's order. Recheck them together when building the approved change; a returning player must not lose an earned move. This proposal changes no state ownership or controls.

## Next proof and campaign fit

1. Wait for the corrected-loop replay and the owner's scope choice; keep train timing unchanged for this experiment. Geometry/access prerequisites are **identified but unproved**; human pacing is **missing**.
2. Greybox the hook lesson → quarry use → tower/glider route without double jump. Use existing bot/checkpoints and broker captures to inspect readable access, then verify solo completion and a late-joining partner. The visual question is whether each new route is visible before its unlock and understandable afterward. Implementation owners: `src/proto/place/{tech-layout,tech,moves}.ts`, progression consumers and the as-built chapter; no new harness or feature unit tests.
3. Owner plays, then stop. One line on what's new: “Hook gets a job before the tower gives you glide; double jump is saved for later.” One gut question: **“Did each new move get time to become useful before the next?”**

The [Design Table direction](../proposals/boogle-2.md#the-shape-of-the-game) is about eight hours, with one-to-two-hour areas, movement opening paths and some ability rewards providing closure. This 24-minute prototype is not that campaign compressed to scale. Later double jump can reopen familiar ledges and deepen gliding, with a forgiving multi-jump playground when acquired; do not build the next area to justify it now. Replay → [production core](production-core.md) T1 proof → representative slice still governs. Swing-hook physics, new button mappings and campaign-wide unlock timings are separate decisions.

## Exact owner questions

- **May this slice show only hook and glider, with double jump reserved for a later area?** Recommend yes. Alternative: keep all three as a sampler, putting double jump late in this run; that still requires repairing the earlier gates and does not prove campaign pacing.
- **May the hook lesson move earlier and the tower approach open from the quarry connection, keeping glide atop the tower?** Recommend yes. Alternative: retain today's tightly coupled tower and accept hook/glide as one combined reward until a later level pass.
