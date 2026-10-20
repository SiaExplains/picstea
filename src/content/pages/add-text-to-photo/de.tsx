import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Text auf ein Foto schreiben – online",
  description:
    "Füge im Browser bearbeitbaren Text in ein Foto ein: Schrift, Größe und Farbe wählen, Schatten oder Kontur dazu, exportieren. Kostenlos, ohne Wasserzeichen.",
  lead: "Um in Picstea Text auf ein Foto zu schreiben, öffne das Foto, wähle das Text-Werkzeug (T), klicke an die gewünschte Stelle und tippe los. Schrift, Größe und Farbe änderst du in der Optionsleiste, dann exportierst du. Das ist kostenlos, fügt kein Wasserzeichen hinzu, und dein Foto bleibt auf deinem Gerät.",
  faqs: [
    {
      q: "Kann ich den Text später noch ändern?",
      a: "Ja. Der Text bleibt bis zum Export auf einer eigenen, bearbeitbaren Ebene. Speichere das Projekt (oder eine PSD), um ihn an einem anderen Tag weiterzubearbeiten.",
    },
    {
      q: "Welche Schriften kann ich verwenden?",
      a: "Gängige Schriften, die jeder Computer hat: Arial, Helvetica, Verdana, Trebuchet MS, Georgia, Times New Roman, Courier New, Impact und deine Systemschrift. Eigene Schriften hochladen geht noch nicht.",
    },
    {
      q: "Wie mache ich Text auf einem unruhigen Foto gut lesbar?",
      a: "Füge im Dialog Ebenenstil einen Schlagschatten oder eine Kontur hinzu, oder lege eine Form hinter den Text und verringere ihre Deckkraft.",
    },
    {
      q: "Gibt es ein Wasserzeichen?",
      a: "Nein. Picstea fügt nie ein Wasserzeichen hinzu, und dein Foto wird nie hochgeladen.",
    },
  ],
  body: () => (
    <>
      <h2>Text in vier Schritten hinzufügen</h2>
      <ol>
        <li>Öffne den Editor und zieh dein Foto auf die Seite.</li>
        <li>
          Drück T (oder wähle das Text-Werkzeug), klick auf das Foto und tippe. Mit Enter beginnst
          du eine neue Zeile.
        </li>
        <li>
          Wähle in der Optionsleiste Schrift, Größe, fett oder kursiv, Farbe, Ausrichtung,
          Zeilenabstand und Laufweite. Verschiebe den Text mit dem Verschieben-Werkzeug (V).
        </li>
        <li>Wähle Datei → Exportieren als… und speichere ein JPEG, PNG oder WebP.</li>
      </ol>
      <h2>Den Text hervorheben</h2>
      <ul>
        <li>
          Doppelklicke auf die Textebene (oder Ebene → Fülloptionen…), um den Ebenenstil zu öffnen:
          Füge einen <strong>Schlagschatten</strong>, eine <strong>Kontur</strong> (Umriss), einen
          Schein nach außen oder eine Verlaufsüberlagerung hinzu.
        </li>
        <li>
          Zeichne mit den Form-Werkzeugen ein Rechteck unter den Text und verringere seine Deckkraft
          – fertig ist ein Bildunterschrift-Balken.
        </li>
        <li>Verringere die Deckkraft der Textebene für ein dezentes eigenes Wasserzeichen.</li>
        <li>
          Dreh oder skaliere den Text mit Frei transformieren (Cmd/Ctrl+T); er bleibt bearbeitbar.
        </li>
      </ul>
      <h2>Gut zu wissen</h2>
      <ul>
        <li>
          Du brauchst denselben Text auf vielen Fotos? Text lässt sich noch nicht in einer Aktion
          aufzeichnen, also füge ihn jedem Foto einzeln hinzu.
        </li>
        <li>
          Text in einer Photoshop-Datei öffnet sich ebenfalls als bearbeitbarer Text; mehr dazu im{" "}
          <Link href="/psd-editor">PSD-Editor</Link>.
        </li>
      </ul>
      <h2>Einschränkungen</h2>
      <p>
        Text ist Punkttext: Zeilen brechen dort um, wo du Enter drückst, ohne automatischen Umbruch
        in einem Textrahmen. Text auf einem Pfad oder vertikalen Text gibt es noch nicht, und es
        stehen nur die gängigen Schriften aus den Fragen unten zur Verfügung.
      </p>
    </>
  ),
};

export default copy;
