// A handbrake drift through the long right-hander across the lowland (dev/look/evals/soapbox-pilot.ts). Add &v=grip
// or &v=drifty to BOOGLE_QUERY to compare the handling variants:
// BOOGLE_QUERY=proto=soapbox npm run look -- --eval dev/look/evals/soapbox-drift.js --hud --warm 8.8 --seconds 3 --frames 12
const { drive } = await import('/dev/look/evals/soapbox-pilot.ts');
await drive({ drift: [9.4, 10.8], driftSteer: 1 });
