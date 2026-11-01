// Prototype: the first 30 seconds from a shared link, behind `?proto=arrive` (src/proto/arrive/,
// docs/research/wordless-onboarding.md recs 1, 2, 3, 8): timings, no lobby, an arrival facing the court with the ball
// rolling toward you. Loads in its own chunk only with the flag; without it the game is unchanged.
if (new URLSearchParams(location.search).get('proto') === 'arrive') void import('../proto/arrive/index.ts');
