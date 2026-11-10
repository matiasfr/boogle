// Focused Local HUD evidence through the existing broker. Inventory fixtures are staged;
// drops use mouse/touch handlers or the real pad polling path, harvest and deposit use gameplay.
// --query 'proto=place&shot=forge&carry=mixed' --eval this file --action carry-tag-act.ts --hud
await import('/dev/look/evals/place-job.ts' as string);
const { back, TREES, shoulder, setTrunkTaken, reserveHarvest, releaseHarvest } = (await import(
  '/src/proto/place/chop.ts' as string
)) as typeof import('../../../src/proto/place/chop.ts');
const { job } = (await import('/src/proto/place/job.ts' as string)) as typeof import('../../../src/proto/place/job.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { input } = (await import(
  '/src/player/input-state.ts' as string
)) as typeof import('../../../src/player/input-state.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { H } = (await import('/src/proto/place/land.ts' as string)) as typeof import('../../../src/proto/place/land.ts');
const { forgeFrame } = (await import(
  '/src/proto/place/lines.ts' as string
)) as typeof import('../../../src/proto/place/lines.ts');
const { interactDown, interactUp } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { pauseNavigation } = (await import(
  '/src/player/pause-pages.ts' as string
)) as typeof import('../../../src/player/pause-pages.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { backSeam } = (await import(
  '/src/features/haul-stack.ts' as string
)) as typeof import('../../../src/features/haul-stack.ts');
const mode = new URLSearchParams(location.search).get('carry') ?? 'mixed';
if (mode === 'touch' || innerWidth < 600) document.body.classList.add('touch');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const put = (x: number, z: number, yaw = 0) => {
  teleport(me.body!, x, H(x, z) + 1.2, z);
  me.body!.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = yaw;
};
const empty = () => {
  back.logs = back.rails = back.stone = back.incoming = back.beam = 0;
  back.big = null;
};
empty();
job.chest = null;
job.rung.pack = 1;
job.rung.axe = 1;
const tree = TREES.find((t) => t.index >= 29 && !t.hardwood && t.fall < 0)!;
if (mode === 'gather' || mode === 'single' || mode === 'blocked' || mode === 'reduced') {
  job.rung.pack = mode === 'gather' || mode === 'reduced' ? 1 : 0;
  put(tree.x + 2.3, tree.z + 0.7, Math.atan2(2.3, 0.7));
  cam.yaw += 1.2; // keep the adjacent trunk out of the harvest view
}
setTimeout(() => window.__debugCam!.clear(), 700);
if (mode === 'sky' || mode === 'sand') {
  setTimeout(() => {
    // The real low shore has sand; look out over the sea for an unobstructed sky.
    const x = 788;
    const z = 20;
    put(x, z);
    const y = H(x, z);
    window.__debugCam!.set(
      [x + (mode === 'sand' ? 0 : 6), y + (mode === 'sand' ? 10 : 0.7), z + (mode === 'sand' ? 6 : 0)],
      [x, y + 1.3, z],
      62,
    );
  }, 800);
}
// Exercise the exact CSS preference branch; OS preference emulation is not exposed by this broker.
if (mode === 'reduced') document.querySelector<HTMLElement>('.carry-tag')!.style.setProperty('--carry-motion', '0');
const slotRead = () =>
  [...document.querySelectorAll<HTMLElement>('.carry-slot')].map((s) => s.dataset.material ?? 'empty');
const read = (label: string) => {
  const tag = document.querySelector<HTMLElement>('.carry-tag')!;
  const rect = tag.getBoundingClientRect();
  console.log(
    `CARRY ${label} ${JSON.stringify({
      logs: back.logs,
      rails: back.rails,
      stone: back.stone,
      big: back.big,
      text: tag.innerText,
      opacity: Number(tag.style.opacity),
      placement: tag.dataset.placement,
      rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      inside: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
      oldChip: !!document.querySelector('.haul-chip'),
      touch: document.body.classList.contains('touch'),
      slots: slotRead(),
      animations: tag.getAnimations({ subtree: true }).length,
      body: me.body?.interpolatedPosition,
      avatar: me.avatar?.position,
    })}`,
  );
};
const act = async () => {
  const started = performance.now();
  let frame = 0;
  let sampling = true;
  const sample = () => {
    if (!sampling) return;
    const tag = document.querySelector<HTMLElement>('.carry-tag')!;
    console.log(
      `CARRY frame ${JSON.stringify({
        frame: frame++,
        ms: Math.round(performance.now() - started),
        load: backSeam.carry?.(),
        slots: slotRead(),
        x: tag.offsetLeft,
        y: tag.offsetTop,
        w: tag.offsetWidth,
        h: tag.offsetHeight,
        opacity: tag.style.opacity,
        scales: [...tag.querySelectorAll('.carry-slot')].map((s) => getComputedStyle(s).transform),
      })}`,
    );
    requestAnimationFrame(sample);
  };
  if (['gather', 'single', 'reduced', 'pending', 'capacity'].includes(mode)) requestAnimationFrame(sample);
  if (mode === 'gather' || mode === 'single' || mode === 'blocked' || mode === 'reduced') {
    if (mode === 'blocked') back.logs = 8;
    if (mode === 'single') back.logs = 7;
    await wait(650); // separate the fixture's initial fill from the real stroke
    for (let k = 0; k < (mode === 'single' ? 1 : 4); k++) {
      interactDown();
      interactUp();
      await wait(700);
      read(`stroke-${k + 1}`);
    }
    input.keys.add('KeyS');
    await wait(3000);
    input.keys.delete('KeyS');
    read('walking-faded');
  } else if (['grass', 'sand', 'sky', 'noframe', 'capacity'].includes(mode)) {
    job.rung.pack = mode === 'noframe' || mode === 'capacity' ? 0 : 1;
    back.logs = 3;
    back.rails = 2;
    back.stone = 1;
    await wait(650);
    read('part-full');
    if (slotRead().length !== (job.rung.pack ? 16 : 8)) throw new Error('Wrong slot capacity');
    if (mode === 'capacity') {
      job.rung.pack = 1;
      await wait(650);
      read('frame-added');
      if (slotRead().length !== 16) throw new Error('Frame did not add eight slots');
    }
  } else if (mode === 'deposit') {
    back.logs = 8;
    back.rails = 4;
    back.stone = 4;
    // Walk into the real frame's deposit radius from the same approach as the before still.
    input.keys.add('KeyW');
    await wait(700);
    input.keys.delete('KeyW');
    await wait(3300);
    read('retained-mixed');
    if (back.logs >= 8) throw new Error('Carry fixture did not reach the receiving frame');
  } else if (mode === 'mouse' || mode === 'pad' || mode === 'touch') {
    back.logs = 10;
    back.rails = 5;
    back.stone = 1;
    await wait(2600); // the old pickup tag has faded; Drop must reveal it again.
    if (mode === 'mouse')
      document.querySelector('canvas')!.dispatchEvent(new MouseEvent('mousedown', { button: 2, bubbles: true }));
    if (mode === 'touch') {
      const button = document.querySelector('.place-drop-btn')!;
      button.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }));
      button.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', bubbles: true }));
    }
    if (mode === 'pad') {
      const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
      const pad = {
        id: 'Xbox 360 Controller (carry evidence)',
        index: 0,
        connected: true,
        mapping: 'standard',
        axes: [0, 0, 0, 0],
        buttons,
        timestamp: performance.now(),
      };
      Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
      dispatchEvent(new Event('focus')); // the game's discovery listener scans the emulated pad
      await wait(300);
      buttons[11] = { pressed: true, touched: true, value: 1 };
      await wait(200);
      buttons[11] = { pressed: false, touched: false, value: 0 };
    }
    await wait(100);
    read(`${mode}-drop`);
    if (back.rails !== 4) throw new Error(`${mode} Drop did not remove exactly one rail`);
    await wait(2400);
    read('faded');
  } else if (mode === 'beam' || mode === 'boiler') {
    setTrunkTaken(true);
    job.boiler = 2;
    shoulder(mode);
    await wait(200);
    read(mode);
    input.keys.add('KeyS');
    await wait(1700);
    input.keys.delete('KeyS');
  } else if (mode === 'clamp') {
    back.logs = 8;
    const p = me.body!.position;
    const x = p.x,
      y = p.y,
      z = p.z;
    const views: [number[], number[]][] = [
      [
        [x, y + 0.5, z + 1],
        [x, y + 0.5, z],
      ], // camera close to/inside load envelope
      [
        [x + 5, y + 2, z + 4],
        [x - 4, y + 1, z],
      ], // Buddy near the right edge
      [
        [x - 5, y + 2, z + 4],
        [x + 4, y + 1, z],
      ], // Buddy near the left edge
      [
        [x, y + 1, z - 8],
        [x, y + 1, z - 15],
      ], // Buddy behind camera
      [
        [forgeFrame.x - 8, y + 2, forgeFrame.z + 7],
        [x, y + 1, z],
      ], // scaffold/wall between view and Buddy
    ];
    for (let k = 0; k < views.length; k++) {
      const [pos, look] = views[k]!;
      window.__debugCam!.set(pos as [number, number, number], look as [number, number, number], 62);
      back.logs++;
      await wait(600);
      read(`clamp-${k}`);
      const r = document.querySelector('.carry-tag')!.getBoundingClientRect();
      if (r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight)
        throw new Error(`Tag outside viewport at clamp ${k}`);
    }
  } else if (mode === 'pending') {
    back.logs = 8;
    back.incoming = 4;
    reserveHarvest(4);
    await wait(700);
    read('pending');
    back.incoming = 0;
    back.rails = 4;
    releaseHarvest(4);
    back.logs += 4;
    await wait(700);
    read('accepted');
  } else {
    if (mode === 'rails') back.rails = 16;
    else if (mode === 'stone') back.stone = 16;
    else {
      back.logs = 10;
      back.rails = mode === 'mixed2' ? 6 : 5;
      back.stone = mode === 'mixed2' ? 0 : 1;
    }
    await wait(350);
    await wait(300); // allow the explicit slot cascade to settle
    read('visible');
    if (
      mode === 'mixed' &&
      slotRead().join(',') !== [...Array<string>(10).fill('logs'), ...Array<string>(5).fill('rails'), 'stone'].join(',')
    )
      throw new Error('Mixed slots differ from accepted contents');
    if (mode === 'pause') {
      pauseNavigation.open?.('options');
      await wait(300);
      const exact = document.querySelector<HTMLElement>('.carry-pause');
      if (!exact?.isConnected || !exact.innerText.includes('10 logs · 5 rails · 1 stone'))
        throw new Error('Pause omitted exact cargo');
    } else {
      input.keys.add('KeyS');
      await wait(3000);
      input.keys.delete('KeyS');
      read('walking-faded');
    }
  }
  sampling = false;
  read('end');
};
(window as unknown as { __carryAct: () => void }).__carryAct = () => background(act(), 'carry tag evidence');
// Keep the fixture tied to the actual receiving frame, for evidence readbacks.
console.log(`CARRY setup ${mode} frame ${forgeFrame.spec.id}`);
export {};
