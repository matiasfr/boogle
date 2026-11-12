// driven by: npm run sheet (dev/look/sheet.ts supplies this as --eval with --rail-seed <stage>)
// npm run sheet's frame for a railway stage (dev/look/sheet.ts): once the seeded railway is in, the camera looks down
// at the track machine from behind and above, where the stage's laid track and the station it last fed are in view.
const { railReady, inspectRailway } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
if (!(await railReady())) throw new Error('sheet-stage: the railway never became ready');
const frame = () => {
  const m = inspectRailway()?.machine;
  if (m) window.__debugCam!.set([m.x + 14, m.y + 11, m.z + 14], [m.x, m.y + 1, m.z], 55);
};
frame();
setInterval(frame, 100);
(window as unknown as { __sheetReady: boolean }).__sheetReady = true;
export {};
