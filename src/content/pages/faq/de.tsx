import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Häufig gestellte Fragen",
  description:
    "Antworten zu Picstea: Ist es kostenlos, werden Bilder hochgeladen, welche Dateien öffnet und speichert es, wo liegen Projekte und auf welchen Geräten läuft es?",
  lead: "Kurze Antworten zu Picstea, dem kostenlosen Online-Fotoeditor, bei dem deine Bilder auf deinem Gerät bleiben.",
  faqs: [
    {
      q: "Ist Picstea kostenlos?",
      a: "Ja. Picstea ist kostenlos nutzbar, ohne Konto, ohne Wasserzeichen und ohne Limit beim Exportieren. Finanziert wird es durch Werbung auf der Website und im Blog sowie durch klar gekennzeichnetes Sponsoring neben der Arbeitsfläche – nie über deiner Arbeit und ohne Tracking.",
    },
    {
      q: "Werden meine Bilder hochgeladen?",
      a: "Nein. Bilder werden in deinem Browser geöffnet, bearbeitet, gespeichert und exportiert. Picstea hat keinen Server, der sie empfängt, und die Editor-Seite blockiert das Senden von Dokumentdaten an andere Orte.",
    },
    {
      q: "Wo wird meine Arbeit gespeichert?",
      a: "Automatisch im Speicher deines Browsers auf diesem Gerät. Für eine Kopie an anderer Stelle lädst du mit Datei → Projekt speichern unter… eine .picstea-Datei herunter oder exportierst ein Bild.",
    },
    {
      q: "Welche Dateien kann ich öffnen?",
      a: "PNG, JPEG, WebP, GIF, SVG, HEIC (iPhone-Fotos), PSD (8-Bit-RGB und Graustufen) und .picstea-Projektdateien.",
    },
    {
      q: "In welche Formate kann ich exportieren?",
      a: "PNG, JPEG, WebP, SVG, PDF und PSD mit Ebenen.",
    },
    {
      q: "Kann ich PSD-Dateien bearbeiten?",
      a: "Ja. Ebenen, Gruppen, Masken, Füllmethoden, bearbeitbarer Text, Einstellungsebenen, Formen, Smartobjekte und gängige Ebenenstile bleiben erhalten, und du kannst wieder eine PSD mit Ebenen speichern.",
    },
    {
      q: "Muss ich etwas installieren?",
      a: "Nein. Picstea läuft in aktuellen Versionen von Chrome, Edge, Firefox und Safari.",
    },
    {
      q: "Funktioniert Picstea offline? Kann ich es installieren?",
      a: "Ja. Wenn du den Editor einmal geöffnet hast, startet er auch ohne Internetverbindung. In Chrome und Edge kannst du ihn installieren (Hilfe → Picstea installieren…), sodass er wie eine Desktop-App in einem eigenen Fenster öffnet; in Safari auf dem Mac nutzt du Ablage → Zum Dock hinzufügen.",
    },
    {
      q: "Funktioniert es auf Handy oder Tablet?",
      a: "Das Layout passt sich kleinen Bildschirmen an, aber Picstea ist für Maus oder Trackpad und Tastatur gemacht – am besten nutzt du es also am Computer.",
    },
    {
      q: "Hat Picstea KI-Werkzeuge?",
      a: "Noch nicht. Es gibt keine generative Füllung, keine Objektauswahl und kein inhaltsbasiertes Füllen; zum Entfernen von Makeln gibt es den Reparatur-Pinsel und den Bereichsreparatur-Pinsel.",
    },
    {
      q: "Ist es eine Alternative zu Photoshop oder Photopea?",
      a: "Es deckt den Kern dieses Workflows ab – Ebenen, Masken, Korrekturen, Retusche und PSD-Dateien – kostenlos im Browser. Was es kann und was nicht, zeigen die Vergleichsseiten zu Photoshop und Photopea.",
    },
  ],
  body: () => (
    <>
      <p>
        Noch Fragen? Lies die <Link href="/docs">Dokumentation</Link> (auf Englisch), vergleiche
        Picstea mit <Link href="/photoshop-alternative">Photoshop</Link> und{" "}
        <Link href="/photopea-alternative">Photopea</Link> oder stöbere in den{" "}
        <Link href="/blog">Anleitungen</Link> (auf Englisch).
      </p>
    </>
  ),
};

export default copy;
