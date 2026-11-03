// Local sea state. No scene, terrain or physics imports: lighting, splashes and the renderer share these handles.
import { Color, Vector4 } from 'three';
import { uniform } from 'three/tsl';
import { SUN_DIR } from '../sun-dir.ts';

export const seaRipples = Array.from({ length: 8 }, () => new Vector4(0, 0, 0, 0));
export const seaU = {
  uTime: uniform(0), // unwrapped frame elapsed; only FFT dispersion derives a periodic phase
  uSun: uniform(SUN_DIR),
  uSky: uniform(new Color('#a9dcf3')),
  uLight: uniform(new Color(1, 1, 1)),
  uSpecCol: uniform(new Color(1, 0.97, 0.88)),
  uHaze: uniform(new Color()), // retained for the parked sky prototype
};
