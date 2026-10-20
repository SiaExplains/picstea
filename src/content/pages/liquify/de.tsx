import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Foto online verflüssigen",
  description:
    "Mit Verflüssigen im Browser Teile eines Fotos per Pinsel schieben, drehen, zusammenziehen und aufblasen – Rekonstruieren macht es stellenweise rückgängig.",
  lead: "Mit Verflüssigen in Picstea formst du ein Foto per Pinsel um, wie in Photoshop: Öffne das Foto, wähle Filter → Verflüssigen…, nimm ein Werkzeug und male. Schieb Pixel, dreh sie, verkleinere oder vergrößere Bereiche und mach jede Stelle mit Rekonstruieren rückgängig. Das ist kostenlos und läuft komplett in deinem Browser.",
  faqs: [
    {
      q: "Ist das dasselbe wie Verflüssigen in Photoshop?",
      a: "Bei den Hauptwerkzeugen funktioniert es genauso: Vorwärts krümmen (schieben), Im Uhrzeigersinn drehen und Gegen den Uhrzeigersinn drehen, Zusammenziehen, Aufblasen, Rekonstruieren und Glätten, mit einem Pinsel, dessen Größe du mit [ und ] einstellst. Die gesichtserkennenden Regler und Fixierungsmasken von Photoshop gibt es nicht.",
    },
    {
      q: "Kann ich das Verflüssigen später ändern?",
      a: "Nicht nach dem Klick auf OK – Verflüssigen ändert die Pixel und kann kein Smartfilter sein. Dupliziere vorher die Ebene (Cmd/Ctrl+J), um das Original zu behalten, oder mach es rückgängig.",
    },
    {
      q: "Funktioniert es auch bei Text oder Formen?",
      a: "Verflüssigen funktioniert auf Pixelebenen. Rastere eine Text- oder Formebene zuerst (Rechtsklick auf die Ebene im Ebenen-Bedienfeld).",
    },
    {
      q: "Wird mein Foto hochgeladen?",
      a: "Nein. Verflüssigen läuft in deinem Browser. Picstea hat keinen Server, der Bilder empfängt.",
    },
  ],
  body: () => (
    <>
      <h2>Ein Foto in vier Schritten verflüssigen</h2>
      <ol>
        <li>
          Öffne den Editor und zieh dein Foto auf die Seite; dupliziere die Ebene (Cmd/Ctrl+J), um
          das Original zu behalten.
        </li>
        <li>
          Wähle Filter → Verflüssigen…. Das Foto öffnet sich in der eigenen Vorschau von
          Verflüssigen.
        </li>
        <li>
          Nimm ein Werkzeug, stell die Pinselgröße mit [ und ] ein und male. Behalte dabei die
          Vorschau im Blick.
        </li>
        <li>Drück OK zum Anwenden und exportiere dann mit Datei → Exportieren als….</li>
      </ol>
      <h2>Die Werkzeuge</h2>
      <ul>
        <li>
          <strong>Vorwärts krümmen</strong> – schiebt Pixel in die Richtung, in die du ziehst: eine
          Linie glätten, eine Ecke anheben, eine Kurve anstupsen.
        </li>
        <li>
          <strong>Im Uhrzeigersinn drehen</strong> und{" "}
          <strong>Gegen den Uhrzeigersinn drehen</strong> – drehen die Pixel unter dem Pinsel, für
          Wirbel und kreative Effekte.
        </li>
        <li>
          <strong>Zusammenziehen</strong> – zieht Pixel zur Pinselmitte hin und macht einen Bereich
          kleiner.
        </li>
        <li>
          <strong>Aufblasen</strong> – drückt Pixel von der Mitte weg und macht einen Bereich
          größer.
        </li>
        <li>
          <strong>Rekonstruieren</strong> – malt das Original nach und nach zurück.{" "}
          <strong>Glätten</strong> gleicht holprige Verzerrungen aus.
        </li>
      </ul>
      <h2>Tipps</h2>
      <ul>
        <li>
          Nimm einen großen, weichen Pinsel und mehrere leichte Striche; kleine Pinsel erzeugen
          Wellen.
        </li>
        <li>
          Verflüssigt wird nur die aktive Ebene. Für einen kleineren Bereich wähle ihn zuerst aus,
          damit sich der Rest des Fotos nicht bewegen kann.
        </li>
        <li>
          Alle anderen Filter findest du im <Link href="/docs/filters">Filter-Leitfaden</Link> (auf
          Englisch) und auf der Seite <Link href="/photo-filters">Fotofilter</Link>.
        </li>
      </ul>
      <h2>Einschränkungen</h2>
      <p>
        Es gibt kein gesichtserkennendes Verflüssigen und keine Fixierungs- oder Lösungsmasken.
        Verflüssigen ändert die Pixel direkt und kann daher nicht als Smartfilter genutzt werden.
        Bilder dürfen bis zu 36 Megapixel groß sein.
      </p>
    </>
  ),
};

export default copy;
