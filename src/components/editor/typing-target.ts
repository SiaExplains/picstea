/** Input types that don't consume typing, so editor shortcuts should still work while focused. */
const NON_TYPING_INPUTS = new Set([
  "checkbox",
  "radio",
  "button",
  "submit",
  "reset",
  "color",
  "file",
  "image",
]);

/**
 * Whether keyboard input belongs to a focused control rather than to editor shortcuts: text
 * fields, selects, contenteditable — and sliders, whose arrow keys would otherwise nudge layers.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.tagName === "TEXTAREA" || target.tagName === "SELECT") return true;
  if (target instanceof HTMLInputElement) return !NON_TYPING_INPUTS.has(target.type);
  return false;
}
