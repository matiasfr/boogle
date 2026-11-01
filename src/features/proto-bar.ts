// The prototype bar (src/proto/bar/): on any `?proto=` page, the prototype's question, its variants, a one-tap
// verdict and behaviour counters, saved for the protos page (boogle.club/protos/). Loads in its own chunk only with
// the flag; without it the game is unchanged. Serves DESIGN.md "How we work".
if (new URLSearchParams(location.search).has('proto')) void import('../proto/bar/index.ts');
