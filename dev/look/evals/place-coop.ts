// Two players exploring: --query 'proto=place&coop=1' --players 2 --real --eval dev/look/evals/place-coop.ts
// --until window.__placeExplore?.done --warm 90. The place-exploring scenario also opens a fresh third profile.
// Add &railway=1 for the original railway observation below, or &deposits=1 for the conservation check.
// Does the new job stay together: a wake, a deposit from the follower, a chest opened by the follower (the rung is everyone's),
// a skip to trains, and a train called from a platform. Each says what it sees; read the COOP lines side by side.
const q = new URLSearchParams(location.search);
const who = q.get('player');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const place = window.__place as any;
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const until = async (ready: () => boolean, what: string, ms = 10000) => {
  const end = performance.now() + ms;
  while (!ready()) {
    if (performance.now() >= end) throw new Error(`COOP ${who} timed out: ${what}`);
    await wait(100);
  }
};
const say = (what: string) => {
  const st = place.stationOf(place.lines[0]);
  const t = place.lines[1].train.tr;
  console.log(
    `COOP ${who} ${what}: authority ${place.coop.debug().amAuthority}, others ${window.boogle.remotes.size}, awake ${place.job.awake}, mode ${place.run.mode}, T ${st?.have.logs ?? '-'}, rung ${JSON.stringify(place.job.rung)}, chest ${place.job.chest}, $${place.job.score.money}, felled ${place.TREES.filter((x: { fall: number }) => x.fall >= 0).length}, train2 s ${t.s.toFixed(1)} target ${t.target} stop ${t.stop}`,
  );
};
const put = (x: number, z: number, up = 1.4) => {
  teleport(me.body!, x, place.H(x, z) + up, z);
  me.body!.velocity.set(0, 0, 0);
};
if (q.has('beam')) {
  const { net } = await import('/src/netplay/net.ts' as string);
  const { BEAM, beamEnd, beamPad, pair } = await import('/src/proto/place/pair.ts' as string);
  const { pressJump, releaseJump } = await import('/src/entities/player/state.ts' as string);
  const { makeBot } = await import('/dev/look/bot.ts' as string);
  const { input } = await import('/src/player/input.ts' as string);
  const hands = await import('/src/player/hands.ts' as string);
  const bot = makeBot();
  const marks = new Set<string>();
  net.room.onMessage((m: { t: string; k: string; ack?: boolean }) => {
    if (m.t !== 'beamProbe') return;
    marks.add(m.k);
    if (!m.ack) net.room.send({ t: 'beamProbe', k: m.k, ack: true });
  });
  const barrier = async (k: string) => {
    net.room.send({ t: 'beamProbe', k });
    const retry = setInterval(() => net.room.send({ t: 'beamProbe', k }), 200);
    try {
      await until(() => marks.has(k), k, 30000);
    } finally {
      clearInterval(retry);
    }
  };
  const press = async (verb: string) => {
    await until(() => hands.interactTarget()?.verb === verb, `${verb} offered`);
    hands.interactDown();
    hands.interactUp();
  };
  const end = who === '1' ? 0 : 1;
  setInterval(() => {
    const b = place.job.longBeam;
    window.__debugCam?.set([b.x + 14, place.H(b.x, b.z) + 9, b.z + 14], [b.x, place.H(b.x, b.z) + 0.8, b.z]);
  }, 30);
  void (async () => {
    await until(() => place.coop.debug().peers.length > 0, 'partner arrived');
    await barrier('ready');
    await wait(1500); // the initial authority snapshot must precede the skip
    if (who === '1') place.coop.skip('path', place.skipPath);
    await until(() => place.job.awake && place.lines[0].open, 'path opened');
    await wait(1200);
    const at = beamEnd(end);
    put(at.x, at.z);
    await wait(600);
    await barrier('at ends');
    const before = { ...place.job.longBeam };
    if (who === '2') await press('Lift');
    await wait(800);
    if (place.job.longBeam.x !== before.x || place.job.longBeam.z !== before.z)
      throw new Error('Lone lift moved the beam');
    console.log(`COOP ${who} lone grip ${pair.grip()} unmoved ${place.job.longBeam.x},${place.job.longBeam.z}`);
    if (q.get('beam') === 'lone') {
      Object.assign(window, { __coopDone: true });
      return;
    }
    if (who === '1') await press('Lift');
    await until(() => pair.carrying(), 'both carrying');
    await barrier('carrying');
    input.sprint = true;
    input.keys.add('ShiftLeft');
    await bot.walk(at.x + 20, at.z, 0.7);
    input.keys.delete('ShiftLeft');
    await barrier('walked');
    if (!pair.carrying() || place.job.longBeam.x < before.x + 15 || me.sprint)
      throw new Error('Beam carry or walking-only check failed');
    console.log(`COOP ${who} carried beam ${JSON.stringify(place.job.longBeam)} sprint ${me.sprint}`);
    if (q.get('beam') === 'carry') {
      Object.assign(window, { __coopDone: true });
      return;
    }
    if (q.get('beam') === 'leave') {
      if (who === '2') {
        // A departure fixture combines both Owner fields; Lift itself still requires an empty shoulder.
        place.job.boiler = 2;
        place.shoulder('boiler');
        place.coop.big('boiler');
      }
      await until(() => place.job.boiler === 2, 'boiler shouldered');
      await wait(1200);
      await barrier('leaving');
      const beforeDrop = { ...place.job.longBeam };
      if (who === '2') {
        net.room.onMessage((m: { t: string; k: string }) => {
          if (m.t === 'beamProbe' && m.k === 'depart') location.href = 'about:blank';
        });
        Object.assign(window, { __coopDone: true });
        return;
      }
      Object.assign(window, { __coopDone: true, __placeAct: () => void depart() });
      async function depart() {
        net.room.send({ t: 'beamProbe', k: 'depart' });
        await until(
          () => place.job.boiler === 1 && !pair.carrying(),
          'partner departure returned boiler and dropped beam',
          15000,
        );
        if (
          pair.grip() !== 0 ||
          Math.hypot(place.job.longBeam.x - beforeDrop.x, place.job.longBeam.z - beforeDrop.z) > 0.5
        )
          throw new Error('Departure lost the surviving grip or beam position');
        console.log(
          `COOP 1 departure boiler ${place.job.boiler} beam at rest ${!pair.carrying()} grip ${pair.grip()} at ${JSON.stringify(place.job.longBeam)}`,
        );
        await press('Let go');
        await wait(200);
        await press('Lift');
        console.log(`COOP 1 departure Lift still usable ${pair.grip() !== null}`);
      }
      return;
    }
    put(place.ORIGIN.x + BEAM.site.x, BEAM.site.z + ((end === 0 ? -1 : 1) * BEAM.len) / 2);
    await until(() => place.job.longBeam.set && pair.grip() === null, 'beam set');
    console.log(`COOP ${who} beam set ${JSON.stringify(place.job.longBeam)}`);
    if (q.get('beam') === 'bounce') {
      const p = beamPad(end);
      put(p.x, p.z, 1.4);
      await wait(1000);
      await barrier('on pads');
      // Both pages observe the exchange; the primary action starts it after video and curves start.
      Object.assign(window, {
        __placeAct: () => {
          pressJump();
          setTimeout(releaseJump, 450);
        },
      });
      let peak = me.body!.position.y;
      const watch = setInterval(() => {
        peak = Math.max(peak, me.body!.position.y);
      }, 20);
      net.room.onMessage((m: { t: string; k: string; end?: number }) => {
        if (m.t === 'placeCoop' && m.k === 'beamBounce') console.log(`COOP ${who} bounce end ${m.end}`);
      });
      setTimeout(() => {
        clearInterval(watch);
        console.log(`COOP ${who} seesaw peak y ${peak.toFixed(2)} rise ${(peak - place.H(p.x, p.z)).toFixed(2)}`);
        if (peak - place.H(p.x, p.z) < 4) throw new Error(`COOP ${who} was not launched`);
      }, 6500);
    }
    Object.assign(window, { __coopDone: true });
  })();
} else if (q.has('auto')) {
  // Existing co-op fixture, now exercising the automatic path and its stock contract.
  const { net, onRemotePresence } = await import('/src/netplay/net.ts' as string);
  const { cart, cartHere, cartPlatform, snapCart, automaticRails } = await import(
    '/src/proto/place/depot.ts' as string
  );
  const { captureShared, applyShared } = await import('/src/proto/place/job.ts' as string);
  const { snapRun } = await import('/src/proto/place/run.ts' as string);
  const { snapForge } = await import('/src/proto/place/forge.ts' as string);
  const { cam } = await import('/src/player/player.ts' as string);
  const hands = await import('/src/player/hands.ts' as string);
  const mode = q.get('auto');
  let picked = 0,
    sawLegacy = false;
  net.room.onMessage((m: { t: string; rails?: number }) => {
    if (m.t === 'cartProbe' && m.rails === 16) picked = m.rails;
  });
  if (mode === 'legacy') {
    // Model a missing capability on the wire, without altering production code or its registration.
    const presence = net.room.presence.bind(net.room);
    net.room.presence = (p: Record<string, unknown>) => {
      // Room.presence takes a patch: omission retains an earlier advertised value; null actually deletes it.
      return presence({ ...p, placeRailCart: null });
    };
    onRemotePresence((_r: unknown, pr: Record<string, unknown>) => {
      if (typeof pr.placeCoop === 'number') sawLegacy = !('placeRailCart' in pr);
    });
  }
  const setup = () => {
    place.skipQ5();
    place.lines[1].stage = place.lines[1].stations.findIndex((s: { spec: { id: string } }) => s.spec.id === 'Q4');
    const st = place.lines[1].stations[place.lines[1].stage];
    if (mode === 'rails') st.have.logs = st.need('logs');
    if (mode === 'dry') place.forge.rails = 0;
    snapRun();
    snapForge();
    snapCart();
  };
  place.coop.skips({ autoQ4: setup });
  const standByRack = () => {
    const r = place.rack;
    // Outside the log cradle, opposite the rail shelf; face the actual pickup point.
    const x = r.x - Math.cos(r.yaw) * 2.4,
      z = r.z + Math.sin(r.yaw) * 2.4;
    put(x, z, 0.8);
    cam.yaw = me.yaw = Math.atan2(x - r.x, z - r.z);
  };
  let showCart = mode === 'load';
  setInterval(() => {
    if (showCart) {
      const p = cartHere(),
        y = cartPlatform.body.position.y;
      window.__debugCam?.set([p.x + 6, y + 4, p.z + 8], [p.x, y + 1, p.z]);
    } else {
      const r = place.rack;
      window.__debugCam?.set([r.x + 6, r.y + 4.5, r.z + 7], [r.x, r.y + 0.8, r.z]);
    }
  }, 30);
  void (async () => {
    await until(() => place.coop.debug().peers.length > 0, 'partner arrived');
    await wait(2500);
    if (who === '1') place.coop.skip('autoQ4', setup);
    await until(() => place.activeFrame()?.spec.id === 'Q4' && place.rack.on, 'Q4 active');
    await wait(1200); // finish the forced skip snapshot before positioning the observers
    const r = place.rack;
    standByRack();
    if (mode === 'legacy') {
      await until(() => sawLegacy, 'remote presence lacks rail capability');
      await until(() => !automaticRails(), 'legacy capability disables auto');
      await until(() => r.logs === 16, 'legacy logs delivered', 90000);
      if (r.rails || cart.rails) throw new Error('Legacy room received automatic rails');
      console.log(`COOP ${who} legacy capability absent ${sawLegacy}, fallback logs ${r.logs} rails ${r.rails}`);
    } else {
      await until(() => automaticRails(), 'all peers support auto');
      const dry =
        mode === 'dry'
          ? setInterval(() => {
              place.forge.rails = 0;
              place.forge.pour = -1000;
            }, 20)
          : undefined;
      await until(() => cart.leg === 'forge' && cart.auto, 'automatic forge stop', 60000);
      if (dry !== undefined) {
        await wait(10000); // longer than the legacy empty-cart timeout
        if (cart.leg !== 'forge' || cart.rails !== 0) throw new Error('Dry forge did not hold shipment');
        clearInterval(dry);
        place.forge.pour = 0;
        console.log(`COOP ${who} dry forge waited 10s, rails ${cart.rails}`);
      }
      await until(() => cart.leg === 'out' && cart.rails === 16, '16 real forge rails loaded', 30000);
      if (place.forge.rails < 0 || cart.load !== (mode === 'rails' ? 0 : 16)) throw new Error('Invalid mixed load');
      console.log(`COOP ${who} automatic load logs ${cart.load} rails ${cart.rails} forge ${place.forge.rails}`);
      if (mode === 'load') {
        Object.assign(window, { __coopDone: true });
        return;
      }
      showCart = false;
      if (mode === 'reconcile') {
        await until(
          () => cart.leg === 'drop' && cart.rails === 0 && captureShared().depot.rails === 16,
          'unload reserved',
          60000,
        );
        if (place.coop.follower()) {
          applyShared(captureShared()); // settle reservations, leaving the old cosmetic flights alive
          standByRack(); // a fixture relocation, before the authority's rail flights land
          await until(() => hands.interactTarget()?.verb === 'Take from the rack', 'corrected rack pickup', 1000);
          console.log(`COOP ${who} corrected pickup at ${JSON.stringify(me.body!.position)} rack ${r.x},${r.z}`);
          hands.interactDown();
          hands.interactUp();
          await until(() => place.back.rails === 16 && place.back.incoming === 0, 'corrected rails on back');
          picked = place.back.rails;
          net.room.send({ t: 'cartProbe', rails: picked });
        }
        await until(() => picked === 16, 'partner picked corrected rails');
        await wait(4000);
        if (r.rails !== 0 || captureShared().depot.rails !== 0)
          throw new Error('A stale unload duplicated picked rails');
        console.log(`COOP ${who} corrected pickup conserved ${picked} rails, rack ${r.rails}`);
      } else {
        await until(() => r.rails === 16, '16 rails stacked at frontier', 60000);
        await wait(1500);
        if (r.logs !== (mode === 'rails' ? 0 : 16) || r.rails !== 16) throw new Error('Frontier stacks disagree');
        console.log(`COOP ${who} frontier logs ${r.logs} rails ${r.rails}`);
      }
    }
    Object.assign(window, { __coopDone: true });
  })();
} else if (q.has('pair')) {
  const rider = who === (q.get('rider') ?? '2');
  const { remotes, net, onRemotePresence } = await import('/src/netplay/net.ts' as string);
  let sawLegacyRide = false;
  if (q.has('legacyRide')) {
    const presence = net.room.presence.bind(net.room);
    net.room.presence = (p: Record<string, unknown>) => presence({ ...p, placeCartRide: null });
    onRemotePresence((_r: unknown, pr: Record<string, unknown>) => {
      if (typeof pr.placeCoop === 'number') sawLegacyRide = !('placeCartRide' in pr);
    });
  }
  const { cart, cartHere, cartPlatform, snapCart } = await import('/src/proto/place/depot.ts' as string);
  const { snapRun } = await import('/src/proto/place/run.ts' as string);
  const { TX, TY, TZ } = await import('/src/proto/place/lines.ts' as string);
  const { carry } = await import('/src/physics/platforms.ts' as string);
  const hands = await import('/src/player/hands.ts' as string);
  const { cam } = await import('/src/player/player.ts' as string);
  const setup = () => {
    place.skipLine2();
    place.lines[1].stage = 1;
    place.job.rung.depot = true;
    place.rack.logs = place.rack.rails = 0;
    snapRun();
    snapCart();
  };
  place.coop.skips({ pairQ2: setup });
  const press = (verb: string) => {
    const t = hands.interactTarget();
    if (t?.verb !== verb) throw new Error(`COOP ${who} expected ${verb}, got ${t?.verb}`);
    hands.interactDown();
    hands.interactUp();
    console.log(`COOP ${who} verb ${verb}`);
  };
  setInterval(() => {
    const p = cartHere();
    window.__debugCam?.set([p.x + 9, TY + 7, p.z + 12], [p.x, TY + 1, p.z]);
  }, 30);
  void (async () => {
    await until(() => place.coop.debug().peers.length > 0, 'partner arrived');
    await wait(2500);
    if (who === '1') place.coop.skip('pairQ2', setup);
    await until(() => place.activeFrame()?.spec.id === 'Q2' && place.rack.on && place.job.rung.depot, 'Q2 active');
    await wait(1000); // let the forced skip snapshot finish before positioning either player
    put(TX + (rider ? 2 : 8), TZ + 1);
    cam.yaw = -Math.PI / 2;
    await wait(800);
    if (rider) {
      await until(() => hands.interactTarget()?.verb === 'Whistle for the cart', 'call offered');
      press('Whistle for the cart');
    }
    await until(() => cart.leg === 'forge', 'cart at forge', 60000);
    if (rider) {
      press('Load the cart');
      const p = cartPlatform.body.position;
      teleport(me.body!, p.x, p.y + cartPlatform.top + 0.8, p.z);
      me.body!.velocity.set(0, 0, 0);
    }
    await until(() => cart.rails === 12, '12 rails loaded');
    console.log(`COOP ${who} cart rails ${cart.rails}`);
    if (q.get('pair') === 'load') {
      Object.assign(window, { __coopDone: true });
      return;
    }
    if (q.has('tripVideo')) Object.assign(window, { __coopDone: true });
    await until(() => cart.leg === 'out', 'cart departing');
    await wait(700);
    if (rider && carry.on !== cartPlatform) throw new Error('COOP rider left cart');
    if (!rider) {
      await until(
        () =>
          [...remotes.values()].some(
            (r: { ride?: { id: string; on: boolean } }) => r.ride?.id === 'place:cart' && r.ride.on,
          ),
        'partner riding our cart',
      );
    }
    console.log(`COOP ${who} rider on cart`);
    if (q.get('pair') === 'ride') {
      Object.assign(window, { __coopDone: true });
      if (!q.has('tripVideo')) return;
    }
    let samples = 0;
    let lostRide = 0;
    let maxRelativeVy = 0;
    let maxSpeed = 0;
    let maxSpin = 0;
    let maxGap = 0;
    let maxSpeedGap = 0;
    let comparisons = 0;
    net.room.onMessage((m: { t: string; d: number; speed: number; leg: string }) => {
      if (m.t !== 'rideProbe' || m.leg !== cart.leg) return;
      maxGap = Math.max(maxGap, Math.abs(m.d - cart.d));
      maxSpeedGap = Math.max(maxSpeedGap, Math.abs(m.speed - cart.speed));
      comparisons++;
    });
    const probe = setInterval(() => {
      samples++;
      if (rider && carry.on !== cartPlatform) lostRide++;
      if (rider) maxRelativeVy = Math.max(maxRelativeVy, Math.abs(me.body!.velocity.y - carry.y));
      maxSpeed = Math.max(maxSpeed, cart.speed);
      maxSpin = Math.max(maxSpin, Math.abs(cartPlatform.body.angularVelocity.y));
      net.room.send({ t: 'rideProbe', d: cart.d, speed: cart.speed, leg: cart.leg });
    }, 20);
    await until(() => place.rack.rails === 12, '12 rails on far rack', 60000);
    clearInterval(probe);
    console.log(
      `COOP ${who} trip ${JSON.stringify({ samples, lostRide, maxRelativeVy, maxSpeed, maxSpin, maxGap, maxSpeedGap, comparisons })}`,
    );
    if (lostRide || maxSpin > 2.01 || maxGap > 3 || maxSpeedGap > 2.5 || !comparisons)
      throw new Error('COOP whole-trip rider, turn or shared position failed');
    if (q.has('legacyRide') && (!sawLegacyRide || maxSpeed > 9.01))
      throw new Error('COOP legacy capability failed to keep 9 m/s');
    console.log(`COOP ${who} rack rails ${place.rack.rails}`);
    const r = place.rack;
    setInterval(() => window.__debugCam?.set([r.x + 10, r.y + 8, r.z + 10], [r.x, r.y + 1, r.z]), 30);
    Object.assign(window, { __coopDone: true });
  })();
} else if (q.has('deposits')) {
  const { net } = (await import('/src/netplay/net.ts' as string)) as typeof import('../../../src/netplay/net.ts');
  const { cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
  const st = place.stationOf(place.lines[0]);
  const started = performance.now();
  let go = false;
  let otherBack = 0;
  const trace = (m: Record<string, unknown>) =>
    console.log(`COOP wire ${who} ${Math.round(performance.now() - started)} ${JSON.stringify(m)}`);
  net.room!.onMessage((raw) => {
    const m = raw as Record<string, unknown>;
    if (m.t === 'coopProbe' && m.k === 'ready' && who === '1') go = true;
    if (m.t === 'coopProbe' && m.k === 'go' && who === '2') go = true;
    if (m.t === 'coopProbe' && m.k === 'back') otherBack = Number(m.n);
    if (q.has('trace') && m.t === 'placeCoop' && ['dep', 'stock', 'no'].includes(String(m.k))) trace(m);
  });
  void (async () => {
    while (!me.body || !net.room || place.coop.debug().peers.length < 1) await wait(100);
    put(st.x + 10, st.z + 5);
    cam.yaw = 0.5;
    place.back.logs = 0;
    if (who === '1') place.wake();
    await wait(5000);
    console.log(`COOP baseline ${who} back ${place.back.logs} frame ${st.have.logs} coming ${st.coming.logs}`);
    if (place.back.logs || st.have.logs || st.coming.logs)
      throw new Error('Conservation check needs an empty baseline');
    if (who === '2') net.room!.send({ t: 'coopProbe', k: 'ready' });
    while (!go) await wait(50);
    if (who === '1') {
      await wait(1500);
      net.room!.send({ t: 'coopProbe', k: 'go' });
      const until = performance.now() + 5000;
      while (performance.now() < until) {
        /* stalled authority */
      }
    } else {
      place.back.logs = 8;
      put(st.x + 2.5, st.z + 1);
      await wait(1500);
      put(st.x + 10, st.z + 5); // refunds cannot be deposited again before measurement
    }
    await wait(10000);
    net.room!.send({ t: 'coopProbe', k: 'back', n: place.back.logs });
    await wait(5000);
    const total = place.back.logs + otherBack + st.have.logs;
    console.log(
      `COOP conserved ${total} player ${who} back ${place.back.logs} other ${otherBack} frame ${st.have.logs} coming ${st.coming.logs}`,
    );
    if (total !== 8 || st.coming.logs !== 0) throw new Error(`Expected 8 settled logs, got ${total}`);
    put(st.x + 5, st.z + 5);
    Object.assign(window, { __coopDone: true });
  })();
} else if (!q.has('railway')) {
  const { explore } = await import('/dev/look/evals/place-exploring.ts' as string);
  void explore(who);
} else {
  while (!me.body) await wait(100);
  if (who === '2') {
    const { snapGifts } = (await import(
      '/src/proto/place/gifts.ts' as string
    )) as typeof import('../../../src/proto/place/gifts.ts');
    snapGifts(['hat', 'scarf', 'overalls'], 0, [], { hat: 'hat', accessory: 'scarf', outfit: 'overalls' });
    put(903, 14);
  } else put(900, 14);
  console.log(`COOP clothing view ground ${place.H(903, 14)}`);
  await wait(4000);
  await (async () => {
    say('start');
    if (who === '1') place.wake();
    await wait(5000);
    say('after the wake');
    if (who === '2') {
      const st = place.stationOf(place.lines[0]);
      place.back.logs = 8;
      put(st.x + 2.5, st.z + 1);
    }
    await wait(12000); // the tabs start some seconds apart
    await until(() => place.stationOf(place.lines[0])?.have.logs === 8, 'follower deposit reached this page');
    say('after the follower deposited 8');
    await wait(2000); // keep the observed deposit visible before the authority advances the shared job
    if (who === '1') place.skipPath();
    await wait(3000);
    await until(
      () => place.run.mode === 'waiting' && (place.job.chest === 'axe' || place.job.rung.axe === 1),
      'first path and chest arrived',
    );
    say('after a skip to the first path');
    if (who === '2') {
      const c = place.giftState.crates()[0];
      if (c) {
        put(c.x + 2, c.z);
        place.openCrate(c);
      } else throw new Error(`COOP ${who} NO CHEST HERE`);
    }
    await wait(4000);
    await until(() => place.job.rung.axe === 1, 'follower chest upgrade arrived');
    say('after the follower opened the chest');
    if (who === '1') place.skipTrains();
    await wait(4000);
    await until(
      () =>
        place.job.rung.trains &&
        place.run.mode === 'idle' &&
        place.lines.every((l: { train: { clockRunning: () => boolean } }) => l.train.clockRunning()),
      'trains started on this page',
    );
    say('after a skip to trains');
    if (who === '2') {
      const h = place.halts[3];
      teleport(me.body!, h.x, h.y + 1.2, h.z);
      me.body!.velocity.set(0, 0, 0);
    }
    await wait(5000);
    say('after the follower stood on the quarry platform');
    await wait(4000);
    say('a bit later');
    const minutes = Number(q.get('coopMinutes') ?? 0);
    if (!Number.isFinite(minutes) || minutes < 0) throw new Error('coopMinutes must be finite and nonnegative');
    for (let elapsed = 0; elapsed < minutes * 60; elapsed += 30) {
      await wait(30000);
      say(`trains +${elapsed + 30}s`);
    }
  })();
}
export {};
