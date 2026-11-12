// npm run look -- --real --warm 0 --eval dev/look/evals/phone-entry.ts --name phone-entry
//  (queries avatarHold=1, avatarFailure=1, releaseBuddy=1 pick the case)
// needs: node .look/see-client.ts look --production (the worker-owned production proxy; Mac Chromium, not Safari)
// Existing broker eval and worker-owned production proxy; Mac Chromium, not iPhone Safari.
const { renderer } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
const { gpuDone } = (await import(
  '/src/render/precompile.ts' as string
)) as typeof import('../../../src/render/precompile.ts');
const outerLoop = renderer.getAnimationLoop();
await renderer.setAnimationLoop(null);
await gpuDone();
const failure = new URLSearchParams(location.search).has('avatarFailure');
const held = new URLSearchParams(location.search).has('avatarHold');
const release = new URLSearchParams(location.search).has('releaseBuddy');
for (const delay of failure || held ? [false] : [false, true]) {
  localStorage.setItem('boogle.name', 'Returning phone');
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;inset:0;width:440px;height:796px;border:0;z-index:2147483647';
  frame.src =
    '/?phoneStartup=1&startup=1&sw=0' +
    (held ? '' : '&notrack=1') +
    '&room=phone-' +
    Date.now() +
    (delay ? '&avatarDelay=1' : '') +
    (failure ? '&avatarFailure=1' : '') +
    (held ? '&avatarHold=1' : '');
  document.body.append(frame);
  const end = performance.now() + 70000;
  while (!frame.contentWindow?.performance.getEntriesByName('boot:interactive').length) {
    if (frame.contentDocument?.body.innerText.includes("couldn't load"))
      throw new Error('Phone boot failed: ' + JSON.stringify(frame.contentWindow?.__startup?.snapshot().errors));
    if (performance.now() > end) throw new Error('Phone entry timed out');
    await new Promise((r) => setTimeout(r, 100));
  }
  const child = frame.contentWindow!;
  if (held) {
    const avatar = child.boogle!.me.avatar!;
    const enteredAt = child.performance.getEntriesByName('boot:interactive')[0]!.startTime;
    const startedAt = child.performance.getEntriesByName('boot:buddy-wait')[0]!.startTime;
    const waitMs = enteredAt - startedAt;
    console.log(
      'PHONE deadline state ' +
        JSON.stringify({
          waitMs,
          enteredAt,
          entered: child.boogle!.me.entered,
          capsule: avatar.userData.inner.children[0]!.visible,
          assets: child.performance.getEntriesByName('boot:buddy-assets'),
          deadline: child.performance.getEntriesByName('boot:buddy-deadline'),
        }),
    );
    if (
      !child.boogle!.me.entered ||
      !avatar.userData.inner.children[0]!.visible ||
      child.performance.getEntriesByName('boot:buddy-assets').length ||
      waitMs < 44000 ||
      waitMs > 65000
    )
      throw new Error('Held Buddy did not escape into play near the loading deadline');
    console.log('PHONE deadline ' + JSON.stringify({ waitMs, enteredAt, pendingAssets: true, capsule: true }));
    if (release) {
      const response = await fetch('/__buddy_release');
      const result = (await response.json()) as { released: number };
      if (result.released !== 1) throw new Error('Expected exactly one pending Buddy request');
      const until = performance.now() + 15000;
      while (avatar.userData.inner.children[0]!.visible) {
        if (performance.now() > until) throw new Error('Released Buddy did not replace capsule');
        await new Promise((r) => setTimeout(r, 100));
      }
      await new Promise((r) => setTimeout(r, 2000));
      const dressedRoots = avatar.userData.inner.children.filter((root) => {
        let skinned = false;
        root.traverse((o) => {
          if ((o as { isSkinnedMesh?: boolean }).isSkinnedMesh) skinned = true;
        });
        return skinned;
      }).length;
      if (child.boogle!.me.avatar !== avatar || dressedRoots !== 1)
        throw new Error('Late Buddy replaced the avatar or dressed it more than once');
      console.log('PHONE recovered ' + JSON.stringify({ sameAvatar: true, dressedRoots, ...result }));
    }
  }
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
  await new Promise((r) => setTimeout(r, held ? 2000 : 20500));
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
  if (!delay && !failure && !held) frame.remove();
}
await renderer.setAnimationLoop(outerLoop);
export {};
