import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Hintergrund online transparent machen",
  description:
    "Entferne einen schlichten Hintergrund von Hand mit dem Magischen oder Hintergrund-Radiergummi und speichere ein transparentes PNG oder WebP. Kostenlos.",
  lead: "Picstea macht einen Hintergrund von Hand transparent, nicht per KI: Klick mit dem Magischen Radiergummi auf einen schlichten Hintergrund, säubere die Kanten mit dem Hintergrund-Radiergummi und exportiere ein PNG. Das ist kostenlos, läuft in deinem Browser, und nichts wird hochgeladen.",
  faqs: [
    {
      q: "Entfernt Picstea Hintergründe automatisch?",
      a: "Nein, noch nicht. Es gibt keine KI-Hintergrundentfernung; du entfernst den Hintergrund mit den Radiergummis oder einer Auswahl. Das klappt am besten bei schlichten, gleichmäßig gefärbten Hintergründen wie Produktfotos und Logos.",
    },
    {
      q: "Welches Format behält die Transparenz?",
      a: "PNG (verlustfrei) oder WebP (kleiner). JPEG kennt keine Transparenz, transparente Bereiche werden dort weiß.",
    },
    {
      q: "Woran erkenne ich, dass der Hintergrund wirklich weg ist?",
      a: "Transparente Bereiche zeigen auf der Arbeitsfläche ein grau-weißes Schachbrettmuster. Alles, was über dem Schachbrett noch sichtbar ist, landet auch im exportierten Bild.",
    },
    {
      q: "Wird mein Bild hochgeladen?",
      a: "Nein. Alles passiert in deinem Browser. Picstea hat keinen Server, der Bilder empfängt.",
    },
  ],
  body: () => (
    <>
      <h2>Einen schlichten Hintergrund in vier Schritten entfernen</h2>
      <ol>
        <li>Öffne den Editor und zieh dein Bild auf die Seite.</li>
        <li>
          Wähle den Magischen Radiergummi (in der Radiergummi-Gruppe der Werkzeugleiste) und klick
          auf den Hintergrund. Alle zusammenhängenden Pixel mit ähnlicher Farbe werden transparent;
          erhöhe die Toleranz in der Optionsleiste, falls etwas stehen bleibt.
        </li>
        <li>
          Säubere die Reste an den Kanten mit dem Hintergrund-Radiergummi: Er löscht Farben, die der
          Farbe unter der Pinselmitte ähneln, und behält den Rest.
        </li>
        <li>Wähle Datei → Exportieren als…, nimm PNG oder WebP und speichere.</li>
      </ol>
      <h2>Bei unruhigen Hintergründen: stattdessen das Motiv auswählen</h2>
      <ol>
        <li>
          Umfahre das Motiv mit dem Lasso oder Polygon-Lasso (oder wähle den Hintergrund mit dem
          Zauberstab oder Farbbereich aus und nimm Auswahl → Auswahl umkehren).
        </li>
        <li>
          Wähle Auswahl → Auswahl umkehren, damit der Hintergrund ausgewählt ist, und drück dann
          Entf.
        </li>
        <li>
          Du willst den Hintergrund für später behalten? Nimm statt Löschen eine Ebenenmaske: Alles,
          was die Maske verbirgt, wird im Export transparent, und du kannst sie jederzeit neu malen.
        </li>
      </ol>
      <h2>Tipps</h2>
      <ul>
        <li>
          Zoome an die Kanten heran; eine weiche Kante von 1–2 Pixeln verhindert harte, zackige
          Umrisse.
        </li>
        <li>
          Logos auf Weiß: Filter → Sonstige → Farbe zu Alpha macht Weiß transparent und behält dabei
          weiche Kanten.
        </li>
        <li>
          Ebenenmasken werden in{" "}
          <Link href="/blog/layers-and-masks-explained">Ebenen und Masken erklärt</Link> (auf
          Englisch) beschrieben.
        </li>
      </ul>
      <h2>Einschränkungen</h2>
      <p>
        Ohne KI brauchen Haare, Fell und Hintergründe, die Farben mit dem Motiv teilen, Geduld. Ein
        Werkzeug zum Kante-Verbessern oder &quot;Motiv auswählen&quot; gibt es noch nicht.
      </p>
    </>
  ),
};

export default copy;
