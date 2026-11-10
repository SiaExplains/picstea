import { ComparisonTable } from "@/components/site/ComparisonTable";
import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Picstea: eine Photopea-Alternative",
  description:
    "Suchst du eine Photopea-Alternative? Picstea ist ein kostenloser Bildeditor im Browser mit Ebenen und PSD-Support – ohne Werbecode von Dritten im Editor.",
  lead: "Ja. Picstea ist wie Photopea ein kostenloser Foto-Editor, der im Browser läuft und Dateien auf deinem Gerät bearbeitet, mit Ebenen, Masken und PSD-Unterstützung. Picstea hält Code von Dritten, Werbung eingeschlossen, aus dem Editor heraus und sagt dir genau, was sich beim Öffnen einer PSD geändert hat; Photopea öffnet deutlich mehr Dateiformate.",
  faqs: [
    {
      q: "Worin unterscheidet sich Picstea von Photopea?",
      a: "Beides sind kostenlose, ebenenbasierte Editoren, die im Browser laufen und Dateien auf deinem Gerät bearbeiten. Picstea hält Code von Dritten, auch Werbung, komplett aus der Editor-Seite heraus und setzt auf einen aufgeräumten, fokussierten Arbeitsbereich. Photopea öffnet mehr Dateitypen und hat Funktionen, die Picstea noch nicht hat.",
    },
    {
      q: "Lädt Picstea meine Bilder hoch?",
      a: "Nein. Dateien werden in deinem Browser geöffnet, bearbeitet und gespeichert; die Editor-Seite kann keine Dokumentdaten irgendwohin senden.",
    },
    {
      q: "Kann ich meine PSD-Dateien zwischen beiden austauschen?",
      a: "Ja. Beide lesen und schreiben PSD, du kannst also eine in einem anderen Editor gespeicherte PSD in Picstea öffnen und wieder als PSD mit Ebenen exportieren.",
    },
  ],
  body: () => (
    <>
      <h2>Was beide können</h2>
      <ul>
        <li>
          Kostenlos im Browser laufen, mit Ebenen, Masken, Einstellungsebenen und Füllmethoden.
        </li>
        <li>PSD-Dateien mit Ebenen öffnen und speichern sowie PNG, JPEG und WebP exportieren.</li>
        <li>
          Dateien lokal bearbeiten, mit vertrauten Werkzeugen und Tastaturbefehlen wie in Photoshop.
        </li>
      </ul>
      <h2>Die Unterschiede</h2>
      <ComparisonTable
        other="Photopea"
        checked="november2026"
        rows={[
          ["Preis", "Kostenlos", "Kostenlos"],
          [
            "Uploads",
            "Keine: Dateien bleiben auf deinem Gerät",
            "Keine: laut eigener Website verlassen Dateien nie dein Gerät",
          ],
          [
            "PSD-Dateien",
            "Öffnet und speichert PSD mit Ebenen; listet auf, was nicht erhalten bleibt",
            "Öffnet und speichert PSD, sein Hauptformat",
          ],
          [
            "Dateien, die es öffnet",
            "PNG, JPEG, WebP, GIF, SVG, HEIC, PSD und Picstea-Projekte",
            "Über 40 Formate, darunter PDF, AI, TIFF, Figma und Kamera-RAW",
          ],
        ]}
      />
      <h2>Warum sich Leute für Picstea entscheiden</h2>
      <ul>
        <li>
          <strong>Nichts von Dritten im Editor.</strong> Auf der Editor-Seite läuft kein Werbe- oder
          Tracking-Code; eine strenge Content-Security-Policy lässt den Browser jeden Versuch
          blockieren, Dokumentdaten anderswohin zu senden. Picsteas eigene Sponsoring-Fläche neben
          der Arbeitsfläche ist ein schlichtes Bild mit Link.
        </li>
        <li>
          <strong>Projekte werden für dich gespeichert.</strong> Deine Arbeit wird automatisch in
          deinem Browser gespeichert und lässt sich als portable <code>.picstea</code>-Projektdatei
          herunterladen.
        </li>
        <li>
          <strong>Ehrliche Grenzen.</strong> Wenn eine PSD-Funktion nicht erhalten werden kann,
          listet Picstea genau auf, was sich geändert hat, statt es stillschweigend zu ändern.
        </li>
      </ul>
      <h2>Was Photopea hat und Picstea (noch) nicht</h2>
      <ul>
        <li>Mehr Formate öffnen, etwa AI, XD, Sketch, Figma, PDF und Kamera-RAW-Dateien.</li>
        <li>Generative und inhaltsbasierte Werkzeuge, Objektauswahl und das magnetische Lasso.</li>
        <li>Dateien direkt aus Cloud-Speichern wie Google Drive, Dropbox oder OneDrive öffnen.</li>
      </ul>
      <p>
        Wenn du das brauchst, ist Photopea eine gute Wahl. Wenn du einen fokussierten Editor willst,
        der deine Arbeit schon vom Design her privat hält,{" "}
        <Link href="/docs/getting-started">leg mit Picstea los</Link> (auf Englisch).
      </p>
    </>
  ),
};

export default copy;
