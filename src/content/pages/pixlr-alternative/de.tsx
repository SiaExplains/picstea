import { ComparisonTable } from "@/components/site/ComparisonTable";
import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Picstea: Pixlr-Alternative ohne Speicherlimit",
  description:
    "Suchst du eine Pixlr-Alternative? Picstea ist ein kostenloser Bildeditor im Browser mit Ebenen und PSD – ohne Konto, ohne Speicherlimit, ohne Werbung im Editor.",
  lead: "Pixlr ist ein beliebter Bildeditor im Browser mit einer kostenlosen Version und kostenpflichtigen Plänen, die KI-Werkzeuge hinzufügen. Picstea ist ein kostenloser Browser-Editor mit Ebenen wie in Photoshop und PSD-Support – ohne Speicherlimit, ohne Konto und ohne Werbung im Editor.",
  faqs: [
    {
      q: "Worin unterscheidet sich Picstea von Pixlr?",
      a: "Beides sind Bildeditoren im Browser mit Ebenen. Pixlr hat eine kostenlose Version mit Werbung und begrenzten Speichervorgängen sowie kostenpflichtige Pläne mit KI-Werkzeugen. Picstea ist kostenlos, ohne Limits und ohne Werbung im Editor, hat aber keine KI-Werkzeuge.",
    },
    {
      q: "Begrenzt Picstea, wie viele Bilder ich speichern kann?",
      a: "Nein. Es gibt kein Speicher- oder Exportlimit, kein Wasserzeichen und kein Konto.",
    },
    {
      q: "Hat Picstea KI-Hintergrundentfernung wie Pixlr?",
      a: "Noch nicht. In Picstea entfernst du Hintergründe von Hand mit dem Magischen Radiergummi, dem Hintergrund-Radiergummi oder einer Auswahl. Wenn du das brauchst, sind Pixlrs KI-Werkzeuge die bessere Wahl.",
    },
    {
      q: "Werden meine Fotos hochgeladen?",
      a: "Nicht bei Picstea: Der Editor hat keinen Server, der Bilder empfängt, und seine Sicherheitsrichtlinie blockiert das Senden von Dokumentdaten an irgendein Ziel.",
    },
  ],
  body: () => (
    <>
      <h2>Was beide können</h2>
      <ul>
        <li>Fotos im Browser bearbeiten, mit Ebenen, Masken, Füllmethoden und Korrekturen.</li>
        <li>PSD-Dateien öffnen und speichern sowie PNG, JPEG und WebP exportieren.</li>
        <li>Retuschieren, Text hinzufügen, zuschneiden, Größe ändern und Filter anwenden.</li>
      </ul>
      <h2>Die Unterschiede</h2>
      <ComparisonTable
        other="Pixlr"
        rows={[
          [
            "Preis",
            "Kostenlos",
            "Kostenlose Version; kostenpflichtige Pläne (Plus, Premium, Ultra)",
          ],
          [
            "Werbung",
            "Keine im Editor",
            "In der kostenlosen Version; kostenpflichtige Pläne sind werbefrei",
          ],
          [
            "Speichern",
            "Unbegrenzt, ohne Konto",
            "In der kostenlosen Version begrenzt; unbegrenzt in kostenpflichtigen Plänen",
          ],
          [
            "KI-Werkzeuge",
            "Keine",
            "KI-Werkzeuge mit monatlichen Credits in kostenpflichtigen Plänen",
          ],
          [
            "Arbeitsweise",
            "Ebenen, Einstellungsebenen und Ebenenstile wie in Photoshop",
            "Pixlrs eigene Editoren",
          ],
          ["Plattformen", "In jedem aktuellen Browser", "Browser, Desktop-Apps und Mobile-Apps"],
        ]}
      />
      <h2>Warum sich Leute für Picstea entscheiden</h2>
      <ul>
        <li>
          <strong>Keine Limits, um die du herumarbeiten musst.</strong> Speichere und exportiere so
          oft du willst, in voller Größe, ohne Wasserzeichen und ohne Anmeldung.
        </li>
        <li>
          <strong>Keine Werbung, wo du arbeitest.</strong> Auf der Editor-Seite läuft überhaupt kein
          Code von Dritten; Picsteas eigene Sponsorings stehen als schlichtes Bild mit Link neben
          der Arbeitsfläche.
        </li>
        <li>
          <strong>Professioneller Ebenen-Workflow.</strong> Einstellungsebenen, Smartobjekte mit
          Smartfiltern, Blend If und alle zehn Ebenenstile aus Photoshop.
        </li>
      </ul>
      <h2>Wann Pixlr die bessere Wahl ist</h2>
      <ul>
        <li>KI-Werkzeuge, etwa KI-Bildgenerierung und automatisches Freistellen.</li>
        <li>Mobile-Apps für iPhone und Android.</li>
      </ul>
      <p>
        Wenn du von Hand bearbeitest und keine Limits willst,{" "}
        <Link href="/docs/getting-started">leg mit Picstea los</Link> (auf Englisch). Wie du einen
        Hintergrund von Hand entfernst, erfährst du unter{" "}
        <Link href="/make-background-transparent">Hintergrund transparent machen</Link>.
      </p>
    </>
  ),
};

export default copy;
