// Existing look action: real feed/lay code, with synchronous restore and accepted-event assertions.
// --query 'proto=place&machineView=panel&panelRestore=1' --action this-file
import type * as THREE from 'three/webgpu';
const { run, snapRun } = (await import(
  '/src/proto/place/run.ts' as string
)) as typeof import('../../../src/proto/place/run.ts');
const { lines, machine } = (await import(
  '/src/proto/place/lines.ts' as string
)) as typeof import('../../../src/proto/place/lines.ts');
const { captureShared, applyShared } = (await import(
  '/src/proto/place/job.ts' as string
)) as typeof import('../../../src/proto/place/job.ts');
const { coopWire } = (await import(
  '/src/proto/place/coop.ts' as string
)) as typeof import('../../../src/proto/place/coop.ts');
const { clearTrips } = (await import(
  '/src/proto/place/pieces.ts' as string
)) as typeof import('../../../src/proto/place/pieces.ts');
const q = new URLSearchParams(location.search);
const assert = (ok: boolean, message: string) => {
  if (!ok) throw new Error('PANEL CONTRACT: ' + message);
};
let restored = false,
  commits = 0,
  oldCursor = run.line.track.cursor,
  oldRack = run.rack;
let oldMode = run.mode,
  frames = 0,
  finished = false;
const started = performance.now();
const read = () => ({
  head: run.head,
  rack: run.rack,
  mode: run.mode,
  cursors: lines.map((l) => l.track.cursor),
  frontiers: lines.map((l) => l.track.head),
  colliders: lines.map((l) => l.track.solids.filter((s) => !!s.on).length),
});
const vector = (o: THREE.Object3D) => o.position.toArray();
const frame = () => {
  const l = run.line,
    t = l.track,
    next = t.panels[t.cursor];
  const phase = next ? (t.u(run.head) - next.from) / (next.to - next.from) : 0;
  if (run.mode === 'laying') {
    const frontier = t.cursor ? t.panels[t.cursor - 1]!.to : t.panels[0]!.from;
    assert(Math.abs(t.head - frontier) < 1e-7, 'frontier is not a whole panel');
    assert(
      t.solids.every((s) => !!s.on === s.u <= frontier),
      'collider visibility differs from frontier',
    );
    if (t.cursor !== oldCursor && oldMode === 'laying') {
      assert(run.rack === oldRack - (t.cursor - oldCursor), 'stock is not one per commit');
      commits += t.cursor - oldCursor;
      console.log('PANEL CONTACT ' + JSON.stringify(read()));
    }
    if (q.get('panelRestore') === '1' && !restored && phase > 0.55 && phase < 0.8 && t.cursor > 0) {
      const before = read(),
        shared = JSON.parse(JSON.stringify(captureShared()));
      clearTrips();
      applyShared(shared);
      snapRun();
      assert(JSON.stringify(read()) === JSON.stringify(before), 'mid-cycle snapshot restore changed state');
      coopWire.panelCommit?.(l.k, l.stage, t.cursor - 1);
      assert(JSON.stringify(read()) === JSON.stringify(before), 'duplicate accepted event spent stock');
      const future = t.panels.findIndex((p) => p.stage > l.stage);
      if (future >= 0) coopWire.panelCommit?.(l.k, l.stage, future);
      assert(JSON.stringify(read()) === JSON.stringify(before), 'cross-stage event committed track');
      restored = true;
      console.log('PANEL RESTORE VERIFIED ' + JSON.stringify(read()));
    }
  }
  if (frames++ % 10 === 0) {
    const rig = machine.look.panelRig;
    console.log(
      'PANEL SAMPLE ' +
        JSON.stringify({
          at: (performance.now() - started) / 1000,
          phase,
          ...read(),
          trolley: vector(rig.trolley),
          hoist: rig.sleeves.map(vector),
          jaws: rig.jaws.map(vector),
          wheels: machine.look.wheelState(),
        }),
    );
  }
  if (!finished && oldMode === 'laying' && run.mode !== 'laying') {
    finished = true;
    assert(t.head === t.panels[t.cursor - 1]!.to, 'closure frontier differs');
    if (q.get('panelRestore') === '1') assert(restored, 'restore beat missed');
    console.log('PANEL VERIFIED ' + JSON.stringify({ commits: commits + t.cursor - oldCursor, restored, ...read() }));
  }
  oldCursor = t.cursor;
  oldRack = run.rack;
  oldMode = run.mode;
  if (!finished && performance.now() - started < 60000) requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
if (q.get('machineView') === 'normal') window.__debugCam!.clear();
const place = window.__place as { skipDelivery(): void; coop: { skip(name: string, fn: () => void): void } };
if (q.get('coop') === '1') place.coop.skip('delivery', place.skipDelivery);
else place.skipDelivery();
export {};
