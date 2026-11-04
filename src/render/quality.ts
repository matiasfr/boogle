// One Local authority for scene resolution and output cadence. No frame hook or renderer import/cycle.
import type { WebGPURenderer } from 'three/webgpu';
import { registerGraphics, type GraphicsValue } from '../graphics-settings.ts';

export const MAX_DPR = Math.min(devicePixelRatio, 2);
export const FIXED_DPR = new URLSearchParams(location.search).get('dpr') === 'fixed';
let adaptiveRatio = 1,
  waterCeiling = 1,
  resolution: GraphicsValue = 'auto',
  renderCap: GraphicsValue = 'display';
let nextRender = 0;
let update = () => {};
export function setAdaptiveResolution(ratio: number) {
  adaptiveRatio = Math.min(1, Math.max(0.6, ratio));
  update();
}
export function setWaterResolution(ceiling: number) {
  waterCeiling = Math.min(1, Math.max(0.25, ceiling));
  update();
}
export const qualitySnapshot = () => ({
  adaptiveRatio,
  waterCeiling,
  resolution,
  renderCap,
  scale: Math.min(typeof resolution === 'number' ? resolution : adaptiveRatio, waterCeiling),
});
export function installQuality(renderer: WebGPURenderer, scenePass: { setResolutionScale(value: number): unknown }) {
  update = () => {
    const ratio = typeof resolution === 'number' ? resolution : adaptiveRatio;
    if (renderer.getPixelRatio() !== MAX_DPR * ratio) renderer.setPixelRatio(MAX_DPR * ratio);
    scenePass.setResolutionScale(Math.min(1, waterCeiling / ratio));
  };
  registerGraphics({
    id: 'resolution',
    label: 'Resolution',
    choices: ['auto', 1, 0.8, 0.6],
    default: 'auto',
    applyMode: 'live',
    cost: 'pixels',
    skips: 'Lower scale shades fewer scene pixels; output post remains full canvas size.',
    hitch: 'Resizing reallocates render targets.',
    read: () => resolution,
    apply: (value) => {
      resolution = value;
      update();
    },
  });
  registerGraphics({
    id: 'frameLimit',
    label: 'Frame limit',
    choices: ['display', 60, 30],
    default: 'display',
    applyMode: 'live',
    cost: 'output renders',
    skips: 'Skips scene/output render calls; gameplay, physics, FFT and water queries keep their callback cadence.',
    read: () => renderCap,
    apply: (value) => {
      renderCap = value;
      nextRender = 0;
    },
  });
  document.addEventListener('visibilitychange', () => {
    nextRender = 0;
  });
  update();
}
export function shouldRender(now: number) {
  if (typeof renderCap !== 'number') return true;
  const interval = 1000 / renderCap;
  if (nextRender === 0 || now - nextRender > interval * 4) nextRender = now;
  if (now + 0.25 < nextRender) return false;
  nextRender += interval;
  if (nextRender < now) nextRender = now + interval;
  return true;
}
