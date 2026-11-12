import { corner, type Anchor, type VectorPath } from "../../core/path/path";

/**
 * Built-in custom shapes (ADR-0044), drawn as editable path shape layers. Each is written in a
 * 100 × 100 box with M (move), L (line), C (cubic curve) and Z (close), absolute coordinates.
 */
export const CUSTOM_SHAPES = {
  "arrow-right": "M0 35 L60 35 L60 10 L100 50 L60 90 L60 65 L0 65 Z",
  "arrow-left": "M100 35 L40 35 L40 10 L0 50 L40 90 L40 65 L100 65 Z",
  "arrow-up": "M35 100 L35 40 L10 40 L50 0 L90 40 L65 40 L65 100 Z",
  "arrow-down": "M35 0 L35 60 L10 60 L50 100 L90 60 L65 60 L65 0 Z",
  "arrow-curved": "M10 90 C10 45 40 25 70 25 L70 5 L100 37 L70 69 L70 49 C50 49 30 60 30 90 Z",
  "speech-bubble":
    "M15 5 L85 5 C93 5 100 12 100 20 L100 60 C100 68 93 75 85 75 L40 75 L15 100 L20 75 L15 75 C7 75 0 68 0 60 L0 20 C0 12 7 5 15 5 Z",
  "thought-bubble":
    "M50 5 C72 5 90 18 90 35 C90 52 72 65 50 65 C28 65 10 52 10 35 C10 18 28 5 50 5 Z M22 72 C27 72 31 76 31 81 C31 86 27 90 22 90 C17 90 13 86 13 81 C13 76 17 72 22 72 Z M10 93 C12 93 14 95 14 97 C14 99 12 100 10 100 C8 100 6 99 6 97 C6 95 8 93 10 93 Z",
  star: "M50 0 L62 36 L100 38 L70 61 L81 100 L50 77 L19 100 L30 61 L0 38 L38 36 Z",
  heart:
    "M50 95 C30 78 0 60 0 30 C0 12 13 0 28 0 C38 0 46 6 50 15 C54 6 62 0 72 0 C87 0 100 12 100 30 C100 60 70 78 50 95 Z",
  check: "M0 55 L15 40 L38 63 L85 10 L100 25 L38 95 Z",
  cross: "M15 0 L50 35 L85 0 L100 15 L65 50 L100 85 L85 100 L50 65 L15 100 L0 85 L35 50 L0 15 Z",
  plus: "M35 0 L65 0 L65 35 L100 35 L100 65 L65 65 L65 100 L35 100 L35 65 L0 65 L0 35 L35 35 Z",
  pin: "M50 100 C38 78 15 60 15 35 C15 15 31 0 50 0 C69 0 85 15 85 35 C85 60 62 78 50 100 Z M50 20 C42 20 35 27 35 35 C35 43 42 50 50 50 C58 50 65 43 65 35 C65 27 58 20 50 20 Z",
  cloud:
    "M25 85 C10 85 0 75 0 62 C0 50 9 41 21 40 C22 22 36 10 53 10 C68 10 80 20 84 34 C94 36 100 45 100 57 C100 72 89 85 74 85 Z",
  lightning: "M60 0 L15 55 L45 55 L35 100 L85 40 L55 40 L70 0 Z",
  tag: "M0 0 L60 0 L100 50 L60 100 L0 100 Z M20 40 C26 40 30 44 30 50 C30 56 26 60 20 60 C14 60 10 56 10 50 C10 44 14 40 20 40 Z",
  banner: "M0 20 L100 20 L85 50 L100 80 L0 80 L15 50 Z",
} as const;

export type CustomShapeId = keyof typeof CUSTOM_SHAPES;

export const CUSTOM_SHAPE_IDS = Object.keys(CUSTOM_SHAPES) as CustomShapeId[];

export const CUSTOM_SHAPE_LABELS: Record<CustomShapeId, string> = {
  "arrow-right": "Arrow right",
  "arrow-left": "Arrow left",
  "arrow-up": "Arrow up",
  "arrow-down": "Arrow down",
  "arrow-curved": "Curved arrow",
  "speech-bubble": "Speech bubble",
  "thought-bubble": "Thought bubble",
  star: "Star",
  heart: "Heart",
  check: "Check mark",
  cross: "Cross",
  plus: "Plus",
  pin: "Location pin",
  cloud: "Cloud",
  lightning: "Lightning",
  tag: "Tag",
  banner: "Banner",
};

/** Parse a 100 × 100 path description into a path scaled into `box`. */
export function customShapePath(
  id: CustomShapeId,
  box: { x: number; y: number; width: number; height: number },
): VectorPath {
  const tokens = CUSTOM_SHAPES[id].match(/[MLCZ]|-?\d+(?:\.\d+)?/g) ?? [];
  const sx = box.width / 100;
  const sy = box.height / 100;
  const pt = (x: string, y: string) => ({ x: box.x + Number(x) * sx, y: box.y + Number(y) * sy });
  const subpaths: { closed: boolean; anchors: Anchor[] }[] = [];
  let anchors: Anchor[] = [];
  let i = 0;
  const finish = (closed: boolean) => {
    if (anchors.length === 0) return;
    // A closing curve back onto the first point ends on a duplicate: merge it.
    if (closed && anchors.length > 1) {
      const first = anchors[0];
      const last = anchors[anchors.length - 1];
      if (Math.hypot(first.x - last.x, first.y - last.y) < 1e-6) {
        anchors[0] = { ...first, in: last.in };
        anchors.pop();
      }
    }
    subpaths.push({ closed, anchors });
    anchors = [];
  };
  while (i < tokens.length) {
    const op = tokens[i++];
    if (op === "M") {
      finish(false);
      const p = pt(tokens[i++], tokens[i++]);
      anchors.push(corner(p.x, p.y));
    } else if (op === "L") {
      const p = pt(tokens[i++], tokens[i++]);
      anchors.push(corner(p.x, p.y));
    } else if (op === "C") {
      const c1 = pt(tokens[i++], tokens[i++]);
      const c2 = pt(tokens[i++], tokens[i++]);
      const p = pt(tokens[i++], tokens[i++]);
      const prev = anchors[anchors.length - 1];
      anchors[anchors.length - 1] = { ...prev, out: c1 };
      anchors.push({ x: p.x, y: p.y, in: c2, out: { x: p.x, y: p.y } });
    } else if (op === "Z") {
      finish(true);
    }
  }
  finish(false);
  return { subpaths };
}
