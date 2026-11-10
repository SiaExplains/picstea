import { walkLayers } from "../core/document/tree";
import type { DocumentFont, EditorDocument, Layer } from "../core/document/types";
import { Observable } from "../core/observable";
import { BUNDLED_FONTS, isSystemFont, type BundledFont } from "./font-catalog";
import { styleFromName } from "./font-file";

/**
 * Loads the fonts text layers use into the page (or a worker) with the CSS Font Loading API
 * (ADR-0040). Bundled Google Fonts come from Picstea's own /fonts folder, fonts on this computer
 * through `local()`, uploaded fonts from their bytes — nothing is fetched from another site.
 */

/** The parts of the Font Loading API used here; injected so this module runs anywhere. */
export interface FontEnvironment {
  add(face: FontFace): void;
  createFace(
    family: string,
    source: string | ArrayBuffer,
    descriptors: FontFaceDescriptors,
  ): FontFace;
}

/** A font installed on this computer, from the Local Font Access API. */
export interface LocalFont {
  readonly family: string;
  readonly postscriptName: string;
  readonly weight: 400 | 700;
  readonly italic: boolean;
}

export interface FaceRequest {
  readonly family: string;
  readonly weight: 400 | 700;
  readonly italic: boolean;
}

const faceKey = (f: FaceRequest) => `${f.family}|${f.weight}|${f.italic ? "i" : "n"}`;

/** Every family/weight/style the document's text layers draw (smart object contents too). */
export function usedFaces(doc: Pick<EditorDocument, "layers">): FaceRequest[] {
  const out = new Map<string, FaceRequest>();
  const add = (f: FaceRequest) => out.set(faceKey(f), f);
  const visit = (layers: readonly Layer[]) =>
    walkLayers(layers, (layer) => {
      if (layer.kind === "smart") visit(layer.content.layers);
      if (layer.kind !== "text") return;
      add({ family: layer.fontFamily, weight: layer.fontWeight, italic: layer.italic });
      for (const run of layer.runs) {
        add({
          family: run.style.fontFamily ?? layer.fontFamily,
          weight: run.style.fontWeight ?? layer.fontWeight,
          italic: run.style.italic ?? layer.italic,
        });
      }
    });
  visit(doc.layers);
  return [...out.values()];
}

export class FontLibrary {
  /** Bumped when a face finishes loading: text measurements and drawings must be redone. */
  readonly version = new Observable(0);
  /** Fonts on this computer, once the user allowed access (Chromium only). */
  readonly localFonts = new Observable<readonly LocalFont[] | null>(null);
  private readonly faces = new Map<string, Promise<boolean>>();
  /** Uploaded font bytes already registered, by asset id. */
  private readonly uploaded = new Map<string, Promise<boolean>>();

  constructor(
    private readonly env: FontEnvironment | null,
    readonly bundled: readonly BundledFont[] = BUNDLED_FONTS,
  ) {}

  bundledFont(family: string): BundledFont | undefined {
    return this.bundled.find((f) => f.family === family);
  }

  /** Load one bundled face (the nearest style the family has). False if it isn't bundled. */
  loadBundled(request: FaceRequest): Promise<boolean> {
    const font = this.bundledFont(request.family);
    if (!font || !this.env) return Promise.resolve(false);
    const face =
      font.faces.find((f) => f.weight === request.weight && f.italic === request.italic) ??
      font.faces.find((f) => f.italic === request.italic) ??
      font.faces.find((f) => f.weight === request.weight) ??
      font.faces[0];
    return this.register(
      { family: font.family, weight: face.weight, italic: face.italic },
      `url(${face.url})`,
    );
  }

  /** Register a font installed on this computer by PostScript name. */
  loadLocal(font: FaceRequest & { postscriptName: string }): Promise<boolean> {
    return this.register(font, `local("${font.postscriptName.replace(/["\\]/g, "")}")`);
  }

  /** Register an uploaded font's bytes; false when the browser can't read the file. */
  loadUploaded(
    assetId: string,
    font: FaceRequest,
    read: () => Promise<Blob | null>,
  ): Promise<boolean> {
    let pending = this.uploaded.get(assetId);
    if (!pending) {
      pending = read().then(async (blob) => {
        if (!blob) return false;
        return this.register(font, await blob.arrayBuffer());
      });
      this.uploaded.set(assetId, pending);
    }
    return pending;
  }

  /** Check font bytes load as a font, without keeping them. */
  async validate(data: ArrayBuffer): Promise<boolean> {
    if (!this.env) return false;
    try {
      await this.env.createFace("picstea-font-check", data, {}).load();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load everything the document's text needs. Resolves when every face has loaded or failed;
   * `missing` lists families that are neither system, bundled nor listed in `doc.fonts`.
   */
  async loadForDocument(
    doc: Pick<EditorDocument, "layers" | "fonts">,
    readAsset: (assetId: string) => Promise<Blob | null>,
  ): Promise<{ missing: string[] }> {
    const missing = new Set<string>();
    const jobs: Promise<boolean>[] = [];
    for (const font of doc.fonts ?? []) {
      jobs.push(this.loadDocumentFont(font, readAsset));
    }
    for (const face of usedFaces(doc)) {
      if (isSystemFont(face.family)) continue;
      if (this.bundledFont(face.family)) {
        jobs.push(this.loadBundled(face));
        continue;
      }
      if (!(doc.fonts ?? []).some((f) => f.family === face.family)) missing.add(face.family);
    }
    await Promise.all(jobs);
    return { missing: [...missing] };
  }

  private loadDocumentFont(
    font: DocumentFont,
    readAsset: (assetId: string) => Promise<Blob | null>,
  ): Promise<boolean> {
    switch (font.source) {
      case "bundled":
        return this.loadBundled(font);
      case "local":
        return font.postscriptName
          ? this.loadLocal({ ...font, postscriptName: font.postscriptName })
          : Promise.resolve(false);
      case "uploaded":
        return font.assetId
          ? this.loadUploaded(font.assetId, font, () => readAsset(font.assetId!))
          : Promise.resolve(false);
    }
  }

  /**
   * Ask for the fonts installed on this computer (Local Font Access API, Chromium). The browser
   * shows its own permission prompt. Null when the API is missing or access was refused.
   */
  async queryLocalFonts(): Promise<readonly LocalFont[] | null> {
    const query = (
      globalThis as {
        queryLocalFonts?: () => Promise<
          { family: string; postscriptName: string; style: string }[]
        >;
      }
    ).queryLocalFonts;
    if (typeof query !== "function") return null;
    try {
      const data = await query();
      const fonts = new Map<string, LocalFont>();
      for (const item of data) {
        const style = styleFromName(item.style);
        const font: LocalFont = {
          family: item.family,
          postscriptName: item.postscriptName,
          ...style,
        };
        fonts.set(faceKey(font), font);
      }
      const list = [...fonts.values()].sort((a, b) => a.family.localeCompare(b.family));
      this.localFonts.set(list);
      return list;
    } catch {
      return null;
    }
  }

  private register(request: FaceRequest, source: string | ArrayBuffer): Promise<boolean> {
    const key = faceKey(request);
    const existing = this.faces.get(key);
    if (existing) return existing;
    const env = this.env;
    if (!env) return Promise.resolve(false);
    const pending = (async () => {
      try {
        const face = env.createFace(request.family, source, {
          weight: String(request.weight),
          style: request.italic ? "italic" : "normal",
        });
        await face.load();
        env.add(face);
        this.version.update((n) => n + 1);
        return true;
      } catch {
        // A failed face may be retried later (e.g. a local font installed meanwhile).
        this.faces.delete(key);
        return false;
      }
    })();
    this.faces.set(key, pending);
    return pending;
  }
}

/** The Font Loading API of this page or worker, or null where there is none. */
export function browserFontEnvironment(): FontEnvironment | null {
  const scope = globalThis as unknown as { fonts?: FontFaceSet; document?: Document };
  const set = scope.document?.fonts ?? scope.fonts;
  if (!set || typeof FontFace === "undefined") return null;
  return {
    add: (face) => set.add(face),
    createFace: (family, source, descriptors) => new FontFace(family, source, descriptors),
  };
}
