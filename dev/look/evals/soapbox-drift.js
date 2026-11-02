// A handbrake drift through the long right-hander across the lowland, held hard into the turn long enough (0.8 s at
// the best rate) for the big charge: the sparks go blue (ready), then pink (big), and letting go fires the boost with a
// burst and a field-of-view kick (dev/look/evals/soapbox-pilot.ts). Add &v=bouncy, &v=tight or &v=drift to compare the variants:
// BOOGLE_QUERY=proto=soapbox&v=drift npm run look -- --eval dev/look/evals/soapbox-drift.js --hud --warm 7 --seconds 2.4 --frames 12
const { drive } = await import('/dev/look/evals/soapbox-pilot.ts');
await drive({ drift: [7.4, 8.2], driftSteer: 1 });
