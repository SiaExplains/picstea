import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import { ADJUSTMENTS } from "@/editor/adjustments/registry";
import { TONE_CHANNEL_LABELS } from "@/editor/adjustments/tone";
import { PRESET_CATEGORIES } from "@/editor/core/document/presets";
import { BUILT_IN_STYLES } from "@/editor/core/effects/presets";
import { CONTOUR_NAMES, EFFECT_NAMES, PATTERN_NAMES } from "@/editor/core/effects/model";
import { ALIGN_LABELS } from "@/editor/core/geometry/snapping";
import { DISTRIBUTE_LABELS } from "@/editor/core/geometry/multi-transform";
import { TOOL_GROUPS } from "@/editor/core/tool-groups";
import { CONVERSIONS } from "@/editor/formats/convert";
import { EXPORT_FORMATS } from "@/editor/formats/export/raster-export";
import { FILTER_GROUPS, FILTERS } from "@/editor/filters/registry";

/**
 * Every English text the editor can show, i.e. every key a catalogue needs (ADR-0039). Node-only:
 * used by the completeness test and to list keys for translators. Sources:
 * - components: `t("…")` and `N_("…")` literals, plus action labels in use-editor-actions.ts;
 * - engine registries (filters, adjustments, tools, effects, formats), imported directly;
 * - engine messages and history labels, found by pattern in src/editor.
 * Collecting a key that is never shown is harmless; a missed one falls back to English.
 */

const ROOT = join(__dirname, "..", "..");
const STRING = String.raw`"((?:[^"\\\n]|\\.)*)"`;

function files(dir: string, ext: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "test-utils" ? [] : files(path, ext);
    return ext.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

function unescape(s: string): string {
  try {
    return JSON.parse(`"${s}"`) as string;
  } catch {
    return s;
  }
}
const looksLikeText = (s: string) =>
  s === s.trim() && /[A-Za-z]{2}/.test(s) && !/^[a-z0-9-]+(\.[a-z0-9-]+)*$/.test(s);

function matches(source: string, pattern: RegExp): string[] {
  return [...source.matchAll(pattern)].map((m) => unescape(m[1]));
}

/** `t(\`…\`)` can't be collected or translated; the test forbids it. */
export function templateLiteralCalls(): string[] {
  return files(join(ROOT, "components"), /\.tsx?$/).flatMap((path) =>
    [...readFileSync(path, "utf8").matchAll(/\bt\(\s*`/g)].map(() => path),
  );
}

export function collectEditorKeys(): Set<string> {
  const keys = new Set<string>();
  // "Gaussian Blur…" is translated through "Gaussian Blur" (see translate()).
  const add = (s: string) => {
    const key = s.endsWith("…") ? s.slice(0, -1) : s;
    if (looksLikeText(key)) keys.add(key);
  };

  // Components: explicit keys.
  const ui = [...files(join(ROOT, "components", "editor"), /\.tsx?$/)];
  for (const path of ui) {
    const source = readFileSync(path, "utf8");
    // Marked explicitly, so even single lowercase words ("shadows") are text.
    for (const s of matches(source, new RegExp(String.raw`\b(?:t|N_)\(\s*${STRING}`, "g"))) {
      const key = s.endsWith("…") ? s.slice(0, -1) : s;
      if (key && key === key.trim()) keys.add(key);
    }
    if (path.endsWith("use-editor-actions.ts")) {
      for (const line of source.split("\n").filter((l) => /\blabel:/.test(l))) {
        for (const s of matches(line, new RegExp(STRING, "g"))) add(s);
      }
    }
  }

  // Engine registries.
  for (const group of FILTER_GROUPS) add(group);
  for (const f of FILTERS) {
    add(f.name);
    for (const p of f.parameters) {
      add(p.label);
      if (p.kind === "choice") p.options.forEach(add);
    }
  }
  for (const a of ADJUSTMENTS) {
    add(a.label);
    for (const p of a.params) add(p.label);
  }
  for (const g of TOOL_GROUPS) for (const m of g.members) add(m.label);
  Object.values(EFFECT_NAMES).forEach(add);
  Object.values(CONTOUR_NAMES).forEach(add);
  Object.values(PATTERN_NAMES).forEach(add);
  Object.values(TONE_CHANNEL_LABELS).forEach(add);
  BUILT_IN_STYLES.forEach((s) => add(s.name));
  for (const category of PRESET_CATEGORIES) {
    add(category.label);
    keys.add(`size category|${category.label}`);
    category.presets.forEach((p) => add(p.name));
  }
  Object.values(DISTRIBUTE_LABELS).forEach(add);
  for (const label of Object.values(ALIGN_LABELS)) {
    add(label);
    add(label.replace("Align ", "")); // "Align to Selection: {edge}"
  }
  CONVERSIONS.forEach((c) => add(c.label));
  Object.values(EXPORT_FORMATS).forEach((f) => add(f.note));

  // Engine messages and history labels.
  const patterns = [
    String.raw`(?:FormatError|ExportError|\bfail|\bmsg|withBusy)\(\s*${STRING}`,
    String.raw`notify\(\s*"(?:info|error)",\s*${STRING}`,
    String.raw`\b(?:reason|error|message|label|note|title):\s*${STRING}`,
    // History labels: a command's last argument, e.g. addLayer(layer, "New Layer").
    String.raw`,\s*${STRING}\s*\)`,
  ].map((p) => new RegExp(p, "g"));
  for (const path of files(join(ROOT, "editor"), /\.ts$/)) {
    const source = readFileSync(path, "utf8");
    for (const pattern of patterns) {
      for (const s of matches(source, pattern)) {
        // PSD keys ("Styl", "FontSize") aren't text; its warnings are full sentences.
        if (path.includes(`${sep}psd${sep}`) && (/^\S{1,4}$/.test(s) || /[a-z][A-Z]/.test(s)))
          continue;
        if (/^[A-Z"]/.test(s)) add(s);
      }
    }
  }
  return keys;
}

/** `{name}` placeholders in a text. */
export const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
