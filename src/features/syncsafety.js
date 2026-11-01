// Desync visibility, dev only: with `?netdebug=1` this loads src/debug/netdebug.js (overlay and desync dumps) in its
// own chunk, so normal players never download it (src/loop.ts, "Lazy parts").
if (Number(new URLSearchParams(location.search).get('netdebug')) > 0) import('../debug/netdebug.js');
