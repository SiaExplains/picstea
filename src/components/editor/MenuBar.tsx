"use client";

import Image from "next/image";
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { ADJUSTMENTS } from "@/editor/adjustments/registry";
import { FILTER_GROUPS, FILTERS, type FilterGroup } from "@/editor/filters/registry";
import { DEFAULT_KEYMAP, formatBinding } from "@/editor/core/shortcuts/shortcuts";
import { useIsMac } from "./editor-context";
import styles from "./editor.module.css";
import type { UiAction, UiActionId } from "./use-editor-actions";

/** A menu entry: an action, a separator, or a submenu (ADR-0032). */
type MenuEntry = UiActionId | "-" | Submenu;
interface Submenu {
  readonly label: string;
  readonly items: readonly MenuEntry[];
}

const sub = (label: string, items: readonly MenuEntry[]): Submenu => ({ label, items });

const ADJUSTMENT_ITEMS: MenuEntry[] = ADJUSTMENTS.map((a) => `adjust.${a.type}` as const);

/**
 * Filter menu in Photopea/Photoshop order: the top-level filters (with Liquify and Vanishing
 * Point, which have their own editors), then one submenu per group.
 */
const filterItems = (group: FilterGroup) =>
  FILTERS.filter((f) => f.group === group).map((f) => `filter.${f.id}` as const);

const FILTER_MENU: MenuEntry[] = [
  "filter.last",
  "-",
  ...filterItems("Top"),
  "filter.liquify",
  "filter.vanishingPoint",
  "-",
  ...FILTER_GROUPS.filter((g) => g !== "Top").map((group) => sub(group, filterItems(group))),
];

const MENUS: readonly Submenu[] = [
  sub("File", [
    "file.new",
    "file.open",
    sub("Place", ["file.place", "file.placeEmbedded"]),
    "-",
    "file.save",
    "file.saveProject",
    "file.export",
    "-",
    sub("Automate", ["file.batch", "window.actions"]),
    "-",
    "file.close",
  ]),
  sub("Edit", [
    "edit.undo",
    "edit.redo",
    "-",
    "edit.cut",
    "edit.copy",
    "edit.copyMerged",
    "edit.paste",
    "edit.clear",
    "-",
    "edit.fill",
    "edit.stroke",
    "-",
    "tool.transform",
    sub("Transform", ["layer.flipH", "layer.flipV"]),
    "-",
    "help.shortcuts",
  ]),
  sub("Image", [
    sub("Adjustments", ADJUSTMENT_ITEMS),
    "-",
    "image.autoTone",
    "image.autoContrast",
    "image.autoColor",
    "-",
    "image.size",
    "image.canvasSize",
    sub("Image Rotation", [
      "image.rotateCw",
      "image.rotateCcw",
      "image.rotate180",
      "-",
      "image.flipH",
      "image.flipV",
    ]),
    "image.crop",
    "image.cropToSelection",
    "image.trim",
    "image.revealAll",
    "-",
    "image.duplicate",
  ]),
  sub("Layer", [
    sub("New", ["layer.new", "layer.newGroup", "layer.newFill", "-", "layer.viaCopy"]),
    "layer.duplicate",
    "layer.delete",
    "-",
    sub("Layer Style", ["layer.style", "layer.rasterizeStyle"]),
    sub("New Adjustment Layer", ADJUSTMENT_ITEMS),
    "-",
    sub("Raster Mask", ["layer.addMask", "layer.toggleMask", "layer.deleteMask"]),
    sub("Vector Mask", ["path.vectorMask", "layer.toggleVectorMask", "layer.deleteVectorMask"]),
    "layer.clip",
    "-",
    sub("Smart Object", ["layer.toSmartObject", "layer.editContents"]),
    "layer.rasterize",
    "-",
    "layer.group",
    "layer.ungroup",
    "-",
    sub("Arrange", ["layer.moveUp", "layer.moveDown"]),
    sub("Align", [
      "align.left",
      "align.center-x",
      "align.right",
      "-",
      "align.top",
      "align.center-y",
      "align.bottom",
    ]),
    sub("Distribute", [
      "distribute.centers-x",
      "distribute.centers-y",
      "-",
      "distribute.spacing-x",
      "distribute.spacing-y",
    ]),
    sub("Colour Label", [
      "label.none",
      "-",
      "label.red",
      "label.orange",
      "label.yellow",
      "label.green",
      "label.blue",
      "label.violet",
      "label.gray",
    ]),
    "-",
    "layer.mergeDown",
    "layer.flatten",
  ]),
  sub("Select", [
    "select.all",
    "select.deselect",
    "select.reselect",
    "select.inverse",
    "-",
    sub("Layers", [
      "select.allLayers",
      "select.deselectLayers",
      "-",
      "layer.selectAbove",
      "layer.selectBelow",
    ]),
    "layer.selectPixels",
    "select.colorRange",
    "-",
    sub("Modify", ["select.feather", "select.expand", "select.contract"]),
    "select.grow",
    "select.similar",
    "-",
    "select.transform",
    "-",
    "path.makeSelection",
    "path.fromSelection",
  ]),
  sub("Filter", FILTER_MENU),
  sub("View", [
    "view.zoomIn",
    "view.zoomOut",
    "view.fit",
    "view.actualPixels",
    "-",
    sub("Show", ["view.rulers", "view.guides", "view.grid"]),
    "view.snap",
    "-",
    sub("Guides", ["view.newGuide", "view.lockGuides", "view.clearGuides"]),
    "view.gridSettings",
  ]),
  sub("Window", [
    "window.layers",
    "window.properties",
    "-",
    "window.history",
    "window.swatches",
    "window.actions",
  ]),
  sub("Help", [
    "help.welcome",
    "-",
    "help.docs",
    "help.shortcuts",
    "help.blog",
    "-",
    "help.install",
    "help.privacy",
    "-",
    "help.about",
  ]),
];

type Actions = Record<UiActionId, UiAction>;

/** A submenu is usable when anything inside it is. */
function anyEnabled(entry: MenuEntry, actions: Actions): boolean {
  if (entry === "-") return false;
  if (typeof entry === "string") return actions[entry].enabled;
  return entry.items.some((e) => anyEnabled(e, actions));
}

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

/** The items of one level of a menu, as direct children of a `role="menu"` element. */
function menuItems(list: HTMLElement): HTMLButtonElement[] {
  return [...list.querySelectorAll<HTMLButtonElement>("[data-menu-item]:not(:disabled)")].filter(
    (item) => item.closest('[role="menu"]') === list,
  );
}

interface ListProps {
  readonly id: string;
  readonly label: string;
  readonly items: readonly MenuEntry[];
  readonly actions: Actions;
  readonly isMac: boolean;
  /** Fixed position for submenus (right of the trigger, or left of it when that runs off). */
  readonly position?: { top: number; left: number; flipLeft: number };
  /** Focus the first item on opening (keyboard and click; not hover). */
  readonly autoFocus?: boolean;
  /** Arrow keys at the edge of the menu: move to the neighbouring top-level menu. */
  readonly onNeighbour: (delta: 1 | -1) => void;
  /** Leave this level (Escape, or Arrow Left in a submenu). */
  readonly onBack: () => void;
  /** An item ran: close every menu. */
  readonly onDone: () => void;
  readonly submenu?: boolean;
}

/** One menu level; opens its submenus to the side (hover, click, Enter or Arrow Right). */
function MenuList({
  id,
  label,
  items,
  actions,
  isMac,
  position,
  onNeighbour,
  onBack,
  onDone,
  submenu = false,
  autoFocus = true,
}: ListProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<{
    index: number;
    position: { top: number; left: number; flipLeft: number };
    focus: boolean;
  } | null>(null);
  const triggers = useRef(new Map<number, HTMLButtonElement>());

  useEffect(() => {
    if (autoFocus && ref.current) menuItems(ref.current)[0]?.focus();
  }, [autoFocus]);

  // Keep a submenu on screen: flip to the left, and move up when it would run off the bottom.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !position) return;
    const r = el.getBoundingClientRect();
    if (r.right > window.innerWidth - 4) {
      el.style.left = `${Math.max(4, position.flipLeft - r.width)}px`;
    }
    if (r.bottom > window.innerHeight - 4) {
      el.style.top = `${Math.max(4, window.innerHeight - 4 - r.height)}px`;
    }
  }, [position]);

  const openSub = (index: number, focus: boolean) => {
    const trigger = triggers.current.get(index);
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    setOpen({
      index,
      position: { top: r.top - 5, left: r.right + 2, flipLeft: r.left - 2 },
      focus,
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const list = ref.current;
    if (!list) return;
    // Keys from an open submenu are its own business.
    if ((event.target as HTMLElement).closest('[role="menu"]') !== list) return;
    const all = menuItems(list);
    const current = all.indexOf(document.activeElement as HTMLButtonElement);
    const focused = all[current];
    const subIndex = focused?.dataset.submenu !== undefined ? Number(focused.dataset.submenu) : -1;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      all[(current + delta + all.length) % all.length]?.focus();
      setOpen(null);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      all[event.key === "Home" ? 0 : all.length - 1]?.focus();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      if (subIndex >= 0) openSub(subIndex, true);
      else onNeighbour(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (submenu) onBack();
      else onNeighbour(-1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onBack();
    } else if (event.key === "Tab") {
      onDone();
    }
  };

  return (
    <div
      id={id}
      ref={ref}
      role="menu"
      aria-label={label}
      className={`${styles.menuPopup} ${submenu ? styles.submenuPopup : ""}`}
      style={position ? { top: position.top, left: position.left } : undefined}
      onKeyDown={onKeyDown}
    >
      {items.map((entry, i) => {
        if (entry === "-") {
          return <div key={`sep-${i}`} role="separator" className={styles.menuSeparator} />;
        }
        if (typeof entry !== "string") {
          const isOpen = open?.index === i;
          const subId = `${id}-${i}`;
          return (
            <div key={entry.label} className={styles.submenu}>
              <button
                ref={(el) => {
                  if (el) triggers.current.set(i, el);
                  else triggers.current.delete(i);
                }}
                type="button"
                role="menuitem"
                data-menu-item
                data-submenu={i}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-controls={isOpen ? subId : undefined}
                className={styles.menuItem}
                disabled={!anyEnabled(entry, actions)}
                onClick={() => (isOpen ? setOpen(null) : openSub(i, true))}
                onPointerEnter={() => !isOpen && openSub(i, false)}
              >
                <span>
                  <span className={styles.menuCheck} aria-hidden />
                  {entry.label}
                </span>
                <span className={styles.submenuArrow} aria-hidden>
                  ›
                </span>
              </button>
              {isOpen && (
                <MenuList
                  id={subId}
                  label={entry.label}
                  items={entry.items}
                  actions={actions}
                  isMac={isMac}
                  position={open.position}
                  autoFocus={open.focus}
                  onNeighbour={onNeighbour}
                  onBack={() => {
                    setOpen(null);
                    triggers.current.get(i)?.focus();
                  }}
                  onDone={onDone}
                  submenu
                />
              )}
            </div>
          );
        }
        const action = actions[entry];
        return (
          <button
            key={entry}
            type="button"
            role={action.checked === undefined ? "menuitem" : "menuitemcheckbox"}
            aria-checked={action.checked}
            data-menu-item
            className={styles.menuItem}
            disabled={!action.enabled}
            aria-label={action.label}
            aria-keyshortcuts={keyShortcutsFor(entry) || undefined}
            onPointerEnter={() => setOpen(null)}
            onClick={() => {
              onDone();
              action.run();
            }}
          >
            <span>
              <span className={styles.menuCheck} aria-hidden>
                {action.checked ? "✓" : ""}
              </span>
              {action.label}
            </span>
            <span className={styles.shortcut}>{shortcutFor(entry, isMac)}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Accessible menubar (WAI-ARIA menubar pattern): arrow keys move between and within menus. */
export function MenuBar({ actions }: { actions: Actions }) {
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

  return (
    <div className={styles.menubar} ref={barRef}>
      <button
        type="button"
        className={styles.brand}
        title="Welcome to Picstea"
        onClick={actions["help.welcome"].run}
      >
        <Image
          src="/brand/picstea-icon.png"
          alt="Picstea"
          width={22}
          height={22}
          className={styles.brandLogo}
          priority
          unoptimized
        />
      </button>
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
                <MenuList
                  key={index}
                  id={menuId}
                  label={menu.label}
                  items={menu.items}
                  actions={actions}
                  isMac={isMac}
                  onNeighbour={(delta) => setOpen(focusTrigger(index + delta))}
                  onBack={() => {
                    setOpen(null);
                    focusTrigger(index);
                  }}
                  onDone={() => setOpen(null)}
                />
              )}
            </div>
          );
        })}
      </div>
      {/* Website links open in a new tab, so the editor and its work stay where they are. */}
      <nav aria-label="Picstea" className={styles.menubarLinks}>
        <a href="/about" target="_blank" rel="noopener">
          About
        </a>
        <a href="/docs" target="_blank" rel="noopener">
          Learn
        </a>
        <a href="/docs/keyboard-shortcuts" target="_blank" rel="noopener">
          Shortcuts
        </a>
        <a href="/blog" target="_blank" rel="noopener">
          Blog
        </a>
      </nav>
    </div>
  );
}
