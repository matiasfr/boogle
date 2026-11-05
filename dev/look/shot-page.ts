import type { ShotGroup } from './shot-types.ts';
import type { WarpHandle } from './warp.ts';
import type { paintNative } from './sheet-render.ts';

// Serialized into the existing look/session page. No runtime game import reaches a normal player's graph.
export async function captureShots(group: ShotGroup, paint: typeof paintNative) {
  if (!window.__warp) throw new Error('Shot capture requires the harness clock');
  const warp = window.__warp as WarpHandle;
  const wall = () => warp.read().wall * 1000;
  const started = wall();
  for (const [key, value] of new URLSearchParams(group.query)) {
    if (new URL(location.href).searchParams.get(key) !== value)
      throw new Error(`Requested route setting not effective: ${key}=${value}`);
  }
  if (innerWidth !== group.size[0] || innerHeight !== group.size[1])
    throw new Error('Requested viewport not effective');
  const { renderer, renderFrame, camera, canvas, scene } = (await import(
    '/src/render/scene.ts' as string
  )) as typeof import('../../src/render/scene.ts');
  const graphics = (await import(
    '/src/graphics-settings.ts' as string
  )) as typeof import('../../src/graphics-settings.ts');
  const { tool: looks } = (await import(
    '/src/debug/dev/looks.ts' as string
  )) as typeof import('../../src/debug/dev/looks.ts');
  const { bindings } = (await import(
    '/src/render/water/live.ts' as string
  )) as typeof import('../../src/render/water/live.ts');
  const { qualitySnapshot } = (await import(
    '/src/render/quality.ts' as string
  )) as typeof import('../../src/render/quality.ts');
  warp.pause();
  // Drain the native callback already queued before a compatibility action installed warp.
  await warp.settle(100);
  const internals = renderer as unknown as {
    _nodes: { nodeFrame: { frameId: number; time: number; deltaTime: number } };
    backend: { device: { queue: { onSubmittedWorkDone(): Promise<void> } } };
  };
  const frame = internals._nodes.nodeFrame;
  const originalCompute = renderer.compute;
  let computeDispatches = 0;
  renderer.compute = (...args) => {
    computeDispatches++;
    return originalCompute.apply(renderer, args);
  };
  const beforeScene = scene.onBeforeRender;
  let sceneDraws = 0;
  scene.onBeforeRender = (...args) => {
    sceneDraws++;
    beforeScene.call(scene, ...args);
  };
  const gpuDone = () => internals.backend.device.queue.onSubmittedWorkDone();
  await gpuDone();
  const originalGraphics = graphics.graphicsOverrides();
  const originalLook = looks.snapshot!() as { selected: string; exposure: { locked: boolean } };
  const originalValues = new Map([...bindings].map(([key, binding]) => [key, structuredClone(binding.get())]));
  const baseGraphics = Object.fromEntries(graphics.graphicsSnapshot().map((s) => [s.id, s.effective]));
  const originalCamera = { position: camera.position.clone(), quaternion: camera.quaternion.clone(), fov: camera.fov };
  const player = (await import('/src/player/player.ts' as string)) as typeof import('../../src/player/player.ts');
  const origin = player.me.body?.position;
  const cameras = group.cameras.map((pose) => {
    if (!pose.anchor) return pose;
    if (!origin) throw new Error('Player anchor unavailable');
    return {
      ...pose,
      cam: [pose.cam[0] + origin.x, pose.cam[1] + origin.y, pose.cam[2] + origin.z] as [number, number, number],
      look: [pose.look[0] + origin.x, pose.look[1] + origin.y, pose.look[2] + origin.z] as [number, number, number],
    };
  });
  const limit = 'Frozen stills only: no evidence of motion, GPU cost, load stalls or feel.';
  const emit = (name: string, data: string) => {
    console.log(`SHOTS BEGIN ${name} ${data.length}`);
    for (let i = 0; i < data.length; i += 16000) console.log('SHOTS DATA ' + data.slice(i, i + 16000));
    console.log('SHOTS END');
  };
  const draw = async () => {
    // Advance cache identity, NEVER shader time or game update. Otherwise PassNode reuses a stale scene texture.
    const before = renderer.info.calls;
    const scenesBefore = sceneDraws;
    frame.frameId++;
    frame.deltaTime = 0;
    renderFrame();
    // Copy in the submitting task. WebGPU's composited drawing buffer may be discarded after yielding.
    const image = pixels();
    await gpuDone();
    if (renderer.info.calls <= before) throw new Error('No fresh renderer submission');
    if (sceneDraws <= scenesBefore) throw new Error('Scene pass reused stale pixels');
    return {
      image,
      render: {
        nodeFrame: frame.frameId,
        callsBefore: before,
        callsAfter: renderer.info.calls,
        shaderTime: frame.time,
        scenesBefore,
        scenesAfter: sceneDraws,
      },
    };
  };
  const setCamera = (pose: ShotGroup['cameras'][number]) => {
    window.__debugCam!.set(pose.cam, pose.look, pose.fov ?? 62);
    // Debug camera's lateUpdate cannot run while frozen. Apply its exact pose without dispatching entities.
    camera.position.set(...pose.cam);
    camera.lookAt(...pose.look);
    camera.fov = pose.fov ?? 62;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  };
  const apply = async (variant: ShotGroup['variants'][number]) => {
    for (const [id, value] of originalValues) bindings.get(id)?.set(structuredClone(value));
    const result = await looks.run('select', { id: variant.look ?? originalLook.selected });
    if (!result.ok) throw new Error(result.message);
    // Restore the complete baseline each time, so omitted settings never inherit a previous variant.
    for (const [id, baseline] of Object.entries(baseGraphics)) {
      const value = id === 'meter' ? false : (variant.graphics?.[id] ?? baseline);
      const row = graphics.graphicsSnapshot().find((r) => r.id === id)!;
      if (row.effective !== value) {
        if (row.applyMode === 'reload') throw new Error(`RELOAD REQUIRED: ${id}=${value}`);
        await graphics.setGraphics(id, value);
      }
    }
    for (const [id, value] of Object.entries(variant.values ?? {})) {
      const binding = bindings.get(id);
      if (!binding) throw new Error('Unknown live setting: ' + id);
      binding.set(structuredClone(value));
      if (JSON.stringify(binding.get()) !== JSON.stringify(value)) throw new Error('Setting readback differs: ' + id);
    }
    // Validate after ALL mutations: a live binding may also control a registered graphics owner.
    for (const [id, value] of Object.entries(variant.graphics ?? {})) {
      const row = graphics.graphicsSnapshot().find((r) => r.id === id);
      if (!row || row.error || row.effective !== value || row.pending)
        throw new Error(`Setting not effective: ${id}=${value}`);
    }
  };
  const pixels = () => {
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    const ctx = copy.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(canvas, 0, 0);
    return {
      png: copy.toDataURL('image/png').split(',')[1]!,
      rgba: ctx.getImageData(0, 0, copy.width, copy.height).data,
    };
  };
  const diff = (a: Uint8ClampedArray, b: Uint8ClampedArray) => {
    if (a.length !== b.length) throw new Error('Pixel dimensions differ; separate resolution groups');
    let changed = 0,
      sum = 0,
      max = 0;
    for (let i = 0; i < a.length; i += 4) {
      let pixel = false;
      for (let c = 0; c < 4; c++) {
        const delta = Math.abs(a[i + c]! - b[i + c]!);
        sum += delta;
        max = Math.max(max, delta);
        pixel ||= delta !== 0;
      }
      if (pixel) changed++;
    }
    return { changedPixels: changed, totalPixels: a.length / 4, meanAbsoluteChannel: sum / a.length, maxChannel: max };
  };
  try {
    await looks.run('lock', { locked: true });
    const warmStarted = wall();
    // Warm every camera/variant combination, including optional rebuilt post graphs.
    for (const pose of cameras) {
      setCamera(pose);
      for (const variant of group.variants) {
        await apply(variant);
        await draw();
        await draw();
      }
    }
    const warmMs = wall() - warmStarted;
    const frozen = { pageSeconds: warp.now(), shaderSeconds: frame.time, gameFrames: window.boogle.prof!.last.frames };
    const shots = [];
    const repeats = [];
    for (const [ci, pose] of cameras.entries()) {
      setCamera(pose);
      let first: Uint8ClampedArray | undefined;
      const tiles = [];
      for (const [vi, variant] of group.variants.entries()) {
        const began = wall();
        await apply(variant);
        const { render, image } = await draw();
        first ??= image.rgba;
        const name = `c${ci}-v${vi}.png`;
        emit(name, image.png);
        const difference = diff(first, image.rgba);
        tiles.push({
          label: `${vi + 1}. ${variant.name}`,
          image: 'data:image/png;base64,' + image.png,
          note: `Changed ${difference.changedPixels} px; mean channel delta ${difference.meanAbsoluteChannel.toFixed(3)}`,
        });
        shots.push({
          name,
          camera: pose,
          requested: variant,
          effective: {
            look: looks.snapshot!(),
            graphics: graphics.graphicsSnapshot(),
            quality: qualitySnapshot(),
            width: canvas.width,
            height: canvas.height,
          },
          render,
          difference: diff(first, image.rgba),
          milliseconds: wall() - began,
        });
        const immediate = diff(image.rgba, (await draw()).image.rgba);
        await apply(group.variants[(vi + 1) % group.variants.length]!);
        await draw();
        await apply(variant);
        const returned = diff(image.rgba, (await draw()).image.rgba);
        repeats.push({ name, immediate, returned });
        if (immediate.changedPixels || returned.changedPixels)
          throw new Error(`Frozen pixels changed: ${name} ${JSON.stringify(repeats.at(-1))}`);
      }
      await paint(
        {
          title: `${group.name} / ${pose.name}`,
          subtitle: 'Native pixels; difference against first setting.',
          notices: [limit],
          columns: 1,
          strips: [],
          tiles,
        },
        `board-c${ci}.png`,
      );
    }
    if (
      warp.now() !== frozen.pageSeconds ||
      frame.time !== frozen.shaderSeconds ||
      window.boogle.prof!.last.frames !== frozen.gameFrames
    )
      throw new Error('Frozen clock or game frame advanced');
    if (computeDispatches) throw new Error(`Compute advanced while frozen: ${computeDispatches} dispatches`);
    emit(
      'manifest.json',
      JSON.stringify({
        version: 1,
        limit,
        frozen,
        url: location.href,
        warmMs,
        totalMs: wall() - started,
        shots,
        repeats,
        computeDispatches,
        notFrozen: [
          'Server/socket traffic and asset promises are not paused; use an isolated settled beat. Pixel probes fail on visible drift.',
          'Temporal accumulation effects must supply their own freeze adapter; repeat probes reject history drift.',
        ],
      }),
    );
  } finally {
    renderer.compute = originalCompute;
    scene.onBeforeRender = beforeScene;
    await looks.run('select', { id: originalLook.selected });
    for (const [id, value] of originalValues) bindings.get(id)?.set(value);
    await looks.run('lock', { locked: originalLook.exposure.locked });
    await graphics.restoreGraphics(originalGraphics);
    camera.position.copy(originalCamera.position);
    camera.quaternion.copy(originalCamera.quaternion);
    camera.fov = originalCamera.fov;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const target = originalCamera.position.clone().add(camera.getWorldDirection(originalCamera.position.clone()));
    window.__debugCam!.set(originalCamera.position.toArray(), target.toArray(), originalCamera.fov);
    warp.go(1);
  }
}
