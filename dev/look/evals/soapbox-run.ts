// A whole run of the soapbox course, seen from the chase camera (dev/look/evals/soapbox-pilot.ts; about 11 s):
// BOOGLE_QUERY=proto=soapbox npm run look -- --eval dev/look/evals/soapbox-run.ts --hud --warm 0.2 --seconds 13 --frames 16
const { drive } = (await import('/dev/look/evals/soapbox-pilot.ts' as string)) as typeof import('./soapbox-pilot.ts');
await drive({});

export {}; // a module for the type checker; look.ts strips this line (an eval body, not imported)
