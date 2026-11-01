// A run down the lighthouse path in the soapbox cart, seen from the chase camera (dev/look/evals/soapbox-pilot.ts):
// BOOGLE_QUERY=proto=soapbox npm run look -- --eval dev/look/evals/soapbox-run.js --hud --warm 0.2 --seconds 6 --frames 12
const { drive, PATH } = await import('/dev/look/evals/soapbox-pilot.ts');
await drive({ path: PATH });
