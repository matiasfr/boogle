// Existing broker eval and worker-owned production proxy; Mac Chromium, not iPhone Safari.
const { renderer } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
const { gpuDone } = (await import(
  '/src/render/precompile.ts' as string
)) as typeof import('../../../src/render/precompile.ts');
const outerLoop = renderer.getAnimationLoop();
await renderer.setAnimationLoop(null);
await gpuDone();
const failure = new URLSearchParams(location.search).has('avatarFailure');
for (const delay of failure ? [false] : [false, true]) {
  localStorage.setItem('boogle.name', 'Returning phone');
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;inset:0;width:440px;height:796px;border:0;z-index:2147483647';
  frame.src =
    '/?phoneStartup=1&startup=1&notrack=1&sw=0&room=phone-' +
    Date.now() +
    (delay ? '&avatarDelay=1' : '') +
    (failure ? '&avatarFailure=1' : '');
  document.body.append(frame);
  const end = performance.now() + 70000;
  while (!frame.contentWindow?.performance.getEntriesByName('boot:interactive').length) {
    if (frame.contentDocument?.body.innerText.includes("couldn't load"))
      throw new Error('Phone boot failed: ' + JSON.stringify(frame.contentWindow?.__startup?.snapshot().errors));
    if (performance.now() > end) throw new Error('Phone entry timed out');
    await new Promise((r) => setTimeout(r, 100));
  }
  const child = frame.contentWindow!;
  console.log(
    'PHONE entry ' +
      JSON.stringify({
        delay,
        failure,
        touch: child.document.body.classList.contains('touch'),
        entered: child.boogle?.me.entered,
        dpr: child.document.querySelector<HTMLCanvasElement>('#view')!.width / 440,
        boot: child.boogle?.boot,
      }),
  );
  await new Promise((r) => setTimeout(r, 20500));
  child.__startup!.stop();
  console.log('PHONE timeline ' + JSON.stringify({ delay, ...child.__startup!.snapshot() }));
  console.log(
    'PHONE avatar ' +
      JSON.stringify({
        delay,
        children: child.boogle?.me.avatar?.userData.inner.children.map((o) => ({
          type: o.type,
          visible: o.visible,
          name: o.name,
        })),
        prof: child.boogle?.prof?.table(),
      }),
  );
  if (!delay && !failure) frame.remove();
}
await renderer.setAnimationLoop(outerLoop);
export {};
