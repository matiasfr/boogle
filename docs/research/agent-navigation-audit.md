# Agent navigation and unused-code audit

> **Verdict:** Contradictory routing advice, not dead code, is the main agent-navigation cost.
> **Top recommendations:** 1. Repair current recipes and expose document authority in search.
> **Status:** reference.

2026-11-03. Audited `e93a0a11af9436e4f0d5120189a8dc031d96a84d`, on `codex/agent-navigation-audit`.
Audit only: this report is the only committed change. Principles: **Understandable at a glance** and **Small and readable**
([DESIGN.md](../../DESIGN.md)). No source, existing documentation, assets or tools were changed.

## Answer and scope

The largest liability is contradictory routing advice, not a pile of demonstrably dead modules. A cold agent can find
almost every folder, but can still pick the wrong owner or copy a superseded example. The largest opportunity is to make
the existing map, registry and atlas answer two questions directly: **where does this kind of change go?** and **why is
this apparently unused thing retained?** Keep the flat feature entry folder; the settled
`codex/features-audit:docs/research/features-audit.md` was read, and its decision is not reopened.

**MEASURED** means a count, executed query/check, or local Git observation. **STATIC** means a source-derived interpretation
or proposed change, not runtime proof. Effort S = localized edit; M = coordinated tooling/docs change; L = broad migration.
The six recommendations below are ranked by expected repeated agent time saved relative to effort; no minutes-saved
benchmark was conducted. Inventories below support them rather than introduce additional recommendations.

Read AGENTS, CLAUDE, DESIGN, the source map, current prototype plan, decision-log sections, architecture ledger and the
settled feature audit. The ledger has three open entries and zero rejected/deferred entries; its existing findings are
not repeated as new ones. Current source and local history take precedence over old research snapshots. Network was
forbidden: `npm run inflight` was not invoked because `dev/inflight.ts:43` fetches and `:106` calls GitHub. The dedicated
worktree started clean. Remote changes, current main and deployed state were not checked.

## Ranked recommendations

### 1. Repair current recipes and expose document authority in search — MEASURED / STATIC

**Evidence:** Across 80 guidance documents, all 528 checked local Markdown links resolve, and all 201 checked `npm run`
names exist. Yet six exact path references are stale, and the lockstep and POI recipes teach superseded practices.
`src/world/rules/README.md:10-22` says “Four files, nothing else edited,” uses `.js`, and omits the typed `Rules` owner;
`src/island/README.md:11` tells new POIs to register `onFrame`, while its lighthouse example is grandfathered under lint
suppression. `docs/game-design/mismatches.md:5-16` still describes PeerJS fallback and 103 JavaScript source files; the
tree contains zero `.js` under `src/`. These are presented as current as-built guidance, unlike explicitly historical plans.

**Concrete change:** Reconcile those current recipes and as-built chapters against their owners, including the correct
test-diet triggers. Add consistent current/historical/parked status and replacement pointers to document search output
through the existing map/atlas tooling. Preserve historical documents. Use the existing atlas citation machinery for
explicit file/symbol references; a passing link check alone cannot establish semantic currency.

**Effort S initially, M for generated status output; risk low**, provided narrative ownership is checked. Highest return:
prevents wrong edits before a compiler or lint failure sends an agent back to search. Check-time cost: repairs add zero;
optional local path/script validation should target under 0.2 s, an unmeasured budget, not a performance claim.

### 2. Add task-kind routes to the existing map/registry interface — MEASURED / STATIC

**Evidence:** Six bounded paper tasks required 9 searches and 35 per-task unique file reads after common instructions.
The hat task has two real implementations; jump tuning has an eight-line facade in front of the controller. The map
lists all 21 immediate source folders but does not settle these choices. Its “Add new features here, not in the folders
below” (`src/README.md:8-9`) competes with entity and POI guidance on the same page.

**Concrete change:** Extend `npm run map` with a task-kind lookup, such as `--kind hat`, backed by a small routing table
also consumable by atlas. Return owner paths, a current example, companion documentation, sync choice and required
checks. Distinguish entry registration from implementation ownership. Give hat scope alternatives explicitly; label
legacy POIs as unsuitable lifecycle examples. Include `ui` versus player UI and `net` versus `netplay`. No folder migration.

**Effort S/M; risk low.** Reuses `dev/map.ts:1-40`, already printing file size, opening description and exports, and
`dev/scan/read.ts:1-6`, already shared by registry and atlas. Validate route targets in registry; target under 0.1 s
additional check time, not yet measured. Keep the full compiler audit out of routine checks initially.

### 3. Add an advisory unused-reference report, with reasons and exclusions — MEASURED / STATIC

**Evidence:** The compiler-assisted scan covers 643 code files and 2,462 module-export records. It produces 422 raw
no-external-symbol-reference flags, but only 87 value-export candidates survive a conservative cross-file name search.
Most sampled candidates are live functions whose **export** is unused. Three apparently unreferenced `src/` files are
entry/worker files. Both CSS flags are dynamically constructed names. Zero unused packages or npm scripts were confirmed.

**Concrete change:** Extend the existing `dev/scan` reader/atlas facts with an opt-in registry unused report. Print
incoming references, root/loader reason, dynamic uncertainty, runtime-vs-tool usage and confidence, plus a short reviewed
candidate table. Include dependencies, CSS and assets as separately labelled evidence. Teach it HTML entry points,
service/URL workers, Vite globs, CLI directory loaders, browser-eval strings, rule namespace exports and asset manifests
before treating absence as waste. Add the externally undocumented FFT eval to existing tool discovery, not a deletion list.

**Effort M; risk medium** if reports invite automatic deletion. The disposable full compiler scan took **7.0 s** on this
machine; that is a reason for opt-in reporting, not seven seconds on every `check`. Reusing parsed syntax for cheap
root/card/path checks should target under 0.5 s extra, to be measured before gating. No new dependency is needed for the
initial implementation: TypeScript is installed. Do not treat “export unused” as “body unused,” or missing static
references as runtime proof. Never rewrite Boogler copy as cleanup.

### 4. Show prototype dependents and reconcile old Play destinations — MEASURED / STATIC

**Evidence:** 24 cards, three archived implementations correctly absent, zero unmatched literal `protoOn` IDs, and
17 `protoOn` calls outside `src/proto/`, of which only three are core behavior branches. Retired merged cards `onehand`,
`ride` and `arrive` still get Play links although their old selectors are gone (`protos/main.ts:65-68`). Answered code
often has active dependents, including type-only dependencies.

**Concrete change:** Extend registry JSON/atlas with card → selector → loader → core seams → dependents. Represent a
merged destination explicitly on those three cards. Check objective contradictions such as archived code remaining or a
new literal flag lacking a card; retain explicit exemptions for home links, layout tools and merged records. Surface
answered/no-other-experiment-import cases for owner review only. `docs/proposals/boogle-2.md:249` expressly pauses further
archiving without asking. No sweep, no new declaration that a prototype is answered.

**Effort M; risk low for reporting, high for automated removal.** Reuse the reader, with a target under 0.2 s additional
registry time, unmeasured. Preserve `lay`, a tool for real code, and dependencies listed below.

### 5. Route mandatory reading by task while preserving binding rules — MEASURED / STATIC

**Evidence:** Unconditional AGENTS + DESIGN + find-the-fun reads total **9,067 words / approximately 14,586 tokens**.
Adding CLAUDE, map, as-built index and the conditional design decision log reaches **22,186 words / approximately
35,267 tokens**, before code, subsystem contracts and research. Tests, tools, shipping and visual-check sections account
for 2,164 words, 46.4% of AGENTS; which details matter depends on the task.

**Concrete change:** Keep an always-read owner/rules contract and a task routing index to exact mandatory sections of
current contracts. Give the living decision log an authoritative current-decision index while retaining its dated
decisions. Any reduction needs an explicit repository decision; this audit does not relax today's instructions.
Resolve the old cost-limiting advice in `.claude/agents/implementer.md:10,16` and `dev/map.ts:1-3` against AGENTS' standing
call to do all necessary reading and verification. The purpose is clearer relevance, never withholding work to save usage.

**Effort M; risk medium** of hiding an applicable rule. No runtime or check cost. Rank below concrete recipe repairs
because this changes shared working conventions and needs more care.

### 6. Make “only shrinks” a measured baseline comparison — MEASURED / STATIC

**Evidence:** Entity suppressions really decreased **108 → 20**; KNOTS decreased **2 groups / 11 members → 0**. Level
allowances are **15 entries / 24 allowed occurrences**, unchanged since their one introducing commit. Current checks
reject violations beyond the current lists and stale allowances, but do not compare growth of the lists themselves
against a Git baseline. Editing an allowance and the violating code together defeats the prose-only monotonic promise.

**Concrete change:** Add a compact registry baseline report for counts and additions in suppressions, KNOTS and level
allowances; reject unapproved growth where the standing rule forbids it. Reuse the registry's local base-ref mechanism,
with explicit handling for missing bases and intentional owner changes. Show the existing 20 POI suppressions as
deliberate debt awaiting the home redesign (`eslint.config.js:116`), not work to migrate just for tidiness.

**Effort S/M; risk low/medium** around baseline availability and legitimate changes. Target under 0.1 s additional
comparison time using local Git data; not benchmarked. No new feature tests or scenarios are proposed.

## Dead-reference measurements and candidate review

The disposable `.look/dead-audit.ts` uses TypeScript 5.9's parser, resolver and checker over tracked code, retaining
static/type imports, re-exports, literal dynamic imports and imports inside browser-eval strings. It expands all six
literal `import.meta.glob` call sites, including the caves exclusion. It records **22 computed dynamic imports** for
manual handling rather than assuming them dead. Module roots/loaders and string-keyed APIs were then inspected.
Knip is not installed; no install or network request was attempted. Raw artifacts:
`.look/dead-audit.json`, `.look/filtered-exports.json`, `.look/runtime-closure.json`, `.look/guidance-data.json` and the navigation handoff/scripts.

The conservative module closure from five page entries plus service/URL-worker roots reaches 384/385 src implementation
files, including type-only edges and conditional imports (this measures potential reachability, not a production bundle).
The sole exception is `src/sim/tiers.ts:4`: imported by `test/sites.test.ts:8`, retained deliberately as data until rewards
are designed (`src/features/haul-stack.ts:2-3`, `docs/game-design/identity.md:14`). It is **not** an accidental orphan or a
deletion recommendation. This is exactly the retention reason an unused report should show. Of 44 CSS files, 43 have
module-import edges; the remaining `character/character.css` is linked in `character/index.html:9`, so zero entire CSS
files are confirmed unreferenced.

Across all 118 no-import dev files, **22 also lack any external exact filename or basename mention**: 16 scenarios,
2 sim runs (ball-tree/drop), 3 video shots (buddy/caves/critters), and water-fft-check. The first 21 are discovered by
their directory loaders, so their absence from literal references is expected. Water-fft-check is manually addressable
with its own documented `--eval` command. No whole dev tool is confidently classified as obsolete. Basename matching is
deliberately conservative and can hide a poorly documented tool when another file has the same name.

| Area                     | MEASURED result                                                                                | Interpretation / checked evidence                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Files                    | 1,050 tracked files; 643 code files excluding declarations; 385 implementation `.ts` under src | 386 src `.ts` including `globals.d.ts`. Denominators differ intentionally.                                                                                                                                                                                                                                                                                                                                    |
| No inbound module import | 187 raw files, including 118 dev files and 50 root tests; just 3 in src                        | All 3 src flags rejected: boot/index is in `index.html`; sw-worker is esbuild's entry (`vite.config.ts:130`); clock-worker is `new Worker(new URL(...))` (`world/background.ts:26`). **0 confirmed dead whole src files**; this is not proof every reachable body is useful.                                                                                                                                  |
| Globs                    | 60 features, 5 entity entries, 2 eager POI entries, 3 sites, 4 layout JSON, 8 atlas stories    | `main.ts:22,24`, `features/pois.ts:9`, `island/index.ts:11`, `island/layout.ts:30`, `atlas/main.ts:19`. Caves imports separately. These are roots/references, not dead-file candidates.                                                                                                                                                                                                                       |
| Exports                  | 2,462 export records; 422 raw flags (259 values, 163 types), 283 flags in src                  | Checker misses generic namespace consumption and some dynamic destructuring. After discarding types/defaults and any value name appearing in other code/data files: **87 candidates, 70 in src**. This conservative filter misses same-name dead exports and does not prove arbitrary dynamic consumers absent.                                                                                               |
| CSS                      | 44 files; 555 distinct per-file class tokens; 2 unmatched literal names                        | `pause.css:235` guide-pad comes from `player/guide.ts:66`; `pad-diagram.css:168` pd-halo comes from `pad-diagram.ts:200-203`. **0 confirmed unused class selectors.** ID/tag selectors, property-level redundancy, computed selector combinations and runtime coverage were not fully audited.                                                                                                                |
| Binary media             | 11 tracked media files across the repo                                                         | 4 built GLBs have loaders; source hero-clips is pipeline input (`assets/built/manifest.json:13`), not a runtime orphan. Icons resolve through HTML/webmanifest, splash through boot/menu, island.png through protos/heat. One reference-only JPEG has no tracked consumer; see table.                                                                                                                         |
| Dependencies             | Root 9 dependencies + 24 dev dependencies; server 2 + 1                                        | All 26 non-`@types` declarations have import evidence. Ten no-literal-import type packages are compiler dependencies for those packages/Node. **0 high-confidence unused declarations.** No package install was performed.                                                                                                                                                                                    |
| npm scripts              | 43 root scripts, 3 server scripts                                                              | 41 root names have external command mentions or another script invoking them; remaining postinstall/prepare are lifecycle hooks (`package.json:12,43`). Server start/dev/test are documented/called. **0 confirmed unused scripts.** Mentions establish discoverability, not how often tools are run.                                                                                                         |
| Dev tools                | 164 TS files; 118 raw no-import files; 27 look evals, 24 no-import evals                       | CLI/script roots, 38 scenario modules and dynamic shot/sim loaders account for many flags (`scenarios/run.ts:40-45,84`; `sim/run.ts:6-30`; `video/clip.ts:106`; `sim/world.ts:31`). Only **water-fft-check.ts** among the 24 eval flags has no external filename/basename mention; it documents itself at lines 1-4 and imports live FFT/spectrum code. It is poorly discoverable, not demonstrably obsolete. |

**False-positive review (MEASURED):** all three raw src file flags were false positives (3/3, 100%); both CSS flags were
false positives (2/2, 100%); all ten no-literal-import dependency flags were false positives (10/10, 100%). For exports,
hand-checked the **first 20** filtered records in sorted tracked-file traversal: 0/20 contradicted the narrower claim
“no tracked external name consumer”; **19/20 still have local uses**, so treating that sample as removable implementation
would have a 95% false-positive rate. The exception is `haul-pilot.freeCam`, an optional eval helper, still not proof of
no manual use. The sample contains routePts, fileList, readLockstepGlobs, listSources, gitFacts, TIGHT, serverClock,
freeCam, playedS, idleS, CORE_LATE, hasNotes, loadAll, TRACES_KEY, cleanBatch, SESSION_RE, postActive, RAIL_END, brandOf and
myStack. These are bounded sample rates, not estimates of repository-wide precision or recall. Rule exports `name`,
`install`, `edits`, `invariants` are consumed through `RULES` and replay iteration (`rules/index.ts:33`,
`test/world-replay.test.ts:37,70`); they are explicitly excluded from removal claims.

### High-confidence candidates, separate from prototype archival

“High confidence” below is **STATIC confidence in the precise claim**, supported by measured searches, not authorization
to delete. No candidate changes were made. Names were searched across tracked code/data, including eval strings; local
call sites were read. For extra exports, preserve the function/constant and all its local behavior.

| Candidate                                                              | Evidence                                                                                                      | Concrete scope if separately approved                                                                                                            |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `atlas/views/how.ts:30` routePts                                       | No external name/reference; used locally at :107                                                              | Remove only export visibility.                                                                                                                   |
| `atlas/views/inspector.ts:29` fileList                                 | No external name/reference; used at :96-108                                                                   | Remove only export visibility.                                                                                                                   |
| `dev/atlas/extract.ts:20,82,99` readLockstepGlobs/listSources/gitFacts | All three used only within extract (:127-143)                                                                 | Remove only export visibility; keep extraction behavior.                                                                                         |
| `dev/scan/read.ts:226` CORE_LATE                                       | Used by local isCoreHook at :228, no external name                                                            | Remove only export visibility.                                                                                                                   |
| `src/debug/look-post.ts:76` postActive                                 | Used by buildPost at :87, no external name                                                                    | Remove only export visibility.                                                                                                                   |
| `src/features/gamepad.ts:57` brandOf                                   | Called locally at :65; no external name                                                                       | Remove only export visibility; retain every Nintendo mapping/name.                                                                               |
| `src/features/haul-stack.ts:78` myStack                                | Local consumers :79,164; no external name                                                                     | Remove only export visibility.                                                                                                                   |
| `src/render/near-fade.ts:6,9` NEAR_FADE/nearness                       | Used by fadeNear locally, no external names                                                                   | Remove only export visibility.                                                                                                                   |
| `src/render/audio.ts` setNoteSnap                                      | Removed after confirming no installer, including in `archive/groove`; `onBeat` remains live and returns its inputs. | Restore the hook from git history if music needs it. |
| `dev/concepts/refs/game-beach.jpg`                                     | No filename reference in tracked text, prompts or loaders; concept CLI accepts manual --ref (`generate.ts:4`) | Unreferenced reference artifact, not runtime payload. Ask whether it remains a useful reference; no deletion recommendation from absence alone.  |

No high-confidence unused entire runtime module, CSS selector, dependency or script is asserted. Export visibility
cleanup saves navigation noise, not necessarily bundle bytes. No unreachable Boogler lines were established by this
analysis; every line stays intact. An owner-facing unreachable-lines list would require control-flow/dialogue coverage
not collected here. Nintendo references are not rename candidates; no ROM data was introduced or requested.

## Prototype inventory and retained seams

**MEASURED:** 24 cards: live 3, answered 8, graduated 6, parked 2, retired 5. `archived` is a separate optional field.
The three archived cards (`moves:225`, `board:351`, `groove:368` in `protos/protos.ts`) have local archive tags and no
corresponding standalone source directories/loaders: **0/3 archived implementations remain**. Active
`proto/place/moves.ts` is a different unlock implementation, not leftover standalone moves.

18 AST protoOn calls total, **17 outside src/proto in 16 files**, using 13 literal IDs; **all 13 have cards**. Outside
calls divide into 13 calls in 12 prototype loaders, one fall entry (`features/fall.ts:10`), and three core branches
(`player/haul-variant.ts:9`, `features/work-sites.ts:36`, `features/track-machine.ts:475`). There are 22 static imports
from outside src/proto into it within src: 20 flags imports and 2 mark imports, allowed by the contract. Generic PROTO/PLAY
branches also exist at `player/arrival.ts:65`, `features/return-spot.ts:42`, `debug/prof-overlay.ts:54`; they are not dead
merely because some cards retired.

**11 cards lack a protoOn-specific handler:** 3 archived; 4 graduated home links (`babble`, `build`, `uisfx`, `hero`);
`layout` uses `layout=`; and 3 merged retired records (`onehand:61`, `ride:181`, `arrive:504`). The last group is a
STATIC destination mismatch, not three proven missing features. Card notes say merged, but the old-looking Play URLs
remain. No browser run established their visible behavior.

| Candidate or seam     | Actual dependents / disposition, STATIC reading with measured references                                                                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Answered assets       | `features/proto-assets.ts:6`; still in ISLAND (`flags.ts:15`), pipeline demo. No incoming import from another experiment found. Owner-review candidate only, utility remains.                                           |
| Answered look         | `features/proto-look.ts:9` loads `debug/look-lab.ts`, whose :13,27 load post/world tools; rendering workflow utility. No other experiment imports found. Owner-review candidate only.                                   |
| wagon                 | net/index:23, net/depot:26, net/crates:10; crossing/train:13; place/look-kit:11, place/rail:17. Retain dependent modules.                                                                                               |
| era                   | Block type used in net/boxes:7, net/stages:11, place/town:12. Type-only references still matter to builds.                                                                                                              |
| minis                 | common.ts used by net/town:9 and 17 place files, e.g. run:13, gifts:16, cargo:12. This proves common helper dependence, not that every mini-game is required.                                                           |
| crossing              | place/index.ts:34-35 reuses sea/sky.                                                                                                                                                                                    |
| haulHooks / pickReach | `player/haul-variant.ts:19`; wave:72, net/depot:113, place/index:109 write hooks; core log-sources:46,61,91 and piles:9 consume them.                                                                                   |
| Core bundle fields    | haul-stack.ts:115-119 flyIns/count/remote; haul/magnet:90-91, place/chop:42-43 and place/coop:661 write them.                                                                                                           |
| Core softWall         | entities/player/state.ts:152; crossing/index:31, water/index:67, place/index:126 write it.                                                                                                                              |
| Sky uCurve            | render/sky.ts:108 says crossing only; place/look.ts:172 also writes it. Comment stale, live setting.                                                                                                                    |
| Core lockstep residue | sim/tune.ts:12-25 has 8 active tunables plus 3 retired snapshot keys; world/rules/opening.ts:33-75 installs opening state/ops. Wire state cannot be removed as if optional display code; namespace/version rules apply. |
| lay / soapbox         | lay/index.ts:1-4 tests real laying code and stays. Retired soapbox remains deliberately playable with eval/audio/scenario consumers; no archival recommendation.                                                        |

The owner alone decides whether a prototype is answered and whether its utility/dependents justify retention. Existing
answered status is evidence of a card decision, not authority to archive it now. In particular, the 2-Nov caution in
the decision log supersedes a mechanically applied archive rule.

## Guidance counts, currency and reading burden

**MEASURED corpus:** 248 tracked Markdown documents, categorized disjointly below; 17 are folder READMEs (overlapping
categories). The targeted guidance corpus has 80 files: those 17 READMEs + AGENTS + CLAUDE + 36 as-built chapters + 23
skill documents + 2 agent briefs. The scans handle inline Markdown links and exact backticked root-looking paths;
relative shorthand examples, glob/template paths, link anchors and external URLs are not included in the path totals.

| Category                                     | Count | Currency signal                                                                                                                                                |
| -------------------------------------------- | ----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root Markdown                                |     6 | AGENTS/DESIGN current; PLAN begins Historical. CLAUDE imports AGENTS.                                                                                          |
| .claude/skills, including references         |    23 | Task-scoped guidance; must follow AGENTS when older text conflicts.                                                                                            |
| .claude/agents                               |     2 | Active agent briefs; stale usage-limiting language noted above.                                                                                                |
| docs/game-design                             |    36 | Index explicitly says as built; stale leaves are particularly misleading.                                                                                      |
| docs/plans                                   |    23 | 3 in done/; 10 have Status in first 12 lines; others use draft/approval prose. Absence of Status is not proof of staleness.                                    |
| docs/proposals                               |    15 | 8 Historical, 2 Parked, boogle-2 living, six-eras Not approved, design-audit binds no one, README policy, methodology without an opening authority disclaimer. |
| research reports/index outside notes and 0.1 |    89 | Research is evidence/advice, not built behavior; dates and source status matter.                                                                               |
| research notes                               |    24 | Source provenance/working evidence.                                                                                                                            |
| research/0.1                                 |     5 | SETTLED:3 says historical; its “do not re-open” title alone can mislead search.                                                                                |
| docs/atlas Markdown                          |     2 | Current narrative guidance/change log; 8 story JSON files are additional.                                                                                      |
| Other nested Markdown                        |    23 | Mixed tooling/runtime instructions and notes; inspect per-file authority.                                                                                      |

Exact path scan: **9 flags / 270 occurrences**, hand-checked all: **6 stale occurrences in 5 files**, 3 false positives
(33.3% of flags). Excluded optional CLAUDE settings.local, explicitly historical removed water-lab, and server-relative
src/host. The actual stale pointers are:

| File:line                          | Stale exact path / current implication                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| .claude/skills/feature/SKILL.md:12 | sync.js and game-world.js should point at the TS owners; check:full trigger also predates the narrower current rule. |
| assets/audio/README.md:4           | Says src/proto/groove/stems.ts remains, but groove is archived.                                                      |
| docs/game-design/glossary.md:17    | Removed src/net/room.ts; :9,11 also retain peer-room host/lead assumptions.                                          |
| docs/game-design/mismatches.md:10  | Removed src/net/room.ts, alongside obsolete PeerJS/JS/CI assertions.                                                 |
| docs/game-design/tech.md:24        | Removed dev/peer-test/run.mjs; :15 also teaches feature onFrame without the entity constraint.                       |

Additional semantic/template staleness is outside that exact-path denominator: rules README's three `<x>.js` recipes,
missing Rules type update, POI onFrame recipe, `docs/game-design/status.md:3` calling historical PLAN the roadmap,
`docs/research/README.md:3` treating it as a decision source, and `docs/proposals/methodology.md:7` claiming precedence
for old tech-plan decisions. Search can surface these claims without their parent disclaimer. Fix current pointers and
show status; retain dated history. This audit does not claim every assertion in all 248 documents was fact-checked.

Words are whitespace-separated; tokens are **estimated as character count / 4**, not tokenizer measurements. Rounded
aggregate estimates may differ by one from sums of rounded per-file estimates. CLAUDE's AGENTS import is counted once.

| Read                       |  Words | Estimated tokens |
| -------------------------- | -----: | ---------------: |
| AGENTS.md                  |  4,659 |            7,624 |
| CLAUDE.md                  |    904 |            1,552 |
| DESIGN.md                  |  2,225 |            3,515 |
| docs/plans/find-the-fun.md |  2,183 |            3,448 |
| src/README.md              |    669 |            1,231 |
| docs/game-design.md        |    862 |            1,526 |
| docs/decisions.md | 10,684 |           16,374 |

Explicit unconditional minimum: **9,067 / ~14,586** words/tokens. Including supplied CLAUDE: **9,971 / ~16,137**. Add
useful map/index (linked, not explicitly unconditional full reads): **11,502 / ~18,893**. Add the conditional design,
level, art or character decision log: **22,186 / ~35,267**. Pure unconditional minimum plus decision log is
**19,751 / ~30,960**. Subsystem contracts, research and skills add to these lower bounds. Visual capture/shipping
mechanics rarely apply to an audit; network loads rarely to a hat; lockstep wire details rarely to cosmetic HUD work.
All remain binding when relevant.

## Six cold-start routes on paper

**MEASURED queries and reads; STATIC placement judgments.** These were bounded reproducible routes after common
instructions, not a blinded novice study or elapsed-time test. A file opened is counted once per task; search hits
alone are not file reads. Common AGENTS/CLAUDE/DESIGN reads excluded. Total: **9 queries, 35 per-task file reads**.

| Task                   | Searches / files | Files opened, in route order; resulting owner                                                                                                                                                                                                                                                                                                                      |
| ---------------------- | ---------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Add a hat              |            3 / 7 | src/README; game-design/player; features/buddy; player/buddy/body; assets/src/buddy.py; character/main; proto/place/gifts. Built-in wear_head meshes: buddy.py:324-405, body.ts:154,179, preview character/main.ts:54. Earned place hats: gifts.ts:78,120,687. **Ambiguous without hat scope**; sim/gift-catalog is a misleading alternative for wearable rewards. |
| Add cosmetic critter   |            1 / 4 | src/README; game-design/critters; features/critter-fireflies; entity/entity. Flat feature entry with Local entity (`critter-fireflies.ts:65-66`). entities also sounds plausible; shared/interactive critters need a deliberate sync choice.                                                                                                                       |
| Add jump tuning        |            2 / 6 | src/README; player/player; entities/player/state; constants; game-design/player; dev/level/rules. Launch speed constants.ts:13; arc JUMP state.ts:36; input buffer :75. **Wrong initial expectation:** player/player is a facade. New tuning goes with its actual owner, and level/rules.ts:34 derives reachability from speed/gravity.                            |
| Add lockstep op/system |            1 / 7 | src/README; world/rules/README; rules/piles; sim/piles; adapters/piles; rules/index; rules/types. Existing op belongs to its rules/sim owner; new system additionally appends RULES and updates types.ts:32. **Recipe incomplete:** “four files” misses typed Rules; adapter is a feature unless other modules import it.                                          |
| Add HUD element        |            1 / 5 | src/README; features/held; player/hud; ui/notify; entity/entity. Feature-owned HUD + adjacent CSS + entity lifetime (`held.ts:104,201-202`); transient message uses notify.ts:86. player/hud owns core charge/look/roster/lobby; ui owns reusable kit. Three plausible homes until responsibility is known.                                                        |
| Add POI                |            1 / 6 | src/README; island/README; island/index; features/pois; pois/lighthouse/site; pois/lighthouse/index. New site.ts with reach + content entry discovered by globs. **Wrong example to copy literally:** lighthouse index.ts:358-359 uses suppressed onFrame; a new POI needs entities and level-check.                                                               |

Executed search patterns (one `rg` invocation = one query):

- Hat: `\bhat\b|\bhats\b` in player/features/player docs; `wear_head` in assets/src and character;
  `slot: .hat.|type GiftId|const FIT` in place/gifts.
- Critter: `critter` in src map, critter docs and the three critter features.
- Jump: `JUMP_SPEED|jumpSpeed|jumpHeight` in src; `JUMP|jumpQueued` in entities/player/state and player/player.
- Op: `registerOp|Rules =` in rules/piles, types and index, reached through the mandatory recipe.
- HUD: `HUD|hud|notify` in src map, features/held, player/hud and ui/notify.
- POI: `POI|pois|glob` in src map, island README/index and features/pois.

**Map/tree audit:** zero unlisted immediate folders out of 21. Top-level prose omits `last-launch.ts` and `globals.d.ts`
but does not claim exhaustiveness. `player/buddy/` is important and not named. `src/README.md:33-35` still makes
player/player sound like the driver: it is an 8-line facade; entities/player/state is the controller, whereas
player/state stores shared player/camera records. Generic state names and `proto/place/gifts` versus `sim/gift-catalog`
need search aliases, not a mass rename. The map correctly separates net room transport from netplay game presence;
those two folders are not duplicated implementations. Likewise ui and player UI have different responsibilities.

**Size:** 22 of 386 src TS files exceed 500 lines. Largest: place/gifts 1,456; soapbox/index 1,190; boogler/lines 1,185;
place/folk 1,129; place/tech 933; place/rail 914; water/surface 861; world/sync 765; place/coop 727; boogler/boogler 718.
Seven of the 22 are outside prototypes: boogler/lines, world/sync, boogler/boogler, debug/look-world 586,
pois/caves/decor 552, features/pause 525, features/track-machine 501. Size measures reading cost, not waste. Do not trim
Boogler lines or reshape prototype internals solely because they are large.

## Enforcement and existing tools

| Rule / capability                | Current mechanism and limit                                                                                                                                                                                                                                                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Entity placement                 | ESLint use-an-entity detects direct onFrame/addBody and scene.add (`eslint.config.js:102-111`), with 16 service exemptions and prototype/debug/core exclusions. It is a syntactic guard, not proof every new screen/world thing is an entity.                                                                                                          |
| Module direction                 | Lint bans feature-to-feature imports, sync registration outside rules, sim dependencies/determinism violations, headless-layer rendering imports, static prototype/debug imports and direct engine/network/audio/frame doors (`eslint.config.js:157-366`).                                                                                             |
| Export cleanliness               | Ordinary unused locals/imports are linted; exported declarations, unused files, CSS and asset reachability are not comprehensively checked.                                                                                                                                                                                                            |
| Registry correctness             | Presence/message/pad collisions, frame orders, kind metadata, RULES ordering, op/state removals/shapes and cycles are checked. Run passed: 17 presence keys, 11 message types, 16 ops, 10 states; 20 entity suppressions.                                                                                                                              |
| Prose-only placement/cleanliness | Exact hat/critter/HUD ownership; small feature entry vs shared implementation; approved new dependency rationale; prototype answer/archival decision; Boogler-copy preservation; doc semantic currency; lifecycle-list non-growth against history. The rule that only main's glob imports entity index is not itself a general index-import lint rule. |
| Asset freshness                  | assets --check compares source/output hashes and manifest entries (`dev/assets/build.ts:78-110`); it does not prove runtime use. Asset ids validate on registration (`src/render/asset-manifest.ts:29-33`).                                                                                                                                            |
| Level allowances                 | Current matches beyond max and stale unused entries fail (`dev/level/check.ts:35-42,76-83`); full baseline monotonicity is not enforced.                                                                                                                                                                                                               |

Historical burn-down, from local Git only: suppressions began at `4159f2d4` with **108 in 51 files**; checkpoints show
97 → 87 → 78 → 70 → 58 → 54 → 45 → 41 → 36 → 34 → 27 → 22, now **20 in 4 POI files**. KNOTS began at `be3f5414`
with **2 groups / 11 members**, emptied at `533734d3`, still empty. `dev/level/allow.ts` has only its introduction
`a9586b7c` in history, still **15 entries / 24 max occurrences**: no shrinking trend established. Lint/registry detect
stale current-list entries, but current-list edits themselves are not compared with previous limits.

| Existing tool                | Observed use / missing answer                                                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| npm run registry [-- --json] | Passed in 1.67 s wall time. Already owns shared registries and source scanner. Best home for cheap objective contradictions and an optional unused report; no new competing scanner needed. |
| npm run map -- <folder>      | Source read at dev/map.ts:1-40: descriptions, size, exports; currently requires knowing a folder, nonrecursive. Best home for a task-kind route query.                                      |
| npm run inspect -- --json    | Passed, 240 headless frames. Runtime entities/state/cost, only loaded headless kinds; absence is not unused source. No browser/performance conclusion drawn.                                |
| npm run atlas -- --check     | Passed, **0 problems**, 0.82 s wall time. Validates structured atlas citations, not every Markdown assertion; always exits zero even with stale narrative.                                  |
| docs/atlas                   | Existing concept/folder notes and 8 stories; facts generated from code. Extend this map for task recipes, prototype dependents and explicit reference reasons.                              |
| npm run inflight             | Code inspected only; remote fetch/GitHub prohibited. It locates concurrent branches/overlap, not unused code or placement.                                                                  |

Timings are single local observations, not controlled benchmarks. Proposed added-check budgets above are estimates.
Keep narrative correctness advisory as DESIGN requires, and introduce no UI tests or scenarios for this tooling advice.

## Engine comparison from sources actually read

Only checked-in notes were consulted; no external source is cited as freshly read. Local
[entity source notes](notes/entity-architecture/sources.md) mark their primary-source provenance;
[art-kit pipeline](art-kit-pipeline.md) at lines 85-93 records the relevant reusable-asset comparison.

| Engine practice supported by local notes                                                                                                                                                     | Where Boogle differs                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unity Prefab object/component hierarchies and variants, LODGroup; UI Toolkit has a virtual visual tree rather than a GameObject per element (art-kit-pipeline:89; entity source notes:17-25) | Typed modules, entity-owned views and DOM; no equivalent serialized prefab dependency graph established in this audit. Module discovery needs entry/glob knowledge.           |
| Unreal Actor/Component lifecycle, managed subsystem lifetimes and named mesh sockets (entity source notes:26-29,44-47; art-kit-pipeline:90)                                                  | Boogle separates services, entities, physics and rendering using import/lint rules. Services need not become objects; source owners and lazy entry metadata must be explicit. |
| Godot PackedScene, Resources, node tree and imported mesh LOD (entity source notes:30-32,48-53; art-kit-pipeline:91)                                                                         | Boogle's references are TS imports, globs, manifests and generated geometry. A resource/object analogy does not justify copying an engine's folders or adding an editor.      |

**Specific engine project-directory conventions and asset/reference audit tools remain unverified.** Searches of local
docs/.claude for Reference Viewer, AssetDatabase/GetDependencies, Asset Registry, ResourceUID, project layout/folder
structure and asset auditing found no supporting notes. The read sources support lifecycle/resource composition,
not those specific tools. Under the no-network constraint, an asserted Unity/Unreal/Godot dependency-auditor comparison
would be unsupported. This requested portion is therefore incomplete; the Boogle measurements and proposals above do
not depend on claiming such a comparison was made.

## Validation and what could not be verified

`npx prettier --write --ignore-path /dev/null` formatted this report and the disposable TS scanners; the explicit ignore
override is needed because `.prettierignore` excludes Markdown/research. **npm run check passed**: lint, typecheck,
292/292 unit tests, registry, five level checks, four fresh built assets and production build. Existing level allowances
remain; no implementation fix was needed. `git diff --check` passed. The captured check log is
`.look/navigation-check.log`; the local audit manifest is `.look/navigation-audit-evidence.json`.

No browser, bot, image or motion run was required or
performed: zero images opened, no visual question claimed, no bot failures observed because no bot was run. No gameplay
or runtime behavior changed. No new tests or scenarios were added. No push or ship command was run.

Unverified: runtime CSS coverage, every computed reference or manual CLI consumer, full control-flow deadness, exported
type usefulness, marginal bundle savings, actual human time saved, prototype owner verdicts beyond checked-in cards,
remote inflight/main/deploy state, broken external URLs/link anchors, and the specific engine layout/reference-auditing
comparison. No deletion safety follows from static non-reference counts. Owner playtests and follow-on implementation
were not started.
