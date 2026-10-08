/**
 * Keyboard shortcut registry. Bindings use `Mod` for Cmd on macOS and Ctrl elsewhere.
 *
 * Note: browsers reserve some combinations (Ctrl/Cmd+N, Ctrl/Cmd+W, Ctrl/Cmd+T) and never deliver
 * them to the page, so "New document" is bound to Alt+Mod+N instead.
 */

export type ActionId =
  | "file.new"
  | "file.open"
  | "file.save"
  | "file.export"
  | "edit.undo"
  | "edit.redo"
  | "edit.cut"
  | "edit.copy"
  | "edit.fill"
  | "select.all"
  | "select.deselect"
  | "select.reselect"
  | "select.inverse"
  | "select.feather"
  | "layer.new"
  | "layer.duplicate"
  | "layer.delete"
  | "layer.group"
  | "layer.ungroup"
  | "layer.selectAbove"
  | "layer.selectBelow"
  | "view.zoomIn"
  | "view.zoomOut"
  | "view.fit"
  | "view.actualPixels"
  | "tool.move"
  | "tool.transform"
  | "tool.marquee"
  | "tool.lasso"
  | "tool.wand"
  | "tool.crop"
  | "tool.eyedropper"
  | "tool.brush"
  | "tool.pencil"
  | "tool.eraser"
  | "tool.bucket"
  | "tool.gradient"
  | "tool.shape"
  | "tool.text"
  | "tool.hand"
  | "tool.zoom"
  | "colors.swap"
  | "colors.reset";

export interface KeyEventLike {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  /** Physical key (KeyboardEvent.code); used when Option/Alt changes the produced character. */
  readonly code?: string;
}

export const DEFAULT_KEYMAP: Readonly<Record<ActionId, readonly string[]>> = {
  "file.new": ["Mod+Alt+N"],
  "file.open": ["Mod+O"],
  "file.save": ["Mod+S"],
  "file.export": ["Mod+Shift+E"],
  "edit.undo": ["Mod+Z"],
  "edit.redo": ["Mod+Shift+Z", "Mod+Y"],
  // Paste is the browser's own paste event (so images from other apps arrive too).
  "edit.cut": ["Mod+X"],
  "edit.copy": ["Mod+C"],
  "edit.fill": ["Shift+F5"],
  "select.all": ["Mod+A"],
  "select.deselect": ["Mod+D"],
  "select.reselect": ["Mod+Shift+D"],
  "select.inverse": ["Mod+Shift+I"],
  "select.feather": ["Shift+F6"],
  "layer.new": ["Mod+Shift+N"],
  "layer.duplicate": ["Mod+J"],
  "layer.delete": ["Delete", "Backspace"],
  "layer.group": ["Mod+G"],
  "layer.ungroup": ["Mod+Shift+G"],
  "layer.selectAbove": ["Alt+ArrowUp"],
  "layer.selectBelow": ["Alt+ArrowDown"],
  "view.zoomIn": ["Mod+=", "Mod++"],
  "view.zoomOut": ["Mod+-"],
  "view.fit": ["Mod+0"],
  "view.actualPixels": ["Mod+1"],
  "tool.move": ["V"],
  "tool.transform": ["Mod+T"],
  "tool.marquee": ["M"],
  "tool.lasso": ["L"],
  "tool.wand": ["W"],
  "tool.crop": ["C"],
  "tool.eyedropper": ["I"],
  "tool.brush": ["B"],
  "tool.pencil": ["N"],
  "tool.eraser": ["E"],
  "tool.bucket": ["Shift+G"],
  "tool.gradient": ["G"],
  "tool.shape": ["U"],
  "tool.text": ["T"],
  "tool.hand": ["H"],
  "tool.zoom": ["Z"],
  "colors.swap": ["X"],
  "colors.reset": ["D"],
};

function normalizeKey(key: string): string {
  if (key === " ") return "Space";
  return key.length === 1 ? key.toUpperCase() : key;
}

function physicalKey(event: KeyEventLike): string | null {
  // On macOS, Option+N produces "˜" in event.key; fall back to the physical key for letters/digits.
  if (!event.altKey || !event.code) return null;
  const match = /^(?:Key([A-Z])|Digit(\d))$/.exec(event.code);
  return match ? (match[1] ?? match[2]) : null;
}

/** Canonical combo string for an event, e.g. "Mod+Shift+Z". */
export function eventToCombo(event: KeyEventLike, isMac: boolean): string {
  const parts: string[] = [];
  const mod = isMac ? event.metaKey : event.ctrlKey;
  if (mod) parts.push("Mod");
  // Ctrl on macOS is not Mod; keep it distinct so Ctrl+Z on a Mac does not undo.
  if (isMac && event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  const key = normalizeKey(physicalKey(event) ?? event.key);
  // Shift is implied by the character for "+" and similar; only record it for letters/named keys.
  if (event.shiftKey && (/^[A-Z]$/.test(key) || key.length > 1)) parts.push("Shift");
  parts.push(key);
  return parts.join("+");
}

function normalizeBinding(binding: string): string {
  const parts = binding.split("+").filter(Boolean);
  // A binding of "Mod++" splits into ["Mod"] — restore the literal plus key.
  if (binding.endsWith("++")) parts.push("+");
  const key = normalizeKey(parts.pop() ?? "");
  const order = ["Mod", "Ctrl", "Alt", "Shift"];
  const modifiers = parts.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return [...modifiers, key].join("+");
}

export function createShortcutMatcher(
  keymap: Readonly<Record<ActionId, readonly string[]>> = DEFAULT_KEYMAP,
) {
  const lookup = new Map<string, ActionId>();
  for (const [action, bindings] of Object.entries(keymap) as [ActionId, readonly string[]][]) {
    for (const binding of bindings) lookup.set(normalizeBinding(binding), action);
  }
  return (event: KeyEventLike, isMac: boolean): ActionId | null =>
    lookup.get(eventToCombo(event, isMac)) ?? null;
}

/** Human-readable label for menus and tooltips, e.g. "⌘⇧Z" or "Ctrl+Shift+Z". */
export function formatBinding(binding: string, isMac: boolean): string {
  const normalized = normalizeBinding(binding).split("+");
  if (binding.endsWith("++")) normalized.splice(-2, 2, "+");
  if (isMac) {
    const symbols: Record<string, string> = { Mod: "⌘", Ctrl: "⌃", Alt: "⌥", Shift: "⇧" };
    return normalized.map((part) => symbols[part] ?? part).join("");
  }
  return normalized.map((part) => (part === "Mod" ? "Ctrl" : part)).join("+");
}

export function primaryBinding(action: ActionId, isMac: boolean): string {
  const binding = DEFAULT_KEYMAP[action][0];
  return binding ? formatBinding(binding, isMac) : "";
}
