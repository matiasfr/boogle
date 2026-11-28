import { clamp } from '../math-pure.ts';

const KEY = 'boogle.cameraDistancePercent';
export const cameraRange = { min: 70, max: 130, step: 10 };

function normalize(value: number) {
  if (!Number.isFinite(value)) return 100;
  const { step, min, max } = cameraRange;
  return clamp(Math.round(value / step) * step, min, max);
}

export function readCameraDistance() {
  try {
    const saved = localStorage.getItem(KEY);
    return saved?.trim() ? normalize(Number(saved)) : 100;
  } catch {
    return 100;
  }
}

export let cameraDistancePercent = readCameraDistance();
export const followDistance = (distance: number) => distance * (cameraDistancePercent / 100);

export function setCameraDistance(value: number) {
  cameraDistancePercent = normalize(value);
  try {
    localStorage.setItem(KEY, String(cameraDistancePercent));
  } catch {
    // Storage unavailable. Keep the preference for this visit.
  }
}
