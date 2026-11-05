// Existing debug delivery fills the active bill, then actual feed/lay code runs unchanged.
const place = window.__place as { skipDelivery(): void; coop: { skip(name: string, fn: () => void): void } };
if (new URLSearchParams(location.search).get('wheelMotion') === '1') {
  const { machine } = (await import(
    '/src/proto/place/lines.ts' as string
  )) as typeof import('../../../src/proto/place/lines.ts');
  const { run } = (await import(
    '/src/proto/place/run.ts' as string
  )) as typeof import('../../../src/proto/place/run.ts');
  const radius = 0.13;
  const started = performance.now();
  let previous = machine.look.wheelState();
  let positions = [machine.loco.mesh.position.clone(), machine.flatbed.mesh.position.clone()];
  let moved = false,
    stopped = 0,
    samples = 0,
    error = 0,
    displacementError = 0,
    rigidError = 0,
    stationaryAngle = 0;
  const beats = new Set<string>();
  const sample = () => {
    const at = (performance.now() - started) / 1000;
    const states = machine.look.wheelState();
    const cars = [machine.loco, machine.flatbed];
    const rows = states.map((s, i) => {
      const prior = previous[i]!;
      const displacement = cars[i]!.mesh.position.distanceTo(positions[i]!);
      for (let j = 0; j < 4; j++) {
        const pivot = cars[i]!.mesh.getObjectByName(`${i === 0 ? 'power' : 'deck'}_wheel_${j}-axle`)!;
        const scale = pivot.getWorldScale(positions[i]!.clone());
        rigidError = Math.max(rigidError, Math.abs(scale.x - 1), Math.abs(scale.y - 1), Math.abs(scale.z - 1));
      }
      const angle = s.angles[0]! - prior.angles[0]!;
      error = Math.max(error, Math.abs(angle * radius - (s.distance - prior.distance)));
      displacementError = Math.max(displacementError, Math.abs(Math.abs(angle * radius) - displacement));
      if (displacement < 1e-8) stationaryAngle = Math.max(stationaryAngle, Math.abs(angle));
      if (s.angles.length !== 4 || s.angles.some((a) => Math.abs(a - s.angles[0]!) > 1e-8))
        throw new Error('Bogie axle phases/count disagree');
      return { body: i, displacement, distance: s.distance, angle: s.angles[0], y: cars[i]!.mesh.position.y };
    });
    const moving = rows.some((r) => r.displacement > 1e-5);
    moved ||= moving;
    stopped = moved && !moving ? stopped + 1 : 0;
    const beat = !moved ? 'parked' : moving ? (run.departT < 2 ? 'pull-away' : 'cruise') : 'stop';
    if (!beats.has(beat)) {
      beats.add(beat);
      console.log('WHEEL BEAT ' + JSON.stringify({ at, beat, mode: run.mode, rows }));
    }
    if (samples++ % 6 === 0) console.log('WHEEL SAMPLE ' + JSON.stringify({ at, beat, rows }));
    previous = states;
    positions = cars.map((c) => c.mesh.position.clone());
    if (stopped > 60) {
      if (
        !beats.has('pull-away') ||
        !beats.has('cruise') ||
        error > 1e-8 ||
        displacementError > 1e-6 ||
        rigidError > 1e-6 ||
        stationaryAngle > 1e-8
      )
        throw new Error('Wheel travel/stop contract failed');
      console.log(
        'WHEEL VERIFIED ' +
          JSON.stringify({ samples, radius, error, displacementError, rigidError, stationaryAngle, beats: [...beats] }),
      );
      return;
    } else if (at > 22) {
      throw new Error('Wheel run did not reach a verified stop');
    }
    requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
}
if (new URLSearchParams(location.search).get('coop') === '1') place.coop.skip('delivery', place.skipDelivery);
else place.skipDelivery();
export {};
