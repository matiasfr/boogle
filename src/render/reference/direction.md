## Where this is going

The "Graphics quality tiers" item in [PLAN.md](../../../PLAN.md): a quality setting in the pause view (auto, low,
medium, high), with compute particles behind `emit()`, TRAA, bloom, clustered lights for night lanterns (in place of
the two-light pool in `lights.ts`), cascaded shadows, and GTAO, SSGI, SSR and god rays on the high tier. The look-inside-the-materials
ideas in [docs/research/stylized-rendering-on-a-budget.md](../../../docs/research/stylized-rendering-on-a-budget.md)
remain the floor every device gets. The `?proto=look` lab ([src/debug/look-lab.ts](../../debug/look-lab.ts)) switches
candidate layers on the real island and times them; measured costs and the recommended iPad target:
[docs/proposals/visual-target.md](../../../docs/proposals/visual-target.md).
