import type { Message } from "../core/message";
import type { AssetStore } from "../assets/asset-store";
import type { EditorStore } from "../core/editor-store";
import type { ContentSizer } from "../core/geometry/layer-geometry";
import {
  SNAP_DISTANCE_PX,
  snapPoint,
  type SnapLine,
  type SnapTargets,
} from "../core/geometry/snapping";
import type { Point, Viewport } from "../core/viewport/viewport";
import type { SurfaceFactory } from "../rendering/canvas/canvas2d-renderer";
import type { CompositePreview } from "../rendering/compositing/compositor";
import type { Overlay } from "../rendering/overlay";
import type { SelectionMask } from "../selection/mask";
import type { JobRunner } from "../workers/job-runner";

/**
 * Editing tools (ADR-0007). Tools are plain objects driven by the viewport: they receive pointer
 * input in document space, change the document only through commands, and describe transient
 * feedback (previews, overlays) for the renderer. No React, no DOM events.
 */

export interface ToolPointer {
  /** Document coordinates. */
  readonly doc: Point;
  /** Viewport-local CSS pixels. */
  readonly screen: Point;
  readonly button: number;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  /** Cmd on macOS, Ctrl elsewhere. */
  readonly modKey: boolean;
  /** Intermediate positions since the last event (high-frequency pen/mouse input), in document space. */
  readonly coalesced?: readonly Point[];
}

export interface ToolKey {
  readonly key: string;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly modKey: boolean;
}

export interface ToolContext {
  readonly store: EditorStore;
  readonly assets: AssetStore;
  readonly sizer: ContentSizer;
  readonly createSurface: SurfaceFactory;
  /** CPU-heavy work off the UI thread (ADR-0012). */
  readonly jobs: JobRunner;
  viewport(): Viewport;
  notify(kind: "info" | "error", message: Message): void;
  /** Ask for a redraw because previews/overlays changed. */
  invalidate(): void;
  /** Called after new pixel assets were committed, so memory can be rebalanced. */
  pixelsCommitted(): void;
  /** Open the on-canvas text editor. */
  beginTextEdit(request: TextEditRequest): void;
  /**
   * What drags can snap to in the active document (ADR-0014), or null when snapping is off.
   * Layers being moved are excluded so they don't snap to themselves.
   */
  snapTargets(excludeLayerIds?: readonly string[]): SnapTargets | null;
}

/**
 * Snap targets for a drag, or null when snapping is off or temporarily disabled by holding
 * Cmd/Ctrl, with the snap distance in document units at the current zoom.
 */
export function dragSnapping(
  ctx: ToolContext,
  pointer: ToolPointer,
  excludeLayerIds?: readonly string[],
): { targets: SnapTargets; threshold: number } | null {
  if (pointer.modKey) return null;
  const targets = ctx.snapTargets(excludeLayerIds);
  return targets && { targets, threshold: SNAP_DISTANCE_PX / ctx.viewport().zoom };
}

export type TextEditRequest =
  | { readonly mode: "edit"; readonly layerId: string }
  | { readonly mode: "new"; readonly at: Point };

export interface Tool {
  readonly id: string;
  /** CSS cursor for the current pointer position (null when the pointer is outside). */
  cursor(ctx: ToolContext, pointer: ToolPointer | null): string;
  pointerDown(ctx: ToolContext, pointer: ToolPointer): void;
  pointerMove(ctx: ToolContext, pointer: ToolPointer): void;
  pointerUp(ctx: ToolContext, pointer: ToolPointer): void;
  /** Return true if the key was handled. */
  keyDown?(ctx: ToolContext, key: ToolKey): boolean;
  doubleClick?(ctx: ToolContext, pointer: ToolPointer): void;
  /** The pointer left the canvas. */
  leave?(ctx: ToolContext): void;
  /** Abort any gesture in progress without committing. */
  cancel(ctx: ToolContext): void;
  overlays(ctx: ToolContext): readonly Overlay[];
  preview(ctx: ToolContext): CompositePreview | undefined;
  /**
   * The selection to show instead of the document's while a gesture changes it (moving or
   * transforming the outline). `undefined` = no override, `null` = hide the outline.
   */
  selectionPreview?(ctx: ToolContext): SelectionMask | null | undefined;
}

/** The pointer's document position snapped (when snapping is on), with the lines it hit. */
export function snappedPointer(
  ctx: ToolContext,
  pointer: ToolPointer,
): { point: Point; lines: readonly SnapLine[] } {
  const snapping = dragSnapping(ctx, pointer);
  if (!snapping) return { point: pointer.doc, lines: [] };
  const snap = snapPoint(pointer.doc, snapping.targets, snapping.threshold);
  return { point: { x: pointer.doc.x + snap.dx, y: pointer.doc.y + snap.dy }, lines: snap.lines };
}

/** Screen-space hit radius for handles, in CSS pixels. */
export const HANDLE_HIT_PX = 7;
