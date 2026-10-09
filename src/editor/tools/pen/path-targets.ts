import { setShapePath, setVectorMask, setWorkPath, type Command } from "../../core/commands";
import { activeLayer } from "../../core/document/queries";
import type { EditorDocument } from "../../core/document/types";
import { fromTransform, invertMatrix } from "../../core/geometry/matrix";
import { transformPath, type VectorPath } from "../../core/path/path";

/**
 * The paths the path tools can show and edit (ADR-0015), always in document space: the active
 * layer's path shape, the active layer's vector mask, and the work path. Each target knows how
 * to turn an edited document-space path back into a command.
 */
export interface PathTarget {
  readonly key: "shape" | "mask" | "work";
  readonly path: VectorPath;
  /** Command storing an edited path; drags pass a merge key so they become one undo step. */
  commit(path: VectorPath, mergeKey?: string): Command | null;
}

export function pathTargets(doc: EditorDocument): PathTarget[] {
  const targets: PathTarget[] = [];
  const layer = activeLayer(doc);
  if (layer?.kind === "shape" && layer.shape === "path" && layer.path && !layer.locked) {
    const m = fromTransform(layer.transform);
    const inverse = invertMatrix(m);
    if (inverse) {
      targets.push({
        key: "shape",
        path: transformPath(layer.path, m),
        commit: (path, mergeKey) =>
          path.subpaths.length === 0
            ? null
            : setShapePath(layer.id, transformPath(path, inverse), { mergeKey }),
      });
    }
  }
  if (layer?.vectorMask && !layer.locked) {
    const mask = layer.vectorMask;
    targets.push({
      key: "mask",
      path: mask.path,
      commit: (path, mergeKey) =>
        setVectorMask(layer.id, path.subpaths.length ? { ...mask, path } : null, {
          mergeKey,
          label: path.subpaths.length ? "Edit Vector Mask" : "Delete Vector Mask",
        }),
    });
  }
  if (doc.workPath) {
    targets.push({
      key: "work",
      path: doc.workPath,
      commit: (path, mergeKey) =>
        setWorkPath(path.subpaths.length ? path : null, { mergeKey, label: "Edit Path" }),
    });
  }
  return targets;
}
