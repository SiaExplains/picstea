import type { Transform } from "../document/types";
import type { Point } from "../viewport/viewport";

/**
 * 2D affine matrix in canvas order: x' = a·x + c·y + e, y' = b·x + d·y + f.
 * A layer maps local → document as translate(x, y) · rotate(rotation) · scale(scaleX, scaleY),
 * the same order the compositor applies.
 */
export type Matrix = readonly [a: number, b: number, c: number, d: number, e: number, f: number];

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

export const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
export const toDegrees = (radians: number) => (radians * 180) / Math.PI;

export function fromTransform(t: Transform): Matrix {
  const cos = Math.cos(toRadians(t.rotation));
  const sin = Math.sin(toRadians(t.rotation));
  return [cos * t.scaleX, sin * t.scaleX, -sin * t.scaleY, cos * t.scaleY, t.x, t.y];
}

export function applyMatrix(m: Matrix, p: Point): Point {
  return { x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] };
}

/** `a · b`: apply `b` first, then `a`. */
export function multiplyMatrix(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

export function invertMatrix(m: Matrix): Matrix | null {
  const det = m[0] * m[3] - m[1] * m[2];
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;
  const inv = 1 / det;
  return [
    m[3] * inv,
    -m[1] * inv,
    -m[2] * inv,
    m[0] * inv,
    (m[2] * m[5] - m[3] * m[4]) * inv,
    (m[1] * m[4] - m[0] * m[5]) * inv,
  ];
}

/** Rotate a vector (no translation) by `degrees`. */
export function rotateVector(v: Point, degrees: number): Point {
  const cos = Math.cos(toRadians(degrees));
  const sin = Math.sin(toRadians(degrees));
  return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
}

/** Normalise an angle to (-180, 180]. */
export function normalizeDegrees(degrees: number): number {
  let d = degrees % 360;
  if (d <= -180) d += 360;
  if (d > 180) d -= 360;
  return d;
}
