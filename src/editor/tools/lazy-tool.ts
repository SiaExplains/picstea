import type { CompositePreview } from "../rendering/compositing/compositor";
import type { Overlay } from "../rendering/overlay";
import type { Tool, ToolContext, ToolKey, ToolPointer } from "./tool";

/**
 * A tool whose code is loaded the first time it is used, to keep the editor's first download
 * small (ADR-0044). Until it has loaded (a few milliseconds after the tool is picked) input is
 * ignored; then every call goes to the real tool.
 */
export class LazyTool implements Tool {
  private tool: Tool | null = null;
  private loading: Promise<void> | null = null;

  constructor(
    readonly id: string,
    private readonly load: () => Promise<Tool>,
  ) {}

  /** Start loading; the tool manager calls this when the tool becomes active. */
  prepare(ctx?: ToolContext): Promise<void> {
    this.loading ??= this.load().then((tool) => {
      this.tool = tool;
      ctx?.invalidate();
    });
    return this.loading;
  }

  /** The loaded tool, if any (for tool-specific commands such as Apply). */
  get loaded(): Tool | null {
    return this.tool;
  }

  cursor(ctx: ToolContext, pointer: ToolPointer | null): string {
    if (!this.tool) void this.prepare(ctx);
    return this.tool?.cursor(ctx, pointer) ?? "progress";
  }
  pointerDown(ctx: ToolContext, pointer: ToolPointer): void {
    if (!this.tool) void this.prepare(ctx);
    this.tool?.pointerDown(ctx, pointer);
  }
  pointerMove(ctx: ToolContext, pointer: ToolPointer): void {
    this.tool?.pointerMove(ctx, pointer);
  }
  pointerUp(ctx: ToolContext, pointer: ToolPointer): void {
    this.tool?.pointerUp(ctx, pointer);
  }
  keyDown(ctx: ToolContext, key: ToolKey): boolean {
    return this.tool?.keyDown?.(ctx, key) ?? false;
  }
  cancel(ctx: ToolContext): void {
    this.tool?.cancel(ctx);
  }
  overlays(ctx: ToolContext): readonly Overlay[] {
    return this.tool?.overlays(ctx) ?? [];
  }
  preview(ctx: ToolContext): CompositePreview | undefined {
    return this.tool?.preview(ctx);
  }
}
