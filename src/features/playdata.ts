// Playtest data (src/proto/playdata/record.ts): any `?proto=` or `?play` page uploads what happened, so the director can
// read a session before hearing about it. `&notrack=1` turns it off. Loads in its own chunk only with a flag; without
// one the game is unchanged. Serves DESIGN.md "How we work".
const q = new URLSearchParams(location.search);
if ((q.has('proto') || q.has('play')) && !q.has('notrack') && import.meta.env.VITE_BOOGLE_SERVER)
  void import('../proto/playdata/record.ts');
