import type { ReactNode } from "react";
import Link from "next/link";
import { EditorLink } from "@/components/site/EditorLink";
import { ShortcutTable } from "@/components/site/ShortcutTable";

/**
 * Picstea documentation (docs/10 "Content strategy"). Every page describes features that exist
 * today; limitations are stated plainly. Content is typed TSX, so no Markdown dependency.
 */

export interface DocPage {
  readonly slug: string;
  readonly title: string;
  /** Meta description and index summary. */
  readonly description: string;
  /** ISO date of the last meaningful change. */
  readonly updated: string;
  readonly body: () => ReactNode;
}

export const DOCS: readonly DocPage[] = [
  {
    slug: "getting-started",
    title: "Getting started with Picstea",
    description:
      "Create a document, open an image or PSD, edit with layers and export — all in your browser, without uploading anything.",
    updated: "2026-10-19",
    body: () => (
      <>
        <p>
          Picstea is an image editor that runs entirely in your browser. Your images and projects
          stay on your device: nothing is uploaded to a server.
        </p>
        <h2>Open the editor</h2>
        <p>
          Go to <EditorLink>picstea.com</EditorLink>. The editor opens straight away. On the start
          screen you can:
        </p>
        <ul>
          <li>
            <strong>New document</strong> — pick a ready-made size from Social (Instagram, YouTube,
            X, LinkedIn…), Print (A4, Letter, business cards), Photo, Screen, Mobile, Ads or Icons,
            or search for one such as “story” or “A4”. You can also type your own size in pixels,
            inches, centimetres or millimetres, set the resolution (ppi) and choose a background.
            Sizes you use are listed under Recent.
          </li>
          <li>
            <strong>Open image</strong> — PNG, JPEG, WebP, GIF, SVG, PSD or a <code>.picstea</code>{" "}
            project file. You can also drop a file anywhere on the page or paste an image.
          </li>
          <li>
            <strong>Recent in this browser</strong> — projects you worked on before. They are saved
            automatically in this browser.
          </li>
        </ul>
        <h2>The workspace</h2>
        <ul>
          <li>
            <strong>Menu bar</strong> — File, Edit, Image, Layer, Select, Filter, View, Window and
            Help. Items marked › open a submenu: point at them, or press Arrow Right (Arrow Left or
            Escape goes back). Adjustment layers are under Layer → New Adjustment Layer and Image →
            Adjustments; filters are grouped by kind (Blur, Sharpen…). Window brings the Layers,
            Properties, History, Swatches and Actions panels forward.
          </li>
          <li>
            <strong>Tool options</strong> — settings for the active tool, such as brush size or
            selection mode.
          </li>
          <li>
            <strong>Toolbar</strong> (left) — move, selection, crop, painting, retouching, shape,
            pen, text, hand and zoom tools, plus foreground and background colours. Related tools
            share a slot, marked with a small corner: right-click it or hold the mouse on it to
            choose another one, or press Shift with its key (for example Shift+J) to go through
            them. The key alone returns to the tool you used last in that slot.
          </li>
          <li>
            <strong>Properties and Layers</strong> (right) — settings of the active layer and the
            layer stack. Drag the edges between the panels, or the column&apos;s left edge, to
            resize them; Picstea remembers the sizes in this browser.
          </li>
        </ul>
        <h2>Save and export</h2>
        <ul>
          <li>Work is saved in this browser automatically; File → Save to Browser saves now.</li>
          <li>
            File → Save Project As… downloads a <code>.picstea</code> file with everything in it,
            for backups or to continue on another computer.
          </li>
          <li>File → Export As… creates a PNG, JPEG, WebP, SVG, PDF or PSD file.</li>
        </ul>
        <p>
          Browsers can clear their storage, so keep a project file or an export of work that
          matters. See <Link href="/docs/privacy-and-storage">Privacy and storage</Link>.
        </p>
      </>
    ),
  },
  {
    slug: "layers-groups-and-masks",
    title: "Layers, groups and masks",
    description:
      "How Picstea's layers work: pixel, shape, text, fill and adjustment layers, groups, blend modes, opacity, masks and effects.",
    updated: "2026-10-19",
    body: () => (
      <>
        <p>
          A document is a stack of layers. Layers higher in the Layers panel cover the ones below
          them. Every change can be undone.
        </p>
        <h2>Kinds of layers</h2>
        <ul>
          <li>
            <strong>Pixel layers</strong> — images and painting. Layer → New Layer adds an empty
            one.
          </li>
          <li>
            <strong>Shape layers</strong> — rectangles, ellipses and lines that stay editable.
          </li>
          <li>
            <strong>Text layers</strong> — text you type on the canvas and can edit any time.
          </li>
          <li>
            <strong>Fill layers</strong> — a solid colour covering the canvas.
          </li>
          <li>
            <strong>Adjustment layers</strong> — Levels, Curves, Brightness/Contrast,
            Hue/Saturation, Vibrance, Color Balance, Photo Filter, Channel Mixer, Gradient Map,
            Exposure, Temperature/Tint, Black &amp; White, Invert, Posterize and Threshold. They
            change everything below them without touching the pixels. A new Gradient Map runs from
            the foreground to the background colour; add up to 16 colour stops in the Properties
            panel.
          </li>
        </ul>
        <h2>Levels and Curves</h2>
        <p>
          Layer → New Adjustment Layer → Levels sets the black point, white point and midtones
          (gamma) of the image below, and can compress the output range. Layer → New Adjustment
          Layer → Curves gives full control of the tones: click the curve to add a point, drag it,
          and drag a point off the graph to remove it. A point can also be moved with the arrow keys
          (Shift for steps of 10), or by typing its input and output values. Both work on the
          combined RGB channel or on red, green and blue separately, and show a histogram of the
          image beneath the layer.
        </p>
        <h2>Opacity and blend modes</h2>
        <p>
          Each layer has an opacity and one of 16 blend modes (Multiply, Screen, Overlay and more)
          in the Properties panel.
        </p>
        <h2>Groups</h2>
        <p>
          Select layers and press Cmd/Ctrl+G to put them in a group; Cmd/Ctrl+Shift+G ungroups. Drag
          layers in the Layers panel to reorder them or move them into a group. By default a group
          passes its layers&apos; blending through; give it opacity, a blend mode, a mask or effects
          to treat it as one unit. With the Move tool, a selected group shows a frame: drag it to
          move the group, drag its handles to scale everything inside, or drag just outside a corner
          to rotate it.
        </p>
        <h2>Selecting several layers</h2>
        <ul>
          <li>
            In the Layers panel, Cmd-click (Ctrl-click on Windows) adds or removes a layer;
            Shift-click selects every layer between the active one and the one you click. Select →
            All Layers (Cmd/Ctrl+Alt+A) selects everything.
          </li>
          <li>
            With the Move tool and Auto-select on, Shift-click a layer on the canvas to add it.
          </li>
          <li>
            Selected layers move, scale, rotate and flip together, and can be grouped, duplicated or
            deleted in one step. The Properties panel shows the settings of the active layer (the
            one you selected last).
          </li>
          <li>Painting, filters and adjustments still work on the active layer only.</li>
        </ul>
        <h2>Align and distribute</h2>
        <p>
          Layer → Align lines up the selected layers with each other — or with the pixel selection,
          if there is one. A single layer aligns to the canvas. Layer → Distribute spaces three or
          more layers evenly, by their centres or with equal gaps between them; the outermost layers
          stay where they are. The same buttons are in the Move tool&apos;s options bar and the
          Properties panel when several layers are selected.
        </p>
        <h2>Masks</h2>
        <p>
          Layer → Raster Mask → Add Layer Mask hides parts of a layer without erasing them. Click
          the mask thumbnail, then paint black to hide, white to reveal and grey for partial
          transparency. Shift-click the thumbnail to turn the mask off temporarily. With a selection
          active, the new mask reveals only the selection.
        </p>
        <h2>Clipping masks</h2>
        <p>
          Layer → Create Clipping Mask (Cmd/Ctrl+Alt+G) shows a layer only where the layer directly
          below it has pixels — for example a photo inside a text or shape. Clipped layers are
          indented with ↳ in the Layers panel and the layer they clip to is underlined. Several
          layers can clip to the same base, and a clipped adjustment layer changes only that base.
        </p>
        <h2>Vector masks</h2>
        <p>
          A vector mask hides a layer outside a path, with perfectly smooth edges at any size. Draw
          a path with the Pen tool in Path mode, then choose Layer → Vector Mask → Add Vector Mask
          from Path (or the Mask button in the Pen options). Edit its points with the Direct
          Selection tool (A); Shift-click the mask badge in the Layers panel to turn it off. A layer
          can have both a pixel mask and a vector mask. See{" "}
          <Link href="/docs/paths-and-the-pen-tool">paths and the Pen tool</Link>.
        </p>
        <h2>Effects</h2>
        <p>
          Picstea has Photoshop&apos;s ten layer effects: Bevel and Emboss (with Contour and
          Texture), Stroke, Inner Shadow, Inner Glow, Satin, Color Overlay, Gradient Overlay,
          Pattern Overlay, Outer Glow and Drop Shadow. Switch them on in the Properties panel, or
          set them up in the <strong>Layer Style</strong> dialog: double-click a layer row (not its
          name) or choose Layer → Blending Options…. Layers with effects show an <em>fx</em> badge.
        </p>
        <ul>
          <li>
            Every effect has its own blend mode and opacity, and the options you know from
            Photoshop: spread or choke, size, contour, noise, angle and distance, gradient styles
            (linear, radial, angle, reflected, diamond) and stroke position (outside, inside,
            center).
          </li>
          <li>
            The <strong>+</strong> button next to Drop Shadow, Inner Shadow, Stroke, Color Overlay
            and Gradient Overlay adds another copy (up to 10). Reorder or delete a copy with the
            buttons under the list.
          </li>
          <li>
            <strong>Use Global Light</strong> links the angle of shadows and bevels across the
            document: change it in one effect, or under Blending Options, and they all follow.
          </li>
          <li>
            <strong>Blend If</strong> (Blending Options) hides a layer&apos;s pixels by their own
            brightness (This Layer) or by what is beneath them (Underlying Layer), for grey or one
            colour channel. Alt-drag a slider to split it for a smooth transition; double-click a
            split half to join it again. <strong>Channels</strong> R, G and B choose which colour
            channels the layer changes.
          </li>
          <li>
            <strong>Fill Opacity</strong> (Blending Options) fades the layer&apos;s own pixels but
            not its effects, for a glass or outline look.
          </li>
          <li>
            <strong>New Style…</strong> saves the current style in this browser; the Styles page
            lists your styles and a few built-in ones. Click one to apply it, or Clear Layer Style
            to remove every effect.
          </li>
        </ul>
        <p>
          OK keeps everything as one undo step, Cancel puts the layer back. Layer → Rasterize Layer
          Style bakes the effects into the pixels. Patterns are a built-in set; Photoshop patterns
          in a PSD are replaced by the closest one.
        </p>
        <h2>Right-click a layer</h2>
        <p>
          Right-click a layer for Blending Options, Select Pixels (a selection from the layer&apos;s
          transparency), Duplicate, Delete, smart objects, Rasterize, clipping masks,{" "}
          <strong>Merge Down</strong> (Cmd/Ctrl+E — the layer drawn onto the one below, which keeps
          its name, opacity and blend mode), <strong>Flatten Image</strong> (every visible layer as
          one) and a <strong>colour label</strong> to organise the panel. Labels are saved in
          projects and PSD files.
        </p>
        <p>Drag layers onto the trash to delete them, or onto New Layer to duplicate them.</p>
        <h2>Limitations</h2>
        <ul>
          <li>Masks follow a layer when it moves, but not when it is scaled or rotated.</li>
          <li>
            Stretching a selection that contains rotated layers keeps each of those layers
            rectangular (Picstea has no skew): their centres move correctly, but their shape is not
            sheared.
          </li>
          <li>
            Clipped layers are limited to the base layer&apos;s pixels; on semi-transparent base
            pixels the result can differ slightly from Photoshop.
          </li>
        </ul>
      </>
    ),
  },
  {
    slug: "selections",
    title: "Selections",
    description:
      "Select with the marquee, lasso and magic wand, combine and refine selections, and use them to paint, fill, copy and mask.",
    updated: "2026-10-09",
    body: () => (
      <>
        <p>
          A selection limits where edits happen. Its outline is shown with &ldquo;marching
          ants&rdquo;. Selections can be undone like any change but are not saved with the project.
        </p>
        <h2>Selection tools</h2>
        <ul>
          <li>
            <strong>Marquee</strong> (M) — rectangle or ellipse. Hold Shift while dragging for a
            square or circle, Alt to draw from the centre.
          </li>
          <li>
            <strong>Lasso</strong> (L) — freehand, or polygonal: click to add points, double-click
            or press Enter to close.
          </li>
          <li>
            <strong>Magic Wand</strong> (W) — selects similar colours. Set the tolerance, whether
            the area must be contiguous, and whether to sample all layers.
          </li>
        </ul>
        <p>
          Hold Shift to add to the selection, Alt to subtract, and both to keep only the overlap —
          or choose the mode in the tool options. Drag inside a selection, or use the arrow keys, to
          move its outline.
        </p>
        <h2>The Select menu</h2>
        <ul>
          <li>All, Deselect, Reselect and Inverse.</li>
          <li>Color Range… selects every pixel close to a colour, with a fuzziness slider.</li>
          <li>Feather…, Expand… and Contract… change the edge.</li>
          <li>Transform Selection scales and rotates the outline with handles.</li>
        </ul>
        <h2>Using a selection</h2>
        <ul>
          <li>Brush, pencil, eraser, paint bucket and gradient only paint inside it.</li>
          <li>Delete clears the selected pixels; Edit → Fill (Shift+F5) fills them.</li>
          <li>Cut, Copy and Paste work with the selected pixels.</li>
          <li>Cmd/Ctrl+J copies the selection to a new layer.</li>
          <li>Image → Crop to Selection crops the canvas to it.</li>
        </ul>
      </>
    ),
  },
  {
    slug: "painting-and-fills",
    title: "Painting, fills and gradients",
    description:
      "Brush, pencil, eraser, paint bucket, gradient and eyedropper in Picstea, and how they work with layers, masks and selections.",
    updated: "2026-10-19",
    body: () => (
      <>
        <p>
          Painting tools work on pixel layers and on masks. Add an empty pixel layer with Layer →
          New Layer before painting on a new document.
        </p>
        <ul>
          <li>
            <strong>Brush</strong> (B) — size, hardness and opacity. [ and ] change the size.
          </li>
          <li>
            <strong>Pencil</strong> (N) — hard-edged pixels, good for pixel art.
          </li>
          <li>
            <strong>Color Replacement</strong> (Shift+B) — paints the foreground colour&apos;s hue
            over colours like the one under the first dab, keeping their shading.
          </li>
          <li>
            <strong>Eraser</strong> (E) — erases to transparency.
          </li>
          <li>
            <strong>Background Eraser</strong> — erases only colours close to the one under the
            first dab (Tolerance), for cutting out an object from a plain background.
          </li>
          <li>
            <strong>Magic Eraser</strong> — click to erase an area of similar colour at once, like
            the paint bucket in reverse.
          </li>
          <li>
            <strong>Paint Bucket</strong> (Shift+G) — fills an area of similar colour with the
            foreground colour.
          </li>
          <li>
            <strong>Gradient</strong> (G) — linear or radial, from the foreground colour to the
            background colour or to transparent. Shift snaps the direction to 45°.
          </li>
          <li>
            <strong>Eyedropper</strong> (I) — click to pick the foreground colour, Alt-click for the
            background colour. Alt-click with the brush or pencil also picks a colour.
          </li>
          <li>
            <strong>Color Sampler</strong> — up to four fixed points whose colours stay listed in
            the options bar while you edit. Drag a point to move it, Alt-click to remove it.
          </li>
          <li>
            <strong>Ruler</strong> — drag to measure a distance and an angle (Shift: 45° steps).
          </li>
        </ul>
        <p>
          X swaps the foreground and background colours, D resets them to black and white. With a
          selection, all of these tools stay inside it.
        </p>
      </>
    ),
  },
  {
    slug: "retouching",
    title: "Retouching: clone, heal, dodge, burn and more",
    description:
      "Remove blemishes and distractions with the Clone Stamp and Healing Brush in Picstea, and lighten, darken, saturate, blur, sharpen or smudge areas with a brush.",
    updated: "2026-10-19",
    body: () => (
      <>
        <p>
          The retouching tools paint changes onto the active pixel layer. Each stroke is one step in
          the history, so Undo takes back the last stroke. Size, hardness and the other options are
          in the options bar; [ and ] change the size. With a selection, only the selected area
          changes.
        </p>
        <h2>Clone Stamp (S)</h2>
        <p>
          Alt-click (Option-click on a Mac) where you want to copy from, then paint where the copy
          should go. A crosshair shows where the tool is copying from.
        </p>
        <ul>
          <li>
            <strong>Aligned</strong> (on by default) keeps the same distance between source and
            brush for every stroke. Turn it off to start from the original source point each time.
          </li>
          <li>
            <strong>Sample: All layers</strong> copies what you see. Use it on a new, empty layer to
            keep your retouching separate from the original photo.
          </li>
        </ul>
        <h2>Healing Brush (J)</h2>
        <p>
          Works like the Clone Stamp, but when you release the mouse the copied area takes on the
          colour and brightness of its new surroundings while keeping its texture. It is the
          quickest way to remove spots, dust and blemishes: Alt-click on clean skin or background
          nearby, then paint over the blemish.
        </p>
        <h2>Spot Healing Brush and Red Eye</h2>
        <p>
          The <strong>Spot Healing Brush</strong> needs no Alt-click: paint over a small spot and
          Picstea picks a matching patch nearby by itself, then heals it the same way. The{" "}
          <strong>Red Eye</strong> tool takes the red out of pupils you click or paint over and
          darkens them (Darken); skin and eyelids around them are left alone.
        </p>
        <h2>Dodge, Burn and Sponge (O)</h2>
        <ul>
          <li>
            <strong>Dodge</strong> lightens and <strong>Burn</strong> darkens. Range chooses whether
            shadows, midtones or highlights are affected most; Exposure sets the strength.
          </li>
          <li>
            <strong>Sponge</strong> increases or decreases colour saturation; Flow sets the
            strength.
          </li>
        </ul>
        <h2>Blur, Sharpen and Smudge (R)</h2>
        <ul>
          <li>
            <strong>Blur</strong> softens details, <strong>Sharpen</strong> makes edges crisper.
          </li>
          <li>
            <strong>Smudge</strong> drags colour in the direction you paint, like a finger in wet
            paint.
          </li>
        </ul>
        <p>
          Within one stroke the effect never goes beyond the strength you set; paint another stroke
          to build it up.
        </p>
        <h2>Limitations</h2>
        <ul>
          <li>
            The tools work on pixel layers. To retouch a smart object, shape or text, rasterize it
            first (Layer → Rasterize Layer), or clone onto an empty layer with Sample: All layers.
          </li>
          <li>There is no Spot Healing Brush or content-aware fill yet.</li>
          <li>Retouching strokes are not recorded in actions.</li>
        </ul>
      </>
    ),
  },
  {
    slug: "guides-grid-and-snapping",
    title: "Rulers, guides, grid and snapping",
    description:
      "Place layers precisely in Picstea: rulers, guides you drag from the ruler, a grid, snapping with smart guides, and aligning layers to the canvas or a selection.",
    updated: "2026-10-09",
    body: () => (
      <>
        <h2>Rulers</h2>
        <p>
          View → Show → Rulers (Cmd/Ctrl+R) shows rulers along the top and left of the canvas, in
          pixels. They follow zoom and scrolling, and mark where the pointer is.
        </p>
        <h2>Guides</h2>
        <ul>
          <li>
            Drag down from the top ruler for a horizontal guide, or right from the left ruler for a
            vertical one.
          </li>
          <li>View → Guides → New Guide… places a guide at an exact position.</li>
          <li>
            With the Move tool, drag a guide to move it. Drag it back onto a ruler (or off the
            canvas) to delete it.
          </li>
          <li>
            View → Show → Guides (Cmd/Ctrl+;) hides or shows them, View → Guides → Lock Guides stops
            them moving and View → Guides → Clear Guides removes them all.
          </li>
        </ul>
        <p>
          Guides are saved with the project and can be undone like any other change. They never
          appear in exported images.
        </p>
        <h2>Grid</h2>
        <p>
          View → Show → Grid (Cmd/Ctrl+&apos;) shows a grid over the canvas. Set its spacing with
          View → Grid Size…. When you zoom out far, the grid shows every second or fourth line so it
          stays readable.
        </p>
        <h2>Snapping and smart guides</h2>
        <p>
          With View → Snap on (the default), moving or resizing a layer, drawing a selection or
          shape, adjusting the crop box and dragging a guide all snap to nearby guides, grid lines,
          the edges and centre of the canvas, and the edges and centres of other layers. Pink lines
          show what something snapped to. Hold Cmd (macOS) or Ctrl while dragging to place it
          freely; turn snapping off entirely with View → Snap.
        </p>
        <h2>Align</h2>
        <p>
          Layer → Align lines up the active layer&apos;s left edges, horizontal centres, right
          edges, top edges, vertical centres or bottom edges with the canvas — or with the
          selection, when there is one.
        </p>
        <h2>Limitations</h2>
        <ul>
          <li>
            Distributing several layers evenly is not available yet (it needs multi-layer
            selection).
          </li>
          <li>Rotated layers snap when moved, but their handles don&apos;t snap while scaling.</li>
        </ul>
      </>
    ),
  },
  {
    slug: "filters",
    title: "Filters: blur, sharpen, noise and more",
    description:
      "Apply filters to a pixel layer in Picstea with a live preview: Gaussian, box and motion blur, Unsharp Mask, Add Noise, Pixelate, Emboss and Find Edges.",
    updated: "2026-10-09",
    body: () => (
      <>
        <p>
          Filters change the pixels of the active pixel layer. Choose one from the Filter menu,
          adjust its settings and watch the result on the canvas, then press OK. Every filter is one
          undo step. With a selection, only the selected area changes (feathered edges blend
          smoothly).
        </p>
        <h2>Available filters</h2>
        <ul>
          <li>
            <strong>Gaussian Blur</strong> — a smooth, natural blur. Radius 0.1–250 px.
          </li>
          <li>
            <strong>Box Blur</strong> — an even blur over a square area.
          </li>
          <li>
            <strong>Motion Blur</strong> — a streak in one direction, set by angle and distance.
          </li>
          <li>
            <strong>Unsharp Mask</strong> — sharpens edges. Amount sets the strength, radius the
            size of the edges, and threshold leaves smooth areas (and noise) alone.
          </li>
          <li>
            <strong>Add Noise</strong> — grain, uniform or Gaussian, in colour or monochrome.
          </li>
          <li>
            <strong>Pixelate</strong> — a mosaic of square cells.
          </li>
          <li>
            <strong>Emboss</strong> — a grey relief lit from the chosen angle.
          </li>
          <li>
            <strong>Find Edges</strong> — outlines edges as dark lines on white.
          </li>
        </ul>
        <p>
          Filter → Last Filter (Cmd/Ctrl+Option/Alt+F) repeats the previous filter with the same
          settings.
        </p>
        <h2>Large images</h2>
        <p>
          Filters run in the background so the editor stays responsive. On very large layers the
          preview is calculated at a reduced size; the result you apply is always full resolution.
        </p>
        <h2>Limitations</h2>
        <ul>
          <li>
            Filters change pixels directly. To change only the tones of an image without touching
            its pixels, use an adjustment layer (Levels, Curves and others) instead.
          </li>
          <li>Shape and text layers can&apos;t be filtered yet; filters work on pixel layers.</li>
        </ul>
      </>
    ),
  },
  {
    slug: "paths-and-the-pen-tool",
    title: "Paths and the Pen tool",
    description:
      "Draw precise shapes and selections in Picstea with the Pen tool: anchor points, curves, Direct Selection, paths to selections and back, and vector masks.",
    updated: "2026-10-19",
    body: () => (
      <>
        <p>
          The Pen tool (P) draws paths made of anchor points joined by straight lines or smooth
          curves. A path can become a shape layer, a selection or a vector mask, and stays editable.
        </p>
        <h2>Drawing with the Pen tool</h2>
        <ul>
          <li>Click to place a corner point.</li>
          <li>Click and drag to place a smooth point; the drag pulls out its curve handles.</li>
          <li>
            Click the first point to close the path. Press Enter or Esc to finish an open path.
          </li>
          <li>Backspace removes the last point while you draw.</li>
          <li>Points snap to guides, the grid and other layers when snapping is on.</li>
        </ul>
        <h2>Shape or path</h2>
        <p>
          In the options bar, <strong>Shape</strong> mode turns each finished path into a shape
          layer, filled (and optionally stroked) with the Shape tool&apos;s colours.{" "}
          <strong>Path</strong> mode adds it to the work path instead: an outline that isn&apos;t a
          layer, saved with the project, that you can turn into a selection, a mask or a shape
          later.
        </p>
        <h2>Editing points</h2>
        <p>
          The Direct Selection tool (A) edits the active path shape, its vector mask and the work
          path:
        </p>
        <ul>
          <li>
            Drag a point to move it, or drag a curve handle; Alt-drag a handle to move it on its
            own.
          </li>
          <li>Alt-click a point to switch it between corner and smooth.</li>
          <li>Drag a line between points to move that whole part of the path.</li>
          <li>Delete removes the selected point; the arrow keys nudge it (Shift: 10 px).</li>
        </ul>
        <p>
          The other tools in the same slots: <strong>Path Selection</strong> (Shift+A) drags a whole
          path; <strong>Add Anchor Point</strong> adds a point where you click a segment, without
          changing the curve; <strong>Delete Anchor Point</strong> removes the point you click;{" "}
          <strong>Convert Point</strong> switches a point between corner and smooth, or pulls
          handles out of it when you drag. The Shape tool also draws{" "}
          <strong>rounded rectangles</strong> and <strong>polygons</strong> (3–64 sides), which stay
          editable as paths.
        </p>
        <h2>Paths and selections</h2>
        <ul>
          <li>
            Select → Make Selection from Path (Cmd/Ctrl+Enter) turns the work path into a smooth
            selection. Overlapping parts of a path cut holes.
          </li>
          <li>
            Select → Make Work Path from Selection… traces a selection into a path. A lower
            tolerance follows the selection more closely.
          </li>
        </ul>
        <h2>Vector masks</h2>
        <p>
          With a work path, Layer → Vector Mask → Add Vector Mask from Path hides the active layer
          outside the path. The mask moves with the layer and can be edited with Direct Selection.
        </p>
        <h2>Limitations</h2>
        <ul>
          <li>
            Photoshop vector masks and shape layers open as vector masks and path shapes; exported
            PSDs keep vector masks, but shapes become pixels.
          </li>
          <li>Only one work path is kept per document (there is no Paths panel yet).</li>
        </ul>
      </>
    ),
  },
  {
    slug: "smart-objects-and-smart-filters",
    title: "Smart objects and smart filters",
    description:
      "Use smart objects in Picstea to scale and transform without losing quality, edit their contents in their own tab, and apply filters you can change later.",
    updated: "2026-10-09",
    body: () => (
      <>
        <p>
          A smart object is a layer that contains a whole document of its own. Picstea redraws it
          from that original at whatever size it appears, so you can scale it down and back up — or
          rotate it many times — without losing sharpness.
        </p>
        <h2>Creating smart objects</h2>
        <ul>
          <li>
            Layer → Smart Object → Convert to Smart Object turns the active layer (or group) into a
            smart object.
          </li>
          <li>
            File → Place → Place Embedded… adds an image, SVG, PSD or <code>.picstea</code> project
            as a smart object. PSD files keep their layers inside it.
          </li>
        </ul>
        <h2>Editing the contents</h2>
        <p>
          Double-click the smart object&apos;s thumbnail in the Layers panel (or choose Layer → Edit
          Contents). Its contents open in a new tab, with all their layers. Save (Cmd/Ctrl+S) or
          close the tab to update the smart object; changes are also applied automatically after a
          short pause. Each editing session is one step in the original document&apos;s undo
          history.
        </p>
        <h2>Smart filters</h2>
        <p>
          With a smart object selected, any filter from the Filter menu becomes a smart filter: it
          is applied on top of the contents without changing them. Smart filters are listed in the
          Properties panel, where you can hide one, click its name to change its settings, change
          the order or delete it.
        </p>
        <h2>Rasterizing</h2>
        <p>
          Layer → Rasterize Layer turns a smart object (or a shape or text layer) into ordinary
          pixels, for example to paint on it. Its opacity, blend mode, masks and effects stay.
        </p>
        <h2>Limitations</h2>
        <ul>
          <li>Smart objects can be nested up to 4 levels deep.</li>
          <li>
            Smart filter effects stay inside the smart object&apos;s box: a blur near the edge is
            cut off there. Convert a slightly larger area (or add transparent space) if needed.
          </li>
          <li>
            Photoshop smart objects with embedded images or PSDs open as smart objects (warped ones
            and those with Photoshop smart filters open as pixels). Exported PSDs contain smart
            objects as pixels.
          </li>
          <li>Linked (external) smart objects are not supported; contents are always embedded.</li>
        </ul>
      </>
    ),
  },
  {
    slug: "actions-batch-colours-and-history",
    title: "Actions, batch processing, colours and history",
    description:
      "Record actions in Picstea and replay them on any image or a whole batch of files, pick exact colours, keep swatches, and step back through the History panel.",
    updated: "2026-10-09",
    body: () => (
      <>
        <p>
          The History, Swatches and Actions panels share one tabbed panel on the right, between
          Properties and Layers.
        </p>
        <h2>History</h2>
        <p>
          The History panel lists every undo step of the active document, starting with the moment
          it was opened. Click a step (or use the arrow keys, Home and End) to go back to it; the
          later steps stay available, dimmed, until you make a new change. The history lives with
          the open document and is not saved in the project.
        </p>
        <h2>Colour picker and swatches</h2>
        <ul>
          <li>
            Click the foreground or background colour in the toolbar to open the colour picker. Drag
            in the square to choose saturation and brightness (or use the arrow keys; Shift moves in
            bigger steps), pick the hue on the slider, or type exact Hex, RGB or HSB values. OK
            applies the colour.
          </li>
          <li>
            In the Swatches panel, click a swatch to make it the foreground colour, or Alt-click for
            the background colour. Add Foreground saves the current colour; Delete removes the
            focused swatch; Reset brings back the default palette.
          </li>
          <li>Swatches are remembered in this browser.</li>
        </ul>
        <h2>Recording an action</h2>
        <ol>
          <li>Open the Actions panel and choose New…, name the action and choose Record.</li>
          <li>
            Edit as usual. These operations are recorded: filters (with their settings), adjustment
            layers (with the settings they have when you stop), Select All, Deselect, Inverse,
            Feather/Expand/Contract, Fill, Clear, New Layer, Duplicate Layer, New Fill Layer, Flip,
            Align and Crop to Selection.
          </li>
          <li>Choose Stop. Expand the action to see its steps; × deletes a step.</li>
        </ol>
        <p>
          Brush strokes, moves and transforms, text and changes made in the Properties panel (other
          than adjustment settings) are not recorded.
        </p>
        <h2>Playing an action</h2>
        <p>
          Select an action and choose Play. It runs on the active document as one step in its
          history, so a single Undo reverts it. If a step can&apos;t run — for example Crop to
          Selection without a selection — playback stops and says which step failed.
        </p>
        <h2>Batch processing</h2>
        <p>
          File → Automate → Batch… plays an action on many files (up to 200 at a time): choose the
          action, the files and the output format (PNG, JPEG or WebP). Each file is opened, the
          action is played and the result is added to one ZIP file that you save at the end. The
          files are processed on your device and are not stored in the browser. Files that
          can&apos;t be opened or processed are skipped and listed.
        </p>
        <h2>Sharing actions</h2>
        <p>
          Actions are stored in this browser. Export… saves all of them as a{" "}
          <code>picstea-actions.json</code> file; Import… adds the actions from such a file, for
          example on another computer. Imported files are checked strictly: anything Picstea does
          not recognise is refused.
        </p>
      </>
    ),
  },
  {
    slug: "file-formats",
    title: "File formats: PSD, PNG, JPEG, WebP, SVG, PDF",
    description:
      "Which file types Picstea opens and exports, what each format keeps, and how to move projects between Picstea and other tools.",
    updated: "2026-10-09",
    body: () => (
      <>
        <h2>Opening files</h2>
        <ul>
          <li>
            <strong>PNG, JPEG, WebP and GIF</strong> (first frame) open as a document or, with File
            → Place Image as Layer, as a new layer.
          </li>
          <li>
            <strong>PSD</strong> — 8-bit RGB and greyscale files open with their layers, groups,
            names, opacity, visibility, blend modes, layer masks, vector masks and clipping masks.
            Text opens as editable text (check the fonts), adjustment layers (Levels, Curves,
            Brightness/Contrast, Hue/Saturation, Vibrance, Color Balance, Photo Filter, Channel
            Mixer, Gradient Map, Exposure, Invert, Posterize, Threshold, Black &amp; White) as
            adjustment layers, shape and fill layers as shapes and fills, embedded smart objects as
            smart objects, and drop shadows, outer glows, inner shadows, inner bevels, gradient
            overlays, strokes and colour overlays as effects. Anything that cannot be kept is listed
            when the file opens.
          </li>
          <li>
            <strong>SVG</strong> opens as an image (pixels). Scripts in SVG files never run.
          </li>
          <li>
            <strong>.picstea</strong> project files open exactly as they were saved.
          </li>
        </ul>
        <p>Files are recognised by their contents, not their names.</p>
        <h2>Exporting</h2>
        <ul>
          <li>
            <strong>PNG</strong> — lossless with transparency. <strong>JPEG</strong> — small photos
            without transparency. <strong>WebP</strong> — small files with transparency.
          </li>
          <li>
            <strong>PSD</strong> — layers, groups, masks, vector masks, clipping masks, opacity,
            blend modes and adjustment layers (except Temperature/Tint, Black &amp; White, Photo
            Filter and Gradient Map, which are in the flattened image only). Shapes, text, smart
            objects and effects become pixels.
          </li>
          <li>
            <strong>SVG</strong> — shapes and text stay vectors; other layers are embedded as
            images.
          </li>
          <li>
            <strong>PDF</strong> — one page at the document&apos;s resolution.
          </li>
        </ul>
        <h2>Not supported yet</h2>
        <p>
          Opening PDF and TIFF files, PSB (large document) files, 16/32-bit and CMYK PSDs. Picstea
          says so clearly when you try.
        </p>
      </>
    ),
  },
  {
    slug: "keyboard-shortcuts",
    title: "Keyboard shortcuts",
    description: "Every Picstea keyboard shortcut. Cmd on macOS, Ctrl on Windows and Linux.",
    updated: "2026-10-09",
    body: () => (
      <>
        <p>
          On macOS use Cmd (⌘) where the table says Mod; on Windows and Linux use Ctrl. Shortcuts
          don&apos;t fire while you type in a text field.
        </p>
        <ShortcutTable />
      </>
    ),
  },
  {
    slug: "privacy-and-storage",
    title: "Privacy and where your files are stored",
    description:
      "Picstea edits images on your device and never uploads them. Where projects are kept, how to back them up and what the website stores.",
    updated: "2026-10-19",
    body: () => (
      <>
        <h2>Your images never leave your device</h2>
        <p>
          Opening, editing, saving and exporting all happen in your browser. Picstea has no server
          that receives your images or projects, and the editor is not allowed to send document data
          anywhere — the browser enforces that with a security policy.
        </p>
        <h2>Where projects are saved</h2>
        <p>
          Projects are saved in your browser&apos;s storage (IndexedDB) on this device. They are not
          synced to other devices or browsers. Browsers can clear this storage — for example in
          private windows or when space runs low — so for anything important use File → Save Project
          As… to keep a <code>.picstea</code> file, or export the image.
        </p>
        <h2>Offline and installing</h2>
        <p>
          After you have opened Picstea once, it also opens without an internet connection: a
          service worker keeps a copy of the app&apos;s own files (code, styles, icons) in the
          browser. It never stores or sees your images — those stay in your projects. In Chrome and
          Edge you can install Picstea (Help → Install Picstea…) to open it in its own window like a
          desktop app; on a Mac with Safari use File → Add to Dock.
        </p>
        <h2>What the website stores</h2>
        <p>
          The editor stores your projects and a few preferences locally. On the website (docs,
          blog), advertising is only loaded if you agree to it. See the{" "}
          <Link href="/privacy">privacy policy</Link> and <Link href="/cookies">cookie policy</Link>
          , and change your choice any time with &ldquo;Privacy settings&rdquo; at the bottom of
          every page.
        </p>
      </>
    ),
  },
];

export const docBySlug = (slug: string) => DOCS.find((d) => d.slug === slug);
