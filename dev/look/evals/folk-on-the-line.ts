// The commuters on line 1's first path while trains run (owner, 14 November: "the little guys seem to walk backwards
// down the rail sometimes"; "the little guys probably shouldn't be on the railroad when there's trains passing by").
// Follows one commuter from 8 m off and prints, every few seconds, how many moving commuters face against
// their motion and how often one stood inside a train car's width.
//   npm run look -- --real --rail-seed trains-on --eval dev/look/evals/folk-on-the-line.ts \
//     --until window.__folkReady --video --seconds 12 --name folk-line --question "..."
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { folk } = (await import('/src/place/folk.ts' as string)) as typeof import('../../../src/place/folk.ts');
const { inspectRailway } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const page = window as Window & { __folkReady?: boolean };
const waitForPass = new URLSearchParams(location.search).get('folkPass') !== '0';
background(
  (async () => {
    const last = new Map<object, { x: number; z: number }>();
    let frames = 0,
      moving = 0,
      backwards = 0,
      struck = 0,
      said = 0;
    // The camera follows one commuter from 8 m off: the one a train is nearest to when the capture starts.
    let followed: (typeof folk.guys)[number] | null = null;
    const sample = (now: number) => {
      if (followed)
        window.__debugCam!.set(
          [followed.x + 6, (followed.fy ?? 0) + 3.2, followed.z + 6],
          [followed.x, (followed.fy ?? 0) + 0.6, followed.z],
          50,
        );
      const cars = (inspectRailway()?.line2View.trains ?? []).flatMap(
        (t: { cars: { x: number; y: number; z: number }[] }) => t.cars.filter((c) => c.y > -30),
      );
      const out = folk.guys.filter((g) => g.on && g.job === 'commuter');
      frames++;
      for (const g of out) {
        const was = last.get(g);
        last.set(g, { x: g.x, z: g.z });
        if (cars.some((c) => Math.hypot(c.x - g.x, c.z - g.z) < 1.5)) struck++;
        if (!was) continue;
        const dx = g.x - was.x,
          dz = g.z - was.z;
        if (Math.hypot(dx, dz) < 0.004) continue;
        moving++;
        if (Math.cos(g.yaw - Math.atan2(dx, dz)) < 0) backwards++;
      }
      // Ready as a moving train comes within 110 m of a commuter, so the capture holds a pass.
      // Ready as a commuter starts to step off the track bed for a train (a lane is at most 1.15 m out), so the capture
      // holds the step, the pass and the walk on; `folkPass=0` in the query starts at once instead.
      if (!followed && out.length && frames > 30) followed = out[0]!;
      const stepping = out.find((g) => Math.abs(g.b.x) > 1.3);
      if (!page.__folkReady && frames > 30 && (stepping || !waitForPass)) {
        followed = stepping ?? followed;
        page.__folkReady = !!followed;
      }
      if (now - said > 3000) {
        said = now;
        console.log(
          `FOLK commuters=${out.length} cars=${cars.length} moving samples=${moving} backwards=${backwards} inside a car=${struck}`,
        );
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  })(),
  'commuters on the line probe',
);
export {};
