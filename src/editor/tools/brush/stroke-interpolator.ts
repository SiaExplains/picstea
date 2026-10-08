import type { Point } from "../../core/viewport/viewport";

/**
 * Places brush dabs at even spacing along a polyline, carrying the leftover distance between
 * segments so the spacing stays uniform however the pointer events arrive.
 */
export class StrokeInterpolator {
  private last: Point | null = null;
  private carry = 0;

  constructor(private readonly spacing: number) {
    if (!(spacing > 0)) throw new RangeError("Spacing must be positive.");
  }

  /** First point of a stroke: always produces one dab. */
  start(point: Point): Point[] {
    this.last = point;
    this.carry = 0;
    return [point];
  }

  /** Extend the stroke to `point`, returning the dabs to stamp along the way. */
  moveTo(point: Point): Point[] {
    const from = this.last;
    if (!from) return this.start(point);
    const dx = point.x - from.x;
    const dy = point.y - from.y;
    const length = Math.hypot(dx, dy);
    const dabs: Point[] = [];
    let distance = this.spacing - this.carry;
    while (distance <= length) {
      const t = distance / length;
      dabs.push({ x: from.x + dx * t, y: from.y + dy * t });
      distance += this.spacing;
    }
    this.carry = length - (distance - this.spacing);
    this.last = point;
    return dabs;
  }
}
