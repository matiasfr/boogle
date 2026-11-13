For shared-rule math or helper-location edits/reviews, read this section. The filename and heading remain stable
for existing instruction routes; no lockstep state or classic transport remains at v40.

# Lockstep

Clients neither execute shared ticks nor compare hashes. Hashes verify server checkpoints; replay tests compare
server results for fixed inputs.

Deterministic rule evaluation still matters: `src/world/railway-predict.ts` calls `railApply` on a clone for declared
predicted actions, using the same `src/sim/railway*.ts` rules as the server. Ordering, seeded choices and arithmetic
for those actions must agree closely enough that an uncontested prediction confirms without a spurious correction.
Replication corrects a refused or raced prediction; authority does not require cross-client float equality.

The existing `LOCKSTEP_FILES` math lint remains conservatively broad in this step. Keep integers for conserved
quantities, fixed rule order/ticks and seeded `mulberry32` (`src/sim/rng.ts`). Floats use `+ - * /` and `Math.sqrt`.
Do not introduce `Math.random`, `Date.now`, native trig/transcendentals (`sin`, `cos`, `pow`, `exp`, `log`, `atan2`,
`hypot`), `**`, or renderer/physics-engine math in guarded paths. Cosmetic helpers needing these operations stay
outside `src/sim/`, remain three.js-free where appropriate, and never feed authoritative or predicted rules.

Narrowing the trig ban needs an audited prediction dependency boundary; step 9 leaves `dev/lint` unchanged.
Never re-pin replay fixtures without identifying the changed inputs and behavior.
