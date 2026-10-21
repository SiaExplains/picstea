# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [0.42.0] — 2026-10-21

### Added

- **GoAll.ai is the fourth sponsor.** Its short silent video joins FocusCrew's, Emojar's and
  WikiDigit's beside the canvas.

### Changed

- **The sponsorships beside the canvas are picked at random on every visit**: three of the four,
  each in a random position, instead of the same order shifting once a day. Each sponsor is shown
  about as often as the others, and the choice stays put while you work.

## [0.41.0] — 2026-10-20

### Added

- **Picstea speaks Spanish, Portuguese (Brazil) and German.** The editor — menus, tools, panels,
  dialogs, filters and messages — and the guide, how-to, converter and comparison pages, the FAQ
  and the About page are available at /es, /pt-br and /de. English addresses don't change.
- Switch languages from the site header or from Help → Language in the editor. Picstea remembers
  a language you pick and opens the editor in it; it never guesses from your browser.
- The translations were made with machine translation and haven't been reviewed by native
  speakers yet; corrections are welcome. The documentation, blog and legal pages stay in English.

## [0.40.0] — 2026-10-20

### Added

- **Four new comparisons:** Picstea vs GIMP, Pixlr, Canva and Photoshop Express. Each has a
  side-by-side table (facts checked on each product's own site in October 2026), what Picstea
  does better, and an honest section on where the other product is the better choice.
- A "Comparisons" row in the site footer, and the Photoshop and Photopea pages now link to the
  other comparisons, guides and tools.

## [0.39.0] — 2026-10-20

### Added

- **Six how-to guides:** blur a photo background, make a background transparent, add text to a
  photo, make a photo black and white, sharpen an image, and Liquify. Each one has step-by-step
  instructions with the exact menus, tips, honest limits and a short FAQ. They're linked from a
  new "How-to guides" row in the site footer and from every guide and converter page.

## [0.38.0] — 2026-10-20

### Added

- **HEIC photos open in Picstea.** iPhone photos (.heic, .heif) open like any other image, the
  right way up, and can be placed as layers, converted and used in batches. The first one loads a
  2 MB decoder from Picstea's own site; it runs on your device and is then kept for offline use.
- **Convert HEIC to JPG** at /convert/heic-to-jpg.
- The About page lists the open-source software Picstea uses (libheif) and its licence.

### Fixed

- The About page and the newer guide and converter pages had the editor's stricter security
  policy, so Google ads would have been blocked there once ads are switched on. They now get the
  website policy like the other pages, and a test catches any page that's missed.

## [0.37.0] — 2026-10-20

### Added

- **File → Convert…** turns PNG, JPEG, WebP, GIF, SVG and Photoshop files into PNG, JPEG or WebP
  without opening them. Convert one file, or up to 200 at once and get them back in one ZIP file.
  Nothing is uploaded or kept in the browser.
- **Converter pages** for WebP to PNG, WebP to JPG, PNG to JPG, JPG to PNG, PNG to WebP, SVG to PNG
  and PSD to PNG, plus an overview at /convert. Their "Convert now" button opens the converter in
  the editor, ready to go.

## [0.36.0] — 2026-10-20

### Added

- **Six new guide pages** for common jobs: editing PNG, JPEG and WebP images (including
  converting WebP to PNG or JPEG), resizing an image, compressing an image and photo filters.
  Each one has step-by-step instructions, honest limits and a short FAQ. They're linked from a
  new Tools row in the site footer, from the welcome dialog and from each other.

### Fixed

- The online photo editor page no longer says Picstea can't work offline. It can, once it's
  installed as an app.

## [0.35.0] — 2026-10-20

### Added

- **The welcome dialog has an "About Picstea" section.** Open it to read what Picstea does, why
  your images stay on your device, which files it opens and saves, answers to common questions and
  links to the guides. It starts closed, so starting to edit is still one click.

## [0.34.0] — 2026-10-20

### Added

- **Emojar is the third sponsor.** Its short silent video joins FocusCrew's and WikiDigit's
  beside the canvas, second in the daily rotation, so all three sponsorship slots are booked.

### Changed

- Sponsorship tiles in the side column shrink to fit the screen's height, so all three videos
  always show in full and stay square.

## [0.33.1] — 2026-10-20

### Changed

- **FocusCrew's sponsorship has a new video** ("Too many tabs?"), with a new still frame for
  people who prefer reduced motion. It still links to focus-crew.com.
- The engineering handbook (`docs/`) is brought up to date with the recent work: layer styles,
  Blend If, menus, image commands, sponsorship slots, the dark website and the filter catalogue.

## [0.33.0] — 2026-10-19

### Added

- **The full Filter menu**, laid out like Photoshop and Photopea. Filter Gallery, Lens
  Correction and Camera Raw sit at the top, followed by the 3D, Blur, Blur Gallery, Distort,
  Noise, Pixelate, Render, Sharpen, Stylize, Other and Fourier submenus. That's more than 60
  filters, all with a live preview, and all usable as smart filters.
- **Liquify**: push, twirl, pucker and bloat pixels with a brush in its own preview. Reconstruct
  and Smooth soften the change.
- **Vanishing Point**: mark a flat surface in perspective, then clone inside it. The copy
  shrinks as it moves into the distance.
- Filter dialogs can offer a list of options (for example Spin or Zoom for Radial Blur). Long
  dialogs such as Camera Raw now scroll on small screens.

### Changed

- Filter → Pixelate → Pixelate is now called **Mosaic**, as in Photoshop. Smart filters that
  already use it keep working.

## [0.32.0] — 2026-10-19

### Added

- **WikiDigit is Picstea's second sponsor.** Its short silent video appears beside the canvas
  and on the start screen. FocusCrew and WikiDigit take turns in the top slot each day.

## [0.31.4] — 2026-10-19

### Fixed

- **CI checks pass again.** `pnpm typecheck` failed on a fresh checkout because the route types
  Next.js generates (`PageProps`, `LayoutProps`) only existed after a build. It now runs
  `next typegen` first. This failure had kept the GitHub `verify` check red.

## [0.31.3] — 2026-10-19

### Fixed

- **The end-to-end tests run on any port.** The network checks treated every request that wasn't
  on port 3100 as leaving the app, so setting `E2E_PORT` failed six tests. They now compare
  against the configured base URL.
- **The large-document painting test no longer fails at random.** It failed when one task ran a
  little over 200 ms under a parallel run. It now fails only when many moves block, or when total
  blocking exceeds one second. That still catches the original ~250 ms-per-move slowdown.

## [0.31.2] — 2026-10-19

### Fixed

- **Offline, the editor no longer logs a failed image request.** A file that started loading just
  before the offline support took over (the Picstea logo in the menu bar) sometimes wasn't saved
  for offline use; now every file the page loads on the first visit is saved.

## [0.31.1] — 2026-10-19

### Added

- A blog post: "Layer styles, Blend If and the Image menu".

## [0.31.0] — 2026-10-19

### Changed

- **Sponsorships beside the canvas are just the ad.** There's no card, title or description,
  just a small "Sponsored" label over the image or video. Empty slots are short "Your ad here"
  tiles, so the column takes much less space.
- **The website uses the editor's dark theme**: About, Blog, Docs and every other page.

### Fixed

- Going online again after working offline no longer logs an error for the sponsor's image.

## [0.30.0] — 2026-10-19

### Added

- **Three sponsorship slots** in the editor's side column on wide screens. The first sponsor,
  FocusCrew, is shown with a short silent video. Empty slots invite sponsors.
- Sponsorships can be short, silent, looping videos, hosted on Picstea's own site. They stay
  still when your device asks for reduced motion.

### Changed

- The FAQ, About, privacy and sponsorship pages now describe the sponsorships beside the
  canvas.

## [0.29.0] — 2026-10-19

### Added

- **Image → Image Size…** scales the whole image. Layers keep their original pixels, so
  shrinking and enlarging again loses nothing.
- **Image → Canvas Size…** adds or removes canvas around the image. Pick one of nine anchors, or
  add a relative amount.
- **Image → Image Rotation** turns or flips the whole canvas, with every layer, mask, path and
  guide.
- **Image → Trim… and Reveal All.**
- **Image → Auto Tone, Auto Contrast and Auto Color** add a Levels adjustment layer set from the
  image, so the result stays editable. Shortcuts: Cmd/Ctrl+Shift+L and Cmd/Ctrl+Alt+Shift+L.
- **Image → Duplicate** opens a copy of the document in a new tab.

## [0.28.0] — 2026-10-19

### Added

- **Submenus in the menu bar.** Related commands are grouped, as in Photoshop. Examples:
  - Layer → New, Arrange, Align and Colour Label;
  - Filter → Blur;
  - View → Guides.

  Long menus no longer scroll. Arrow Right opens a submenu, and Arrow Left or Escape goes back.

- **Edit → Copy Merged** copies what you see in the selection, from every layer.
- **Edit → Stroke…** paints a line along the selection: inside, centered or outside, any width,
  in any colour.
- **Select → Grow and Similar** add pixels of matching colours, using the Magic Wand's tolerance.
- **Window menu** to bring the Layers, Properties, History, Swatches or Actions panel forward.
- **Layer → Colour Label** and **Layer → New → Layer via Copy** in the menu bar.
- **An About page** (`/about`), linked from Help → About Picstea, the menu bar and the site
  footer.

### Changed

- **Adjustment layers moved.** They are now under Layer → New Adjustment Layer and
  Image → Adjustments, instead of their own menu.
- **Flip moved** to Edit → Transform.
- **Highlighted menu items** show their shortcuts at full contrast.

## [0.27.0] — 2026-10-19

### Added

- **Blend If.** In Layer Style → Blending Options, two sliders hide a layer's pixels by their own
  brightness (This Layer) or by what is beneath them (Underlying Layer), for grey or for red,
  green or blue. Alt-drag splits a slider for a smooth transition.
- **Channels.** Turn off R, G or B so the layer only changes the channels you choose.
- Photoshop files keep both settings on import and on export.

### Changed

- Saved projects use format version 8.

## [0.26.0] — 2026-10-19

### Added

- **The full Layer Style dialog.** All ten Photoshop effects, with their full options:
  - **New effects:** Inner Glow, Satin and Pattern Overlay.
  - **Options on every effect:** its own blend mode, spread or choke, contours, noise, range and jitter.
  - **Gradients:** five gradient styles, with perceptual and linear blending.
  - **Strokes:** inside, center or outside, filled with a colour or a gradient.
  - **Bevel & Emboss:** outer bevel, emboss, pillow and stroke emboss, with Contour and Texture.
- **Several copies of an effect.** The + button adds another Drop Shadow, Inner Shadow, Stroke,
  Color Overlay or Gradient Overlay. Copies can be reordered or deleted.
- **Fill Opacity and Global Light** in Blending Options.
- **Saved styles.** New Style… keeps a style in this browser. The Styles page applies a saved or
  built-in style, or clears the layer's style.
- **A live preview** in the dialog, an angle dial and an editable contour curve.
- **Photoshop files:** every layer style setting and copy is now imported, including Inner Glow,
  Satin, Pattern Overlay, Fill and the global light.

### Changed

- **Saved projects use format version 7.** Older projects open and look the same.
- **Bevel highlights now face the light,** as in Photoshop.
- **New effects start from Photoshop's defaults.** For example, a 5 px drop shadow in Multiply.
- **Groups can have layer styles too.**

## [0.25.0] — 2026-10-19

### Added

- **Picstea works offline.** After you have opened it once, the editor also opens without an
  internet connection, with your saved projects.
- **Install Picstea as an app.** In Chrome and Edge an Install button appears on the start
  screen, and Help → Install Picstea… explains how to install in other browsers. Installed, it
  opens in its own window like a desktop app.

## [0.24.1] — 2026-10-19

### Changed

- The website's canonical address is now `https://www.picstea.com` everywhere, matching where the
  site is served. A launch checklist lists the remaining dashboard steps.

## [0.24.0] — 2026-10-19

### Added

- **Easier to find in search and AI assistants.** New pages comparing Picstea with Photoshop and
  Photopea, a FAQ page, and an `llms.txt` summary that AI assistants can read.
- **A preview image** when Picstea pages are shared on social media and in chats.
- "More guides" at the end of every guide, and previous/next links in the documentation.

### Fixed

- Shared links to docs, guides and landing pages now always carry the site name and preview
  image.

## [0.23.0] — 2026-10-19

### Added

- **Tool groups like Photoshop's.** Related tools share a toolbar slot: right-click it or hold
  the mouse on it to choose another, or press Shift with its key to go through them.
- **New tools:** Spot Healing Brush, Red Eye, Background Eraser, Magic Eraser, Color
  Replacement, Color Sampler, Ruler, Path Selection, Add / Delete Anchor Point, Convert Point,
  Rounded Rectangle and Polygon.
- Dodge, Burn, Sponge, Blur, Sharpen, Smudge, the elliptical marquee and the polygonal lasso are
  now tools of their own in the toolbar.
- A **default colours** button (black and white, D) next to the swap button.

## [0.22.0] — 2026-10-19

### Added

- **Right-click a layer** for Blending Options, Select Pixels, Duplicate, Delete, smart objects,
  Rasterize, clipping masks, Merge Down, Flatten Image and colour labels.
- **Merge Down** (Cmd/Ctrl+E), **Flatten Image** and **Rasterize Layer Style**, also in the Layer
  menu.
- **Colour labels** to organise the Layers panel. They are saved in projects and PSD files.
- **Layer Style dialog:** double-click a layer (or Layer → Blending Options…) to set the blend
  mode, opacity and every effect in one place. Cancel puts everything back; OK is one undo step.
- **Drag layers onto the trash** to delete them, or onto New Layer to duplicate them.
- **Resizable panels:** drag the edges between Properties, History and Layers, or the column's
  edge. Picstea remembers the sizes. The Layers panel is bigger by default.

### Fixed

- Sponsorship links are checked more strictly, so a malformed link can never point to another
  site.

## [0.21.0] — 2026-10-19

### Added

- **A side column in the editor** on wide screens, with a sponsorship space and a Privacy
  settings button. Like everything in the editor it runs no third-party code.
- **Website links in the menu bar:** About, Learn, Shortcuts and Blog on the right. They open in a
  new tab, so your work stays where it is.
- Help → Keyboard Shortcuts and Help → Privacy Settings….

## [0.20.0] — 2026-10-18

### Changed

- **New teal look.** A new Picstea logo — a steaming cup with a tea leaf — on the website, in the
  editor, as the browser icon and on phone home screens. Buttons, links and highlights are teal
  to match.

## [0.19.1] — 2026-10-18

### Fixed

- The Picstea logo in the editor's menu bar was too small to read. It is now the square app icon.

## [0.19.0] — 2026-10-18

### Added

- **Ready for Google AdSense.** The site now serves `/ads.txt` and the AdSense verification tag as
  soon as a publisher ID is configured, so Google can approve the site without ads running in the
  editor.
- **Optional Google consent message.** Setting `NEXT_PUBLIC_ADSENSE_CMP=google` switches ad
  consent on website pages to Google's certified consent message, which allows personalised ads
  in Europe. The default is unchanged: Picstea's own banner and non-personalised ads.

## [0.18.0] — 2026-10-18

### Added

- **The blog is live.** Eleven guides are now published: editing PSDs without uploading them,
  choosing between PNG, JPEG and WebP, layers and masks, Levels and Curves, the Pen tool, smart
  objects, actions and batch processing, retouching, working with several layers, and the newer
  colour adjustments. They are listed in the sitemap.

### Fixed

- The two PSD articles now describe what Picstea opens today: editable text, adjustment layers,
  smart objects and clipping masks are kept, and only a few features (such as Selective Color,
  satin styles and warped text) still open as pixels.

## [0.17.0] — 2026-10-18

### Changed

- **MYLPER is now Picstea.** New name, new logo and icons, and a new home at picstea.com.
  The editor works exactly as before. Edit Boldly. Create Freely.
- Buttons, links and highlights use the blue from the new logo.
- Projects are now saved as `.picstea` files, and exported actions as `picstea-actions.json`.

### Removed

- `.mylper` project files and settings saved under the old name are no longer read.

## [0.16.1] — 2026-10-18

### Changed

- Large images no longer freeze the page while you export, use the Magic Wand or Paint Bucket,
  or move the Color Range slider. The work now happens in the background, and the result is
  exactly the same as before. On a 24-megapixel image, exporting a PSD used to stop the page for
  about two seconds; now the page stays responsive.
- Retouching tools (Clone Stamp, Healing Brush, Dodge, Burn, Sponge, Blur, Sharpen and Smudge)
  start instantly on large layers, because they read only the part of the image you paint over.

## [0.16.0] — 2026-10-17

### Added

- **Size presets for new documents.** File → New now shows ready-made sizes in seven groups:
  Social (Instagram, TikTok, Facebook, YouTube, X, LinkedIn, Pinterest), Print (A2–A6, B4, B5,
  Letter, Legal, Tabloid, business cards, postcards), Photo, Screen, Mobile, Ads and Icons. Each
  one shows a small preview of its shape.
- Search for a size by name or numbers, such as “story”, “A4” or “1080”.
- Enter sizes in pixels, inches, centimetres or millimetres, set the resolution (ppi), swap
  width and height, and pick any background colour. The pixel size and memory use are shown as
  you type.
- The sizes you create most recently appear under Recent.

## [0.15.1] — 2026-10-09

### Fixed

- Text on blue buttons, pressed buttons and highlighted menu items now has enough contrast to
  read comfortably (WCAG AA).
- The History, Swatches and Actions tabs are announced correctly by screen readers.
- Several page titles and descriptions were too long for search results.

### Changed

- If the editor ever crashes, it now saves your open documents before showing the error.
- The site asks browsers to always use HTTPS.
- Automated accessibility, keyboard and site checks run with every change.

## [0.15.0] — 2026-10-09

### Added

- **New adjustment layers**: Vibrance, Color Balance, Photo Filter, Channel Mixer and Gradient
  Map (with up to 16 colour stops).
- **New layer effects**: inner shadow, bevel and gradient overlay.
- PSD files with these adjustments and styles now open with them editable, and Vibrance, Color
  Balance and Channel Mixer are saved back to PSD as adjustment layers.

### Changed

- The project format moved to version 6. Older projects open as before.

## [0.14.0] — 2026-10-09

### Added

- **Select several layers**: Cmd/Ctrl-click and Shift-click in the Layers panel, Select → All
  Layers (Cmd/Ctrl+Alt+A), or Shift-click on the canvas with the Move tool.
- Selected layers **move, scale, rotate, flip, group, duplicate and delete together**, each as one
  undo step.
- **Groups can now be scaled and rotated** with the Move tool.
- **Layer → Distribute**: horizontal or vertical centres, or equal spacing. **Align** now lines up
  several layers with each other.
- Align and distribute buttons in the Move tool's options bar and the Properties panel.

### Changed

- The Layers panel keeps more room on short windows.

## [0.13.0] — 2026-10-09

### Added

- **Clone Stamp** (S): Alt-click a source, then paint to copy it. Aligned or fixed source; sample
  the current layer or everything visible (great on an empty layer).
- **Healing Brush** (J): paint over spots and blemishes; the patch takes on the surrounding
  colour and brightness while keeping the copied texture.
- **Dodge, Burn and Sponge** (O): lighten or darken shadows, midtones or highlights, or change
  saturation, with a brush.
- **Blur, Sharpen and Smudge** (R): soften, crisp up or push pixels with a brush.
- Docs: "Retouching".

### Fixed

- The feature status listed swatches and PSD vector mask export as planned; both had shipped.

## [0.12.0] — 2026-10-09

### Added

- **Actions**: record a series of edits (filters, adjustment layers, selections, fills, new
  layers, flips, alignment, crop) in the Actions panel and play them on any document. A played
  action is one undo step. Export and import actions as a file.
- **File → Batch…**: play an action on up to 200 images at once and save the results as one ZIP
  (PNG, JPEG or WebP). Everything happens on your device.
- **History panel**: see every step and jump back or forward to any of them.
- **Colour picker** for the foreground and background colours, with exact Hex, RGB and HSB
  values.
- **Swatches panel**: click to use a colour, Alt-click for the background, add your own.
- Docs: "Actions, batch processing, colours and history".

### Changed

- History, Swatches and Actions share a new tabbed panel between Properties and Layers.

## [0.11.0] — 2026-10-09

### Added

- **Much better PSD import**: Photoshop text opens as editable text; adjustment layers (Levels,
  Curves, Brightness/Contrast, Hue/Saturation, Exposure, Invert, Posterize, Threshold, Black &
  White) as adjustment layers; shape and fill layers as shapes and fills; smart objects with
  embedded images or PSDs as smart objects; vector masks as vector masks; drop shadow, outer
  glow, stroke and colour overlay styles as effects.
- **Better PSD export**: adjustment layers and vector masks are now saved as Photoshop
  adjustment layers and vector masks instead of being flattened.

### Changed

- When a PSD opens, the notice lists exactly which Photoshop features were simplified.

## [0.10.0] — 2026-10-09

### Added

- **Smart objects**: Layer → Convert to Smart Object keeps a layer's original inside it, so
  scaling and rotating never lose quality. Double-click the thumbnail (or Layer → Edit
  Contents) to edit the contents in their own tab; saving or closing it updates the smart
  object as one undo step.
- **File → Place Embedded…** adds an image, SVG, PSD (with its layers) or MYLPER project as a
  smart object.
- **Smart filters**: filters on a smart object can be hidden, edited, reordered or deleted later
  in the Properties panel.
- **Layer → Rasterize Layer** for smart objects, shapes and text.
- Docs: "Smart objects and smart filters".

### Changed

- The project format moved to version 5. Older projects open as before.

## [0.9.0] — 2026-10-09

### Added

- **Pen tool** (P): click for corners, drag for curves, click the first point to close. In Shape
  mode it creates a shape layer; in Path mode it draws the work path.
- **Direct Selection tool** (A): move points and curve handles, switch points between corner
  and smooth, delete points, nudge with the arrow keys.
- **Paths and selections**: Make Selection from Path (Cmd/Ctrl+Enter) and Make Work Path from
  Selection.
- **Vector masks**: hide a layer outside a path with smooth edges (Layer → Add Vector Mask from
  Path). They move with the layer and stay editable.
- **Clipping masks** (Cmd/Ctrl+Alt+G): show a layer only where the layer below has pixels.
  Clipping is also read from and written to PSD files.
- Docs: "Paths and the Pen tool"; clipping and vector masks in the layers guide.

### Changed

- The project format moved to version 4. Older projects open as before; projects saved with
  this version need this version or later.

## [0.8.0] — 2026-10-09

### Added

- **Rulers, guides and grid** (View menu). Drag a guide out of a ruler, move it with the Move
  tool, drag it back onto the ruler to delete it, or place one exactly with View → New Guide….
  Guides are saved with the project and never exported.
- **Snapping with smart guides**: moving and resizing layers, drawing selections and shapes,
  the crop box and guides snap to guides, the grid, the canvas edges and centre, and other
  layers. Pink lines show what snapped. Hold Cmd/Ctrl while dragging to place freely, or turn
  it off with View → Snap.
- **Layer → Align**: line the active layer up with the canvas, or with the selection.
- **Filter menu**: Gaussian Blur, Box Blur, Motion Blur, Unsharp Mask, Add Noise, Pixelate,
  Emboss and Find Edges, with a live preview on the canvas. With a selection, only the selected
  area changes. Filter → Last Filter repeats the previous one. Filters run in the background.
- **Levels and Curves** adjustment layers, per channel, with a histogram of the image beneath.
  Curve points can be dragged, typed or moved with the arrow keys.
- Docs: "Rulers, guides, grid and snapping" and "Filters".

### Changed

- New keyboard shortcuts: Cmd/Ctrl+R rulers, Cmd/Ctrl+; guides, Cmd/Ctrl+' grid,
  Cmd/Ctrl+Shift+; snap, Cmd/Ctrl+Option/Alt+F last filter.

## [0.7.0] — 2026-10-09

### Added

- **Website**: documentation (getting started, layers and masks, selections, painting, file
  formats, keyboard shortcuts, privacy), guides for online photo editing and PSD editing, and a
  blog. Help → Documentation and Help → Blog open them from the editor.
- **Privacy choices**: on website pages, Google ads are only loaded if you agree. Accept, reject
  or choose per category, and change it any time with "Privacy settings" at the bottom of every
  page. The editor never loads advertising or third-party code.
- **Sponsorships**: MYLPER's own sponsorships, clearly labelled and without tracking, on the
  website and on the editor's start screen.
- Legal pages (privacy, cookies, terms, imprint, advertising) as drafts.

## [0.6.0] — 2026-10-09

### Changed

- **Much faster with large images.** On a 6000 × 4000 image with an adjustment layer, a brush
  stroke went from 36 seconds to under a second and dragging a layer from 28 seconds to about
  one. The canvas now draws only what you see, at screen resolution, and reuses the layers you
  aren't changing.
- While you paint or drag on a very large image, the view may briefly show a softer preview;
  it sharpens as soon as you pause ("Rendering…" in the status bar).
- Opening PSDs, exporting PSD and PDF, the magic wand and the paint bucket do their heavy work
  in the background, so the page stays responsive.
- Very large images show a short note when opened, and the memory set aside for undo follows
  how much memory your device has.
- Long operations show a "Working" overlay.

### Fixed

- The welcome dialog could reappear after a quick reload.

## [0.5.0] — 2026-10-09

### Added

- **Photoshop (PSD) files**: open layered PSDs with their layers, groups, names, opacity,
  visibility, blend modes and layer masks, and export your work as a layered PSD. Text and smart
  objects from Photoshop open as pixels, and anything MYLPER can't keep is listed when you open
  the file. 8-bit RGB and greyscale files are supported.
- **Project files**: File → Save Project As… (Cmd/Ctrl+Shift+S) saves a `.mylper` file with
  everything in it, to keep a backup or move a project to another computer or browser. Open it
  with File → Open.
- **SVG**: export keeps shapes and text as vectors (other layers are embedded as images); SVG
  files open as images.
- **PDF export**: a one-page PDF at the document's resolution.
- **GIF** images open (first frame).
- The export dialog says what each format keeps.

### Changed

- File → Open, drag and drop and Place Image accept all these formats. Files are recognised by
  their contents, not their names. TIFF and PDF files explain that they can't be opened yet.

## [0.4.0] — 2026-10-09

### Added

- **Selections**: Marquee (rectangle or ellipse, M), Lasso (freehand or polygonal, L) and Magic
  Wand (W). Hold Shift to add, Alt to subtract, or both to keep only the overlap. Drag inside a
  selection or use the arrow keys to move it.
- **Select menu**: All, Deselect, Reselect, Inverse, Color Range…, Feather…, Expand…, Contract…
  and Transform Selection (scale and rotate the selection with handles).
- **Working with a selection**: painting, fills and gradients stay inside it. Delete clears the
  selected pixels, Edit → Fill (Shift+F5) fills them, Cut, Copy and Paste work with them, and
  Cmd/Ctrl+J puts them on a new layer. Add Layer Mask with a selection makes a mask from it, and
  Image → Crop to Selection crops to it.
- **New tools**: Pencil (hard-edged pixels, N), Paint Bucket (Shift+G), Gradient (linear or
  radial, G) and Eyedropper (I). Alt-click with the brush or pencil also picks a colour.
- Selections can be undone like any other change. They are not saved with the project.

### Fixed

- The MYLPER logo in the menu bar could appear on a light box and be hard to read in some
  browsers.

## [0.3.0] — 2026-10-08

### Added

- **Layer groups**: group a layer with Cmd/Ctrl+G and ungroup with Cmd/Ctrl+Shift+G. You can also
  make a new empty group, nest groups inside groups, and collapse them in the Layers panel.
  Groups pass blending through by default. Give a group opacity, a blend mode, a mask or effects
  to treat it as one unit. Moving a group moves everything in it.
- **Drag and drop in the Layers panel**: drag a layer above or below another, or into a group.
  Bring Forward / Send Backward also move layers into and out of groups.
- **Layer masks**: Layer → Add Layer Mask. Click the mask thumbnail and paint black to hide or
  white to reveal (greys give partial transparency). Shift-click the thumbnail to turn the mask
  off for a moment. A mask follows its layer when you move it.
- **Adjustment layers** (Adjustments menu): Brightness/Contrast, Hue/Saturation, Exposure,
  Temperature/Tint, Black & White, Invert, Posterize and Threshold. They change the look of
  everything below them without touching the pixels, and each comes with a mask.
- **Layer effects**: drop shadow, outer glow, outer stroke and colour overlay, with live
  controls in the Properties panel. Layers with effects show an "fx" badge.

- The MYLPER logo in the menu bar, plus a favicon and app icons.
- A short welcome dialog on your first visit that explains MYLPER. Open it again from the logo or
  Help → Welcome to MYLPER.

### Changed

- The editor now opens straight away at the home page. The old text-heavy landing page is gone,
  and old `/editor` links forward to the home page.
- The project format moved to version 3. Projects saved with earlier versions open automatically.
- Alt+↑ / Alt+↓ select the layer above or below.

## [0.2.0] — 2026-10-08

### Added

- **Brush and eraser** with adjustable size, hardness and opacity. Paint on new transparent
  layers (Layer → New Layer). Every stroke can be undone. Use `[` and `]` to resize the brush.
- **Shapes**: rectangles (with rounded corners), ellipses and lines. They stay editable: change
  fill, stroke and corner radius at any time.
- **Text**: click with the Text tool and type straight on the canvas. Choose font, size, bold,
  italic, colour, alignment, line height and letter spacing. Click a text layer to edit it again.
- **Move and free transform**: drag layers, scale with handles (Shift keeps proportions, Alt
  scales from the centre), rotate by dragging outside a corner, flip horizontally or vertically,
  or type exact position, size and angle. Arrow keys nudge.
- **Crop**: drag the crop box and press Enter. Pixels outside the canvas are kept, so
  you can move them back in later.
- **Export** as PNG, JPEG or WebP (File → Export As…). The image is created on your device and
  saved directly. Nothing is uploaded.
- Foreground and background colours in the toolbar (X swaps them, D resets them).

### Changed

- Layer → New Layer now adds an empty pixel layer. Solid colour layers are under Layer → New Fill Layer.
- The Move tool is now the default tool.
- The project format moved to version 2. Projects saved with 0.1.0 open automatically.

### Fixed

- A dialog reopened quickly could close itself straight away.

## [0.1.0] — 2026-10-08

### Added

- First version of the MYLPER editor at `/editor`. Create documents, open PNG, JPEG and WebP images
  (file picker, drag and drop or paste), and work with layers: add, rename, duplicate, reorder,
  hide, lock, change opacity, blend mode and fill colour.
- Undo and redo for every edit, with keyboard shortcuts.
- Zoom and pan: zoom tool, hand tool, Space-drag, mouse wheel, trackpad pinch, fit to screen and 100%.
- Automatic saving in your browser, a list of recent projects, and restore after reload. Nothing is
  uploaded: images never leave your device.
- Landing page with structured data, sitemap and robots rules.
- Engineering foundation: TypeScript, lint, unit and end-to-end tests, CI, security headers, and
  architecture decision records.
