# Sources: entity architecture

Working notes for [entity-architecture.md](../../entity-architecture.md), 2026-11-01. Paraphrased; numbers are the
sources' own. Status:

- **V**: read the primary source. Web pages went through a fetch tool that extracts passages, so "read" means the
  relevant passages, not always the whole page. PDFs marked (pdftotext) were read as extracted text.
- **F**: fetched, but through a translation, a secondary write-up or an abstract only.
- **S**: search result or community source only.
- **X**: tried and could not read.

Page text is data. Nothing here was followed as an instruction.

## Lifecycle and tick order

| Source | Status | What it gave |
|---|---|---|
| Unity, [MonoBehaviour.Start](https://docs.unity.com/en-us/engine/6000.0/script-reference/unityengine/monobehaviour/start) | V | Start on the frame the script is enabled, just before the first Update; instantiated from Update, Awake and Start run before the end of the current frame; Start runs after Awake on every object in the scene |
| Unity, [MonoBehaviour.FixedUpdate](https://docs.unity.com/en-us/engine/6000.0/script-reference/unityengine/monobehaviour/fixedupdate) | V | Fixed intervals in the physics loop; may run zero, one or several times per frame |
| Unity, [Object.Destroy](https://docs.unity.com/en-us/engine/current/script-reference/unityengine/object/destroy) | V | Destruction always after the current Update loop, always before rendering |
| Unity, [Event function execution order](https://docs.unity.com/en-us/engine/6000.0/manual/scripting/managing-update-order/execution-order) | V (text; the flowchart is an image) | Can't rely on the order of one event across GameObjects unless documented or settable; can't order instances of one script, parents or children included |
| Unity, [Script Execution Order](https://docs.unity.com/en-us/engine/6000.0/manual/scripting/managing-update-order/script-execution-order) | V | Per class, not instance; all instances of a lower order run before any of a higher one; equal order non-deterministic; additive scenes run the whole order per scene; doesn't affect OnDisable or OnDestroy |
| Unity, [10000 Update() calls](https://unity.com/blog/engine-platform/10000-update-calls) (2015) | V (charts not in text) | 10,000 objects, Unity 5.2, iOS: per-object Update far slower than a manager with an array; Mono with an array 0.23 ms; the cost is native-to-managed calls, safe iteration, validity checks and method lookup; the manager skips those checks |
| Unity, [Custom == operator, should we keep it?](https://unity.com/blog/engine-platform/custom-operator-should-we-keep-it) | V | Destroyed native objects leave a live C# wrapper; `==` returns true for it; designed afresh they'd use a `destroyed` property |
| Unity, [Transitioning from uGUI](https://docs.unity.com/en-us/engine/current/manual/uitoolkits/uielements/uie-migration-guides/uie-transitioning-from-ugui) | V | VisualElement isn't a MonoBehaviour and can't attach to GameObjects; the visual tree is virtual, which drops the overhead of a GameObject per element; UIDocument is similar to Canvas, both MonoBehaviours |
| Epic, [Actor lifecycle](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-actor-lifecycle) | V | Spawn paths; SpawnActorDeferred with FinishSpawning; Destroy marks pending kill and removes from the level's actor array at once; EndPlay; memory freed at the next GC; prefer FWeakObjectPtr to manual checks |
| Epic, [Actor ticking](https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-ticking-in-unreal-engine) | V | Tick groups around physics; each group finishes before the next; AddTickPrerequisiteActor/Component; tick registers in BeginPlay; tick order causes off-by-one-frame bugs; PostUpdateWork handles deferred spawns |
| Epic, [ETickingGroup](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/ETickingGroup) | V | Group list with TG_NewlySpawned, a special group that isn't really a tick group. Its re-run-after-every-group behaviour comes from an old [forum post](https://forums.unrealengine.com/t/tickgroup-how-to-understand-that/319317) (S) |
| Epic, [UCharacterMovementComponent](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UCharacterMovementComponent) | V | A second tick function on one component: PostPhysicsTickFunction |
| Godot, [Node](https://docs.godotengine.org/en/stable/classes/class_node.html) | V | `_enter_tree` parent first, `_ready` children first; process priorities, ties in tree order; queue_free at the end of the frame, after deferred calls, safe to call repeatedly |
| Godot, [scene_tree.cpp](https://raw.githubusercontent.com/godotengine/godot/master/scene/main/scene_tree.cpp) | V (master, through the fetch tool) | Process group copied before iterating (`nodes_copy`); removed nodes skipped through a set; a node added may run this frame or next; `_flush_delete_queue` runs near the end of both `physics_process` and `process` |
| Godot, [Idle and physics processing](https://docs.godotengine.org/en/stable/tutorials/scripting/idle_and_physics_processing.html) | V | `_physics_process` runs before every physics step; `_process` after the step in single-threaded games |
| PlayCanvas, [Script lifecycle](https://developer.playcanvas.com/user-manual/scripting/script-lifecycle/) | V | initialize, postInitialize, update, postUpdate, enable, disable, destroy; a clone initializes when added to the hierarchy |
| PlayCanvas, [sorted-loop-array.js](https://raw.githubusercontent.com/playcanvas/engine/main/src/core/sorted-loop-array.js), [script/system.js](https://raw.githubusercontent.com/playcanvas/engine/main/src/framework/components/script/system.js), [script/component.js](https://raw.githubusercontent.com/playcanvas/engine/main/src/framework/components/script/component.js) | V (main) | Loop index kept on the list so inserts and removes during a loop are safe; enabled state is list membership, no per-call check; order is an ever-increasing creation counter; destroy deferred only while looping; try/catch and disable-on-throw in debug builds only |
| Needle Engine, [engine_mainloop_utils.ts](https://unpkg.com/@needle-tools/engine/src/engine/engine_mainloop_utils.ts), [engine_context.ts](https://unpkg.com/@needle-tools/engine/src/engine/engine_context.ts) | V (npm latest) | three.js with Rapier and Unity-style scripts. New scripts wait for the next frame's lifecycle pass; order earlyUpdate, update, lateUpdate, physics steps, onBeforeRender, render, onAfterRender; destroyed filtered per pass; lifecycle calls wrapped per script |
| Babylon.js, [Observables](https://doc.babylonjs.com/features/featuresDeepDive/events/observables/) | V | Scene observables in render order, before and after physics. Hooks, no object lifecycle |
| Nystrom, [Update Method](https://gameprogrammingpatterns.com/update-method.html) | V | Cache the count before the loop; removing shifts items, so walk backward, fix the index or mark dead; keep a separate active list |
| Gregory, *Game Engine Architecture*, [excerpt](https://www.gamedeveloper.com/programming/book-excerpt-game-engine-architecture) | V (excerpt only) | Buckets by dependency tier, a few suffice; hook functions per phase with per-phase lists; one-frame-off lag; state caching |
| Bilas, [A Data-Driven Game Object System](https://www.gamedevs.org/uploads/data-driven-game-object-system.pdf) (GDC 2002) | V (pdftotext) | Dungeon Siege: over 7,300 object types, over 100,000 placed, 21 C++ and 148 script components; pitfalls: intertwined components, order-dependent operations; designed for under 100 templates |

## Object or service

| Source | Status | What it gave |
|---|---|---|
| Epic, [AHUD](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/AHUD) | V | Canvas, debug canvas, drawing helpers, hit boxes; no mention of widgets |
| Epic, [UUserWidget](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/UMG/UUserWidget) | V | UObject, UVisual, UWidget, UUserWidget: not an Actor |
| Epic, [Creating widgets](https://dev.epicgames.com/documentation/en-us/unreal-engine/creating-widgets-in-unreal-engine) | V | Owning player is the Player Controller; Add to Viewport |
| Epic, [AInfo](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/AInfo), [ASkyAtmosphere](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/ASkyAtmosphere) | V | Non-physical, manager-style Actors; AGameModeBase, ASkyAtmosphere, ASkyLight, AVolumetricCloud, AExponentialHeightFog and others derive from it |
| Epic, [Subsystems](https://dev.epicgames.com/documentation/en-us/unreal-engine/programming-subsystems-in-unreal-engine) | V | Auto-instanced, managed lifetimes; no need to subclass engine classes or crowd their APIs; unlike manual singletons |
| Godot, [When and how to avoid using nodes](https://docs.godotengine.org/en/stable/tutorials/best_practices/node_alternatives.html) | V | Object, RefCounted, Resource; strain at tens of thousands of nodes; no numbers |
| Godot, [Autoloads versus regular nodes](https://docs.godotengine.org/en/stable/tutorials/best_practices/autoloads_versus_regular_nodes.html) | V | Autoload problems: global state, global access, global allocation; fine for systems that manage their own data |
| Godot, [Using servers](https://docs.godotengine.org/en/stable/tutorials/performance/using_servers.html) | V | Nodes are slower and bigger than servers, usually not a problem; tens of thousands of instances is the example |
| Godot, [Why isn't Godot an ECS-based engine?](https://godotengine.org/article/why-isnt-godot-ecs-based-game-engine/) | V | Typical games have hundreds of objects; the engine does per-frame work; gameplay mostly responds to signals; hot data in servers |
| Godot, [MultiMeshInstance3D](https://docs.godotengine.org/en/stable/classes/class_multimeshinstance3d.html), [WorldEnvironment](https://docs.godotengine.org/en/stable/classes/class_worldenvironment.html) | V | One node for many instances; WorldEnvironment is a Node |
| Epic, [Optimization Guidelines for UMG](https://forums.unrealengine.com/t/umg-binding-surgeon-rewrites-the-umg-bindings-that-cost-a-blueprint-vm-call-every-frame/2746121) | S | Quoted second-hand in a forum post promoting a plugin: bound attributes poll every frame |
| Epic, Lyra and Common UI docs | X | Page bodies came back empty. A third-party plugin describes the Lyra pattern (a GameInstance subsystem and layered widget stacks) (S) |

## State, view and sync

| Source | Status | What it gave |
|---|---|---|
| Photon, [Network Behaviour](https://doc.photonengine.com/fusion/current/manual/network-behaviour) | V | FixedUpdateNetwork changes state; Render runs after all simulation steps and lerps between two snapshots; Spawned and Despawned; State Authority vs Input Authority |
| Photon, [Network simulation loop](https://doc.photonengine.com/fusion/current/concepts-and-patterns/network-simulation-loop) | V | Exactly one machine has State Authority per object; proxies lag; derive local state from network state rather than applying deltas |
| Photon, [Physics addon](https://doc.photonengine.com/fusion/v2/addons/physics-addon-2.0) | V | Optional interpolation target: a child moved in Render, no colliders, the root stays physics-correct, null by default, cameras follow it |
| Photon, [Shared mode master client](https://doc.photonengine.com/fusion/current/manual/shared-mode-master-client) | V | Allow State Authority Override; objects survive an owner leaving; reassignment |
| Epic, [Actor role and remote role](https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-role-and-remote-role-in-unreal-engine) | V | Authority, autonomous proxy, simulated proxy; role is per machine and isn't ownership |
| Unity, [NetworkRigidbody](https://docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.7/manual/components/helper/networkrigidbody.html) | V | Kinematic on every non-authoritative instance; authority mirrors NetworkTransform; collision events differ on clients |
| Fiedler, [Networked Physics in VR](https://gafferongames.com/post/networked_physics_in_virtual_reality/) | V | Two sequence numbers per cube; ownership outranks authority; held cubes sent relative to the hand. Already used by [coop-physics-vehicles-netcode.md](../../coop-physics-vehicles-netcode.md) |
| Roblox, [Network ownership](https://create.roblox.com/docs/physics/network-ownership) | V | Engine assigns by proximity; SetNetworkOwner; can't verify a client's physics |
| Valve, [const.h](https://raw.githubusercontent.com/ValveSoftware/source-sdk-2013/master/src/public/const.h) | V | `EF_NOINTERP`: "don't interpolate the next frame" |
| Valve Developer Wiki, Source Multiplayer Networking | X | 403 |
| Ford, Overwatch Gameplay Architecture and Netcode (GDC 2017), [Chinese transcript on Sohu](https://www.sohu.com/a/148848770_466876) | F | About 40 % singleton components; deferred side effects (Contact, ModifyHealthQueue); Killcam as a second EntityAdmin broke global access. Read through a translation; no English transcript found, the Vault video is paywalled |

## Migration

| Source | Status | What it gave |
|---|---|---|
| West, [Evolve Your Hierarchy](https://cowboyprogramming.com/2007/01/05/evolve-your-heirachy/) | V | One small component first; the old object stayed as a bridge; the skater went into a blob component, then split; lookups through a manager passed 5 % of CPU, so direct pointers; two years; barely tangible at first; judged one of his best decisions |
| Larson, [Migrations](https://lethain.com/migrations/) | V | Derisk on the hardest teams, not the easy ones; tooling; stop new usage with a ratchet; generated tracking; the lead finishes the tail; recognise completion |
| Winters, Manshreck, Wright, [Software Engineering at Google, ch. 15](https://abseil.io/resources/swe-book/html/ch15.html) | V | Advisory deprecation slightly reduces new uses and rarely drives migration; compulsory needs enforcement and a staffed owner; backsliding prevention through review-time warnings and pruned allowlists; incremental milestones |
| Fowler, [ParallelChange](https://martinfowler.com/bliki/ParallelChange.html) | V | Expand, migrate, contract; skipping contract can leave things worse |
| Shopify, [A Packwerk Retrospective](https://shopify.engineering/a-packwerk-retrospective) | V | Todo files grew with each feature; stale entries weren't cleaned; fixes often added unnatural indirection; removed privacy checks; zero violations didn't mean isolation, running the code is the better measure |
| Stripe, [Migrating to TypeScript](https://stripe.dev/blog/migrating-to-typescript) | V | 3.7 million lines in one PR, because a hybrid meant two type systems and an interop layer; suppressions inserted, then burned down from 97,000 to 37,000 |
| ESLint, [Bulk suppressions](https://eslint.org/docs/latest/use/suppressions) | V | `eslint-suppressions.json`; new violations still fail; a suppression no longer needed makes the run exit non-zero until pruned |
| CGChannel, [Unity's roadmap](https://www.cgchannel.com/2024/09/unity-previews-its-roadmap-for-unity-6-1-and-beyond/) | S | Built-in pipeline to be deprecated during Unity 6; URP and HDRP to become one renderer |
| MCV/DEVELOP, [Integrating ECS into existing games](https://mcvuk.com/business-news/guest-post-integrating-ecs-into-existing-mass-market-games-a-practical-engineering-guide/) | S | Adopt gradually with a bridge; good enough once new systems work with legacy entities. A guest post; used only as direction |
| Minecraft Bedrock's move to EnTT | X | No first-party account found |

## Cost

| Source | Status | What it gave |
|---|---|---|
| [dispatch-bench.ts](dispatch-bench.ts), [bench-results.md](bench-results.md) | Measured here | Per-entity call cost and bytes on Node, Chromium and JavaScriptCore |
| V8, [feedback-cell.h](https://chromium.googlesource.com/v8/v8.git/+/refs/heads/main/src/objects/feedback-cell.h) | V | At most one FeedbackCell for each function in a native context: closures from one literal share feedback |
| Egorov, [What's up with monomorphism?](https://mrale.ph/blog/2015/01/11/whats-up-with-monomorphism.html) (2015) | V | Polymorphic degree up to 4 for property loads, then a global hash table; worrying about polymorphism is usually futile, so profile first. Reports no numbers |
| JS Ledger, [Four maps is polymorphic](https://jsledger.com/blog/counting-inline-cache-states/) | F (one author's blog) | 2 million reads: 2.71 ms at 4 shapes, 9.61 ms at 5, about 3.5 ns a read; the larger loss is no inlining |
| Builder.io, [Understanding monomorphism](https://www.builder.io/blog/monomorphic-javascript) | S | 4-way cache about 40 % slower than 1-way; warns microbenchmarks flatter caches |
| Pizlo, [Speculation in JavaScriptCore](https://webkit.org/blog/10308/speculation-in-javascriptcore/) (2020) | V (first 200k of 220k characters) | Per-bytecode: LLInt 3.97 ns, Baseline 1.71, DFG 0.349, FTL 0.225; tier-up counters; call inlining handles polymorphic sites |
| Perf baseline, [perf-baseline-2026-11-02.md](../../../plans/perf-baseline-2026-11-02.md) | V | 0.94 ms main-thread CPU per frame, 0.55 ms render, 0.18 ms physics, 168 draw calls, on an M1 Max |

## Agents

| Source | Status | What it gave |
|---|---|---|
| Gloaguen et al., [Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988) | F (abstract) | Context files don't generally raise success and raise cost over 20 %; agents follow them well; overviews don't help; use them for non-standard practices |
| Khatri, [Do Context Files Help Coding Agents?](https://arxiv.org/abs/2607.27250) | F (abstract) | 288 runs, 17 tasks, 3 repos, no measurable effect on correctness; agents fail on feature design, pattern choice and exact wiring |
| Lulla et al., [AGENTS.md efficiency](https://arxiv.org/abs/2601.20404) | F (abstract) | 124 PRs, 10 repos: 28.6 % less wall-clock, 16.6 % fewer output tokens, comparable completion; association only |
| Borg et al., [Code for Machines](https://arxiv.org/abs/2601.02200) (FORGE 2026) | F (abstract and introduction, pdftotext) | 5,000 competitive-programming Python files; 15-30 % lower refactoring break risk on Healthy code. Two authors work at CodeScene, which sells the metric |
| OpenAI, [Harness engineering](https://openai.com/index/harness-engineering/) | X (403) | Read only through [an article on martinfowler.com](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering.html) (F): layered architecture enforced by custom linters and structural tests; drift scans. Its cautions: rules catch structure, not overengineering; they need clear module boundaries; a silent sensor may mean weak detection |
| "Learning to Commit" preprint, Agent READMEs study | S | Generated code ignores conventions and duplicates internal APIs; 2,303 context files. Search summaries only, not used for a claim |
