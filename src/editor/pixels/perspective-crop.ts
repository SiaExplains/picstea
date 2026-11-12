import { convertToSmartObject } from "../core/commands/smart-commands";
import { checkDimensions } from "../core/document/limits";
import { walkLayers } from "../core/document/tree";
import type { EditorDocument, Layer, LayerMask, SmartDistortion } from "../core/document/types";
import { invert3, isConvexQuad, project, squareToQuad } from "../core/geometry/homography";
import { boundsOf, layerCorners, type ContentSizer } from "../core/geometry/layer-geometry";
import { applyMatrix, fromTransform } from "../core/geometry/matrix";
import {
  boxQuad,
  drawMapped,
  perspectiveMap,
  warpMap,
  type MeshMap,
  type Point,
} from "../core/geometry/mesh";
import { mapPath } from "../core/path/path";
import { context2d, type PixelEnv } from "./layer-pixels";

/**
 * Perspective Crop (ADR-0044): the quad drawn on the canvas becomes the new, rectangular canvas.
 * Pixel layers are redrawn through the perspective; smart objects get a perspective distortion
 * (so they stay editable); text and shapes become smart objects first; masks and vector masks
 * follow. Fill and adjustment layers cover the canvas anyway. Guides are removed.
 */

const IDENTITY = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 } as const;

/** Output size: the average lengths of opposite edges. */
export function perspectiveCropSize(quad: readonly number[]): { width: number; height: number } {
  const edge = (a: number, b: number) =>
    Math.hypot(quad[b * 2] - quad[a * 2], quad[b * 2 + 1] - quad[a * 2 + 1]);
  return {
    width: Math.max(1, Math.round((edge(0, 1) + edge(3, 2)) / 2)),
    height: Math.max(1, Math.round((edge(0, 3) + edge(1, 2)) / 2)),
  };
}

export type PerspectiveCropResult =
  { ok: true; document: EditorDocument } | { ok: false; error: string };

export function perspectiveCrop(
  env: PixelEnv,
  sizer: ContentSizer,
  source: EditorDocument,
  quad: readonly number[],
): PerspectiveCropResult {
  if (!isConvexQuad(quad))
    return { ok: false, error: "The crop corners must form a four-sided shape." };
  const { width: W, height: H } = perspectiveCropSize(quad);
  const size = checkDimensions(W, H);
  if (!size.ok) return { ok: false, error: size.reason };
  const h = squareToQuad(quad);
  const inverse = h && invert3(h);
  if (!inverse) return { ok: false, error: "The crop corners must form a four-sided shape." };
  const out = new Float64Array(2);
  const toOut = (p: Point): Point =>
    project(inverse, p.x, p.y, out) ? { x: out[0] * W, y: out[1] * H } : { x: NaN, y: NaN };

  // Text and shapes become smart objects first, so they can be put in perspective.
  let doc = source;
  const convert: string[] = [];
  walkLayers(doc.layers, (layer) => {
    if (layer.kind === "text" || layer.kind === "shape") convert.push(layer.id);
  });
  for (const id of convert) {
    const layer = findIn(doc.layers, id);
    if (!layer) continue;
    doc = convertToSmartObject(id, boundsOf(layerCorners(layer, doc, sizer))).apply(doc);
  }

  const mask = (m: LayerMask): LayerMask | null => {
    if (!m.assetId) return { ...m, x: 0, y: 0, width: W, height: H };
    const bitmap = env.assets.getBitmap(m.assetId);
    if (!bitmap) return null;
    const surface = env.createSurface(W, H);
    const c = context2d(surface);
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = "copy";
    drawMapped(
      c,
      bitmap,
      m.width,
      m.height,
      (s, t) => toOut({ x: m.x + s * m.width, y: m.y + t * m.height }),
      48,
    );
    const asset = env.assets.addBitmap(surface, W, H);
    return { ...m, assetId: asset.id, x: 0, y: 0, width: W, height: H };
  };

  let pending = false;
  const convertLayer = (layer: Layer): Layer => {
    let next: Layer = layer;
    if (layer.kind === "group") {
      next = { ...layer, children: layer.children.map(convertLayer) };
    } else if (layer.kind === "raster") {
      const m = fromTransform(layer.transform);
      const bitmap = layer.assetId ? env.assets.getBitmap(layer.assetId) : undefined;
      if (layer.assetId && !bitmap) pending = true;
      let assetId: string | null = null;
      if (bitmap) {
        const surface = env.createSurface(W, H);
        drawMapped(
          context2d(surface),
          bitmap,
          layer.width,
          layer.height,
          (u, v) => toOut(applyMatrix(m, { x: u * layer.width, y: v * layer.height })),
          48,
        );
        assetId = env.assets.addBitmap(surface, W, H).id;
      }
      next = { ...layer, assetId, width: W, height: H, transform: { ...IDENTITY } };
    } else if (layer.kind === "smart") {
      const m = fromTransform(layer.transform);
      const { width: w, height: hh } = layer.content;
      const local: MeshMap | null = layer.distortion
        ? layer.distortion.kind === "perspective"
          ? perspectiveMap(layer.distortion.corners)
          : warpMap(layer.distortion.mesh)
        : null;
      const place = (p: Point) => toOut(applyMatrix(m, p));
      let distortion: SmartDistortion;
      if (layer.distortion?.kind === "warp") {
        const mesh: number[] = [];
        for (let i = 0; i < 32; i += 2) {
          const p = place({ x: layer.distortion.mesh[i], y: layer.distortion.mesh[i + 1] });
          mesh.push(p.x, p.y);
        }
        distortion = { kind: "warp", mesh, style: layer.distortion.style };
      } else {
        const corners: number[] = [];
        const box = boxQuad(w, hh);
        for (let i = 0; i < 8; i += 2) {
          const p = local ? local(box[i] / w, box[i + 1] / hh) : { x: box[i], y: box[i + 1] };
          const q = place(p);
          corners.push(q.x, q.y);
        }
        distortion = { kind: "perspective", corners };
      }
      next = { ...layer, transform: { ...IDENTITY }, distortion };
    }
    if (next.mask) {
      const m = mask(next.mask);
      if (m) next = { ...next, mask: m };
      else pending = true;
    }
    if (next.vectorMask) {
      next = {
        ...next,
        vectorMask: { ...next.vectorMask, path: mapPath(next.vectorMask.path, toOut) },
      };
    }
    return next;
  };

  const layers = doc.layers.map(convertLayer);
  if (pending) return { ok: false, error: "A layer is still loading. Try again in a moment." };
  const workPath = doc.workPath && mapPath(doc.workPath, toOut);
  const result: EditorDocument = {
    ...doc,
    width: W,
    height: H,
    layers,
    guides: [],
    ...(workPath ? { workPath } : {}),
  };
  delete (result as { selection?: unknown }).selection;
  return { ok: true, document: result };
}

function findIn(layers: readonly Layer[], id: string): Layer | undefined {
  for (const layer of layers) {
    if (layer.id === id) return layer;
    if (layer.kind === "group") {
      const found = findIn(layer.children, id);
      if (found) return found;
    }
  }
  return undefined;
}
