import type { EditorDocument } from "../core/document/types";
import { upgradeLegacyEffects } from "../core/effects/model";
import { ValidationError, validateDocument } from "./validate";

/**
 * Versioned project format (docs/03_DOCUMENT_MODEL.md, "Serialization"). See ADR-0005.
 *
 * To change the stored shape: bump CURRENT_SCHEMA_VERSION, add a migration from the previous
 * version, and update the validator. Never edit a released migration.
 */
export const CURRENT_SCHEMA_VERSION = 8;

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
  /*
   * v3 (0.3.0) added groups (nested `children`), layer masks, layer effects, adjustment layers
   * and the "pass-through" group blend mode. Every v2 document is a valid v3 document.
   */
  2: (document) => document,
  /*
   * v4 (0.9.0) added vector paths: path shape layers, the work path, vector masks and clipping
   * masks (ADR-0015). Every v3 document is a valid v4 document.
   */
  3: (document) => document,
  /*
   * v5 (0.10.0) added smart objects with embedded documents and smart filters (ADR-0016).
   * Every v4 document is a valid v5 document.
   */
  4: (document) => document,
  /*
   * v6 (0.15.0) added Vibrance, Color Balance, Photo Filter, Channel Mixer and Gradient Map
   * adjustments and inner shadow, bevel and gradient overlay effects (ADR-0021). Every v5
   * document is a valid v6 document.
   */
  5: (document) => document,
  /*
   * v7 (0.26.0) stores every layer effect as a list (several drop shadows, strokes, ...) with
   * Photoshop's full option set, adds fill opacity and the document's global light (ADR-0030).
   * Old single effects become one-item lists whose new options reproduce the old look.
   */
  6: (document) => upgradeEffectsIn(document),
  /*
   * v8 (0.27.0) added Blend If and channel restrictions (ADR-0031). Every v7 document is a valid
   * v8 document.
   */
  7: (document) => document,
};

/** Recursively upgrade `effects` on every layer, including groups and smart object contents. */
function upgradeEffectsIn(document: unknown): unknown {
  if (typeof document !== "object" || document === null) return document;
  const doc = document as { layers?: unknown };
  if (!Array.isArray(doc.layers)) return document;
  return { ...doc, layers: doc.layers.map(upgradeLayer) };
}

function upgradeLayer(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;
  const layer: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  if (layer.effects !== undefined) layer.effects = upgradeLegacyEffects(layer.effects);
  if (Array.isArray(layer.children)) layer.children = layer.children.map(upgradeLayer);
  if (layer.kind === "smart") layer.content = upgradeEffectsIn(layer.content);
  return layer;
}

export function serializeDocument(doc: EditorDocument): SerializedProject {
  // The selection is session state (ADR-0010) and is never written to a project.
  const persisted: EditorDocument = { ...doc };
  delete (persisted as { selection?: unknown }).selection;
  // JSON round trip guarantees a plain, structured-clone-safe value with no shared references.
  return { schemaVersion: CURRENT_SCHEMA_VERSION, document: JSON.parse(JSON.stringify(persisted)) };
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
      error: "This project was saved by a newer version of Picstea. Reload the page to update.",
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
