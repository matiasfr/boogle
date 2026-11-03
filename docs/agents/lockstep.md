Before touching src/sim or src/world/rules (including cosmetic helpers), read this and the rules/world contracts.

# Lockstep

**Lockstep math** (`LOCKSTEP_FILES`: `src/sim/`, `src/world/rules/`, ...): integers for conserved quantities; floats only with `+ - * /` and `Math.sqrt`; seeded `mulberry32` (`src/sim/rng.ts`); fixed order and tick. Never `Math.random`, `Date.now`, `sin`/`cos`/`pow`/`exp`/`log`/`atan2`/`hypot`, `**`, or three.js or physics-engine math. Cosmetic code is Local and never read by the sim; a tested cosmetic helper that needs `sin` or `Math.random` goes in a three.js-free module outside `src/sim/` (like `src/math-pure.ts`); lint fails it anywhere in `src/sim/`, even beside cosmetic code.
