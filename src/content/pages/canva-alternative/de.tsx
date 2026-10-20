import { ComparisonTable } from "@/components/site/ComparisonTable";
import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Picstea vs. Canva: wenn du Fotos bearbeiten willst",
  description:
    "Canva ist für Designs aus Vorlagen; Picstea für Fotobearbeitung mit Ebenen, Masken und PSD – kostenlos und ohne Konto. Ein ehrlicher Vergleich.",
  lead: "Canva ist eine Design-Plattform, mit der du Social-Media-Posts, Präsentationen und mehr aus Vorlagen erstellst. Picstea ist ein Bildeditor: Ebenen, Masken, Einstellungsebenen, Retusche und PSD-Dateien, kostenlos in deinem Browser, ohne Konto und ohne Upload. Nimm Canva, um ein Design zu gestalten; nimm Picstea, wenn das Foto selbst Arbeit braucht.",
  faqs: [
    {
      q: "Ersetzt Picstea Canva?",
      a: "Nicht für alles. Canva ist eine Design-Plattform mit Vorlagen, Präsentationen, Video und Zusammenarbeit im Team. Picstea ist ein Bildeditor: das bessere Werkzeug für Retusche, Bearbeitung mit Ebenen und Photoshop-Dateien.",
    },
    {
      q: "Brauche ich ein Konto?",
      a: "Für Picstea nicht. Canva braucht ein Konto, um Designs zu erstellen und zu speichern, und die werden in Canvas Cloud gespeichert.",
    },
    {
      q: "Kann ich beide nutzen?",
      a: "Ja. Bearbeite oder retuschiere ein Foto in Picstea, exportiere ein PNG oder JPEG und lade es für dein Layout in Canva hoch.",
    },
    {
      q: "Wo werden meine Dateien gespeichert?",
      a: "Bei Picstea auf deinem eigenen Gerät: Projekte werden in deinem Browser gespeichert und Exporte landen in deinen Downloads. Nichts wird hochgeladen.",
    },
  ],
  body: () => (
    <>
      <h2>Die Unterschiede</h2>
      <ComparisonTable
        other="Canva"
        rows={[
          ["Gemacht für", "Fotos und Bilder bearbeiten", "Designs aus Vorlagen erstellen"],
          ["Konto", "Keins", "Erforderlich"],
          [
            "Wo deine Arbeit liegt",
            "Auf deinem Gerät",
            "In deinem Canva-Konto (5 GB im kostenlosen Plan)",
          ],
          ["Vorlagen", "Fertige Dokumentgrößen", "Über eine Million Vorlagen"],
          [
            "Ebenen und Masken",
            "Kompletter Ebenen-Workflow, Masken, Füllmethoden",
            "Elemente auf einer Seite anordnen",
          ],
          [
            "Photoshop-Dateien",
            "Öffnet und speichert PSD mit Ebenen",
            "Importiert PSD auf der Desktop-Website; manche Teile werden zu Bildern",
          ],
          [
            "Preis",
            "Kostenlos",
            "Kostenloser Plan; kostenpflichtige Pläne Pro, Business und Enterprise",
          ],
        ]}
      />
      <h2>Wann Picstea besser passt</h2>
      <ul>
        <li>
          <strong>Das Foto muss bearbeitet werden:</strong> Belichtung, Farbe, Gradationskurven,
          Hautunreinheiten retuschieren, Scharfzeichnen, den Hintergrund weichzeichnen.
        </li>
        <li>
          <strong>Präzise Arbeit:</strong> Auswahlen, Masken, Füllmethoden und Ebenenstile wie in
          Photoshop.
        </li>
        <li>
          <strong>Privatsphäre:</strong> kein Konto, und deine Bilder verlassen nie dein Gerät.
        </li>
        <li>
          <strong>Photoshop-Dateien:</strong> Öffne eine PSD mit ihren Ebenen und bearbeitbarem Text
          und speichere wieder eine PSD mit Ebenen.
        </li>
      </ul>
      <h2>Wann Canva besser passt</h2>
      <ul>
        <li>
          Social-Media-Posts, Präsentationen, Flyer und Videos, schnell aus Vorlagen erstellt.
        </li>
        <li>Teams, die an denselben Designs arbeiten, mit Brand Kits und Teilen.</li>
        <li>Eine große Bibliothek mit Stockfotos, Grafiken und Schriften.</li>
      </ul>
      <p>
        Viele nutzen beides. Sieh dir an, wie du in Picstea{" "}
        <Link href="/add-text-to-photo">Text zu einem Foto hinzufügst</Link> oder{" "}
        <Link href="/blur-background">einen Hintergrund weichzeichnest</Link>.
      </p>
    </>
  ),
};

export default copy;
