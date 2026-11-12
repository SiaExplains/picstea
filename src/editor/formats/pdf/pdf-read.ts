import { checkDimensions } from "../../core/document/limits";
import { msg } from "../../core/message";
import { FormatError } from "../binary/bytes";

/**
 * Opening PDFs (ADR-0045) with PDF.js, served unmodified from /vendor and loaded the first time a
 * PDF is opened. Everything stays on the device: the worker, character maps, fonts and image
 * decoders are all same-origin files, eval is off, and PDF.js never fetches anything else. A page
 * becomes a picture at the chosen resolution.
 */

export const PDFJS_BASE = "/vendor/pdfjs/6.4.299/";

/** The subset of PDF.js this module uses. */
interface PdfJs {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument(params: Record<string, unknown>): {
    promise: Promise<PdfDocumentProxy>;
    destroy(): Promise<void>;
  };
}
interface PdfDocumentProxy {
  numPages: number;
  getPage(n: number): Promise<PdfPageProxy>;
}
interface PdfPageProxy {
  getViewport(params: { scale: number }): { width: number; height: number };
  render(params: Record<string, unknown>): { promise: Promise<void> };
  cleanup(): void;
}

let cached: Promise<PdfJs> | null = null;

function loadPdfJs(): Promise<PdfJs> {
  cached ??= import(
    /* turbopackIgnore: true */ /* webpackIgnore: true */ `${PDFJS_BASE}pdf.min.mjs`
  ).then((mod: PdfJs) => {
    mod.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}pdf.worker.min.mjs`;
    return mod;
  });
  cached.catch(() => {
    cached = null;
  });
  return cached;
}

export interface PdfFile {
  readonly pageCount: number;
  /** Page size in points (1/72 inch). */
  pageSize(page: number): Promise<{ width: number; height: number }>;
  /** Draw a page at `ppi` onto a new canvas. */
  render(page: number, ppi: number): Promise<HTMLCanvasElement>;
  close(): void;
}

function friendly(error: unknown): FormatError {
  const name = (error as { name?: string } | null)?.name;
  if (name === "PasswordException") {
    return new FormatError(
      "This PDF is protected with a password. Remove the password, then open it again.",
    );
  }
  if (name === "InvalidPDFException") return new FormatError("The PDF file is damaged.");
  if (error instanceof FormatError) return error;
  return new FormatError("The PDF could not be opened.");
}

export async function openPdf(bytes: Uint8Array): Promise<PdfFile> {
  let pdfjs: PdfJs;
  try {
    pdfjs = await loadPdfJs();
  } catch {
    throw new FormatError(
      "The PDF reader could not be loaded. Check your connection and try again.",
    );
  }
  let doc: PdfDocumentProxy;
  let task: ReturnType<PdfJs["getDocument"]> | null = null;
  try {
    task = pdfjs.getDocument({
      // A copy: PDF.js hands its data to its worker, which would empty the caller's bytes.
      data: bytes.slice(),
      cMapUrl: `${PDFJS_BASE}cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `${PDFJS_BASE}standard_fonts/`,
      wasmUrl: `${PDFJS_BASE}wasm/`,
      iccUrl: `${PDFJS_BASE}iccs/`,
      isEvalSupported: false,
      enableXfa: false,
      // Never reach out to the network for anything the file references.
      disableAutoFetch: true,
      disableStream: true,
    });
    doc = await task.promise;
  } catch (error) {
    void task?.destroy();
    throw friendly(error);
  }
  const loading = task;
  return {
    pageCount: doc.numPages,
    async pageSize(n) {
      const page = await doc.getPage(n);
      const { width, height } = page.getViewport({ scale: 1 });
      return { width, height };
    },
    async render(n, ppi) {
      try {
        const page = await doc.getPage(n);
        const viewport = page.getViewport({ scale: ppi / 72 });
        const width = Math.round(viewport.width);
        const height = Math.round(viewport.height);
        const size = checkDimensions(width, height);
        if (!size.ok) {
          throw new FormatError(
            msg("Page {page} is too large at {ppi} ppi. Choose a lower resolution.", {
              page: n,
              ppi,
            }),
          );
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new FormatError("2D canvas is not available.");
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        page.cleanup();
        return canvas;
      } catch (error) {
        throw friendly(error);
      }
    },
    close() {
      // The document is freed through its loading task (PDF.js 6).
      void loading.destroy();
    },
  };
}
