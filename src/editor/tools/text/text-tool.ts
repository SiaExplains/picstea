import { activeLayer } from "../../core/document/queries";
import { flattenTopFirst } from "../../core/document/tree";
import { hitTestLayer } from "../../core/geometry/layer-geometry";
import type { Tool, ToolContext, ToolPointer } from "../tool";

/**
 * Text tool: click empty canvas to start a new text block, click an existing text layer to edit
 * it. Typing happens in the on-canvas editor owned by the controller (beginTextEdit).
 */
export class TextTool implements Tool {
  readonly id = "text";

  cursor(): string {
    return "text";
  }

  pointerDown(ctx: ToolContext, pointer: ToolPointer): void {
    const session = ctx.store.getSession();
    if (!session || pointer.button !== 0) return;
    const doc = session.document;
    const tolerance = 4 / ctx.viewport().zoom;
    for (const { layer, effectivelyVisible } of flattenTopFirst(doc.layers, {
      includeCollapsed: true,
    })) {
      if (!effectivelyVisible) continue;
      if (layer.kind === "text" && hitTestLayer(layer, pointer.doc, doc, ctx.sizer, tolerance)) {
        if (layer.locked) {
          ctx.notify("error", `"${layer.name}" is locked. Unlock it to edit the text.`);
          return;
        }
        ctx.store.selectLayer(layer.id);
        ctx.beginTextEdit({ mode: "edit", layerId: layer.id });
        return;
      }
    }
    ctx.beginTextEdit({
      mode: "new",
      at: { x: Math.round(pointer.doc.x), y: Math.round(pointer.doc.y) },
    });
  }

  pointerMove(): void {}

  pointerUp(): void {}

  doubleClick(ctx: ToolContext): void {
    const doc = ctx.store.getSession()?.document;
    const layer = doc ? activeLayer(doc) : undefined;
    if (layer?.kind === "text" && !layer.locked)
      ctx.beginTextEdit({ mode: "edit", layerId: layer.id });
  }

  cancel(): void {}

  overlays(): readonly [] {
    return [];
  }

  preview(): undefined {
    return undefined;
  }
}
