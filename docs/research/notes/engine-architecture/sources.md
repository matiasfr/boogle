# Sources: engine architecture review

Working notes for [engine-architecture.md](../../engine-architecture.md), 2026-11-01. Paraphrased; numbers are the
sources' own. Status:

- **V**: read the primary source. Web pages went through a fetch tool that extracts passages, so "read" means the
  relevant passages, not always the whole page. PDFs marked (pdftotext) were read as extracted text.
- **F**: fetched, but through a translation, a secondary write-up or an abstract only.
- **S**: search result or community source only.
- **X**: tried and could not read.

## Engine practice

| Source | Status | What it gave |
|---|---|---|
| Fiedler, [Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/) (10 Jun 2004) | V | Accumulator, spiral of death named and defined, frame time clamped to 0.25 s in the final code, alpha interpolation between the last two states |
| Nystrom, [Update Method](https://gameprogrammingpatterns.com/update-method.html) | V | Order matters: earlier objects see later ones' previous state; defer removals; inactive objects cost more than they look |
| Nystrom, [Event Queue](https://gameprogrammingpatterns.com/event-queue.html) | V | Use a queue only to decouple in time; a central queue is a global; the world may have changed by the time an event is handled; poor fit when the sender needs an answer; cycles |
| Nystrom, [Data Locality](https://gameprogrammingpatterns.com/data-locality.html) | V | Apply when you have a measured performance problem caused by cache misses; costs flexibility |
| Nystrom, [Component](https://gameprogrammingpatterns.com/component.html) | V | Worth it when one class touches several domains and is getting massive; adds wiring, communication and indirection; don't build a fix for a problem you don't have |
| Nystrom, [Game Loop](https://gameprogrammingpatterns.com/game-loop.html) | V | Fixed update, variable render; the step must be longer than the work; in a browser you don't own the loop |
| Nystrom, [Service Locator](https://gameprogrammingpatterns.com/service-locator.html) | V | Use sparingly; prefer passing the object; dependencies become harder to see |
| Gregory, *Game Engine Architecture*, [excerpt on Game Developer](https://www.gamedeveloper.com/programming/book-excerpt-game-engine-architecture) | V (excerpt only) | Batched, phased and bucketed updates; one-frame-off lag; state caching; tolerate a one-frame lag; inter-subsystem dependencies. The book itself was not read |
| Gyrling, [Parallelizing the Naughty Dog Engine Using Fibers](https://media.gdcvault.com/gdc2015/presentations/Gyrling_Christian_Parallelizing_The_Naughty.pdf) (GDC 2015) (the brief's "Gyrich") | V (pdftotext) | ~100 ms of CPU work per frame over 6 workers, 160 fibers, ~800-1000 jobs a frame in The Last of Us Remastered; FrameParams, 16 of them; a frame is a piece of data, not a length of time; tagged heaps |
| Ford, Overwatch Gameplay Architecture and Netcode (GDC 2017), [GDC Vault](https://gdcvault.com/play/1024001/-Overwatch-Gameplay-Architecture-and); [Chinese transcript on Sohu](https://www.sohu.com/a/148848770_466876) | F | About 46 systems and 103 client components, ~40 % singletons, benefit clear only after 3+ years, global access gave way to singletons, Killcam broke global access, utilities with few side effects, deferred side effects (Contact), ECS as glue with physics and audio outside. Read through a translation |
| O'Donnell, [FrameGraph](https://www.slideshare.net/slideshow/framegraph-extensible-rendering-architecture-in-frostbite/72795495) (GDC 2017) | V (slide text) | Renderer grew 4k to 15k lines with 2k-line functions; few hundred passes and resources per frame; 1042 MB to 472 MB with aliasing at 4K |
| Acton, Data-Oriented Design and C++ (CppCon 2014), [abstract](https://cppcon.org/third-keynote-2014/) | F | Transforming data is the only purpose of a program; console games. Talk not watched, slides not found; the "three big lies" are from secondary write-ups only |
| West, [Evolve Your Hierarchy](https://cowboyprogramming.com/2007/01/05/evolve-your-heirachy/) (5 Jan 2007) | V | Tony Hawk's moved to components: two years, first results barely tangible, one game a year meanwhile, scale misjudged, later judged a very good decision |
| Nystrom, [Is There More to Game Architecture than ECS?](https://www.youtube.com/watch?v=JxI3Eu5DPwE) | X | Title confirmed, content not readable; not cited for its argument |
| Ladavac, [The Elusive Frame Timing](https://medium.com/@alen.ladavac/the-elusive-frame-timing-168f899aec92) (GDC 2018) | S | Stutter comes from measuring render time rather than present time; needs a display-timing API |

## Growth and failure

| Source | Status | What it gave |
|---|---|---|
| Factorio, [FFF #366](https://factorio.com/blog/post/fff-366) (18 Jun 2021, kovarex) | V | Over 500 places registering listeners; normal and ghost building duplicated and multiplied again for latency hiding, weeks to merge; more programmers did not mean more speed until foundations improved; tests feel slower and are faster |
| Factorio, [FFF #215](https://factorio.com/blog/post/fff-215) | V | Parallel trains, electricity and belts ran slower than serial, from cache invalidation on shared pages; fixing it means reorganising allocation, not done before 1.0 |
| Factorio, [FFF #421](https://www.factorio.com/blog/post/fff-421) | V | Roboports from 1 ms to 0.025 ms by turning idle ones off; robots updated less often gave 10-25 %; multithreading the electric network improved its timer but not the save |
| Innersloth, statement quoted by [TheSixthAxis](https://www.thesixthaxis.com/2020/09/25/among-us-2-cancel-sequel-download-server/) (Sep 2020) | F | Among Us 2 cancelled because the first game's code was outdated and not built for that much content; the content moved into the first game. Innersloth's own URL 404s; PC Gamer's copy had no body; GameSpot 403 |
| Huhtala, [Cities: Skylines 2 performance](https://blog.paavo.me/cities-skylines-2-performance/) | V | An outsider's RenderDoc capture: 72 % of 6705 draw calls in shadow mapping, models with no LODs (a parking booth over 40k vertices). He says he may be wrong in places and has no inside access |
| [HN comment on KSP](https://news.ycombinator.com/item?id=26938812) (skykooler, 26 Apr 2021) | S | Moves the universe when the craft is over 2 km from the origin. Community memory, no dev source |
| [Valheim patch notes, fan wiki](https://valheim-wiki.mave.me/February_25,_2021_Patch) | S | February 2021 fix for world corruption from Alt+F4 at logout. Wiki returned 503, GameSpot 403; from search summaries |
| [155 postmortems study](https://www.researchgate.net/publication/303296635_What_went_right_and_what_went_wrong_an_analysis_of_155_postmortems_from_game_development) | S | Awareness of technical debt, no systematic management. Page returned 403 |
| Zhang, [Comprehension debt](https://arxiv.org/abs/2512.08942) (preprint, Oct 2025) | F (abstract) | Autoethnography of a 3-person AI-assisted game team, 333 commits: AI lets a team build more than it can maintain alone. One team, one author |

## The web

| Source | Status | What it gave |
|---|---|---|
| MDN, [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) | V | Paused in background tabs; matches display refresh; use the timestamp or animations run faster on high-refresh screens |
| Chrome, [Heavy throttling of chained timers](https://developer.chrome.com/blog/timer-throttling-in-chrome-88) | V | Three levels: minimal, once a second, once a minute. Once a minute needs hidden over 5 min, chain count 5+, silent 30 s, no WebRTC. Workers not mentioned |
| Chromium [commit b3ca8d2](https://chromium.googlesource.com/chromium/src/+/b3ca8d2bef22bef0ed6d74b251f90f58a7604144) (8 Mar 2021) | V | IntensiveWakeUpThrottling and AllowAggressiveThrottlingWithWebSocket on by default on all platforms. Whether that flag still exists today: not confirmed ([Electron PR 53634](https://github.com/electron/electron/pull/53634), S) |
| Chrome, [Page lifecycle](https://developer.chrome.com/docs/web-platform/page-lifecycle-api) | V | Frozen pages run no timers; close sockets on freeze, reopen on resume; a frozen page may be discarded |
| Chrome, [Background tabs](https://developer.chrome.com/blog/background_tabs) (2017) | V | Budget throttling after 10 s in background; pages with real-time connections were exempt from the budget, still 1 Hz. Older than the above |
| [WebKit bug 245350](https://bugs.webkit.org/show_bug.cgi?id=245350) | V | Socket lost on app switch, only with an experimental setting; a WebKit engineer suggests reconnecting. Status NEW since 2022 |
| web.dev, [RAIL](https://web.dev/articles/rail) | V | 16 ms budget, about 6 ms of browser work, 10 ms guideline; idle work in 50 ms or less |
| MDN, [createRenderPipelineAsync](https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipelineAsync) | V | Preferred over the sync call: resolves when the pipeline is usable without a stall |
| MDN, [Memory.grow](https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/Memory/grow) | V | Each grow detaches the old buffer, even grow(0); no shrink documented |
| V8, [Trash talk](https://v8.dev/blog/trash-talk) | V | Most objects die young; scavenge cost scales with survivors; idle tasks |
| WebKit, [Riptide](https://webkit.org/blog/7122/introducing-riptide-webkits-retreating-wavefront-concurrent-garbage-collector/) (2017) | V | Concurrent, non-moving, generational; hiccups below 3 ms, most pauses 1 ms or less |
| Bevy, [issue 4078](https://github.com/bevyengine/bevy/issues/4078) | V | Open since Mar 2022, latest activity 2 Feb 2026: single-threaded on WASM, progress merged; commenters doubt demand because of cross-origin isolation |
| Bevy cheat book, [WASM](https://bevy-cheatbook.github.io/platforms/wasm.html) | V | No multithreading; download size matters. Undated, may lag |
| PlayCanvas, [Load time](https://developer.playcanvas.com/user-manual/optimization/load-time/) | V | Don't preload what can load async; aim under 5 s; placeholders; built-in physics costs 379 KB |
| PlayCanvas, [frame-graph.js](https://raw.githubusercontent.com/playcanvas/engine/main/src/scene/frame-graph.js) | V | A pass list with store/clear flags and merging of adjacent passes; allocates no resources |
| PlayCanvas, [issue 6085](https://github.com/playcanvas/engine/issues/6085) | V | Open since Feb 2024: on WebGPU pipelines are built during mesh rendering; needs a different solution from async shader compile |
| PlayCanvas, [Preloading and streaming](https://developer.playcanvas.com/user-manual/assets/preloading-and-streaming) | X | Empty response |
| Babylon, [Optimize your scene](https://doc.babylonjs.com/features/featuresDeepDive/scene/optimize_your_scene) | V | Freeze materials, world matrices and active meshes; instances; skip picking; a performance-priority switch |
| Babylon snapshot rendering, [forum](https://forum.babylonjs.com/t/why-webgpu-backend-is-slower/24091) | S | Render bundles for static scenes; the 10x claim is marketing-level and the forum warns about artifacts; date unclear |
| three.js manual, [How to dispose of objects](https://threejs.org/manual/#en/how-to-dispose-of-objects) | X | Client-rendered page, no text returned. The rule (GPU resources are not garbage collected) is known practice and in the repo's own code |
| Rapier, [Common mistakes](https://rapier.rs/docs/user_guides/javascript/common_mistakes/) | V | Only units and scale; nothing on WASM memory |
| Rapier JS binding, `node_modules/@dimforge/rapier3d/dynamics/rigid_body.js:188-191, 322-324` | V | `translation()` and `linvel()` wrap a raw WASM vector per call |

## Running a review

| Source | Status | What it gave |
|---|---|---|
| Sadowski et al., [Lessons from Building Static Analysis Tools at Google](https://6826.csail.mit.edu/2020/papers/google-analysis-cacm.pdf) (CACM, Apr 2018) | V (first 6 pages as images) | Effective false positive defined by developer action; FindBugs dashboard unused, Fixit: 3,954 reviewed, 16 % fixed; code-review bot dropped for effective false positives; under 10 % for code review, none for compile errors; 74 % vs 21 % judged real at compile time vs checked-in; "Not useful" over 10 % disables an analyzer |
| Zeng et al., [SWR-Bench](https://arxiv.org/abs/2509.01494) ([html](https://arxiv.org/html/2509.01494)) | V (first 100k chars) | 1,000 PRs; best single-pass precision 16.88 % (Gemini-2.5-Flash, PR-Review), best F1 20.85 % (GPT-5, PR-Review: 14.69 % precision, 35.93 % recall); of 100 false positives 48 % lacked context, 17 % over-sensitive to the change, 16 % vague, 13 % lacked domain knowledge; aggregating several reviews raises F1 up to 43.67 % |
| Sun et al., [BitsAI-CR](https://arxiv.org/abs/2501.15134) (ByteDance, 2025) | V (pdftotext) | 219 rules; RuleChecker then ReviewFilter; 75.0 % precision; Outdated Rate (flagged code changed afterwards) 26.7 % on Go; low-precision rules retrained, precise but unacted rules decommissioned; a magic-number comment shown as correct but superfluous; comment aggregation |
| Cihan et al., [Automated Code Review In Practice](https://arxiv.org/abs/2412.18531) (ICSE SEIP 2025) | F (abstract) | 73.8 % of comments resolved; PR closure 5 h 52 to 8 h 20; minor quality gain; irrelevant comments and unnecessary corrections |
| Aðalsteinsson et al., [Rethinking Code Review Workflows](https://arxiv.org/abs/2505.16339) (2025) | F (abstract) | False positives and trust the worry; preference for AI-led review depended on familiarity and severity |
| Nygard, [Documenting Architecture Decisions](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions) (15 Nov 2011) | V | Title, context, decision, status, consequences; blind acceptance vs blind change; superseded records are kept |
| Ford, Parsons, Kua, *Building Evolutionary Architectures*, [ch. 2](https://oreilly.com/library/view/building-evolutionary-architectures/9781492097532/ch02.html) | X | 403. Ford's [workshop PDF](https://nealford.com/downloads/Evolutionary_Architectures_workshop_by_Neal_Ford.pdf) was over the fetch limit |
| [Thoughtworks Radar](https://www.thoughtworks.com/radar/techniques/architectural-fitness-function) (May 2018) | V | Fitness function as an objective integrity assessment of an architectural characteristic |
| Paul and Wang, [Fitness function-driven development](https://www.thoughtworks.com/insights/articles/fitness-function-driven-development) (Jan 2019) | V | Automated gatekeepers, categories |
| Larson, [notes on the book](https://lethain.com/building-evolutionary-architectures/) | F | Atomic, holistic, triggered, continual, static, dynamic, automated, manual |
| Kazman, Klein, Clements, [ATAM report](https://www.sei.cmu.edu/library/atam-method-for-architecture-evaluation/) (CMU/SEI-2000-TR-004) | F | SEI landing page only. Risk, non-risk, sensitivity point and tradeoff point definitions from course notes in search results; [Clemson outline](https://people.computing.clemson.edu/~johnmc/courses/cpsc875/ATAM_files/v3_outline_expanded.htm) rejected its certificate, [SAP4 chapter](https://s2.smu.edu/~lghuang/CS7319/notes/SAP4%20Chapter%2021.pdf) 403 |
| Fowler, [Technical Debt](https://martinfowler.com/bliki/TechnicalDebt.html) | V | Interest is paid only when you work in that code; crufty but stable areas can be left alone |
| Fowler, [Technical Debt Quadrant](https://martinfowler.com/bliki/TechnicalDebtQuadrant.html) | V | Prudent debt with small interest may never be worth repaying |
| Fowler, [Design Stamina Hypothesis](https://martinfowler.com/bliki/DesignStaminaHypothesis.html) | V | Payoff line usually weeks, not months; no objective proof |
| Tornhill and Borg, [Code Red](https://arxiv.org/abs/2203.04374) (2022) | F (abstract) | 39 codebases: low-quality code 15x defects, 124 % more resolution time, 9x maximum cycle time. Authors build the tool used; business software, not games |
| ESLint, [Bulk suppressions](https://eslint.org/docs/latest/use/suppressions) | V | Rule enforced for new code, committed suppressions file, pruned as fixed |
| Sonar, [Clean as You Code](https://docs.sonarsource.com/sonarqube-server/10.3/user-guide/clean-as-you-code/) | S | Quality gate on new code only |

## Third-party skills

See [third-party-skills.md](third-party-skills.md).

## Tried and not confirmed

- Whether AllowAggressiveThrottlingWithWebSocket is still on in current Chrome.
- That dedicated-worker timers are unthrottled in all three engines. Repo comment and common knowledge; the Chrome post doesn't mention workers.
- Safari's exact hidden-tab behaviour on iPadOS 26/27. No current WebKit source found.
- Whether `perf` and `hitches` run usefully on SwiftShader in Actions. Not tried; `src/render/README.md` says headless frame rates mean nothing, so only counts are proposed.
- Whether The Last of Us Remastered's FrameParams idea has any web equivalent. No source found; not claimed.
- A postmortem of a 3D multiplayer browser game covering GC or workers. Two extended searches found none.
- A primary statement of when a small team should adopt a render graph. Found nothing; the claim rests on O'Donnell's motivation and PlayCanvas's code.
