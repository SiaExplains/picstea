import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Liquify a photo online",
  description:
    "Use Liquify in your browser to push, twirl, pucker and bloat parts of a photo with a brush, and Reconstruct to undo locally. Free, and nothing is uploaded.",
  lead: "Picstea's Liquify lets you reshape a photo with a brush, like Photoshop: open the photo, choose Filter → Liquify…, pick a tool and paint. Push pixels, twirl them, shrink or grow areas, and undo any spot with Reconstruct. It's free and runs entirely in your browser.",
  faqs: [
    {
      q: "Is it the same as Photoshop's Liquify?",
      a: "It works the same way for the main tools: Forward Warp (push), Twirl Clockwise and Counterclockwise, Pucker, Bloat, Reconstruct and Smooth, with a brush you size with [ and ]. Photoshop's face-aware sliders and freeze masks are not available.",
    },
    {
      q: "Can I change the liquify later?",
      a: "Not after pressing OK — Liquify changes the pixels and can't be a smart filter. Duplicate the layer first (Cmd/Ctrl+J) to keep the original, or undo.",
    },
    {
      q: "Does it work on text or shapes?",
      a: "Liquify works on pixel layers. Rasterize a text or shape layer first (right-click the layer in the Layers panel).",
    },
    {
      q: "Is my photo uploaded?",
      a: "No. Liquify runs in your browser. Picstea has no server that receives images.",
    },
  ],
  body: () => (
    <>
      <h2>Liquify a photo in four steps</h2>
      <ol>
        <li>
          Open the editor and drop your photo on the page; duplicate the layer (Cmd/Ctrl+J) to keep
          the original.
        </li>
        <li>Choose Filter → Liquify…. The photo opens in Liquify&apos;s own preview.</li>
        <li>
          Pick a tool, set the brush size with [ and ], and paint. Watch the preview as you go.
        </li>
        <li>Press OK to apply, then export with File → Export As….</li>
      </ol>
      <h2>The tools</h2>
      <ul>
        <li>
          <strong>Forward Warp</strong> — pushes pixels in the direction you drag: smooth a line,
          lift a corner, nudge a curve.
        </li>
        <li>
          <strong>Twirl Clockwise</strong> and <strong>Twirl Counterclockwise</strong> — rotate
          pixels under the brush, for swirls and creative effects.
        </li>
        <li>
          <strong>Pucker</strong> — pulls pixels towards the centre of the brush, making an area
          smaller.
        </li>
        <li>
          <strong>Bloat</strong> — pushes pixels away from the centre, making an area larger.
        </li>
        <li>
          <strong>Reconstruct</strong> — paints the original back, gradually.{" "}
          <strong>Smooth</strong> evens out bumpy distortions.
        </li>
      </ul>
      <h2>Tips</h2>
      <ul>
        <li>Use a large, soft brush and several light strokes; small brushes make ripples.</li>
        <li>
          Liquify only the active layer. For a smaller area, select it first so the rest of the
          photo can&apos;t move.
        </li>
        <li>
          Every other filter is in the <Link href="/docs/filters">filters guide</Link> and on the{" "}
          <Link href="/photo-filters">photo filters</Link> page.
        </li>
      </ul>
      <h2>Limitations</h2>
      <p>
        There is no face-aware Liquify and no freeze or thaw masks. Liquify changes pixels directly,
        so it can&apos;t be used as a smart filter. Images can be up to 36 megapixels.
      </p>
    </>
  ),
};

export default copy;
