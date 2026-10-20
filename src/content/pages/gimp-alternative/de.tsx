import { ComparisonTable } from "@/components/site/ComparisonTable";
import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Picstea: eine GIMP-Alternative im Browser",
  description:
    "Suchst du eine GIMP-Alternative ohne Installation? Picstea ist ein kostenloser Browser-Editor mit Ebenen wie in Photoshop und PSD. Ein ehrlicher Vergleich.",
  lead: "GIMP ist ein leistungsstarker, kostenloser Open-Source-Bildeditor, den du auf deinem Computer installierst. Picstea ist dagegen ein kostenloser Editor, der in deinem Browser läuft, mit Ebenen, Menüs und Tastaturbefehlen wie in Photoshop – praktisch, wenn du keine Software installieren kannst oder willst.",
  faqs: [
    {
      q: "Ist Picstea besser als GIMP?",
      a: "Kommt auf die Aufgabe an. Picstea braucht keine Installation und funktioniert wie Photoshop, du findest dich also in jedem Browser schnell zurecht. GIMP ist ein ausgereiftes Desktop-Programm mit mehr fortgeschrittenen Funktionen, Plugins und Skripting.",
    },
    {
      q: "Sind beide kostenlos?",
      a: "Ja. GIMP ist freie Open-Source-Software; Picstea kannst du kostenlos im Browser nutzen, ohne Konto.",
    },
    {
      q: "Kann ich meine GIMP-Dateien in Picstea öffnen?",
      a: "Nicht GIMPs eigene .xcf-Dateien. Exportiere aus GIMP als PSD, um die Ebenen zu behalten, oder als PNG, und öffne diese Datei in Picstea.",
    },
    {
      q: "Funktioniert Picstea auf einem Chromebook?",
      a: "Ja. Es läuft in jedem aktuellen Browser, auch auf Chromebooks und Computern, auf denen du keine Software installieren kannst.",
    },
  ],
  body: () => (
    <>
      <h2>Was beide können</h2>
      <ul>
        <li>
          Kostenlose ebenenbasierte Bildbearbeitung: Ebenen, Masken, Füllmethoden, Auswahlen und
          Filter.
        </li>
        <li>Retusche-Werkzeuge wie Kopierstempel und Reparatur-Pinsel.</li>
        <li>
          PSD-, PNG-, JPEG- und WebP-Dateien öffnen und exportieren, wobei deine Dateien auf deinem
          Gerät bleiben.
        </li>
        <li>
          Filter, die du nach dem Anwenden noch ändern kannst (Smartfilter in Picstea,
          nicht-destruktive Filter in GIMP 3).
        </li>
      </ul>
      <h2>Die Unterschiede</h2>
      <ComparisonTable
        other="GIMP"
        rows={[
          ["Wo es läuft", "In jedem aktuellen Browser", "Desktop-App für Windows, macOS und Linux"],
          ["Installation", "Nichts zu installieren", "Herunterladen und installieren"],
          ["Preis", "Kostenlos, ohne Konto", "Kostenlos, Open Source"],
          [
            "Arbeitsweise",
            "Menüs, Bedienfelder und Tastaturbefehle wie in Photoshop",
            "GIMPs eigene Oberfläche und Tastaturbefehle",
          ],
          [
            "Einstellungsebenen",
            "Ja (Tonwertkorrektur, Gradationskurven und 13 weitere)",
            "Nicht-destruktive Filter auf Ebenen",
          ],
          ["Eigenes Projektformat", ".picstea", ".xcf"],
          [
            "Plugins und Skripting",
            "Nur aufgezeichnete Aktionen",
            "Plugins und Skripte (Python, Scheme, C)",
          ],
        ]}
      />
      <h2>Warum sich Leute für Picstea entscheiden</h2>
      <ul>
        <li>
          <strong>Nichts zu installieren.</strong> Tab öffnen und loslegen – auf dem Firmenlaptop,
          dem Schul-Chromebook oder dem Computer von jemand anderem. Als App installiert
          funktioniert es auch offline.
        </li>
        <li>
          <strong>Fühlt sich an wie Photoshop.</strong> Menüs, Bedienfelder, Einstellungsebenen,
          Ebenenstile und Tastaturbefehle orientieren sich an Photoshop, damit Tutorials und
          Gewohnheiten weiter passen.
        </li>
        <li>
          <strong>Privat by Design.</strong> Wie bei GIMP bleiben deine Bilder auf deinem Gerät:
          Picstea hat keinen Server, der sie empfängt.
        </li>
      </ul>
      <h2>Wann GIMP die bessere Wahl ist</h2>
      <ul>
        <li>Sehr große Bilder und Druckarbeiten mit Farbmanagement und CMYK-Exportoptionen.</li>
        <li>Den Editor mit Plugins und Skripten erweitern und Stapelverarbeitung per Skript.</li>
        <li>Vollständig quelloffene Software, die du einsehen und ändern kannst.</li>
        <li>
          Fortgeschrittene Werkzeuge, die Picstea noch nicht hat, etwa Verkrümmungs-Transformationen
          und Pfad-Bedienfelder.
        </li>
      </ul>
      <p>
        Willst du den Weg über den Browser ausprobieren? Starte mit der{" "}
        <Link href="/docs/getting-started">Einstiegsanleitung</Link> (auf Englisch).
      </p>
    </>
  ),
};

export default copy;
