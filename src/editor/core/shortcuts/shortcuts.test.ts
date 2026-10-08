import { describe, expect, it } from "vitest";
import { createShortcutMatcher, eventToCombo, formatBinding, type KeyEventLike } from "./shortcuts";

const key = (k: string, mods: Partial<KeyEventLike> = {}): KeyEventLike => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...mods,
});

describe("shortcuts", () => {
  const match = createShortcutMatcher();

  it("maps Mod to Cmd on macOS and Ctrl elsewhere", () => {
    expect(match(key("z", { metaKey: true }), true)).toBe("edit.undo");
    expect(match(key("z", { ctrlKey: true }), false)).toBe("edit.undo");
    expect(match(key("z", { ctrlKey: true }), true)).toBeNull();
  });

  it("distinguishes redo from undo by Shift", () => {
    expect(match(key("Z", { metaKey: true, shiftKey: true }), true)).toBe("edit.redo");
    expect(match(key("y", { ctrlKey: true }), false)).toBe("edit.redo");
  });

  it("handles zoom keys including the shifted plus", () => {
    expect(match(key("=", { ctrlKey: true }), false)).toBe("view.zoomIn");
    expect(match(key("+", { ctrlKey: true, shiftKey: true }), false)).toBe("view.zoomIn");
    expect(match(key("-", { ctrlKey: true }), false)).toBe("view.zoomOut");
    expect(match(key("0", { metaKey: true }), true)).toBe("view.fit");
  });

  it("uses the physical key when Option changes the character on macOS", () => {
    expect(match(key("˜", { metaKey: true, altKey: true, code: "KeyN" }), true)).toBe("file.new");
  });

  it("matches single-letter tool keys and named keys", () => {
    expect(match(key("h"), false)).toBe("tool.hand");
    expect(match(key("Delete"), false)).toBe("layer.delete");
    expect(match(key("q"), false)).toBeNull();
  });

  it("builds canonical combos", () => {
    expect(eventToCombo(key(" "), false)).toBe("Space");
    expect(eventToCombo(key("s", { ctrlKey: true, altKey: true }), false)).toBe("Mod+Alt+S");
  });

  it("formats bindings for display", () => {
    expect(formatBinding("Mod+Shift+Z", true)).toBe("⌘⇧Z");
    expect(formatBinding("Mod+Shift+Z", false)).toBe("Ctrl+Shift+Z");
    expect(formatBinding("Mod++", false)).toBe("Ctrl++");
  });
});
