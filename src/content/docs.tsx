import type { ReactNode } from "react";
import Link from "next/link";
import { EditorLink } from "@/components/site/EditorLink";
import { ShortcutTable } from "@/components/site/ShortcutTable";

/**
 * MYLPER documentation (docs/10 "Content strategy"). Every page describes features that exist
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
    title: "Getting started with MYLPER",
    description:
      "Create a document, open an image or PSD, edit with layers and export — all in your browser, without uploading anything.",
    updated: "2026-10-09",
    body: () => (
      <>
        <p>
          MYLPER is an image editor that runs entirely in your browser. Your images and projects
          stay on your device: nothing is uploaded to a server.
        </p>
        <h2>Open the editor</h2>
        <p>
          Go to <EditorLink>mylper.com</EditorLink>. The editor opens straight away. On the start
          screen you can:
        </p>
        <ul>
          <li>
            <strong>New document</strong> — choose a size (or a preset such as HD or a square post)
            and a background.
          </li>
          <li>
            <strong>Open image</strong> — PNG, JPEG, WebP, GIF, SVG, PSD or a <code>.mylper</code>{" "}
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
            <strong>Menu bar</strong> — File, Edit, Image, Layer, Adjustments, Select, View and
            Help.
          </li>
          <li>
            <strong>Tool options</strong> — settings for the active tool, such as brush size or
            selection mode.
          </li>
          <li>
            <strong>Toolbar</strong> (left) — move, selection, crop, painting, shape, text, hand and
            zoom tools, plus foreground and background colours.
          </li>
          <li>
            <strong>Properties and Layers</strong> (right) — settings of the active layer and the
            layer stack.
          </li>
        </ul>
        <h2>Save and export</h2>
        <ul>
          <li>Work is saved in this browser automatically; File → Save to Browser saves now.</li>
          <li>
            File → Save Project As… downloads a <code>.mylper</code> file with everything in it, for
            backups or to continue on another computer.
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
      "How MYLPER's layers work: pixel, shape, text, fill and adjustment layers, groups, blend modes, opacity, masks and effects.",
    updated: "2026-10-09",
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
            <strong>Adjustment layers</strong> — Brightness/Contrast, Hue/Saturation, Exposure,
            Temperature/Tint, Black &amp; White, Invert, Posterize and Threshold. They change
            everything below them without touching the pixels.
          </li>
        </ul>
        <h2>Opacity and blend modes</h2>
        <p>
          Each layer has an opacity and one of 16 blend modes (Multiply, Screen, Overlay and more)
          in the Properties panel.
        </p>
        <h2>Groups</h2>
        <p>
          Select a layer and press Cmd/Ctrl+G to put it in a group; Cmd/Ctrl+Shift+G ungroups. Drag
          layers in the Layers panel to reorder them or move them into a group. By default a group
          passes its layers&apos; blending through; give it opacity, a blend mode, a mask or effects
          to treat it as one unit.
        </p>
        <h2>Masks</h2>
        <p>
          Layer → Add Layer Mask hides parts of a layer without erasing them. Click the mask
          thumbnail, then paint black to hide, white to reveal and grey for partial transparency.
          Shift-click the thumbnail to turn the mask off temporarily. With a selection active, the
          new mask reveals only the selection.
        </p>
        <h2>Effects</h2>
        <p>
          Drop shadow, outer glow, outer stroke and colour overlay are in the Properties panel.
          Layers with effects show an <em>fx</em> badge.
        </p>
        <h2>Limitations</h2>
        <ul>
          <li>Masks follow a layer when it moves, but not when it is scaled or rotated.</li>
          <li>Groups can be moved but not yet scaled or rotated as a whole.</li>
          <li>Clipping masks, vector masks, Curves and Levels are not available yet.</li>
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
      "Brush, pencil, eraser, paint bucket, gradient and eyedropper in MYLPER, and how they work with layers, masks and selections.",
    updated: "2026-10-09",
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
            <strong>Eraser</strong> (E) — erases to transparency.
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
        </ul>
        <p>
          X swaps the foreground and background colours, D resets them to black and white. With a
          selection, all of these tools stay inside it.
        </p>
      </>
    ),
  },
  {
    slug: "file-formats",
    title: "File formats: PSD, PNG, JPEG, WebP, SVG, PDF and .mylper",
    description:
      "Which file types MYLPER opens and exports, what each format keeps, and how to move projects between MYLPER and other tools.",
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
            names, opacity, visibility, blend modes and layer masks. Text and smart objects open as
            pixels. Anything that cannot be kept is listed when the file opens.
          </li>
          <li>
            <strong>SVG</strong> opens as an image (pixels). Scripts in SVG files never run.
          </li>
          <li>
            <strong>.mylper</strong> project files open exactly as they were saved.
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
            <strong>PSD</strong> — layers, groups, masks, opacity and blend modes. Shapes and text
            become pixels; adjustment layers are included in the flattened image only.
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
          Opening PDF and TIFF files, PSB (large document) files, 16/32-bit and CMYK PSDs. MYLPER
          says so clearly when you try.
        </p>
      </>
    ),
  },
  {
    slug: "keyboard-shortcuts",
    title: "Keyboard shortcuts",
    description: "Every MYLPER keyboard shortcut. Cmd on macOS, Ctrl on Windows and Linux.",
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
      "MYLPER edits images on your device and never uploads them. Where projects are kept, how to back them up and what the website stores.",
    updated: "2026-10-09",
    body: () => (
      <>
        <h2>Your images never leave your device</h2>
        <p>
          Opening, editing, saving and exporting all happen in your browser. MYLPER has no server
          that receives your images or projects, and the editor is not allowed to send document data
          anywhere — the browser enforces that with a security policy.
        </p>
        <h2>Where projects are saved</h2>
        <p>
          Projects are saved in your browser&apos;s storage (IndexedDB) on this device. They are not
          synced to other devices or browsers. Browsers can clear this storage — for example in
          private windows or when space runs low — so for anything important use File → Save Project
          As… to keep a <code>.mylper</code> file, or export the image.
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
