import type { RasterMime } from "../../assets/asset-store";
import { checkDimensions, MAX_IMPORT_FILE_BYTES } from "../../core/document/limits";
import { referencedAssetIds } from "../../core/document/queries";
import { mapLayersDeep } from "../../core/document/tree";
import type { EditorDocument, Layer } from "../../core/document/types";
import type { StoredAsset } from "../../persistence/project-storage";
import { deserializeProject, serializeDocument } from "../../serialization/serialization";
import { FormatError } from "../binary/bytes";
import { readImageHeader } from "../raster/image-header";
import { readZip, writeZip } from "../zip/zip";

/**
 * Portable MYLPER project files (`.mylper`, ADR-0011): a ZIP with `mylper.json` (the versioned,
 * validated serialization used for local storage) and the image assets under `assets/`.
 * Opening a file goes through exactly the same validation and migrations as IndexedDB.
 */

export const PROJECT_EXTENSION = "mylper";
export const PROJECT_MIME = "application/x-mylper";
const MANIFEST = "mylper.json";
const FORMAT_ID = "mylper-project";
const EXTENSIONS: Record<RasterMime, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

interface Manifest {
  readonly format: typeof FORMAT_ID;
  readonly project: unknown;
  readonly assets: readonly { id: string; path: string }[];
}

export async function writeProjectFile(
  doc: EditorDocument,
  assets: readonly StoredAsset[],
): Promise<Blob> {
  const files: { name: string; data: Uint8Array }[] = [];
  const list: { id: string; path: string }[] = [];
  for (const asset of assets) {
    const path = `assets/${asset.id}.${EXTENSIONS[asset.mime]}`;
    list.push({ id: asset.id, path });
    files.push({ name: path, data: new Uint8Array(await asset.blob.arrayBuffer()) });
  }
  const manifest: Manifest = { format: FORMAT_ID, project: serializeDocument(doc), assets: list };
  const json = new TextEncoder().encode(JSON.stringify(manifest));
  const zip = await writeZip([{ name: MANIFEST, data: json, compress: true }, ...files]);
  return new Blob([zip as BlobPart], { type: PROJECT_MIME });
}

/** True for data that starts like a ZIP archive (all project files do). */
export const looksLikeZip = (bytes: Uint8Array) =>
  bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4;

const MAX_ENTRIES = 2_000;
const MAX_MANIFEST_BYTES = 32 * 1024 * 1024;

export interface OpenedProject {
  readonly document: EditorDocument;
  readonly assets: readonly StoredAsset[];
}

/**
 * Read and validate a project file. Every id is replaced with a fresh one so an opened file can
 * never overwrite (or be confused with) a project or image already in this browser.
 */
export async function readProjectFile(
  bytes: Uint8Array,
  createId: (kind: "document" | "asset") => string,
): Promise<OpenedProject> {
  if (bytes.length > MAX_IMPORT_FILE_BYTES) throw new FormatError("The project file is too large.");
  const entries = readZip(bytes, {
    maxEntries: MAX_ENTRIES,
    maxEntryBytes: Math.max(MAX_MANIFEST_BYTES, MAX_IMPORT_FILE_BYTES),
    maxTotalBytes: MAX_IMPORT_FILE_BYTES * 2,
  });
  const manifestEntry = entries.get(MANIFEST);
  if (!manifestEntry || manifestEntry.size > MAX_MANIFEST_BYTES) {
    throw new FormatError("This is not a MYLPER project file.");
  }
  let manifest: Partial<Manifest>;
  try {
    manifest = JSON.parse(
      new TextDecoder().decode(await manifestEntry.read()),
    ) as Partial<Manifest>;
  } catch {
    throw new FormatError("The project file is damaged.");
  }
  if (manifest?.format !== FORMAT_ID || !Array.isArray(manifest.assets)) {
    throw new FormatError("This is not a MYLPER project file.");
  }
  const result = deserializeProject(manifest.project);
  if (!result.ok) throw new FormatError(result.error);
  const doc = result.document;

  // Only assets the document references are read; anything else in the archive is ignored.
  const wanted = new Set(referencedAssetIds(doc));
  const idMap = new Map<string, string>();
  const assets: StoredAsset[] = [];
  for (const item of manifest.assets) {
    if (typeof item?.id !== "string" || typeof item.path !== "string") continue;
    if (!wanted.has(item.id) || idMap.has(item.id)) continue;
    const entry = entries.get(item.path);
    if (!entry) continue;
    const data = await entry.read();
    const header = readImageHeader(data);
    if (!header || !checkDimensions(header.width, header.height).ok) {
      throw new FormatError("An image inside the project file is damaged or too large.");
    }
    const id = createId("asset");
    idMap.set(item.id, id);
    assets.push({
      id,
      mime: header.mime,
      width: header.width,
      height: header.height,
      // The sniffed type, never one taken from the archive.
      blob: new Blob([data as BlobPart], { type: header.mime }),
    });
  }
  const missing = [...wanted].filter((id) => !idMap.has(id));
  if (missing.length > 0) throw new FormatError("The project file is missing some of its images.");

  const remap = (id: string | null) => (id === null ? null : (idMap.get(id) ?? null));
  const layers = mapLayersDeep(doc.layers, (layer): Layer => {
    let next = layer;
    if (next.kind === "raster") next = { ...next, assetId: remap(next.assetId) };
    if (next.mask) next = { ...next, mask: { ...next.mask, assetId: remap(next.mask.assetId) } };
    return next;
  });
  return { document: { ...doc, id: createId("document"), layers }, assets };
}
