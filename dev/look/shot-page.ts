import type { ShotGroup } from './shot-types.ts';
import type { WarpHandle } from './warp.ts';
import type { paintNative } from './sheet-render.ts';

// Serialized into the existing look/session page. No runtime game import reaches a normal player's graph.
export async function captureShots(group: ShotGroup, paint: typeof paintNative) {
  if (!window.__warp) throw new Error('Shot capture requires the harness clock');
  const warp = window.__warp as WarpHandle;
  const wall = () => warp.read().wall * 1000;
  const started = wall();
  const stages = {
    applyFlushMs: 0,
    drawSubmitMs: 0,
    gpuWaitMs: 0,
    copyEncodeMs: 0,
    transferMs: 0,
    compositionMs: 0,
    probesMs: 0,
  };
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
  const { tool: tunables } = (await import(
    '/src/debug/dev/tunables.ts' as string
  )) as typeof import('../../src/debug/dev/tunables.ts');
  const { flushFrozenLighting } = (await import(
    '/src/render/water/frozen-sky.ts' as string
  )) as typeof import('../../src/render/water/frozen-sky.ts');
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
  const baseline = {
    look: looks.snapshot!(),
    graphics: baseGraphics,
    values: Object.fromEntries(originalValues),
    tunables: tunables.snapshot!(),
  };
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
    const began = wall();
    console.log(`SHOTS BEGIN ${name} ${data.length}`);
    for (let i = 0; i < data.length; i += 16000) console.log('SHOTS DATA ' + data.slice(i, i + 16000));
    console.log('SHOTS END');
    stages.transferMs += wall() - began;
  };
  const draw = async (encode = true) => {
    // Advance cache identity, NEVER shader time or game update. Otherwise PassNode reuses a stale scene texture.
    const before = renderer.info.calls;
    const scenesBefore = sceneDraws;
    frame.frameId++;
    frame.deltaTime = 0;
    const began = wall();
    renderFrame();
    stages.drawSubmitMs += wall() - began;
    // Copy in the submitting task. WebGPU's composited drawing buffer may be discarded after yielding.
    const copyBegan = wall();
    const image = pixels(encode);
    stages.copyEncodeMs += wall() - copyBegan;
    const gpuBegan = wall();
    await gpuDone();
    stages.gpuWaitMs += wall() - gpuBegan;
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
    const began = wall();
    for (const [id, value] of Object.entries(variant.tunables ?? {})) {
      const check = await tunables.run('validate', { id, value });
      if (!check.ok) throw new Error(`Tunable ${id}: ${check.message}`);
      const row = (await tunables.run('get', { id })).data as { scope: string };
      if (row.scope !== 'local') throw new Error('Frozen shots allow Local tunables only');
    }
    for (const [id, value] of originalValues)
      if (JSON.stringify(bindings.get(id)?.get()) !== JSON.stringify(value))
        bindings.get(id)?.set(structuredClone(value));
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
    for (const [id, value] of Object.entries(variant.tunables ?? {})) {
      const result = await tunables.run('set', { id, value });
      if (!result.ok) throw new Error(`Tunable ${id}: ${result.message}`);
      const read = await tunables.run('get', { id });
      if (!read.ok || (read.data as { value: number }).value !== value)
        throw new Error('Tunable readback differs: ' + id);
    }
    const lighting = flushFrozenLighting();
    // Validate after ALL mutations: a live binding may also control a registered graphics owner.
    for (const [id, value] of Object.entries(variant.graphics ?? {})) {
      const row = graphics.graphicsSnapshot().find((r) => r.id === id);
      if (!row || row.error || row.effective !== value || row.pending)
        throw new Error(`Setting not effective: ${id}=${value}`);
    }
    stages.applyFlushMs += wall() - began;
    return lighting;
  };
  const pixels = (encode: boolean) => {
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    const ctx = copy.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(canvas, 0, 0);
    return {
      png: encode ? copy.toDataURL('image/png').split(',')[1]! : '',
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
    const cache = window as unknown as { __shotWarm?: Set<string> };
    const warmed = (cache.__shotWarm ??= new Set<string>());
    for (const pose of cameras) {
      setCamera(pose);
      for (const variant of group.variants) {
        const key = JSON.stringify([group.query, group.size, pose, variant]);
        if (warmed.has(key)) continue;
        await apply(variant);
        await draw(false);
        await draw(false);
        if (warmed.size >= 64) warmed.clear();
        warmed.add(key);
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
      let previous:
        { requested: (typeof group.variants)[number]; lighting: ReturnType<typeof flushFrozenLighting> } | undefined;
      for (const [vi, variant] of group.variants.entries()) {
        const began = wall();
        const lighting = await apply(variant);
        for (const [id, field] of [
          ['sky.keyGain', 'key'],
          ['sky.fillGain', 'fill'],
        ] as const) {
          const before = previous?.requested.tunables?.[id],
            after = variant.tunables?.[id];
          if (
            before !== undefined &&
            after !== undefined &&
            before !== after &&
            previous!.lighting[field].intensity === lighting[field].intensity
          )
            throw new Error('Tunable changed but actual light did not: ' + id);
        }
        previous = { requested: variant, lighting };
        const { render, image } = await draw();
        first ??= image.rgba;
        const cell = variant.cell ?? vi + 1;
        const name = `c${ci}-v${cell - 1}.png`;
        emit(name, image.png);
        tiles.push({
          label: group.wedge ? String(cell) : `${cell}. ${variant.name}`,
          image: 'data:image/png;base64,' + image.png,
          note: group.wedge
            ? undefined
            : `${Object.entries({ look: variant.look, ...variant.tunables, ...variant.values, ...variant.graphics })
                .map(([id, value]) => `${id} = ${JSON.stringify(value)}`)
                .join('; ')} | ${name}`,
        });
        shots.push({
          cell,
          name,
          camera: pose,
          requested: variant,
          effective: {
            tunables: tunables.snapshot!(),
            values: Object.fromEntries([...bindings].map(([id, b]) => [id, structuredClone(b.get())])),
            lighting,
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
        const probeBegan = wall();
        const immediate = diff(image.rgba, (await draw(false)).image.rgba);
        await apply(group.variants[(vi + 1) % group.variants.length]!);
        await draw(false);
        await apply(variant);
        const returned = diff(image.rgba, (await draw(false)).image.rgba);
        stages.probesMs += wall() - probeBegan;
        repeats.push({ name, immediate, returned });
        if (immediate.changedPixels || returned.changedPixels)
          throw new Error(`Frozen pixels changed: ${name} ${JSON.stringify(repeats.at(-1))}`);
      }
      const composeBegan = wall();
      await paint(
        {
          title: `${group.name} / ${pose.name}`,
          subtitle: 'Native pixels; exact requested settings. Full effective state in manifest.json.',
          notices: [limit],
          columns: 1,
          strips: [],
          tiles,
          grid:
            group.wedge && tiles.length === 9
              ? {
                  rows: group.wedge.rows.values.map((v) => `${group.wedge!.rows.label} ${v}`),
                  columns: group.wedge.columns.values.map((v) => `${group.wedge!.columns.label} ${v}`),
                  baseline: '5',
                  legend: group.wedge.legend,
                }
              : undefined,
          reference: group.reference && {
            label: 'Reference: ' + group.reference.provenance,
            image: group.reference.image,
            note: group.reference.sha256,
          },
        },
        `board-c${ci}.png`,
      );
      stages.compositionMs += wall() - composeBegan;
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
        stages,
        baseline,
        wedge: group.wedge,
        reference: group.reference && { ...group.reference, image: undefined },
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
    for (const [id, value] of originalValues)
      if (JSON.stringify(bindings.get(id)?.get()) !== JSON.stringify(value)) bindings.get(id)?.set(value);
    flushFrozenLighting();
    await looks.run('lock', { locked: originalLook.exposure.locked });
    await graphics.restoreGraphics(originalGraphics);
    camera.position.copy(originalCamera.position);
    camera.quaternion.copy(originalCamera.quaternion);
    camera.fov = originalCamera.fov;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const target = originalCamera.position.clone().add(camera.getWorldDirection(originalCamera.position.clone()));
    window.__debugCam!.set(originalCamera.position.toArray(), target.toArray(), originalCamera.fov);
    if (!group.keepPaused) warp.go(1);
  }
}
