"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { SYSTEM_FONTS } from "@/editor/core/document/types";
import { FONT_FILE_ACCEPT } from "@/editor/fonts/font-file";
import { cssFamily } from "@/editor/rendering/text/text-layout";
import { useActiveSession, useController } from "./editor-context";
import styles from "./editor.module.css";
import { useT } from "./i18n";

type Group = "document" | "bundled" | "local" | "system";

interface Option {
  readonly family: string;
  readonly group: Group;
}

const hasLocalFontAccess = () =>
  typeof window !== "undefined" && "queryLocalFonts" in (window as object);

/**
 * Font picker (ADR-0040): search, a preview of each family in its own face, and the four sources
 * — fonts already in the document, Picstea's bundled Google Fonts, fonts on this computer (after
 * the browser's permission prompt) and system fonts — plus uploading a font file. Inside the text
 * editor's keep-alive area, so choosing a font doesn't end typing.
 */
export function FontPicker({
  value,
  onChange,
  id,
  label,
}: {
  value: string;
  onChange: (family: string) => void;
  id?: string;
  label: string;
}) {
  const controller = useController();
  const session = useActiveSession();
  const t = useT();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  /** Where the list opens, in the window: panels scroll and would clip it otherwise. */
  const [place, setPlace] = useState<CSSProperties>({});
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const localFonts = useSyncExternalStore(
    controller.fonts.localFonts.subscribe,
    controller.fonts.localFonts.get,
    () => null,
  );
  const docFonts = session?.document.fonts;

  const groups: { group: Group; label: string }[] = [
    { group: "document", label: t("In this document") },
    { group: "bundled", label: t("Google Fonts") },
    { group: "local", label: t("On this computer") },
    { group: "system", label: t("System fonts") },
  ];

  const options = useMemo(() => {
    const seen = new Set<string>();
    const out: Option[] = [];
    const add = (family: string, group: Group) => {
      if (seen.has(family)) return;
      seen.add(family);
      out.push({ family, group });
    };
    for (const f of docFonts ?? []) add(f.family, "document");
    for (const f of controller.fonts.bundled) add(f.family, "bundled");
    for (const f of localFonts ?? []) add(f.family, "local");
    for (const f of SYSTEM_FONTS) add(f, "system");
    const q = query.trim().toLowerCase();
    return q ? out.filter((o) => o.family.toLowerCase().includes(q)) : out;
  }, [controller.fonts.bundled, docFonts, localFonts, query]);

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  const choose = (option: Option) => {
    if (option.group === "bundled") {
      void controller.fonts.loadBundled({ family: option.family, weight: 400, italic: false });
    }
    if (option.group === "local") controller.useLocalFont(option.family);
    onChange(option.family);
    setOpen(false);
    setQuery("");
  };

  const display = (family: string) => (family === "system-ui" ? t("System") : family);

  return (
    <div className={styles.fontPicker} ref={root} data-keep-text-edit>
      <button
        type="button"
        id={id}
        className={styles.fontPickerButton}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${display(value)}`}
        style={{ fontFamily: cssFamily(value) }}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const below = window.innerHeight - rect.bottom - 8;
          const above = rect.top - 8;
          const downwards = below >= 240 || below >= above;
          setPlace({
            position: "fixed",
            left: Math.max(8, Math.min(rect.left, window.innerWidth - 268)),
            ...(downwards
              ? { top: rect.bottom + 4, maxHeight: Math.min(360, below) }
              : { bottom: window.innerHeight - rect.top + 4, maxHeight: Math.min(360, above) }),
          });
          setOpen((o) => !o);
          setActive(0);
        }}
      >
        {display(value)}
      </button>
      {open && (
        <div className={styles.fontPopover} style={place}>
          <input
            ref={search}
            className={styles.fontSearch}
            type="search"
            role="combobox"
            aria-label={t("Search fonts")}
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={options[active] ? `${listId}-${active}` : undefined}
            placeholder={t("Search fonts")}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(options.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter" && options[active]) {
                e.preventDefault();
                choose(options[active]);
              } else if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
              }
            }}
          />
          <ul id={listId} role="listbox" aria-label={label} className={styles.fontList}>
            {groups.map(({ group, label: groupLabel }) => {
              const items = options
                .map((option, index) => ({ option, index }))
                .filter(({ option }) => option.group === group);
              if (items.length === 0) return null;
              return (
                <li key={group} role="presentation">
                  <div className={styles.fontGroup} role="presentation">
                    {groupLabel}
                  </div>
                  <ul role="group" aria-label={groupLabel}>
                    {items.map(({ option, index }) => (
                      <FontOption
                        key={option.family}
                        id={`${listId}-${index}`}
                        option={option}
                        label={display(option.family)}
                        selected={option.family === value}
                        active={index === active}
                        onChoose={() => choose(option)}
                        onHover={() => setActive(index)}
                      />
                    ))}
                  </ul>
                </li>
              );
            })}
            {options.length === 0 && <li className={styles.fontEmpty}>{t("No fonts found")}</li>}
          </ul>
          <div className={styles.fontPickerFooter}>
            {hasLocalFontAccess() && localFonts === null && (
              <button
                type="button"
                className={styles.linkButton}
                title={t("Your browser asks before Picstea can list the fonts on this computer.")}
                onClick={() => {
                  void controller.fonts.queryLocalFonts().then((fonts) => {
                    if (!fonts) {
                      controller.notify(
                        "info",
                        t(
                          "Picstea could not list the fonts on this computer. You can upload a font file instead.",
                        ),
                      );
                    }
                  });
                }}
              >
                {t("Use Fonts on This Computer…")}
              </button>
            )}
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => upload.current?.click()}
            >
              {t("Upload Font…")}
            </button>
            <input
              ref={upload}
              type="file"
              accept={FONT_FILE_ACCEPT}
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                void controller.uploadFont(file).then((family) => {
                  if (family) {
                    onChange(family);
                    setOpen(false);
                  }
                });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** One family, previewed in its own face; bundled faces load when the row scrolls into view. */
function FontOption({
  id,
  option,
  label,
  selected,
  active,
  onChoose,
  onHover,
}: {
  id: string;
  option: Option;
  label: string;
  selected: boolean;
  active: boolean;
  onChoose: () => void;
  onHover: () => void;
}) {
  const controller = useController();
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || option.group !== "bundled" || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      void controller.fonts.loadBundled({ family: option.family, weight: 400, italic: false });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [controller, option]);
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest" });
  }, [active]);
  return (
    <li
      ref={ref}
      id={id}
      role="option"
      aria-selected={selected}
      className={`${styles.fontOption} ${active ? styles.fontOptionActive : ""}`}
      style={{ fontFamily: cssFamily(option.family) }}
      onPointerDown={(e) => e.preventDefault()}
      onPointerEnter={onHover}
      onClick={onChoose}
    >
      {label}
    </li>
  );
}
