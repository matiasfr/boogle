// Down the course and across the lowland straight at the palm on the inside of the long right: a wipeout, held for a
// hit-stop, a wheel off, the camera staying on you in the air (dev/look/evals/soapbox-pilot.ts):
// BOOGLE_QUERY=proto=soapbox npm run look -- --eval dev/look/evals/soapbox-crash.ts --hud --warm 9.4 --seconds 3 --frames 12
const { drive, obstacle } = (await import(
  '/dev/look/evals/soapbox-pilot.ts' as string
)) as typeof import('./soapbox-pilot.ts');
const palm = obstacle(-50, -56) ?? [-52.3, -53.3];
await drive({
  path: [[-40, -95], [-34.5, -94], [-41, -85], [-42, -75], [-41.5, -68], [-40, -61.5], [-46, -56], palm, [-60, -50]],
});

export {}; // a module for the type checker; look.ts strips this line (an eval body, not imported)
