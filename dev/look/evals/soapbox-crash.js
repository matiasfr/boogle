// Down the massif's face straight at the palm at its foot: a wipeout (dev/look/evals/soapbox-pilot.ts):
// BOOGLE_QUERY=proto=soapbox npm run look -- --eval dev/look/evals/soapbox-crash.js --hud --warm 7.5 --seconds 3 --frames 12
const { drive, obstacle } = await import('/dev/look/evals/soapbox-pilot.ts');
await drive({ path: [[-40, -95], [-34.5, -94], [-41, -85], obstacle(-43, -64) ?? [-43.2, -63.4]] });
