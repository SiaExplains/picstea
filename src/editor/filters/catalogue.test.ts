import { describe, expect, it } from "vitest";
import type { RgbaPixels } from "../selection/flood";
import { median } from "./catalogue/noise";
import { colorToAlpha, hsbHsl, offset } from "./catalogue/other";
import { fourierTransform, inverseFourierTransform } from "./catalogue/fourier";
import { textureDilation } from "./catalogue/three-d";
import {
  applyLiquifyDab,
  createLiquifyField,
  isLiquifyFieldEmpty,
  parseLiquifyField,
  renderLiquify,
} from "./liquify";
import {
  defaultFilterValues,
  FILTER_GROUPS,
  FILTERS,
  filterById,
  parseFilterValues,
  runFilter,
} from "./registry";
import {
  invert3,
  isConvexQuad,
  parseVanishingPointEdit,
  project,
  renderVanishingPoint,
  squareToQuad,
} from "./vanishing-point";

function image(w: number, h: number, fn: (x: number, y: number) => number[]): RgbaPixels {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(fn(x, y), (y * w + x) * 4);
  return { width: w, height: h, data };
}

const at = (p: RgbaPixels, x: number, y: number) => {
  const i = (y * p.width + x) * 4;
  return [...p.data.slice(i, i + 4)];
};

/** A colourful test card with a transparent corner. */
const card = image(24, 17, (x, y) => [
  (x * 11) % 256,
  (y * 15) % 256,
  ((x + y) * 7) % 256,
  x < 3 && y < 3 ? 0 : 255,
]);

/** Every item in Photopea's Filter menu (the slider ones; Liquify and VP have their own editors). */
const PHOTOPEA_FILTERS = [
  "Filter Gallery",
  "Lens Correction",
  "Camera Raw",
  "Normal Map",
  "Texture Dilation",
  "Average",
  "Blur",
  "Blur More",
  "Box Blur",
  "Gaussian Blur",
  "Lens Blur",
  "Motion Blur",
  "Radial Blur",
  "Surface Blur",
  "Field Blur",
  "Iris Blur",
  "Tilt-Shift",
  "Path Blur",
  "Spin Blur",
  "Displace",
  "Kaleidoscope",
  "Pinch",
  "Polar Coordinates",
  "Ripple",
  "Shear",
  "Spherize",
  "Twirl",
  "Wave",
  "ZigZag",
  "Dents",
  "Color Halftone",
  "Crystallize",
  "Fragment",
  "Mezzotint",
  "Mosaic",
  "Pointillize",
  "Shape Mosaic",
  "Sharpen",
  "Sharpen Edges",
  "Sharpen More",
  "Smart Sharpen",
  "Unsharp Mask",
  "Diffuse",
  "Emboss",
  "Find Edges",
  "Oil Paint",
  "Solarize",
  "Trace Contour",
  "Wind",
  "Chromatic Aberration",
  "High Pass",
  "HSB/HSL",
  "Maximum",
  "Minimum",
  "Offset",
  "Repeat",
  "Color to Alpha",
  "Dither",
  "Particles",
  "Fourier Transform",
  "Inverse Fourier Transform",
];

describe("filter catalogue", () => {
  it("has every Photopea filter, in a known group, with unique ids", () => {
    const names = FILTERS.map((f) => f.name);
    for (const name of PHOTOPEA_FILTERS) expect(names).toContain(name);
    expect(new Set(FILTERS.map((f) => f.id)).size).toBe(FILTERS.length);
    for (const f of FILTERS) expect(FILTER_GROUPS).toContain(f.group);
  });

  it("keeps the ids saved projects already use", () => {
    for (const id of [
      "gaussian-blur",
      "box-blur",
      "motion-blur",
      "unsharp-mask",
      "add-noise",
      "pixelate",
      "emboss",
      "find-edges",
    ]) {
      expect(filterById(id)).toBeDefined();
    }
  });

  it("gives every parameter a valid default", () => {
    for (const f of FILTERS) expect(parseFilterValues(f, defaultFilterValues(f))).not.toBeNull();
  });

  it.each(FILTERS.map((f) => [f.name, f.id]))(
    "%s keeps the size, leaves its input alone and is deterministic",
    (_, id) => {
      const filter = filterById(id)!;
      const before = new Uint8ClampedArray(card.data);
      const values = defaultFilterValues(filter);
      const a = runFilter(id, card, values, { seed: 7 });
      const b = runFilter(id, card, values, { seed: 7 });
      expect(a.width).toBe(card.width);
      expect(a.height).toBe(card.height);
      expect(a.data.length).toBe(card.data.length);
      expect([...card.data]).toEqual([...before]);
      expect([...a.data]).toEqual([...b.data]);
    },
  );

  it("validates choice parameters", () => {
    const wind = filterById("wind")!;
    expect(parseFilterValues(wind, { method: 2, direction: 1 })).not.toBeNull();
    expect(parseFilterValues(wind, { method: 3, direction: 0 })).toBeNull();
    expect(parseFilterValues(wind, { method: 0.5, direction: 0 })).toBeNull();
    expect(parseFilterValues(wind, { method: "0", direction: 0 })).toBeNull();
  });
});

describe("filters", () => {
  it("median removes a single speck", () => {
    const speck = image(9, 9, (x, y) =>
      x === 4 && y === 4 ? [255, 255, 255, 255] : [10, 10, 10, 255],
    );
    expect(at(median(speck, 1), 4, 4)).toEqual([10, 10, 10, 255]);
  });

  it("offset wraps around", () => {
    const strip = image(4, 1, (x) => [x * 60, 0, 0, 255]);
    expect(at(offset(strip, 1, 0, "wrap"), 0, 0)[0]).toBe(180);
    expect(at(offset(strip, 1, 0, "transparent"), 0, 0)[3]).toBe(0);
  });

  it("color to alpha removes white and keeps other colours", () => {
    const out = colorToAlpha(
      image(2, 1, (x) => (x === 0 ? [255, 255, 255, 255] : [0, 0, 0, 255])),
      255,
      255,
      255,
      0,
    );
    expect(at(out, 0, 0)[3]).toBe(0);
    expect(at(out, 1, 0)).toEqual([0, 0, 0, 255]);
  });

  it("HSB conversion round-trips", () => {
    const back = hsbHsl(hsbHsl(card, 0), 2);
    for (let i = 0; i < card.data.length; i += 4) {
      if (card.data[i + 3] === 0) continue;
      for (let c = 0; c < 3; c++)
        expect(Math.abs(back.data[i + c] - card.data[i + c])).toBeLessThanOrEqual(6);
    }
  });

  it("Fourier transform and its inverse bring the image back closely", () => {
    const photo = image(20, 13, (x, y) => [
      128 + 100 * Math.sin(x / 3),
      90 + y * 5,
      200 - x * 4,
      255,
    ]);
    const back = inverseFourierTransform(fourierTransform(photo));
    let error = 0;
    for (let i = 0; i < photo.data.length; i += 4) {
      for (let c = 0; c < 3; c++) error += Math.abs(back.data[i + c] - photo.data[i + c]);
    }
    expect(error / (photo.width * photo.height * 3)).toBeLessThan(12);
  });

  it("texture dilation fills transparent pixels next to opaque ones", () => {
    const island = image(5, 1, (x) => (x === 2 ? [200, 10, 10, 255] : [0, 0, 0, 0]));
    const out = textureDilation(island, 1);
    expect(at(out, 1, 0)).toEqual([200, 10, 10, 255]);
    expect(at(out, 0, 0)[3]).toBe(0);
  });
});

describe("liquify", () => {
  it("an empty field changes nothing", () => {
    const field = createLiquifyField(card.width, card.height);
    expect(isLiquifyFieldEmpty(field)).toBe(true);
    const out = renderLiquify(card, field);
    for (let i = 0; i < card.data.length; i++) {
      if (card.data[i - (i % 4) + 3] === 0) continue;
      expect(Math.abs(out.data[i] - card.data[i])).toBeLessThanOrEqual(1);
    }
  });

  it("forward warp pushes pixels in the drag direction", () => {
    const bar = image(40, 40, (x) => (x < 20 ? [0, 0, 0, 255] : [255, 255, 255, 255]));
    const field = createLiquifyField(40, 40);
    for (let k = 0; k < 10; k++) {
      applyLiquifyDab(field, {
        tool: "forwardWarp",
        u: 0.45,
        v: 0.5,
        radius: 0.3,
        pressure: 1,
        du: 0.02,
        dv: 0,
      });
    }
    expect(isLiquifyFieldEmpty(field)).toBe(false);
    const out = renderLiquify(bar, field);
    // Black was pushed right across the edge.
    expect(at(out, 22, 20)[0]).toBeLessThan(128);
  });

  it("reconstruct brings the field back toward zero", () => {
    const field = createLiquifyField(40, 40);
    applyLiquifyDab(field, { tool: "bloat", u: 0.5, v: 0.5, radius: 0.3, pressure: 1 });
    const size = () => field.dx.reduce((s, v) => s + Math.abs(v), 0);
    const before = size();
    for (let k = 0; k < 20; k++)
      applyLiquifyDab(field, { tool: "reconstruct", u: 0.5, v: 0.5, radius: 0.5, pressure: 1 });
    expect(size()).toBeLessThan(before * 0.2);
  });

  it("rejects malformed fields", () => {
    expect(
      parseLiquifyField({
        cols: 2,
        rows: 2,
        aspect: 1,
        dx: new Float32Array(3),
        dy: new Float32Array(4),
      }),
    ).toBeNull();
    expect(parseLiquifyField(createLiquifyField(10, 10))).not.toBeNull();
  });
});

describe("vanishing point", () => {
  const quad = [10, 5, 90, 15, 80, 70, 20, 60];

  it("maps the unit square to the plane's corners and back", () => {
    const m = squareToQuad(quad)!;
    const inv = invert3(m)!;
    const out = new Float64Array(2);
    const unit = [0, 0, 1, 0, 1, 1, 0, 1];
    for (let k = 0; k < 4; k++) {
      project(m, unit[k * 2], unit[k * 2 + 1], out);
      expect(out[0]).toBeCloseTo(quad[k * 2], 6);
      expect(out[1]).toBeCloseTo(quad[k * 2 + 1], 6);
      project(inv, quad[k * 2], quad[k * 2 + 1], out);
      expect(out[0]).toBeCloseTo(unit[k * 2], 6);
      expect(out[1]).toBeCloseTo(unit[k * 2 + 1], 6);
    }
  });

  it("detects folded planes", () => {
    expect(isConvexQuad(quad)).toBe(true);
    expect(isConvexQuad([10, 5, 80, 70, 90, 15, 20, 60])).toBe(false);
  });

  it("clones inside the plane only", () => {
    // Left half red, right half blue; clone from the left into the right.
    const pic = image(40, 20, (x) => (x < 20 ? [255, 0, 0, 255] : [0, 0, 255, 255]));
    const out = renderVanishingPoint(pic, {
      corners: [0, 0, 1, 0, 1, 1, 0, 1],
      dabs: [{ stroke: 0, x: 0.75, y: 0.5, ox: -0.5, oy: 0, radius: 0.1, hardness: 1 }],
    });
    expect(at(out, 30, 10)[0]).toBeGreaterThan(200);
    expect(at(out, 38, 1)).toEqual([0, 0, 255, 255]);
  });

  it("overlapping soft dabs in one stroke don't build up", () => {
    const pic = image(40, 20, (x) => (x < 20 ? [255, 0, 0, 255] : [0, 0, 255, 255]));
    const dab = { stroke: 0, x: 0.75, y: 0.5, ox: -0.5, oy: 0, radius: 0.2, hardness: 0 };
    const corners = [0, 0, 1, 0, 1, 1, 0, 1] as const;
    const once = renderVanishingPoint(pic, { corners, dabs: [dab] });
    const repeated = renderVanishingPoint(pic, { corners, dabs: [dab, dab, dab, dab] });
    expect([...repeated.data]).toEqual([...once.data]);
    // A second stroke over the first does add up.
    const twice = renderVanishingPoint(pic, { corners, dabs: [dab, { ...dab, stroke: 1 }] });
    expect(at(twice, 34, 10)[0]).toBeGreaterThan(at(once, 34, 10)[0]);
  });

  it("rejects malformed edits", () => {
    expect(parseVanishingPointEdit({ corners: [0, 0, 1], dabs: [] })).toBeNull();
    expect(
      parseVanishingPointEdit({
        corners: [0, 0, 1, 0, 1, 1, 0, 1],
        dabs: [{ stroke: 0, x: 0, y: 0, ox: 0, oy: 0, radius: 0, hardness: 1 }],
      }),
    ).toBeNull();
  });
});
