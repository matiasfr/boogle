// A handbrake drift on the steep part of the lighthouse path (dev/look/evals/soapbox-pilot.ts):
// BOOGLE_QUERY=proto=soapbox npm run look -- --eval dev/look/evals/soapbox-drift.js --hud --warm 1.2 --seconds 2.5 --frames 12
const { drive, PATH } = await import('/dev/look/evals/soapbox-pilot.ts');
await drive({ path: PATH, drift: [1.4, 2.6], driftSteer: -1 });
