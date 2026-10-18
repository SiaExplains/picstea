"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import styles from "./editor.module.css";

export type ContextMenuEntry =
  | {
      readonly kind: "item";
      readonly label: string;
      readonly enabled: boolean;
      readonly run: () => void;
      readonly shortcut?: string;
      /** A small swatch or icon before the label. */
      readonly icon?: ReactNode;
      readonly checked?: boolean;
    }
  | { readonly kind: "separator" }
  | {
      readonly kind: "submenu";
      readonly label: string;
      readonly items: readonly ContextMenuEntry[];
    };

const MARGIN = 4;

/** Keep a popup of the given size inside the viewport, flipping left/up when it would overflow. */
function place(x: number, y: number, width: number, height: number, flipFrom?: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = x;
  if (left + width > vw - MARGIN) left = flipFrom !== undefined ? flipFrom - width : vw - width;
  return {
    left: Math.max(MARGIN, left),
    top: Math.max(MARGIN, Math.min(y, vh - height - MARGIN)),
  };
}

function MenuList({
  items,
  x,
  y,
  flipFrom,
  label,
  autoFocus = true,
  onClose,
  onBack,
}: {
  items: readonly ContextMenuEntry[];
  x: number;
  y: number;
  /** Left edge of the parent menu: a submenu that doesn't fit on the right opens on the left. */
  flipFrom?: number;
  label: string;
  /** Move keyboard focus into the menu (not when a submenu opens on hover). */
  autoFocus?: boolean;
  onClose: () => void;
  onBack?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });
  const [openSub, setOpenSub] = useState<{ index: number; focus: boolean } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition(place(x, y, rect.width, rect.height, flipFrom));
    if (!autoFocus) return;
    const focusFirst = () =>
      el.querySelector<HTMLButtonElement>('[role^="menuitem"]:not(:disabled)')?.focus();
    focusFirst();
    // On macOS the menu opens during mousedown, whose default action then moves focus to the
    // page; take it back on the next frame.
    const frame = requestAnimationFrame(() => {
      if (!el.contains(document.activeElement)) focusFirst();
    });
    return () => cancelAnimationFrame(frame);
  }, [x, y, flipFrom, autoFocus]);

  const buttons = () =>
    [
      ...(ref.current?.querySelectorAll<HTMLButtonElement>(":scope > [role^='menuitem']") ?? []),
    ].filter((b) => !b.disabled);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget && !event.currentTarget.contains(event.target as Node))
      return;
    const list = buttons();
    const index = list.indexOf(document.activeElement as HTMLButtonElement);
    const focus = (i: number) => list[(i + list.length) % list.length]?.focus();
    switch (event.key) {
      case "ArrowDown":
        focus(index + 1);
        break;
      case "ArrowUp":
        focus(index - 1);
        break;
      case "Home":
        focus(0);
        break;
      case "End":
        focus(list.length - 1);
        break;
      case "ArrowLeft":
        if (!onBack) return;
        onBack();
        break;
      case "Escape":
        if (onBack) onBack();
        else onClose();
        break;
      case "Tab":
        onClose();
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      className={styles.contextMenu}
      style={{ left: position.left, top: position.top }}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((entry, i) => {
        if (entry.kind === "separator") {
          return <div key={`sep-${i}`} role="separator" className={styles.menuSeparator} />;
        }
        if (entry.kind === "submenu") {
          const open = openSub?.index === i;
          return (
            <SubmenuTrigger
              key={entry.label}
              entry={entry}
              open={open}
              focusFirst={!!openSub?.focus}
              onOpen={(focus) => setOpenSub({ index: i, focus })}
              onCloseSub={() => setOpenSub(null)}
              onCloseAll={onClose}
            />
          );
        }
        return (
          <button
            key={entry.label}
            type="button"
            role={entry.checked === undefined ? "menuitem" : "menuitemradio"}
            aria-checked={entry.checked}
            className={styles.menuItem}
            disabled={!entry.enabled}
            onPointerEnter={() => setOpenSub(null)}
            onClick={() => {
              onClose();
              entry.run();
            }}
          >
            <span className={styles.contextLabel}>
              {entry.checked !== undefined && (
                <span className={styles.menuCheck} aria-hidden>
                  {entry.checked ? "✓" : ""}
                </span>
              )}
              {entry.icon}
              {entry.label}
            </span>
            {entry.shortcut && <span className={styles.shortcut}>{entry.shortcut}</span>}
          </button>
        );
      })}
    </div>
  );
}

function SubmenuTrigger({
  entry,
  open,
  focusFirst,
  onOpen,
  onCloseSub,
  onCloseAll,
}: {
  entry: Extract<ContextMenuEntry, { kind: "submenu" }>;
  open: boolean;
  focusFirst: boolean;
  onOpen: (focus: boolean) => void;
  onCloseSub: () => void;
  onCloseAll: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  // Measured when the submenu opens (in the event), so it can sit beside its trigger.
  const [rect, setRect] = useState<DOMRect | null>(null);
  const openHere = (focus: boolean) => {
    if (ref.current) setRect(ref.current.getBoundingClientRect());
    onOpen(focus);
  };
  return (
    <>
      <button
        ref={ref}
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        className={styles.menuItem}
        onPointerEnter={() => openHere(false)}
        onClick={() => openHere(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            openHere(true);
          }
        }}
      >
        <span>{entry.label}</span>
        <span className={styles.shortcut} aria-hidden>
          ▸
        </span>
      </button>
      {open && rect && (
        <MenuList
          items={entry.items}
          x={rect.right - 2}
          y={rect.top - 4}
          flipFrom={rect.left + 2}
          label={entry.label}
          autoFocus={focusFirst}
          onClose={onCloseAll}
          onBack={() => {
            onCloseSub();
            ref.current?.focus();
          }}
        />
      )}
    </>
  );
}

/**
 * A right-click menu at a point (Layers panel). Arrow keys move, Enter runs, → / ← open and close
 * submenus, Esc closes and returns focus to where it was. Clicking elsewhere, scrolling, resizing
 * or leaving the window closes it.
 */
export function ContextMenu({
  x,
  y,
  label,
  items,
  onClose,
}: {
  x: number;
  y: number;
  label: string;
  items: readonly ContextMenuEntry[];
  onClose: () => void;
}) {
  // Where focus was when the menu opened; it goes back there when the menu closes.
  const [returnFocus] = useState(() =>
    typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null),
  );

  useEffect(() => {
    const close = () => onClose();
    // Esc closes the menu even when focus is somewhere else.
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        onClose();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target as Element).closest?.(`.${styles.contextMenu}`)) onClose();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", close);
    window.addEventListener("blur", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("blur", close);
      window.removeEventListener("scroll", close, true);
      returnFocus?.focus?.();
    };
  }, [onClose, returnFocus]);

  return <MenuList items={items} x={x} y={y} label={label} onClose={onClose} />;
}
