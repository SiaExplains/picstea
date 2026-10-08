import type { EditorDocument } from "../core/document/types";
import type { Size, Viewport } from "../core/viewport/viewport";
import type { AssetResolver } from "./compositing/compositor";

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
}

export interface Renderer {
  render(scene: RenderScene): void;
  dispose(): void;
}
