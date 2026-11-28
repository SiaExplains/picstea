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
  {
    slug: "blur-gallery-tilt-shift-iris-path-spin-blur",
    title: "Blur Gallery: tilt-shift, iris, path and spin blur",
    description:
      "Picstea's Blur Gallery has Field, Iris, Tilt-Shift, Path and Spin blur. What each slider does, which one to pick, and how it differs from Photoshop's pins.",
    published: "2026-11-11",
    draft: false,
    body: () => (
      <>
        <p>
          The Blur Gallery in Picstea is a set of five filters under{" "}
          <strong>Filter → Blur Gallery</strong>: <strong>Field Blur</strong>,{" "}
          <strong>Iris Blur</strong>, <strong>Tilt-Shift</strong>, <strong>Path Blur</strong> and{" "}
          <strong>Spin Blur</strong>. The first three keep part of the photo sharp and blur the rest
          by an amount that changes across the image, so you get a depth-of-field look without
          making a selection. Path Blur and Spin Blur add movement, as streaks along a curve or a
          rotation around a point. Each opens a dialog with sliders and a live preview. The blur is
          calculated in your browser, and the photo stays on your device.
        </p>
        <p>
          The example here is a photo taken from a footbridge: a city street below, cars parked
          along both sides, and a cyclist crossing the middle of the frame.
        </p>
        <h2>How is this different from Gaussian Blur?</h2>
        <p>
          The filters under <strong>Filter → Blur</strong> (Gaussian, Box, Lens, Motion, Radial and
          the rest) blur every pixel of the layer by the same amount. To blur only the background
          with them, you select the subject, invert the selection and then blur, as the{" "}
          <Link href="/blur-background">blur background guide</Link> does with Lens Blur. The Blur
          Gallery filters vary the amount of blur across the image, so the fade from sharp to
          blurred is built in. A selection still limits them if you make one.
        </p>
        <h2>Before you start: should I use a smart object?</h2>
        <p>
          Filters change the pixels of the layer they run on. If you want to come back later and
          change the blur, choose <strong>Layer → Smart Object → Convert to Smart Object</strong>{" "}
          first. Any filter you then pick from the Filter menu is added as a smart filter instead.
          It shows up in the <strong>Smart filters</strong> list in the Properties panel, where you
          can hide it, open it again with new settings, move it up or down, or delete it. The{" "}
          <Link href="/blog/smart-objects-explained">smart objects post</Link> covers the rest.
        </p>
        <p>
          On a plain pixel layer the dialog has a <strong>Preview</strong> checkbox instead, and{" "}
          <strong>OK</strong> applies the filter as one undo step. Text and shape layers can&apos;t
          be filtered yet.
        </p>
        <h2>How do I make the miniature look with Tilt-Shift?</h2>
        <p>
          Tilt-Shift keeps a straight band sharp and blurs more and more above and below it. A
          street seen from above starts to look like a model railway, since a focus band that thin
          is what you&apos;d get photographing something small up close.
        </p>
        <ol>
          <li>
            Choose <strong>Filter → Blur Gallery → Tilt-Shift…</strong>.
          </li>
          <li>
            Move <strong>Center Y</strong> until the sharp band sits on the cyclist. It is a
            percentage of the image height, with 50% in the middle.
          </li>
          <li>
            Set <strong>Focus band</strong> to decide how tall the sharp strip is, and{" "}
            <strong>Transition</strong> to decide how gradually the blur grows on either side. Both
            are percentages of the image height. A narrow band with a short transition makes the
            miniature effect stronger.
          </li>
          <li>
            Turn <strong>Angle</strong> (−90° to 90°) if the street runs diagonally, then raise{" "}
            <strong>Blur</strong>. It goes up to 500 px; on a photo from a phone, 15 to 40 px is
            usually enough.
          </li>
        </ol>
        <p>
          A Vibrance or Hue/Saturation adjustment layer on top adds a bit of colour for the toy look
          without touching the blurred pixels.
        </p>
        <h2>How do I keep one subject sharp with Iris Blur?</h2>
        <p>
          Iris Blur keeps an oval sharp and blurs everything outside it. Choose{" "}
          <strong>Filter → Blur Gallery → Iris Blur…</strong>, put <strong>Center X</strong> and{" "}
          <strong>Center Y</strong> on the cyclist, then size the oval with <strong>Width</strong>{" "}
          and <strong>Height</strong> (percentages of the image width and height).{" "}
          <strong>Angle</strong> tilts the oval for a subject that leans.
        </p>
        <p>
          <strong>Feather</strong> sets how the edge behaves. At 0% sharp meets blurred all at once
          at the outline. At 50%, the default, the inner half of the oval is fully sharp and the
          blur fades in toward the outline, and higher values start the fade closer to the centre.
          For portraits and product shots, something between 40 and 70% looks natural.
        </p>
        <h2>What is Field Blur for?</h2>
        <p>
          Field Blur blends between two pins, each with its own amount of blur. The defaults put{" "}
          <strong>Pin 1</strong> at the left with 15 px of blur and <strong>Pin 2</strong> at the
          right with none, so the photo goes from blurred to sharp across the frame. Everything
          before the first pin gets the first pin&apos;s blur, everything past the second gets the
          second&apos;s, and the amount changes smoothly in between.
        </p>
        <p>
          In the street photo, put <strong>Pin 1 X</strong> and <strong>Pin 1 Y</strong> near the
          top, where the far end of the street is, with some blur, and Pin 2 at the bottom with 0
          px. The distance goes soft and the foreground stays crisp, much as a wide-open lens would
          have shot it.
        </p>
        <h2>How do I add motion with Path Blur?</h2>
        <p>
          Path Blur smears the image along a short curve, like a camera panning past something fast.
          Picstea uses one curve for the whole layer, set with these sliders:
        </p>
        <ul>
          <li>
            <strong>Angle</strong> is the direction of the streak, from −180° to 180°.
          </li>
          <li>
            <strong>Speed</strong> is the length of the streak in pixels, from 1 to 300.
          </li>
          <li>
            <strong>Curve</strong> bends the streak to one side or the other, as a percentage of its
            length.
          </li>
          <li>
            <strong>Centered blur</strong> (on by default) spreads the streak both ways from each
            pixel. Turn it off and the streak trails to one side only.
          </li>
        </ul>
        <p>
          Because the streak covers the whole layer, use a selection to decide where it goes. To
          make the street behind the cyclist rush past, select the cyclist with the{" "}
          <Link href="/docs/selections">selection tools</Link>, choose{" "}
          <strong>Select → Inverse</strong>, add a few pixels with{" "}
          <strong>Select → Feather…</strong> so the edge isn&apos;t harsh, and then run Path Blur
          with the angle matching the direction of travel.
        </p>
        <h2>How do I make wheels spin with Spin Blur?</h2>
        <p>
          Spin Blur rotates the pixels inside a circle around its centre. Choose{" "}
          <strong>Filter → Blur Gallery → Spin Blur…</strong>, put <strong>Center X</strong> and{" "}
          <strong>Center Y</strong> on the hub of the front wheel and set <strong>Radius</strong> (a
          percentage of the shorter side of the image) until the circle covers the wheel.{" "}
          <strong>Blur angle</strong>, from 0° to 360°, is how far each pixel is smeared around the
          circle. <strong>Feather</strong> fades the effect out toward the edge of the circle.
        </p>
        <p>
          Each Spin Blur covers one circle, so the rear wheel needs a second pass. Open the dialog
          again and move the centre; it starts from the settings you used last. On a pixel layer,{" "}
          <strong>Filter → Last Filter</strong> (Ctrl+Alt+F, or Cmd+Option+F on a Mac) repeats it
          with exactly the same settings. On a smart object you can add the same filter twice and
          keep both editable.
        </p>
        <h2>How does this compare with Photoshop and Photopea?</h2>
        <p>
          Photoshop and Photopea have the same five blur types, but you place them on the image
          itself. In Photoshop you drag pins, rings and handles on the canvas, and Field Blur can
          take several pins with a different blur on each. Adobe recommends converting the layer to
          a smart object first so the Blur Gallery is applied as a smart filter, which works the
          same way in Picstea. Photopea&apos;s Blur Gallery also uses control points on the image,
          and its guide says you can add as many blurs of each type as you need.
        </p>
        <p>
          Picstea sets the geometry with sliders, and each run of a filter has one of each: two pins
          for Field Blur, one oval, one band, one curve or one circle. For several spin centres or a
          path that changes direction, run the filter more than once, each time with a selection.
          The <Link href="/photoshop-alternative">Photoshop alternative</Link> and{" "}
          <Link href="/photopea-alternative">Photopea alternative</Link> pages compare more.
        </p>
        <h2>Questions people ask</h2>
        <h3>Can I blur only the background without selecting the subject?</h3>
        <p>
          Yes, if the subject is roughly oval or sits in a band: Iris Blur and Tilt-Shift keep that
          area sharp. For a complicated outline, select the subject and use Lens Blur on the
          inverted selection.
        </p>
        <h3>Is the preview the same as the final result?</h3>
        <p>
          On most photos, yes. On very large layers the preview is calculated at a reduced size so
          the dialog stays responsive. The result you apply is always full resolution.
        </p>
        <h3>Can I change the blur after clicking OK?</h3>
        <p>
          Only on a smart object, where the filter stays in the Smart filters list. On a pixel layer
          the blur becomes part of the pixels, and undo is the way back.
        </p>
        <h3>Is my photo uploaded to apply the blur?</h3>
        <p>No. Every Blur Gallery filter runs in your browser; Picstea has no server for images.</p>
        <p>
          The <Link href="/docs/filters">filters guide</Link> lists every filter in the menu.{" "}
          <EditorLink>Open Picstea</EditorLink> and try Tilt-Shift on a photo taken from up high.
        </p>
      </>
    ),
  },
  {
    slug: "pixelate-or-black-out-private-info-in-screenshots",
    title: "Pixelate or black out private info in screenshots",
    description:
      "Hide names, emails, account numbers and faces in a screenshot with Picstea's Mosaic filter, selections and solid fills, then export a flat PNG. Nothing uploads.",
    published: "2026-11-12",
    draft: false,
    body: () => (
      <>
        <p>
          To hide private details in a screenshot with Picstea, select each area with the{" "}
          <strong>Rectangular Marquee</strong>, <strong>Elliptical Marquee</strong> or{" "}
          <strong>Polygonal Lasso</strong>, then either fill it with black using{" "}
          <strong>Edit → Fill with Foreground</strong> (Shift+F5) or pixelate it with{" "}
          <strong>Filter → Pixelate → Mosaic…</strong>. Export the result with{" "}
          <strong>File → Export As…</strong> as a PNG, which saves only the flattened pixels. Use
          the solid fill for text. Mosaic and blur suit faces and photos, where you want the image
          to stay readable as a picture. The screenshot is opened and edited in your browser and
          stays on your device; nothing is uploaded, which matters when the thing you&apos;re hiding
          is the reason you didn&apos;t want to send the file anywhere.
        </p>
        <p>
          The example is a screenshot of a banking app you want to share with a support team: your
          name and email at the top, a round profile photo, an IBAN in the middle and a photo of a
          card that someone took at an angle.
        </p>
        <h2>How do I open the screenshot?</h2>
        <p>
          Drop the file onto the editor or choose <strong>File → Open Image…</strong> (Cmd/Ctrl+O).
          A PNG or JPEG screenshot opens as a single pixel layer, which is the kind of layer filters
          and fills work on. If you&apos;d like to compare before and after, press Cmd/Ctrl+J with
          nothing selected to duplicate the layer, and hide the copy with its eye icon. Delete that
          copy before you save anything with layers (more on that below).
        </p>
        <h2>How do I black out text completely?</h2>
        <p>
          A solid box is the safest way to hide text such as a name, email address or account
          number. It replaces the pixels, so there&apos;s nothing left to reconstruct.
        </p>
        <ol>
          <li>
            Pick the <strong>Rectangular Marquee</strong> (M) and drag over the name. Hold Shift and
            drag again over the email and the IBAN to add those areas to the same selection.
          </li>
          <li>Press D to reset the colours, so the foreground is black.</li>
          <li>
            Choose <strong>Edit → Fill with Foreground</strong> or press Shift+F5. Every selected
            area turns solid black in one undo step.
          </li>
          <li>Press Cmd/Ctrl+D to deselect.</li>
        </ol>
        <p>
          Make the boxes a little larger than the text. Descenders and the edges of letters that
          stick out of a box can give away more than you&apos;d expect. If the outline is slightly
          off, drag inside the selection to move it, or use the arrow keys, before you fill.
        </p>
        <h2>How do I pixelate a face or profile photo?</h2>
        <p>
          For the round profile photo, a mosaic hides the person and still looks tidy. Hold the
          Marquee tool&apos;s button (or right-click it) and choose{" "}
          <strong>Elliptical Marquee</strong>, or press Shift+M to switch to it. Hold Shift while
          dragging to get a circle, and Alt to draw from the centre.
        </p>
        <p>
          Then choose <strong>Filter → Pixelate → Mosaic…</strong>. The only setting is{" "}
          <strong>Cell size</strong>, from 2 to 200 px with 10 px as the default. Each square cell
          becomes the average colour of the pixels in it, and only the selected area changes. For a
          small avatar a few cells across are enough; on a face that fills more of the frame, raise
          the cell size until features such as eyes and mouth are gone. Watch the canvas while you
          move the slider, then press <strong>OK</strong>.
        </p>
        <p>
          To pixelate another area with the same cell size, select it and choose{" "}
          <strong>Filter → Last Filter</strong> (Cmd/Ctrl+Alt+F). It repeats Mosaic without opening
          the dialog.
        </p>
        <p>
          If you&apos;d rather blur, <strong>Filter → Blur → Gaussian Blur…</strong> has a{" "}
          <strong>Radius</strong> from 0.1 to 250 px. A light blur or a small mosaic on text can
          leave the shapes of the words visible enough to guess, so keep those for photos and use
          the black fill for anything written.
        </p>
        <h2>What about an area that isn&apos;t a rectangle?</h2>
        <p>
          The card in the screenshot was photographed at an angle, so its number runs diagonally. A
          rectangle around it would cover half the screen. Use the <strong>Polygonal Lasso</strong>{" "}
          instead: hold the Lasso tool&apos;s button and pick it, or press Shift+L. Click once at
          each corner of the number, then double-click or press Enter to close the shape. Backspace
          removes the last point if you misclick, and Escape throws the whole outline away. Fill it
          or pixelate it the same way as above.
        </p>
        <p>
          The <Link href="/docs/selections">selections guide</Link> has the rest of the selection
          shortcuts, including Alt to subtract from a selection.
        </p>
        <h2>Can I use neat rounded bars instead?</h2>
        <p>
          Yes. If the screenshot is going into a slide or a bug report, rounded bars look cleaner
          than hard black boxes. Choose the <strong>Rounded Rectangle</strong> from the shape
          tool&apos;s flyout (U, then Shift+U to cycle). It starts with a 16 px corner radius, which
          you can change in the <strong>Radius</strong> field of the options bar. New shapes are
          filled in blue by default, so set the <strong>Fill</strong> colour in the options bar to
          black or grey first, then drag a bar over each line of text.
        </p>
        <p>
          Each bar is its own shape layer sitting above the screenshot, and the text is still there
          underneath. That&apos;s fine for a PNG, JPEG or WebP export, which flattens everything
          into one image. It is a problem in any format that keeps layers, which the next section
          covers. If you want the bars burned in for good, choose{" "}
          <strong>Layer → Flatten Image</strong> before saving anything else.
        </p>
        <h2>Which format should I export?</h2>
        <p>
          Choose <strong>File → Export As…</strong> and pick <strong>PNG</strong>. PNG is lossless,
          so the black boxes keep sharp edges and screenshot text stays crisp. JPEG and WebP work
          too if the file needs to be smaller; the{" "}
          <Link href="/blog/png-vs-jpeg-vs-webp">PNG vs JPEG vs WebP post</Link> explains the
          trade-off. These three formats and PDF are written from the flattened image, so only the
          visible pixels end up in the file.
        </p>
        <p>
          Be careful with the formats that keep layers. A <strong>PSD</strong> export keeps every
          layer, so a shape bar and the text under it both go into the file, and anyone can hide the
          bar in another editor. <strong>SVG</strong> keeps shapes as vectors and embeds the other
          layers as images, with the same result. A <strong>.picstea</strong> project from{" "}
          <strong>File → Save Project As…</strong> keeps everything, including the hidden backup
          copy from earlier. Send the PNG, and keep the project for yourself if you want it. The{" "}
          <Link href="/docs/file-formats">file formats page</Link> lists what each format keeps.
        </p>
        <h2>How do other editors do this?</h2>
        <p>
          The steps carry over between editors. Photoshop Elements has the same filter under{" "}
          <strong>Filter → Pixelate → Mosaic</strong>, described in Adobe&apos;s help as redrawing
          the layer as square blocks of colour with an adjustable cell size. In GIMP the equivalent
          is <strong>Filters → Blur → Pixelize…</strong>. Picstea keeps Mosaic where Photoshop
          Elements users look for it, and it runs in a browser tab without an install or an account.
          If you&apos;re weighing up editors more generally, the{" "}
          <Link href="/gimp-alternative">GIMP comparison</Link> and the{" "}
          <Link href="/photoshop-alternative">Photoshop comparison</Link> go through what each one
          does and doesn&apos;t have.
        </p>
        <h2>Questions people ask</h2>
        <h3>Can someone undo a mosaic?</h3>
        <p>
          Not from the exported PNG, which holds only the pixelated pixels. With small cells over
          text the blocks can still hint at the letters, so use a solid fill for names and numbers.
        </p>
        <h3>Why is the Mosaic filter greyed out?</h3>
        <p>
          Filters work on pixel layers and smart objects that aren&apos;t locked. If a shape or text
          layer is active, click the screenshot layer in the Layers panel first. On a smart object
          the filter is added as a smart filter, which can be switched off again, so for redaction
          use a plain pixel layer.
        </p>
        <h3>Can I hide the same areas on a lot of screenshots at once?</h3>
        <p>
          Not really. Picstea can record filters and fills as an action and run it over a batch of
          files, but selections drawn with the marquee or lasso aren&apos;t recorded, so an action
          can&apos;t place the boxes for you. Redaction is done one screenshot at a time. The{" "}
          <Link href="/blog/record-actions-and-batch-process-images">actions and batch post</Link>{" "}
          shows what can be recorded.
        </p>
        <h3>Is the screenshot uploaded anywhere?</h3>
        <p>
          No. Picstea opens, edits and exports the image in your browser and has no server for
          images, so the unredacted version never leaves your device.
        </p>
        <p>
          <EditorLink>Open Picstea</EditorLink>, drop in a screenshot and black out the first line
          you don&apos;t want anyone else to read.
        </p>
      </>
    ),
  },
  {
    slug: "straighten-document-photo-picstea-vs-photoshop-gimp",
    title: "Straighten a document photo: Picstea vs Photoshop",
    description:
      "Turn a phone photo of a page taken at an angle into a flat, square-on document with Perspective Crop and Straighten, in Picstea, Photoshop and GIMP.",
    published: "2026-11-13",
    draft: false,
    body: () => (
      <>
        <p>
          To flatten a photo of a document that was taken at an angle, use a perspective crop: you
          put four corners on the four corners of the page, and the editor stretches that area into
          a rectangle. In Picstea that is the <strong>Perspective Crop</strong> tool (press C, then
          Shift+C), and you finish with Enter. Photoshop has a tool with the same name that works
          the same way. GIMP gets there with its Perspective transform tool. If the page is only
          rotated, as a crooked scan is, the <strong>Straighten</strong> button in the Crop tool is
          enough. Picstea runs in your browser, so the photo stays on your device and nothing is
          uploaded.
        </p>
        <p>
          The example is a signed two-page rental agreement. You photographed page one on a desk
          with your phone, standing slightly to the left, so the page is a lopsided trapezoid with
          the desk showing around it. Page two came out of a flatbed scanner a few degrees crooked.
          The landlord wants both as tidy PDFs.
        </p>
        <h2>How do I flatten the angled photo in Picstea?</h2>
        <ol>
          <li>
            Open <EditorLink>the Picstea editor</EditorLink> and drop the photo in, or choose{" "}
            <strong>File → Open Image…</strong> (Cmd/Ctrl+O). iPhone HEIC photos open too.
          </li>
          <li>
            Press C for the Crop tool, then Shift+C to switch to <strong>Perspective Crop</strong>.
            Shift+C switches back again.
          </li>
          <li>Drag a rough box over the page.</li>
          <li>
            Drag each of the four corners onto a corner of the paper. Zoom in if the corners are
            hard to see. Dragging inside the box moves all four at once.
          </li>
          <li>
            Press Enter or click <strong>Apply crop</strong>. The area inside the four corners
            becomes the new canvas, as a rectangle. Esc or <strong>Reset</strong> clears the box so
            you can start again.
          </li>
        </ol>
        <p>
          The whole thing is one undo step, so Cmd/Ctrl+Z brings the original photo back. A corner
          stops moving if dragging it further would fold the box over itself, because the four
          corners have to stay a four-sided shape.
        </p>
        <p>
          Perspective Crop changes the whole document, with every layer in it. Pixel layers are
          redrawn, masks follow, and text and shape layers are turned into smart objects first so
          the text can still be edited inside them. Guides are removed. For a single phone photo
          none of that matters, but it does if you run the tool on a layered file.
        </p>
        <h2>Why does the page come out a little too wide or too tall?</h2>
        <p>
          Picstea works out the size of the result from the box you drew. The new width is the
          average of the top and bottom edges, and the new height is the average of the left and
          right edges. A photo taken from a steep angle shortens the page in one direction, so the
          result can look slightly squashed next to the real sheet. The tool has no width and height
          fields to force a paper size.
        </p>
        <p>
          To correct it, open <strong>Image → Image Size…</strong>, untick{" "}
          <strong>Constrain proportions</strong> and type a width and height in the ratio of the
          paper. A4 is 210 × 297 mm, so 2100 × 2970 pixels has the right shape. You&apos;ll get a
          closer result with less fixing if you take the photo from directly above the page.
        </p>
        <h2>What if the page is only crooked, like a scan?</h2>
        <p>
          Page two has no perspective problem. Its edges are parallel and it is just rotated, so it
          needs the ordinary Crop tool:
        </p>
        <ol>
          <li>Press C.</li>
          <li>
            Click <strong>Straighten</strong> in the options bar.
          </li>
          <li>
            Drag along something that should be level or upright: a line of text, a table rule, or
            the edge of the sheet.
          </li>
          <li>
            Picstea rotates the canvas by that angle and fits the crop box inside the rotated
            picture, so the empty corners are left out. Adjust the box if you like, then press
            Enter.
          </li>
        </ol>
        <p>
          The line is matched to whichever axis is nearer, so a line drawn along the side of the
          page straightens to vertical and one drawn along a row of text straightens to horizontal.
          If you already know the angle, <strong>Image → Image Rotation → Arbitrary…</strong> takes
          a number in steps of 0.1° with a choice of Clockwise or Counter-clockwise, and the canvas
          grows to fit.
        </p>
        <p>
          While you are in the Crop tool, the <strong>Ratio</strong> menu has Free, Original ratio,
          1:1, 4:5, 5:4, 3:2, 2:3, 16:9, 9:16 and Custom ratio. Crop normally keeps the pixels
          outside the new canvas, so a layer can be moved back into view later. Tick{" "}
          <strong>Delete cropped pixels</strong> to remove them instead. The{" "}
          <Link href="/docs/transform-warp-and-crop">transform, warp and crop documentation</Link>{" "}
          covers each option.
        </p>
        <h2>How does Photoshop do it?</h2>
        <p>
          Almost identically. Adobe&apos;s help pages describe holding the Crop tool to pick the
          Perspective Crop tool, drawing a marquee around the object, moving its corners to the
          object&apos;s edges and pressing Enter or Return. For rotation, Photoshop&apos;s Crop tool
          has a Straighten control in the options bar that you use by drawing a line along something
          that should be level, and a Delete Cropped Pixels checkbox that works the way
          Picstea&apos;s does.
        </p>
        <p>
          The difference is in how you get the editor. Adobe sells Photoshop only as a Creative
          Cloud subscription, while Picstea is free, runs in a browser tab and needs no account. If
          you already pay for Photoshop, use it for this; one crooked contract isn&apos;t much of a
          reason to subscribe if you don&apos;t. There is a longer comparison on the{" "}
          <Link href="/photoshop-alternative">Photoshop alternative page</Link>.
        </p>
        <h2>How does GIMP do it?</h2>
        <p>
          GIMP is free and open source, and you install it on your computer. It splits the job
          across two tools in a different way.
        </p>
        <ul>
          <li>
            For rotation, the Measure tool (<strong>Tools → Measure</strong>) has a{" "}
            <strong>Straighten</strong> button. You drag a measuring line along the crooked edge and
            click the button. In its default Auto mode it snaps to the smaller angle to vertical or
            horizontal, which is the same nearest-axis behaviour as Picstea&apos;s.
          </li>
          <li>
            For perspective, the Perspective tool (
            <strong>Tools → Transform Tools → Perspective</strong>, Shift+P) is a transform tool.
            Its options include a <strong>Direction</strong> setting,{" "}
            <strong>Corrective (Backward)</strong>, which the GIMP manual says is for repairing
            images with geometric errors, and a <strong>Clipping</strong> setting,{" "}
            <strong>Crop to result</strong>, which leaves out the transparent corners the transform
            creates.
          </li>
        </ul>
        <p>
          Both routes work. GIMP gives you more settings to choose, and Picstea asks for four corner
          drags and Enter. The <Link href="/gimp-alternative">GIMP alternative page</Link> compares
          the two editors more widely.
        </p>
        <h2>How do I clean up the page and save it as a PDF?</h2>
        <p>
          A photographed page is usually grey where it should be white. Choose{" "}
          <strong>Layer → New Adjustment Layer → Levels</strong> and drag the white input left until
          the paper turns white, then bring the black input right until the text is solid. The{" "}
          <Link href="/blog/levels-and-curves-explained">Levels and Curves post</Link> explains what
          each slider does. <strong>Image → Auto Contrast</strong> is the one-click version.
        </p>
        <p>
          Then choose <strong>File → Export As…</strong> and pick <strong>PDF</strong>. It saves one
          page at the document&apos;s resolution, without lossy compression. Each document exports
          as its own PDF, so the two pages of the agreement become two files. Pick{" "}
          <strong>JPEG</strong> if the landlord would rather have a small image. The{" "}
          <Link href="/docs/file-formats">file formats documentation</Link> lists what every export
          format keeps.
        </p>
        <h2>Questions people ask</h2>
        <h3>Can I use Edit → Transform → Perspective for this?</h3>
        <p>
          You can, but it is the wrong tool for a whole photo. The commands in{" "}
          <strong>Edit → Transform</strong> (Skew, Distort, Perspective and Warp) reshape one layer
          and leave the canvas alone, so you would still have to crop afterwards. They are meant for
          fitting a layer onto something in the picture, such as a screenshot onto a laptop screen.
        </p>
        <h3>Does straightening make the picture smaller?</h3>
        <p>
          A little. After rotating, the crop box is fitted inside the rotated picture so that no
          empty corners show, and the wider the angle, the more of the edges it trims. You can drag
          the box out again before pressing Enter if you would rather keep the edges and the empty
          corners with them.
        </p>
        <h3>Can I fix several photographed pages in one go?</h3>
        <p>
          No. The four corners sit in a different place on every photo, so each page is opened and
          corrected by hand.
        </p>
        <h3>Is the document uploaded anywhere?</h3>
        <p>
          No. Picstea opens, corrects and exports the file in your browser and has no server for
          images, so a contract or an ID stays on your device.
        </p>
        <p>
          <EditorLink>Open Picstea</EditorLink>, drop in a photo of a page, press C and then
          Shift+C, and put the four corners on the paper.
        </p>
      </>
    ),
  },
  {
    slug: "put-a-logo-on-a-mug-with-warp",
    title: "Put a logo on a mug photo with Warp",
    description:
      "Make a mug mockup in your browser: place a logo as a smart object, bend it with Edit → Transform → Warp, blend it into the glaze and swap the design later.",
    published: "2026-11-14",
    draft: false,
    body: () => (
      <>
        <p>
          To put a flat logo onto a curved mug in a photo, place the logo as a smart object, then
          bend it with <strong>Edit → Transform → Warp</strong> so its top and bottom edges follow
          the rim and the base. Set the layer&apos;s blend mode to <strong>Multiply</strong> so the
          mug&apos;s shading shows through, and paint a mask where the handle or a hand covers the
          print. Because the logo is a smart object, the warp stays editable and you can replace the
          design later without bending it again. Picstea does all of this in your browser; the photo
          and the logo stay on your device and nothing is uploaded.
        </p>
        <p>
          The example: you sell printed mugs and have one good photo of a plain white mug, shot from
          a little above, with the handle on the right. You want to show three customer logos on it
          without a reshoot.
        </p>
        <h2>How do I add the logo so it can be bent without losing quality?</h2>
        <ol>
          <li>
            Open the mug photo in the <EditorLink>editor</EditorLink> with{" "}
            <strong>File → Open Image…</strong>, or drop it onto the page.
          </li>
          <li>
            Choose <strong>File → Place → Place Embedded…</strong> and pick the logo. PNG, JPEG,
            WebP, SVG, PSD (with its layers), TIFF, PDF (the first page) and <code>.picstea</code>{" "}
            projects all work. The logo arrives as a smart object, at its own size, in the middle of
            the canvas.
          </li>
          <li>
            Press <strong>Cmd/Ctrl+T</strong> (Free Transform) and scale it down to the width of the
            print area. Press Enter.
          </li>
        </ol>
        <p>
          A smart object keeps the original logo inside it and is redrawn from that original at
          whatever size and shape it ends up, so scaling and warping several times doesn&apos;t blur
          it. <strong>File → Place → Place Image as Layer…</strong> would give you a plain pixel
          layer instead, and on a pixel layer a warp is baked into the pixels as soon as you press
          Enter. The <Link href="/blog/smart-objects-explained">smart objects post</Link> covers the
          idea in more depth.
        </p>
        <h2>How do I bend the logo around the mug?</h2>
        <p>
          With the logo layer selected, choose <strong>Edit → Transform → Warp</strong>. A 4 × 4
          grid appears over the layer, and the options bar shows a <strong>Warp</strong> menu, three
          number fields (<strong>Bend</strong>, <strong>H</strong> and <strong>V</strong>, each from
          −100 to 100 %) and <strong>Apply</strong> and <strong>Cancel</strong> buttons.
        </p>
        <p>
          The menu lists Custom and 13 styles: Arc, Arc Lower, Arc Upper, Arch, Bulge, Flag, Wave,
          Fish, Rise, Fisheye, Inflate, Squeeze and Twist. On a mug seen from slightly above, the
          rim and the base both look like shallow smiles, so the print has to curve down in the
          middle. Two good starting points:
        </p>
        <ul>
          <li>
            <strong>Arch</strong> moves the whole logo up or down in the middle by the same amount,
            top and bottom together. Choose it and type a negative <strong>Bend</strong>, such as
            −15 %, to make the middle dip.
          </li>
          <li>
            <strong>Arc Lower</strong> bends only the bottom edge, which helps when the photo was
            taken closer to eye level and the top of the print is nearly straight.
          </li>
        </ul>
        <p>
          <strong>H</strong> and <strong>V</strong> add horizontal and vertical distortion on top of
          the style. Small values are usually enough. Then compare the curve of the logo with the
          curve of the rim. If they don&apos;t quite match, drag any of the grid&apos;s 16 points.
          As soon as you move one by hand the menu switches to <strong>Custom</strong>, and the
          number fields are disabled because the grid no longer comes from a preset. Pulling the two
          outer columns of points slightly inwards makes the logo look as if it turns away from you
          at the sides of the mug.
        </p>
        <p>
          Press Enter or click <strong>Apply</strong>. Esc cancels. The whole warp is one undo step.
        </p>
        <h2>What if the mug is photographed at an angle?</h2>
        <p>
          If the mug leans or the camera was off to one side, fix the perspective first and warp
          second. Choose <strong>Edit → Transform → Perspective</strong> and drag a corner: its
          partner on the same edge moves the opposite way, so the logo leans away from you. Press
          Enter. When you then choose <strong>Edit → Transform → Warp</strong> on the same smart
          object, the grid starts from that perspective shape and you bend from there.
        </p>
        <p>
          <strong>Edit → Transform → Distort</strong> lets you move each corner freely. It is the
          right tool for flat surfaces in the same shoot, such as a card leaning against the mug or
          a price sign. <strong>Skew</strong> slants the layer along one edge. The{" "}
          <Link href="/docs/transform-warp-and-crop">transform, warp and crop docs</Link> list what
          each command does.
        </p>
        <h2>How do I make the print look like part of the mug?</h2>
        <p>A freshly warped logo still sits on top of the photo like a sticker. To fix that:</p>
        <ol>
          <li>
            In the Layers panel, set the logo layer to <strong>Multiply</strong>. White parts of the
            logo disappear and the mug&apos;s shading darkens the print where the mug curves away
            from the light. For a logo on a dark mug, try <strong>Screen</strong> instead.
          </li>
          <li>
            A glazed mug usually has a bright streak that should sit on top of the print. Choose{" "}
            <strong>Layer → Layer Style → Blending Options…</strong> and use{" "}
            <strong>Blend If</strong>: Alt-drag the white thumb of the{" "}
            <strong>Underlying Layer</strong> slider to split it, so the brightest parts of the
            photo show through the logo with a soft edge. The{" "}
            <Link href="/blog/layer-styles-blend-if-and-the-image-menu">Blend If post</Link>{" "}
            explains the sliders.
          </li>
          <li>
            If the handle or a hand overlaps the print, choose{" "}
            <strong>Layer → Raster Mask → Add Layer Mask</strong> and paint black on the mask with
            the Brush where the logo should be hidden. The mask is linked to the layer, so it moves
            with it.
          </li>
        </ol>
        <p>
          If the print still looks too crisp next to a slightly soft photo, lower the layer&apos;s
          opacity a little, to around 90 %.
        </p>
        <h2>How do I swap in the next customer&apos;s logo?</h2>
        <p>
          Double-click the smart object&apos;s thumbnail in the Layers panel, or choose{" "}
          <strong>Layer → Smart Object → Edit Contents</strong>. The logo opens in its own tab.
          Delete the old logo there, place the new one, and save with Cmd/Ctrl+S or close the tab.
          Back in the mug photo, the new logo comes out with the same warp, blend mode, Blend If
          settings and mask. Then choose <strong>File → Export As…</strong> and pick{" "}
          <strong>JPEG</strong> or <strong>WebP</strong> for the shop listing, and repeat for the
          third logo.
        </p>
        <p>
          Size the new logo to fill about the same area of the contents tab as the old one did. The
          warp bends the whole contents box, so a small logo in a corner of it ends up in the wrong
          place on the mug.
        </p>
        <h2>How does this compare with Photoshop?</h2>
        <p>
          Photoshop has the same command at <strong>Edit → Transform → Warp</strong>, with preset
          styles and a custom grid, and a warp on a smart object stays editable there too. It also
          has a <strong>Cylinder</strong> warp preset, added in Photoshop 23.4, which is made for
          labels on bottles, cans and mugs. Picstea has no Cylinder preset, so you build the curve
          from Arch or Arc Lower and finish it by dragging points. Picstea&apos;s warp styles are
          close to Photoshop&apos;s but not identical. Photoshop is a paid subscription that you
          install; the <Link href="/photoshop-alternative">Photoshop alternative page</Link>{" "}
          compares the two in more detail.
        </p>
        <h2>Questions people ask</h2>
        <h3>Can I warp text without turning it into pixels?</h3>
        <p>
          Yes. When you choose Warp on a text layer, Picstea turns it into a smart object first. The
          text is still inside and you can edit it with Layer → Smart Object → Edit Contents.
        </p>
        <h3>Can I go back and change the warp later?</h3>
        <p>
          On a smart object, yes: choose Edit → Transform → Warp again and the grid comes back as
          you left it, with the points ready to drag. The style and the Bend, H and V values
          aren&apos;t stored, so a saved warp always reopens as Custom. On a pixel layer the warp is
          final once you press Enter, apart from undo.
        </p>
        <h3>Will the warp survive if I save as PSD?</h3>
        <p>
          Picstea writes smart objects with their warp or perspective into PSD files, and PSDs from
          Photoshop with warped or perspective smart objects open with the effect kept and editable.
          The <Link href="/docs/file-formats">file formats docs</Link> list what else a PSD keeps.
        </p>
        <h3>Why is the Move tool frame a rectangle after warping?</h3>
        <p>
          A distorted smart object&apos;s Move-tool frame is still its undistorted box. It&apos;s a
          known limitation, and the warped logo itself is drawn correctly.
        </p>
        <p>
          <EditorLink>Open Picstea</EditorLink>, drop in a product photo and choose File → Place →
          Place Embedded… to start your first mockup.
        </p>
      </>
    ),
  },
  {
    slug: "open-tiff-pdf-and-psb-files-in-your-browser",
    title: "Open TIFF, PDF and PSB files in your browser",
    description:
      "How Picstea opens TIFF files with their Photoshop layers, turns a PDF page into an image at the resolution you pick, and reads PSB files, all on your device.",
    published: "2026-11-16",
    draft: false,
    body: () => (
      <>
        <p>
          You can open a TIFF, a PDF or a PSB file in Picstea the same way you open a JPEG: choose{" "}
          <strong>File → Open Image…</strong> (Cmd/Ctrl+O) or drop the file on the editor. A TIFF
          opens as an image, and a layered TIFF saved by Photoshop opens with its layers. A PDF page
          opens as a picture, and if the PDF has several pages Picstea asks which page and at what
          resolution. A PSB opens like a PSD, as long as it fits Picstea&apos;s size limit.
          Everything is read in your browser, so the files stay on your device and nothing is
          uploaded.
        </p>
        <p>
          Say a printer has sent back the files for a café&apos;s new menu: a product photo saved as
          a layered TIFF from Photoshop, a four-page PDF proof of the printed menu, and a PSB of the
          poster artwork. You want to fix the photo, pull page three of the proof out as an image
          for Instagram, and check the poster&apos;s layers.
        </p>
        <h2>How do I open a layered TIFF from Photoshop?</h2>
        <ol>
          <li>
            Open <EditorLink>the Picstea editor</EditorLink> and choose{" "}
            <strong>File → Open Image…</strong>, or drag the <code>.tif</code> file onto the window.
          </li>
          <li>
            If Photoshop saved the layers inside the TIFF, Picstea hands that layer data to its PSD
            reader, so its layers, groups, masks and blend modes are read the same way as in a PSD.
            Anything that can&apos;t be kept is listed when the file opens.
          </li>
          <li>
            If the TIFF has no layers, or its layer data is damaged, the flattened image opens as a
            single layer on a transparent canvas. The resolution stored in the file (its ppi) is
            kept.
          </li>
        </ol>
        <p>
          Picstea decodes TIFF itself in a background worker. It reads 1, 8 and 16-bit grey, RGB and
          palette images, with or without transparency, in strips or tiles, uncompressed or
          compressed with LZW, ZIP (Deflate), PackBits or JPEG. A 16-bit TIFF opens as 8 bits per
          channel, because Picstea documents are 8-bit RGB. A TIFF with several images opens the
          first one.
        </p>
        <p>
          Some TIFFs are refused with a message that says why: CMYK TIFFs (save them as RGB first),
          floating-point TIFFs, TIFFs with separate colour planes, and BigTIFF files. Camera RAW
          files such as DNG, CR2, NEF and ARW are built on the TIFF format, and Picstea recognises
          them and says they can&apos;t be opened yet, so export the photo as JPEG or TIFF from your
          camera software first.
        </p>
        <h2>How do I turn one page of a PDF into an image?</h2>
        <ol>
          <li>
            Choose <strong>File → Open Image…</strong> and pick the PDF, or drop it on the editor.
          </li>
          <li>
            For a PDF with more than one page, the <strong>Open PDF</strong> dialog appears. Type
            the page number in <strong>Page (of 4)</strong>; the number in brackets is the
            file&apos;s page count.
          </li>
          <li>
            Pick a <strong>Resolution</strong>: 72, 96, 150, 200 or 300 ppi. 150 is the default.
            Under the fields the dialog shows how large page 1 will be in pixels at that resolution,
            for example &quot;Page 1 opens at 1240 × 1754 px&quot; for an A4 page at 150 ppi.
          </li>
          <li>
            Click <strong>OK</strong>. The page opens as a new document with one pixel layer.
          </li>
        </ol>
        <p>
          A one-page PDF skips the dialog and opens at 150 ppi. For the Instagram post, 150 ppi is
          plenty, and you can crop the page to 4:5 with the Crop tool&apos;s <strong>Ratio</strong>{" "}
          menu, then save it with <strong>File → Export As…</strong> (Cmd/Ctrl+Shift+E) as JPEG.
          Choose 300 ppi to zoom into small text or print the page.
        </p>
        <p>
          Text and vector drawings in the PDF become pixels at the resolution you chose, which is
          why that choice matters. If a page would be larger than 12,000 pixels on a side or 36
          megapixels at the chosen resolution, Picstea tells you and asks for a lower one. A PDF
          that is protected with a password has to have the password removed before Picstea can open
          it.
        </p>
        <h2>Where does the PDF reader come from?</h2>
        <p>
          Picstea uses PDF.js, the open-source PDF reader from Mozilla, served from Picstea&apos;s
          own site. It is downloaded only the first time you open a PDF, runs on your device, and is
          kept for offline use after that. It is set up so that it never fetches anything a PDF file
          points to on the internet. The{" "}
          <Link href="/docs/privacy-and-storage">privacy and storage page</Link> explains what the
          browser keeps.
        </p>
        <h2>Can I open a PSB file?</h2>
        <p>
          Yes. PSB is Photoshop&apos;s Large Document Format, the variant of PSD made for very big
          files, and Picstea reads it with the same reader it uses for PSD. Layers, groups, masks,
          editable text, adjustment layers, layer styles and smart objects come through the same
          way. The{" "}
          <Link href="/blog/open-psd-files-with-editable-text-and-adjustments">
            post on opening PSDs with editable text and adjustments
          </Link>{" "}
          goes through what is kept.
        </p>
        <p>
          Picstea documents can be at most 12,000 pixels on a side and 36 megapixels in total, and
          many PSB files are larger than that, because size is the reason people save as PSB. A PSB
          above the limit is refused with a message that names the limit. A PSB that fits opens
          normally. When you export it again, choose <strong>PSD</strong> in{" "}
          <strong>File → Export As…</strong>; Picstea writes PSD and does not write PSB.
        </p>
        <h2>Can I place a TIFF or PDF into another design?</h2>
        <p>
          Yes. <strong>File → Place Image as Layer…</strong> adds a TIFF or a PDF to the open
          document as a pixel layer, and <strong>File → Place Embedded…</strong> adds it as a smart
          object. Pasting a copied file while a document is open places it as a layer too (dropping
          a file always opens it as a new document). Placing and pasting use page 1 of a PDF at 150
          ppi, so to place another page, open that page as its own document first and copy it
          across.
        </p>
        <p>
          So you can open the poster PSB, place the product photo from the TIFF as a smart object,
          and scale it without losing quality, because smart objects are redrawn from their source.
          The <Link href="/blog/smart-objects-explained">smart objects post</Link> covers how that
          works.
        </p>
        <h2>How do I convert TIFF or PDF files to JPEG or PNG in bulk?</h2>
        <p>
          <strong>File → Convert…</strong> turns files into PNG, JPEG or WebP without opening them
          as documents. Pick up to 200 files, choose a format under <strong>Convert to</strong> (and
          a <strong>Quality</strong> for JPEG and WebP), and click <strong>Convert</strong>. One
          file is saved directly; several are saved together as a ZIP. TIFFs are converted from
          their flattened image and PDFs from page 1 at 150 ppi. Nothing is uploaded or kept in the
          browser. The <Link href="/docs/file-formats">file formats documentation</Link> lists every
          format Picstea opens and exports.
        </p>
        <h2>How do GIMP and Photopea handle these formats?</h2>
        <p>
          GIMP has an <strong>Import from PDF</strong> dialog that can bring in several pages at
          once, either as separate images or as layers of one image, with width, height and
          resolution fields that stay linked. If you need every page of a PDF at once, that is
          quicker than opening pages one at a time in Picstea. GIMP is a desktop install; the{" "}
          <Link href="/gimp-alternative">GIMP alternative page</Link> compares the two in more
          detail.
        </p>
        <p>
          Photopea is another browser editor. Its home page lists TIFF and PDF among the formats it
          opens, and its documentation says it does not upload your files. The{" "}
          <Link href="/photopea-alternative">Photopea alternative page</Link> compares it with
          Picstea feature by feature.
        </p>
        <h2>Questions people ask</h2>
        <h3>Why does my TIFF open without its layers?</h3>
        <p>
          Only TIFFs that Photoshop saved with layers carry layer data. Other TIFFs hold one
          flattened image. If a Photoshop TIFF&apos;s layer data is damaged, Picstea opens the
          flattened image instead of failing.
        </p>
        <h3>Can I edit the text in a PDF?</h3>
        <p>
          No. A PDF page opens as a picture, so its text becomes pixels. You can paint over it,
          clone over it or add new text layers on top, but the original words can&apos;t be retyped.
        </p>
        <h3>Can Picstea save a TIFF or a PSB?</h3>
        <p>
          No. Export As saves PNG, JPEG, WebP, SVG, PDF and PSD. A TIFF or PSB you open can be saved
          as a PSD with its layers, or as a flat image.
        </p>
        <h3>Do these files leave my computer?</h3>
        <p>
          No. The TIFF decoder, the PSD reader and PDF.js all run in your browser, and Picstea has
          no server that receives images.
        </p>
        <p>
          <EditorLink>Open Picstea</EditorLink> and drop in a TIFF, a PDF or a PSB to see what it
          keeps.
        </p>
      </>
    ),
  },
  {
    slug: "fix-red-eye-and-flash-photos-online",
    title: "Fix red eye and flash problems in a photo",
    description:
      "Remove red eye, flash dust spots, a colour cast and dark corners from a flash photo in Picstea, with the tools and menu paths to use and what each one can't do.",
    published: "2026-11-16",
    draft: false,
    body: () => (
      <>
        <p>
          To fix red eye in Picstea, pick the <strong>Red Eye</strong> tool (it shares a toolbar
          slot with the healing brushes, shortcut J), set <strong>Pupil size</strong> a little
          larger than the pupil and click or paint over each red pupil. Only strongly red pixels
          change, so the iris and eyelid stay as they were. A flash photo usually has other problems
          too: bright dust specks lit by the flash, an orange or blue cast where flash meets room
          light, and dark corners. Picstea has a tool for each of these, and the photo stays on your
          device the whole time; nothing is uploaded.
        </p>
        <p>
          The example here is a phone photo from a birthday dinner, taken with the flash on: two
          people with red pupils, a few white specks floating in front of the dark wall behind them,
          warm orange light from the ceiling lamps, and a frame that gets darker towards the
          corners.
        </p>
        <h2>Before you start: keep a clean copy</h2>
        <ol>
          <li>
            Open <EditorLink>the Picstea editor</EditorLink> and drop the photo onto it, or choose{" "}
            <strong>File → Open Image…</strong>.
          </li>
          <li>
            Choose <strong>Layer → Duplicate Layer</strong> (Cmd/Ctrl+J). You&apos;ll retouch the
            copy, and you can hide it at any time to compare with the original underneath.
          </li>
        </ol>
        <p>
          The Red Eye tool and the Spot Healing Brush paint on pixel layers. If you click with them
          on a text layer, a shape or a smart object, Picstea says the tool works on pixel layers
          and nothing changes. Do the retouching before you turn anything into a smart object.
        </p>
        <h2>How do I remove red eye?</h2>
        <ol>
          <li>
            Press J to get the healing tool group, then Shift+J until the <strong>Red Eye</strong>{" "}
            icon shows. You can also right-click or hold the healing icon in the toolbar and pick it
            from the flyout.
          </li>
          <li>
            In the options bar, set <strong>Pupil size</strong>. It is the brush diameter in
            document pixels (2 to 500 px, default 30). Zoom in and make it a bit bigger than the red
            area.
          </li>
          <li>
            Set <strong>Darken</strong> (0 to 100%, default 50%). Higher values give a darker pupil.
            Around 50% looks natural on most faces; push it up if the pupils still look grey.
          </li>
          <li>Click on each red pupil, or paint over it if one click doesn&apos;t cover it.</li>
        </ol>
        <p>
          Under the brush, a pixel only changes when its red value is at least 60 and at least 1.5
          times the average of its green and blue. Those pixels lose their red and get darker. Skin
          and lips are usually not red enough to pass that test, so a slightly sloppy stroke
          doesn&apos;t paint the face grey. Each click or stroke is one step in{" "}
          <strong>History</strong>, so Cmd/Ctrl+Z takes back just that eye.
        </p>
        <p>
          The tool only removes red, though. Pets often reflect a flash as green, yellow or white
          eye shine, and the Red Eye tool leaves those colours alone. For a pet, paint the pupil
          with the <strong>Brush</strong> on a new layer in a dark colour, or darken it with{" "}
          <strong>Burn</strong>. Photoshop Elements has a separate <strong>Pet Eye</strong> option
          for this; Picstea does not.
        </p>
        <h2>How do I clean up flash dust specks?</h2>
        <p>
          The flash lights up dust and tiny drops close to the lens, and they show as soft white
          dots on a dark background. Each one is small and sits on plain wall or fabric, the case
          the <strong>Spot Healing Brush</strong> handles best.
        </p>
        <ol>
          <li>
            Press Shift+J until the <strong>Spot Healing Brush</strong> is active (or pick it from
            the healing flyout).
          </li>
          <li>
            Set <strong>Size</strong> slightly larger than a speck and leave{" "}
            <strong>Hardness</strong> around the default 50% so the edge blends.
          </li>
          <li>Click each speck, or drag over a short run of them.</li>
        </ol>
        <p>
          You don&apos;t Alt-click a source first. When you press the mouse button, Picstea looks at
          eight patches around the spot, one and a half brush widths away in each direction, and
          compares each with the ring of pixels right around the speck. The patch whose average
          colour matches that ring best becomes the source, and the healing pass then matches its
          tone to the surroundings. That works well for a speck on a plain wall. Near an edge, such
          as a speck on someone&apos;s shoulder against the wall, a patch from the wrong side can
          win; switch to the <strong>Healing Brush</strong> and Alt-click a clean spot yourself.
          There is no content-aware fill for larger objects yet.
        </p>
        <h2>How do I fix the orange colour cast?</h2>
        <p>
          Choose <strong>Image → Auto Color</strong>. Picstea reads the histogram of the whole
          image, stretches each colour channel, then sets each channel&apos;s midtone so the average
          colour comes out neutral grey. It ignores the darkest and lightest 0.1% of pixels so a few
          specular highlights from the flash don&apos;t throw it off.
        </p>
        <p>
          The result is added as a <strong>Levels</strong> adjustment layer named &quot;Auto
          Color&quot;, so nothing is baked in. If it overcorrects and the faces look cold, lower the
          layer&apos;s opacity in the Layers panel, or select the layer and fine-tune the red, green
          and blue channels in the Properties panel. If the image already uses the full range,
          Picstea tells you so and adds nothing. For a deliberate warm-to-cool shift instead of a
          neutral one, a <strong>Temperature/Tint</strong> adjustment layer from{" "}
          <strong>Layer → New Adjustment Layer</strong> gives you a slider.
        </p>
        <h2>How do I brighten dark corners?</h2>
        <p>
          Phone lenses and small flashes both darken the edges of the frame. The fix is in{" "}
          <strong>Filter → Lens Correction…</strong>, and it is worth applying it as a smart filter
          so you can come back to it.
        </p>
        <ol>
          <li>
            Select the retouched layer and choose{" "}
            <strong>Layer → Smart Object → Convert to Smart Object</strong>.
          </li>
          <li>
            Choose <strong>Filter → Lens Correction…</strong>. Move <strong>Vignette amount</strong>{" "}
            to the right (up to 100) to lighten the corners; values to the left darken them instead.
          </li>
          <li>
            Use <strong>Vignette midpoint</strong> (0 to 100, default 50) to set how far in from the
            edge the correction reaches. Lower values start it closer to the centre.
          </li>
        </ol>
        <p>
          The same dialog has <strong>Remove distortion</strong> for the bulge a wide phone lens
          gives to faces near the edge of the frame, and <strong>Fix red/cyan fringe</strong> and{" "}
          <strong>Fix blue/yellow fringe</strong> for coloured edges along high-contrast lines.
          Because the layer is a smart object, the filter is listed in the Properties panel, where
          you can click its name to change the settings later, hide it or delete it.
        </p>
        <h2>How does this compare with Photoshop Elements?</h2>
        <p>
          Photoshop Elements uses an Eye tool with <strong>Pupil Radius</strong> and{" "}
          <strong>Darken Amount</strong> settings, an Auto Correct button, a Pet Eye check box, and
          an option to fix red eye automatically when photos are imported. Its Spot Healing Brush
          has Proximity Match, Create Texture and Content-Aware types. Picstea&apos;s Red Eye tool
          has the two manual settings only, with no automatic eye detection and no pet mode, and its
          Spot Healing Brush has one mode that picks a nearby patch. Picstea runs in a browser tab
          and needs no install. If you are weighing it against Adobe&apos;s full editor, the{" "}
          <Link href="/photoshop-alternative">Photoshop alternative</Link> page lists what is and
          isn&apos;t there.
        </p>
        <h2>Saving the result</h2>
        <p>
          Choose <strong>File → Export As…</strong> and pick JPEG for sharing the photo. If you want
          to come back to the layers, the Levels adjustment and the smart filter later, also save
          the file with <strong>File → Save Project As…</strong>. The{" "}
          <Link href="/docs/retouching">Retouching</Link> docs cover the other brushes, and{" "}
          <Link href="/docs/smart-objects-and-smart-filters">Smart objects and smart filters</Link>{" "}
          explains how smart filters behave.
        </p>
        <h2>Questions people ask</h2>
        <h3>Does the Red Eye tool find eyes automatically?</h3>
        <p>
          No. You click or paint over each pupil yourself. The tool decides which pixels under the
          brush are red enough to change, but it doesn&apos;t look for faces or eyes.
        </p>
        <h3>Why didn&apos;t the Red Eye tool change my dog&apos;s eyes?</h3>
        <p>
          Animal eye shine is often green, yellow or white, and the tool only changes strongly red
          pixels. Darken the pupil with Burn, or paint it on a new layer with the Brush.
        </p>
        <h3>Can I use these tools on a smart object or a text layer?</h3>
        <p>
          The Red Eye tool and the Spot Healing Brush work on pixel layers only. Rasterize the layer
          first with <strong>Layer → Rasterize Layer</strong>, or do the retouching before you
          convert the photo to a smart object.
        </p>
        <h3>Is the photo uploaded anywhere?</h3>
        <p>
          No. The tools, Auto Color and the filters all run in your browser, and Picstea has no
          server that receives images.
        </p>
        <p>
          <EditorLink>Open Picstea</EditorLink> and drop in a flash photo to try it.
        </p>
      </>
    ),
  },
  {
    slug: "filter-gallery-and-oil-paint-explained",
    title: "Filter Gallery and Oil Paint explained",
    description:
      "What Picstea's Filter Gallery, Oil Paint, Find Edges and Color Halftone filters do, what each setting changes, and how to keep the effect editable.",
    published: "2026-11-17",
    draft: false,
    body: () => (
      <>
        <p>
          To make a photo look painted or drawn in Picstea, open the <strong>Filter</strong> menu.{" "}
          <strong>Filter Gallery…</strong> at the top has eight artistic effects (Cutout, Dry Brush,
          Poster Edges, Watercolor, Ink Outlines, Glowing Edges, Film Grain and Sponge), and{" "}
          <strong>Filter → Stylize → Oil Paint…</strong> turns the picture into brush strokes with a
          little relief lighting. Two more filters help with drawn and printed looks:{" "}
          <strong>Find Edges</strong> for line work and <strong>Color Halftone</strong> for a
          comic-print dot pattern. Every filter runs in your browser, so the photo stays on your
          device and nothing is uploaded.
        </p>
        <p>
          The example below is a holiday photo of a small harbour: boats, coloured house fronts and
          a lot of sky. The goal is a painted version to print as a postcard, plus a pencil-style
          line drawing of the same scene.
        </p>
        <h2>Which layers can you filter?</h2>
        <p>
          Filters work on pixel layers and smart objects. On a text layer, a shape or an adjustment
          layer the filter items are greyed out, so select the photo layer in the Layers panel
          first. If something is selected, only the selection changes, and a feathered edge blends
          the filtered and unfiltered parts.
        </p>
        <p>
          On a pixel layer a filter changes the pixels for good (one undo step). If you want to
          change the effect later, read the section on smart filters before you start.
        </p>
        <h2>What do the Filter Gallery settings do?</h2>
        <p>
          Choose <strong>Filter → Filter Gallery…</strong>. The dialog has an{" "}
          <strong>Effect</strong> menu and three sliders that every effect shares:
        </p>
        <ul>
          <li>
            <strong>Brush size</strong>, 1 to 20 px (default 4): how large the strokes, blur or
            texture are.
          </li>
          <li>
            <strong>Detail</strong>, 0 to 10 (default 5): how much fine structure survives. In
            Cutout and Poster Edges it also sets how many flat colour steps you get.
          </li>
          <li>
            <strong>Intensity</strong>, 0 to 100% (default 50%): how strong the outlines, grain or
            texture are.
          </li>
        </ul>
        <p>
          The sliders don&apos;t all matter for every effect. Cutout and Dry Brush ignore Intensity
          and change with Brush size and Detail only. What each effect does:
        </p>
        <ul>
          <li>
            <strong>Cutout</strong> smooths the photo and cuts it into a few flat colours, like
            shapes cut from coloured paper.
          </li>
          <li>
            <strong>Dry Brush</strong> runs the oil paint routine and then reduces the colours, so
            areas become short, flat dabs.
          </li>
          <li>
            <strong>Poster Edges</strong> reduces the colours and draws dark lines along the edges,
            a poster or comic look.
          </li>
          <li>
            <strong>Watercolor</strong> softens the image into patches and darkens the edges between
            them.
          </li>
          <li>
            <strong>Ink Outlines</strong> keeps the photo&apos;s colours and traces its edges in
            dark ink.
          </li>
          <li>
            <strong>Glowing Edges</strong> turns edges into bright lines and adds a glow when Brush
            size is above 1.
          </li>
          <li>
            <strong>Film Grain</strong> adds grain. Detail lifts the brightest parts of the image.
          </li>
          <li>
            <strong>Sponge</strong> blurs a little and lays a mottled sponge texture over the
            picture.
          </li>
        </ul>
        <p>
          With <strong>Preview</strong> ticked, the canvas shows the result as you move a slider.
          Press <strong>OK</strong> to apply it or <strong>Cancel</strong> to put the layer back.
          For the harbour, Watercolor with Brush size 6 and Detail 4 turns the sky and water into
          soft washes, and the house fronts keep a dark outline.
        </p>
        <h2>How do Oil Paint&apos;s settings work?</h2>
        <p>
          <strong>Filter → Stylize → Oil Paint…</strong> looks at the pixels around each point,
          finds the most common brightness and paints the average colour of those pixels. Areas
          flatten into strokes. Its settings are:
        </p>
        <ul>
          <li>
            <strong>Stylization</strong>, 1 to 20 px (default 4): the radius it looks at. Bigger
            values give broader strokes and less detail.
          </li>
          <li>
            <strong>Cleanliness</strong>, 4 to 64 (default 20): how many brightness levels the
            filter sorts pixels into before it picks the most common one.
          </li>
          <li>
            <strong>Lighting</strong> (on by default): adds relief to the strokes, as if light fell
            across thick paint.
          </li>
          <li>
            <strong>Light angle</strong>, −180° to 180° (default −60°), and <strong>Shine</strong>,
            0 to 10 (default 1.3): where the light comes from and how strong the relief is.
          </li>
        </ul>
        <p>
          On a large photo, a Stylization of 4 can be hard to see at 100% zoom. For a postcard-size
          print of the harbour, 8 to 10 px gives visible strokes. Turn Shine down or untick Lighting
          if the relief looks like embossed plastic.
        </p>
        <h2>How do you turn a photo into a line drawing?</h2>
        <p>
          <strong>Filter → Stylize → Find Edges</strong> has no settings and runs as soon as you
          pick it. It draws the edges of the image as dark lines on white, in the colours of the
          edges. Two ways to use it:
        </p>
        <ol>
          <li>
            For outlines over the photo: duplicate the photo layer (Cmd/Ctrl+J), run Find Edges on
            the copy, then set the copy&apos;s <strong>Blend</strong> to <strong>Multiply</strong>{" "}
            in the Properties panel. White disappears and only the lines darken the photo
            underneath.
          </li>
          <li>
            For a pencil-style sketch: hide the original photo layer, then add{" "}
            <strong>Layer → New Adjustment Layer → Black &amp; White</strong> above the edges layer.
            The coloured lines turn grey, like graphite on paper.
          </li>
        </ol>
        <p>
          A busy photo gives busy lines. If the water&apos;s ripples turn into scribbles, run{" "}
          <strong>Filter → Blur → Gaussian Blur…</strong> with a small radius on the copy first,
          then Find Edges. Fine texture drops out and the boat outlines stay.
        </p>
        <h2>What does Color Halftone do?</h2>
        <p>
          <strong>Filter → Pixelate → Color Halftone…</strong> splits the image into cyan, magenta,
          yellow and black dots on rotated grids, the way printed comics and newspapers look up
          close. <strong>Max. radius</strong> (2 to 127 px, default 8) sets the largest dot. The
          four angle fields (defaults: cyan 108°, magenta 162°, yellow 90°, black 45°) turn each dot
          grid. For a pop-art version of the harbour, try a radius of 12 on a copy and lower that
          layer&apos;s opacity so some of the photo shows through.
        </p>
        <h2>How do you keep a filter editable?</h2>
        <p>
          Choose <strong>Layer → Smart Object → Convert to Smart Object</strong> before you filter.
          Every filter you then pick from the Filter menu becomes a smart filter. It shows up in the
          Properties panel under <strong>Smart filters</strong>, where you can hide it with its
          checkbox, click its name to change the settings, move it up or down, or delete it. Filters
          apply bottom to top in the order listed, so a Watercolor followed by Film Grain looks
          different from the reverse.
        </p>
        <p>
          This is also how you combine Filter Gallery effects. Each run of the gallery applies one
          effect, so add it twice as two smart filters, for example Watercolor and then Ink
          Outlines, and reorder them until you like the result.
        </p>
        <p>
          <strong>Filter → Last Filter</strong> (Cmd/Ctrl+Alt+F) repeats the last filter with the
          same settings. It works on pixel layers. The{" "}
          <Link href="/docs/smart-objects-and-smart-filters">Smart objects and smart filters</Link>{" "}
          docs explain the rest of the smart object workflow.
        </p>
        <h2>How does this compare with Photoshop?</h2>
        <p>
          Photoshop&apos;s Filter Gallery has six categories (Artistic, Brush Strokes, Distort,
          Sketch, Stylize and Texture) with many more effects and an applied filters list in the
          dialog for stacking them. Picstea&apos;s gallery has eight effects with the same three
          sliders, one effect per run; you stack them with smart filters as described above.
          Photoshop&apos;s Oil Paint, at <strong>Filter → Stylize → Oil Paint</strong> as in
          Picstea, has two brush settings that Picstea doesn&apos;t, Scale and Bristle Detail, and
          most of its sliders run from 0 to 10. Picstea runs in a browser tab with no install or
          account. The <Link href="/photoshop-alternative">Photoshop alternative</Link> page lists
          what else is and isn&apos;t there.
        </p>
        <h2>Saving the painted version</h2>
        <p>
          Choose <strong>File → Export As…</strong> and pick JPEG for printing or sharing. To come
          back to the smart filters later, also save the file with{" "}
          <strong>File → Save Project As…</strong>. The <Link href="/docs/filters">Filters</Link>{" "}
          docs list every filter in the menu, and the{" "}
          <Link href="/photo-filters">photo filters</Link> page sums up the quick looks.
        </p>
        <h2>Questions people ask</h2>
        <h3>Can I stack several Filter Gallery effects at once?</h3>
        <p>
          Not inside one dialog. Convert the layer to a smart object, then run the Filter Gallery
          once per effect. Each run becomes its own smart filter, and you can reorder or hide them.
        </p>
        <h3>Why is the Filter menu greyed out?</h3>
        <p>
          The active layer is text, a shape, an adjustment layer or locked. Select a pixel layer or
          a smart object, or rasterize the layer with <strong>Layer → Rasterize Layer</strong>.
        </p>
        <h3>Does Oil Paint look the same as in Photoshop?</h3>
        <p>
          No. Picstea&apos;s version has Stylization, Cleanliness, Lighting, Light angle and Shine.
          It doesn&apos;t have Scale or Bristle Detail, so you won&apos;t get bristle grooves in the
          strokes.
        </p>

        <p>
          <EditorLink>Open Picstea</EditorLink> and try the Filter Gallery on one of your own
          photos.
        </p>
      </>
    ),
  },
  {
    slug: "make-a-sticker-with-a-white-border",
    title: "Make a sticker with a white border",
    description:
      "Cut a subject out of a photo, give it a thick white sticker border, add a banner label and export a transparent PNG in Picstea, with menu paths for each step.",
    published: "2026-11-18",
    draft: false,
    body: () => (
      <>
        <p>
          To turn a photo into a sticker in Picstea, erase the background so only the subject is
          left, give the cut-out layer a <strong>Stroke</strong> layer style set to{" "}
          <strong>Outside</strong> in white, then choose <strong>Image → Trim…</strong> and export a
          PNG. The white edge follows the outline of the subject with rounded corners, like a
          die-cut printed sticker. The photo stays on your device the whole time; nothing is
          uploaded.
        </p>
        <p>
          The example here is a phone photo of a dog sitting on a lawn. The goal is a sticker for a
          chat app and a print file for a sheet of vinyl stickers: the dog with a thick white
          border, a small banner across the bottom that says &quot;GOOD BOY&quot;, and a thin grey
          cut line for the printer.
        </p>
        <h2>How do I cut the subject out of the photo?</h2>
        <p>
          Open <EditorLink>the Picstea editor</EditorLink> and drop the photo onto it, or choose{" "}
          <strong>File → Open Image…</strong>. Grass is a lot of similar greens, which suits the{" "}
          <strong>Magic Eraser</strong>.
        </p>
        <ol>
          <li>
            Press E for the eraser group, then Shift+E until the <strong>Magic Eraser</strong> is
            active. You can also right-click or hold the eraser icon and pick it from the flyout.
          </li>
          <li>
            In the options bar, set <strong>Tolerance</strong> (0 to 255). Start around 40 and raise
            it if clicks leave patches of grass. Leave <strong>Contiguous</strong> ticked so a click
            only removes connected pixels and doesn&apos;t eat into a green collar.
          </li>
          <li>Click the grass. Each click is one undo step, so Cmd/Ctrl+Z takes back a bad one.</li>
          <li>
            For the edge of the fur, switch to the <strong>Background Eraser</strong> (also in the
            eraser group). It erases colours like the one under the first dab of each stroke, so
            start the stroke on the grass and paint along the edge. Its <strong>Tolerance</strong>{" "}
            works the same way.
          </li>
        </ol>
        <p>
          Both tools work on pixel layers. If the background is a busy room, not a lawn, the{" "}
          <Link href="/make-background-transparent">make a background transparent</Link> guide walks
          through the selection tools instead. Picstea has no automatic AI background remover, so
          the cut-out is done by hand.
        </p>
        <h2>Why add canvas before the border?</h2>
        <p>
          The border grows outward from the subject. If the dog&apos;s ears touch the top of the
          photo, the border there would fall off the canvas. Choose{" "}
          <strong>Image → Canvas Size…</strong>, tick{" "}
          <strong>Relative (add to the current size)</strong>, and type the same amount into{" "}
          <strong>Width (px)</strong> and <strong>Height (px)</strong>, for example 200 each, with
          the centre anchor. The layer isn&apos;t scaled; the new area around it is transparent.
        </p>
        <h2>How do I add the white sticker border?</h2>
        <ol>
          <li>
            Double-click the dog layer in the Layers panel, or choose{" "}
            <strong>Layer → Layer Style → Blending Options…</strong>.
          </li>
          <li>
            Turn on <strong>Stroke</strong> in the list on the left.
          </li>
          <li>
            Set <strong>Position</strong> to <strong>Outside</strong>, <strong>Fill Type</strong> to{" "}
            <strong>Color</strong>, and pick white. The default colour is black and the default size
            is 3 px.
          </li>
          <li>
            Raise <strong>Size</strong>. It goes up to 250 px. On a 3,000 px wide photo, 40 to 60 px
            reads as a proper sticker edge.
          </li>
        </ol>
        <p>
          Picstea builds the outside stroke by drawing the layer&apos;s silhouette many times at
          points on circles around each pixel, so sharp tips like ear points get a rounded white
          edge. The style stays live, so if you erase more stray grass later the border follows. If
          you want a second outline, such as a thin black line outside the white one, press the{" "}
          <strong>+</strong> next to Stroke to add another copy (up to 10).
        </p>
        <p>
          A soft shadow under the sticker helps it stand out on a white chat background. Turn on{" "}
          <strong>Drop Shadow</strong> in the same dialog and lower its <strong>Distance</strong>{" "}
          and <strong>Size</strong> to a few pixels.
        </p>
        <h2>How do I reuse the border on the next sticker?</h2>
        <p>
          Before you press <strong>OK</strong>, click <strong>New Style…</strong> at the bottom of
          the dialog, name it (for example &quot;Sticker 50 px&quot;) and click{" "}
          <strong>Save style</strong>. The next time you make a sticker, open the Layer Style dialog
          on the new cut-out, go to <strong>Styles</strong> and click the saved card. You can keep
          up to 200 saved styles. They are stored in this browser only, so they won&apos;t appear on
          another computer or after you clear site data.
        </p>
        <h2>How do I add a banner label?</h2>
        <ol>
          <li>
            Press U for the shape tools and pick <strong>Custom Shape</strong> in the options bar
            (or Shift+U until it is active).
          </li>
          <li>
            In the <strong>Shape</strong> menu, choose <strong>Banner</strong>. The list has 17
            built-in shapes, including Speech bubble, Heart, Star, Tag and Location pin.
          </li>
          <li>
            Set the <strong>Fill</strong> colour, untick <strong>Stroke</strong> if you don&apos;t
            want an outline, and drag across the bottom of the dog. Hold Alt to draw from the
            centre.
          </li>
          <li>
            Press T for the Text tool, click on the banner and type &quot;GOOD BOY&quot;. Pick a
            bold font in the options bar and centre it on the banner with the Move tool.
          </li>
        </ol>
        <p>
          The banner is an editable path shape layer, so the Direct Selection tool can reshape its
          anchors later. To make the white border run around the banner as well, select the dog,
          banner and text layers, choose <strong>Layer → Group</strong>, and put the Stroke style on
          the group instead of the dog layer.
        </p>
        <h2>How do I make a cut line for printing?</h2>
        <p>
          Many sticker printers ask for a thin line where the blade should cut. This step uses{" "}
          <strong>Edit → Stroke…</strong>, which paints a band of colour along the edge of a
          selection on a pixel layer.
        </p>
        <ol>
          <li>
            Choose <strong>Image → Duplicate</strong> to work on a copy of the document. If you
            added a drop shadow, turn it off in the copy so the line doesn&apos;t follow the shadow.
          </li>
          <li>
            Choose <strong>Layer → Flatten Image</strong>. The white border is now part of one pixel
            layer.
          </li>
          <li>
            Choose <strong>Select → Select Pixels</strong>, or Cmd/Ctrl-click the layer&apos;s
            thumbnail. This selects everything that isn&apos;t transparent, border included. On a
            layer that still has its style, Select Pixels ignores the effects, which is why the
            flatten comes first.
          </li>
          <li>
            Choose <strong>Layer → New → New Layer</strong> (Cmd/Ctrl+Shift+N).
          </li>
          <li>
            Choose <strong>Edit → Stroke…</strong>, set <strong>Width (px)</strong> to 2,{" "}
            <strong>Location</strong> to <strong>Inside</strong>, and pick a grey. Click{" "}
            <strong>OK</strong>, then deselect with Cmd/Ctrl+D.
          </li>
        </ol>
        <p>
          Edit → Stroke takes widths from 1 to 250 px. It grows and shrinks the selection with a
          square radius, so at a wide setting the outline keeps square corners at sharp tips. That
          is why the thick white border uses the Stroke layer style and Edit → Stroke only draws
          this thin line. Export the print file from this copy and the chat version from the
          original.
        </p>
        <h2>How do I export the sticker?</h2>
        <p>
          Choose <strong>Image → Trim…</strong> with <strong>Transparent pixels</strong> selected.
          Trim reads the finished image, border and shadow included, so it crops to the edge of the
          sticker without cutting into the stroke. Then choose <strong>File → Export As…</strong>{" "}
          (Cmd/Ctrl+Shift+E) and pick <strong>PNG</strong>, which keeps the transparency. JPEG would
          fill the transparent area with white. Save the layered version with{" "}
          <strong>File → Save Project As…</strong> so you can change the banner text later.
        </p>
        <h2>How does this compare with Canva?</h2>
        <p>
          Canva&apos;s photo borders page describes the same look with <strong>Edit Image</strong> →{" "}
          <strong>Shadows</strong> → <strong>Glow</strong>, with Blur set to 0 and Transparency to
          100 for a solid edge. You upload the photo to Canva first. Canva lists its Background
          Remover and downloading designs with a transparent background as Canva Pro features. In
          Picstea the cut-out is manual, with no one-click remover, and the transparent PNG export
          is free. The <Link href="/canva-alternative">Canva alternative</Link> page compares the
          two in more detail, and the{" "}
          <Link href="/docs/layers-groups-and-masks">Layers, groups and masks</Link> docs cover
          layer styles.
        </p>
        <h2>Questions people ask</h2>
        <h3>Why does my border get cut off at one side?</h3>
        <p>
          The subject touches the edge of the canvas. Add room with Image → Canvas Size… and the
          Relative option before you add the stroke.
        </p>
        <h3>Can I make the border a gradient?</h3>
        <p>
          Yes. In the Stroke settings, set Fill Type to Gradient and edit the stops. Style, angle
          and scale options are there too.
        </p>
        <h3>Will the sticker border survive in a PSD?</h3>
        <p>
          Picstea writes layer styles to PSD as editable Photoshop data. Pattern styles and smart
          filters are the exceptions and get rasterised, with a notice.
        </p>
        <h3>Is the photo uploaded anywhere?</h3>
        <p>
          No. The erasers, layer styles and exports run in your browser, and Picstea has no server
          that receives images.
        </p>
        <p>
          <EditorLink>Open Picstea</EditorLink> and drop in a photo to make your first sticker.
        </p>
      </>
    ),
  },
  {
    slug: "export-a-logo-as-svg-picstea-vs-canva",
    title: "Export a logo as SVG: Picstea vs Canva",
    description:
      "Build a simple logo from shapes and text and export it as an SVG in Picstea for free, what stays vector, and how this compares with SVG downloads in Canva.",
    published: "2026-11-19",
    draft: false,
    body: () => (
      <>
        <p>
          To get a logo out of Picstea as an SVG, build it from shape layers and text layers, then
          choose <strong>File → Export As…</strong>, pick <strong>SVG</strong> and press{" "}
          <strong>Export</strong>. Shapes and text are written as real SVG elements, so the file
          stays sharp at any size and opens as editable vectors in tools like Inkscape or
          Illustrator. Picstea doesn&apos;t charge for it, while Canva keeps SVG downloads for its
          paid plans. The file is built in your browser, and the logo is never uploaded.
        </p>
        <p>
          The example below is a badge logo for a small coffee cart called &quot;Night Owl
          Coffee&quot;: a dark circle, a star, the name in two lines of text. It needs to go on a
          website header (SVG), a sticker sheet and a social profile picture (PNG).
        </p>
        <h2>How do I set up a canvas for a logo?</h2>
        <p>
          Open <EditorLink>the Picstea editor</EditorLink> and choose <strong>File → New…</strong>{" "}
          (Cmd/Ctrl+Alt+N). The dialog has a preset list grouped by category; the{" "}
          <strong>Icons</strong> category goes from Icon 16 up to Icon 4096 in square pixel sizes.
          Pick <strong>Icon 1024</strong>. An SVG scales anyway, but this size becomes the
          file&apos;s <code>viewBox</code> and the size of any PNG you export later.
        </p>
        <p>
          Set <strong>Background</strong> to <strong>Transparent</strong>. With{" "}
          <strong>White</strong>, <strong>Black</strong> or a custom <strong>Colour…</strong>,
          Picstea adds a locked fill layer called Background, which exports as a full-size{" "}
          <code>&lt;rect&gt;</code>. A logo usually has to sit on whatever colour the website uses,
          so it&apos;s easier without one.
        </p>
        <h2>Which shapes stay vector in the SVG?</h2>
        <p>
          Press U for the shape tool. The options bar has five kinds: <strong>Rectangle</strong>,{" "}
          <strong>Ellipse</strong>, <strong>Polygon</strong>, <strong>Line</strong> and{" "}
          <strong>Custom Shape</strong>. Every one of them is a shape layer, and every shape layer
          is exported as an SVG element:
        </p>
        <ul>
          <li>
            Rectangles become <code>&lt;rect&gt;</code>, with rounded corners kept from the{" "}
            <strong>Radius</strong> option.
          </li>
          <li>
            Ellipses become <code>&lt;ellipse&gt;</code> and lines become <code>&lt;line&gt;</code>.
          </li>
          <li>
            Polygons, stars, custom shapes and anything drawn with the Pen tool in Shape mode become
            a <code>&lt;path&gt;</code>.
          </li>
        </ul>
        <p>
          For the badge, choose <strong>Ellipse</strong>, set <strong>Fill</strong> to a dark navy
          and turn off <strong>Stroke</strong>, then Shift-drag a circle that fills most of the
          canvas. For the star, switch to <strong>Polygon</strong>, set <strong>Sides</strong> to 5
          and <strong>Star</strong> to about 50% (the indent goes from 0 to 95%), and draw it in a
          warm yellow above where the text will go. If you want something ready-made, the{" "}
          <strong>Custom Shape</strong> list has 17 built-ins, including a star, heart, banner,
          speech bubble, pin and lightning bolt. The{" "}
          <Link href="/blog/how-to-use-the-pen-tool">Pen tool post</Link> covers drawing your own
          outline when none of those fit.
        </p>
        <p>
          To centre a piece, select that one layer and choose{" "}
          <strong>Layer → Align → Align Horizontal Centers</strong>; a single layer aligns to the
          canvas. With several layers selected, the same command lines them up with each other.
          Position, rotation and scale are written as a <code>transform</code> on each element, so
          nothing is resampled.
        </p>
        <h2>How does text come out in an SVG?</h2>
        <p>
          Press T, click on the canvas and type &quot;NIGHT OWL&quot;, then add a second text layer
          for &quot;COFFEE&quot;. Picstea writes each line of text as a <code>&lt;text&gt;</code>{" "}
          element and each styled run as a <code>&lt;tspan&gt;</code>, with the font family, size,
          weight, italic, letter spacing and colour. Paragraph text boxes are clipped to their box
          if the text overflows. The words stay selectable and editable in the SVG.
        </p>
        <p>
          Fonts need some thought, because the SVG names the font without including the font file.
          On a computer that has the font, or a web page that loads it, the logo looks right;
          anywhere else the text falls back to another typeface. This matters most if you used a
          font you uploaded or one from your own computer (see{" "}
          <Link href="/blog/paragraph-text-and-custom-fonts">paragraph text and custom fonts</Link>
          ). Picstea can&apos;t convert text to outlines yet. If the exact letter shapes must
          survive everywhere, choose <strong>Layer → Rasterize Layer</strong> on the text before
          exporting; the text then goes into the SVG as an embedded PNG of that layer, which looks
          right everywhere but no longer scales without losing sharpness.
        </p>
        <h2>What turns into an image inside the SVG?</h2>
        <p>
          SVG export is per layer. A shape, text or fill layer is written as a vector element only
          when it has none of the things plain SVG can&apos;t reproduce the same way. These make a
          layer go in as an embedded PNG of just that layer:
        </p>
        <ul>
          <li>an enabled layer mask or vector mask,</li>
          <li>any active layer style (drop shadow, stroke, glow, overlay and so on),</li>
          <li>a Fill opacity below 100%,</li>
          <li>being a pixel layer or a smart object in the first place.</li>
        </ul>
        <p>
          Groups become <code>&lt;g&gt;</code> elements when they have no mask or style, and layer
          opacity, hidden layers and blend modes carry over as SVG attributes. Two things flatten
          the whole file into a single image: a visible adjustment layer, or a visible clipping
          mask, since both depend on the layers underneath. Picstea tells you when that happens with
          the note &quot;Adjustment layers can&apos;t be expressed in SVG, so the image was
          flattened.&quot;
        </p>
        <p>
          So if the badge&apos;s star gets a soft drop shadow, the star goes into the SVG as an
          image. Leave effects off the SVG version and the whole logo stays vector.
        </p>
        <h2>How do I export the SVG and a PNG?</h2>
        <ol>
          <li>
            Choose <strong>File → Export As…</strong> (Cmd/Ctrl+Shift+E).
          </li>
          <li>
            Under <strong>Format</strong>, pick <strong>SVG</strong>. The dialog shows the file name
            and size, and the note &quot;Shapes and text stay vectors; other layers are embedded as
            images.&quot;
          </li>
          <li>
            Press <strong>Export</strong>. Browsers with the File System Access API show a save
            dialog; others download the file.
          </li>
          <li>
            Open <strong>File → Export As…</strong> again and pick <strong>PNG</strong> for the
            sticker sheet and the profile picture. PNG keeps the transparent background.
          </li>
        </ol>
        <p>
          Each element in the SVG carries its layer name in a <code>data-name</code> attribute, and
          the document name goes into the <code>&lt;title&gt;</code>, which helps when you open the
          file in a code editor. Keep a <strong>File → Save Project As…</strong> copy too; the{" "}
          <code>.picstea</code> file keeps every layer editable for the next version of the logo.
          The <Link href="/docs/file-formats">file formats docs</Link> list what every export format
          keeps.
        </p>
        <h2>How does this compare with Canva?</h2>
        <p>
          Canva&apos;s help centre lists SVG as a download type that supports transparency and keeps
          quality at any size, and you reach it through <strong>Share → Download</strong> and the
          file type list. It also says that transparent PNG and SVG downloads are available on Canva
          Pro, Canva for Teams, Canva for Education and Canva for Nonprofits. On the free plan you
          can still download JPG and PNG, without the transparent background.
        </p>
        <p>
          If you want to start from a template or work on a design with a team, Canva is the better
          fit. In Picstea you build the logo from shapes and text yourself, the SVG and transparent
          PNG exports are free without an account, and you can tell from the layers which parts will
          stay vector. The <Link href="/canva-alternative">Picstea vs Canva page</Link> compares the
          two more broadly.
        </p>
        <h2>Questions people ask</h2>
        <h3>Can Picstea turn a PNG logo into a vector SVG?</h3>
        <p>
          Not automatically. Exporting an opened PNG as SVG gives you an SVG with the PNG embedded
          inside it, no sharper than the original. For a flat one-colour logo there is a manual
          route: select it with the Magic Wand, choose{" "}
          <strong>Select → Make Work Path from Selection…</strong>, then press{" "}
          <strong>Shape</strong> in the Pen tool&apos;s options bar to turn the path into a shape
          layer. Otherwise, redraw the logo with shapes, the Pen tool and text.
        </p>
        <h3>Can I open an SVG in Picstea and edit the shapes?</h3>
        <p>
          Not as shapes. SVG files open as pixels, drawn safely through the browser without running
          any scripts in the file. Edit the original Picstea project and export again instead.
        </p>
        <h3>Will the SVG look the same on every website?</h3>
        <p>
          Shapes will. Text depends on the font being available where the SVG is shown. Rasterize
          the text layers first if the letters must match everywhere.
        </p>
        <h3>Is the SVG export free?</h3>
        <p>Yes. Every export format in Picstea is free and needs no account.</p>
        <p>
          <EditorLink>Open Picstea</EditorLink> and draw your logo with the shape tool.
        </p>
      </>
    ),
  },
  {
    slug: "turn-a-photo-into-a-stencil-with-threshold",
    title: "Turn a photo into a stencil with Threshold",
    description:
      "Make a black-and-white stencil from a photo with Threshold and Posterize adjustment layers, select it with Color Range and trace it into an SVG in Picstea.",
    published: "2026-11-20",
    draft: false,
    body: () => (
      <>
        <p>
          To turn a photo into a stencil in Picstea, add a <strong>Threshold</strong> adjustment
          layer from <strong>Layer → New Adjustment Layer → Threshold…</strong> and move its{" "}
          <strong>Level</strong> slider until the subject reads as clean black shapes on white.
          Export that as a PNG if you only need to print it. If you need a vector file for a cutting
          machine, select the black with <strong>Select → Color Range…</strong>, trace the selection
          with <strong>Select → Make Work Path from Selection…</strong>, turn the path into a shape
          layer and export an SVG. Everything runs in your browser, and the photo is never uploaded.
        </p>
        <p>
          The example here is a side-on photo of a dog that should end up spray-painted on a tote
          bag. The stencil gets cut from a sheet of vinyl, so the cutter needs an SVG with one solid
          shape. Later in the post the same photo becomes a three-tone poster with Posterize.
        </p>
        <h2>How does Threshold turn a photo into black and white?</h2>
        <p>
          Open the photo in <EditorLink>the Picstea editor</EditorLink>. Threshold works out the
          brightness (luminance) of every pixel and makes it pure white if it&apos;s at or above the{" "}
          <strong>Level</strong> value, and pure black if it&apos;s below. There are no greys left
          afterwards, which is what a one-layer stencil needs. Level runs from 0 to 255 and starts
          at 128.
        </p>
        <p>
          Choose <strong>Layer → New Adjustment Layer → Threshold…</strong>. The same list sits
          under <strong>Image → Adjustments</strong>, and both add an adjustment layer above the
          active layer, so the photo&apos;s pixels stay as they are. Select the Threshold layer and
          drag <strong>Level</strong> in the Properties panel while you watch the canvas:
        </p>
        <ul>
          <li>
            Lower values make more of the image white, so thin details in bright areas vanish.
          </li>
          <li>
            Higher values turn more of it black, which fills in shadows and can join the subject to
            the background.
          </li>
        </ul>
        <p>
          You don&apos;t need a Black &amp; White layer underneath, since Threshold measures
          brightness itself. Toggle the Threshold layer&apos;s eye icon to compare with the photo.
        </p>
        <h2>How do I get rid of specks and noise first?</h2>
        <p>
          Grain, fur and small highlights turn into hundreds of tiny dots at the threshold, and a
          cutter will try to cut every one of them. Smooth the photo before the threshold step:
          select the photo layer (not the adjustment layer) and run{" "}
          <strong>Filter → Noise → Median</strong>. Its <strong>Radius</strong> goes from 1 to 100
          px; a radius of a few pixels removes most specks.{" "}
          <strong>Filter → Blur → Gaussian Blur</strong> works too and gives softer, rounder shapes.
        </p>
        <p>
          Filters change pixels directly on a pixel layer. To keep the original, choose{" "}
          <strong>Layer → Smart Object → Convert to Smart Object</strong> first; the filter then
          becomes a smart filter you can edit or hide later. The{" "}
          <Link href="/docs/filters">filters docs</Link> cover both cases.
        </p>
        <h2>How do I select only the black parts?</h2>
        <p>
          Choose <strong>Select → Color Range…</strong>. The dialog has a <strong>Colour</strong>{" "}
          field that starts at your foreground colour, which is black unless you changed it (press D
          to reset the colours). It also has a <strong>Fuzziness</strong> slider from 0 to 255
          (default 40) and a <strong>Sample all layers</strong> checkbox that is on by default.
          Leave it on. Color Range then reads the image as you see it, with the Threshold layer
          applied, so black means the stencil.
        </p>
        <p>
          The canvas previews the selection while you move the slider, and the dialog reports the
          size of the selected area or &quot;Nothing matches&quot;. Since the picture now has only
          two colours, the default Fuzziness picks up the black cleanly. Press <strong>OK</strong>.
        </p>
        <p>
          If you want the white parts instead, for example to cut the inverse stencil, choose{" "}
          <strong>Select → Inverse</strong> (Cmd/Ctrl+Shift+I). The{" "}
          <Link href="/docs/selections">selections docs</Link> list the other ways to change a
          selection.
        </p>
        <h2>How do I turn the selection into a vector shape?</h2>
        <ol>
          <li>
            Choose <strong>Select → Make Work Path from Selection…</strong>. Enter a{" "}
            <strong>Tolerance (px)</strong> between 0.5 and 10; it starts at 1. Lower numbers follow
            the pixel edges more closely, higher numbers give smoother outlines with fewer anchor
            points. Press <strong>Make Work Path</strong>.
          </li>
          <li>
            Press U to pick the shape tool and set its <strong>Fill</strong> colour in the options
            bar. The new shape takes the shape tool&apos;s fill and stroke settings; black is the
            obvious choice for a stencil.
          </li>
          <li>
            Press P for the Pen tool. Its options bar has a work path group with{" "}
            <strong>Selection</strong>, <strong>Mask</strong>, <strong>Shape</strong> and{" "}
            <strong>Delete Path</strong>. Press <strong>Shape</strong>. Picstea adds a shape layer
            built from the traced path.
          </li>
        </ol>
        <p>
          The trace closes every outline and keeps holes, so the white of the dog&apos;s eye comes
          out as a hole in the black shape. A path can have at most 64 separate outlines (holes
          included) and 4,096 anchors. Past that, Picstea says &quot;The selection is too detailed
          for a path. Try a larger tolerance.&quot; A larger tolerance cuts anchors; for too many
          outlines, smooth the photo more so the specks disappear.
        </p>
        <p>
          Fix individual points with the Direct Selection tool if you need to. The{" "}
          <Link href="/docs/paths-and-the-pen-tool">paths and Pen tool docs</Link> explain anchors,
          handles and the one work path each document keeps.
        </p>
        <h2>How do I export the stencil as an SVG?</h2>
        <p>
          Picstea&apos;s SVG export writes shape layers as <code>&lt;path&gt;</code> elements, but a
          visible adjustment layer makes it flatten the whole file into one image. Hidden layers are
          still written into the file, just set to not display, so a hidden photo would make the SVG
          large. Make a copy for the cutter instead:
        </p>
        <ol>
          <li>
            Choose <strong>Image → Duplicate</strong>. A copy opens in a new tab, with
            &quot;copy&quot; added to its name.
          </li>
          <li>
            In the copy, delete the Threshold layer and the photo, leaving only the shape layer.
          </li>
          <li>
            Choose <strong>File → Export As…</strong> (Cmd/Ctrl+Shift+E), pick <strong>SVG</strong>{" "}
            and press <strong>Export</strong>.
          </li>
        </ol>
        <p>
          The original document keeps the photo and both layers, so you can change the Level and
          trace again. For a printed stencil you can skip the tracing and export the thresholded
          image as a PNG. The <Link href="/docs/file-formats">file formats docs</Link> list what
          each format keeps.
        </p>
        <h2>Can I make a stencil with more than two tones?</h2>
        <p>
          Yes, with Posterize. Spray stencils and screen prints often use two or three layers, a
          dark one and a mid-grey one, cut separately. In the original document, hide the Threshold
          layer, then add <strong>Layer → New Adjustment Layer → Black &amp; White…</strong> and
          above it <strong>Layer → New Adjustment Layer → Posterize…</strong>. Posterize reduces
          each colour channel to a set number of evenly spaced tones; its <strong>Levels</strong>{" "}
          slider goes from 2 to 255 and starts at 4. The Black &amp; White layer underneath matters
          here, because Posterize on a colour photo gives you posterized colours, not greys.
        </p>
        <p>
          Set Levels to 3 and the photo is reduced to black, a mid grey (#808080) and white. Then
          repeat the selection steps once per tone: open <strong>Select → Color Range…</strong>, set{" "}
          <strong>Colour</strong> to <code>#000000</code> for the dark layer or <code>#808080</code>{" "}
          for the grey, lower <strong>Fuzziness</strong> to around 20 so the neighbouring tone
          isn&apos;t picked up, make a work path and press <strong>Shape</strong>. Each tone becomes
          its own shape layer, and you can give them different fills to check how the print will
          look.
        </p>
        <h2>How does this compare with Photoshop and Inkscape?</h2>
        <p>
          Photoshop has a Threshold adjustment, Color Range and a Make Work Path command whose
          tolerance also runs from 0.5 to 10 pixels. Inkscape, a free vector editor, traces an
          imported image directly with <strong>Path → Trace Bitmap</strong> (Shift+Alt+B); its
          Brightness cutoff mode does the threshold and the trace in one step. In Picstea you set
          the threshold on the photo first and trace afterwards. The{" "}
          <Link href="/photoshop-alternative">Picstea vs Photoshop page</Link> compares the two
          editors more broadly.
        </p>
        <h2>Questions people ask</h2>
        <h3>Does Threshold change my original photo?</h3>
        <p>
          No. Both menu paths add an adjustment layer. Hide or delete it and the photo is back as it
          was.
        </p>
        <h3>Why did my SVG come out as one big image?</h3>
        <p>
          A visible adjustment layer or clipping mask makes Picstea flatten the SVG. Picstea shows
          the note &quot;Adjustment layers can&apos;t be expressed in SVG, so the image was
          flattened.&quot; Delete those layers in a duplicate and export again.
        </p>
        <h3>Can Picstea trace a photo automatically?</h3>
        <p>
          Not in one click. The route is Threshold or Posterize, Color Range, Make Work Path from
          Selection and the Pen tool&apos;s <strong>Shape</strong> button, as above. It works best
          on simple, high-contrast shapes.
        </p>
        <h3>What tolerance should I use for a vinyl cutter?</h3>
        <p>
          Start at 2 or 3. The default of 1 follows pixel edges closely and gives many anchors.
          Check the outline at 100% zoom and trace again if the curves look jagged.
        </p>
        <p>
          <EditorLink>Open Picstea</EditorLink> and add a Threshold layer to your photo.
        </p>
      </>
    ),
  },
  {
    slug: "distort-filters-polar-coordinates-twirl-and-more",
    title: "Distort filters: Polar Coordinates, Twirl and more",
    description:
      "Turn a panorama into a tiny planet with Polar Coordinates, and learn what Twirl, Spherize, Pinch, Wave, ZigZag and Picstea's other Distort filters do.",
    published: "2026-11-21",
    draft: false,
    body: () => (
      <>
        <p>
          The Distort filters in Picstea move pixels around without changing their colours. You find
          them under <strong>Filter → Distort</strong>: Displace, Kaleidoscope, Pinch, Polar
          Coordinates, Ripple, Shear, Spherize, Twirl, Wave, ZigZag and Dents. The most useful one
          for photos is <strong>Polar Coordinates</strong>, which bends a wide panorama into a round
          &quot;tiny planet&quot;. Twirl, Pinch and Spherize swirl, squeeze or bulge the middle of a
          layer, and Ripple, Wave and ZigZag add water-like waves. Each opens a dialog with a live
          preview, and the photo stays in your browser the whole time. Nothing is uploaded.
        </p>
        <p>
          The example here is a beach panorama, about three times wider than it is tall, with sand
          along the bottom and sky above. It ends up as a small round planet with the sand in the
          middle. The rest of the post covers the other filters in the submenu.
        </p>
        <h2>How do I make a tiny planet from a panorama?</h2>
        <p>
          A tiny planet is the panorama wrapped around a circle: the bottom edge of the photo
          becomes the centre and the top edge becomes the outside. Polar Coordinates does that
          wrapping, but it works on the layer&apos;s own pixel grid, so the layer has to be square
          first. Here are the steps in <EditorLink>the Picstea editor</EditorLink>:
        </p>
        <ol>
          <li>
            Open the panorama and choose <strong>Image → Image Size…</strong>. Untick{" "}
            <strong>Constrain proportions</strong> and set <strong>Width (px)</strong> and{" "}
            <strong>Height (px)</strong> to the same number, for example 2000 × 2000. The beach
            looks squashed now, which is what you want.
          </li>
          <li>
            Choose <strong>Image → Image Rotation → 180°</strong>, so the sand is at the top of the
            canvas.
          </li>
          <li>
            Image Size and Image Rotation only change how the layer is drawn, so bake the result
            into a new layer: <strong>Select → All</strong> (Cmd/Ctrl+A), then{" "}
            <strong>Edit → Copy Merged</strong> and <strong>Edit → Paste</strong> (Cmd/Ctrl+V). The
            pasted layer has square pixels.
          </li>
          <li>
            With the pasted layer active, choose{" "}
            <strong>Filter → Distort → Polar Coordinates…</strong>, leave <strong>Mode</strong> on{" "}
            <strong>Rectangular to polar</strong> and press <strong>OK</strong>.
          </li>
        </ol>
        <p>
          The top row of the layer (the sand, after the rotation) collapses into the centre, and
          each row below it becomes a slightly larger ring, out to a circle that touches the edges
          of the square. The left and right ends of the panorama meet at the 12 o&apos;clock
          position. If the two ends of your photo don&apos;t match, you&apos;ll see a seam there.
          Paint over it on a new layer with the <strong>Clone Stamp</strong> (S) and{" "}
          <strong>Sample: All layers</strong>, or with the <strong>Healing Brush</strong> (J) on the
          pasted layer. The <Link href="/docs/retouching">retouching docs</Link> cover both tools.
        </p>
        <p>
          The corners outside the circle get pixels wrapped around from the opposite edge of the
          photo. Paint them over with the sky colour, or select the circle with the Elliptical
          Marquee and turn it into a layer mask. For a planet with the sky in the middle and the
          ground on the outside (sometimes called a &quot;tunnel&quot;), skip the 180° rotation.
        </p>
        <h2>Can Polar Coordinates go the other way?</h2>
        <p>
          Yes. Set <strong>Mode</strong> to <strong>Polar to rectangular</strong> and the filter
          unrolls a circle into a strip: the centre becomes the top row and the angle runs from left
          to right, starting at 12 o&apos;clock. It&apos;s a quick way to straighten out text set
          around a round badge so you can read or retype it.
        </p>
        <h2>What do Twirl, Pinch and Spherize do?</h2>
        <p>
          These three act on a circle or oval in the middle of the layer and leave pixels outside it
          where they were.
        </p>
        <ul>
          <li>
            <strong>Twirl</strong> rotates the middle by <strong>Angle</strong> (−999° to 999°,
            default 50°). The rotation is strongest at the centre and fades to nothing at the edge
            of the largest circle that fits in the layer.
          </li>
          <li>
            <strong>Pinch</strong> has one <strong>Amount</strong> slider from −100% to 100%
            (default 50%). Positive values squeeze the middle inward; negative values push it out.
          </li>
          <li>
            <strong>Spherize</strong> wraps the layer around a sphere with a positive{" "}
            <strong>Amount</strong> (default 100%) and around the inside of one with a negative
            amount. <strong>Mode</strong> can be <strong>Normal</strong>,{" "}
            <strong>Horizontal only</strong> or <strong>Vertical only</strong>, which bends it like
            a cylinder instead of a ball.
          </li>
        </ul>
        <p>
          All three centre on the layer, not on a selection. A selection only limits which pixels
          change. To bulge one part of a photo, such as a face for a fish-eye joke, select it with
          the Elliptical Marquee and choose <strong>Layer → New → Layer via Copy</strong>. The new
          layer is the size of the selection, so Spherize is centred on it.
        </p>
        <h2>Which filters make waves and ripples?</h2>
        <ul>
          <li>
            <strong>Ripple</strong> moves pixels sideways in small regular waves.{" "}
            <strong>Amount</strong> sets the strength (−999% to 999%) and <strong>Size</strong> the
            wavelength (2 to 200 px). It suits a reflection in water.
          </li>
          <li>
            <strong>Wave</strong> adds up several waves of random length.{" "}
            <strong>Generators</strong> (1 to 20) sets how many, <strong>Min wavelength</strong> and{" "}
            <strong>Max wavelength</strong> the range, <strong>Amplitude</strong> how far pixels
            move, and <strong>Type</strong> picks Sine, Triangle or Square. The random pattern
            changes each time you open the dialog.
          </li>
          <li>
            <strong>ZigZag</strong> sends rings out from the centre. <strong>Ridges</strong> sets
            how many, and <strong>Style</strong> is <strong>Around center</strong>,{" "}
            <strong>Out from center</strong> or <strong>Pond ripples</strong> (the default).
          </li>
          <li>
            <strong>Dents</strong> pushes pixels around random bumps of a set <strong>Size</strong>{" "}
            and <strong>Strength</strong>, like hammered glass.
          </li>
        </ul>
        <h2>What about Shear, Displace and Kaleidoscope?</h2>
        <p>
          <strong>Shear</strong> bends the whole layer sideways along a smooth curve: the middle row
          moves furthest and the top and bottom rows stay put. <strong>Amount</strong> runs from
          −100% to 100% of half the layer&apos;s width.
        </p>
        <p>
          <strong>Displace</strong> moves each pixel by the value of a map, up to the{" "}
          <strong>Horizontal scale</strong> and <strong>Vertical scale</strong> you set. Picstea
          never asks you for a map file. The <strong>Displacement map</strong> is the layer&apos;s
          own brightness, generated clouds or generated waves, and <strong>Map size</strong>{" "}
          controls how coarse it is.
        </p>
        <p>
          <strong>Kaleidoscope</strong> mirrors a wedge of the image around a centre point.{" "}
          <strong>Segments</strong> (2 to 32) sets how many wedges, <strong>Angle</strong> turns
          them, and <strong>Center X</strong> and <strong>Center Y</strong> move the centre. A photo
          of flowers or leaves turns into a mandala-like pattern.
        </p>
        <p>
          Displace, Shear and Wave also have an <strong>Undefined areas</strong> option for pixels
          that would come from outside the layer: <strong>Wrap around</strong>,{" "}
          <strong>Repeat edge pixels</strong> or <strong>Transparent</strong>. Wrap around is the
          one to use on a tile that has to repeat without seams.
        </p>
        <h2>Can I change a distortion later?</h2>
        <p>
          On a pixel layer, a filter changes the pixels and is one undo step. To keep it editable,
          choose <strong>Layer → Smart Object → Convert to Smart Object</strong> first. Any filter
          you then pick from the Filter menu is added as a smart filter, which you can edit, hide,
          reorder or delete later in the Properties panel. A smart filter also keeps its random
          pattern, so Wave and Dents look the same every time the layer is drawn. The{" "}
          <Link href="/docs/smart-objects-and-smart-filters">smart objects docs</Link> explain how
          that works.
        </p>
        <p>
          Liquify, at the top of the Filter menu, works with a brush on pixel layers only and
          can&apos;t be a smart filter. The <Link href="/liquify">Liquify guide</Link> covers it.
        </p>
        <h2>How does this compare with Photoshop and GIMP?</h2>
        <p>
          Picstea&apos;s Filter menu follows Photoshop&apos;s, so most Photoshop tutorials for these
          filters carry over. Adobe&apos;s Photoshop Elements help lists the same core set
          (Displace, Pinch, Polar Coordinates, Ripple, Shear, Spherize, Twirl, Wave and ZigZag), and
          there Displace uses a separate image as the displacement map, while Picstea builds the map
          from the layer, clouds or waves. GIMP keeps its versions under{" "}
          <strong>Filters → Distorts</strong>, with Twirl and Pinch combined as{" "}
          <strong>Whirl and Pinch</strong>, and its <strong>Polar Coordinates</strong> uses a{" "}
          <strong>To polar</strong> checkbox instead of a Mode menu. GIMP also has Kaleidoscope,
          Ripple, Waves and Spherize. The <Link href="/gimp-alternative">Picstea vs GIMP</Link> and{" "}
          <Link href="/photoshop-alternative">Picstea vs Photoshop</Link> pages compare the editors
          more broadly.
        </p>
        <h2>Questions people ask</h2>
        <h3>Why is my tiny planet an oval?</h3>
        <p>
          The layer wasn&apos;t square when you ran the filter. Image Size only changes how the
          layer is drawn, so make the canvas square, Copy Merged, Paste, and run Polar Coordinates
          on the pasted layer.
        </p>
        <h3>Can I distort text or a shape?</h3>
        <p>
          Not directly. Filters run on pixel layers and smart objects. Convert the text or shape to
          a smart object first and the filter becomes a smart filter, or rasterize it with{" "}
          <strong>Layer → Rasterize Layer</strong>.
        </p>
        <h3>How do I repeat a distortion on another layer?</h3>
        <p>
          Select the other layer and choose <strong>Filter → Last Filter</strong>{" "}
          (Cmd/Ctrl+Option/Alt+F). It runs the previous filter with the same settings.
        </p>
        <p>
          <EditorLink>Open Picstea</EditorLink> and try Polar Coordinates on a panorama.
        </p>
      </>
    ),
  },
  {
    slug: "color-a-line-drawing-with-the-paint-bucket",
    title: "Colour a line drawing with the Paint Bucket",
    description:
      "Colour a scanned sketch in your browser with flat Paint Bucket fills, a Swatches palette and a Multiply layer, then fix the gaps and light edges by line.",
    published: "2026-11-22",
    draft: false,
    body: () => (
      <>
        <p>
          To colour a line drawing in Picstea, open the scan, add a new layer with{" "}
          <strong>Layer → New → New Layer</strong> and set its <strong>Blend</strong> to{" "}
          <strong>Multiply</strong> in the Properties panel. Then pick the{" "}
          <strong>Paint Bucket</strong> (Shift+G), tick <strong>Sample all layers</strong> in the
          options bar and click inside each shape. The fill stops at the lines but lands on the new
          layer, so the sketch stays untouched. Pick colours from the <strong>Swatches</strong>{" "}
          panel and export a PNG when you&apos;re done. The drawing stays on your device the whole
          time; nothing is uploaded.
        </p>
        <p>
          The example in this post is a pencil-and-ink sketch of a fox, scanned on a home printer.
          It should end up as a flat-coloured sticker with orange fur, a white chest and a green
          background, using the same four colours every time the fox is redrawn.
        </p>
        <h2>How do I prepare the scan?</h2>
        <p>
          Open the scan in <EditorLink>the Picstea editor</EditorLink> with{" "}
          <strong>File → Open Image…</strong> or by dropping it on the window. It opens as one
          unlocked pixel layer named after the file. Scanned paper is rarely pure white and pencil
          lines are rarely pure black. A grey paper texture can stop a fill halfway across a shape.
          A Levels adjustment layer that pulls the white point in and the black point up cleans most
          scans; the <Link href="/blog/levels-and-curves-explained">Levels and Curves post</Link>{" "}
          explains the sliders. If you want hard black lines with no grey at all, a Threshold layer
          does that, as shown in{" "}
          <Link href="/blog/turn-a-photo-into-a-stencil-with-threshold">the stencil post</Link>.
        </p>
        <p>
          Next, look for gaps. The Paint Bucket floods every touching pixel of a similar colour, so
          a one-pixel break in an outline lets the colour run out of the fox and into the
          background. Zoom in, select the drawing layer, choose the <strong>Pencil</strong> (N) and
          close the breaks with black. Its hard edges suit line repairs.
        </p>
        <h2>Why put the colour on its own Multiply layer?</h2>
        <p>
          Select the drawing layer and press Cmd/Ctrl+Shift+N. The new empty layer goes above the
          active one. Rename it &quot;Colour&quot; by double-clicking its name, then set{" "}
          <strong>Blend</strong> to <strong>Multiply</strong> in the Properties panel.
        </p>
        <p>
          Multiply darkens what is underneath and never lightens it, so black lines stay black where
          colour covers them and the pencil shading in the scan shows through the flat colours. You
          can also repaint, erase or delete the colour layer without touching the drawing, or hide
          it with its eye icon to compare. The{" "}
          <Link href="/docs/layers-groups-and-masks">layers docs</Link> list the other blend modes.
        </p>
        <h2>How do I set up a colour palette in Swatches?</h2>
        <p>
          Choose <strong>Window → Swatches</strong>. The panel shares a tab strip with History and
          Actions and starts with a default palette of 30 colours. Click a swatch to make it the
          foreground colour, or Alt-click it to make it the background colour.
        </p>
        <p>
          To add the fox&apos;s own colours, click the foreground colour square at the bottom of the
          toolbar. The colour picker has a hue slider, a colour field and exact <strong>Hex</strong>
          , RGB and HSB values. Type the orange&apos;s hex code, click OK and press{" "}
          <strong>Add Foreground</strong> in the Swatches panel. Do the same for the white, green
          and a dark brown for the nose. To remove a swatch, focus it and press Delete;{" "}
          <strong>Reset</strong> brings back the default palette.
        </p>
        <p>
          Swatches are saved in this browser and are not part of the document, so the palette is
          there the next time you colour a fox, in any file. The list holds up to 300 swatches.
        </p>
        <h2>How do I fill each area with the Paint Bucket?</h2>
        <p>
          The Paint Bucket shares a toolbar slot with the Gradient tool. Press G for the Gradient
          and Shift+G to switch to the bucket, or right-click the slot to pick it from the flyout.
          With the Colour layer active, the options bar shows three settings:
        </p>
        <ul>
          <li>
            <strong>Tolerance</strong> (0 to 255, default 32): how far a pixel&apos;s colour can be
            from the one you clicked, measured as the largest difference in any of red, green or
            blue. Higher values fill further into grey edges.
          </li>
          <li>
            <strong>Contiguous</strong> (on by default): fill only pixels connected to the click.
            Turn it off to fill every matching pixel in the image.
          </li>
          <li>
            <strong>Sample all layers</strong> (off by default): read the visible image instead of
            the active layer. Turn this on here. The Colour layer is empty, so without it the bucket
            sees one big transparent area and fills the whole layer.
          </li>
        </ul>
        <p>
          Click the orange swatch, then click inside the fox&apos;s body, tail and ears. Switch to
          white for the chest and green for the background. The bucket respects selections, so if a
          shape won&apos;t close cleanly you can draw a lasso around it first and the fill stays
          inside. It only works on unlocked, visible pixel layers; on a text, shape or fill layer it
          asks you to add a pixel layer first.
        </p>
        <h2>Why is there a light edge between the colour and the lines?</h2>
        <p>
          Scanned and digital lines both have soft edges: a few pixels of grey between the black and
          the paper. At the default Tolerance of 32 the fill stops before those grey pixels, so a
          thin pale rim shows inside every outline. Picstea&apos;s Paint Bucket has no anti-alias
          option, so its fills have hard edges.
        </p>
        <p>There are two ways to close the rim:</p>
        <ol>
          <li>
            Undo the fill, raise <strong>Tolerance</strong> and click again. The fill reaches
            further into the grey. Too high a value and it leaks through faint lines.
          </li>
          <li>
            Select the area instead. Press W for the <strong>Magic Wand</strong>, which has the same
            Tolerance, Contiguous and Sample all layers options, and click inside the shape. Choose{" "}
            <strong>Select → Modify → Expand…</strong> and grow the selection by 1 or 2 pixels so it
            tucks under the line. With the Colour layer active, choose{" "}
            <strong>Edit → Fill with Foreground</strong> (Shift+F5), then deselect with Cmd/Ctrl+D.
          </li>
        </ol>
        <p>
          With the second method the colour slides under the black line, and Multiply keeps the line
          black on top of it. The <Link href="/docs/selections">selections docs</Link> cover Expand,
          Contract and Feather, and <Link href="/docs/painting-and-fills">painting and fills</Link>{" "}
          covers the bucket and Edit → Fill.
        </p>
        <h2>How is this different in Photoshop and GIMP?</h2>
        <p>
          Photoshop&apos;s Paint Bucket has the same Tolerance, Contiguous and All Layers options,
          plus an <strong>Anti-alias</strong> checkbox that smooths the edge of the fill. Picstea
          doesn&apos;t have that checkbox, so the Expand method above is how you get fills that meet
          the line.
        </p>
        <p>
          GIMP&apos;s Bucket Fill has a <strong>Fill by line art detection</strong> mode built for
          exactly this job. It finds areas bounded by line art and can close small gaps in the lines
          on its own, with a setting for the largest gap it will close. Picstea has no automatic gap
          closing, so you close breaks yourself with the Pencil before filling. For a lot of comic
          pages that GIMP mode saves real time. For the odd sketch, Picstea runs in a browser tab
          with no install and keeps layers, masks and PSD files in the same place. The{" "}
          <Link href="/gimp-alternative">GIMP comparison</Link> and the{" "}
          <Link href="/photoshop-alternative">Photoshop comparison</Link> go into the wider
          differences.
        </p>
        <h2>How do I add shading and export the result?</h2>
        <p>
          For simple shading, add another layer above Colour and choose{" "}
          <strong>Layer → Create Clipping Mask</strong> (Cmd/Ctrl+Option/Alt+G). A clipped layer
          only shows where the layer below has pixels, so brush strokes can&apos;t spill outside the
          fox. Set it to Multiply and paint with a darker orange.
        </p>
        <p>
          To keep the layers for later, choose <strong>File → Save Project As…</strong> to save a{" "}
          <code>.picstea</code> file. For the finished sticker, choose{" "}
          <strong>File → Export As…</strong> and pick PNG.
        </p>
        <h2>Questions people ask</h2>
        <h3>Can I fill several areas of the same colour at once?</h3>
        <p>
          Yes. Turn off <strong>Contiguous</strong> and click one of them. Every pixel within the
          Tolerance of the clicked colour is filled, across the whole image. It is a quick way to
          change all the orange to red after the first pass.
        </p>
        <h3>Why did the bucket fill the whole layer?</h3>
        <p>
          <strong>Sample all layers</strong> is probably off, so the bucket read the empty Colour
          layer instead of the drawing. Undo, tick the option and click again. A gap in the outline
          has the same effect on the shape it leaks out of.
        </p>
        <h3>Are my swatches saved in the project file?</h3>
        <p>
          No. Swatches are stored in this browser and shared by every document you open in it. A
          different browser or device starts with the default palette.
        </p>
        <h3>Can I colour line art drawn on a transparent layer?</h3>
        <p>
          Yes. Keep <strong>Sample all layers</strong> on so the bucket reads the lines, and put the
          colour layer below the line layer instead of setting it to Multiply.
        </p>
        <p>
          <EditorLink>Open Picstea</EditorLink> and colour your next sketch.
        </p>
      </>
    ),
  },
  {
    slug: "remove-halftone-dots-with-fourier-transform",
    title: "Remove halftone dots with the Fourier filters",
    description:
      "Scanned a magazine photo and got dots or moiré? Use Picstea's Fourier Transform to find the pattern, paint it out with grey and turn the image back.",
    published: "2026-11-23",
    draft: false,
    body: () => (
      <>
        <p>
          To remove halftone dots or a moiré pattern from a scan in Picstea, duplicate the layer and
          choose <strong>Filter → Fourier → Fourier Transform</strong>. The layer turns into a map
          of the image&apos;s frequencies, and a regular print pattern shows up there as a few
          bright and dark spots away from the centre. Paint those spots with 50% grey (#808080),
          then choose <strong>Filter → Fourier → Inverse Fourier Transform</strong> to get the
          picture back without the pattern. Both filters run in your browser, so the scan stays on
          your device and nothing is uploaded.
        </p>
        <p>
          The example in this post is a photo cut from an old magazine and scanned at a high
          resolution. Up close it is made of tiny dots in a grid, and at some zoom levels the grid
          turns into wavy bands. Blurring would hide the dots and soften the faces along with them.
          Editing the frequencies takes out the grid and leaves most of the detail.
        </p>
        <h2>Why does a scan of a printed photo have a pattern?</h2>
        <p>
          Magazines and newspapers print photos as a grid of ink dots of different sizes, called a
          halftone screen. Your scanner samples the page on its own grid of pixels, and where the
          two grids nearly line up you get moiré, the rippling bands you see when you zoom out.
          Screens on monitors photographed with a phone, fabric, and window mesh cause the same
          thing.
        </p>
        <p>
          These patterns repeat at a fixed spacing and angle, and a photo of a face or a landscape
          doesn&apos;t, so a Fourier transform can tell them apart.
        </p>
        <h2>What does Fourier Transform show?</h2>
        <p>
          <strong>Fourier Transform</strong> replaces each colour channel (red, green and blue) of
          the layer with its frequency spectrum, centred on the canvas. The centre pixel holds the
          average brightness. Pixels close to the centre hold the broad shapes and slow changes in
          the image, and pixels further out hold finer and finer detail, up to the edges of the
          canvas. The direction from the centre matches the direction of the detail in the photo.
        </p>
        <p>
          In this view mid-grey means &quot;nothing at this frequency&quot;. Brighter pixels are
          positive values and darker pixels are negative ones. A normal photo gives a cloud that is
          strongest in the middle and fades towards the edges. A halftone screen adds the pattern as
          sharp, isolated spots well away from the centre, usually arranged symmetrically around it
          and often in a small grid of their own.
        </p>
        <p>
          Picstea uses the Hartley transform for this, a real-valued relative of the Fourier
          transform with the same frequencies in the same places. It fits into an ordinary pixel
          layer and undoes itself, which is why you can paint on the result. The values are stored
          with a logarithmic curve in 8 bits each, so the round trip back to the image is close but
          not exact.
        </p>
        <h2>How do I remove the pattern step by step?</h2>
        <ol>
          <li>
            Open the scan in <EditorLink>the Picstea editor</EditorLink> and choose{" "}
            <strong>Layer → Duplicate Layer</strong> (Cmd/Ctrl+J). You&apos;ll work on the copy and
            keep the original to compare against.
          </li>
          <li>
            Press Cmd/Ctrl+D (<strong>Select → Deselect</strong>) if there is a selection. A filter
            only changes pixels inside the selection, and a transform of half the layer gives a
            spectrum you can&apos;t use.
          </li>
          <li>
            Choose <strong>Filter → Fourier → Fourier Transform</strong>. There is no dialog; it
            runs at full size in a background worker and is one undo step. The layer becomes opaque.
          </li>
          <li>
            Click the foreground colour, type <code>808080</code> in the <strong>Hex</strong> field
            and pick the <strong>Brush</strong> (B). A soft brush with a low{" "}
            <strong>Hardness</strong> blends in better than a hard one.
          </li>
          <li>
            Paint over each isolated spot, a little larger than the spot itself. For round spots you
            can also draw an Elliptical Marquee around one and use{" "}
            <strong>Edit → Fill with Foreground</strong> (Shift+F5), then deselect again before the
            next step.
          </li>
          <li>
            Choose <strong>Filter → Fourier → Inverse Fourier Transform</strong>. The photo comes
            back, and the pattern should be weaker or gone. Hide and show the layer in the Layers
            panel to compare it with the original underneath.
          </li>
        </ol>
        <p>
          If the result isn&apos;t clean, undo the inverse (Cmd/Ctrl+Z) to return to the spectrum,
          paint a little more, and run the inverse again. The History panel lets you jump between
          these steps.
        </p>
        <h2>What should I avoid painting?</h2>
        <p>
          Leave the centre alone. The middle of the spectrum is the photo itself: painting there
          changes the overall brightness and wipes out large shapes. Stay off the faint cloud around
          the centre too, and only cover spots that stand out clearly from it.
        </p>
        <p>
          Don&apos;t paint with black. Black is a large negative value in this view, so it adds a
          pattern of its own. Grey at #808080 is as close to zero as an 8-bit pixel gets. For the
          same reason, don&apos;t run other filters or adjustments on the spectrum layer. Finish the
          round trip before exporting, too: the spectrum is only useful as exact pixel values, and a
          JPEG would change them.
        </p>
        <h2>What if some dots are left?</h2>
        <p>
          The Fourier method takes out the regular part of the pattern. Small leftover specks are
          easier to handle with the noise filters on the result:
        </p>
        <ul>
          <li>
            <strong>Filter → Noise → Despeckle</strong> runs a small median everywhere except along
            strong edges, which stay sharp. It has no settings.
          </li>
          <li>
            <strong>Filter → Noise → Median…</strong> replaces each pixel with the median of its
            neighbours. Keep the <strong>Radius</strong> at 1 or 2 px for a scan.
          </li>
          <li>
            <strong>Filter → Noise → Dust &amp; Scratches…</strong> only changes pixels that differ
            from their neighbours by more than the <strong>Threshold</strong>, which suits stray
            specks of dust from the scanner glass.
          </li>
        </ul>
        <p>
          The <Link href="/docs/filters">filters docs</Link> list everything in the Filter menu, and
          the <Link href="/sharpen-image">sharpening guide</Link> helps if the cleaned photo looks
          soft. For scratches or folds, the healing tools in the{" "}
          <Link href="/docs/retouching">retouching docs</Link> are a better fit.
        </p>
        <h2>Can I batch this or keep it editable?</h2>
        <p>
          Not really. Fourier Transform and its inverse can be recorded in an action like any other
          filter, but brush strokes can&apos;t be recorded yet, and the painting is the part that
          changes from scan to scan. Every print screen puts its spots in a different place, so each
          image needs its own look at the spectrum anyway.
        </p>
        <p>
          Smart filters don&apos;t help here either. On a smart object, Picstea adds each filter as
          a smart filter, and you can&apos;t paint between two smart filters. Use a pixel layer for
          the whole process.
        </p>
        <h2>How does this compare with Photoshop and GIMP?</h2>
        <p>
          Photoshop doesn&apos;t ship a Fourier filter. People have asked Adobe for one on its
          community feature-request board for years, and the usual workaround is a third-party
          plug-in or action set. In GIMP, the common route is the free G&apos;MIC plug-in, which has
          a Fourier Transform filter in its Spectral Filters group. In Picstea, both directions are
          built into the Filter menu and work in the browser with nothing to install. The{" "}
          <Link href="/photoshop-alternative">Picstea vs Photoshop</Link> and{" "}
          <Link href="/gimp-alternative">Picstea vs GIMP</Link> pages compare the editors more
          broadly.
        </p>
        <h2>Questions people ask</h2>
        <h3>Why did my photo come back with odd colours or banding?</h3>
        <p>
          Something other than mid-grey was painted on the spectrum, or the centre was touched. Undo
          the inverse, undo the strokes near the centre, and repaint the spots with #808080. Very
          slight tone differences are normal, because the spectrum is stored in 8 bits.
        </p>
        <h3>Does this work on photos with transparency?</h3>
        <p>
          The transform treats transparent pixels as black and makes the layer opaque, so it is
          meant for flat images such as scans. Run it on a layer with no transparent areas.
        </p>
        <h3>Does the image need a particular size?</h3>
        <p>
          No. Any width and height up to the document limit works. Large scans take longer because
          every row and column is transformed, and a busy message shows while it runs.
        </p>
        <h3>Will this remove JPEG blocks or film grain?</h3>
        <p>
          Not well. Those aren&apos;t a single repeating pattern, so they don&apos;t make clear
          spots in the spectrum. Try <strong>Filter → Noise → Reduce Noise…</strong> for those.
        </p>
        <p>
          <EditorLink>Open Picstea</EditorLink> and try Fourier Transform on your next scan.
        </p>
      </>
    ),
  },
  {
    slug: "make-a-seamless-texture-picstea-vs-photoshop-gimp",
    title: "Seamless textures: Picstea vs Photoshop and GIMP",
    description:
      "Turn a photo into a texture that tiles without visible seams, using Offset, the Clone Stamp and Repeat in Picstea, and see how Photoshop and GIMP do it.",
    published: "2026-11-24",
    draft: false,
    body: () => (
      <>
        <p>
          To make a photo tile without seams in Picstea, crop it to a square, choose{" "}
          <strong>Filter → Other → Offset…</strong> and move it by half its width and half its
          height with <strong>Undefined areas</strong> set to <strong>Wrap around</strong>. The
          edges that used to meet badly are now a cross in the middle of the image, where you can
          paint them out with the Clone Stamp or the Healing Brush. Photoshop and GIMP use the same
          trick, and each adds a helper of its own.
        </p>
        <p>
          The example here is a phone photo of a gravel path that should become a 1024 × 1024 ground
          texture for a small game. The same steps work for wood, fabric, concrete, grass or a
          website background. Everything runs in your browser, so the photo stays on your device and
          nothing is uploaded.
        </p>
        <h2>Why does a photo show seams when it repeats?</h2>
        <p>
          When an image is tiled, its right edge sits next to its left edge and its bottom edge sits
          next to its top edge. In a photo those edges never match: the stones are different and the
          light is usually a little brighter on one side. The eye picks up the line at once, and
          then the grid of repeats.
        </p>
        <p>
          Offset with wrap-around moves the picture sideways and down and brings whatever leaves on
          one side back in on the other, so nothing is lost. The old outer edges end up next to each
          other in the middle, and the new outer edges are pixels that were neighbours in the
          original photo, so they already match.
        </p>
        <h2>How do I prepare the photo?</h2>
        <ol>
          <li>
            Open the photo in <EditorLink>the Picstea editor</EditorLink> and pick the{" "}
            <strong>Crop</strong> tool (C). In the options bar set <strong>Ratio</strong> to{" "}
            <strong>1:1</strong> and tick <strong>Delete cropped pixels</strong>.
          </li>
          <li>
            Drag the box over an evenly lit area with no single object that stands out, such as one
            large stone or a leaf, and press Enter.
          </li>
          <li>
            Read the new size in the status bar and halve it. A 2000 × 2000 px crop gives 1000 and
            1000.
          </li>
        </ol>
        <p>
          Tick <strong>Delete cropped pixels</strong> because Crop normally keeps the pixels outside
          the canvas, and Offset wraps around the edges of the layer. If the layer is still larger
          than the canvas, the seam lands in the wrong place. For the same reason, leave{" "}
          <strong>Image → Image Size…</strong> for the end: it draws pixel layers at the new size
          and keeps their original pixels, and Offset counts in the layer&apos;s own pixels. If the
          document has several layers, choose <strong>Layer → Flatten Image</strong> before you
          crop.
        </p>
        <h2>How do I move the seams to the middle?</h2>
        <p>
          Choose <strong>Filter → Other → Offset…</strong>. Type half the width into{" "}
          <strong>Horizontal</strong> and half the height into <strong>Vertical</strong>; both
          fields take values from −30000 to 30000 px. <strong>Undefined areas</strong> has three
          choices: <strong>Set to transparent</strong>, <strong>Repeat edge pixels</strong> and{" "}
          <strong>Wrap around</strong>. Wrap around is the default and the one you need. With{" "}
          <strong>Preview</strong> ticked you see the result on the canvas before you press{" "}
          <strong>OK</strong>, and the filter is one undo step.
        </p>
        <p>
          The photo now has a vertical and a horizontal line through its centre where the gravel
          doesn&apos;t line up.
        </p>
        <h2>How do I paint the seams out?</h2>
        <p>
          Pick the <strong>Clone Stamp</strong> (S), Alt-click (Option-click on a Mac) on a clean
          patch of gravel and paint along the seam. Take a new source every few strokes so you
          don&apos;t stamp the same stone in a row. Where the two sides differ in brightness, the{" "}
          <strong>Healing Brush</strong> (J) works better, because it keeps the texture you copy and
          takes the colour and brightness of the place you paint on. The{" "}
          <strong>Spot Healing Brush</strong> in the same toolbar group needs no source and is quick
          for a single pebble that got cut in half. The{" "}
          <Link href="/docs/retouching">retouching docs</Link> cover the options of all three.
        </p>
        <p>
          Stay away from the outer edges of the canvas while you do this. They match now, and a
          stroke that touches one edge breaks the match with the opposite one.
        </p>
        <p>
          When the cross is gone, choose <strong>Filter → Last Filter</strong> (Cmd/Ctrl+Alt+F). It
          runs Offset again with the same values. On an image with an even width and height that
          puts everything back where it started, and a seam you missed is easier to see in its new
          position.
        </p>
        <h2>How do I check that it tiles?</h2>
        <p>
          Choose <strong>Image → Duplicate</strong> so the test doesn&apos;t touch your texture,
          then <strong>Filter → Other → Repeat…</strong> on the copy. Repeat shrinks the layer and
          tiles it inside the same space, with <strong>Columns</strong> and <strong>Rows</strong>{" "}
          from 1 to 50 (both start at 2). At 3 × 3 you see every join at once. Look for lines, and
          for one feature that shows up nine times in a grid. Go back to the original tab, fix what
          you found and test again.
        </p>
        <p>
          Repeat also has a <strong>Mirror</strong> box that flips every second tile, so
          neighbouring tiles always meet on the same edge and join without any retouching. It is
          faster, and it suits marble or clouds. On gravel or brick the mirror symmetry is easy to
          spot, so I&apos;d spend the extra minutes on Offset there.
        </p>
        <h2>How do I save the texture?</h2>
        <p>
          Choose <strong>Image → Image Size…</strong> and set the size your project needs, 1024 ×
          1024 px in this example. Then <strong>File → Export As…</strong> and pick PNG for a
          lossless file, or JPEG or WebP with the <strong>Quality</strong> slider for a smaller one.
          The <Link href="/docs/file-formats">file formats docs</Link> list what each format keeps.
        </p>
        <h2>How do Photoshop and GIMP do the same job?</h2>
        <ul>
          <li>
            <strong>Photoshop</strong> lists Offset among its Other filters, so the manual method is
            the same. It also has <strong>View &gt; Pattern Preview</strong>, which repeats the
            canvas content outside the canvas while you work (Adobe notes it works best with smart
            objects), and <strong>Edit &gt; Define Pattern</strong> to save the result as a pattern.
          </li>
          <li>
            <strong>GIMP</strong> has <strong>Layer → Transform → Offset…</strong> (Shift+Ctrl+O)
            with a <strong>By width/2, height/2</strong> button and a <strong>Wrap around</strong>{" "}
            edge behaviour. It also has <strong>Filters → Map → Tile Seamless…</strong>, which makes
            the edges seamless for you. GIMP&apos;s manual says it has no options and that the
            result may need correction.
          </li>
          <li>
            <strong>Picstea</strong> has Offset with wrap-around, the retouching tools and Repeat
            for the check, and runs in a browser tab with nothing to install. You type the half
            values yourself, there is no live tiled preview while you paint, and you can&apos;t save
            your tile as a pattern: the Pattern Overlay layer style uses ten built-in patterns.
          </li>
        </ul>
        <p>
          If you already work in Photoshop, Pattern Preview is the most comfortable of the three for
          drawing a pattern from scratch. For turning one photo into a tile, the manual steps are
          the same in all of them. The{" "}
          <Link href="/photoshop-alternative">Picstea vs Photoshop</Link> and{" "}
          <Link href="/gimp-alternative">Picstea vs GIMP</Link> pages compare the editors more
          broadly.
        </p>
        <h2>Questions people ask</h2>
        <h3>Does the texture have to be square?</h3>
        <p>
          No. Offset works on any size; use half the width and half the height. If the texture is
          for a game engine or a 3D tool, check which sizes it expects before you crop.
        </p>
        <h3>Can I record this as an action?</h3>
        <p>
          Partly. Offset and Repeat are filters, and filters are recorded in actions with their
          settings. Brush and retouching strokes are not recorded, so the seam painting stays manual
          for every photo.
        </p>
        <h3>Can I make a texture without a photo?</h3>
        <p>
          Yes. Fill a pixel layer with any colour, then choose{" "}
          <strong>Filter → Render → Clouds…</strong> and set <strong>Scale</strong> between 4 and
          2000 px. Clouds renders in black and white and isn&apos;t made to tile, so run the same
          Offset and retouching steps on it, or use Repeat with Mirror. The{" "}
          <Link href="/docs/filters">filters docs</Link> list the other Render filters.
        </p>
        <h3>How large can the texture be?</h3>
        <p>
          A Picstea document can be up to 12,000 px on a side and 36 megapixels in total, which
          covers a 4096 × 4096 px texture.
        </p>
        <p>
          <EditorLink>Open Picstea</EditorLink> and try Offset on a photo of a wall or a floor.
        </p>
      </>
    ),
  },
  {
    slug: "add-falling-snow-to-a-photo",
    title: "How to add falling snow to a photo",
    description:
      "Add falling snow to a winter photo with Picstea's Particles filter, Motion Blur and Screen layers. Free, in your browser, with nothing uploaded.",
    published: "2026-11-25",
    draft: false,
    body: () => (
      <>
        <p>
          To add falling snow to a photo in Picstea, make a new layer filled with black, set its
          blend mode to <strong>Screen</strong>, and run{" "}
          <strong>Filter → Other → Particles…</strong> with <strong>Kind</strong> set to{" "}
          <strong>Snow</strong>. Screen hides the black, so only the white flakes show over the
          photo. A short <strong>Filter → Blur → Motion Blur…</strong> makes them fall. Repeat this
          on two more layers with larger and fewer flakes to get depth.
        </p>
        <p>
          The example is a 3000 × 2000 px photo of a friend on an evening street, with bare trees
          and dark buildings behind. It should look as if it was taken in light snowfall, for a
          holiday card. The photo stays on your device the whole time and nothing is uploaded.
        </p>
        <h2>How do I set up a snow layer?</h2>
        <ol>
          <li>
            Open the photo in <EditorLink>the Picstea editor</EditorLink> and choose{" "}
            <strong>Layer → New → New Layer</strong> (Cmd/Ctrl+Shift+N).
          </li>
          <li>
            Make sure the foreground colour is black. The small button under the toolbar&apos;s
            colour squares resets it (D).
          </li>
          <li>
            Choose <strong>Select → All</strong>, then <strong>Edit → Fill with Foreground</strong>{" "}
            (Shift+F5), then <strong>Select → Deselect</strong>.
          </li>
          <li>
            In the Properties panel, set <strong>Blend</strong> to <strong>Screen</strong>. The
            black disappears and you see the photo again.
          </li>
        </ol>
        <p>
          The black fill is needed because Picstea won&apos;t run a filter on an empty layer; you
          would get the message &quot;This layer is empty.&quot; You could run Particles straight on
          the photo, but the snow would then be part of its pixels and you couldn&apos;t move it,
          mask it or turn it down.
        </p>
        <h2>What do the Particles settings do?</h2>
        <ul>
          <li>
            <strong>Particles per megapixel</strong> goes from 1 to 5000 and starts at 400. It
            counts flakes per million pixels, so 400 on this 6-megapixel photo gives 2,400 flakes.
          </li>
          <li>
            <strong>Size</strong> goes from 0.5 to 200 px and starts at 6. It is the radius of the
            biggest flake. Snow flakes vary at random from about a third of that up to the full
            value, and each one fades out towards its edge.
          </li>
          <li>
            <strong>Kind</strong> is <strong>Snow</strong>, <strong>Sparks</strong> (warm orange
            with a hot core) or <strong>Bokeh</strong> (faint coloured discs, one to three times the
            size).
          </li>
        </ul>
        <p>
          Each time you open the dialog the flakes land in new random places. If you don&apos;t like
          where one ended up, undo and run the filter again.
        </p>
        <p>
          On a big photo the preview looks emptier than the result. On layers above 2 megapixels
          Picstea previews a reduced copy, and since flakes are counted per megapixel, the preview
          has fewer of them. On the example it shows about a third of the final number. Press{" "}
          <strong>OK</strong>, look at <strong>View → 100%</strong>, and undo if it is too much.
        </p>
        <h2>How do I make the snow look deep?</h2>
        <p>
          Snow close to the camera looks big, sparse and blurred, and snow far away looks small and
          dense. Make three layers for this, each set up as above. These values worked on a 3000 ×
          2000 px canvas:
        </p>
        <ul>
          <li>
            Far: 800 particles per megapixel, size 5 px, then Motion Blur with a distance of 6 px.
          </li>
          <li>
            Middle: 150 particles per megapixel, size 12 px, then Motion Blur with a distance of 18
            px.
          </li>
          <li>
            Near: 8 particles per megapixel, size 45 px, then Motion Blur with a distance of 60 px.
          </li>
        </ul>
        <p>
          For a larger or smaller photo, change the sizes and distances in proportion to its width.
          The count needs changing too if you keep the same look: at twice the width, use a quarter
          of the particles per megapixel.
        </p>
        <p>
          Motion Blur has an <strong>Angle</strong> from −180 to 180° and a{" "}
          <strong>Distance</strong> from 1 to 200 px. At 0° the streaks are horizontal and at 90°
          they are vertical. I used 70° on all three layers, which looks like snow blown from the
          upper right to the lower left. Keep the angle nearly the same on all of them, as if one
          wind were blowing. A longer distance suggests a storm, and it also dims the flakes since
          the same light is spread over more pixels.
        </p>
        <h2>How do I keep snow off a face?</h2>
        <p>
          Flakes in the far layer should pass behind the person. Select that layer, choose{" "}
          <strong>Layer → Raster Mask → Add Layer Mask</strong>, click the mask thumbnail in the
          Layers panel and paint over the person with a soft black <strong>Brush</strong> (B). White
          brings the flakes back. On the middle and near layers, only mask a flake that lands
          somewhere distracting, such as on an eye. The{" "}
          <Link href="/docs/layers-groups-and-masks">layers and masks docs</Link> explain mask
          painting in more detail.
        </p>
        <p>
          If the whole effect is too strong, lower <strong>Opacity</strong> on one layer at a time,
          starting with the near one.
        </p>
        <h2>How do I make the photo match the weather?</h2>
        <p>
          A photo taken on a clear evening looks warmer than one taken in snow. Select the photo
          layer and choose <strong>Layer → New Adjustment Layer → Temperature/Tint…</strong>. The
          new layer sits above the photo and below the snow, so the flakes stay white. Move{" "}
          <strong>Temperature</strong> to about −15; negative values add blue and take away red.
          Distant snow also lowers contrast a little, which you can copy with a{" "}
          <strong>Brightness/Contrast…</strong> adjustment layer in the same place.
        </p>
        <p>
          White flakes show well against trees, dark walls and evening sky, and almost vanish
          against a white sky or snow that is already on the ground.
        </p>
        <h2>How do I save it?</h2>
        <p>
          Choose <strong>File → Save Project As…</strong> to keep the layers in a{" "}
          <code>.picstea</code> file, so you can change the snow later. For the card itself choose{" "}
          <strong>File → Export As…</strong> and pick JPEG. Thousands of small flakes are hard to
          compress, so expect a larger file than the original at the same quality. The{" "}
          <Link href="/image-compressor">image compressor guide</Link> covers the trade-off.
        </p>
        <h2>How does Photoshop do it?</h2>
        <p>
          Adobe&apos;s own guide uses the same black layer in Screen mode, but builds the flakes
          from noise: <strong>Filter &gt; Noise &gt; Add Noise</strong> with Gaussian and
          Monochromatic, a Gaussian Blur, then Levels to remove most of the specks, and Motion Blur
          at the end. You can follow those steps in Picstea too, since it has all of these filters
          and Levels as an adjustment layer. Clip it to the noise layer with{" "}
          <strong>Layer → Create Clipping Mask</strong> so it doesn&apos;t darken the photo.
          Particles skips the blur and Levels steps and lets you set the number and size of flakes
          directly. The noise method gives more irregular clumps. The{" "}
          <Link href="/photoshop-alternative">Picstea vs Photoshop</Link> page compares the editors
          more broadly.
        </p>
        <h2>Questions people ask</h2>
        <h3>Can I change the flakes after pressing OK?</h3>
        <p>
          Not on a pixel layer; undo and run the filter again. If you convert the black layer with{" "}
          <strong>Layer → Smart Object → Convert to Smart Object</strong> first, Particles becomes a
          smart filter you can reopen. Smart filters are drawn at the scale you are viewing, though,
          so the number of flakes changes as you zoom. I&apos;d use pixel layers for snow.
        </p>
        <h3>Can I add snow to many photos at once?</h3>
        <p>
          Yes. Filters, new layers, fills and blend mode changes can all be recorded in an action,
          and each photo gets its own random flakes. Painting on a mask isn&apos;t recorded. See{" "}
          <Link href="/blog/record-actions-and-batch-process-images">
            recording actions and batch processing
          </Link>
          .
        </p>
        <h3>Does Picstea make animated snow?</h3>
        <p>
          No. It edits still images and has no timeline or animated GIF export, so the result is a
          photo.
        </p>
        <h3>Can I make rain the same way?</h3>
        <p>
          Roughly. Use small flakes, around 2 or 3 px, and a Motion Blur distance of 40 px or more,
          then lift the faint streaks with a clipped Levels adjustment layer. There is no separate
          rain setting in Particles.
        </p>
        <p>
          <EditorLink>Open Picstea</EditorLink> and try it on a photo with a dark background.
        </p>
      </>
    ),
  },
  {
    slug: "transparent-signature-png-picstea-vs-gimp",
    title: "Transparent signature PNG: Picstea vs GIMP",
    description:
      "Turn a signature photographed on white paper into a transparent PNG with Color to Alpha in Picstea, and see how GIMP's version of the filter differs.",
    published: "2026-11-26",
    draft: false,
    body: () => (
      <>
        <p>
          To make a transparent PNG of your signature in Picstea, open the photo of it, read the
          paper&apos;s colour with the <strong>Color Sampler</strong>, then choose{" "}
          <strong>Filter → Other → Color to Alpha…</strong> and type that colour into{" "}
          <strong>Red</strong>, <strong>Green</strong> and <strong>Blue</strong>. The paper goes
          transparent and the ink stays, soft edges included. Crop the empty space with{" "}
          <strong>Image → Trim…</strong> and export a PNG. GIMP&apos;s filter of the same name works
          the same way and has a couple of extra controls.
        </p>
        <p>
          The example is a phone photo of a signature in blue ballpoint on printer paper, taken next
          to a window. It needs to go on a PDF invoice and into an email footer, on any background.
          A signature is the kind of file you may not want to give to a website, and here it
          doesn&apos;t leave your device: Picstea works in the browser and nothing is uploaded.
        </p>
        <h2>Why not just erase the white?</h2>
        <p>
          The <strong>Magic Eraser</strong> (in the Eraser group of the toolbar) clears every pixel
          within its <strong>Tolerance</strong> of the colour you click, and leaves everything else
          as it was. The pixels along each pen stroke are a mix of ink and paper, light blue-grey
          rather than blue. They either stay, which leaves a pale fringe that shows on a dark
          background, or they disappear and the strokes get thinner and jagged. With{" "}
          <strong>Contiguous</strong> on, which is the default, the paper inside closed loops such
          as an &quot;o&quot; or an &quot;e&quot; also stays white.
        </p>
        <p>
          Color to Alpha looks at every pixel in the layer. Each one becomes as transparent as it is
          close to the colour you chose, and its remaining colour is worked out as if that colour
          had been taken out of the mix. A light blue-grey edge pixel turns into blue ink at partial
          opacity. On a dark background the edge still blends smoothly, with no white outline.
        </p>
        <h2>How do I find the colour of the paper?</h2>
        <p>
          Paper in a photo is almost never pure white. By a window it tends to come out as a warm
          light grey, while Color to Alpha starts at 255, 255, 255, so read the real value first.
        </p>
        <ol>
          <li>
            Open the photo in <EditorLink>the Picstea editor</EditorLink>. If there is a lot of desk
            around the paper, crop it away first with the <strong>Crop</strong> tool (C).
          </li>
          <li>
            Hold or right-click the <strong>Eyedropper</strong> in the toolbar and choose{" "}
            <strong>Color Sampler</strong>, or press Shift+I until it comes up.
          </li>
          <li>
            Click on a clean patch of paper close to the signature. The options bar lists the point
            as <code>R … G … B …</code> together with its hex code. You can place up to four points,
            and a second one elsewhere on the paper shows how even the light is.
          </li>
        </ol>
        <p>The threshold in the next step deals with small differences across the sheet.</p>
        <h2>How do I use Color to Alpha in Picstea?</h2>
        <p>
          Select the photo&apos;s layer in the Layers panel and choose{" "}
          <strong>Filter → Other → Color to Alpha…</strong>. The menu item is only active on a pixel
          layer or a smart object that isn&apos;t locked. The dialog has four settings, each with a
          slider and a number box:
        </p>
        <ul>
          <li>
            <strong>Red</strong>, <strong>Green</strong> and <strong>Blue</strong>, from 0 to 255,
            all starting at 255. Type the values from the Color Sampler here.
          </li>
          <li>
            <strong>Transparency threshold</strong>, from 0 to 254 levels, starting at 0. Pixels
            whose difference from the colour is at or below this number become fully transparent,
            and the rest are scaled to fill the full range above it.
          </li>
        </ul>
        <p>
          With <strong>Preview</strong> ticked you see the result on the canvas as you change the
          values. Zoom to 100% on a part of the paper away from the signature. At a threshold of 0
          you&apos;ll probably see a faint haze of paper texture and shadow. Raise the threshold in
          small steps until it is gone, and then check that the thinnest pen strokes are still
          there, because a high threshold also eats the lightest parts of the ink. Press{" "}
          <strong>OK</strong>; it&apos;s one undo step.
        </p>
        <p>
          If you want to come back to the settings later, choose{" "}
          <strong>Layer → Smart Object → Convert to Smart Object</strong> before you run the filter.
          Color to Alpha then becomes a smart filter, which you can open again, hide or delete. The{" "}
          <Link href="/docs/smart-objects-and-smart-filters">
            smart objects and smart filters docs
          </Link>{" "}
          explain how that works. If there is a stray mark elsewhere on the page, select the
          signature with a lasso first: on a pixel layer the filter only changes the selected area,
          and you can clear the rest with <strong>Edit → Clear</strong> after inverting the
          selection.
        </p>
        <h2>How do I make the ink darker or change its colour?</h2>
        <p>
          Ballpoint ink usually isn&apos;t fully opaque after Color to Alpha, because even the
          darkest ink in the photo isn&apos;t that far from the paper on every channel. It looks
          fine on white and a little weak on dark grey. Two things help:
        </p>
        <ul>
          <li>
            Choose <strong>Duplicate Layer</strong> (Cmd/Ctrl+J) and then{" "}
            <strong>Layer → Merge Down</strong> (Cmd/Ctrl+E). Two copies of a half-transparent
            stroke on top of each other are more opaque than one. Do this after the threshold has
            removed the paper haze, or the haze gets stronger too.
          </li>
          <li>
            For black or dark blue ink of an exact colour, double-click the layer (or choose{" "}
            <strong>Layer → Layer Style → Blending Options…</strong>) and turn on{" "}
            <strong>Color Overlay</strong>. It recolours the strokes and keeps their soft edges.
          </li>
        </ul>
        <h2>How do I crop and save it?</h2>
        <p>
          Choose <strong>Image → Trim…</strong>, leave <strong>Based on</strong> at{" "}
          <strong>Transparent pixels</strong> and press OK. The canvas shrinks to the signature.
          Then choose <strong>File → Export As…</strong> and pick <strong>PNG</strong>, or{" "}
          <strong>WebP</strong> for a smaller file. Both keep the transparency; JPEG has none and
          would fill it in. The <Link href="/docs/file-formats">file formats docs</Link> list what
          each format keeps.
        </p>
        <h2>How does GIMP&apos;s Color to Alpha compare?</h2>
        <p>
          GIMP is a desktop program for Windows, macOS and Linux; the current stable release is
          3.2.8. Its filter is under <strong>Colors → Color to Alpha…</strong>, and its manual tells
          you to add an alpha channel first if the layer has none, with{" "}
          <strong>Layer → Transparency → Add Alpha Channel</strong>. Compared with Picstea&apos;s:
        </p>
        <ul>
          <li>
            The colour field has an eyedropper next to it, so you pick the paper straight from the
            image, and a <strong>Sample average</strong> option that averages a square of pixels. In
            Picstea you read the colour with the Color Sampler and type it in.
          </li>
          <li>
            GIMP has a <strong>Transparency threshold</strong> like Picstea&apos;s, and also an{" "}
            <strong>Opacity threshold</strong>: colours beyond it stay fully opaque. Lowering it
            makes faint ballpoint ink solid in one step, which is what the duplicate-and-merge trick
            does by hand in Picstea.
          </li>
          <li>
            Picstea runs in a browser tab with nothing to install, and it can keep the filter
            editable as a smart filter. Neither tool sends the image anywhere.
          </li>
        </ul>
        <p>
          If GIMP is already installed, its version of the filter needs fewer steps for faint ink.
          For a quick signature on a computer where you can&apos;t install software, Picstea does
          the same job. The <Link href="/gimp-alternative">Picstea vs GIMP</Link> page compares the
          two editors more broadly, and the{" "}
          <Link href="/make-background-transparent">transparent background guide</Link> covers
          photos where the background isn&apos;t a flat colour.
        </p>
        <h2>Questions people ask</h2>
        <h3>Does this work for a logo on a white background?</h3>
        <p>
          Yes, as long as the logo itself has no white in it: Color to Alpha makes every white pixel
          transparent, including white letters inside the logo. Select the logo&apos;s outer area
          first, or use the Magic Eraser for logos with hard edges and white details.
        </p>
        <h3>Can I remove a coloured background the same way?</h3>
        <p>
          Yes. Set Red, Green and Blue to the background colour, for example a green screen or
          yellow notepaper. Ink that is close to that colour becomes transparent too.
        </p>
        <h3>Why does the signature look pale on a dark background?</h3>
        <p>
          The ink is partly transparent after the filter. Duplicate the layer and merge it down, or
          add a Color Overlay in the colour you want, as described above.
        </p>
        <h3>Can I do this for a stack of scanned signatures?</h3>
        <p>
          Partly. Color to Alpha is recorded in an action with its settings, so you can run it over
          many files with <strong>File → Automate → Batch…</strong> and get a ZIP of PNGs. The paper
          colour has to be about the same in every scan. Trim isn&apos;t a step that actions record,
          so the batch keeps the full canvas. See{" "}
          <Link href="/blog/record-actions-and-batch-process-images">
            recording actions and batch processing
          </Link>
          .
        </p>
        <p>
          <EditorLink>Open Picstea</EditorLink> and try it on a photo of your own signature.
        </p>
      </>
    ),
  },
  {
    slug: "prepare-a-photo-for-print",
    title: "How to prepare a photo for print",
    description:
      "Size a photo for print in Picstea: pixels and ppi, A4 and photo presets, a 3 mm bleed with Canvas Size, sharpening, and a PDF the print shop can use.",
    published: "2026-11-28",
    draft: false,
    body: () => (
      <>
        <p>
          To prepare a photo for print in Picstea, work out how many pixels the print needs (inches
          × 300), make a document that size with <strong>File → New…</strong> and a Print or Photo
          preset, place the photo and scale it to fill the page, add bleed with{" "}
          <strong>Image → Canvas Size…</strong> if the shop asks for it, sharpen, and save it with{" "}
          <strong>File → Export As… → PDF</strong>. The PDF page comes out at the physical size you
          set, so the shop receives an A4 page with its size already in the file. Check one thing
          with the shop first: Picstea works in RGB only and can&apos;t convert to CMYK.
        </p>
        <p>
          The example here is a 6000 × 4000 px photo of a mountain lake that I want printed as a
          landscape A4 poster at a local print shop. The shop wants a PDF with 3 mm of bleed on
          every side. The photo stays on your device the whole time and nothing is uploaded.
        </p>
        <h2>How many pixels does a print need?</h2>
        <p>
          Print size is pixels divided by resolution. At 300 pixels per inch (ppi), the usual target
          for prints you hold in your hand, an A4 page (210 × 297 mm) needs 2480 × 3508 px and an 8
          × 10 in photo needs 2400 × 3000 px. My 6000 × 4000 px photo would print at 20 × 13.3 in at
          300 ppi, so it has more than enough pixels for A4.
        </p>
        <p>
          You can check any open image with <strong>Image → Image Size…</strong>. The dialog shows
          the size in pixels and a <strong>Resolution (pixels/inch)</strong> field. If you only type
          a new resolution and leave <strong>Width (px)</strong> and <strong>Height (px)</strong>{" "}
          alone, the pixels stay the same and only the print size changes. The dialog works in
          pixels only, so the inch figure is the sum above: width in px ÷ ppi.
        </p>
        <h2>Which preset do I use for A4 or a photo print?</h2>
        <p>
          Choose <strong>File → New…</strong> (Cmd/Ctrl+Alt+N). The <strong>Print</strong> category
          has A2 to A6, B4, B5, Letter, Legal, Tabloid, a postcard and EU and US business cards. The{" "}
          <strong>Photo</strong> category has the common photo sizes from wallet size up to 24 × 36
          in. They all start at 300 ppi, except 20 × 30 and 24 × 36, which use 150 ppi. That&apos;s
          because of the editor&apos;s size limit: a document can be at most 12,000 px on a side and
          36 megapixels in total, and a 24 × 36 in print at 300 ppi would be 7200 × 10800 px, about
          78 megapixels.
        </p>
        <p>
          For my poster I pick <strong>A4</strong>, then press{" "}
          <strong>Swap width and height</strong> to make it landscape. You can also type your own
          size: set <strong>Units</strong> to millimetres, inches, centimetres or pixels and fill in{" "}
          <strong>Resolution (ppi)</strong>.
        </p>
        <h2>How do I add bleed?</h2>
        <p>
          Bleed is extra image past the trim line, so a slightly off cut doesn&apos;t leave a white
          sliver at the edge. My shop asks for 3 mm a side. At 300 ppi, 3 mm is about 35 px, so the
          page needs 71 px more in each direction (35 on each side, rounded up).
        </p>
        <ol>
          <li>
            Choose <strong>Image → Canvas Size…</strong> and tick{" "}
            <strong>Relative (add to the current size)</strong>.
          </li>
          <li>
            Type 71 in <strong>Width (px)</strong> and 71 in <strong>Height (px)</strong>.
          </li>
          <li>
            Leave the <strong>Anchor</strong> in the centre so the extra canvas is split evenly
            around the page, and press <strong>OK</strong>.
          </li>
        </ol>
        <p>
          The landscape A4 becomes 3579 × 2551 px, which is 303 × 216 mm. If you already know you
          need bleed, you can skip this step and type 303 × 216 mm into the New dialog straight
          away. Either way, the photo has to cover the bleed as well as the A4 area.
        </p>
        <h2>How do I fit the photo to the page?</h2>
        <p>
          Choose <strong>File → Place → Place Embedded…</strong> and pick the photo. Place Embedded
          adds it as a smart object, which is drawn again from the original file at whatever size
          you set, so it stays sharp if you scale it down and then back up while you try framings.{" "}
          <strong>Place Image as Layer…</strong> works too, but it gives you a plain pixel layer.
        </p>
        <p>
          A placed image arrives centred at its full size, so my 6000 px photo hangs far over the
          edges. Press Cmd/Ctrl+T for <strong>Edit → Free Transform</strong>, drag a corner handle
          until the photo just covers the whole canvas, bleed included, move it to frame the lake
          and press Enter. The photo is 3:2 and A4 is closer to 1.41:1, so a little of the top and
          bottom ends up off the page. The{" "}
          <Link href="/docs/transform-warp-and-crop">transform and crop guide</Link> covers the
          handles and the number fields.
        </p>
        <h2>Should I sharpen a photo before printing?</h2>
        <p>
          Usually yes, and as the last step, after scaling: making a photo smaller softens it. With
          the photo layer selected, choose <strong>Filter → Sharpen → Unsharp Mask…</strong>. It has{" "}
          <strong>Amount</strong> (1 to 500%, starting at 100%), <strong>Radius</strong> (0.1 to 100
          px, starting at 1.5) and <strong>Threshold</strong> (0 to 255 levels, starting at 0). For
          a 300 ppi print I start near the defaults and look at 100% zoom. Ink on paper tends to
          look a little softer than the same image on a screen, so I let it look slightly crisp
          there. Raise <strong>Threshold</strong> if smooth areas like sky or skin start to look
          grainy.
        </p>
        <p>
          Because the photo is a smart object, Unsharp Mask is added as a smart filter, and you can
          open it again from the Properties panel to change the amount after a test print. On a
          plain pixel layer the filter changes the pixels for good, so undo is your only way back.
          The <Link href="/docs/smart-objects-and-smart-filters">smart objects guide</Link> explains
          how smart filters are listed and edited.
        </p>
        <p>
          The other approach is <strong>Filter → Other → High Pass…</strong> on a copy: duplicate
          the layer with Cmd/Ctrl+J, run High Pass with a small radius, then set{" "}
          <strong>Blend</strong> in the Properties panel to <strong>Overlay</strong> or{" "}
          <strong>Soft Light</strong> and adjust the layer&apos;s opacity. The{" "}
          <Link href="/sharpen-image">sharpen image guide</Link> compares the sharpening filters.
        </p>
        <h2>Which file do I send to the print shop?</h2>
        <p>
          Choose <strong>File → Export As…</strong> (Cmd/Ctrl+Shift+E) and pick <strong>PDF</strong>
          . Picstea writes one lossless page whose size comes from the document&apos;s resolution,
          so my 3579 × 2551 px document at 300 ppi becomes a 303 × 216 mm page. Picstea doesn&apos;t
          write the ppi into PNG, JPEG or WebP exports, so a shop opening one of those sees only the
          pixel count and has to be told the size.
        </p>
        <p>
          If the shop wants a JPEG, pick <strong>JPEG</strong> and leave <strong>Quality</strong>{" "}
          high; it starts at 90%. Transparent areas turn white in a JPEG, which only matters if the
          photo doesn&apos;t cover the whole canvas. Keep a <code>.picstea</code> project or a PSD
          as well, so you can change the crop or the sharpening after the first print.
        </p>
        <h2>What about CMYK, crop marks and colour proofing?</h2>
        <p>
          Picstea has none of these. Documents are 8-bit RGB, there is no CMYK mode or soft proof,
          and the PDF has no crop marks or bleed box: the bleed is simply part of the page. Ask the
          shop whether they take RGB files and how they want bleed delivered.
        </p>
        <p>
          Photoshop can convert a document with <strong>Image → Mode → CMYK Color</strong>, and its
          Image Size dialog has a Resample checkbox for choosing between changing the pixels and
          changing only the print size. Canva&apos;s <strong>PDF Print</strong> download has a{" "}
          <strong>Crop marks and bleed</strong> option, and its CMYK colour profile is available on
          paid plans. If your shop insists on CMYK, you can prepare the image in Picstea and do the
          conversion in one of those. There is more on how the two compare on the{" "}
          <Link href="/photoshop-alternative">Photoshop alternative</Link> and{" "}
          <Link href="/canva-alternative">Canva alternative</Link> pages.
        </p>
        <h2>Questions people ask</h2>
        <h3>Can Picstea add pixels to a small photo?</h3>
        <p>
          No. Image Size scales layers and has no upscaling filter that adds detail, so a photo that
          is too small for the print stays soft. Print it smaller or find a larger original.
        </p>
        <h3>Can I make a PDF with several pages?</h3>
        <p>
          Not from one document. PDF export writes a single page, so each page needs its own
          document and its own PDF.
        </p>
        <h3>Does the 300 ppi setting survive in a PSD?</h3>
        <p>
          Yes. PSD export writes the document&apos;s resolution, and a <code>.picstea</code> project
          keeps it too. PNG, JPEG and WebP exports don&apos;t. The{" "}
          <Link href="/docs/file-formats">file formats guide</Link> lists what each export keeps.
        </p>
        <p>
          <EditorLink>Open Picstea</EditorLink> and set up your next print.
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
