/**
 * Projective maps between the unit square and a quadrilateral (Heckbert's method), shared by
 * Vanishing Point (ADR-0036), Distort/Perspective and Perspective Crop (ADR-0044).
 * Quads are 8 numbers, clockwise from top-left: x0 y0 x1 y1 x2 y2 x3 y3.
 */

/** Row-major 3×3 matrix. */
export type Homography = readonly number[];

/** The homography taking the unit square (0,0)(1,0)(1,1)(0,1) to the given quad (Heckbert). */
export function squareToQuad(q: readonly number[]): Homography | null {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = q;
  const sx = x0 - x1 + x2 - x3;
  const sy = y0 - y1 + y2 - y3;
  if (Math.abs(sx) < 1e-12 && Math.abs(sy) < 1e-12) {
    return [x1 - x0, x2 - x1, x0, y1 - y0, y2 - y1, y0, 0, 0, 1];
  }
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const det = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(det) < 1e-12) return null;
  const g = (sx * dy2 - dx2 * sy) / det;
  const h = (dx1 * sy - sx * dy1) / det;
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1];
}

export function invert3(m: Homography): Homography | null {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;
  const k = 1 / det;
  return [
    A * k,
    -(b * i - c * h) * k,
    (b * f - c * e) * k,
    B * k,
    (a * i - c * g) * k,
    -(a * f - c * d) * k,
    C * k,
    -(a * h - b * g) * k,
    (a * e - b * d) * k,
  ];
}

/** Apply a homography to (x, y); writes the result into `out`, returns false behind the camera. */
export function project(m: Homography, x: number, y: number, out: Float64Array): boolean {
  const w = m[6] * x + m[7] * y + m[8];
  if (w <= 1e-9) return false;
  out[0] = (m[0] * x + m[1] * y + m[2]) / w;
  out[1] = (m[3] * x + m[4] * y + m[5]) / w;
  return true;
}

/** A plane is usable when its quad is convex (no crossed or folded corners). */
export function isConvexQuad(q: readonly number[]): boolean {
  let sign = 0;
  for (let k = 0; k < 4; k++) {
    const ax = q[((k + 1) % 4) * 2] - q[k * 2];
    const ay = q[((k + 1) % 4) * 2 + 1] - q[k * 2 + 1];
    const bx = q[((k + 2) % 4) * 2] - q[((k + 1) % 4) * 2];
    const by = q[((k + 2) % 4) * 2 + 1] - q[((k + 1) % 4) * 2 + 1];
    const cross = ax * by - ay * bx;
    if (Math.abs(cross) < 1e-12) return false;
    const s = Math.sign(cross);
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}
