# Godot migration: scope and agent workflow

> **Verdict:** Evaluation direction only, not approval to migrate. A conditional native-first Godot move is worth scoping; no engine, addon or migration is approved.
> **Top recommendations:** 1. One Godot project with client and dedicated-server exports. 2. Prove responsiveness around shared objects first, on Godot's Jolt backend. 3. Make empty-world suspension explicit, and base agent work on files and the engine CLI.
> **Status:** open. See [Process](../decisions.md#process).

6 November 2026. Research only. Owner constraints: [decision record](../decisions.md#process).
Local source reviewed at `461a9f07`; cached `origin/main` was `2d647ca7`, ahead of this checkout.
Its later entity-store direction was checked; no checkout update or runtime verification was performed.
No engine, addon or test framework was installed. This does not approve a migration or replace the current roadmap.

## What the owner's answers resolve

Native-first is an acceptable option to evaluate; web remains desirable. A web version may simplify rendering but must preserve mechanics. The candidate moves authoritative gameplay, physics and audio into Godot, replaces Rapier with Godot-integrated physics and retunes feel, and removes the existing web/Node game runtime. Agent workflows may change. Empty worlds may stop simulating completely.

This removes the need to preserve the Node server, duplicate gameplay across TypeScript and Godot, retain Rapier behavior, or reproduce the current WebGPU ocean in a browser. It remains a substantial runtime port. Assets, design, data, algorithms and acceptance cases are the reusable investment.

The repo already chooses replication with prediction and next-frame action feedback (6 November Process entries). The earlier migration discussion overemphasized preserving lockstep: it describes existing implementation, not the latest adopted direction. The candidate Godot architecture should follow the newer direction. The existing [shared-physics comparison](shared-physics.md) supplies Unity/Unreal/server-prediction context, not evidence that Godot's rigid-body prediction is solved.

## Recommendations for evaluation

1. **Use one Godot project with client and dedicated-server exports.** Keep authoritative world data, requests and persistence separate from renderable scenes. Clients can predict movement and action feedback while the server decides accepted outcomes. One runtime removes the cross-language simulation problem; it does not remove networking work. Godot supports headless dedicated servers. [Dedicated servers](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_dedicated_servers.html).

2. **Prove responsiveness around shared objects first.** Use Godot's integrated Jolt backend as the initial candidate; current stable docs identify it as the new-project default. Test walking, platform riding and two-person carrying before committing to a controller or joint setup. Jolt's exposed joint properties have limitations. Do not equate built-in physics with built-in network prediction. [Jolt](https://docs.godotengine.org/en/stable/tutorials/physics/using_jolt_physics.html).

   Start with immediate local action feedback, predicted character movement, server-owned shared bodies and interpolated remote presentation. Whether carried objects also need prediction is an empirical question. netfox is a candidate for character prediction and synchronization, not an assumed rigid-body solution: its physics guide requires manual stepping through a custom engine build or another physics integration. That conflicts with the goal of a straightforward stock-engine move unless a proof justifies it. [Responsive movement](https://foxssake.github.io/netfox/latest/netfox/tutorials/responsive-player-movement/), [physics requirements](https://foxssake.github.io/netfox/v1.35.3/netfox.extras/guides/physics/).

3. **Make empty-world suspension explicit.** Proposed semantics: save when the last peer leaves, stop gameplay ticks, resume from saved game time on the first join. Keep connection handling available. No wall-clock catch-up is the simplest interpretation to confirm in a plan; it is not a separate owner decision. Decide how shared carries and in-flight actions settle at suspension. While a room is occupied, distant trains and construction still need a defined policy; an unloaded visual scene must not silently delete logical progress. Streaming and network relevance remain necessary if friends split across islands.

4. **Keep the possible web build mechanically compatible by design.** Rendering quality must not define collision, swimming, buoyancy or action reach. Use common gameplay water queries with separate visual treatments. Typed GDScript is the leading evaluation choice because Godot's documented C# web export restriction would close the straightforward web route. Native ENet networking cannot simply be used by a browser: browser clients require WebSocket/WebRTC, and crossplay needs an explicit compatible server/transport design. Godot-native audio can retain procedural generation, with performance and browser playback verified separately. [Web export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html), [networking](https://docs.godotengine.org/en/stable/tutorials/networking/high_level_multiplayer.html), [audio generator](https://docs.godotengine.org/en/stable/classes/class_audiostreamgenerator.html).

5. **Base agent work on files and the engine CLI, with editor tooling alongside it.** Typed scripts, small reusable scenes/resources and Blender source assets give agents reviewable changes. Use Godot APIs in import/editor scripts to generate larger scenes. The engine can import assets, run scripts/scenes, expose language/debug servers and export builds from the command line. A successful parse is only one check: import and actual execution are also required. [Static typing](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/static_typing.html), [editor scripts](https://docs.godotengine.org/en/stable/tutorials/plugins/running_code_in_the_editor.html), [CLI](https://docs.godotengine.org/en/stable/tutorials/editor/command_line_tutorial.html).

## Agent authoring and verification shortlist

These are documented capabilities, not a tested ranking of addons.

| Need | Candidate | What must be proved |
| --- | --- | --- |
| Repeatable import, launch and export | Official Godot CLI; a small shell/Python runner | Detect parse/runtime failures, enforce timeouts, identify the exact build and clean up processes. No Node dependency required. |
| Live scene editing and inspection | Official editor tools and an optional MCP bridge | Saved scene matches inspected scene; assets and generated references survive reopening. |
| Small rule/save tests | GUT | Fast headless execution and reliable failure exit status. |
| Automated scene/input checks for sync contracts | gdUnit4 Scene Runner | Drive real action inputs and observe the actual scene; separate client processes are still needed for multiplayer. |
| Visual/motion evidence | A rendered asset/game fixture, screenshots and Godot Movie Maker | Fixed camera and recorded state; inspect consecutive frames. Offline movie output is not evidence of real-time smoothness. |
| Responsiveness and multiplayer | Dedicated server plus two rendered clients under latency/jitter/loss | Next-frame local feedback, correction quality, shared-object stability, disconnect/rejoin and save restoration. |

[GUT](https://gut.readthedocs.io/en/latest/Command-Line.html) documents CLI exit codes. [gdUnit4](https://github.com/godot-gdunit-labs/gdUnit4/blob/master/documentation/doc/_advanced_testing/sceneRunner.md) documents frame advancement and input simulation. Evaluate one framework; there is no reason to install both by default. Preserve Boogle's test diet: small state/conservation/save tests and targeted sync scenarios, with feel judged in play.

Godot's [Movie Maker](https://docs.godotengine.org/en/stable/tutorials/animation/creating_movies.html) records offline; use ordinary real-time capture and frame timings for performance and feel. Headless results alone establish neither rendering nor heard sound. A Godot replacement for `look` needs a small game-owned action/state/capture interface; an MCP connection alone does not provide this contract.

Two editor-bridge candidates were inspected at README level. [rackrot/godot-mcp](https://github.com/rackrot/godot-mcp) runs inside the editor and exposes scene edits, imports, logs and headless execution. Its stated requirements include Godot 4.7 and GNU `timeout` on macOS; it has no demonstrated suitability for this project yet. [ee0pdt/Godot-MCP](https://github.com/ee0pdt/Godot-MCP) uses an external Node server, so it is a weaker fit for the requested simplification. Neither is installed or selected. Compare saved-state correctness, runtime visibility, reconnect behavior and failure reporting before choosing a bridge.

## Three bounded proofs before a confident plan

1. **Workflow:** author/import one Buddy-and-machine scene, launch it, capture state and rendered evidence, deliberately introduce a script error, then demonstrate that the agent detects and fixes it. Repeat from a clean import. This chooses the workflow and engine/addon versions.
2. **Feel and authority:** one beam, two players, a moving platform and a funded construction action, at proposed 0/100/200 ms RTT plus jitter/loss. Measure local feedback and corrections, then have the owner judge carrying/riding. Prove last-leave suspension, first-join resume and restart. The latency values are proposed test conditions, not approved tolerances.
3. **Native presentation plus minimal web feasibility:** one representative shoreline with audio on the target Mac. A small browser export checks the same movement, water queries and networking, without requiring the native ocean. This establishes whether web remains a practical option.

Stop after presenting the bounded proof for the owner's verdict; do not continue into campaign conversion automatically. Remaining plan inputs: initial native platforms, latency/feel acceptance, exact suspend/resume semantics, active-world size, web crossplay requirement, and the successful authoring/verification stack. No time estimate or migration percentage is justified by this research.
