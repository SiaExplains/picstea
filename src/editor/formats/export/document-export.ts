import type { EditorDocument } from "../../core/document/types";
import type { PixelEnv } from "../../pixels/layer-pixels";
import { rasterizeToDataUrl, renderRgba } from "../layer-render";
import { writePdf } from "../pdf/pdf-write";
import { documentToPsd } from "../psd/psd-convert";
import { writePsd } from "../psd/psd-write";
import { buildSvg } from "../svg/svg-export";
import { EXPORT_FORMATS, exportDocument, isRasterFormat, type ExportFormat } from "./raster-export";

/**
 * Export in any supported format (ADR-0011). Everything is produced on the device; nothing is
 * uploaded. `warnings` tell the user what a format could not keep.
 */

export interface ExportRequest {
  readonly format: ExportFormat;
  /** 0..1, lossy formats only. */
  readonly quality: number;
}

export interface ExportedFile {
  readonly blob: Blob;
  readonly warnings: readonly string[];
}

const bytesBlob = (bytes: Uint8Array, mime: string) =>
  new Blob([bytes as BlobPart], { type: mime });

export async function exportAs(
  env: PixelEnv,
  doc: EditorDocument,
  request: ExportRequest,
): Promise<ExportedFile> {
  const { format } = request;
  const mime = EXPORT_FORMATS[format].mime;
  if (isRasterFormat(format)) {
    const blob = await exportDocument(
      doc,
      env.assets,
      env.sizer,
      { format, quality: request.quality },
      env.createSurface,
    );
    return { blob, warnings: [] };
  }
  switch (format) {
    case "svg": {
      const result = await buildSvg(doc, env.sizer, (layers) =>
        rasterizeToDataUrl(env, doc, layers),
      );
      const warnings = result.flattened
        ? ["Adjustment layers can't be expressed in SVG, so the image was flattened."]
        : [];
      return { blob: new Blob([result.svg], { type: mime }), warnings };
    }
    case "pdf": {
      const rgba = renderRgba(env, doc);
      const count = doc.width * doc.height;
      const rgb = new Uint8Array(count * 3);
      const alpha = new Uint8Array(count);
      let opaque = true;
      for (let i = 0; i < count; i++) {
        rgb[i * 3] = rgba[i * 4];
        rgb[i * 3 + 1] = rgba[i * 4 + 1];
        rgb[i * 3 + 2] = rgba[i * 4 + 2];
        alpha[i] = rgba[i * 4 + 3];
        if (alpha[i] !== 255) opaque = false;
      }
      const bytes = await writePdf({
        width: doc.width,
        height: doc.height,
        ppi: doc.resolution,
        image: { kind: "lossless", rgb, alpha: opaque ? undefined : alpha },
        title: doc.name,
      });
      return { blob: bytesBlob(bytes, mime), warnings: [] };
    }
    case "psd": {
      const { file, warnings } = documentToPsd(env, doc);
      return { blob: bytesBlob(writePsd(file), mime), warnings };
    }
  }
}
