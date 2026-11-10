import type { ReactNode } from "react";
import Link from "next/link";
import { BlogFigure } from "@/components/site/BlogFigure";
import { EditorLink } from "@/components/site/EditorLink";

/**
 * Blog posts (docs/10 "Content strategy"). A post with `draft: true` is not listed, not in the
 * sitemap and returns 404 in production — posts go live only after the product owner approves
 * them. In development drafts are visible with a "Draft" badge for review.
 */

export interface BlogPost {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  /** ISO date. */
  readonly published: string;
  readonly updated?: string;
  readonly draft: boolean;
  /** Cover image under `/blog/<slug>/` for search results and social previews (1200 × 630). */
  readonly image?: string;
  readonly body: () => ReactNode;
}

export const POSTS: readonly BlogPost[] = [
  {
    slug: "edit-psd-online-without-uploading",
    title: "How to edit a PSD file online without uploading it",
    description:
      "Open and edit Photoshop files in your browser while the file stays on your computer — with layers, groups and masks intact.",
    published: "2026-10-18",
    draft: false,
    body: () => (
      <>
        <p>
          Most online editors that open PSD files work the same way: you upload the file, a server
          converts it, and you edit a copy that now lives on someone else&apos;s computer. For
          client work, unreleased designs or personal photos, that is often not acceptable.
        </p>
        <p>
          Picstea takes a different approach. It reads the PSD file inside your browser, so the file
          never leaves your device. Here is how to edit one, and what to expect.
        </p>
        <h2>Step by step</h2>
        <ol>
          <li>
            Open <EditorLink>the Picstea editor</EditorLink>.
          </li>
          <li>
            Click <strong>Open image</strong> and choose your <code>.psd</code> file, or drop it
            onto the page.
          </li>
          <li>
            The layers appear in the Layers panel with their names, groups, opacity, visibility,
            blend modes and layer masks.
          </li>
          <li>Edit as usual: move layers, paint, add adjustment layers, mask, select.</li>
          <li>
            Save it back with <strong>File → Export As… → PSD</strong>, or export a PNG, JPEG, WebP
            or PDF.
          </li>
        </ol>
        <h2>What comes across</h2>
        <p>
          Picstea supports 8-bit RGB and greyscale PSD files — the most common kind. Pixel layers,
          groups, layer names, opacity, visibility, blend modes and layer masks are kept. Text
          layers stay editable, and adjustment layers, shapes, smart objects, vector and clipping
          masks and common layer styles open as their Picstea equivalents.
        </p>
        <h2>What changes</h2>
        <p>
          Some Photoshop features have no equivalent yet. Rather than changing them silently,
          Picstea lists them when the file opens:
        </p>
        <ul>
          <li>
            Selective Color and Color Lookup adjustments, warped text and Photoshop smart filters
            keep their look as pixels; Photoshop pattern images become built-in patterns.
          </li>
          <li>PSB, 16/32-bit and CMYK files cannot be opened yet.</li>
        </ul>
        <h2>Why it can work without a server</h2>
        <p>
          Modern browsers can decode images, run code in background threads and store data locally.
          Picstea reads the PSD format itself, inside the page, and keeps projects in your
          browser&apos;s storage. The editor is not even allowed to send document data anywhere: the
          browser enforces that.
        </p>
        <p>
          <EditorLink>Open a PSD in Picstea</EditorLink> — no account, no upload.
        </p>
      </>
    ),
  },
  {
    slug: "png-vs-jpeg-vs-webp",
    title: "PNG vs JPEG vs WebP: which format to use?",
    description:
      "A practical guide to choosing between PNG, JPEG and WebP: transparency, file size, quality and where each format works best.",
    published: "2026-10-18",
    draft: false,
    body: () => (
      <>
        <p>
          Short answer: use <strong>JPEG</strong> for photos when you need the widest compatibility,{" "}
          <strong>PNG</strong> for graphics, screenshots and anything that needs crisp edges or
          transparency without loss, and <strong>WebP</strong> for the web when you want small files
          — with or without transparency.
        </p>
        <h2>The differences at a glance</h2>
        <table>
          <thead>
            <tr>
              <th scope="col"></th>
              <th scope="col">PNG</th>
              <th scope="col">JPEG</th>
              <th scope="col">WebP</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Compression</th>
              <td>Lossless</td>
              <td>Lossy</td>
              <td>Lossy or lossless</td>
            </tr>
            <tr>
              <th scope="row">Transparency</th>
              <td>Yes</td>
              <td>No</td>
              <td>Yes</td>
            </tr>
            <tr>
              <th scope="row">Best for</th>
              <td>Graphics, logos, screenshots</td>
              <td>Photos, maximum compatibility</td>
              <td>Web images of all kinds</td>
            </tr>
            <tr>
              <th scope="row">File size</th>
              <td>Larger for photos</td>
              <td>Small for photos</td>
              <td>Usually smallest</td>
            </tr>
          </tbody>
        </table>
        <h2>PNG</h2>
        <p>
          PNG never throws away detail. Every save is identical to the original, which makes it
          ideal for screenshots, interface graphics, logos and text. It supports full transparency.
          The downside: photos saved as PNG are often several times larger than as JPEG.
        </p>
        <h2>JPEG</h2>
        <p>
          JPEG discards detail your eye is unlikely to notice, which makes photos small. At high
          quality settings the loss is hard to see; at low settings you get blocky artefacts,
          especially around sharp edges and text. JPEG has no transparency — transparent areas
          become a solid colour, usually white.
        </p>
        <h2>WebP</h2>
        <p>
          WebP can be lossy like JPEG or lossless like PNG, and supports transparency in both modes.
          For the same visual quality it is usually smaller than either. All current major browsers
          support it, but some older software and some upload forms still don&apos;t.
        </p>
        <h2>A simple rule of thumb</h2>
        <ul>
          <li>Sharing a photo anywhere, by email or upload form: JPEG.</li>
          <li>A logo, screenshot or graphic with text: PNG.</li>
          <li>Images for your own website: WebP.</li>
          <li>Anything you will keep editing: keep the original project, not a flattened image.</li>
        </ul>
        <p>
          In Picstea, <strong>File → Export As…</strong> offers all three. The quality slider for
          JPEG and WebP lets you trade size against detail, and the image is created on your device.{" "}
          <EditorLink>Try it in the editor</EditorLink>.
        </p>
      </>
    ),
  },
  {
    slug: "layers-and-masks-explained",
    title: "Layers and masks explained",
    description:
      "What layers, blend modes, adjustment layers and layer masks are, and how they let you edit images without destroying the original.",
    published: "2026-10-18",
    draft: false,
    body: () => (
      <>
        <p>
          Layers are what separate a real image editor from a simple photo app. They let you change
          one part of an image without touching the rest — and change your mind later.
        </p>
        <h2>Layers: sheets of glass</h2>
        <p>
          Think of layers as sheets of glass stacked on top of each other. Each holds part of the
          image: a photo, some text, a shape. Where a sheet is transparent you see through to the
          ones below. Reordering the sheets changes what covers what.
        </p>
        <h2>Opacity and blend modes</h2>
        <p>
          A layer&apos;s <strong>opacity</strong> makes the whole sheet see-through.
          <strong> Blend modes</strong> change how its colours mix with what is below: Multiply
          darkens (great for shadows), Screen lightens, Overlay adds contrast.
        </p>
        <h2>Adjustment layers: changes you can undo any time</h2>
        <p>
          An adjustment layer doesn&apos;t contain pixels. It changes the colours of everything
          below it — brightness, hue, saturation, black and white — without altering the original
          pixels. Hide or delete it and the original is back, untouched.
        </p>
        <h2>Masks: hide without erasing</h2>
        <p>
          A mask decides which parts of a layer are visible. Paint black on the mask to hide, white
          to reveal, grey for something in between. Unlike the eraser, nothing is lost: paint white
          again and it comes back. Masks on adjustment layers let you apply an adjustment to just
          one area, such as brightening only a face.
        </p>
        <h2>Groups</h2>
        <p>
          Groups collect layers into folders. Moving a group moves everything in it, and a group can
          have its own opacity, blend mode and mask.
        </p>
        <h2>Try it</h2>
        <ol>
          <li>
            Open a photo in <EditorLink>Picstea</EditorLink>.
          </li>
          <li>Choose Layer → New Adjustment Layer → Black &amp; White.</li>
          <li>Click the adjustment layer&apos;s mask thumbnail and paint black over one object.</li>
          <li>That object is in colour again; everything else stays black and white.</li>
        </ol>
        <p>
          Read more in the <Link href="/docs/layers-groups-and-masks">layers documentation</Link>.
        </p>
      </>
    ),
  },
  {
    slug: "levels-and-curves-explained",
    title: "Levels and Curves: fix brightness and contrast",
    description:
      "What Levels and Curves do, when to use which, and how to correct a dull or dark photo with them — without changing the original pixels.",
    published: "2026-10-18",
    draft: false,
    body: () => (
      <>
        <p>
          Brightness and contrast sliders are blunt: they move every tone by the same amount. Levels
          and Curves let you decide which tones change and by how much. They are the two tools
          photographers reach for first when a picture looks flat, dark or washed out.
        </p>
        <h2>Levels: set the black point, white point and midtones</h2>
        <p>
          Levels shows a histogram — how many pixels there are at each brightness, from black on the
          left to white on the right. A dull photo often has a histogram that doesn&apos;t reach
          either end.
        </p>
        <ul>
          <li>
            Move <strong>Input black</strong> to where the histogram starts: those pixels become
            pure black.
          </li>
          <li>
            Move <strong>Input white</strong> to where it ends: those become pure white. The tones
            in between stretch to fill the full range, and contrast improves.
          </li>
          <li>
            <strong>Gamma</strong> brightens or darkens the midtones without moving black and white.
          </li>
          <li>
            <strong>Output black and white</strong> do the opposite — they compress the range, for a
            faded, matte look.
          </li>
        </ul>
        <h2>Curves: control every tone</h2>
        <p>
          Curves draws a line from dark (bottom left) to light (top right). Bending it changes
          tones: lift a point and those tones get brighter, lower it and they get darker.
        </p>
        <ul>
          <li>
            <strong>S-curve</strong>: lower a point in the shadows and raise one in the highlights
            for punchier contrast.
          </li>
          <li>
            <strong>Lift the bottom-left end</strong> for faded blacks.
          </li>
          <li>
            <strong>One channel at a time</strong>: switch to Red, Green or Blue to remove a colour
            cast — for example, lower the blue curve slightly to warm up a cold photo.
          </li>
        </ul>
        <h2>Why adjustment layers</h2>
        <p>
          In Picstea, Levels and Curves are adjustment layers. They change how the image looks, not
          its pixels: hide the layer to compare, change the settings later, or paint on its mask to
          apply the correction to only part of the image.
        </p>
        <h2>Try it</h2>
        <ol>
          <li>
            Open a photo in <EditorLink>Picstea</EditorLink>.
          </li>
          <li>
            Choose Layer → New Adjustment Layer → Levels and drag the black and white inputs to the
            ends of the histogram.
          </li>
          <li>Add Layer → New Adjustment Layer → Curves above it and make a gentle S-curve.</li>
          <li>Toggle the layers&apos; eye icons to compare before and after.</li>
        </ol>
        <p>
          Everything happens in your browser — the photo is never uploaded. Read more in the{" "}
          <Link href="/docs/layers-groups-and-masks">layers documentation</Link>.
        </p>
      </>
    ),
  },
  {
    slug: "how-to-use-the-pen-tool",
    title: "How to use the Pen tool for shapes and cut-outs",
    description:
      "A practical introduction to the Pen tool: corner and curve points, closing a path, editing it, and turning it into a shape, a selection or a vector mask.",
    published: "2026-10-18",
    draft: false,
    body: () => (
      <>
        <p>
          The Pen tool has a reputation for being hard. It isn&apos;t — it just works differently
          from a brush. Instead of painting pixels, you place points and the editor draws perfectly
          smooth lines between them. Once you have the outline, you can use it for almost anything.
        </p>
        <h2>Two kinds of points</h2>
        <ul>
          <li>
            <strong>Click</strong> to place a corner point. Straight lines connect corner points.
          </li>
          <li>
            <strong>Click and drag</strong> to place a smooth point. The direction you drag sets the
            direction of the curve, and the distance sets how strongly it bends.
          </li>
        </ul>
        <p>
          A good habit: use as few points as you can, and put smooth points at the widest part of a
          curve rather than at its ends.
        </p>
        <h2>Close it, then fix it</h2>
        <p>
          Click the first point to close the path. It rarely comes out perfect the first time —
          that&apos;s expected. Switch to the Direct Selection tool (A) and drag points or their
          handles until the outline sits exactly where you want it. Alt-click a point to switch it
          between corner and smooth.
        </p>
        <h2>What to do with a path</h2>
        <ul>
          <li>
            <strong>A shape</strong>: in Shape mode the path becomes a filled shape layer that stays
            sharp at any size.
          </li>
          <li>
            <strong>A cut-out</strong>: in Path mode, trace around an object, then press
            Cmd/Ctrl+Enter to turn the path into a selection with clean edges.
          </li>
          <li>
            <strong>A mask</strong>: Layer → Vector Mask → Add Vector Mask from Path hides
            everything outside the outline, without deleting anything.
          </li>
        </ul>
        <h2>Try it</h2>
        <ol>
          <li>
            Open a photo in <EditorLink>Picstea</EditorLink> and press P.
          </li>
          <li>Choose Path in the options bar and click around an object, closing the path.</li>
          <li>Press A and adjust the points, then press Cmd/Ctrl+Enter.</li>
          <li>Press Cmd/Ctrl+J to copy the object to its own layer.</li>
        </ol>
        <p>
          Read more in <Link href="/docs/paths-and-the-pen-tool">Paths and the Pen tool</Link>.
          Everything happens in your browser — nothing is uploaded.
        </p>
      </>
    ),
  },
  {
    slug: "smart-objects-explained",
    title: "Smart objects: scale without losing quality",
    description:
      "Why resizing pixels loses detail, how smart objects avoid it, and how smart filters let you change your mind later.",
    published: "2026-10-18",
    draft: false,
    body: () => (
      <>
        <p>
          Shrink a photo to place it in a layout, then decide it should be bigger after all — and it
          comes back blurry. That&apos;s because resizing pixels throws detail away. Smart objects
          solve this.
        </p>
        <h2>What a smart object is</h2>
        <p>
          A smart object is a layer that keeps its original contents inside it. When you scale,
          rotate or flip it, the editor draws it again from that original at the new size, instead
          of stretching pixels that were already resized. You can scale it down to 10% and back to
          100% and it looks exactly like it did.
        </p>
        <h2>Smart filters: effects you can undo any time</h2>
        <p>
          Filters normally change pixels for good. On a smart object, a filter becomes a smart
          filter: it sits on top of the contents. You can switch it off to compare, change its
          settings later, reorder several filters or delete one — the original is never touched.
        </p>
        <h2>Edit the contents</h2>
        <p>
          Double-click a smart object to open its contents in their own tab. Change anything, save,
          and every place that smart object appears updates.
        </p>
        <h2>Try it</h2>
        <ol>
          <li>
            In <EditorLink>Picstea</EditorLink>, choose File → Place → Place Embedded… and pick a
            photo.
          </li>
          <li>Scale it down with the Move tool, then scale it back up — it stays sharp.</li>
          <li>
            Add Filter → Blur → Gaussian Blur, then hide or change it in the Properties panel.
          </li>
        </ol>
        <p>
          More in{" "}
          <Link href="/docs/smart-objects-and-smart-filters">Smart objects and smart filters</Link>.
          As always, nothing leaves your device.
        </p>
      </>
    ),
  },
  {
    slug: "open-psd-files-with-editable-text-and-adjustments",
    title: "Open PSDs with editable text and adjustments",
    description:
      "Picstea opens Photoshop files with their structure intact: editable text, adjustment layers, shapes, smart objects, vector masks and layer styles.",
    published: "2026-10-18",
    draft: false,
    body: () => (
      <>
        <p>
          A PSD is more than its pixels. The value is in the structure: text you can still change,
          adjustments you can still tweak, shapes that stay sharp. Picstea now keeps much more of
          that structure when it opens a Photoshop file — still entirely in your browser.
        </p>
        <h2>What opens editable</h2>
        <ul>
          <li>
            <strong>Text layers</strong> open as text you can edit, with their size, colour, bold
            and italic, alignment and spacing. Fonts are matched to common fonts, so give the layout
            a quick check.
          </li>
          <li>
            <strong>Adjustment layers</strong> — Levels, Curves, Brightness/Contrast,
            Hue/Saturation, Exposure, Invert, Posterize, Threshold and Black &amp; White.
          </li>
          <li>
            <strong>Shape and fill layers</strong> become path shapes and colour fills.
          </li>
          <li>
            <strong>Smart objects</strong> with embedded images or PSDs open as smart objects —
            double-click to edit their contents.
          </li>
          <li>
            <strong>Vector masks and clipping masks</strong> stay masks.
          </li>
          <li>
            <strong>Layer styles</strong>: drop shadow, outer glow, stroke and colour overlay.
          </li>
        </ul>
        <h2>And back again</h2>
        <p>
          Exported PSDs now keep adjustment layers, vector masks and clipping masks, so a file can
          go back to Photoshop without being flattened.
        </p>
        <h2>What still changes</h2>
        <p>
          Some Photoshop features don&apos;t have a Picstea equivalent yet — for example Selective
          Color, satin styles or warped text. Those layers keep their look as pixels, and Picstea
          lists exactly what changed when the file opens.
        </p>
        <p>
          <EditorLink>Open a PSD in Picstea</EditorLink> — no account, no upload. Details are in{" "}
          <Link href="/docs/file-formats">file formats</Link>.
        </p>
      </>
    ),
  },
  {
    slug: "record-actions-and-batch-process-images",
    title: "Record actions and batch-process images",
    description:
      "Picstea can now record a sequence of edits and replay it on any image — or on a whole folder of photos at once — without uploading anything.",
    published: "2026-10-18",
    draft: false,
    body: () => (
      <>
        <p>
          Resizing a product shot, adding the same adjustment, blurring the same corner: some edits
          are the same every time. Picstea can now record them once and replay them — on one image
          or on a hundred.
        </p>
        <h2>Record once</h2>
        <p>
          Open the Actions panel, choose New… and start editing. Filters, adjustment layers,
          selections, fills, new layers, flips, alignment and crops are recorded with their
          settings. Choose Stop when you&apos;re done; you can see every step and remove the ones
          you don&apos;t want.
        </p>
        <h2>Play anywhere</h2>
        <p>
          Select the action and choose Play. The whole action is a single step in the History panel,
          so one Undo takes it back.
        </p>
        <h2>Batch a whole folder</h2>
        <p>
          File → Automate → Batch… applies an action to many files at once and saves the results as
          one ZIP file — PNG, JPEG or WebP. Everything happens in your browser tab: the photos are
          not uploaded and not stored.
        </p>
        <h2>Also new</h2>
        <ul>
          <li>
            A colour picker with a saturation/brightness field, a hue slider and exact Hex, RGB and
            HSB values.
          </li>
          <li>A Swatches panel for your own colours.</li>
          <li>A History panel to jump back to any step — and forward again.</li>
        </ul>
        <p>
          <EditorLink>Try it in Picstea</EditorLink> — no account needed. The details are in{" "}
          <Link href="/docs/actions-batch-colours-and-history">
            Actions, batch processing, colours and history
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    slug: "remove-blemishes-and-retouch-photos-in-your-browser",
    title: "Remove blemishes and retouch photos online",
    description:
      "Picstea now has a Clone Stamp, Healing Brush, Dodge and Burn, Sponge, Blur, Sharpen and Smudge — classic retouching tools that run entirely in your browser.",
    published: "2026-10-18",
    draft: false,
    body: () => (
      <>
        <p>
          A speck of dust on a product shot, a power line across the sky, a blemish in a portrait:
          small distractions that take seconds to fix with the right tool. Picstea now has those
          tools — and like everything else in Picstea, your photos never leave your device.
        </p>
        <h2>Heal it</h2>
        <p>
          Choose the Healing Brush (J), Alt-click on a clean area nearby and paint over the blemish.
          When you let go, the patch takes on the colour and brightness of its new surroundings
          while keeping the texture you copied, so it blends in.
        </p>
        <h2>Clone it</h2>
        <p>
          The Clone Stamp (S) copies exactly, which is what you want for removing an object or
          duplicating a detail. With Sample set to All layers you can clone onto an empty layer and
          keep the original photo untouched.
        </p>
        <h2>Shape the light</h2>
        <p>
          Dodge and Burn (O) lighten or darken just where you paint — shadows, midtones or
          highlights. Sponge adds or removes colour. Blur, Sharpen and Smudge (R) soften, crisp up
          or push pixels around.
        </p>
        <p>
          <EditorLink>Open a photo in Picstea</EditorLink> and try them — no account, no upload. The
          details are in <Link href="/docs/retouching">Retouching</Link>.
        </p>
      </>
    ),
  },
  {
    slug: "select-align-and-distribute-several-layers",
    title: "Select, align and distribute several layers",
    description:
      "Picstea now lets you select several layers, move and transform them together, scale and rotate whole groups, and align or distribute them evenly.",
    published: "2026-10-18",
    draft: false,
    body: () => (
      <>
        <p>
          Laying out a banner, a product grid or a social post means arranging many things at once.
          Until now Picstea worked on one layer at a time. Now you can select as many as you like.
        </p>
        <h2>Select several layers</h2>
        <p>
          Cmd-click (Ctrl-click) layers in the Layers panel to add them, Shift-click to select a
          range, or press Cmd/Ctrl+Alt+A to select them all. On the canvas, Shift-click with the
          Move tool adds the layer under the pointer.
        </p>
        <h2>Move, scale and rotate together</h2>
        <p>
          The selected layers get one frame: drag inside to move them, drag a handle to scale, or
          drag outside a corner to rotate. The same frame appears on a group, so a whole group can
          now be scaled and rotated too. Flip, group, duplicate and delete work on the whole
          selection — and each is a single undo step.
        </p>
        <h2>Align and distribute</h2>
        <p>
          Line layers up by their edges or centres, or spread three or more of them evenly — by
          centre or with equal gaps — from the Layer menu, the Move tool&apos;s options bar or the
          Properties panel.
        </p>
        <p>
          <EditorLink>Try it in Picstea</EditorLink> — free, no account, nothing uploaded. More in{" "}
          <Link href="/docs/layers-groups-and-masks">Layers, groups and masks</Link>.
        </p>
      </>
    ),
  },
  {
    slug: "vibrance-color-balance-gradient-map-and-more",
    title: "Vibrance, Color Balance, Gradient Map and more",
    description:
      "Five new adjustment layers — Vibrance, Color Balance, Photo Filter, Channel Mixer and Gradient Map — plus inner shadow, bevel and gradient overlay effects.",
    published: "2026-10-18",
    draft: false,
    body: () => (
      <>
        <p>
          Colour is where a photo gets its mood. Picstea now has the adjustment layers photographers
          and designers reach for most often after Levels and Curves — all non-destructive, all
          running in your browser.
        </p>
        <h2>Five new adjustments</h2>
        <ul>
          <li>
            <strong>Vibrance</strong> lifts muted colours while leaving already vivid ones (and
            skin) mostly alone.
          </li>
          <li>
            <strong>Color Balance</strong> shifts shadows, midtones and highlights separately — cool
            shadows and warm highlights in a few clicks.
          </li>
          <li>
            <strong>Photo Filter</strong> works like a coloured lens filter, warming or cooling the
            whole image.
          </li>
          <li>
            <strong>Channel Mixer</strong> rebuilds each colour channel from the others, and makes
            precise black-and-white conversions.
          </li>
          <li>
            <strong>Gradient Map</strong> maps the image&apos;s tones onto any gradient — duotones,
            colour grades and glow effects.
          </li>
        </ul>
        <h2>Three new layer styles</h2>
        <p>
          Inner shadow, bevel and gradient overlay join drop shadow, glow, stroke and colour overlay
          in the Properties panel.
        </p>
        <h2>Better PSD round trips</h2>
        <p>
          Photoshop files that use these adjustments and styles now open with them editable instead
          of baked into the pixels.
        </p>
        <p>
          <EditorLink>Try them in Picstea</EditorLink> — free, no account, nothing uploaded.
        </p>
      </>
    ),
  },
  {
    slug: "layer-styles-blend-if-and-the-image-menu",
    title: "Layer styles, Blend If and the Image menu",
    description:
      "Photoshop's full Layer Style dialog, Blend If sliders and a complete Image menu — Image Size, Canvas Size, rotation and Auto Tone — free and private.",
    published: "2026-10-19",
    draft: false,
    body: () => (
      <>
        <p>
          This release brings three things people coming from Photoshop or Photopea reach for every
          day: the full Layer Style dialog, Blend If, and an Image menu that sizes, rotates and
          tidies the whole picture. As always, everything runs in your browser and your images stay
          on your device.
        </p>

        <h2>The full Layer Style dialog</h2>
        <p>
          Double-click a layer (or choose Layer → Layer Style → Blending Options…) to open it. On
          the left are all ten effects Photoshop has: Bevel and Emboss with Contour and Texture,
          Stroke, Inner Shadow, Inner Glow, Satin, Color, Gradient and Pattern Overlay, Outer Glow
          and Drop Shadow. A preview swatch on the right shows the style as you change it.
        </p>
        <ul>
          <li>
            <strong>Every option you know.</strong> Each effect has its own blend mode and opacity,
            plus spread or choke, size, noise, contour and anti-aliasing. Gradients come in linear,
            radial, angle, reflected and diamond styles, with perceptual or linear colour blending.
            Strokes can sit inside, centred on or outside the edge, in a colour or a gradient.
          </li>
          <li>
            <strong>More than one of an effect.</strong> The + next to Drop Shadow, Inner Shadow,
            Stroke, Color Overlay and Gradient Overlay adds another copy, so a double outline or a
            soft shadow under a hard one takes seconds. The arrows under the list reorder them.
          </li>
          <li>
            <strong>Global light.</strong> Tick Use Global Light and every shadow and bevel in the
            document follows one angle; change it once and they all move.
          </li>
          <li>
            <strong>Fill opacity.</strong> Under Blending Options, Fill fades a layer&apos;s own
            pixels but not its effects — set it to 0 for a stroke-only outline or a glass look.
          </li>
          <li>
            <strong>Saved styles.</strong> New Style… keeps a style in your browser; the Styles page
            applies it to any other layer, next to a few built-in ones such as Neon, Gold and Glass.
          </li>
        </ul>
        <p>
          Photoshop files keep their layer styles when you open them in Picstea, including every
          copy and option (Photoshop&apos;s own pattern images become the closest built-in pattern).
          Bevel, satin and texture are drawn closely to Photoshop&apos;s, not pixel for pixel. See{" "}
          <Link href="/docs/layers-groups-and-masks">layers, groups and masks</Link> for the
          details.
        </p>

        <h2>Blend If: hide pixels by brightness</h2>
        <p>
          Blend If, also in Blending Options, hides a layer&apos;s pixels depending on how bright
          they are — or how bright the pixels underneath are. It is the quickest way to put a
          texture only on the darks of a photo, drop a logo onto a wall without its white
          background, or let clouds show through a sky replacement.
        </p>
        <ol>
          <li>
            Drag the white slider of <strong>This Layer</strong> to the left to hide the
            layer&apos;s brightest pixels, or the black slider to the right to hide its darkest.
          </li>
          <li>
            Use <strong>Underlying Layer</strong> instead to show the layer only where the image
            below is dark (or light).
          </li>
          <li>
            Hold Alt (Option) while dragging a slider to split it into two halves: pixels between
            the halves fade gradually instead of switching off at once.
          </li>
        </ol>
        <p>
          The Blend If menu works on grey or on the red, green or blue channel alone, and the R, G,
          and B checkboxes above it limit which colour channels the layer changes at all.
        </p>

        <h2>A complete Image menu</h2>
        <ul>
          <li>
            <strong>Image Size…</strong> scales the whole picture. Pixel layers keep their original
            pixels and are drawn at the new size, so making an image smaller and then larger again
            loses nothing; text and shapes stay sharp.
          </li>
          <li>
            <strong>Canvas Size…</strong> adds or removes room around the image without scaling it.
            Pick one of nine anchors to choose where the new space goes, or tick Relative to type
            how much to add.
          </li>
          <li>
            <strong>Image Rotation</strong> turns the canvas 90° either way or 180°, or flips it,
            with every layer, mask, path and guide.
          </li>
          <li>
            <strong>Trim…</strong> crops away transparent edges or edges of one colour;{" "}
            <strong>Reveal All</strong> grows the canvas to show layers that reach past it.
          </li>
          <li>
            <strong>Auto Tone, Auto Contrast and Auto Color</strong> fix a flat or tinted photo in
            one click. Unlike in Photoshop, each adds a Levels adjustment layer, so you can still
            tweak or delete the result.
          </li>
          <li>
            <strong>Duplicate</strong> opens a copy of the document in a new tab, for trying an idea
            without touching the original.
          </li>
        </ul>

        <h2>Menus that fit on the screen</h2>
        <p>
          Related commands now live in submenus — Layer → New, Arrange and Align, filters grouped by
          kind, View → Guides — so no menu needs scrolling. Point at an item marked › or press Arrow
          Right to open it. There are new commands too: Edit → Copy Merged and Stroke…, Select →
          Grow and Similar, and a Window menu that brings any panel forward. The{" "}
          <Link href="/docs/getting-started">getting started guide</Link> walks through the
          workspace.
        </p>

        <p>
          <EditorLink>Try it in Picstea</EditorLink> — free, no account, nothing uploaded.
        </p>
      </>
    ),
  },
  {
    slug: "change-the-color-of-an-object-in-a-photo",
    title: "How to change the colour of an object in a photo",
    description:
      "Recolour a jacket, car or wall in your browser: select it with Color Range, shift its hue with a clipped Hue/Saturation layer, and check it with Color Sampler.",
    published: "2026-11-08",
    draft: false,
    body: () => (
      <>
        <p>
          To change the colour of one thing in a photo, select that colour, copy it to its own
          layer, and shift its hue with an adjustment layer clipped to the copy. In Picstea that
          means <strong>Select → Color Range…</strong>, then{" "}
          <strong>Layer → New → Layer via Copy</strong>, then a Hue/Saturation adjustment layer with{" "}
          <strong>Layer → Create Clipping Mask</strong>. The shading and texture stay as they were
          because only the hue moves. For small areas there is also the Color Replacement tool,
          which paints a new colour over the old one. Everything happens in your browser, and the
          photo stays on your device.
        </p>
        <p>The example below follows one photo: someone in a red jacket, which we want blue.</p>

        <h2>How do I select only the red parts?</h2>
        <p>
          Open the photo in <EditorLink>Picstea</EditorLink> (drop it on the window or use{" "}
          <strong>File → Open Image…</strong>). Pick the Eyedropper (I) and click a typical part of
          the jacket, not a highlight or the darkest fold. That sets the foreground colour, and
          Color Range starts from the foreground colour.
        </p>
        <p>
          Now choose <strong>Select → Color Range…</strong>. The dialog has three settings:
        </p>
        <ul>
          <li>
            <strong>Colour</strong>, already set to the red you picked. You can change it here too.
          </li>
          <li>
            <strong>Fuzziness</strong>, from 0 to 255 and 40 by default. Pixels within half the
            fuzziness of the colour are fully selected, and pixels further away are selected less
            and less until the full value, so the edge of the selection is soft.
          </li>
          <li>
            <strong>Sample all layers</strong>, on by default. Untick it to look only at the active
            layer.
          </li>
        </ul>
        <p>
          While the dialog is open, marching ants show what would be selected, and a line under the
          slider gives the size of the selected area or says &quot;Nothing matches&quot;. Raise
          Fuzziness until the shadowed folds are in, and stop before the skin or a red sign in the
          background joins them. Click OK.
        </p>
        <p>
          Color Range checks every pixel in the image, including ones nowhere near the jacket. If
          something else in the frame is the same red, it gets selected too, and you remove it in
          the next step. Each run of Color Range replaces the current selection.
        </p>

        <h2>How do I clean up the selection?</h2>
        <p>
          Use the Lasso (L) to fix the leftovers. Hold Alt while you draw around the stray red sign
          to subtract it, or hold Shift and draw around a missed patch to add it. Under{" "}
          <strong>Select → Modify</strong> there are <strong>Feather…</strong> (Shift+F6) to soften
          the edge further, and <strong>Expand…</strong> and <strong>Contract…</strong> to grow or
          shrink it by a few pixels. <strong>Select → Grow</strong> adds neighbouring pixels of a
          similar colour, and <strong>Select → Similar</strong> adds matching pixels anywhere in the
          image; both use the Magic Wand&apos;s tolerance. The{" "}
          <Link href="/docs/selections">Selections guide</Link> covers every selection tool.
        </p>

        <h2>How do I change the colour and keep the shading?</h2>
        <p>
          With the photo layer active and the selection still on, press Cmd/Ctrl+J or choose{" "}
          <strong>Layer → New → Layer via Copy</strong>. The selected pixels go to a new layer
          called &quot;… copy&quot; above the photo, and the original stays untouched underneath.
        </p>
        <p>
          Next choose <strong>Layer → New Adjustment Layer → Hue/Saturation…</strong>. The new layer
          appears above the copy, and its settings are in the Properties panel. On its own it would
          change the whole photo, so choose <strong>Layer → Create Clipping Mask</strong>{" "}
          (Cmd/Ctrl+Alt+G). The adjustment is indented with ↳ in the Layers panel and now only
          affects the jacket copy.
        </p>
        <p>
          Drag <strong>Hue</strong> (−180 to 180) until the red turns the blue you want. Leave{" "}
          <strong>Lightness</strong> at 0 if you want the folds and highlights to keep their
          contrast, and use <strong>Saturation</strong> (−100 to 100) for a softer or stronger blue.
          Since this is an adjustment layer, you can come back and change the numbers later, hide it
          to compare, or paint on its mask to take the effect off a button or zip. The{" "}
          <Link href="/docs/layers-groups-and-masks">layers, groups and masks guide</Link> explains
          clipping in more detail.
        </p>
        <p>
          One limit: Hue only rotates colours that have some saturation. White, black and grey have
          none, so a white car stays white whatever Hue says. Picstea&apos;s Hue/Saturation has no
          Colorize option, so for neutral objects use the Color Replacement tool below.
        </p>

        <h2>When is the Color Replacement tool the better choice?</h2>
        <p>
          The Color Replacement tool is a brush. It shares a toolbar slot with the Brush and Pencil:
          right-click or hold the Brush button, or press Shift+B to cycle to it. The colour under
          your first dab is the one it replaces. Pixels within the <strong>Tolerance</strong> (0 to
          255, 60 by default) take the hue and saturation of the foreground colour and keep their
          own lightness, so shading survives. The options bar also has Size and Hardness.
        </p>
        <p>
          It suits small or awkward areas, like a logo on a mug or a single stripe, and it works on
          a grey or white object, since the saturation comes from the foreground colour. It changes
          the pixels directly and works on pixel layers only, so make a copy first (Cmd/Ctrl+J with
          no selection duplicates the layer). Each stroke is one undo step, and if a selection is
          active the stroke stays inside it. The other brush-style tools are in the{" "}
          <Link href="/docs/retouching">Retouching guide</Link>.
        </p>

        <h2>How do I check the new colour is right?</h2>
        <p>
          If the jacket has to match a brand colour or another photo, use the Color Sampler. It sits
          with the Eyedropper (Shift+I cycles to it). Click to place up to four sample points; the
          options bar lists each one as R, G, B and a hex code, and the readings update as you move
          the Hue slider. Drag a point to move it, Alt-click it to remove it, or press Clear. The
          points are a working aid and are not saved with the image.
        </p>

        <h2>How does this compare with Photoshop?</h2>
        <p>
          Photoshop&apos;s <strong>Select → Color Range</strong> does more than Picstea&apos;s. It
          can sample several colours with Shift and Alt, has Localized Color Clusters to keep the
          selection to nearby areas, and has Skin Tones and Out of Gamut presets. Adobe&apos;s own
          recolouring method also uses a Hue/Saturation adjustment layer, and there a selection
          turns straight into the adjustment layer&apos;s mask; it also has a Colorize option for
          colours that tint the result.
        </p>
        <p>
          In Picstea a new adjustment layer comes with a mask that shows everything, which is why
          this guide copies the jacket to its own layer and clips the adjustment to it. The result
          is the same kind of non-destructive edit. If you are weighing the two editors for other
          work, the <Link href="/photoshop-alternative">Photoshop alternative page</Link> compares
          them feature by feature.
        </p>

        <h2>How do I save the result?</h2>
        <p>
          <strong>File → Export As…</strong> writes a PNG, JPEG or WebP of the finished image, and
          the same dialog can write a layered PSD. To keep everything editable in Picstea, use{" "}
          <strong>File → Save Project As…</strong> for a .picstea file.
        </p>

        <h2>Questions people ask</h2>
        <h3>Can I change a colour without making a selection?</h3>
        <p>
          Yes, with the Color Replacement tool. It only changes pixels close to the colour under
          your first dab, so you can brush over the edges of an object and nearby colours that are
          different enough are left alone.
        </p>
        <h3>Why did part of the background change colour too?</h3>
        <p>
          Color Range selects matching colours across the whole image. Subtract the extra areas with
          the Lasso while holding Alt, or lower Fuzziness and run it again.
        </p>
        <h3>Can I recolour a white or black object?</h3>
        <p>
          Hue/Saturation can&apos;t, because those colours have no hue to rotate. The Color
          Replacement tool can, since it takes the hue and saturation from your foreground colour.
        </p>
        <h3>Is my photo uploaded anywhere?</h3>
        <p>
          No. Picstea runs in your browser, and opening, editing and exporting all happen on your
          device.
        </p>
        <p>
          <EditorLink>Open a photo in Picstea</EditorLink> and try it on something you want in a
          different colour.
        </p>
      </>
    ),
  },
  {
    slug: "rulers-guides-and-snapping-for-exact-layouts",
    title: "Rulers, guides and snapping for exact layouts",
    description:
      "Use rulers, guides, the grid, snapping and the Ruler tool in Picstea to straighten a photo and place text on exact margins, with notes on Photoshop and Canva.",
    published: "2026-11-09",
    draft: false,
    body: () => (
      <>
        <p>
          To place things exactly in Picstea, turn on the rulers with{" "}
          <strong>View → Show → Rulers</strong> (Cmd/Ctrl+R), drag guides out of them where your
          margins go, and leave <strong>View → Snap</strong> on so layers, selections, shapes and
          the crop box jump to those guides as you drag. A grid from{" "}
          <strong>View → Grid Size…</strong> gives you an even pattern to snap to, and the Ruler
          tool measures distances and angles, which is how you find out how far a crooked photo
          needs to turn. None of these marks are saved into the exported image. The whole thing runs
          in your browser, so your photo never leaves your device.
        </p>
        <p>
          The example here is a 1080 × 1350 Instagram portrait post: a beach photo with a slightly
          tilted horizon, a headline and a small logo, both kept 60 pixels from the edges.
        </p>

        <h2>How do I set up the canvas and the rulers?</h2>
        <p>
          In <EditorLink>Picstea</EditorLink>, choose <strong>File → New…</strong> and pick{" "}
          <strong>Instagram portrait</strong> from the Social sizes (1080 × 1350 px). Bring the
          photo in with <strong>File → Place Image as Layer…</strong>.
        </p>
        <p>
          Now press Cmd/Ctrl+R. Rulers appear along the top and left of the canvas, measured in
          document pixels. The tick spacing changes with the zoom so the labels stay readable, and a
          marker on each ruler follows the pointer. Rulers are off by default. Picstea remembers
          this choice, and the grid and snap settings, in your browser.
        </p>

        <h2>How do I straighten a tilted photo?</h2>
        <p>
          The Ruler tool sits in the same toolbar slot as the Eyedropper and Color Sampler. Press
          Shift+I until it&apos;s active, or right-click or hold the Eyedropper button to pick it.
          Drag along the horizon from left to right. The options bar shows six readings: X and Y for
          the start point, W and H for the horizontal and vertical distance, A for the angle and L
          for the length in pixels. The angle is counted counter-clockwise, as in Photoshop, so a
          horizon that rises to the right gives a positive number. Hold Shift to lock the line to
          45° steps. A click without dragging, or the <strong>Clear</strong> button, removes the
          line. The measurement is only a working aid and is not saved with the document.
        </p>
        <p>
          Say the readout shows A 2.4°. Select the photo layer and find the{" "}
          <strong>Transform</strong> section in the Properties panel. It has X, Y, W and H fields
          and a <strong>°</strong> field for rotation, from −180 to 180 in steps of 0.1. Positive
          values turn the layer clockwise, so type 2.4 to bring a horizon that rises to the right
          back to level. You can change the number again later.
        </p>
        <p>
          Turning a layer leaves empty corners. Press Cmd/Ctrl+T and drag a corner handle outward
          with Shift held to scale the photo up evenly until the corners are filled. If the final
          size doesn&apos;t matter, the Crop tool (C) is the other option: drag its edges inward and
          press Enter. Picstea has no straighten button that does this in one step, and{" "}
          <strong>Image → Image Rotation</strong> only offers 90° and 180° turns, so measuring and
          typing the angle is the way to do it for now.
        </p>

        <h2>How do I add guides for margins?</h2>
        <p>
          Drag down from the top ruler to make a horizontal guide, or right from the left ruler for
          a vertical one. For exact numbers, use <strong>View → Guides → New Guide…</strong>. The
          dialog asks for <strong>Vertical</strong> or <strong>Horizontal</strong> and a position in
          pixels from the left or the top. For 60 px margins on this canvas, add vertical guides at
          60 and 1020 and horizontal guides at 60 and 1290. You don&apos;t need a guide at 540 for
          the centre, because the canvas centre is already a snap target.
        </p>
        <p>
          To move a guide, switch to the Move tool (V) and drag it. Dragging it back onto a ruler or
          off the canvas deletes it. Each new guide, move or delete is one undo step.{" "}
          <strong>View → Guides → Lock Guides</strong> stops them moving while you work near them,{" "}
          <strong>View → Show → Guides</strong> (Cmd/Ctrl+;) hides them, and{" "}
          <strong>View → Guides → Clear Guides</strong> removes them all. Guides are saved with the
          project, so they are still there when you reopen a .picstea file, and they never appear in
          an exported PNG, JPEG or WebP.
        </p>

        <h2>What does snapping actually snap to?</h2>
        <p>
          With <strong>View → Snap</strong> on (the default), a dragged item pulls onto the nearest
          target once it comes within six screen pixels. The targets are the guides, the grid lines
          when the grid is visible, the canvas edges and centre, and the edges and centres of other
          visible layers. A pink line shows what it snapped to. If a guide and a layer edge are
          equally close, the guide wins.
        </p>
        <p>
          Snapping works when you move layers, drag scale handles, draw a marquee selection, draw
          shapes, place Pen anchors, adjust the crop box and drag guides. Hold Cmd (macOS) or Ctrl
          while dragging to place something freely for that one drag, or turn snapping off
          altogether with <strong>View → Snap</strong> (Cmd/Ctrl+Shift+; on a US keyboard).
        </p>
        <p>
          For the example post, add a text layer with the Type tool (T) and drag it with the Move
          tool until its left edge snaps to the guide at 60 and its top to the guide at 60. Drag the
          logo down until its bottom edge catches the guide at 1290, then along until its right edge
          catches the guide at 1020.
        </p>

        <h2>When is the grid more useful than guides?</h2>
        <p>
          Guides suit a few fixed lines, such as margins or a centre line. The grid suits layouts
          with many equal steps, like a row of product tiles or icons spaced 40 px apart.{" "}
          <strong>View → Grid Size…</strong> sets the spacing, from 2 to 1000 px (50 px by default),
          and turns the grid on. <strong>View → Show → Grid</strong> (Cmd/Ctrl+&apos;) toggles it.
          When you zoom far out, Picstea draws only every second or fourth line so the canvas
          doesn&apos;t fill with lines. While the grid is visible, edges and centres snap to the
          nearest grid line as well.
        </p>
        <p>
          Once several layers are roughly in place, <strong>Layer → Align</strong> and{" "}
          <strong>Layer → Distribute</strong> finish the job. The post on{" "}
          <Link href="/blog/select-align-and-distribute-several-layers">
            selecting, aligning and distributing several layers
          </Link>{" "}
          covers those, and the{" "}
          <Link href="/docs/guides-grid-and-snapping">rulers, guides, grid and snapping guide</Link>{" "}
          is the short reference for everything above.
        </p>

        <h2>How does this compare with Photoshop and Canva?</h2>
        <p>
          The shortcuts will feel familiar if you come from Photoshop: Cmd/Ctrl+; shows and hides
          guides and Cmd/Ctrl+&apos; the grid in both editors. Photoshop&apos;s Ruler tool can do
          more than Picstea&apos;s. It has a protractor mode, where you Alt-drag (Option-drag on
          macOS) a second line from one end to measure the angle between two lines. Adobe&apos;s
          straightening method is the same idea as the one above: draw the line along the horizon,
          then choose <strong>Image → Image Rotation → Arbitrary</strong> and enter the angle.
          Picstea has no arbitrary canvas rotation yet, so you rotate the layer instead. The{" "}
          <Link href="/photoshop-alternative">Photoshop alternative page</Link> compares the two
          editors more broadly.
        </p>
        <p>
          Canva also has rulers and guides, under <strong>File → Rulers and guides</strong>. You can
          drag guides from the rulers, and it offers preset layouts (12 columns, 3 columns or a 3 ×
          3 grid) and custom ones. Its help pages note that adding individual guides with the rulers
          isn&apos;t available on mobile, and preset and custom guides start locked. Picstea has no
          preset column layouts, so you add each guide yourself, but it does have the Ruler tool for
          measuring and angles. More differences are on the{" "}
          <Link href="/canva-alternative">Canva alternative page</Link>.
        </p>

        <h2>Questions people ask</h2>
        <h3>Do guides show up in the exported image?</h3>
        <p>
          No. Guides, the grid, rulers and Ruler tool lines are only drawn in the editor. Guides are
          saved in .picstea project files so you can keep working with them.
        </p>
        <h3>Why won&apos;t my layer snap to a guide?</h3>
        <p>
          Check that <strong>View → Snap</strong> is ticked and that guides are visible, because
          hidden guides are not snap targets. Also make sure you aren&apos;t holding Cmd or Ctrl,
          which turns snapping off for that drag.
        </p>
        <h3>Can I measure in inches or centimetres?</h3>
        <p>
          The rulers, guide positions, grid size and Ruler tool all work in pixels. The New document
          dialog accepts inches, centimetres and millimetres, but it converts them to pixels for the
          canvas.
        </p>
        <h3>Is my photo uploaded while I edit?</h3>
        <p>
          No. Picstea runs in your browser and everything, from opening to exporting, happens on
          your device.
        </p>
        <p>
          <EditorLink>Open Picstea</EditorLink> and drag a guide out of the ruler to try it.
        </p>
      </>
    ),
  },
  {
    slug: "convert-heic-to-jpg-without-uploading",
    title: "Convert HEIC photos to JPG without uploading them",
    description:
      "Turn iPhone HEIC photos into JPGs in your browser. The photos are decoded on your device, so they never go to a server. Here is how, and what to expect.",
    published: "2026-11-10",
    draft: false,
    body: () => (
      <>
        <p>
          Open <Link href="/convert/heic-to-jpg">Picstea&apos;s HEIC to JPG converter</Link>, drop
          your .heic photos on it, pick a quality and save. The conversion runs inside your browser,
          so the photos stay on your phone or computer the whole time. You can convert one photo or
          a whole batch, and nothing needs an account.
        </p>
        <h2>Why are my iPhone photos HEIC files?</h2>
        <p>
          iPhones and iPads save photos as HEIC (High Efficiency Image File) by default because the
          files are smaller than JPEGs of the same quality. Apple&apos;s own apps open them without
          a second thought. Many Windows PCs, Android phones, websites and upload forms still
          don&apos;t, which is usually when you find out your photos are in a format you never
          chose.
        </p>
        <h2>Why do most online converters upload your photos?</h2>
        <p>
          Decoding HEIC is real work, and the usual way to offer it on a website is to send your
          file to a server, convert it there and send a JPG back. That works, but your photos now
          sit on someone else&apos;s computer for a while. Holiday pictures, a scan of your passport
          or photos of your kids are exactly the files people convert, and exactly the ones you
          might not want to hand over.
        </p>
        <h2>How does Picstea convert HEIC on your device?</h2>
        <p>
          Picstea decodes HEIC with libheif, an open-source decoder, running in your browser. The
          first time you convert a HEIC file, Picstea loads the decoder (about 2 MB) from its own
          site. After that it is cached, and it keeps working offline once you install Picstea as an
          app. Your photo is read, turned the right way up and written out as a JPG without leaving
          the page.
        </p>
        <h2>Step by step</h2>
        <ol>
          <li>
            Go to <Link href="/convert/heic-to-jpg">HEIC to JPG</Link> and click{" "}
            <strong>Convert now</strong>.
          </li>
          <li>Drop one or more .heic or .heif files, or choose them from your device.</li>
          <li>
            Choose a quality. 90 is the default, and 85 to 90 keeps photos looking the same as the
            original.
          </li>
          <li>Save the JPGs. Several photos can be saved together as a ZIP file.</li>
        </ol>
        <BlogFigure
          src="/blog/convert-heic-to-jpg-without-uploading/converter.png"
          alt="Picstea's Convert HEIC to JPG dialog with two iPhone photos chosen, JPEG selected at quality 90"
          caption="Two HEIC photos ready to become JPEGs at quality 90. Nothing leaves the device."
          width={840}
          height={636}
        />
        <h2>Can I edit a HEIC photo before converting it?</h2>
        <p>
          Yes. Open the photo in <EditorLink>the Picstea editor</EditorLink> with{" "}
          <strong>File → Open</strong>, like any other image. It opens as a normal document,
          upright, and you can crop it, fix the colours, add text and export it as a JPG, PNG or
          WebP.
        </p>
        <h2>What is left out?</h2>
        <p>
          Picstea reads the main photo only. Live Photo videos, depth maps and burst frames are not
          converted, and camera details such as the location are not copied into the JPG. For most
          people that last part is a plus when they share a photo. The{" "}
          <Link href="/docs/file-formats">file formats guide</Link> lists everything Picstea opens
          and saves.
        </p>
        <h2>Questions people ask</h2>
        <h3>Is it really not uploaded?</h3>
        <p>
          Really. The decoder comes from Picstea&apos;s own site and runs in your browser; your
          photo is never sent anywhere.
        </p>
        <h3>Will the JPG look worse?</h3>
        <p>
          At quality 85 to 90 you won&apos;t see a difference in normal viewing. The JPG will be
          bigger than the HEIC, because JPEG compresses less efficiently.
        </p>
        <h3>Can I convert HEIC to PNG instead?</h3>
        <p>Yes. Choose PNG instead of JPG in the converter; PNG files are larger but lossless.</p>
        <p>
          <Link href="/convert/heic-to-jpg">Convert your HEIC photos</Link>, free and without
          uploading them.
        </p>
      </>
    ),
  },
  {
    slug: "fix-exposure-and-colour-with-camera-raw",
    title: "Fix exposure and colour with Camera Raw",
    description:
      "Correct white balance, exposure, highlights and shadows in one dialog with Picstea's Camera Raw filter, and keep it editable as a smart filter.",
    published: "2026-11-10",
    draft: false,
    image: "/blog/fix-exposure-and-colour-with-camera-raw/after.jpg",
    body: () => (
      <>
        <p>
          To fix a photo that is too dark, too blue or flat, open it in Picstea and choose{" "}
          <strong>Filter → Camera Raw…</strong>. One dialog has the controls photographers reach for
          first: white balance, exposure, contrast, highlights, shadows, whites, blacks, clarity,
          dehaze, vibrance and saturation. Everything runs in your browser and the photo is never
          uploaded.
        </p>
        <h2>What does each slider do?</h2>
        <ul>
          <li>
            <strong>Temperature</strong> and <strong>Tint</strong> set the white balance: warmer or
            cooler, greener or more magenta. Use them first, so whites look white.
          </li>
          <li>
            <strong>Exposure</strong> brightens or darkens the whole photo, in stops (EV), from −5
            to +5.
          </li>
          <li>
            <strong>Contrast</strong> spreads the tones apart or pulls them together.
          </li>
          <li>
            <strong>Highlights</strong> and <strong>Shadows</strong> recover the bright and dark
            parts on their own, so a bright sky and a dark foreground can both keep detail.
          </li>
          <li>
            <strong>Whites</strong> and <strong>Blacks</strong> set the very brightest and darkest
            points.
          </li>
          <li>
            <strong>Clarity</strong> adds or removes local contrast in the mid-tones, which makes
            texture stand out or softens it.
          </li>
          <li>
            <strong>Dehaze</strong> cuts through haze and fog, or adds it.
          </li>
          <li>
            <strong>Vibrance</strong> boosts the muted colours more than the strong ones;{" "}
            <strong>Saturation</strong> changes every colour by the same amount.
          </li>
        </ul>
        <p>Picstea applies them in that order, the same order as the list in the dialog.</p>
        <h2>A walkthrough on a real photo</h2>
        <p>
          This living room is lit by four table lamps. The camera kept their orange light, so the
          white walls look yellow and the blue sofa sinks into shadow.
        </p>
        <BlogFigure
          src="/blog/fix-exposure-and-colour-with-camera-raw/before.jpg"
          alt="Before: a living room lit by four brass table lamps, with orange walls and a dark blue sofa"
          caption="Before: orange walls and a sofa lost in shadow. Photo: WordPress Photo Directory, CC0."
          width={1400}
          height={1050}
        />
        <ol>
          <li>
            Open the photo and choose <strong>Filter → Camera Raw…</strong>.
          </li>
          <li>
            Move <strong>Temperature</strong> to the left until the walls look white rather than
            orange. Here that was −22, with <strong>Tint</strong> at +3. Going much further turns
            them blue.
          </li>
          <li>
            Raise <strong>Exposure</strong> until the sofa and cushions show detail (+0.35), then
            lower <strong>Highlights</strong> (−45) and <strong>Whites</strong> (−10) so the
            lampshades and the light on the wall don&apos;t burn out.
          </li>
          <li>
            Lift <strong>Shadows</strong> (+35) to open up the dark sofa, and add a little{" "}
            <strong>Clarity</strong> and <strong>Vibrance</strong> (+12 each).
          </li>
          <li>
            Turn <strong>Preview</strong> on and off to compare, then click <strong>OK</strong>.
          </li>
        </ol>
        <BlogFigure
          src="/blog/fix-exposure-and-colour-with-camera-raw/camera-raw-dialog.png"
          alt="Picstea's Camera Raw dialog with the settings used for this photo"
          caption="The settings used for this photo."
          width={420}
          height={560}
        />
        <BlogFigure
          src="/blog/fix-exposure-and-colour-with-camera-raw/after.jpg"
          alt="After: the same living room with white walls, a visible blue sofa and the lamps still glowing"
          caption="After: white walls, a sofa you can see, and the lamps still glow."
          width={1400}
          height={1050}
        />
        <h2>Can I change the settings later?</h2>
        <p>
          Yes, if you apply it as a smart filter. Choose{" "}
          <strong>Layer → Smart Object → Convert to Smart Object</strong> first, then{" "}
          <strong>Filter → Camera Raw…</strong>. The dialog tells you it is a smart filter, and it
          appears under the layer in the Properties panel, where you can edit its settings, hide it
          or delete it at any time. The original pixels stay untouched. The{" "}
          <Link href="/docs/smart-objects-and-smart-filters">smart objects guide</Link> explains how
          they work.
        </p>
        <h2>When should I use adjustment layers instead?</h2>
        <p>
          Camera Raw is quickest when one set of corrections fits the whole photo. When you want to
          change only part of the image, or stack corrections you can reorder, use adjustment layers
          such as Levels, Curves or Vibrance from <strong>Layer → New Adjustment Layer</strong>.
          They come with their own masks, so you can paint where they apply.
        </p>
        <h2>Questions people ask</h2>
        <h3>Is this the same as Adobe Camera Raw?</h3>
        <p>
          It covers the Basic panel: white balance, tone and presence. It works on the photo&apos;s
          pixels, so it is meant for JPEG, PNG, WebP and HEIC photos rather than camera raw files.
        </p>
        <h3>Does the preview match the result?</h3>
        <p>
          Yes. The preview may be computed on a smaller copy while you drag, but Clarity&apos;s
          radius scales with the image, so the full-size result matches.
        </p>
        <p>
          More filters are in the <Link href="/docs/filters">filters guide</Link> and on the{" "}
          <Link href="/photo-filters">photo filters page</Link>.{" "}
          <EditorLink>Open a photo in Picstea</EditorLink> to try it.
        </p>
      </>
    ),
  },
  {
    slug: "copy-and-paint-in-perspective-with-vanishing-point",
    title: "Copy and paint in perspective with Vanishing Point",
    description:
      "Clone along a wall or a floor so the copy shrinks into the distance, with Picstea's Vanishing Point filter. Step by step, with good uses and its limits.",
    published: "2026-11-10",
    draft: false,
    image: "/blog/copy-and-paint-in-perspective-with-vanishing-point/after.jpg",
    body: () => (
      <>
        <p>
          Vanishing Point lets you clone along a surface that runs away from the camera, such as a
          tiled floor or a brick wall, so that what you copy gets smaller as it goes into the
          distance. In Picstea you mark the four corners of the surface, then paint with a clone
          stamp that follows its perspective. It is under <strong>Filter → Vanishing Point…</strong>{" "}
          and runs in your browser.
        </p>
        <BlogFigure
          video="/blog/copy-and-paint-in-perspective-with-vanishing-point/vanishing-point.mp4"
          poster="/blog/copy-and-paint-in-perspective-with-vanishing-point/vanishing-point-poster.jpg"
          alt="Screen recording: marking the four corners of a tiled paving in Vanishing Point, then cloning plain tiles over a dark one"
          caption="Marking the paving as the plane, then cloning plain tiles over a dark accent tile. Photo: WordPress Photo Directory, CC0."
          width={960}
          height={614}
        />
        <h2>Step by step</h2>
        <ol>
          <li>
            Select a pixel layer (duplicate it first if you want to keep the original) and choose{" "}
            <strong>Filter → Vanishing Point…</strong>.
          </li>
          <li>
            In <strong>Edit Plane</strong> mode, click the four corners of a flat surface. Drag the
            corners until the outline sits on the edges of the floor or wall. If the corners cross,
            the dialog tells you, and you can drag them back into a four-sided shape.
          </li>
          <li>
            Switch to <strong>Stamp</strong>. Set the <strong>Brush diameter</strong> and{" "}
            <strong>Hardness</strong>.
          </li>
          <li>
            Alt-click inside the plane to pick where to copy from (or press{" "}
            <strong>Set Source</strong> and click), then paint where you want the copy.
          </li>
          <li>
            <strong>Undo Stroke</strong> takes back the last stroke. Click <strong>OK</strong> to
            apply; the whole edit is one undo step in the document.
          </li>
        </ol>
        <h2>What is it good for?</h2>
        <ul>
          <li>
            <strong>Extending a tiled floor</strong> over a rug, a cable or a gap, with tiles that
            line up with the rest. In the recording above, plain paving tiles from further right
            replace a dark one, and the copies shrink to match their place in the scene.
          </li>
          <li>
            <strong>Removing a sign or a socket from a wall</strong> by painting clean bricks or
            plaster over it from another part of the same wall.
          </li>
          <li>
            <strong>Repeating windows or panels</strong> along a building façade.
          </li>
        </ul>
        <p>
          With a selection active, only the selected area changes, which is an easy way to keep the
          stamp off nearby furniture.
        </p>
        <h2>What are the limits?</h2>
        <ul>
          <li>One plane at a time: a floor or a wall, not both joined at a corner.</li>
          <li>The stamp clones; there is no healing or pasting into the plane yet.</li>
          <li>
            It works on pixel layers and changes their pixels directly, so it can&apos;t be a smart
            filter. Duplicate the layer if you want a way back.
          </li>
          <li>Only the inside of the plane changes; everything outside it is left alone.</li>
        </ul>
        <h2>Questions people ask</h2>
        <h3>Why is the preview a bit soft?</h3>
        <p>
          On large images the dialog previews a smaller copy so it stays fast. The full-size result
          is made when you click OK.
        </p>
        <h3>Can I fix a mistake in the middle?</h3>
        <p>
          Yes. Undo Stroke removes the last stroke while the dialog is open, and Cancel discards
          everything.
        </p>
        <p>
          The <Link href="/docs/filters">filters guide</Link> lists Vanishing Point with the other
          filters. <EditorLink>Open a photo in Picstea</EditorLink> to try it.
        </p>
      </>
    ),
  },
  {
    slug: "paragraph-text-and-custom-fonts",
    title: "Paragraph text and custom fonts in Picstea",
    description:
      "Wrap text in a box, style single words and use your own fonts in Picstea: Google Fonts, fonts on your computer or uploaded font files, all kept on your device.",
    published: "2026-11-10",
    draft: false,
    body: () => (
      <>
        <p>
          In Picstea you can drag a box with the Type tool to get paragraph text that wraps inside
          it, style any selected word differently in the Character panel, and set indents and
          spacing in the Paragraph panel. For fonts, you can pick from 27 Google Fonts that come
          with Picstea, use the fonts installed on your computer (in Chrome and Edge) or upload a
          TTF, OTF, WOFF or WOFF2 file. The font file stays on your device and is saved with the
          project.
        </p>
        <p>
          Say you are making a flyer for a small event. The headline uses a brand font, the body
          text has to fit a column, and the date and venue should stand out from the rest.
        </p>
        <h2>Point text or paragraph text: which one do I need?</h2>
        <p>
          Picstea has both kinds of text layer, the same as Photoshop. Pick the Type tool (
          <strong>T</strong>) and:
        </p>
        <ul>
          <li>
            <strong>Click</strong> on the canvas for point text. A line only breaks where you press
            Enter, so it suits headlines, labels and captions.
          </li>
          <li>
            <strong>Drag</strong> a box for paragraph text. Lines wrap at the box&apos;s width, and
            dragging the box&apos;s handles makes the text reflow. Anything that doesn&apos;t fit in
            the box is clipped, so make the box tall enough for all of it.
          </li>
        </ul>
        <p>
          For the flyer, the headline is point text and the event description is paragraph text. If
          you started with the wrong one, <strong>Layer → Type → Convert to Paragraph Text</strong>{" "}
          or <strong>Convert to Point Text</strong> switches it. The same command is on the
          right-click menu in the Layers panel. Going from paragraph to point text keeps each line
          where it was wrapped.
        </p>
        <p>
          While you type, Enter starts a new paragraph, Esc cancels the edit, and Ctrl+Enter
          (Cmd+Enter on a Mac) finishes it. The whole typing session is one step in the history, so
          one undo takes it back.
        </p>
        <h2>How do I get my own font into Picstea?</h2>
        <p>
          Open the font list from the options bar or from the Character panel. It has a search field
          and groups the fonts as <strong>In this document</strong>, <strong>Google Fonts</strong>,{" "}
          <strong>On this computer</strong> and <strong>System fonts</strong>. You have four
          sources:
        </p>
        <ol>
          <li>
            <strong>System fonts</strong>, the few that every computer has.
          </li>
          <li>
            <strong>27 Google Fonts</strong> that Picstea serves from its own site, among them
            Roboto, Inter, Montserrat, Poppins, Playfair Display, EB Garamond, Bebas Neue, Lobster
            and Caveat. Each one is downloaded the first time you use it and cached after that.
          </li>
          <li>
            <strong>Fonts on your computer.</strong> At the bottom of the list, click{" "}
            <strong>Use Fonts on This Computer…</strong>. The browser asks for your permission, then
            lists your installed fonts. This works in Chrome and Edge; other browsers don&apos;t
            offer it, and you upload the file instead.
          </li>
          <li>
            <strong>Uploaded font files.</strong> Click <strong>Upload Font…</strong> and choose a
            TTF, OTF, WOFF or WOFF2 file of up to 10 MB. Picstea checks the file&apos;s first bytes
            to make sure it really is a font and reads the family name from it.
          </li>
        </ol>
        <p>
          For the flyer, the brand font comes as an OTF file from the designer, so it goes in with{" "}
          <strong>Upload Font…</strong> and shows up under <strong>In this document</strong>.
        </p>
        <h2>Where does an uploaded font go?</h2>
        <p>
          It stays in your browser. An uploaded font becomes part of the project: it is stored with
          it in your browser&apos;s storage and written into the <code>.picstea</code> file when you
          save one, so the project opens with the right font on another computer. Fonts from your
          computer work the other way: Picstea only records the font&apos;s name and never copies
          the file, because an installed font is licensed to that computer. On a computer without
          the font, the text shows in a fallback font.
        </p>
        <p>
          When a project or PSD uses a font that isn&apos;t available, Picstea tells you once which
          fonts are missing and draws the text with a fallback. Add the font with{" "}
          <strong>Upload Font…</strong> or <strong>Use Fonts on This Computer…</strong> and the text
          redraws in the right font without any retyping.
        </p>
        <h2>How do I style one word differently?</h2>
        <p>
          Open <strong>Window → Character</strong>. While you are typing, the panel changes only the
          characters you have selected; when you aren&apos;t typing, it changes the whole layer. It
          has:
        </p>
        <ul>
          <li>
            <strong>Font</strong>, <strong>Size</strong>, <strong>Color</strong>
          </li>
          <li>
            <strong>Leading</strong> (line height, as a multiple of the font size, from 0.5 to 5)
            and <strong>Tracking</strong> (letter spacing)
          </li>
          <li>
            <strong>Baseline shift</strong>, for raising or lowering characters, such as the
            &quot;th&quot; in a date
          </li>
          <li>
            <strong>Faux bold</strong>, <strong>Faux italic</strong>, <strong>All caps</strong>,{" "}
            <strong>Small caps</strong> and a <strong>Kerning</strong> checkbox
          </li>
        </ul>
        <p>
          On the flyer, the date and the venue sit inside the body text. Select them while typing
          and give them the brand colour and <strong>Faux bold</strong>; the rest of the paragraph
          keeps its style. Small caps are drawn as capitals at 75% of the size.
        </p>
        <h2>How do I set indents and spacing between paragraphs?</h2>
        <p>
          <strong>Window → Paragraph</strong> works on the paragraphs under the cursor or the
          selection, or on every paragraph of the layer when you aren&apos;t typing. It has
          alignment (<strong>Left</strong>, <strong>Center</strong>, <strong>Right</strong>,{" "}
          <strong>Justify</strong>), <strong>Indent left</strong>, <strong>Indent right</strong>,{" "}
          <strong>First line</strong>, <strong>Space before</strong> and{" "}
          <strong>Space after</strong>.
        </p>
        <p>
          Justify spreads every line to the full box width except a paragraph&apos;s last line,
          which keeps its normal spacing. For the flyer&apos;s body text, a little space after each
          paragraph reads better than empty lines between them, and it doesn&apos;t move when you
          edit the text.
        </p>
        <h2>How does this compare with Canva and Photopea?</h2>
        <p>
          Both can use your own fonts. Where they differ is the plan you need, the file types and
          where the font ends up:
        </p>
        <ul>
          <li>
            <strong>Canva</strong> lets you upload OTF, TTF and WOFF fonts to a Brand Kit. Its help
            centre lists that for Canva Pro, Teams, Business, Education and Nonprofits, so not the
            free plan, and the font is uploaded to your Canva account. See{" "}
            <Link href="/canva-alternative">Picstea as a Canva alternative</Link>.
          </li>
          <li>
            <strong>Photopea</strong> opens TTF and OTF files with File → Open or drag and drop,
            adds them to the end of its font list, and has its own library of free fonts. See{" "}
            <Link href="/photopea-alternative">Picstea as a Photopea alternative</Link>.
          </li>
          <li>
            <strong>Picstea</strong> is free, takes TTF, OTF, WOFF and WOFF2, can list installed
            fonts in Chrome and Edge, and saves uploaded fonts inside the project rather than on a
            server. Its bundled list is much shorter: 27 Google Fonts.
          </li>
        </ul>
        <h2>What happens to the text when I export?</h2>
        <p>
          PNG, JPEG and WebP exports draw the text into the image with the fonts you chose.{" "}
          <strong>SVG</strong> keeps text as text. A <strong>PSD</strong> export writes the text as
          editable Photoshop text with its style runs, paragraph styles and box, but a text layer
          with layer effects (a drop shadow, say) is turned into pixels. The{" "}
          <Link href="/docs/file-formats">file formats guide</Link> has the details.
        </p>
        <h2>What can&apos;t Picstea do with text yet?</h2>
        <ul>
          <li>Text on a path and vertical text.</li>
          <li>Warped text (warps in a PSD are dropped, with a notice).</li>
          <li>Hyphenation, and OpenType features beyond kerning.</li>
          <li>Recording text in an action.</li>
        </ul>
        <h2>Questions people ask</h2>
        <h3>Does Picstea upload my fonts?</h3>
        <p>
          No. Uploaded fonts are read by your browser and saved with the project on your device. The
          Google Fonts come from Picstea&apos;s own site, and no request goes to another site.
        </p>
        <h3>Why can&apos;t I see Use Fonts on This Computer…?</h3>
        <p>
          The button only appears in browsers that support it, which means Chrome and Edge. In
          Firefox or Safari, use <strong>Upload Font…</strong> with the font file.
        </p>
        <h3>Will text from a PSD keep its fonts?</h3>
        <p>
          Picstea matches the PSD&apos;s font names with system fonts, the bundled Google Fonts,
          fonts on your computer and fonts you uploaded. Anything it can&apos;t match is listed as
          missing and drawn with a fallback until you add it.
        </p>
        <h3>Can I make the text wrap around an image?</h3>
        <p>
          No. Paragraph text wraps inside its rectangular box only. Use two boxes side by side if
          you need text next to an image.
        </p>
        <p>
          The <Link href="/docs/layers-groups-and-masks">layers guide</Link> covers text layers with
          the other layer types, and the <Link href="/add-text-to-photo">add text to a photo</Link>{" "}
          guide has the quick version. <EditorLink>Open Picstea</EditorLink> and drag a text box to
          try it.
        </p>
      </>
    ),
  },
  {
    slug: "make-a-gradient-background-for-a-banner",
    title: "How to make a gradient background for a banner",
    description:
      "Make a smooth gradient background in your browser with Picstea's Gradient tool, add a soft glow, drop a logo's white box and stop banding with a little noise.",
    published: "2026-11-10",
    draft: false,
    body: () => (
      <>
        <p>
          To make a gradient background in Picstea, add a new pixel layer, pick two colours, choose
          the Gradient tool (<strong>G</strong>) and drag across the canvas. A second gradient set
          to <strong>Radial</strong> and <strong>To transparent</strong> adds a soft glow, the Magic
          Eraser removes the white box around a logo, the Paint Bucket recolours flat shapes, and
          about 2% of <strong>Add Noise</strong> keeps the gradient from breaking into visible bands
          when you export it. Everything happens in your browser, and the image stays on your
          device.
        </p>
        <p>
          The example in this post is a LinkedIn banner: a dark blue to purple gradient, a lighter
          glow behind the company name, and a logo that arrived as a JPG on a white background.
        </p>
        <h2>Which canvas size should I start with?</h2>
        <p>
          Open <EditorLink>the editor</EditorLink> and choose <strong>File → New…</strong>{" "}
          (Ctrl+Alt+N, or Cmd+Alt+N on a Mac). The dialog has size presets grouped by category and a
          search field, so typing &quot;linkedin&quot; finds <strong>LinkedIn banner</strong> at
          1584 × 396 px. The same list has <strong>YouTube thumbnail</strong> (1280 × 720),{" "}
          <strong>Instagram story</strong> (1080 × 1920) and many more. Leave the background white
          and click <strong>Create</strong>.
        </p>
        <h2>Why won&apos;t the gradient draw on the Background layer?</h2>
        <p>
          A new document&apos;s Background is a locked fill layer, a single solid colour. The
          Gradient tool, the Paint Bucket and the Magic Eraser only work on unlocked pixel layers,
          so on the Background you get a message instead of a gradient. Choose{" "}
          <strong>Layer → New → New Layer</strong> (Ctrl+Shift+N) and name it &quot;Gradient&quot;.
          With the gradient on its own layer you can hide it or draw it again later without touching
          anything else.
        </p>
        <h2>How do I draw the main gradient?</h2>
        <ol>
          <li>
            Click the foreground colour swatch at the bottom of the toolbar and pick the dark blue.
            Click the background swatch and pick the purple. Press <strong>X</strong> to swap them
            if you got them the wrong way round, or <strong>D</strong> to go back to black and
            white.
          </li>
          <li>
            Choose the Gradient tool with <strong>G</strong>. In the options bar, set{" "}
            <strong>Gradient type</strong> to <strong>Linear</strong> and{" "}
            <strong>Gradient colours</strong> to <strong>To background</strong>, with{" "}
            <strong>Opacity</strong> at 100%.
          </li>
          <li>
            Drag from the left edge to the right edge. Hold Shift while you drag and the direction
            snaps to steps of 45°, which keeps it perfectly horizontal. You see a preview while you
            drag, and releasing the mouse makes it one step in the history.
          </li>
        </ol>
        <p>
          Everything before the start point is the first colour and everything after the end point
          is the second, so a short drag in the middle gives a hard edge and a drag past both edges
          gives a gentle blend. If there is a selection, the gradient only fills the selected area.
        </p>
        <h2>How do I add a soft glow behind the text?</h2>
        <p>
          Add another new layer above the gradient. Set the foreground colour to a light pink or
          pale blue, then switch the options bar to <strong>Radial</strong> and{" "}
          <strong>To transparent</strong>. Drag outward from where the company name will go: the
          start point is the centre of the glow and the length of the drag is its radius. With{" "}
          <strong>To transparent</strong>, the gradient fades from the foreground colour to nothing,
          so the layer underneath shows through.
        </p>
        <p>
          At full strength the glow is usually too much. Lower the layer&apos;s opacity in the
          Layers panel to 40 to 60%, or try a blend mode such as Screen or Soft Light. The{" "}
          <Link href="/docs/layers-groups-and-masks">layers guide</Link> explains how opacity and
          blend modes work together.
        </p>
        <h2>How do I remove a logo&apos;s white background?</h2>
        <p>
          Bring in the logo with <strong>File → Place → Place Image as Layer…</strong>. A JPG logo
          comes with a white rectangle around it, which looks wrong on a gradient. Pick the Magic
          Eraser from the Eraser group of the toolbar (right-click or hold the Eraser button, or
          press Shift+E to cycle through the group) and click the white area.
        </p>
        <p>
          The Magic Eraser works like the Paint Bucket in reverse: it finds the area of similar
          colour under the click and makes it transparent. It has the same three options:
        </p>
        <ul>
          <li>
            <strong>Tolerance</strong> (0 to 255, default 32): how different a colour may be and
            still count as a match. Raise it if a light grey rim stays around the logo.
          </li>
          <li>
            <strong>Contiguous</strong>: on, only the connected area you clicked is erased. Turn it
            off to also clear the white inside letters like &quot;o&quot; and &quot;a&quot;.
          </li>
          <li>
            <strong>Sample all layers</strong>: matches colours as you see them in the whole image,
            but still erases on the active layer only.
          </li>
        </ul>
        <p>
          A logo with a busier background needs more control. The{" "}
          <Link href="/make-background-transparent">make a background transparent</Link> guide
          covers the Background Eraser and selections for that.
        </p>
        <h2>Can I recolour the logo with the Paint Bucket?</h2>
        <p>
          Yes, if it is a flat colour. A dark logo disappears on a dark gradient, so set the
          foreground colour to white, choose the Paint Bucket with Shift+G (it shares the Gradient
          tool&apos;s slot) and click the logo with <strong>Contiguous</strong> off. Every pixel
          within the tolerance of the colour you clicked turns white. The bucket compares
          transparency as well as colour, so the half-transparent pixels along the edges may keep a
          dark rim; raise <strong>Tolerance</strong> and click again. For a logo with gradients or
          shading, a Color Overlay layer style is the cleaner choice, and it stays editable.
        </p>
        <h2>Why does my gradient show stripes, and how do I fix them?</h2>
        <p>
          A gradient between two close, dark colours across 1584 pixels has more pixels than shades
          to fill them with. Each channel only has 256 levels, so the blend steps from one shade to
          the next in visible bands. JPEG and WebP compression often make it worse.
        </p>
        <p>
          A small amount of noise hides the steps. Select the gradient layer and choose{" "}
          <strong>Filter → Noise → Add Noise…</strong>. Set <strong>Amount</strong> to 1 to 3% (it
          moves in steps of 0.5), turn on <strong>Monochromatic</strong> so the grain adds no
          coloured specks, and optionally <strong>Gaussian distribution</strong> for a softer grain.
          The dialog shows a live preview. Filters change the pixels of a pixel layer for good; if
          you want to adjust the amount later, choose{" "}
          <strong>Layer → Smart Object → Convert to Smart Object</strong> first, and the noise is
          added as a smart filter you can edit or hide.
        </p>
        <h2>How does this compare with Photoshop and Canva?</h2>
        <ul>
          <li>
            <strong>Photoshop</strong>&apos;s Gradient tool has five types (Linear, Radial, Angle,
            Reflected and Diamond), a Gradient Editor with several colour and opacity stops, saved
            presets, and a Dither option that adds noise to reduce banding. Newer versions let you
            edit a gradient after drawing it. See{" "}
            <Link href="/photoshop-alternative">Picstea as a Photoshop alternative</Link>.
          </li>
          <li>
            <strong>Canva</strong> has gradient tiles you can pick as a page background from the
            Background colour option, which is quick for a design made in Canva. See{" "}
            <Link href="/canva-alternative">Picstea as a Canva alternative</Link>.
          </li>
          <li>
            <strong>Picstea</strong> is free and works in the browser without an account. Its
            Gradient tool is simpler: linear or radial, two colours (or one colour fading to
            transparent), and no presets, gradient editor or dither yet. For more than two colours,
            stack gradient layers, or use a Gradient Overlay layer style.
          </li>
        </ul>
        <h2>Which format should I export?</h2>
        <p>
          Choose <strong>File → Export As…</strong> (Ctrl+Shift+E). PNG is lossless and keeps the
          noise exactly as you see it. JPEG and WebP make smaller files; keep the quality high (90%
          or more) for a smooth gradient, since strong compression brings the banding back. The{" "}
          <Link href="/blog/png-vs-jpeg-vs-webp">PNG vs JPEG vs WebP</Link> post goes into the
          trade-offs.
        </p>
        <h2>Questions people ask</h2>
        <h3>Can I make a gradient with three or more colours?</h3>
        <p>
          Not in one drag. The Gradient tool blends two colours, or one colour into transparency.
          Draw a second gradient on a layer above with <strong>To transparent</strong>, or use a
          Gradient Overlay layer style.
        </p>
        <h3>Can I edit the gradient after I draw it?</h3>
        <p>
          No, it becomes pixels on the layer. Undo it, or drag again: a new gradient covers the
          whole layer (or the selection).
        </p>
        <h3>Does the gradient fill the whole canvas?</h3>
        <p>
          Yes, unless there is a selection. With a selection, only the selected area is filled,
          which is a quick way to put a gradient inside a shape or a band.
        </p>
        <h3>Is my image uploaded anywhere?</h3>
        <p>
          No. Picstea runs in your browser, and the logo, the banner and the export all stay on your
          device.
        </p>
        <p>
          The <Link href="/docs/painting-and-fills">painting and fills guide</Link> lists every
          painting tool and its options. <EditorLink>Open Picstea</EditorLink> and drag your first
          gradient.
        </p>
      </>
    ),
  },
];

const showDrafts = process.env.NODE_ENV !== "production";

/** Posts visible on this build: published ones, plus drafts during development. */
export const visiblePosts = () =>
  POSTS.filter((p) => !p.draft || showDrafts).toSorted((a, b) =>
    b.published.localeCompare(a.published),
  );

export const publishedPosts = () => POSTS.filter((p) => !p.draft);

export const postBySlug = (slug: string) => visiblePosts().find((p) => p.slug === slug);
