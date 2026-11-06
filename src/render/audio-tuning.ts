// Local authoring levels. Metadata imports create no audio context, renderer or room state.
import { validValue } from '../tunables/spec.ts';

const db = (value: number, min = -40, max = 6) => ({ default: value, min, max, units: 'dB', integer: false });
const number = (value: number, min: number, max: number, units: string, integer = false) => ({
  default: value,
  min,
  max,
  units,
  integer,
});
const fields = {
  musicDb: db(-8),
  ambienceDb: db(-12),
  sfxDb: db(0),
  uiDb: db(-8),
  voiceDb: db(0),
  characterDb: db(0),
  workDb: db(0),
  socialDb: db(-3),
  // Initial output calibration retains the old 0.8 attenuation; this is not a LUFS claim.
  profileDb: db(20 * Math.log10(0.8), -24),
  voicePhraseDb: db(-12, -24),
  uiThunkDb: db(-6, -24),
  pickupDb: db(-4, -24),
  machineThumpDb: db(-6, -24),
  machineWhistleDb: db(-12, -24),
  minisDb: db(-3, -24),
  minisWompDb: db(-3, -24),
  placeImpactDb: db(-3, -24),
  footstepStyle: number(0, 0, 2, '0=A soft, 1=B textured, 2=C toy', true),
  footstepsDb: db(-19, -40, 0),
  runningDb: db(-16, -40, 0),
  jumpDb: db(-15, -40, 0),
  landingDb: db(-13, -40),
  remoteStepsDb: db(-6, -18, 0),
  surfaceGrassDb: db(0, -12),
  surfaceSandDb: db(-1, -12),
  surfaceWoodDb: db(0, -12),
  surfaceRailDb: db(0, -12),
  surfaceWaterDb: db(0, -12),
  landingSoftDb: db(-6, -18, 0),
  landingHeavyDb: db(4, 0),
  stepDistance: number(18, 6, 30, 'm'),
  stepNearDistance: number(1.5, 0, 5, 'm'),
  landingDistance: number(30, 6, 45, 'm'),
  stepMinSpeed: number(0.15, 0.01, 1, 'm/s'),
  landingMinHeight: number(0.2, 0.05, 0.5, 'm'),
  jitterCents: number(35, 0, 80, 'cents'),
  jitterDb: db(1.5, 0, 3),
  stepEventCap: number(8, 4, 12, 'events', true),
  stepEmitterCap: number(2, 1, 2, 'events', true),
  stepIntervalMs: number(110, 60, 300, 'ms'),
  duckMusicDb: db(-9, -18, 0),
  duckAmbienceDb: db(-9, -18, 0),
  duckAttackMs: number(30, 5, 200, 'ms time constant'),
  duckReleaseMs: number(250, 50, 1500, 'ms time constant'),
} as const;
export type AudioSetting = keyof typeof fields;
export const AUDIO_SPECS = Object.entries(fields).map(([key, spec]) => ({
  id: key === 'footstepStyle' ? 'character.footstepStyle' : `audio.${key}`,
  type: 'number' as const,
  scope: 'local' as const,
  ...spec,
  at: 'live buses/phrase level; event recipes use the next trigger',
  owner: 'src/render/audio-tuning.ts',
}));
export const audioSettings = Object.fromEntries(
  Object.entries(fields).map(([key, spec]) => [key, spec.default]),
) as Record<AudioSetting, number>;
const listeners = new Set<(key: AudioSetting, value: number) => void>();
export function audioSettingKey(id: string): AudioSetting | null {
  const key = id === 'character.footstepStyle' ? 'footstepStyle' : id.startsWith('audio.') ? id.slice(6) : '';
  return Object.hasOwn(fields, key) ? (key as AudioSetting) : null;
}
export function setAudioSetting(id: string, value: unknown): boolean {
  const key = audioSettingKey(id);
  if (!key || !validValue(fields[key], value)) return false;
  audioSettings[key] = value;
  for (const listener of listeners) listener(key, value);
  return true;
}
export function resetAudioSettings() {
  for (const spec of AUDIO_SPECS) setAudioSetting(spec.id, spec.default);
}
export function onAudioSettingChange(listener: (key: AudioSetting, value: number) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
