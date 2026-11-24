// Garage step 4's bring, as motion (docs/plans/garage-step4.md, step 3): the action half of garage-trade.ts. The setup
// eval opens the garage at the post; this hands the camera back to the garage, then presses a chip (a real rail.bring)
// so the sheet or clip catches the copies' swap.
//   npm run look -- --rail-seed trade-fitted --hud --video --seconds 8 --frames 12 --eval dev/look/evals/garage-trade.ts \
//     --action dev/look/evals/garage-bring.ts --query 'bring=ns' --name gt-bring
const { garage } = (await import(
  '/src/entities/railway/garage-state.ts' as string
)) as typeof import('../../../src/entities/railway/garage-state.ts');
const { ROW_LINE } = (await import(
  '/src/sim/railway-route.ts' as string
)) as typeof import('../../../src/sim/railway-route.ts');
const { LINE2 } = (await import(
  '/src/sim/railway-lines.ts' as string
)) as typeof import('../../../src/sim/railway-lines.ts');
const query = new URLSearchParams(location.search);
const want = query.get('bring');
window.__debugCam?.clear();
await new Promise((resolve) => setTimeout(resolve, 600));
garage.api!.bring(want === 'bay' ? ROW_LINE.bay : want === 'line2' ? LINE2 : ROW_LINE.ns);
export {};
