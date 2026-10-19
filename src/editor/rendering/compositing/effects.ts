import { gradientLut } from "../../adjustments/gradient";
import { hexToRgb } from "../../core/color";
import type { BlendMode } from "../../core/document/types";
import {
  DEFAULT_GLOBAL_LIGHT,
  effectAngle,
  effectList,
  type BevelEffect,
  type Contour,
  type DropShadowEffect,
  type EffectByKind,
  type EffectKind,
  type GlobalLight,
  type GlowFill,
  type InnerGlowEffect,
  type InnerShadowEffect,
  type LayerEffects,
  type OuterGlowEffect,
  type SatinEffect,
  type StrokeEffect,
} from "../../core/effects/model";
import { compositeOperation } from "./blend";
import {
  canReadPixels,
  context,
  contourLut,
  dither,
  fillGradient,
  fillPattern,
  hashNoise,
  isLinearContour,
  mapAlpha,
  type Box,
  type MakeSurface,
  type Surface,
} from "./effect-paint";

/**
 * Layer styles (ADR-0008, ADR-0030), built from the layer's rendered silhouette with standard
 * 2D canvas operations so they look the same in every engine, in the render worker and in
 * exports.
 *
 * Bottom to top: Drop Shadow, Outer Glow, the content (at Fill opacity), Pattern, Gradient and
 * Color Overlay, Satin, Inner Glow, Inner Shadow, Stroke, Bevel & Emboss — Photoshop's list read
 * upwards. Of several copies of one effect, the first in the list is on top.
 */

export { hasActiveEffects } from "../../core/effects/model";

/** Shadow offset for a light angle in degrees (counter-clockwise from +x; shadow falls opposite). */
export function shadowOffset(angle: number, distance: number): { dx: number; dy: number } {
  const rad = (angle * Math.PI) / 180;
  return { dx: -Math.cos(rad) * distance, dy: Math.sin(rad) * distance };
}

/** Points on rings used to grow a silhouette (strokes, spread and choke). */
export function strokeOffsets(size: number): { x: number; y: number }[] {
  if (size <= 0) return [];
  const count = size <= 2 ? 1 : Math.min(10, Math.max(3, Math.ceil(size / 4)));
  const out: { x: number; y: number }[] = [];
  for (let k = count; k >= 1; k--) {
    const r = (size * k) / count;
    const n = Math.min(64, Math.max(8, Math.ceil((2 * Math.PI * r) / 2)));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      out.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
  }
  return out;
}

/** One effect, ready to composite: its own pixels, blend mode and opacity. */
export interface EffectPass {
  readonly surface: Surface;
  readonly blendMode: BlendMode;
  readonly opacity: number;
}

/** A styled layer: effects drawn beneath it (blended with what is below) and everything else. */
export interface StyledLayer {
  readonly below: readonly EffectPass[];
  readonly body: Surface;
}

export interface EffectEnv {
  readonly createSurface: MakeSurface;
  /** Surface pixels per document pixel, so sizes match at every zoom. */
  readonly scale?: number;
  /** The layer's box on the surface (gradients and patterns aligned with the layer). */
  readonly box?: Box;
  /** The document canvas on the surface (gradients and patterns not aligned with the layer). */
  readonly canvasBox?: Box;
  readonly light?: GlobalLight;
  /** Blending Options → Fill: fades the content but not its effects. */
  readonly fillOpacity?: number;
}

interface Kit {
  readonly make: MakeSurface;
  readonly w: number;
  readonly h: number;
  readonly scale: number;
  readonly box: Box;
  readonly canvasBox: Box;
  readonly light: GlobalLight;
}

const free = (...surfaces: (Surface | null | undefined)[]) => {
  for (const s of surfaces) if (s) s.width = s.height = 0;
};

const blank = (k: Kit) => k.make(k.w, k.h);

function copyOf(k: Kit, src: Surface): Surface {
  const out = blank(k);
  context(out).drawImage(src, 0, 0);
  return out;
}

function composite(target: Surface, src: Surface, op: GlobalCompositeOperation, x = 0, y = 0) {
  const ctx = context(target);
  ctx.save();
  ctx.globalCompositeOperation = op;
  ctx.drawImage(src, x, y);
  ctx.restore();
}

/** Fill the visible pixels of a mask with a colour, keeping their alpha. */
function tint(mask: Surface, color: string): void {
  const ctx = context(mask);
  ctx.save();
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, mask.width, mask.height);
  ctx.restore();
}

/** The silhouette grown by `r` surface pixels (a new surface of the same size). */
function dilate(src: Surface, r: number, make: MakeSurface): Surface {
  const out = make(src.width, src.height);
  const ctx = context(out);
  ctx.drawImage(src, 0, 0);
  for (const p of strokeOffsets(r)) ctx.drawImage(src, p.x, p.y);
  return out;
}

/** Everything outside the silhouette, on a surface `margin` larger on every side. */
function inverse(src: Surface, margin: number, make: MakeSurface): Surface {
  const out = make(src.width + margin * 2, src.height + margin * 2);
  const ctx = context(out);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.globalCompositeOperation = "destination-out";
  ctx.drawImage(src, margin, margin);
  return out;
}

/** The silhouette shrunk by `r` surface pixels. */
function erode(k: Kit, src: Surface, r: number): Surface {
  if (r <= 0) return copyOf(k, src);
  const m = Math.ceil(r) + 2;
  const inv = inverse(src, m, k.make);
  const grown = dilate(inv, r, k.make);
  const out = copyOf(k, src);
  composite(out, grown, "destination-out", -m, -m);
  free(inv, grown);
  return out;
}

/**
 * The blurred, offset shadow of `src` in black (only the shadow: the image itself is drawn far
 * off the surface). `inset` is where the surface's origin lies inside `src`.
 */
function castShadow(
  k: Kit,
  src: Surface,
  blur: number,
  dx: number,
  dy: number,
  inset = 0,
): Surface {
  const out = blank(k);
  const ctx = context(out);
  const away = src.width + blur * 4 + Math.abs(dx) + 100;
  // Restored afterwards: a shadow left set would also be drawn by later fills on this surface.
  ctx.save();
  ctx.shadowColor = "#000";
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = dx + away;
  ctx.shadowOffsetY = dy;
  ctx.drawImage(src, -inset - away, -inset);
  ctx.restore();
  return out;
}

/** A shadow cast inside the silhouette from its edges: the shadow of everything outside it. */
function innerShade(
  k: Kit,
  sil: Surface,
  grow: number,
  blur: number,
  dx: number,
  dy: number,
): Surface {
  const margin = Math.ceil(blur * 2 + Math.abs(dx) + Math.abs(dy) + grow + 2);
  let outside = inverse(sil, margin, k.make);
  if (grow > 0) {
    const grown = dilate(outside, grow, k.make);
    free(outside);
    outside = grown;
  }
  const shade = castShadow(k, outside, blur, dx, dy, margin);
  free(outside);
  composite(shade, sil, "destination-in");
  return shade;
}

const SEED: Record<EffectKind, number> = {
  dropShadow: 1,
  innerShadow: 2,
  outerGlow: 3,
  innerGlow: 4,
  satin: 5,
  bevel: 6,
  colorOverlay: 7,
  gradientOverlay: 8,
  patternOverlay: 9,
  stroke: 10,
};

/** Contour, range and noise applied to an effect's alpha (skipped when they change nothing). */
function shapeAlpha(
  mask: Surface,
  contour: Contour,
  antiAlias: boolean,
  noise: number,
  seed: number,
  range = 0.5,
): void {
  const plain = isLinearContour(contour) && range === 0.5;
  if (plain && noise <= 0) return;
  mapAlpha(mask, plain ? null : contourLut(contour, antiAlias, range), noise, seed);
}

/** Colour a glow: one colour, or a gradient from the edge (first stop) outwards. */
function paintGlow(mask: Surface, fill: GlowFill, jitter: number, seed: number): void {
  if (fill.kind === "color") return tint(mask, fill.color);
  const ctx = context(mask, true);
  if (!canReadPixels(ctx)) return tint(mask, fill.stops[0].color);
  const [r, g, b] = gradientLut(fill.stops, fill.reverse);
  const image = ctx.getImageData(0, 0, mask.width, mask.height);
  const d = image.data;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    if (d[i + 3] === 0) continue;
    let t = 255 - d[i + 3];
    if (jitter > 0) t += (hashNoise(p, seed) - 0.5) * jitter * 255;
    const v = Math.min(255, Math.max(0, Math.round(t)));
    d[i] = r[v];
    d[i + 1] = g[v];
    d[i + 2] = b[v];
  }
  ctx.putImageData(image, 0, 0);
}

/** Spread (or choke) and blur for a size: "precise" glows keep a harder edge. */
function spreadAndBlur(size: number, fraction: number, precise = false) {
  let grow = size * fraction;
  let blur = size - grow;
  if (precise) {
    grow += blur / 2;
    blur /= 2;
  }
  return { grow, blur };
}

// ---------------------------------------------------------------------------------------------
// Effects

function dropShadow(k: Kit, content: Surface, e: DropShadowEffect): Surface {
  const { grow, blur } = spreadAndBlur(e.size * k.scale, e.spread);
  const { dx, dy } = shadowOffset(effectAngle(e, k.light), e.distance * k.scale);
  const base = grow > 0 ? dilate(content, grow, k.make) : content;
  const mask = castShadow(k, base, blur, dx, dy);
  if (base !== content) free(base);
  shapeAlpha(mask, e.contour, e.antiAlias, e.noise, SEED.dropShadow);
  tint(mask, e.color);
  if (e.knockout) composite(mask, content, "destination-out");
  return mask;
}

function outerGlow(k: Kit, content: Surface, e: OuterGlowEffect): Surface {
  const { grow, blur } = spreadAndBlur(e.size * k.scale, e.spread, e.technique === "precise");
  const base = grow > 0 ? dilate(content, grow, k.make) : content;
  const mask = castShadow(k, base, blur, 0, 0);
  if (base !== content) free(base);
  shapeAlpha(mask, e.contour, e.antiAlias, e.noise, SEED.outerGlow, e.range);
  paintGlow(mask, e.fill, e.jitter, SEED.outerGlow);
  return mask;
}

function innerShadow(k: Kit, content: Surface, e: InnerShadowEffect): Surface {
  const { grow, blur } = spreadAndBlur(e.size * k.scale, e.choke);
  const { dx, dy } = shadowOffset(effectAngle(e, k.light), e.distance * k.scale);
  const mask = innerShade(k, content, grow, blur, dx, dy);
  shapeAlpha(mask, e.contour, e.antiAlias, e.noise, SEED.innerShadow);
  tint(mask, e.color);
  return mask;
}

function innerGlow(k: Kit, content: Surface, e: InnerGlowEffect): Surface {
  const { grow, blur } = spreadAndBlur(e.size * k.scale, e.choke, e.technique === "precise");
  let mask = innerShade(k, content, grow, blur, 0, 0);
  if (e.source === "center") {
    const center = copyOf(k, content);
    composite(center, mask, "destination-out");
    free(mask);
    mask = center;
  }
  shapeAlpha(mask, e.contour, e.antiAlias, e.noise, SEED.innerGlow, e.range);
  paintGlow(mask, e.fill, e.jitter, SEED.innerGlow);
  return mask;
}

/** Satin: two blurred copies of the shape, offset both ways; their difference through a contour. */
function satin(k: Kit, content: Surface, e: SatinEffect): Surface | null {
  const blur = e.size * k.scale;
  const { dx, dy } = shadowOffset(e.angle, e.distance * k.scale);
  const a = castShadow(k, content, blur, dx, dy);
  const b = castShadow(k, content, blur, -dx, -dy);
  const out = blank(k);
  const octx = context(out, true);
  if (!canReadPixels(octx)) {
    free(a, b, out);
    return null;
  }
  const lut = contourLut(e.contour, e.antiAlias);
  const ad = context(a, true).getImageData(0, 0, k.w, k.h).data;
  const bd = context(b, true).getImageData(0, 0, k.w, k.h).data;
  const sd = context(content, true).getImageData(0, 0, k.w, k.h).data;
  const [cr, cg, cb] = hexToRgb(e.color);
  const image = octx.createImageData(k.w, k.h);
  const d = image.data;
  for (let i = 3; i < d.length; i += 4) {
    if (sd[i] === 0) continue;
    let v = lut[Math.abs(ad[i] - bd[i])];
    if (e.invert) v = 255 - v;
    d[i - 3] = cr;
    d[i - 2] = cg;
    d[i - 1] = cb;
    d[i] = (v * sd[i]) / 255;
  }
  octx.putImageData(image, 0, 0);
  free(a, b);
  return out;
}

function overlay<K extends "colorOverlay" | "gradientOverlay" | "patternOverlay">(
  k: Kit,
  kind: K,
  e: EffectByKind[K],
): Surface {
  const out = blank(k);
  const ctx = context(out);
  if (kind === "colorOverlay") {
    ctx.fillStyle = (e as EffectByKind["colorOverlay"]).color;
    ctx.fillRect(0, 0, k.w, k.h);
  } else if (kind === "gradientOverlay") {
    const g = e as EffectByKind["gradientOverlay"];
    fillGradient(ctx, out, g.align ? k.box : k.canvasBox, g);
    if (g.dither) dither(out);
  } else {
    const p = e as EffectByKind["patternOverlay"];
    const box = p.align ? k.box : k.canvasBox;
    fillPattern(ctx, out, k.make, {
      pattern: p.pattern,
      scale: p.scale * k.scale,
      angle: p.angle,
      originX: box.x + p.offsetX * k.scale,
      originY: box.y + p.offsetY * k.scale,
    });
  }
  return out;
}

/** A stroke's area and its painted pixels. */
function stroke(k: Kit, content: Surface, e: StrokeEffect): { area: Surface; paint: Surface } {
  const size = e.size * k.scale;
  let area: Surface;
  if (e.position === "outside") {
    area = dilate(content, size, k.make);
    composite(area, content, "destination-out");
  } else {
    const reach = e.position === "inside" ? 0 : size / 2;
    const inner = erode(k, content, e.position === "inside" ? size : size / 2);
    area = reach > 0 ? dilate(content, reach, k.make) : copyOf(k, content);
    composite(area, inner, "destination-out");
    free(inner);
  }
  const paint = copyOf(k, area);
  if (e.fill.kind === "color") {
    tint(paint, e.fill.color);
  } else {
    const fill = blank(k);
    fillGradient(context(fill), fill, k.box, {
      ...e.fill,
      method: "classic",
      offsetX: 0,
      offsetY: 0,
    });
    composite(fill, paint, "destination-in");
    free(paint);
    return { area, paint: fill };
  }
  return { area, paint };
}

/** The outer silhouette of the strokes (for Stroke Emboss). */
function strokeSilhouette(k: Kit, content: Surface, strokes: readonly StrokeEffect[]): Surface {
  const reach = Math.max(
    0,
    ...strokes.map((s) =>
      s.position === "outside" ? s.size : s.position === "center" ? s.size / 2 : 0,
    ),
  );
  return reach > 0 ? dilate(content, reach * k.scale, k.make) : copyOf(k, content);
}

/** Bevel & Emboss: highlight and shadow masks lit from the effect's angle and altitude. */
function bevel(
  k: Kit,
  content: Surface,
  e: BevelEffect,
  strokeArea: Surface | null,
  strokeOuter: Surface | null,
): EffectPass[] {
  const size = e.size * k.scale;
  if (size <= 0) return [];
  const angle = effectAngle(e, k.light);
  const altitude = e.useGlobalLight ? k.light.altitude : e.altitude;
  const lift = Math.cos((altitude * Math.PI) / 180) / Math.cos(Math.PI / 6);
  const sharp = e.technique === "chisel-hard" ? 0.3 : e.technique === "chisel-soft" ? 0.6 : 1;
  const soften = e.soften * k.scale;
  const up = e.direction === "up";

  const hi = blank(k);
  const lo = blank(k);
  // Light falls on the inside edges that face it: the shade of the outside, shifted away.
  const inner = (sil: Surface, part: number, flip: boolean, clip?: Surface) => {
    const d = (size / 2) * part * lift;
    const blur = size * part * sharp + soften;
    const lit = shadowOffset(angle, d);
    const dark = shadowOffset(angle + 180, d);
    const [h, l] = up !== flip ? [lit, dark] : [dark, lit];
    for (const [target, o] of [
      [hi, h],
      [lo, l],
    ] as const) {
      const m = innerShade(k, sil, 0, blur, o.dx, o.dy);
      if (clip) composite(m, clip, "destination-in");
      composite(target, m, "source-over");
      free(m);
    }
  };
  // Outside, the ground rises towards the shape: lit on the side facing the light.
  const outer = (part: number, flip: boolean) => {
    const d = (size / 2) * part * lift;
    const blur = size * part * sharp + soften;
    const toLight = shadowOffset(angle + 180, d);
    const fromLight = shadowOffset(angle, d);
    const [h, l] = up !== flip ? [toLight, fromLight] : [fromLight, toLight];
    for (const [target, o] of [
      [hi, h],
      [lo, l],
    ] as const) {
      const m = castShadow(k, content, blur, o.dx, o.dy);
      composite(m, content, "destination-out");
      composite(target, m, "source-over");
      free(m);
    }
  };
  switch (e.style) {
    case "inner":
      inner(content, 1, false);
      break;
    case "outer":
      outer(1, false);
      break;
    case "emboss":
      inner(content, 0.5, false);
      outer(0.5, false);
      break;
    case "pillow":
      inner(content, 0.5, false);
      outer(0.5, true);
      break;
    case "stroke":
      if (!strokeArea || !strokeOuter) {
        free(hi, lo);
        return [];
      }
      inner(strokeOuter, 1, false, strokeArea);
      break;
  }

  // Gloss contour, the Contour sub-page and depth reshape both masks.
  const gloss = !isLinearContour(e.glossContour);
  const shape =
    e.contour.enabled && !(isLinearContour(e.contour.contour) && e.contour.range === 0.5);
  if (gloss || shape || e.depth !== 1) {
    const g = contourLut(e.glossContour, e.glossAntiAlias);
    const c = contourLut(e.contour.contour, e.contour.antiAlias, e.contour.range);
    const lut = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) {
      const v = gloss ? g[shape ? c[i] : i] : shape ? c[i] : i;
      lut[i] = Math.min(255, v * Math.min(e.depth, 10));
    }
    mapAlpha(hi, lut);
    mapAlpha(lo, lut);
  }
  if (e.texture.enabled) addTexture(k, content, e, angle, hi, lo);

  tint(hi, e.highlightColor);
  tint(lo, e.shadowColor);
  return [
    { surface: lo, blendMode: e.shadowMode, opacity: e.shadowOpacity },
    { surface: hi, blendMode: e.highlightMode, opacity: e.highlightOpacity },
  ];
}

/** Bevel texture: the pattern's relief, lit from the same angle, added inside the shape. */
function addTexture(
  k: Kit,
  content: Surface,
  e: BevelEffect,
  angle: number,
  hi: Surface,
  lo: Surface,
): void {
  const t = e.texture;
  const hctx = context(hi, true);
  if (!canReadPixels(hctx)) return;
  const box = t.align ? k.box : k.canvasBox;
  const step = shadowOffset(angle + 180, Math.max(1, k.scale));
  const sample = (dx: number, dy: number) => {
    const s = blank(k);
    fillPattern(context(s), s, k.make, {
      pattern: t.pattern,
      scale: t.scale * k.scale,
      angle: 0,
      originX: box.x + t.offsetX * k.scale + dx,
      originY: box.y + t.offsetY * k.scale + dy,
    });
    const data = context(s, true).getImageData(0, 0, k.w, k.h).data;
    free(s);
    return data;
  };
  const here = sample(0, 0);
  const lit = sample(step.dx, step.dy);
  const sil = context(content, true).getImageData(0, 0, k.w, k.h).data;
  const lctx = context(lo, true);
  const hImage = hctx.getImageData(0, 0, k.w, k.h);
  const lImage = lctx.getImageData(0, 0, k.w, k.h);
  const depth = (t.invert ? -1 : 1) * t.depth;
  for (let i = 3; i < sil.length; i += 4) {
    if (sil[i] === 0) continue;
    const relief = ((lit[i - 3] - here[i - 3]) / 255) * depth * (sil[i] / 255) * 255;
    if (relief > 0) hImage.data[i] = Math.min(255, hImage.data[i] + relief);
    else lImage.data[i] = Math.min(255, lImage.data[i] - relief);
  }
  hctx.putImageData(hImage, 0, 0);
  lctx.putImageData(lImage, 0, 0);
}

// ---------------------------------------------------------------------------------------------
// The whole style

/** Enabled copies, bottom first (the first copy in the list is drawn on top). */
function bottomUp<K extends EffectKind>(effects: LayerEffects, kind: K): EffectByKind[K][] {
  return effectList(effects, kind)
    .filter((e) => e.enabled)
    .reverse();
}

/** `content` with full opacity wherever it has any: interior effects are clipped to it. */
function solid(k: Kit, content: Surface): Surface {
  const out = blank(k);
  const ctx = context(out);
  for (let i = 0; i < 8; i++) ctx.drawImage(content, 0, 0);
  return out;
}

function drawPass(target: Surface, pass: EffectPass): void {
  const ctx = context(target);
  ctx.save();
  ctx.globalAlpha = pass.opacity;
  ctx.globalCompositeOperation = compositeOperation(pass.blendMode);
  ctx.drawImage(pass.surface, 0, 0);
  ctx.restore();
}

function kit(content: Surface, env: EffectEnv): Kit {
  const { width: w, height: h } = content;
  const whole = { x: 0, y: 0, width: w, height: h };
  const usable = (b: Box | undefined) => (b && b.width >= 1 && b.height >= 1 ? b : whole);
  return {
    make: env.createSurface,
    w,
    h,
    scale: env.scale ?? 1,
    box: usable(env.box),
    canvasBox: usable(env.canvasBox ?? env.box),
    light: env.light ?? DEFAULT_GLOBAL_LIGHT,
  };
}

/**
 * Render a layer's style from `content` (the layer already rendered and masked on a
 * render-space surface). The caller draws `below` with each pass's blend mode, then `body`
 * with the layer's own blend mode — or flattens both with {@link renderWithEffects}.
 */
export function renderLayerStyle(
  content: Surface,
  effects: LayerEffects,
  env: EffectEnv,
): StyledLayer {
  const k = kit(content, env);
  const fill = env.fillOpacity ?? 1;

  const below: EffectPass[] = [];
  for (const e of bottomUp(effects, "dropShadow")) {
    below.push({ surface: dropShadow(k, content, e), blendMode: e.blendMode, opacity: e.opacity });
  }
  for (const e of bottomUp(effects, "outerGlow")) {
    below.push({ surface: outerGlow(k, content, e), blendMode: e.blendMode, opacity: e.opacity });
  }

  const interior: EffectPass[] = [];
  const add = (surface: Surface | null, e: { blendMode: BlendMode; opacity: number }) => {
    if (surface) interior.push({ surface, blendMode: e.blendMode, opacity: e.opacity });
  };
  for (const e of bottomUp(effects, "patternOverlay")) add(overlay(k, "patternOverlay", e), e);
  for (const e of bottomUp(effects, "gradientOverlay")) add(overlay(k, "gradientOverlay", e), e);
  for (const e of bottomUp(effects, "colorOverlay")) add(overlay(k, "colorOverlay", e), e);
  for (const e of bottomUp(effects, "satin")) add(satin(k, content, e), e);
  for (const e of bottomUp(effects, "innerGlow")) add(innerGlow(k, content, e), e);
  for (const e of bottomUp(effects, "innerShadow")) add(innerShadow(k, content, e), e);

  const body = blank(k);
  const bctx = context(body);
  if (interior.length) {
    // Effects inside the shape are not faded by Fill: build on a solid shape, then cut it to
    // the content's own coverage.
    const shape = solid(k, content);
    bctx.globalAlpha = fill;
    bctx.drawImage(shape, 0, 0);
    bctx.globalAlpha = 1;
    for (const pass of interior) {
      composite(pass.surface, shape, "destination-in");
      drawPass(body, pass);
      free(pass.surface);
    }
    composite(body, content, "destination-in");
    free(shape);
  } else {
    bctx.globalAlpha = fill;
    bctx.drawImage(content, 0, 0);
    bctx.globalAlpha = 1;
  }

  const strokes = bottomUp(effects, "stroke");
  let strokeArea: Surface | null = null;
  for (const e of strokes) {
    const { area, paint } = stroke(k, content, e);
    if (!e.overprint) composite(body, area, "destination-out");
    drawPass(body, { surface: paint, blendMode: e.blendMode, opacity: e.opacity });
    if (strokeArea) composite(strokeArea, area, "source-over");
    else strokeArea = copyOf(k, area);
    free(area, paint);
  }

  const bevels = bottomUp(effects, "bevel");
  if (bevels.length) {
    const outer = strokes.length ? strokeSilhouette(k, content, strokes) : null;
    for (const e of bevels) {
      for (const pass of bevel(k, content, e, strokeArea, outer)) {
        drawPass(body, pass);
        free(pass.surface);
      }
    }
    free(outer);
  }
  free(strokeArea);
  return { below, body };
}

/** Draw a styled layer's `below` passes and body onto one new surface. */
export function flattenStyle(styled: StyledLayer, make: MakeSurface): Surface {
  const { width, height } = styled.body;
  const out = make(width, height);
  for (const pass of styled.below) drawPass(out, pass);
  context(out).drawImage(styled.body, 0, 0);
  releaseStyle(styled);
  return out;
}

export function releaseStyle(styled: StyledLayer): void {
  for (const pass of styled.below) free(pass.surface);
  free(styled.body);
}

/** `content` with its effects, flattened onto a new surface. */
export function renderWithEffects(
  content: Surface,
  effects: LayerEffects,
  env: EffectEnv,
): Surface {
  return flattenStyle(renderLayerStyle(content, effects, env), env.createSurface);
}
