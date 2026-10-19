import type { RgbaPixels } from "../../selection/flood";
import type { FilterDefinition } from "../types";

/**
 * Fourier submenu (ADR-0036). The forward transform shows each colour channel's spectrum,
 * centred, so you can paint over repeating patterns (screens, moiré); the inverse brings the
 * image back.
 *
 * A Fourier spectrum is complex and wouldn't fit back into the layer's 8-bit channels, so Picstea
 * uses the Hartley transform: real-valued, with the same frequencies in the same places, and
 * its own inverse. Values are stored with a signed logarithmic curve; the round trip is
 * therefore close but not exact (8 bits per coefficient).
 */

/** In-place iterative radix-2 FFT; `re.length` must be a power of two. */
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

const isPowerOfTwo = (n: number) => (n & (n - 1)) === 0;

/** Orthonormal 1-D discrete Hartley transform of length n (its own inverse). */
class Hartley {
  private readonly m: number;
  private readonly re: Float64Array;
  private readonly im: Float64Array;
  /** Bluestein chirp and the FFT of its conjugate, for lengths that aren't powers of two. */
  private readonly chirpRe: Float64Array | null = null;
  private readonly chirpIm: Float64Array | null = null;
  private readonly kernelRe: Float64Array | null = null;
  private readonly kernelIm: Float64Array | null = null;

  constructor(private readonly n: number) {
    if (isPowerOfTwo(n)) {
      this.m = n;
    } else {
      let m = 1;
      while (m < 2 * n - 1) m <<= 1;
      this.m = m;
      this.chirpRe = new Float64Array(n);
      this.chirpIm = new Float64Array(n);
      this.kernelRe = new Float64Array(m);
      this.kernelIm = new Float64Array(m);
      for (let k = 0; k < n; k++) {
        const a = (Math.PI * ((k * k) % (2 * n))) / n;
        this.chirpRe[k] = Math.cos(a);
        this.chirpIm[k] = -Math.sin(a);
        this.kernelRe[k] = Math.cos(a);
        this.kernelIm[k] = Math.sin(a);
        if (k > 0) {
          this.kernelRe[m - k] = Math.cos(a);
          this.kernelIm[m - k] = Math.sin(a);
        }
      }
      fft(this.kernelRe, this.kernelIm);
    }
    this.re = new Float64Array(this.m);
    this.im = new Float64Array(this.m);
  }

  /** Transform `data` (length n, read at `offset + k * stride`) in place. */
  run(data: Float64Array, offset: number, stride: number): void {
    const { n, re, im } = this;
    re.fill(0);
    im.fill(0);
    if (this.chirpRe === null) {
      for (let k = 0; k < n; k++) re[k] = data[offset + k * stride];
      fft(re, im);
    } else {
      const cr = this.chirpRe;
      const ci = this.chirpIm!;
      for (let k = 0; k < n; k++) {
        const x = data[offset + k * stride];
        re[k] = x * cr[k];
        im[k] = x * ci[k];
      }
      fft(re, im);
      const kr = this.kernelRe!;
      const ki = this.kernelIm!;
      for (let k = 0; k < this.m; k++) {
        const r = re[k] * kr[k] - im[k] * ki[k];
        im[k] = -(re[k] * ki[k] + im[k] * kr[k]);
        re[k] = r;
      }
      // Inverse FFT via conjugation: conj(FFT(conj(x))) / m.
      fft(re, im);
      for (let k = 0; k < n; k++) {
        const r = re[k] / this.m;
        const i = -im[k] / this.m;
        re[k] = r * cr[k] - i * ci[k];
        im[k] = r * ci[k] + i * cr[k];
      }
    }
    const norm = 1 / Math.sqrt(n);
    for (let k = 0; k < n; k++) data[offset + k * stride] = (re[k] - im[k]) * norm;
  }
}

/** Separable 2-D Hartley transform of a w×h plane, in place (also its own inverse). */
function hartley2d(plane: Float64Array, w: number, h: number): void {
  const rows = new Hartley(w);
  for (let y = 0; y < h; y++) rows.run(plane, y * w, 1);
  const cols = new Hartley(h);
  for (let x = 0; x < w; x++) cols.run(plane, x, w);
}

/** Largest coefficient magnitude possible for a w×h plane of 0–255 values. */
const range = (w: number, h: number) => Math.log1p(255 * Math.sqrt(w * h));

/** Forward transform: each channel's centred spectrum. The layer becomes opaque. */
export function fourierTransform(pixels: RgbaPixels): RgbaPixels {
  const { width: w, height: h, data: src } = pixels;
  const out = new Uint8ClampedArray(src.length);
  const plane = new Float64Array(w * h);
  const scale = range(w, h);
  const sx = Math.floor(w / 2);
  const sy = Math.floor(h / 2);
  for (let c = 0; c < 3; c++) {
    for (let p = 0; p < plane.length; p++) plane[p] = (src[p * 4 + c] * src[p * 4 + 3]) / 255;
    hartley2d(plane, w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = plane[y * w + x];
        const e = 127.5 + (127.5 * Math.sign(v) * Math.log1p(Math.abs(v))) / scale;
        out[(((y + sy) % h) * w + ((x + sx) % w)) * 4 + c] = Math.round(e);
      }
    }
  }
  for (let i = 3; i < out.length; i += 4) out[i] = 255;
  return { width: w, height: h, data: out };
}

/** Inverse transform: an image from a spectrum made by `fourierTransform`. */
export function inverseFourierTransform(pixels: RgbaPixels): RgbaPixels {
  const { width: w, height: h, data: src } = pixels;
  const out = new Uint8ClampedArray(src.length);
  const plane = new Float64Array(w * h);
  const scale = range(w, h);
  const sx = Math.floor(w / 2);
  const sy = Math.floor(h / 2);
  for (let c = 0; c < 3; c++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const e = (src[(((y + sy) % h) * w + ((x + sx) % w)) * 4 + c] - 127.5) / 127.5;
        plane[y * w + x] = Math.sign(e) * Math.expm1(Math.abs(e) * scale);
      }
    }
    hartley2d(plane, w, h);
    for (let p = 0; p < plane.length; p++) out[p * 4 + c] = Math.round(plane[p]);
  }
  for (let i = 3; i < out.length; i += 4) out[i] = 255;
  return { width: w, height: h, data: out };
}

export const FOURIER_FILTERS = [
  {
    id: "fourier-transform",
    name: "Fourier Transform",
    group: "Fourier",
    parameters: [],
    apply: (p) => fourierTransform(p),
  },
  {
    id: "inverse-fourier-transform",
    name: "Inverse Fourier Transform",
    group: "Fourier",
    parameters: [],
    apply: (p) => inverseFourierTransform(p),
  },
] as const satisfies readonly FilterDefinition[];
