import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Kostenloser Online-PNG-Editor mit Transparenz",
  description:
    "Bearbeite PNG-Bilder im Browser: Ebenen, transparente Hintergründe, Text und Effekte, dann verlustfrei als PNG exportieren. Kostenlos, ohne Upload.",
  lead: "Picstea öffnet PNG-Dateien in deinem Browser, behält ihre Transparenz bei und lässt dich sie mit Ebenen, Text, Formen und Effekten bearbeiten, bevor du wieder ein verlustfreies PNG exportierst. Es ist kostenlos, braucht kein Konto, und deine Bilder verlassen nie dein Gerät.",
  faqs: [
    {
      q: "Behält Picstea die PNG-Transparenz bei?",
      a: "Ja. Transparente Bereiche bleiben beim Bearbeiten und beim Export als PNG oder WebP transparent. JPEG kennt keine Transparenz, deshalb werden transparente Bereiche dort weiß.",
    },
    {
      q: "Ist der PNG-Export verlustfrei?",
      a: "Ja. Der PNG-Export übernimmt jedes Pixel genau so, wie es auf der Arbeitsfläche aussieht. Es gibt keine Qualitätseinstellung, weil nichts verworfen wird.",
    },
    {
      q: "Kann ich den Hintergrund eines PNG transparent machen?",
      a: "Ja, von Hand: Mit dem Magischen Radiergummi entfernst du einen einfarbigen Hintergrund mit einem Klick, mit dem Hintergrund-Radiergummi die Kanten, oder du nutzt eine Auswahl und Entf. Eine automatische KI-Hintergrundentfernung gibt es noch nicht.",
    },
    {
      q: "Wird mein PNG irgendwohin hochgeladen?",
      a: "Nein. Die Datei wird auf deinem Gerät geöffnet, bearbeitet und exportiert. Picstea hat keinen Server, der Bilder empfängt.",
    },
    {
      q: "Kann ich ein PNG in JPEG oder WebP umwandeln?",
      a: "Ja. Öffne das PNG und wähle dann JPEG oder WebP unter Datei → Exportieren als…. WebP behält die Transparenz und ist meist deutlich kleiner.",
    },
  ],
  body: () => (
    <>
      <h2>Ein PNG in vier Schritten bearbeiten</h2>
      <ol>
        <li>Öffne den Editor und zieh dein PNG auf die Seite, oder klicke auf „Bild öffnen“.</li>
        <li>
          Füge auf neuen Ebenen hinzu, was du brauchst: Text mit dem Text-Werkzeug, Formen oder ein
          weiteres Bild mit Datei → Bild als Ebene platzieren.
        </li>
        <li>
          Räume den Hintergrund mit dem Magischen Radiergummi oder dem Hintergrund-Radiergummi auf,
          oder wähle einen Bereich aus und drücke Entf, um ihn transparent zu machen.
        </li>
        <li>Wähle Datei → Exportieren als…, nimm PNG und speichere.</li>
      </ol>
      <h2>Warum PNG</h2>
      <p>
        PNG ist verlustfrei und unterstützt Transparenz – damit ist es das richtige Format für
        Logos, Icons, Screenshots, Illustrationen und alles mit scharfen Kanten oder Text. Fotos
        sind als JPEG oder WebP meist deutlich kleiner; sieh dir die Seiten{" "}
        <Link href="/jpeg-editor">JPEG-Editor</Link> und{" "}
        <Link href="/webp-editor">WebP-Editor</Link> an, und die Anleitung{" "}
        <Link href="/blog/png-vs-jpeg-vs-webp">PNG vs JPEG vs WebP</Link> (auf Englisch). Um nur das
        Format zu ändern, ohne zu bearbeiten, nutze den Konverter{" "}
        <Link href="/convert/png-to-jpg">PNG in JPG</Link> oder{" "}
        <Link href="/convert/png-to-webp">PNG in WebP</Link>.
      </p>
      <h2>Was du mit einem PNG machen kannst</h2>
      <ul>
        <li>Mit Ebenen, Gruppen, 16 Füllmethoden, Deckkraft und Ebenenmasken arbeiten.</li>
        <li>Bearbeitbaren Text, Formen und Pfade mit dem Zeichenstift hinzufügen.</li>
        <li>
          Text oder Logos mit Schlagschatten, Schein, Konturen sowie Farb-, Verlaufs- oder
          Musterüberlagerungen versehen.
        </li>
        <li>
          Hintergründe mit dem Magischen Radiergummi und dem Hintergrund-Radiergummi entfernen.
        </li>
        <li>Mit Farbton/Sättigung, Farbbalance und anderen Einstellungsebenen umfärben.</li>
        <li>Bild oder Arbeitsfläche skalieren, freistellen, drehen und spiegeln.</li>
        <li>
          Die Arbeit mit Ebenen als PSD- oder .picstea-Projekt speichern, um sie später weiter zu
          bearbeiten.
        </li>
      </ul>
      <h2>Einschränkungen</h2>
      <p>
        Bilder können bis zu 12.000 Pixel pro Seite groß sein (36 Megapixel). Picstea arbeitet mit
        8-Bit-Farbe, daher werden 16-Bit-PNGs auf 8 Bit reduziert. Animierte PNGs öffnen sich als
        Einzelbild. Eine automatische Hintergrundentfernung gibt es noch nicht. Details findest du
        unter <Link href="/docs/file-formats">Dateiformate</Link> (auf Englisch).
      </p>
    </>
  ),
};

export default copy;
