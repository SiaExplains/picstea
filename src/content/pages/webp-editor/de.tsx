import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Kostenloser Online-WebP-Editor und -Konverter",
  description:
    "Öffne, bearbeite und exportiere WebP-Bilder im Browser oder wandle WebP in PNG oder JPEG um und zurück. Kostenlos, ohne Anmeldung, alles bleibt bei dir.",
  lead: "Picstea öffnet WebP-Bilder in deinem Browser, lässt dich sie mit Ebenen, Text und Korrekturen bearbeiten und exportiert WebP, PNG oder JPEG. Nutze es, um heruntergeladene WebP-Dateien umzuwandeln oder kleine WebP-Bilder für deine Website zu erstellen. Nichts wird hochgeladen.",
  faqs: [
    {
      q: "Wie wandle ich WebP in PNG oder JPEG um?",
      a: "Öffne die WebP-Datei in Picstea, wähle dann Datei → Exportieren als… und nimm PNG oder JPEG. Die Umwandlung passiert in deinem Browser.",
    },
    {
      q: "Wie wandle ich ein PNG oder JPEG in WebP um?",
      a: "Öffne das Bild, wähle Datei → Exportieren als…, nimm WebP und stell die Qualität ein. Anders als JPEG behält WebP die Transparenz.",
    },
    {
      q: "Warum sind WebP-Dateien kleiner?",
      a: "WebP komprimiert Bilder effizienter als JPEG und PNG, daher braucht dasselbe Bild meist weniger Bytes. So laden Webseiten schneller.",
    },
    {
      q: "Werden meine Bilder zum Umwandeln hochgeladen?",
      a: "Nein. Öffnen, Bearbeiten und Umwandeln passieren komplett auf deinem Gerät. Picstea hat keinen Server, der Bilder empfängt.",
    },
    {
      q: "Kann ich animierte WebP-Dateien bearbeiten?",
      a: "Nein. Picstea öffnet ein Standbild; animierte WebP-Dateien werden nicht als Animationen unterstützt.",
    },
  ],
  body: () => (
    <>
      <h2>Ein WebP-Bild umwandeln oder bearbeiten</h2>
      <ol>
        <li>Öffne den Editor und zieh die WebP-Datei auf die Seite.</li>
        <li>
          Bearbeite sie, wenn du magst: freistellen, Größe ändern, Farben anpassen, Text hinzufügen
          oder Flecken entfernen.
        </li>
        <li>
          Wähle Datei → Exportieren als… und nimm das Format: WebP für kleine Web-Bilder, PNG für
          eine verlustfreie Kopie oder JPEG für die größte Kompatibilität.
        </li>
        <li>Stell bei WebP und JPEG die Qualität ein und speichere dann.</li>
      </ol>
      <h2>WebP, PNG oder JPEG?</h2>
      <ul>
        <li>
          <strong>WebP</strong> – kleine Dateien mit Transparenz. Wird von allen aktuellen Browsern
          unterstützt; manche ältere Apps können es nicht öffnen.
        </li>
        <li>
          <strong>PNG</strong> – verlustfrei mit Transparenz, aber größer. Ideal für Logos, Icons
          und Screenshots.
        </li>
        <li>
          <strong>JPEG</strong> – kleine Fotos, die sich überall öffnen lassen, ohne Transparenz.
        </li>
      </ul>
      <p>
        Der Ratgeber <Link href="/blog/png-vs-jpeg-vs-webp">PNG vs JPEG vs WebP</Link> (auf
        Englisch) vergleicht sie ausführlicher. Du willst nur das Format ändern? Nutze den{" "}
        <Link href="/convert/webp-to-png">WebP in PNG</Link>- oder{" "}
        <Link href="/convert/png-to-webp">PNG in WebP</Link>-Konverter.
      </p>
      <h2>Was du mit einem WebP-Bild machen kannst</h2>
      <ul>
        <li>
          Alles, was Picstea mit jedem Bild kann: Ebenen, Masken, Einstellungsebenen und Filter.
        </li>
        <li>Text, Formen und Effekte wie Schlagschatten und Konturen hinzufügen.</li>
        <li>Mit Bild → Bildgröße… die Größe ändern, bevor du eine leichtere Datei exportierst.</li>
        <li>
          Viele Bilder auf einmal verarbeiten: Zeichne eine Aktion auf (zum Beispiel Unscharf
          maskieren); Datei → Automatisieren → Stapelverarbeitung… spielt sie dann auf den Dateien
          ab, die du auswählst, und exportiert sie als WebP in einer ZIP-Datei.
        </li>
      </ul>
      <h2>Einschränkungen</h2>
      <p>
        Bilder können bis zu 12.000 Pixel pro Seite (36 Megapixel) groß sein, und animiertes WebP
        wird nicht unterstützt. Um Dateien noch weiter zu verkleinern, sieh dir die Anleitung zum{" "}
        <Link href="/image-compressor">Bildkompressor</Link> an.
      </p>
    </>
  ),
};

export default copy;
