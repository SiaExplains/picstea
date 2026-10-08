import type { EditorDocument } from "../core/document/types";
import { ValidationError, validateDocument } from "./validate";

/**
 * Versioned project format (docs/03_DOCUMENT_MODEL.md, "Serialization"). See ADR-0005.
 *
 * To change the stored shape: bump CURRENT_SCHEMA_VERSION, add a migration from the previous
 * version, and update the validator. Never edit a released migration.
 */
export const CURRENT_SCHEMA_VERSION = 2;

export interface SerializedProject {
  readonly schemaVersion: number;
  readonly document: unknown;
}

/** migrations[n] upgrades a version-n document to version n+1. */
export type Migration = (document: unknown) => unknown;
export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  /*
   * v2 (0.2.0) added shape and text layers and allowed raster layers without content
   * (assetId: null). Every v1 document is already a valid v2 document, so this step is the
   * identity — it exists so older builds refuse v2 projects instead of misreading them.
   */
  1: (document) => document,
};

export function serializeDocument(doc: EditorDocument): SerializedProject {
  // JSON round trip guarantees a plain, structured-clone-safe value with no shared references.
  return { schemaVersion: CURRENT_SCHEMA_VERSION, document: JSON.parse(JSON.stringify(doc)) };
}

export type DeserializeResult =
  | { ok: true; document: EditorDocument; migratedFrom: number | null }
  | { ok: false; error: string };

export function deserializeProject(
  raw: unknown,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  currentVersion = CURRENT_SCHEMA_VERSION,
): DeserializeResult {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "The project file is not valid." };
  }
  const { schemaVersion } = raw as { schemaVersion?: unknown };
  if (typeof schemaVersion !== "number" || !Number.isInteger(schemaVersion) || schemaVersion < 1) {
    return { ok: false, error: "The project file has no valid format version." };
  }
  if (schemaVersion > currentVersion) {
    return {
      ok: false,
      error: "This project was saved by a newer version of MYLPER. Reload the page to update.",
    };
  }

  let document = (raw as { document?: unknown }).document;
  for (let version = schemaVersion; version < currentVersion; version++) {
    const migrate = migrations[version];
    if (!migrate) return { ok: false, error: `No upgrade path from format version ${version}.` };
    try {
      document = migrate(document);
    } catch {
      return { ok: false, error: "The project data is damaged and cannot be upgraded." };
    }
  }

  try {
    return {
      ok: true,
      document: validateDocument(document),
      migratedFrom: schemaVersion === currentVersion ? null : schemaVersion,
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { ok: false, error: "The project data is damaged and cannot be opened." };
    }
    throw error;
  }
}
