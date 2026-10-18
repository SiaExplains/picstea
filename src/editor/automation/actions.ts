import { parseStep, type ActionStep } from "./steps";

/**
 * Actions: named lists of recorded steps (ADR-0018). They belong to the user, not to a document;
 * the UI keeps them in local storage and they can be exported and imported as JSON files.
 */
export interface Action {
  readonly id: string;
  readonly name: string;
  readonly steps: readonly ActionStep[];
}

export const MAX_ACTIONS = 100;
export const MAX_ACTION_STEPS = 200;
export const MAX_ACTION_NAME_LENGTH = 100;
export const ACTIONS_FILE_FORMAT = "picstea-actions";
export const ACTIONS_FILE_VERSION = 1;
/** Imported action files larger than this are refused before parsing. */
export const MAX_ACTIONS_FILE_BYTES = 2 * 1024 * 1024;

export class ActionsFormatError extends Error {
  override name = "ActionsFormatError";
}

const own = (o: object, key: string): unknown =>
  Object.hasOwn(o, key) ? (o as Record<string, unknown>)[key] : undefined;

/** Trim and shorten a user-entered name; null if empty. */
export function normalizeActionName(name: string): string | null {
  const trimmed = name.replace(/\s+/g, " ").trim().slice(0, MAX_ACTION_NAME_LENGTH);
  return trimmed || null;
}

/**
 * Validate one action. Throws `ActionsFormatError` naming the problem, so imports can explain
 * why a file was refused. `newId` replaces stored ids that are missing or malformed.
 */
export function parseAction(value: unknown, newId: () => string): Action {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ActionsFormatError("An action is not an object.");
  }
  const rawName = own(value, "name");
  const name = typeof rawName === "string" ? normalizeActionName(rawName) : null;
  if (!name) throw new ActionsFormatError("An action has no name.");
  const rawSteps = own(value, "steps");
  if (!Array.isArray(rawSteps)) throw new ActionsFormatError(`"${name}" has no steps.`);
  if (rawSteps.length > MAX_ACTION_STEPS) {
    throw new ActionsFormatError(`"${name}" has more than ${MAX_ACTION_STEPS} steps.`);
  }
  const steps = rawSteps.map((raw, i) => {
    const step = parseStep(raw);
    if (!step) throw new ActionsFormatError(`Step ${i + 1} of "${name}" is not supported.`);
    return step;
  });
  const rawId = own(value, "id");
  const id = typeof rawId === "string" && /^[\w-]{1,64}$/.test(rawId) ? rawId : newId();
  return { id, name, steps };
}

/** Stored actions: anything malformed is dropped rather than failing the whole list. */
export function parseStoredActions(value: unknown, newId: () => string): Action[] {
  if (!Array.isArray(value)) return [];
  const out: Action[] = [];
  const ids = new Set<string>();
  for (const raw of value.slice(0, MAX_ACTIONS)) {
    try {
      const action = parseAction(raw, newId);
      const unique = ids.has(action.id) ? { ...action, id: newId() } : action;
      ids.add(unique.id);
      out.push(unique);
    } catch {
      // Skip it; the rest of the list is still usable.
    }
  }
  return out;
}

export function serializeActions(actions: readonly Action[]): string {
  return JSON.stringify(
    { format: ACTIONS_FILE_FORMAT, version: ACTIONS_FILE_VERSION, actions },
    null,
    2,
  );
}

/** Parse an exported actions file. Every imported action gets a fresh id. */
export function parseActionsFile(text: string, newId: () => string): Action[] {
  if (text.length > MAX_ACTIONS_FILE_BYTES) throw new ActionsFormatError("The file is too large.");
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ActionsFormatError("This is not a Picstea actions file.");
  }
  if (
    typeof data !== "object" ||
    data === null ||
    own(data, "format") !== ACTIONS_FILE_FORMAT ||
    !Array.isArray(own(data, "actions"))
  ) {
    throw new ActionsFormatError("This is not a Picstea actions file.");
  }
  if (own(data, "version") !== ACTIONS_FILE_VERSION) {
    throw new ActionsFormatError("This actions file was made by a newer version of Picstea.");
  }
  const list = own(data, "actions") as unknown[];
  if (list.length > MAX_ACTIONS) {
    throw new ActionsFormatError(`The file has more than ${MAX_ACTIONS} actions.`);
  }
  return list.map((raw) => ({ ...parseAction(raw, newId), id: newId() }));
}
