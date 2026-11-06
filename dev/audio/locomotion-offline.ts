// A listening sheet from the production recipe, not a substitute for live Buddy cadence / support evidence.
const { renderLocomotionSound } = (await import(
  '/src/render/locomotion-sound.ts' as string
)) as typeof import('../../src/render/locomotion-sound.ts');
const { audioSettings: S } = (await import(
  '/src/render/audio-tuning.ts' as string
)) as typeof import('../../src/render/audio-tuning.ts');
const { emitOfflineWav } = (await import('/dev/audio/offline-wav.ts' as string)) as typeof import('./offline-wav.ts');
const surfaces = ['grass', 'sand', 'wood', 'rail', 'water'] as const;
const kinds = ['walk', 'run', 'jump', 'land'] as const;
const surfaceKeys = ['surfaceGrassDb', 'surfaceSandDb', 'surfaceWoodDb', 'surfaceRailDb', 'surfaceWaterDb'] as const;
const db = (n: number) => 10 ** (n / 20);
console.log(
  'AUDIOCATALOG ' +
    JSON.stringify({
      expected: surfaces.length * (kinds.length + 1),
      cues: kinds,
      seeds: [],
      takes: [0, 1, 2, 3, 4, 5],
    }),
);
for (const [surfaceIndex, surface] of surfaces.entries()) {
  // Six unit-gain contacts prove the source reference separately from the authored mix previews.
  const source = new OfflineAudioContext(1, 48000 * 2, 48000);
  for (let take = 0; take < 6; take++)
    renderLocomotionSound(source, source.destination, { surface, kind: 'walk', take, at: 0.02 + take * 0.3 });
  emitOfflineWav(await source.startRendering(), {
    id: `${surface}-source`,
    surface,
    description: 'Six source variants, unit gain, no mixer.',
    takes: 6,
    authoredDb: 0,
    scheduled: 1.7,
    sources: 6,
  });
  for (const kind of kinds) {
    const seconds = kind === 'jump' ? 10 : kind === 'land' ? 5 : kind === 'walk' ? 4 : 2.5;
    const ctx = new OfflineAudioContext(1, Math.ceil(48000 * seconds), 48000);
    const base = S.sfxDb + S.characterDb + S[surfaceKeys[surfaceIndex]!];
    const gainKey =
      kind === 'walk' ? 'footstepsDb' : kind === 'run' ? 'runningDb' : kind === 'jump' ? 'jumpDb' : 'landingDb';
    const trim = base + S[gainKey];
    let end = 0;
    for (let take = 0; take < 6; take++) {
      const interval = kind === 'jump' ? 1.5 : kind === 'land' ? 0.7 : kind === 'walk' ? 0.55 : 0.32;
      const pitch = 2 ** ((((take - 2.5) / 2.5) * S.jitterCents) / 1200);
      const jitter = (take % 2 ? 1 : -1) * S.jitterDb * 0.7;
      const impact =
        kind === 'land'
          ? [S.landingSoftDb, S.landingSoftDb / 2, 0, S.landingHeavyDb / 2, S.landingHeavyDb, S.landingHeavyDb][take]!
          : 0;
      const at = 0.1 + take * interval;
      end = Math.max(
        end,
        renderLocomotionSound(ctx, ctx.destination, {
          surface,
          kind,
          take,
          pitch,
          gain: db(trim + jitter + impact),
          at,
        }).end,
      );
      if (kind === 'jump')
        end = Math.max(
          end,
          renderLocomotionSound(ctx, ctx.destination, {
            surface,
            kind: 'land',
            take,
            pitch,
            gain: db(base + S.landingDb + jitter),
            at: at + 0.65,
          }).end,
        );
    }
    if (end > seconds) throw new Error(`Truncated ${surface} ${kind}: ${end}>${seconds}`);
    emitOfflineWav(await ctx.startRendering(), {
      id: `${surface}-${kind}`,
      surface,
      kind,
      description:
        kind === 'jump'
          ? 'Six takeoffs followed by normal landing at +650ms'
          : kind === 'land'
            ? 'Six impacts: soft to normal to capped heavy'
            : 'Six procedural variants at an illustrative fixed cadence',
      authoredDb: trim,
      takes: 6,
      scheduled: end,
      sources: kind === 'jump' ? 12 : 6,
      settings: { ...S },
      tap: 'authored character/SFX sum; before compressor/master; mono',
    });
  }
}
export {};
