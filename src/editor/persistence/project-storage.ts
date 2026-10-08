import type { RasterMime } from "../assets/asset-store";
import { countLayers } from "../core/document/tree";
import type { EditorDocument } from "../core/document/types";

/**
 * Where projects live (docs/07_STORAGE_PRIVACY.md, "Future backend boundary").
 *
 * The editor only knows this interface. Today the implementations are local (IndexedDB, memory);
 * a future CloudProjectStorage would slot in here without the editor knowing — and only after an
 * explicit product decision (Gate 10).
 */

export interface StoredAsset {
  readonly id: string;
  readonly mime: RasterMime;
  readonly width: number;
  readonly height: number;
  readonly blob: Blob;
}

export interface ProjectSummary {
  readonly id: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly layerCount: number;
  /** ISO 8601 */
  readonly modifiedAt: string;
}

export interface ProjectSnapshot {
  readonly document: EditorDocument;
  /** Every asset the document references. Implementations may skip re-writing unchanged ones. */
  readonly assets: readonly StoredAsset[];
}

export interface LoadedProject {
  readonly document: EditorDocument;
  readonly assets: readonly StoredAsset[];
  /** Referenced assets that were not found (e.g. partially evicted storage). */
  readonly missingAssetIds: readonly string[];
}

export type StorageErrorCode = "unavailable" | "quota" | "not-found" | "corrupt" | "unknown";

export class StorageError extends Error {
  override name = "StorageError";
  constructor(
    readonly code: StorageErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface ProjectStorage {
  readonly kind: "indexeddb" | "memory";
  /** False when work will be lost on reload (e.g. IndexedDB unavailable). */
  readonly persistent: boolean;
  list(): Promise<ProjectSummary[]>;
  save(snapshot: ProjectSnapshot): Promise<void>;
  load(id: string): Promise<LoadedProject>;
  delete(id: string): Promise<void>;
}

export function summarize(doc: EditorDocument): ProjectSummary {
  return {
    id: doc.id,
    name: doc.name,
    width: doc.width,
    height: doc.height,
    layerCount: countLayers(doc.layers),
    modifiedAt: doc.metadata.modifiedAt,
  };
}

export function sortByModifiedDesc(summaries: ProjectSummary[]): ProjectSummary[] {
  return summaries.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}
