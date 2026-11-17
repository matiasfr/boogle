# Rider coach evidence trim — 16 November 2026

> **Status:** reference (reconciled 17 November 2026). **Verdict:** Curated evidence cleanup shipped with #1999; no history rewritten.
> **Recommendation:** Use the retained JPEG/HTML evidence; local originals are not durable proof.

Source: main `4c1423f995ffe31392b29715d5ab01dcdaa1d779` (#1995). Working-tree cleanup only; no history rewritten.

| Folder | Before bytes | After bytes | Images |
| --- | ---: | ---: | ---: |
| `docs/research/rider-coach-r2b/` | 64,284,037 | 3,122,581 | 20 JPEGs |
| `docs/reports/rider-coach-r2b1/` | 7,458,454 | 1,821,980 | 13 JPEGs |

All images are at most 1200 pixels wide. The original files are local-only under `.look/rider-coach-r4/original-evidence/`.
Kept the margins and roof tables. Removed raw JSON, logs, copied scripts and unused images. `git grep` found no references to these evidence files in src/, dev/ or test/; the harnesses' similarly named `.look/` output paths are separate.

Updated every affected Markdown link in `rider-coach-r2b.md`, `rider-coach-r2b-review-fixes.md`, `rider-coach-r2b-second-stop.md`, `rider-coach-r2b1.md` and `rider-coach-r2b1-preflight.md`: retained images link to JPEGs; removed receipts are plain local-only text. The plan and game-design chapters had no direct links into either directory requiring replacement. Each directory has an index. A targeted Markdown/HTML link scan verifies the retained targets.

The other folders above 5 MB in the requested inventory are earlier work: toon-shading 6.8 MB (10 November), post-look-round2 7.3 MB (4 November), color-defaults 7.9 MB (5 November), buddy-light-ramp 8.4 MB (4 November), dark-unlit-exposure-evidence 9.8 MB (5 November). Left alone. No other inventoried folder exceeds 20 MB. No additional oversized first-town folder appeared in this inventory.

The Stack's known one-sided platform gap remains documented in the R2b report and margins table: homeward track centre −4 m; platform inner edge +1.8 m; coach half-width 0.8 m; lateral gap 5 m. This is a known gap, not a boarding proof.

Validation: repository docs gate (`node dev/ship-check.ts`), registry, and targeted evidence-link existence scan. No game or design change. Principle: Small and readable.
