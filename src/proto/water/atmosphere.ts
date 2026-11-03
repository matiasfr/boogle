// Ultra Water atmosphere.js (30ea65e), after Hillaire 2020. Same LUT grids and quadrature, baked on the CPU only
// when the sun/medium changes; the fragment shaders sample the resulting HDR tables. No per-frame integration.
// See public/THIRD_PARTY_NOTICES.md (Ultra Water and Epic) and docs/research/ultra-water.md.
import * as THREE from 'three/webgpu';

export const RB = 6360,
  RT = 6460,
  OBS_H = 0.01;
export const H_TOP = Math.sqrt(RT * RT - RB * RB);
export const SKY_SIZE = [192, 108] as const;
type RGB = [number, number, number];
export type MediumParams = { turbidity: number; rayleigh: number };
export function atmosphereCoefficients(p: MediumParams) {
  const m = p.turbidity * p.turbidity;
  return {
    rayleigh: [5.802e-3, 13.558e-3, 33.1e-3].map((v) => v * p.rayleigh) as RGB,
    mieScattering: 3.996e-3 * m,
    mieExtinction: 4.44e-3 * m,
    ozone: [0.65e-3, 1.881e-3, 0.085e-3] as RGB,
  };
}
type Coefficients = ReturnType<typeof atmosphereCoefficients>;
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(v, hi));
function altitudeAt(h: number, mu: number, t: number) {
  const q = h * (2 * RB + h) + t * (2 * (RB + h) * mu + t);
  const r = Math.sqrt(RB * RB + q);
  return { h: q / (r + RB), r };
}
const distTop = (r: number, mu: number) =>
  Math.max(-r * mu + Math.sqrt(Math.max(r * r * (mu * mu - 1) + RT * RT, 0)), 0);
export function transmittance(c: Coefficients, h: number, mu: number): RGB {
  const d = distTop(RB + h, mu),
    od: RGB = [0, 0, 0];
  for (let i = 0; i < 40; i++) {
    const a = Math.max(altitudeAt(h, mu, d * ((i + 0.5) / 40) ** 2).h, 0),
      w = ((2 * i + 1) * d) / 1600;
    const dr = Math.exp(-a / 8) * w,
      dm = Math.exp(-a / 1.2) * w,
      dz = Math.max(0, 1 - Math.abs(a - 25) / 15) * w;
    for (let k = 0; k < 3; k++) od[k]! += c.rayleigh[k]! * dr + c.mieExtinction * dm + c.ozone[k]! * dz;
  }
  return od.map((v) => Math.exp(-v)) as RGB;
}

class Table {
  data: Float32Array;
  texture: THREE.DataTexture;
  readonly width: number;
  readonly height: number;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Float32Array(width * height * 4);
    this.texture = new THREE.DataTexture(
      new Uint16Array(width * height * 4),
      width,
      height,
      THREE.RGBAFormat,
      THREE.HalfFloatType,
    );
    this.texture.minFilter = this.texture.magFilter = THREE.LinearFilter;
    this.texture.colorSpace = THREE.LinearSRGBColorSpace;
  }
  put(x: number, y: number, value: RGB) {
    const i = (y * this.width + x) * 4;
    this.data.set(value, i);
    this.data[i + 3] = 1;
  }
  upload() {
    const pixels = this.texture.image.data as Uint16Array;
    for (let i = 0; i < this.data.length; i++) pixels[i] = THREE.DataUtils.toHalfFloat(this.data[i]!);
    this.texture.needsUpdate = true;
  }
  sample(u: number, v: number): RGB {
    const x = clamp(u * this.width - 0.5, 0, this.width - 1),
      y = clamp(v * this.height - 0.5, 0, this.height - 1);
    const ix = Math.floor(x),
      iy = Math.floor(y),
      fx = x - ix,
      fy = y - iy;
    const i0 = (iy * this.width + ix) * 4,
      i1 = (iy * this.width + Math.min(ix + 1, this.width - 1)) * 4;
    const j0 = (Math.min(iy + 1, this.height - 1) * this.width + ix) * 4;
    const j1 = (Math.min(iy + 1, this.height - 1) * this.width + Math.min(ix + 1, this.width - 1)) * 4;
    return [0, 1, 2].map(
      (k) =>
        (this.data[i0 + k]! * (1 - fx) + this.data[i1 + k]! * fx) * (1 - fy) +
        (this.data[j0 + k]! * (1 - fx) + this.data[j1 + k]! * fx) * fy,
    ) as RGB;
  }
}

export class Atmosphere {
  trans = new Table(256, 64);
  multiple = new Table(32, 32);
  sky = new Table(...SKY_SIZE);
  private coefficients = atmosphereCoefficients({ turbidity: 2, rayleigh: 1 });
  private mediumKey = '';
  private transmission(h: number, mu: number) {
    const r = RB + h,
      rho = Math.sqrt(Math.max(h, 0) * (2 * RB + h));
    const dmin = RT - r;
    return this.trans.sample((distTop(r, mu) - dmin) / (rho + H_TOP - dmin), rho / H_TOP);
  }
  private integrate(h: number, mu: number, muS: number, nu: number, n: number, ms: boolean) {
    const r0 = RB + h,
      gd = r0 * r0 * (mu * mu - 1) + RB * RB,
      ground = mu < 0 && gd >= 0;
    const tMax = ground ? Math.max(-r0 * mu - Math.sqrt(gd), 0) : distTop(r0, mu);
    const pr = ms ? 1 / (4 * Math.PI) : 0.0596831 * (1 + nu * nu);
    const phaseK = 1 + 0.8 * 0.8 - 1.6 * nu;
    const pm = ms ? pr : (1 - 0.8 * 0.8) / (4 * Math.PI * phaseK * Math.sqrt(phaseK));
    const L: RGB = [0, 0, 0],
      F: RGB = [0, 0, 0],
      T: RGB = [1, 1, 1];
    const k = tMax / (n * n),
      c = this.coefficients;
    for (let i = 0; i < n; i++) {
      const t = k * (i + 0.5) ** 2,
        dt = k * (2 * i + 1),
        a = altitudeAt(h, mu, t),
        ht = Math.max(a.h, 0);
      const mst = clamp((r0 * muS + t * nu) / a.r, -1, 1);
      const rayD = Math.exp(-ht / 8),
        mieD = Math.exp(-ht / 1.2),
        ozoneD = Math.max(0, 1 - Math.abs(ht - 25) / 15);
      const tr = this.transmission(a.h, mst);
      const visible = mst >= -Math.sqrt(ht * (2 * RB + a.h)) / a.r ? 1 : 0;
      const mul = ms
        ? [0, 0, 0]
        : this.multiple.sample(
            (clamp(mst * 0.5 + 0.5) * 31) / 32 + 0.5 / 32,
            (clamp(a.h / (RT - RB)) * 31) / 32 + 0.5 / 32,
          );
      for (let j = 0; j < 3; j++) {
        const ray = c.rayleigh[j]! * rayD,
          mie = c.mieScattering * mieD,
          scat = ray + mie;
        const ext = ray + c.mieExtinction * mieD + c.ozone[j]! * ozoneD,
          ts = Math.exp(-ext * dt);
        const seg = (1 - ts) / Math.max(ext, 1e-7);
        L[j]! += T[j]! * (tr[j]! * visible * (ray * pr + mie * pm) + scat * mul[j]!) * seg;
        F[j]! += T[j]! * scat * seg;
        T[j]! *= ts;
      }
    }
    if (ms && ground) {
      const msg = clamp((r0 * muS + tMax * nu) / RB, -1, 1),
        tr = this.transmission(0, msg);
      for (let j = 0; j < 3; j++) L[j]! += T[j]! * tr[j]! * Math.max(msg, 0) * (0.1 / Math.PI);
    }
    return { L, F };
  }
  update(params: MediumParams, sunMu: number, illuminance: number) {
    const key = `${params.turbidity}/${params.rayleigh}`;
    if (key !== this.mediumKey) {
      this.mediumKey = key;
      this.coefficients = atmosphereCoefficients(params);
      for (let y = 0; y < 64; y++)
        for (let x = 0; x < 256; x++) {
          const rho = (H_TOP * (y + 0.5)) / 64,
            r = Math.sqrt(rho * rho + RB * RB),
            h = (rho * rho) / (r + RB);
          const dmin = RT - r,
            d = dmin + ((rho + H_TOP - dmin) * (x + 0.5)) / 256;
          const mu = d <= 0 ? 1 : clamp((H_TOP * H_TOP - rho * rho - d * d) / (2 * r * d), -1, 1);
          this.trans.put(x, y, transmittance(this.coefficients, h, mu));
        }
      for (let y = 0; y < 32; y++)
        for (let x = 0; x < 32; x++) {
          const muS = (x / 31) * 2 - 1,
            h = Math.max((y / 31) * (RT - RB), OBS_H),
            sinS = Math.sqrt(Math.max(1 - muS * muS, 0));
          const L: RGB = [0, 0, 0],
            F: RGB = [0, 0, 0];
          for (let j = 0; j < 8; j++) {
            const mu = 1 - (2 * (j + 0.5)) / 8,
              sinV = Math.sqrt(1 - mu * mu);
            for (let i = 0; i < 8; i++) {
              const nu = Math.cos((2 * Math.PI * (i + 0.5)) / 8) * sinV * sinS + mu * muS;
              const s = this.integrate(h, mu, muS, nu, 20, true);
              for (let q = 0; q < 3; q++) {
                L[q]! += s.L[q]!;
                F[q]! += s.F[q]!;
              }
            }
          }
          this.multiple.put(x, y, L.map((v, q) => v / (64 - F[q]!)) as RGB);
        }
      this.trans.upload();
      this.multiple.upload();
    }
    for (let y = 0; y < SKY_SIZE[1]; y++)
      for (let x = 0; x < SKY_SIZE[0]; x++) {
        const u = x / (SKY_SIZE[0] - 1),
          v = y / (SKY_SIZE[1] - 1),
          cosPhi = 1 - 2 * u * u,
          elev = Math.PI * 0.5 * v * v;
        const mu = Math.sin(elev),
          nu = Math.cos(elev) * cosPhi * Math.sqrt(Math.max(1 - sunMu * sunMu, 0)) + mu * sunMu;
        this.sky.put(x, y, this.integrate(OBS_H, mu, sunMu, nu, 32, false).L.map((q) => q * illuminance) as RGB);
      }
    this.sky.upload();
  }
}
