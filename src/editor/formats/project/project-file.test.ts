import { describe, expect, it } from "vitest";
import { createDocument, createMask, createRasterLayer } from "../../core/document/factory";
import type { EditorDocument } from "../../core/document/types";
import { pngHeader } from "../../test-utils/image-bytes";
import { writeZip } from "../zip/zip";
import { looksLikeZip, readProjectFile, writeProjectFile } from "./project-file";

let n = 0;
const ids = (kind: string) => `${kind}_${++n}`;

function sample(): { doc: EditorDocument; png: Uint8Array } {
  const base = createDocument({ name: "Trip", width: 40, height: 30 });
  const layer = {
    ...createRasterLayer({ assetId: "asset_a", width: 4, height: 3, name: "Photo" }),
    mask: { ...createMask(base), assetId: "asset_m" },
  };
  return { doc: { ...base, layers: [...base.layers, layer] }, png: pngHeader(4, 3) };
}

const stored = (id: string, data: Uint8Array) => ({
  id,
  mime: "image/png" as const,
  width: 4,
  height: 3,
  blob: new Blob([data as BlobPart], { type: "image/png" }),
});

describe("MYLPER project files", () => {
  it("round-trips the document and its images with fresh ids", async () => {
    const { doc, png } = sample();
    const blob = await writeProjectFile(doc, [stored("asset_a", png), stored("asset_m", png)]);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(looksLikeZip(bytes)).toBe(true);

    const opened = await readProjectFile(bytes, ids);
    expect(opened.document.id).not.toBe(doc.id);
    expect(opened.document.name).toBe("Trip");
    const layer = opened.document.layers[1];
    expect(layer.kind === "raster" && layer.assetId).toBe(opened.assets[0].id);
    expect(layer.mask?.assetId).toBe(opened.assets[1].id);
    expect(opened.assets.map((a) => a.mime)).toEqual(["image/png", "image/png"]);
    expect(new Uint8Array(await opened.assets[0].blob.arrayBuffer())).toEqual(png);
  });

  it("refuses files that are not projects, or are missing images", async () => {
    const notProject = await writeZip([{ name: "readme.txt", data: new Uint8Array(3) }]);
    await expect(readProjectFile(notProject, ids)).rejects.toThrow(/not a MYLPER project/);

    const { doc, png } = sample();
    const partial = await writeProjectFile(doc, [stored("asset_a", png)]);
    await expect(readProjectFile(new Uint8Array(await partial.arrayBuffer()), ids)).rejects.toThrow(
      /missing some of its images/,
    );
  });

  it("validates the document and the image bytes", async () => {
    const { doc, png } = sample();
    const evil = { ...doc, layers: [{ ...doc.layers[1], opacity: 7 }] } as EditorDocument;
    const bad = await writeProjectFile(evil, [stored("asset_a", png), stored("asset_m", png)]);
    await expect(readProjectFile(new Uint8Array(await bad.arrayBuffer()), ids)).rejects.toThrow(
      /damaged/,
    );

    const notAnImage = new TextEncoder().encode("<svg onload=alert(1)>");
    const fake = await writeProjectFile(doc, [
      stored("asset_a", notAnImage),
      stored("asset_m", png),
    ]);
    await expect(readProjectFile(new Uint8Array(await fake.arrayBuffer()), ids)).rejects.toThrow(
      /damaged or too large/,
    );
  });
});
