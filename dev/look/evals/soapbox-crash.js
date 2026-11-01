// Down the hill straight at the nearest palm past its foot: a wipeout (dev/look/evals/soapbox-pilot.ts):
// BOOGLE_QUERY=proto=soapbox npm run look -- --eval dev/look/evals/soapbox-crash.js --hud --warm 2.4 --seconds 3 --frames 12
const { drive, obstacle } = await import('/dev/look/evals/soapbox-pilot.ts');
await drive({ path: [[6.6, -45], obstacle(8, -30) ?? [4.5, -19]] });
