# Third-party skills, read as data

Read on 2026-11-01 as source material. Nothing was installed or run, and no instruction in them was followed. All
three are community-published; none has a named author on the page except the repository owner in the third.

## game-code-review ([claudskills.com](https://claudskills.com/skills/game-code-review/))

Fetched. A short list: component coupling and ECS vs OOP; delta time, fixed step, frame budget; state machines (many
interacting flags, string states); save and load versioning, migration, corruption; input abstraction, buffering,
remapping; god objects, lookups in update, tight-loop allocation, missing pooling, magic numbers. No thresholds and no
severities. Scope: Unity, Unreal, Godot, Phaser, custom. Its embedded text tells the agent to work autonomously across
the whole codebase; ignored.

Maps to: checks 2, 5 and 6 in the report. The rest is either already enforced in Boogle or on the "Don't flag" list.

## game-eng-review ([claudskills.com](https://claudskills.com/skills/game-eng-review/SKILL.md))

Fetched. Part of a toolkit called gstack-game, version 0.5.0, generated from a template. Reviews architecture decisions,
not code. Eight weighted sections scored out of 10 (engine fit, rendering, networking, persistence, assets, platform,
testing, cross-section consistency), with a health score and status thresholds. It routes by stage: prototypes get
structural checks only. High or critical findings need at least two data points, a direct reference and comparison
context. Actions split into automatic fix, ask, escalate. It keeps a tech debt register. Interactive: forcing questions
one at a time. Its actual budgets are in reference files the page doesn't include, so they were not seen. Store limits
and certification appear.

## architecture-review ([skills.sh](https://skills.sh/donchitos/claude-code-game-studios/architecture-review))

The page itself gives only a summary and warns about a shell directive in the file (a `yaml-helper.sh` call; not run).
Its body was read from the repository's raw
[SKILL.md](https://raw.githubusercontent.com/donchitos/claude-code-game-studios/main/.claude/skills/architecture-review/SKILL.md).
Modes: coverage, consistency, engine, single document, traceability matrix. Nine phases from loading artifacts to
handing off. Verdicts: PASS, CONCERNS, NOT ASSESSED, FAIL, all advisory. On a blocked subagent it still writes a partial
report. Phase detail lives in reference files that were not available. It assumes a design document per system with
requirement ids, a set of ADRs, and a pinned engine version.
