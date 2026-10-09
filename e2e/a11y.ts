import type { Page } from "@playwright/test";

/**
 * In-house accessibility auditor (launch-readiness pass; no third-party checker by decision).
 * It runs inside the page and reports violations of a focused set of WCAG 2.1 AA rules:
 *
 * - 4.1.2 Name, Role, Value: interactive elements and ARIA widgets have an accessible name;
 *   focusable elements have a role; dialogs and tab panels are named.
 * - 1.1.1 Non-text content: images have `alt`.
 * - 1.3.1 Info and relationships: ARIA id references resolve; ids are unique; headings don't
 *   skip levels; site pages have one `h1`; form fields are labelled.
 * - 1.4.3 Contrast (minimum): text against its nearest opaque background, 4.5:1 (3:1 large).
 * - 2.4.2 Page titled, 3.1.1 Language of page, 2.4.3 no positive tabindex.
 *
 * Not covered automatically (checked by hand, see docs/audits): focus order and visibility,
 * keyboard traps, reflow, motion, meaningful sequence, error identification wording.
 */

export interface Violation {
  readonly rule: string;
  readonly element: string;
  readonly detail: string;
}

export interface AuditOptions {
  /** Site pages need exactly one h1; the editor has none by design (its heading is the canvas). */
  readonly requireH1?: boolean;
  /** Limit the audit to a subtree (e.g. an open dialog). */
  readonly root?: string;
}

export async function audit(page: Page, options: AuditOptions = {}): Promise<Violation[]> {
  return page.evaluate(auditInPage, options);
}

/** Readable list for test failure messages. */
export const describeViolations = (violations: readonly Violation[]) =>
  violations.map((v) => `[${v.rule}] ${v.element} — ${v.detail}`).join("\n");

/** Runs in the browser: must be self-contained (no imports, no closures over module scope). */
function auditInPage(options: AuditOptions): Violation[] {
  const out: Violation[] = [];
  const root: Element = (options.root && document.querySelector(options.root)) || document.body;

  const describe = (el: Element): string => {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : "";
    const role = el.getAttribute("role") ? `[role=${el.getAttribute("role")}]` : "";
    const label = el.getAttribute("aria-label");
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
    const testId = el.getAttribute("data-testid");
    return `<${tag}${id}${role}${testId ? ` data-testid=${testId}` : ""}>${label ? ` aria-label="${label}"` : ""}${text ? ` "${text}"` : ""}`;
  };
  const add = (rule: string, el: Element, detail: string) =>
    out.push({ rule, element: describe(el), detail });

  /** Rendered and not hidden from assistive technology. */
  const exposed = (el: Element): boolean => {
    if (el.closest("[aria-hidden='true'], [hidden], [inert]")) return false;
    const dialog = el.closest("dialog");
    if (dialog && !dialog.open) return false;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    return el.getClientRects().length > 0;
  };

  const textOf = (el: Element): string => {
    let s = "";
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) s += node.textContent ?? "";
      else if (node instanceof Element) {
        if (node.getAttribute("aria-hidden") === "true") continue;
        if (node.tagName === "IMG") s += ` ${node.getAttribute("alt") ?? ""} `;
        else if (node.getAttribute("aria-label")) s += ` ${node.getAttribute("aria-label")} `;
        else s += ` ${textOf(node)} `;
      }
    }
    return s.replace(/\s+/g, " ").trim();
  };

  const nameOf = (el: Element): string => {
    const labelledby = el.getAttribute("aria-labelledby");
    if (labelledby) {
      const text = labelledby
        .split(/\s+/)
        .map((id) => document.getElementById(id))
        .filter((n): n is HTMLElement => !!n)
        .map((n) => textOf(n) || n.getAttribute("aria-label") || "")
        .join(" ")
        .trim();
      if (text) return text;
    }
    const aria = el.getAttribute("aria-label")?.trim();
    if (aria) return aria;
    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLTextAreaElement
    ) {
      if (el.id) {
        const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (label && textOf(label)) return textOf(label);
      }
      const wrapping = el.closest("label");
      if (wrapping && textOf(wrapping)) return textOf(wrapping);
      if (el instanceof HTMLInputElement && (el.type === "button" || el.type === "submit")) {
        return el.value;
      }
    }
    if (el.tagName === "IMG") return el.getAttribute("alt") ?? "";
    const text = textOf(el);
    if (text) return text;
    return el.getAttribute("title")?.trim() ?? "";
  };

  // --- document-level rules
  if (!document.documentElement.lang) add("html-lang", document.documentElement, "missing lang");
  if (!document.title.trim()) add("document-title", document.documentElement, "empty <title>");

  // --- unique ids and ARIA references
  const seen = new Map<string, number>();
  for (const el of Array.from(document.querySelectorAll("[id]"))) {
    seen.set(el.id, (seen.get(el.id) ?? 0) + 1);
  }
  for (const [id, count] of seen) {
    if (count > 1) add("duplicate-id", document.getElementById(id)!, `id "${id}" used ${count}×`);
  }
  for (const attr of [
    "aria-labelledby",
    "aria-describedby",
    "aria-controls",
    "aria-activedescendant",
  ]) {
    for (const el of Array.from(root.querySelectorAll(`[${attr}]`))) {
      if (!exposed(el)) continue;
      for (const id of (el.getAttribute(attr) ?? "").split(/\s+/).filter(Boolean)) {
        if (!document.getElementById(id)) add("aria-reference", el, `${attr} → missing #${id}`);
      }
    }
  }

  // --- names on interactive elements and widgets
  const WIDGETS = [
    "button",
    "link",
    "checkbox",
    "radio",
    "slider",
    "spinbutton",
    "switch",
    "tab",
    "option",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "textbox",
    "combobox",
    "listbox",
    "tablist",
    "menu",
    "dialog",
    "tabpanel",
    "group",
    "toolbar",
  ];
  const interactive = root.querySelectorAll(
    [
      "a[href]",
      "button",
      "input:not([type=hidden])",
      "select",
      "textarea",
      "dialog",
      ...WIDGETS.map((r) => `[role=${r}]`),
    ].join(","),
  );
  for (const el of Array.from(interactive)) {
    if (!exposed(el)) continue;
    const role = el.getAttribute("role");
    // Groups and toolbars only need a name when they are landmarks for a set of controls with
    // the same purpose; report unnamed toolbars and tablists, not plain groups.
    if (role === "group") continue;
    if (!nameOf(el)) add("name", el, "interactive element without an accessible name");
  }

  // --- focusable without a role
  for (const el of Array.from(root.querySelectorAll("[tabindex]"))) {
    const tabindex = Number(el.getAttribute("tabindex"));
    if (tabindex > 0) add("tabindex", el, `positive tabindex ${tabindex}`);
    if (tabindex < 0 || !exposed(el)) continue;
    const native = /^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(el.tagName);
    if (!native && !el.getAttribute("role")) add("focusable-role", el, "focusable but has no role");
    if (!native && !nameOf(el)) add("name", el, "focusable element without an accessible name");
  }

  // --- images
  for (const img of Array.from(root.querySelectorAll("img"))) {
    if (exposed(img) && !img.hasAttribute("alt")) add("img-alt", img, "image without alt");
  }

  // --- headings
  const headings = Array.from(root.querySelectorAll("h1, h2, h3, h4, h5, h6")).filter(exposed);
  let previous = 0;
  for (const h of headings) {
    const level = Number(h.tagName[1]);
    if (previous && level > previous + 1) add("heading-order", h, `h${previous} → h${level}`);
    previous = level;
    if (!textOf(h)) add("heading-empty", h, "empty heading");
  }
  if (options.requireH1) {
    const h1s = headings.filter((h) => h.tagName === "H1").length;
    if (h1s !== 1) add("h1", document.body, `${h1s} h1 elements (expected 1)`);
  }

  // --- contrast
  const parse = (c: string): [number, number, number, number] | null => {
    const m = /rgba?\(([^)]+)\)/.exec(c);
    if (!m) return null;
    const parts = m[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number);
    return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
  };
  const lum = ([r, g, b]: number[]) => {
    const f = (v: number) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const over = (top: number[], bottom: number[]) =>
    [0, 1, 2].map((i) => top[i] * top[3] + bottom[i] * (1 - top[3]));
  /** Opaque background behind `el`, or null when an image or gradient makes it unknowable. */
  const background = (el: Element): number[] | null => {
    const layers: number[][] = [];
    for (let n: Element | null = el; n; n = n.parentElement) {
      const style = getComputedStyle(n);
      if (style.backgroundImage !== "none") return null;
      const c = parse(style.backgroundColor);
      if (c && c[3] > 0) {
        layers.push(c);
        if (c[3] >= 1) break;
      }
    }
    let colour = [255, 255, 255];
    for (const layer of layers.reverse()) colour = over(layer, colour);
    return colour;
  };
  const opacity = (el: Element) => {
    let o = 1;
    for (let n: Element | null = el; n; n = n.parentElement)
      o *= Number(getComputedStyle(n).opacity);
    return o;
  };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const checked = new Set<Element>();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement;
    if (!el || checked.has(el) || !node.textContent?.trim()) continue;
    checked.add(el);
    if (!exposed(el)) continue;
    // Inactive controls are exempt (WCAG 1.4.3).
    if (el.closest(":disabled, [aria-disabled='true']")) continue;
    if (el.closest("svg, canvas, option")) continue;
    const style = getComputedStyle(el);
    const fg = parse(style.color);
    const bg = background(el);
    if (!fg || !bg) continue;
    const alpha = fg[3] * opacity(el);
    const text = over([fg[0], fg[1], fg[2], alpha], bg);
    const l1 = lum(text);
    const l2 = lum(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const size = Number.parseFloat(style.fontSize);
    const bold = Number(style.fontWeight) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const needed = large ? 3 : 4.5;
    if (ratio < needed - 0.01) {
      add(
        "contrast",
        el,
        `${ratio.toFixed(2)}:1, needs ${needed}:1 (${style.color} on rgb(${bg.map(Math.round).join(",")}))`,
      );
    }
  }
  return out;
}
