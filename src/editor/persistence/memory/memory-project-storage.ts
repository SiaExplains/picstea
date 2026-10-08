import { referencedAssetIds } from "../../core/document/queries";
import {
  deserializeProject,
  serializeDocument,
  type SerializedProject,
} from "../../serialization/serialization";
import {
  sortByModifiedDesc,
  StorageError,
  summarize,
  type LoadedProject,
  type ProjectSnapshot,
  type ProjectStorage,
  type ProjectSummary,
  type StoredAsset,
} from "../project-storage";

/**
 * Non-persistent storage: the fallback when IndexedDB is unavailable (some private modes), and
 * the test double. Data round-trips through serialization exactly like the persistent store.
 */
export class MemoryProjectStorage implements ProjectStorage {
  readonly kind = "memory";
  readonly persistent = false;
  private readonly projects = new Map<
    string,
    { project: SerializedProject; summary: ProjectSummary }
  >();
  private readonly assets = new Map<string, Map<string, StoredAsset>>();

  async list(): Promise<ProjectSummary[]> {
    return sortByModifiedDesc([...this.projects.values()].map((p) => p.summary));
  }

  async save({ document, assets }: ProjectSnapshot): Promise<void> {
    this.projects.set(document.id, {
      project: serializeDocument(document),
      summary: summarize(document),
    });
    const referenced = new Set(referencedAssetIds(document));
    const stored = new Map<string, StoredAsset>();
    for (const asset of assets) if (referenced.has(asset.id)) stored.set(asset.id, asset);
    this.assets.set(document.id, stored);
  }

  async load(id: string): Promise<LoadedProject> {
    const entry = this.projects.get(id);
    if (!entry) throw new StorageError("not-found", "That project no longer exists.");
    const result = deserializeProject(entry.project);
    if (!result.ok) throw new StorageError("corrupt", result.error);
    const stored = this.assets.get(id) ?? new Map<string, StoredAsset>();
    const wanted = referencedAssetIds(result.document);
    return {
      document: result.document,
      assets: wanted.flatMap((assetId) => stored.get(assetId) ?? []),
      missingAssetIds: wanted.filter((assetId) => !stored.has(assetId)),
    };
  }

  async delete(id: string): Promise<void> {
    this.projects.delete(id);
    this.assets.delete(id);
  }
}
