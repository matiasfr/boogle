// A whole run of the soapbox course, seen from the chase camera (dev/look/evals/soapbox-pilot.ts; about 23 s):
// BOOGLE_QUERY=proto=soapbox npm run look -- --eval dev/look/evals/soapbox-run.js --hud --warm 0.2 --seconds 24 --frames 16
const { drive } = await import('/dev/look/evals/soapbox-pilot.ts');
await drive({});
