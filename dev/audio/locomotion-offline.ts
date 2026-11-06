// Matched audition from the production recipe; v1 is an offline-only source snapshot, never an old build.
const { renderLocomotionSound } = (await import(
  '/src/render/locomotion-sound.ts' as string
)) as typeof import('../../src/render/locomotion-sound.ts');
const { renderLocomotionSound: v1 } = (await import(
  '/dev/audio/locomotion-v1.ts' as string
)) as typeof import('./locomotion-v1.ts');
const { audioSettings: S, resetAudioSettings } = (await import(
  '/src/render/audio-tuning.ts' as string
)) as typeof import('../../src/render/audio-tuning.ts');
const { emitOfflineWav } = (await import('/dev/audio/offline-wav.ts' as string)) as typeof import('./offline-wav.ts');
resetAudioSettings();
const surfaces = ['grass', 'sand', 'wood', 'rail', 'water'] as const;
const styles = ['A', 'B', 'C', 'v1'] as const;
const kinds = ['walk', 'run', 'jump'] as const;
const surfaceKeys = ['surfaceGrassDb', 'surfaceSandDb', 'surfaceWoodDb', 'surfaceRailDb', 'surfaceWaterDb'] as const;
const db = (n: number) => 10 ** (n / 20);
console.log(
  'AUDIOCATALOG ' +
    JSON.stringify({
      expected: surfaces.length * kinds.length * styles.length,
      cues: ['walk', 'run', 'jump+land'],
      styles,
      seeds: surfaces.map((_, i) => Array.from({ length: 6 }, (_, take) => 0x5b00 + take * 173 + i * 7919)),
      takes: [0, 1, 2, 3, 4, 5],
    }),
);
for (const [styleIndex, style] of styles.entries()) {
  const render = style === 'v1' ? v1 : renderLocomotionSound;
  const settings = style === 'v1' ? { ...S, footstepsDb: -8, runningDb: -5, jumpDb: -11, landingDb: -4 } : { ...S };
  settings.footstepStyle = styleIndex;
  for (const [surfaceIndex, surface] of surfaces.entries()) {
    for (const kind of kinds) {
      const seconds = kind === 'jump' ? 10 : kind === 'walk' ? 4 : 2.5;
      const ctx = new OfflineAudioContext(1, Math.ceil(48000 * seconds), 48000);
      const base = settings.sfxDb + settings.characterDb + settings[surfaceKeys[surfaceIndex]!];
      const gainKey = kind === 'walk' ? 'footstepsDb' : kind === 'run' ? 'runningDb' : 'jumpDb';
      const trim = base + settings[gainKey];
      let end = 0;
      for (let take = 0; take < 6; take++) {
        const interval = kind === 'jump' ? 1.5 : kind === 'walk' ? 0.55 : 0.32;
        const pitch = 2 ** ((((take - 2.5) / 2.5) * settings.jitterCents) / 1200);
        const jitter = (take % 2 ? 1 : -1) * settings.jitterDb * 0.7;
        const at = 0.1 + take * interval;
        end = Math.max(
          end,
          render(ctx, ctx.destination, {
            surface,
            kind,
            take,
            pitch,
            style: styleIndex,
            gain: db(trim + jitter),
            at,
          }).end,
        );
        if (kind === 'jump')
          end = Math.max(
            end,
            render(ctx, ctx.destination, {
              surface,
              kind: 'land',
              take,
              pitch,
              style: styleIndex,
              gain: db(base + settings.landingDb + jitter),
              at: at + 0.65,
            }).end,
          );
      }
      if (end > seconds) throw new Error(`Truncated ${style} ${surface} ${kind}: ${end}>${seconds}`);
      emitOfflineWav(await ctx.startRendering(), {
        id: `${style}/${surface}-${kind === 'jump' ? 'jump+land' : kind}`,
        surface,
        kind,
        style,
        description:
          kind === 'jump'
            ? 'Six takeoffs followed by normal landing at +650ms'
            : 'Six procedural variants at an illustrative fixed cadence',
        authoredDb: trim,
        takes: 6,
        scheduled: end,
        sources: kind === 'jump' ? 12 : 6,
        settings,
        tap: 'authored character/SFX sum; before compressor/master; mono',
      });
    }
  }
}
export {};
