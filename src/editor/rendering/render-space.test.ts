import { describe, expect, it } from "vitest";
import { createDocument, createFillLayer } from "../core/document/factory";
import type { Layer } from "../core/document/types";
import { pixelBudgetFor, DEFAULT_PIXEL_BUDGET_BYTES } from "../controller/editor-controller";
import { PrefixCache } from "./compositing/compositor";
import {
  covers,
  identitySpace,
  isIdentitySpace,
  renderScale,
  spaceFor,
  spaceTransform,
  viewRegion,
} from "./render-space";

const doc = { width: 6000, height: 4000 };

describe("render space", () => {
  it("picks power-of-two mip levels, never above 1:1", () => {
    expect(renderScale(0.2, 1)).toBe(0.25);
    expect(renderScale(0.2, 2)).toBe(0.5);
    expect(renderScale(0.5, 1)).toBe(0.5);
    expect(renderScale(3, 2)).toBe(1);
    expect(renderScale(0.0001, 1)).toBe(1 / 64);
  });

  it("renders only the visible region plus a margin, clipped to the document", () => {
    // 1000 × 800 screen showing the document at 25%, panned so x=2000..6000 is visible.
    const view = { zoom: 0.25, panX: -500, panY: 0 };
    const region = viewRegion(doc, view, { width: 1000, height: 800 })!;
    expect(region).toEqual({ x: 1000, y: 0, width: 5000, height: 4000 });
    expect(
      viewRegion(doc, { zoom: 1, panX: 5000, panY: 0 }, { width: 100, height: 100 }),
    ).toBeNull();
    expect(covers(region, doc, view, { width: 1000, height: 800 })).toBe(true);
    expect(covers(region, doc, { ...view, panX: 0 }, { width: 1000, height: 800 })).toBe(false);
  });

  it("maps document to surface pixels", () => {
    const space = spaceFor({ x: 100, y: 50, width: 401, height: 200 }, 0.5);
    expect([space.width, space.height]).toEqual([201, 100]);
    expect(spaceTransform(space)).toEqual([0.5, 0, 0, 0.5, -50, -25]);
    expect(isIdentitySpace(identitySpace(doc), doc)).toBe(true);
    expect(isIdentitySpace(space, doc)).toBe(false);
  });
});

describe("memory budget", () => {
  it("follows device memory within limits", () => {
    expect(pixelBudgetFor(undefined)).toBe(DEFAULT_PIXEL_BUDGET_BYTES);
    expect(pixelBudgetFor(4)).toBe(1024 * 1024 * 1024);
    expect(pixelBudgetFor(0.5)).toBe(256 * 1024 * 1024);
    expect(pixelBudgetFor(16)).toBe(1536 * 1024 * 1024);
  });
});

/** Minimal surfaces: only what PrefixCache touches. */
const fakeSurface = (width: number, height: number) =>
  ({
    width,
    height,
    getContext: () => ({ drawImage() {}, globalCompositeOperation: "source-over" }),
  }) as unknown as OffscreenCanvas;

describe("prefix cache", () => {
  const base = createDocument({ name: "x", width: 10, height: 10 });
  const a = createFillLayer("#000000", "a");
  const b = createFillLayer("#111111", "b");
  const c = createFillLayer("#222222", "c");
  const space = identitySpace(base);

  it("reuses the stored bottom layers while they stay the same objects", () => {
    const cache = new PrefixCache();
    const roots: Layer[] = [a, b, c];
    expect(cache.lookup(roots, space, 0)).toBe(0);
    cache.store([a, b], space, 0, fakeSurface(10, 10), fakeSurface);
    expect(cache.lookup(roots, space, 0)).toBe(2);
    // A changed layer below the cached part, another space or asset version: no reuse.
    expect(cache.lookup([{ ...a }, b, c], space, 0)).toBe(0);
    expect(cache.lookup(roots, { ...space, scale: 0.5 }, 0)).toBe(0);
    expect(cache.lookup(roots, space, 1)).toBe(0);
  });

  it("finds the first root layer that changed since the previous render", () => {
    const cache = new PrefixCache();
    cache.remember([a, b, c]);
    expect(cache.firstChange([a, b, c])).toBe(3);
    expect(cache.firstChange([a, { ...b }, c])).toBe(1);
    expect(cache.firstChange([a])).toBe(1);
    cache.clear();
    expect(cache.firstChange([a, b])).toBe(0);
  });
});
