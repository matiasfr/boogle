// The prototype bar (src/proto/bar/): on any `?proto=` page, the prototype's question, its variants, a one-tap
// verdict and behaviour counters, saved for the protos page (boogle.club/protos/); with `?play`, the playtest playlist
// too (docs/plans/find-the-fun.md, "One path"). Loads in its own chunk only with a flag; without one the game is
// unchanged. Serves DESIGN.md "How we work".
const q = new URLSearchParams(location.search);
if (q.has('proto') || q.has('play')) void import('../proto/bar/index.ts');
