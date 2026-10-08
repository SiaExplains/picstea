import { MAX_DIMENSION, MAX_PIXELS } from "../../core/document/limits";

/**
 * SVG import (docs/12 "Never blindly inject imported SVG into the DOM"). The file is only ever
 * parsed as an inert XML document to read its size, then rendered to pixels by the browser's
 * image decoder (`<img>`), where scripts never run and external resources are not loaded.
 */

const DEFAULT_SIZE = { width: 300, height: 150 };
/** CSS absolute units in px. */
const UNITS: Record<string, number> = {
  px: 1,
  pt: 96 / 72,
  pc: 16,
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
};

/** Does this look like SVG text? Checks the start of the file only. */
export function looksLikeSvg(bytes: Uint8Array): boolean {
  const head = new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, 4096));
  return /^﻿?\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*|<!DOCTYPE[^>]*>\s*)*<svg[\s>]/i.test(head);
}

function length(value: string | null): number | null {
  if (!value) return null;
  const match = /^\s*([0-9]*\.?[0-9]+(?:e[+-]?\d+)?)\s*([a-z%]*)\s*$/i.exec(value);
  if (!match) return null;
  const unit = match[2].toLowerCase() || "px";
  if (!(unit in UNITS)) return null; // %, em, … depend on context: fall back to viewBox
  const px = Number(match[1]) * UNITS[unit];
  return Number.isFinite(px) && px > 0 ? px : null;
}

/**
 * The pixel size to rasterise an SVG at: its width/height, else its viewBox, else 300 × 150 (the
 * browser default), scaled down proportionally to fit the document limits.
 */
export function svgPixelSize(text: string): { width: number; height: number } | null {
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const root = doc.documentElement;
  if (!root || root.localName !== "svg" || doc.getElementsByTagName("parsererror").length > 0) {
    return null;
  }
  let width = length(root.getAttribute("width"));
  let height = length(root.getAttribute("height"));
  const box = (root.getAttribute("viewBox") ?? "")
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const hasBox = box.length === 4 && box.every(Number.isFinite) && box[2] > 0 && box[3] > 0;
  if (width === null && height === null && hasBox) [width, height] = [box[2], box[3]];
  else if (width === null && height !== null)
    width = hasBox ? (height * box[2]) / box[3] : height * 2;
  else if (height === null && width !== null)
    height = hasBox ? (width * box[3]) / box[2] : width / 2;
  if (width === null || height === null) ({ width, height } = DEFAULT_SIZE);

  let scale = 1;
  scale = Math.min(scale, MAX_DIMENSION / width, MAX_DIMENSION / height);
  scale = Math.min(scale, Math.sqrt(MAX_PIXELS / (width * height)));
  // Round down when scaling, so the result never exceeds the limits by a rounding pixel.
  const fit = scale < 1 ? Math.floor : Math.round;
  return {
    width: Math.max(1, fit(width * scale)),
    height: Math.max(1, fit(height * scale)),
  };
}
