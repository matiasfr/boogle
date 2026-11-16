# Rider count-readability: stopped layout trial

16 November 2026, on `t3/first-town-rider-places`, starting at `dd61f3a71`.

The extra pass did **not** meet the brief. The widened queues are visibly longer than the previous
0.165 m cluster, but their hats merge into bands and their bodies still read as a fused crowd.
The geometry diagnostic also rejects the inner figures for entry-post/knob contact. No further layout
iteration: the failed positions were reverted, leaving the reviewed game code at `dd61f3a71`.
This report and the plan/design acceptance notes are the only committed changes. V1 is reopened;
this is not a ship recommendation. Findings 1, 3 and 4 remain accepted and unchanged.

## Trial positions and fill order (rejected, not retained)

All x coordinates were ±0.77 m, with matching x/z signs, facing out over the corresponding side.
The fill order alternated ends, then filled the opposite ends of each available strip, then its interior:

| Boarding number | x | z | Yaw |
| --- | ---: | ---: | ---: |
| 1 | −0.77 | −1.145 | −π/2 |
| 2 | +0.77 | +1.145 | +π/2 |
| 3 | −0.77 | −0.680 | −π/2 |
| 4 | +0.77 | +0.680 | +π/2 |
| 5 | −0.77 | −0.990 | −π/2 |
| 6 | +0.77 | +0.990 | +π/2 |
| 7 | −0.77 | −0.835 | −π/2 |
| 8 | +0.77 | +0.835 | +π/2 |

Within either queue the pitch was 0.155 m, spanning 0.465 m (2.82 times the old span).
I did not use the proposed outer centre 1.27: the previous actual-mesh probe puts the hands/hats
about 0.321 m beyond the centre, into the end fittings at 1.5 m. The trial retained 1.145.
The suggested inner x≈0.70 stagger was considered but not applied: the coat is about 0.2 m deep,
so it would reach x≈0.50 where the continuous bench seat extends to x=0.55. The absence of a player
seat assignment beyond z=0.45 does not remove that physical bench. This is why the proposed strip's
centre bounds do not establish full-mesh clearance.

## Evidence

All artifacts are under `.look/first-town-count-read/` in this checkout. These are **rejected-trial** shots,
not pictures of a new accepted implementation. The view dresses exactly the logged number of local figures
over the seed's three authoritative riders; it never changes server rules or the mirrored count. The pet is
locally granted. Counts here describe visible figures. The comparison camera is fixed relative to the car:
eye (−3.6, 8.5, 3.8), target (0, 1.1, 0), FOV 42; the car moves through the environment.

The first boarding image was opened and rejected as evidence because a foreground pole hid the near group.
An unobstructed boarding capture replaces it. Each final still was opened; observations are recorded below.

**Largest readable count demonstrated: four total, two per end.** The four-rider shot has separate round hats
and bodies at the strip's extremes. It still uses the inner positions that failed the fittings probe, so this is
not a clearance-safe four-rider replacement. Two total are both individually readable and clearance-safe in
the sampled comparison. I have stopped without trying more placements, as requested.

| Still opened | What it shows |
| --- | --- |
| [seated-still.png](../../.look/first-town-count-read/seated-still.png) | Orange seated Buddy beside the longer queue. Four coloured bands can be counted in either crowd, but I cannot honestly read four distinct heads/people in each. The inner hat/head touches the entry fittings. |
| [boarding-clear-still.png](../../.look/first-town-count-read/boarding-clear-still.png) | Above-bench boarding view, empty seats and two elongated fused crowds. No pole hides the groups; it does not rescue the four-head count. Replaces the pole-obscured `boarding-still.png`. |
| [pet-still.png](../../.look/first-town-count-read/pet-still.png) | Green seated Buddy and the orange pet beside the crowd; the pet is visible and its triangles stay clear. The queue still reads as bands and fails car clearance. |
| [count-2-still.png](../../.look/first-town-count-read/count-2-still.png) | Exactly two dressed rider figures, one yellow and one turquoise at opposite ends; both individually countable. |
| [count-8-still.png](../../.look/first-town-count-read/count-8-still.png) | Same car-relative camera with exactly eight dressed figures. Fuller/longer than two, but four bands rather than four distinct heads in each group. |
| [count-4-limit-still.png](../../.look/first-town-count-read/count-4-limit-still.png) | Extra fallback evidence: two separate hats and bodies per end, four people countable. Its inner figures use the already rejected positions. No additional layout iteration. |

Seven capture invocations passed WebGPU/completed-frame/error health, including the rejected pole-obscured
boarding view. This says nothing about whether the layout passes. Full eight-rider clearance was sampled
8 times in each of seated, boarding, pet and count-8: **32 sampled poses, all runs reporting fittings hits**.
The two-rider comparison has 8 samples with zero hits. The pet run has zero pet-triangle hits.
[Aggregated samples](../../.look/first-town-count-read/clearance-summary.json),
[rejected source patch](../../.look/first-town-count-read/rejected-folk.patch).

## Geometry failure

The previous diagnostic was rerun against actual rendered coat/hat, head and limb triangles in the car frame,
including panels, rails, posts, knob bounds and bench boxes. The pet capture also checks actual pet triangles.
The complete eight-rider trial fails with this full set of reported contact categories:

```text
["gap knob box-:328","gap knob box-:700","gap post-:700","gap knob box+:328","gap knob box+:700","gap post+:700"]
```

328 identifies the coat/hat mesh and 700 the head mesh. Knobs use conservative boxes; the post hits are against
actual recipe boxes. There were no reported pet triangle hits in the pet run. A successful browser capture
only means capture health passed; these contacts explicitly fail the placement acceptance.
The original probe source, adapted only for the comparison count, is retained as
[clearance.ts](../../.look/first-town-count-read/clearance.ts); full logs preserve every sample.

## Checks

Node 26.13.0. No golden regeneration, namespace bump, rule change, new player-facing copy, push or ship.
No claim of real-time smoothness, device performance or an exhaustive search of every possible placement.

- `npm run map -- --kind feature-fix`, `npm run checks-for`, `npm run inflight`: passed discovery.
  The selector includes the whole original branch; this pass is a view-only trial subsequently reverted.
- `node --import ./test/helpers/rail-no-audit.ts --test test/economy*.test.ts test/railway-trade.test.ts`:
  **108 passed, 0 failed, 0 skipped/todo**, [affected.log](../../.look/first-town-count-read/affected.log).
- `npm run lint -- src/place/folk.ts`: passed, 0 problems, [lint.log](../../.look/first-town-count-read/lint.log).
- `npm run typecheck`: passed, [types.log](../../.look/first-town-count-read/types.log).
  Scoped lint and types were repeated after reverting the trial: both passed (`lint-final.log`, `types-final.log`).
- Captures use `npm run look -- --rail-seed fares-running --eval .look/first-town-count-read/setup.ts
  --until window.__placeDone --seconds 2 --out .look/first-town-count-read`, plus their logged `--query`,
  `--name`, `--question` and (where used) `--action .look/first-town-count-read/clearance.ts`.
  Exact invocations and source stamps are in each corresponding log.
- `git diff --check`: checked before commit.
- `node dev/ship-check.ts`: final gate on the committed tip; its result is in the handoff and
  [ship-check.log](../../.look/first-town-count-read/ship-check.log).
