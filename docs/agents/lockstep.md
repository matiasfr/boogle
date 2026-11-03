For lockstep math or helper-location edits/reviews, read this section. Read the rules/world contract sections only when their behavior is affected.

# Lockstep

**Lockstep math** (`LOCKSTEP_FILES`: `src/sim/`, `src/world/rules/`, ...): integers for conserved quantities; floats only with `+ - * /` and `Math.sqrt`; seeded `mulberry32` (`src/sim/rng.ts`); fixed order and tick. Never `Math.random`, `Date.now`, `sin`/`cos`/`pow`/`exp`/`log`/`atan2`/`hypot`, `**`, or three.js or physics-engine math. Cosmetic code is Local and never read by the sim; a tested cosmetic helper that needs `sin` or `Math.random` goes in a three.js-free module outside `src/sim/` (like `src/math-pure.ts`); lint fails it anywhere in `src/sim/`, even beside cosmetic code.
