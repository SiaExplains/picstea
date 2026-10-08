import type { RasterMime } from "../../assets/asset-store";
import { referencedAssetIds } from "../../core/document/queries";
import { deserializeProject, serializeDocument } from "../../serialization/serialization";
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
 * IndexedDB project storage (ADR-0004). Two stores:
 *   projects — one record per document: serialized document + list summary
 *   assets   — immutable binaries keyed by [projectId, assetId], stored as ArrayBuffer
 *
 * Assets are stored as ArrayBuffer rather than Blob because Blob-in-IndexedDB has had long-lived
 * bugs in some engines. Because assets are immutable, a save only writes assets it has not
 * written before and deletes ones the document no longer references.
 */

const DB_NAME = "mylper";
const DB_VERSION = 1;
const PROJECTS = "projects";
const ASSETS = "assets";
const BY_PROJECT = "byProject";

interface ProjectRecord {
  id: string;
  schemaVersion: number;
  document: unknown;
  summary: ProjectSummary;
}

interface AssetRow {
  projectId: string;
  assetId: string;
  mime: RasterMime;
  width: number;
  height: number;
  data: ArrayBuffer;
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new DOMException("Transaction aborted", "AbortError"));
  });
}

function toStorageError(error: unknown): StorageError {
  if (error instanceof StorageError) return error;
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return new StorageError(
      "quota",
      "Your browser's storage is full. Export your work or delete old projects to free space.",
    );
  }
  return new StorageError("unknown", "Local storage failed. Export your work to keep it safe.");
}

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined" && indexedDB !== null;
}

export class IndexedDbProjectStorage implements ProjectStorage {
  readonly kind = "indexeddb";
  readonly persistent = true;
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(private readonly factory: () => IDBFactory = () => indexedDB) {}

  private db(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        let req: IDBOpenDBRequest;
        try {
          req = this.factory().open(DB_NAME, DB_VERSION);
        } catch {
          reject(
            new StorageError("unavailable", "Local storage is not available in this browser."),
          );
          return;
        }
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(PROJECTS))
            db.createObjectStore(PROJECTS, { keyPath: "id" });
          if (!db.objectStoreNames.contains(ASSETS)) {
            const assets = db.createObjectStore(ASSETS, { keyPath: ["projectId", "assetId"] });
            assets.createIndex(BY_PROJECT, "projectId");
          }
        };
        req.onsuccess = () => {
          const db = req.result;
          // Another tab upgraded the schema: close so it is not blocked, reopen on next use.
          db.onversionchange = () => {
            db.close();
            this.dbPromise = null;
          };
          resolve(db);
        };
        req.onerror = () =>
          reject(
            new StorageError("unavailable", "Local storage is not available in this browser."),
          );
        req.onblocked = () =>
          reject(
            new StorageError("unavailable", "Close other MYLPER tabs to finish updating storage."),
          );
      }).catch((error: unknown) => {
        this.dbPromise = null;
        throw error;
      });
    }
    return this.dbPromise;
  }

  async list(): Promise<ProjectSummary[]> {
    try {
      const db = await this.db();
      const records = await request(
        db.transaction(PROJECTS, "readonly").objectStore(PROJECTS).getAll() as IDBRequest<
          ProjectRecord[]
        >,
      );
      // Skip malformed rows rather than failing the whole list.
      return sortByModifiedDesc(
        records.flatMap((r) =>
          r && typeof r.summary === "object" && r.summary && typeof r.summary.id === "string"
            ? [r.summary]
            : [],
        ),
      );
    } catch (error) {
      throw toStorageError(error);
    }
  }

  async save({ document, assets }: ProjectSnapshot): Promise<void> {
    try {
      const db = await this.db();
      const referenced = new Set(referencedAssetIds(document));

      const existingKeys = await request(
        db
          .transaction(ASSETS, "readonly")
          .objectStore(ASSETS)
          .index(BY_PROJECT)
          .getAllKeys(document.id),
      );
      const existing = new Set(existingKeys.map((key) => (key as [string, string])[1]));

      // Read blobs before opening the write transaction: awaiting inside it would auto-commit it.
      const toWrite: AssetRow[] = [];
      for (const asset of assets) {
        if (!referenced.has(asset.id) || existing.has(asset.id)) continue;
        toWrite.push({
          projectId: document.id,
          assetId: asset.id,
          mime: asset.mime,
          width: asset.width,
          height: asset.height,
          data: await asset.blob.arrayBuffer(),
        });
      }

      const serialized = serializeDocument(document);
      const record: ProjectRecord = {
        id: document.id,
        schemaVersion: serialized.schemaVersion,
        document: serialized.document,
        summary: summarize(document),
      };

      const tx = db.transaction([PROJECTS, ASSETS], "readwrite");
      const assetStore = tx.objectStore(ASSETS);
      tx.objectStore(PROJECTS).put(record);
      for (const row of toWrite) assetStore.put(row);
      for (const assetId of existing) {
        if (!referenced.has(assetId)) assetStore.delete([document.id, assetId]);
      }
      await done(tx);
    } catch (error) {
      throw toStorageError(error);
    }
  }

  async load(id: string): Promise<LoadedProject> {
    let record: ProjectRecord | undefined;
    let rows: AssetRow[];
    try {
      const db = await this.db();
      const tx = db.transaction([PROJECTS, ASSETS], "readonly");
      [record, rows] = await Promise.all([
        request(tx.objectStore(PROJECTS).get(id) as IDBRequest<ProjectRecord | undefined>),
        request(tx.objectStore(ASSETS).index(BY_PROJECT).getAll(id) as IDBRequest<AssetRow[]>),
      ]);
    } catch (error) {
      throw toStorageError(error);
    }
    if (!record) throw new StorageError("not-found", "That project no longer exists.");

    const result = deserializeProject({
      schemaVersion: record.schemaVersion,
      document: record.document,
    });
    if (!result.ok) throw new StorageError("corrupt", result.error);

    const byId = new Map<string, StoredAsset>();
    for (const row of rows) {
      if (!(row?.data instanceof ArrayBuffer)) continue;
      byId.set(row.assetId, {
        id: row.assetId,
        mime: row.mime,
        width: row.width,
        height: row.height,
        blob: new Blob([row.data], { type: row.mime }),
      });
    }
    const wanted = referencedAssetIds(result.document);
    return {
      document: result.document,
      assets: wanted.flatMap((assetId) => byId.get(assetId) ?? []),
      missingAssetIds: wanted.filter((assetId) => !byId.has(assetId)),
    };
  }

  async delete(id: string): Promise<void> {
    try {
      const db = await this.db();
      const tx = db.transaction([PROJECTS, ASSETS], "readwrite");
      tx.objectStore(PROJECTS).delete(id);
      const assets = tx.objectStore(ASSETS);
      const keys = await request(assets.index(BY_PROJECT).getAllKeys(id));
      for (const key of keys) assets.delete(key);
      await done(tx);
    } catch (error) {
      throw toStorageError(error);
    }
  }
}
