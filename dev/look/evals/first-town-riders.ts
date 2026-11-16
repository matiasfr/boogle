// npm run look -- --rail-seed fares-running --eval dev/look/evals/first-town-riders.ts --until window.__placeDone --query riderShot=pet
// S1/V1 visual proof.
// riderShot=boarding|seated|pet|walk. Eight cosmetic passengers are dressed on a real line-2 car; no mirror writes.
// The logged authoritative count distinguishes this fit proof from the rule tests' real eight-rider boarding.
// For walk, add --action dev/look/evals/first-town-walk.ts --video --seconds 4 so walking starts after warm-up.
const { inspectRailway, rw, train } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { carry } = (await import(
  '/src/physics/platforms.ts' as string
)) as typeof import('../../../src/physics/platforms.ts');
const { sitDown, seatState } = (await import(
  '/src/entities/railway/seat.ts' as string
)) as typeof import('../../../src/entities/railway/seat.ts');
const { wardrobe } = (await import(
  '/src/entities/wardrobe/state.ts' as string
)) as typeof import('../../../src/entities/wardrobe/state.ts');
const { folk } = (await import('/src/place/folk.ts' as string)) as typeof import('../../../src/place/folk.ts');
const { scene, renderer } = (await import(
  '/src/render/scene.ts' as string
)) as typeof import('../../../src/render/scene.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const mode = new URLSearchParams(location.search).get('riderShot') ?? 'boarding';
const reverse = new URLSearchParams(location.search).has('riderReverse');
const overhead = new URLSearchParams(location.search).has('riderOverhead');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const shot = window as Window & { __placeDone?: boolean; __startDeckWalk?: boolean };
background(
  (async () => {
    const limit = performance.now() + 600000;
    let slot = -1;
    while (slot < 0) {
      if (performance.now() > limit) throw new Error('rider proof: no line-2 train at the Village');
      slot =
        [1, 2, 3].find((k) => {
          const r = train(rw(), k);
          return r.phase === 0 && r.at === 0 && r.track === 0;
        }) ?? -1;
      await wait(50);
    }
    const car = inspectRailway()!.line2View.trains[slot]!.cars[1]!;
    const v = me.avatar!.position.clone();
    const fit = scene.getObjectsByProperty('name', 'passenger_car').find((o) => {
      o.getWorldPosition(v);
      return Math.hypot(v.x - car.x, v.z - car.z) < 0.5;
    });
    if (!fit?.parent) throw new Error('rider proof: passenger car frame not found');
    const rock = fit.parent;
    const at = (x: number, y: number, z: number) => {
      rock.updateWorldMatrix(true, false);
      return v.clone().set(x, y, z).applyMatrix4(rock.matrixWorld);
    };
    const dress = () => folk.setRiders(slot, 8, { mesh: rock, top: 0.7 });
    const aim = () => {
      dress();
      const eye = at(
          overhead ? -3.6 : reverse ? -5.4 : 5.4,
          overhead ? 8.5 : reverse ? 6.5 : 5.1,
          overhead ? 3.8 : -6.2,
        ),
        target = at(0, 1.1, 0);
      window.__debugCam?.set([eye.x, eye.y, eye.z], [target.x, target.y, target.z], 42);
    };
    const timer = setInterval(aim, 16);
    if (mode === 'pet') wardrobe()!.grant('critter', { wear: true });
    const p = mode === 'boarding' ? at(2.3, 1.5, 0) : mode === 'walk' ? at(0, 1.6, -1.5) : at(0.75, 1.6, 0.45);
    teleport(me.body!, p.x, p.y, p.z);
    if (mode !== 'boarding') {
      while (carry.on?.id !== car.id) {
        if (performance.now() > limit) throw new Error('rider proof: player never landed on the car');
        await wait(20);
      }
      if (mode !== 'walk') {
        await wait(150);
        sitDown();
        while (!seatState().sitting || seatState().occupants[seatState().sitting!] !== inspectRailway()?.pid) {
          if (performance.now() > limit) throw new Error('rider proof: seat not confirmed');
          await wait(30);
        }
      }
    }
    await wait(400);
    aim();
    console.log(
      `PLAY RIDERS ${JSON.stringify({ mode, slot, authoritative: train(rw(), slot).riders, dressed: 8, seat: seatState(), pet: wardrobe()?.pet(), renderer: renderer.info.render })}`,
    );
    shot.__placeDone = true;
    if (mode === 'walk') {
      // Real walking input, relative to the moving deck. The bench has always been non-solid; report crossings.
      while (!shot.__startDeckWalk) {
        if (performance.now() > limit) throw new Error('rider proof: walk action never started');
        await wait(16);
      }
      const touched = new Set<number>();
      let finish = -1.5;
      const until = performance.now() + 5000;
      while (performance.now() < until) {
        const local = rock.worldToLocal(me.avatar!.position.clone().copy(me.body!.position));
        finish = local.z;
        if (finish >= 1.5) break;
        const goal = at(0, 1, 1.6),
          now = me.body!.position;
        cam.yaw = me.yaw = Math.atan2(-(goal.x - now.x), -(goal.z - now.z));
        input.keys.add('KeyW');
        for (const g of folk.riders)
          if (g.on && g.camp === slot && Math.hypot(g.x - now.x, g.z - now.z) < 0.55) touched.add(g.seat);
        await wait(16);
      }
      input.keys.delete('KeyW');
      console.log(`PLAY DECK WALK ${JSON.stringify({ finish, figureCrossings: [...touched], aboard: carry.on?.id })}`);
    }
    setTimeout(() => clearInterval(timer), 30000);
  })(),
  'first-town rider proof',
);
export {};
