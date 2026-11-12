// driven by: npm run sheet (dev/look/sheet.ts supplies this as --eval with --rail-seed <stage>)
// npm run sheet's frame for a railway stage (dev/look/sheet.ts): once the seeded railway is in, the camera looks down
// at the track machine from behind and above, where the stage's laid track and the station it last fed are in view.
// From Q7 on the machine is out of the scene (line2-view.ts `stowed`): the camera frames the player's landing instead.
const { railReady, inspectRailway } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
if (!(await railReady())) throw new Error('sheet-stage: the railway never became ready');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const frame = () => {
  const machine = inspectRailway()?.machine;
  const m = machine && machine.y > -30 ? machine : me.body?.position;
  if (m) window.__debugCam!.set([m.x + 14, m.y + 11, m.z + 14], [m.x, m.y + 1, m.z], 55);
};
frame();
setInterval(frame, 100);
(window as unknown as { __sheetReady: boolean }).__sheetReady = true;
export {};
