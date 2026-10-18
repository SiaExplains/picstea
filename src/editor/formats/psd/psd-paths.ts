import { parsePath, type Anchor, type Subpath, type VectorPath } from "../../core/path/path";
import { ByteReader, ByteWriter } from "../binary/bytes";

/**
 * Photoshop vector paths (`vmsk` / `vsms` vector masks and shape outlines) ↔ Picstea paths
 * (ADR-0017). Path records are 26 bytes; points are 8.24 fixed-point fractions of the canvas
 * height (y) and width (x).
 */

const RECORD = 26;
const FIXED = 2 ** 24;

export interface PsdVectorMask {
  readonly path: VectorPath;
  readonly enabled: boolean;
  readonly linked: boolean;
  readonly inverted: boolean;
}

export function decodeVectorMask(
  body: Uint8Array,
  width: number,
  height: number,
): PsdVectorMask | null {
  const r = new ByteReader(body);
  r.u32(); // version
  const flags = r.u32();
  const subpaths: Subpath[] = [];
  let current: { closed: boolean; remaining: number; anchors: Anchor[] } | null = null;
  while (r.remaining >= RECORD) {
    const record = r.sub(RECORD);
    const selector = record.u16();
    switch (selector) {
      case 0:
      case 3: {
        if (current && current.anchors.length > 0) subpaths.push(current);
        current = { closed: selector === 0, remaining: record.u16(), anchors: [] };
        break;
      }
      case 1:
      case 2:
      case 4:
      case 5: {
        if (!current || current.remaining <= 0) break;
        const read = () => {
          const y = (record.i32() / FIXED) * height;
          const x = (record.i32() / FIXED) * width;
          return { x, y };
        };
        const before = read();
        const anchor = read();
        const after = read();
        current.anchors.push({ x: anchor.x, y: anchor.y, in: before, out: after });
        current.remaining--;
        break;
      }
      default:
        // Fill rule, clipboard and initial fill records carry nothing Picstea uses.
        break;
    }
  }
  if (current && current.anchors.length > 0) subpaths.push(current);
  const path = parsePath({
    subpaths: subpaths.map((s) => ({ closed: s.closed, anchors: s.anchors })),
  });
  if (!path || path.subpaths.length === 0) return null;
  return {
    path,
    inverted: (flags & 1) !== 0,
    linked: (flags & 2) === 0,
    enabled: (flags & 4) === 0,
  };
}

const fixed = (v: number, size: number) =>
  Math.max(-(2 ** 31), Math.min(2 ** 31 - 1, Math.round((v / size) * FIXED)));

export function encodeVectorMask(
  mask: { path: VectorPath; enabled: boolean; linked: boolean },
  width: number,
  height: number,
): Uint8Array {
  const w = new ByteWriter();
  w.u32(3).u32((mask.linked ? 0 : 2) | (mask.enabled ? 0 : 4));
  const record = (selector: number, fill: (r: ByteWriter) => void) => {
    const r = new ByteWriter();
    r.u16(selector);
    fill(r);
    const bytes = r.toBytes();
    w.bytes(bytes).bytes(new Uint8Array(RECORD - bytes.length));
  };
  record(6, () => {}); // path fill rule record
  record(8, (r) => r.u16(0)); // initial fill rule
  for (const sub of mask.path.subpaths) {
    record(sub.closed ? 0 : 3, (r) => r.u16(sub.anchors.length));
    for (const a of sub.anchors) {
      const smooth =
        Math.abs((a.in.x - a.x) * (a.out.y - a.y) - (a.in.y - a.y) * (a.out.x - a.x)) < 1e-6 &&
        !(a.in.x === a.x && a.in.y === a.y && a.out.x === a.x && a.out.y === a.y);
      const selector = sub.closed ? (smooth ? 1 : 2) : smooth ? 4 : 5;
      record(selector, (r) => {
        for (const p of [a.in, a, a.out]) r.i32(fixed(p.y, height)).i32(fixed(p.x, width));
      });
    }
  }
  return w.toBytes();
}
