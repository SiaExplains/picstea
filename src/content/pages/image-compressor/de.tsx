import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Bild online komprimieren – ohne Hochladen",
  description:
    "Verkleinere Bilder im Browser: Größe ändern und als JPEG oder WebP mit niedrigerer Qualität exportieren. Kostenlos, privat, nichts wird hochgeladen.",
  lead: "Picstea macht Bilder direkt in deinem Browser kleiner: Ändere die Größe auf das, was du brauchst, und exportiere sie dann als JPEG oder WebP mit niedrigerer Qualität. Anders als bei den meisten Online-Kompressoren wird dein Bild nie auf einen Server hochgeladen.",
  faqs: [
    {
      q: "Welche Qualität sollte ich wählen?",
      a: "Für Fotos im Web sehen 70–85 meist genauso aus wie das Original, bei einem Bruchteil der Dateigröße. Geh nur für Vorschaubilder tiefer und prüf das Ergebnis, bevor du es verwendest.",
    },
    {
      q: "Ist WebP kleiner als JPEG?",
      a: "Meistens ja: Bei gleicher sichtbarer Qualität ist eine WebP-Datei oft deutlich kleiner als ein JPEG, und sie kann Transparenz behalten.",
    },
    {
      q: "Kann ich ein PNG komprimieren?",
      a: "Der PNG-Export ist immer verlustfrei und hat daher keine Qualitätseinstellung. Um ein PNG kleiner zu machen, verkleinere es oder exportiere es als WebP (das Transparenz behält) oder JPEG.",
    },
    {
      q: "Kann ich auf eine genaue Dateigröße komprimieren, etwa unter 100 KB?",
      a: "Nicht automatisch. Picstea hat keine Einstellung für eine Zielgröße und zeigt die Dateigröße vor dem Speichern nicht an. Senk die Qualität oder die Abmessungen und exportiere erneut, bis es passt.",
    },
    {
      q: "Ist das privat?",
      a: "Ja. Die Komprimierung passiert in deinem Browser. Anders als die meisten Online-Kompressoren lädt Picstea dein Bild nie auf einen Server hoch.",
    },
  ],
  body: () => (
    <>
      <h2>Ein Bild in vier Schritten komprimieren</h2>
      <ol>
        <li>Öffne den Editor und zieh dein Bild auf die Seite.</li>
        <li>
          Wenn es größer ist als nötig, wähle Bild → Bildgröße… und verringere die Breite. Wenn du
          die Breite halbierst, sinkt die Pixelzahl auf ein Viertel – das spart am meisten.
        </li>
        <li>
          Wähle Datei → Exportieren als… und nimm JPEG (Fotos) oder WebP (Fotos und Grafiken).
        </li>
        <li>Zieh den Qualitätsregler nach unten, zum Beispiel auf 80, und speichere.</li>
      </ol>
      <h2>Was eine Bilddatei kleiner macht</h2>
      <ul>
        <li>
          <strong>Weniger Pixel.</strong> Ein 4.000 Pixel breites Handyfoto, das auf einer Website
          1.200 Pixel breit angezeigt wird, verschwendet den Großteil seiner Bytes.
        </li>
        <li>
          <strong>Verlustbehaftete Formate.</strong> JPEG und WebP verwerfen Details, die das Auge
          kaum bemerkt. Die Qualitätseinstellung (1–100, Standard 90) bestimmt, wie viele.
        </li>
        <li>
          <strong>Das richtige Format.</strong> Fotos als JPEG oder WebP, Logos und Screenshots als
          PNG oder WebP. Ein als PNG gespeichertes Foto ist oft um ein Vielfaches größer als
          dasselbe Foto als JPEG.
        </li>
      </ul>
      <h2>Warum im Browser komprimieren</h2>
      <p>
        Die meisten Bildkompressoren laden deine Datei auf ihren Server hoch, verarbeiten sie dort
        und schicken sie zurück. Picstea erledigt die Arbeit auf deinem eigenen Gerät. So bleiben
        private Fotos, Dokumente und Screenshots privat, und sobald die App installiert ist,
        funktioniert alles auch offline.
      </p>
      <h2>Einschränkungen</h2>
      <p>
        Picstea ist ein Bildbearbeitungsprogramm, kein spezieller Optimierer: Es gibt keinen
        verlustfreien PNG-Optimierer, keine Zieldateigröße und keine Vorschau der Dateigröße vor dem
        Speichern. Um viele Bilder auf einmal zu komprimieren, zeichne eine Aktion auf und nutze
        Datei → Automatisieren → Stapelverarbeitung…, um sie als JPEG oder WebP in einer ZIP-Datei
        zu exportieren (die Stapelverarbeitung kann noch keine Größe ändern). Mehr über{" "}
        <Link href="/docs/file-formats">Dateiformate</Link> (auf Englisch).
      </p>
    </>
  ),
};

export default copy;
