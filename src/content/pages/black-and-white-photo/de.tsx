import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Foto online in Schwarzweiß umwandeln",
  description:
    "Mach ein Farbfoto im Browser schwarzweiß – mit einer Einstellungsebene, die du rückgängig machen kannst, plus Kanalmixer, Duotone und Kontrast-Tipps. Kostenlos.",
  lead: "Um ein Foto in Picstea schwarzweiß zu machen, öffne es und wähle Ebene → Neue Einstellungsebene → Schwarzweiß. Die Farben werden auf einer eigenen Ebene zu Grau, sodass du das jederzeit rückgängig machen kannst. Das ist kostenlos, und dein Foto verlässt nie dein Gerät.",
  faqs: [
    {
      q: "Bekomme ich die Farben zurück?",
      a: "Ja. Der Schwarzweiß-Look ist eine Einstellungsebene; blende sie aus oder lösche sie, und die Originalfarben sind wieder da. Das Foto darunter ändert sich nie.",
    },
    {
      q: "Wie mache ich den Himmel dunkler, wie mit einem Rotfilter?",
      a: "Nimm eine Kanalmixer-Einstellungsebene mit aktiviertem Monochrom und verwende mehr vom Rot- und weniger vom Blaukanal. Schwarzweiß selbst hat keine Farbregler.",
    },
    {
      q: "Kann ich eine Farbe behalten und den Rest grau machen?",
      a: "Ja. Male auf der Maske der Einstellungsebene mit Schwarz über den Bereich, der farbig bleiben soll.",
    },
    {
      q: "Wird mein Foto hochgeladen?",
      a: "Nein. Alles läuft in deinem Browser. Picstea hat keinen Server, der Bilder empfängt.",
    },
  ],
  body: () => (
    <>
      <h2>Ein Foto in drei Schritten schwarzweiß machen</h2>
      <ol>
        <li>Öffne den Editor und zieh dein Foto auf die Seite.</li>
        <li>Wähle Ebene → Neue Einstellungsebene → Schwarzweiß.</li>
        <li>Wähle Datei → Exportieren als… und speichere das Ergebnis.</li>
      </ol>
      <h2>Die Tonwerte steuern</h2>
      <ul>
        <li>
          Mit dem <strong>Kanalmixer</strong> und aktiviertem <strong>Monochrom</strong> legst du
          fest, wie viel jede Farbe beiträgt: Mehr Rot hellt Haut auf und dunkelt einen blauen
          Himmel ab, mehr Grün passt gut zu Landschaften.
        </li>
        <li>
          <strong>Gradationskurven</strong> oder <strong>Tonwertkorrektur</strong> über der
          Schwarzweiß-Ebene sorgen für mehr Kontrast – siehe{" "}
          <Link href="/blog/levels-and-curves-explained">
            Tonwertkorrektur und Gradationskurven erklärt
          </Link>{" "}
          (auf Englisch).
        </li>
        <li>
          <strong>Verlaufsumsetzung</strong> ordnet die Grautöne zwei Farben zu – für einen Duotone-
          oder Sepia-Look.
        </li>
        <li>
          <strong>Farbton/Sättigung</strong> mit der Sättigung auf −100 ist ein weiterer schneller
          Weg, die Farbe zu entfernen.
        </li>
      </ul>
      <h2>Eine Farbe behalten</h2>
      <p>
        Jede Einstellungsebene hat eine Maske. Wähle den Pinsel, male mit Schwarz auf der Maske über
        den Bereich, der seine Farbe behalten soll – einen roten Mantel, eine Blume –, und male mit
        Weiß, um das Grau zurückzuholen.
      </p>
      <h2>Einschränkungen</h2>
      <p>
        Die Schwarzweiß-Einstellung wandelt Farben mit festen Gewichtungen um und hat keine Regler;
        nimm den Kanalmixer, wenn du sie steuern willst. Picstea arbeitet in 8-Bit-RGB, es gibt also
        keine Bearbeitung in 16 Bit oder im Graustufenmodus.
      </p>
    </>
  ),
};

export default copy;
