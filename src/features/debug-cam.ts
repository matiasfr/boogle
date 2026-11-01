// Dev only: with `?debugcam=1` this loads src/debug/debug-cam.ts (`window.__debugCam`, used by `npm run look`) in its
// own chunk, so normal players never download it (src/loop.ts, "Lazy parts").
if (new URLSearchParams(location.search).has('debugcam')) import('../debug/debug-cam.ts');
