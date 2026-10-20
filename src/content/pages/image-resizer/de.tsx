import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Bildgröße online ändern",
  description:
    "Ändere die Bildgröße im Browser auf exakte Pixelmaße, behalte die Proportionen, passe die Arbeitsfläche an oder schneide zu. Kostenlos, ohne Anmeldung.",
  lead: "Um mit Picstea die Größe eines Bildes online zu ändern, öffne es im Editor, wähle Bild → Bildgröße…, gib die neue Breite oder Höhe in Pixeln ein und exportiere. Die Proportionen bleiben korrekt, es ist kostenlos, und das Bild verlässt nie dein Gerät.",
  faqs: [
    {
      q: "Wie ändere ich die Bildgröße, ohne das Bild zu verzerren?",
      a: "Lass in Bild → Bildgröße… „Proportionen beibehalten“ angehakt und gib nur die Breite oder die Höhe ein; der andere Wert passt sich an.",
    },
    {
      q: "Was ist der Unterschied zwischen Bildgröße und Arbeitsfläche?",
      a: "Bildgröße skaliert das ganze Bild. Arbeitsfläche lässt das Bild, wie es ist, und fügt Platz drumherum hinzu oder entfernt ihn, zum Beispiel für einen Rahmen oder ein quadratisches Format.",
    },
    {
      q: "Kann ich ein Bild verkleinern und danach wieder vergrößern, ohne Qualität zu verlieren?",
      a: "Ja, innerhalb von Picstea: Pixelebenen behalten ihre Originalpixel und werden nur in der neuen Größe dargestellt, sodass beim Hochskalieren die Details zurückkommen. Die exportierte Datei hat die Größe, die du gewählt hast.",
    },
    {
      q: "Kann ich die Größe vieler Bilder auf einmal ändern?",
      a: "Noch nicht. Bildgröße lässt sich nicht in einer Aktion aufzeichnen, daher kann die Stapelverarbeitung keine Größe ändern. Ändere die Größe vorerst Bild für Bild.",
    },
    {
      q: "Werden meine Bilder hochgeladen?",
      a: "Nein. Größenänderung und Export passieren auf deinem Gerät. Picstea hat keinen Server, der Bilder empfängt.",
    },
  ],
  body: () => (
    <>
      <h2>Bildgröße in vier Schritten ändern</h2>
      <ol>
        <li>Öffne den Editor und zieh dein Bild (PNG, JPEG, WebP, GIF oder PSD) auf die Seite.</li>
        <li>Wähle Bild → Bildgröße….</li>
        <li>
          Lass „Proportionen beibehalten“ angehakt und gib die neue Breite oder Höhe in Pixeln ein.
          Für den Druck kannst du auch die Auflösung (ppi) festlegen.
        </li>
        <li>Wähle Datei → Exportieren als…, nimm ein Format und speichere.</li>
      </ol>
      <h2>Andere Wege, die Größe zu ändern</h2>
      <ul>
        <li>
          <strong>Arbeitsfläche…</strong> (Menü Bild) fügt Platz um das Bild hinzu oder entfernt
          ihn. Wähle einen von neun Ankerpunkten, um festzulegen, welche Seite wächst, oder hake
          „Relativ“ an, um einen festen Betrag hinzuzufügen, zum Beispiel 20 Pixel auf jeder Seite.
        </li>
        <li>
          <strong>Freistellungswerkzeug</strong> schneidet das Bild auf den Bereich zu, den du
          aufziehst. Das Freistellen ist nicht-destruktiv, du kannst es also später ändern.
        </li>
        <li>
          <strong>Zuschneiden…</strong> entfernt transparente oder einfarbige Ränder automatisch.
        </li>
        <li>
          <strong>Vorlagen für neue Dokumente</strong> – rund 80 fertige Formate für Social-Media-
          Posts, Druck, Fotos, Bildschirme und Icons, in Pixeln, Zoll, Zentimetern oder Millimetern.
          Platziere dein Bild mit Datei → Bild als Ebene platzieren… darin und skaliere es passend.
        </li>
      </ul>
      <h2>Tipps für gute Ergebnisse</h2>
      <ul>
        <li>
          Verkleinere Bilder lieber, als sie zu vergrößern: Beim Vergrößern entstehen keine Details,
          die nicht da sind.
        </li>
        <li>
          Nach dem Verkleinern eines Fotos holt Filter → Scharfzeichnen → Unscharf maskieren klare
          Kanten zurück.
        </li>
        <li>
          Exportiere fürs Web als WebP oder JPEG, damit die Datei klein bleibt; siehe die Anleitung
          zum <Link href="/image-compressor">Bildkompressor</Link>.
        </li>
      </ul>
      <h2>Einschränkungen</h2>
      <p>
        Bilder können bis zu 12.000 Pixel pro Seite (36 Megapixel) groß sein. Größenänderung per
        Stapelverarbeitung gibt es noch nicht, und es gibt kein KI-Upscaling.
      </p>
    </>
  ),
};

export default copy;
