import type { EditorDocument, Guide } from "../core/document/types";
import type { Size, Viewport } from "../core/viewport/viewport";
import type { ContentSizer } from "../core/geometry/layer-geometry";
import type { AssetResolver, CompositePreview } from "./compositing/compositor";
import type { SelectionMask } from "../selection/mask";
import type { Overlay } from "./overlay";

/**
 * Rendering abstraction (ADR-0002). The editor talks to a Renderer; Canvas 2D is the only
 * implementation until profiling justifies a GPU path (docs/04_RENDERING_ENGINE.md).
 */
export interface RenderScene {
  readonly document: EditorDocument;
  readonly viewport: Viewport;
  /** Viewport element size in CSS pixels. */
  readonly screen: Size;
  readonly devicePixelRatio: number;
  readonly assets: AssetResolver;
  /** Changes when assets finish decoding, so cached composites can be invalidated. */
  readonly assetVersion: number;
  readonly sizer: ContentSizer;
  /** Uncommitted tool output (stroke in progress, shape draft). Forces a re-composite. */
  readonly preview?: CompositePreview;
  readonly overlays?: readonly Overlay[];
  /** Selection outline to draw as marching ants (ADR-0010). */
  readonly selection?: SelectionMask;
  /** Dash offset in CSS pixels; advancing it animates the ants. */
  readonly antsPhase?: number;
  /** Guides to draw (never exported); omit to hide them. */
  readonly guides?: readonly Guide[];
  /** Grid spacing in document pixels; omit for no grid. */
  readonly grid?: number;
}

export interface Renderer {
  render(scene: RenderScene): void;
  dispose(): void;
}
