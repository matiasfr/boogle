For shared-rule math and helper-location edits/reviews. No lockstep state or classic transport remains at v40.

# Lockstep

Clients neither execute shared ticks nor compare hashes. Hashes verify server checkpoints; replay tests compare
server results for fixed inputs.

`src/world/railway-predict.ts` calls `railApply` on a clone for declared predictions, using the server's
`src/sim/railway*.ts` rules. Ordering, seeded choices and arithmetic must agree so an uncontested prediction
confirms without spurious correction. Replication corrects refused or raced predictions; authority needs no
cross-client float equality.

The existing `LOCKSTEP_FILES` math lint remains conservatively broad in this step. Keep integers for conserved
quantities, fixed rule order/ticks and seeded `mulberry32` (`src/sim/rng.ts`). Floats use `+ - * /` and `Math.sqrt`.
Do not introduce `Math.random`, `Date.now`, native trig/transcendentals (`sin`, `cos`, `pow`, `exp`, `log`, `atan2`,
`hypot`), `**`, or renderer/physics-engine math in guarded paths. Cosmetic helpers needing these operations stay
outside `src/sim/`, remain three.js-free where appropriate, and never feed authoritative or predicted rules.

Narrowing the trig ban needs an audited prediction dependency boundary; step 9 leaves `dev/lint` unchanged.
Never re-pin replay fixtures without identifying the changed inputs and behavior.

The Boogler's trig stays in `src/world`: Host/local and injected server shadow (step 5), never railway prediction.
