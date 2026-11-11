// A device test link (docs/plans/remote-device-tests.md) is prepared before the page reads its room: `?device=new` gets
// a fresh run id (so one link can sit on a board or in a bookmark), and an address with no `room` is sent to a fresh
// private jump room (`from=q6-done`, ./jump-in.ts) with `prof=1&profui=0` (GPU timestamps and frame timing, no overlay), so the test never enters the shared world. Once
// jump-in has put `room` in the address, a reload finds it and seeds nothing twice. A damaged link seeds nothing: the
// panel says so. Loaded by ./index.ts only when the address has `device`.
/** The seed the bench's heaviest poses need (the pier and Far Head exist from Q6 on). */
const SEED = 'q6-done';

export async function prepareDevice() {
  const { makeRunId, parseDeviceLink } = await import('../debug/device/id.ts');
  const url = new URL(location.href);
  const link = parseDeviceLink(url.search);
  if (link.kind === 'none' || link.kind === 'damaged') return;
  if (link.kind === 'new') {
    url.searchParams.set('device', makeRunId());
    url.searchParams.set('mint', 'page');
  }
  if (!url.searchParams.has('room') && !url.searchParams.has('from')) url.searchParams.set('from', SEED);
  if (!url.searchParams.has('prof')) url.searchParams.set('prof', '1');
  // No play session of its own: the page's ordinary playdata recorder would upload a second, unmarked session that
  // looks like someone playing (and holds a WORLD_NS release).
  url.searchParams.set('notrack', '1');
  if (!url.searchParams.has('profui')) url.searchParams.set('profui', '0'); // the timing hooks, not the panel
  history.replaceState(history.state, '', url);
}
