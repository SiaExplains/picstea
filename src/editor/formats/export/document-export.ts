import type { EditorDocument } from "../../core/document/types";
import type { PixelEnv } from "../../pixels/layer-pixels";
import { rasterizeToDataUrl, renderBitmap } from "../layer-render";
import { documentToPsdDraft } from "../psd/psd-convert";
import { draftBitmaps } from "../psd/psd-draft";
import { mainThreadRunner, type JobRunner } from "../../workers/job-runner";
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
  jobs: JobRunner = mainThreadRunner,
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
      const bitmap = await renderBitmap(env, doc);
      const bytes = await jobs.run("pdfEncode", { bitmap, ppi: doc.resolution, title: doc.name }, [
        bitmap,
      ]);
      return { blob: bytesBlob(bytes, mime), warnings: [] };
    }
    case "psd": {
      // Layers are drawn here (GPU); reading pixels back and encoding run in the worker.
      const { draft, warnings } = await documentToPsdDraft(env, doc);
      const bytes = await jobs.run("psdEncode", draft, draftBitmaps(draft));
      return { blob: bytesBlob(bytes, mime), warnings };
    }
  }
}
