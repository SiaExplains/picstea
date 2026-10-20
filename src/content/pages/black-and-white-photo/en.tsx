import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "How to make a photo black and white online",
  description:
    "Turn a colour photo black and white in your browser with an adjustment layer you can undo, plus Channel Mixer, duotones and contrast tips. Free and private.",
  lead: "To make a photo black and white in Picstea, open it and choose Layer → New Adjustment Layer → Black & White. The colours turn to grey on a layer of their own, so you can undo it any time. It's free and your photo never leaves your device.",
  faqs: [
    {
      q: "Can I get the colours back?",
      a: "Yes. The black-and-white look is an adjustment layer; hide or delete it and the original colours are back. The photo underneath never changes.",
    },
    {
      q: "How do I make the sky darker, like a red filter?",
      a: "Use a Channel Mixer adjustment layer with Monochrome ticked, and take more of the red channel and less of the blue. Black & White itself has no colour sliders.",
    },
    {
      q: "Can I keep one colour and make the rest grey?",
      a: "Yes. Paint black on the adjustment layer's mask over the part that should stay in colour.",
    },
    {
      q: "Is my photo uploaded?",
      a: "No. Everything runs in your browser. Picstea has no server that receives images.",
    },
  ],
  body: () => (
    <>
      <h2>Make a photo black and white in three steps</h2>
      <ol>
        <li>Open the editor and drop your photo on the page.</li>
        <li>Choose Layer → New Adjustment Layer → Black & White.</li>
        <li>Choose File → Export As… and save the result.</li>
      </ol>
      <h2>Control the tones</h2>
      <ul>
        <li>
          <strong>Channel Mixer</strong> with <strong>Monochrome</strong> ticked lets you decide how
          much each colour adds: more red brightens skin and darkens a blue sky, more green suits
          landscapes.
        </li>
        <li>
          <strong>Curves</strong> or <strong>Levels</strong> above the black-and-white layer add
          contrast — see{" "}
          <Link href="/blog/levels-and-curves-explained">levels and curves explained</Link>.
        </li>
        <li>
          <strong>Gradient Map</strong> maps the greys to two colours for a duotone or a sepia look.
        </li>
        <li>
          <strong>Hue/Saturation</strong> with saturation at −100 is another quick way to remove
          colour.
        </li>
      </ul>
      <h2>Keep one colour</h2>
      <p>
        Every adjustment layer has a mask. Select the Brush, paint with black on the mask over the
        part that should keep its colour — a red coat, a flower — and paint with white to bring the
        grey back.
      </p>
      <h2>Limitations</h2>
      <p>
        The Black & White adjustment converts colours with fixed weights and has no sliders; use
        Channel Mixer when you want to control them. Picstea works in 8-bit RGB, so there is no
        16-bit or greyscale-mode editing.
      </p>
    </>
  ),
};

export default copy;
