"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { DEFAULT_KEYMAP, formatBinding } from "@/editor/core/shortcuts/shortcuts";
import { useIsMac } from "./editor-context";
import styles from "./editor.module.css";
import type { UiAction, UiActionId } from "./use-editor-actions";

type MenuEntry = UiActionId | "-";

const MENUS: { label: string; items: MenuEntry[] }[] = [
  { label: "File", items: ["file.new", "file.open", "file.place", "-", "file.save", "file.close"] },
  { label: "Edit", items: ["edit.undo", "edit.redo"] },
  {
    label: "Layer",
    items: ["layer.new", "layer.duplicate", "layer.delete", "-", "layer.moveUp", "layer.moveDown"],
  },
  { label: "View", items: ["view.zoomIn", "view.zoomOut", "-", "view.fit", "view.actualPixels"] },
];

function shortcutFor(id: UiActionId, isMac: boolean): string {
  const bindings = (DEFAULT_KEYMAP as Partial<Record<UiActionId, readonly string[]>>)[id];
  return bindings?.[0] ? formatBinding(bindings[0], isMac) : "";
}

/** ARIA `aria-keyshortcuts` value, e.g. "Meta+Shift+Z Control+Shift+Z". */
function keyShortcutsFor(id: UiActionId): string {
  const binding = (DEFAULT_KEYMAP as Partial<Record<UiActionId, readonly string[]>>)[id]?.[0];
  if (!binding) return "";
  const variants = binding.includes("Mod")
    ? [binding.replace("Mod", "Meta"), binding.replace("Mod", "Control")]
    : [binding];
  return variants.join(" ");
}

/** Accessible menubar (WAI-ARIA menubar pattern): arrow keys move between and within menus. */
export function MenuBar({ actions }: { actions: Record<UiActionId, UiAction> }) {
  const [open, setOpen] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const isMac = useIsMac();
  const baseId = useId();

  useEffect(() => {
    if (open === null) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!barRef.current?.contains(event.target as Node)) setOpen(null);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open === null) return;
    // Focus the first enabled item when a menu opens.
    const popup = barRef.current?.querySelector<HTMLElement>(
      `#${CSS.escape(`${baseId}-menu-${open}`)}`,
    );
    popup?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }, [open, baseId]);

  const focusTrigger = (index: number) => {
    const count = MENUS.length;
    const next = (index + count) % count;
    barRef.current?.querySelectorAll<HTMLButtonElement>("[data-menu-trigger]")[next]?.focus();
    return next;
  };

  const onTriggerKeyDown = (event: KeyboardEvent, index: number) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const next = focusTrigger(index + (event.key === "ArrowRight" ? 1 : -1));
      if (open !== null) setOpen(next);
    } else if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(index);
    } else if (event.key === "Escape") {
      setOpen(null);
    }
  };

  const onPopupKeyDown = (event: KeyboardEvent<HTMLDivElement>, index: number) => {
    const items = [
      ...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
    ];
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      items[(current + delta + items.length) % items.length]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(null);
      focusTrigger(index);
    } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      setOpen(focusTrigger(index + (event.key === "ArrowRight" ? 1 : -1)));
    } else if (event.key === "Tab") {
      setOpen(null);
    }
  };

  return (
    <div className={styles.menubar} ref={barRef}>
      <Link href="/" className={styles.brand} aria-label="MYLPER home">
        MYLPER
      </Link>
      <div role="menubar" aria-label="Editor menu" style={{ display: "flex", gap: 2 }}>
        {MENUS.map((menu, index) => {
          const menuId = `${baseId}-menu-${index}`;
          return (
            <div key={menu.label} className={styles.menu}>
              <button
                type="button"
                role="menuitem"
                data-menu-trigger
                className={styles.menuButton}
                aria-haspopup="menu"
                aria-expanded={open === index}
                aria-controls={open === index ? menuId : undefined}
                onClick={() => setOpen(open === index ? null : index)}
                onPointerEnter={() => open !== null && setOpen(index)}
                onKeyDown={(e) => onTriggerKeyDown(e, index)}
              >
                {menu.label}
              </button>
              {open === index && (
                <div
                  id={menuId}
                  role="menu"
                  aria-label={menu.label}
                  className={styles.menuPopup}
                  onKeyDown={(e) => onPopupKeyDown(e, index)}
                >
                  {menu.items.map((entry, i) =>
                    entry === "-" ? (
                      <div key={`sep-${i}`} role="separator" className={styles.menuSeparator} />
                    ) : (
                      <button
                        key={entry}
                        type="button"
                        role="menuitem"
                        className={styles.menuItem}
                        disabled={!actions[entry].enabled}
                        aria-label={actions[entry].label}
                        aria-keyshortcuts={keyShortcutsFor(entry) || undefined}
                        onClick={() => {
                          setOpen(null);
                          actions[entry].run();
                        }}
                      >
                        <span>{actions[entry].label}</span>
                        <span className={styles.shortcut}>{shortcutFor(entry, isMac)}</span>
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
