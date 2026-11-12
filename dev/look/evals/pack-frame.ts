// command: unknown, needs the rail seed and pose: derived from the file, queries are packCam=back|side|three, packLoad=0|8|16, packSubject=me|remote (two pages for remote), packOn, and ride=1&seat=1&railStop=T1%20seated for the seated pack; no doc or bot calls it
// Buddy's carry frame (the railway's shared pack) on a back, framed close. The railway's own seams stand in for the
// world state: backSeam.pack says the pack is open, backSeam.count the logs on every back (&packLoad=0|8|16).
//   &packCam=back|side|three  &packSubject=me|remote (two pages: player 1 looks at player 2)
// Seated on the track layer: &ride=1&seat=1&railStop=T1%20seated (the played route; the camera follows the rider).
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { backSeam } = (await import(
  '/src/player/haul-back.ts' as string
)) as typeof import('../../../src/player/haul-back.ts');
const { remotes } = (await import('/src/netplay/net.ts' as string)) as typeof import('../../../src/netplay/net.ts');
const { inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const q = new URLSearchParams(location.search);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const shot = window as Window & { __railStop?: string; __placeDone?: boolean };
const load = Number(q.get('packLoad') ?? 16);
const packOn = q.get('packOn') !== '0';
const onceMounted = async () => {
  while (!backSeam.carry || !inspectRailway() || !me.entered || !me.avatar) await wait(100);
  backSeam.count = () => load;
  backSeam.pack = () => packOn;
};
const hideNotes = () => {
  for (const panel of document.querySelectorAll<HTMLDivElement>('body > div'))
    if (panel.style.zIndex === '9999' && panel.style.whiteSpace === 'pre') panel.style.display = 'none';
};
const subject = () =>
  q.get('packSubject') === 'remote' ? [...remotes.values()].find((r) => r.avatar && r.entered)?.avatar : me.avatar;
if (q.get('railStop')) {
  const { play } = (await import('/dev/look/bots/railway.ts' as string)) as typeof import('../bots/railway.ts');
  background(onceMounted(), 'pack seams');
  background(play(), 'seated track-layer ride');
  background(
    (async () => {
      while (!shot.__railStop) await wait(100);
      window.__debugCam!.clear();
      cam.yaw = me.yaw + (q.get('packCam') === 'side' ? 1.57 : 1.9);
      hideNotes();
      await wait(1500);
      shot.__placeDone = true;
    })(),
    'frame the seated rider',
  );
} else {
  background(
    (async () => {
      await onceMounted();
      await wait(q.get('packSubject') === 'remote' ? 6000 : 2500);
      const a = subject();
      if (!a) throw new Error('No subject avatar');
      hideNotes();
      const frame = setInterval(() => {
        a.updateMatrixWorld();
        const p = a.getWorldPosition(new (a.position.constructor as typeof import('three').Vector3)());
        const back = a.getWorldDirection(new (a.position.constructor as typeof import('three').Vector3)());
        const side = { x: -back.z, z: back.x };
        const k = q.get('packCam') ?? 'back';
        const d = 4.4;
        const [dx, dz] =
          k === 'back'
            ? [back.x * d, back.z * d]
            : k === 'side'
              ? [side.x * d, side.z * d]
              : [back.x * d * 0.72 + side.x * d * 0.72, back.z * d * 0.72 + side.z * d * 0.72];
        window.__debugCam!.set([p.x + dx, p.y + 0.95, p.z + dz], [p.x, p.y + 0.8, p.z], 35);
      }, 50);
      await wait(1800);
      void frame;
      console.log(`PACK ${JSON.stringify(inspectRailway()?.reward.tools.packFramesWorn)} frames worn`);
      shot.__placeDone = true;
    })(),
    'frame the carry frame',
  );
}
export {};
