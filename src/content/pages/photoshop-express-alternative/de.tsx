import { ComparisonTable } from "@/components/site/ComparisonTable";
import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Picstea: eine Photoshop-Express-Alternative",
  description:
    "Photoshop Express ist eine App für schnelle Korrekturen; Picstea ist ein kostenloser Browser-Editor mit Ebenen, Masken und PSD. Ein ehrlicher Vergleich.",
  lead: "Photoshop Express ist Adobes kostenlose App für schnelle Fotokorrekturen auf Mobilgeräten und unter Windows. Wenn eine schnelle Korrektur nicht reicht, bekommst du mit Picstea einen vollwertigen ebenenbasierten Editor wie Photoshop – kostenlos, in jedem Browser, ohne Installation und ohne Upload.",
  faqs: [
    {
      q: "Was ist der Unterschied zwischen Photoshop Express und Picstea?",
      a: "Photoshop Express ist Adobes App für schnelle Fotobearbeitung, erhältlich für iOS, Android und Windows. Picstea läuft in jedem Browser und funktioniert wie das volle Photoshop, mit Ebenen, Einstellungsebenen, Masken und PSD-Dateien.",
    },
    {
      q: "Ist Picstea kostenlos?",
      a: "Ja, komplett: keine Premium-Stufe, kein Konto und kein Wasserzeichen. Photoshop Express kannst du kostenlos herunterladen, mit Premium-Funktionen für fortgeschrittene Bearbeitungen.",
    },
    {
      q: "Funktioniert Picstea auf einem Mac oder Chromebook?",
      a: "Ja. Es läuft in jedem aktuellen Browser unter Windows, macOS, Linux und ChromeOS.",
    },
    {
      q: "Funktioniert Picstea auf meinem Handy?",
      a: "Es lässt sich auf Handys öffnen und das Layout passt sich an, ist aber für Maus oder Trackpad und Tastatur gemacht. Für schnelle Korrekturen auf dem Handy passt Photoshop Express besser.",
    },
  ],
  body: () => (
    <>
      <h2>Die Unterschiede</h2>
      <ComparisonTable
        other="Photoshop Express"
        rows={[
          ["Wo es läuft", "In jedem aktuellen Browser", "Apps für iOS, Android und Windows"],
          [
            "Gemacht für",
            "Detaillierte, ebenenbasierte Bearbeitung",
            "Schnelle Korrekturen für Handyfotos",
          ],
          [
            "Preis",
            "Kostenlos, nichts freizuschalten",
            "Kostenloser Download; Premium-Funktionen für fortgeschrittene Bearbeitungen",
          ],
          [
            "Bearbeitungsstil",
            "Volle Ebenen, Masken, Einstellungsebenen, Ebenenstile",
            "Intelligente Korrekturen, automatisches Maskieren und Ein-Tipp-Werkzeuge",
          ],
          ["Fotos aus", "Deinem Gerät", "Deinem Gerät, Google Fotos, Dropbox und Facebook"],
        ]}
      />
      <h2>Wann Picstea besser passt</h2>
      <ul>
        <li>Du willst mit Ebenen, Masken, Auswahlen und Einstellungsebenen arbeiten.</li>
        <li>Du musst eine Photoshop-Datei mit Ebenen öffnen oder abliefern.</li>
        <li>
          Du arbeitest an einem Mac, einem Linux-Computer oder einem Chromebook oder kannst keine
          Apps installieren.
        </li>
        <li>Du willst alles kostenlos, ohne Premium-Funktionen oder Konto.</li>
      </ul>
      <h2>Wann Photoshop Express besser passt</h2>
      <ul>
        <li>Schnelle Korrekturen und Looks auf dem Handy, direkt nach dem Fotografieren.</li>
        <li>Intelligente Ein-Tipp-Korrekturen und automatisches Maskieren.</li>
        <li>Fotos direkt aus Google Fotos, Dropbox oder Facebook holen.</li>
      </ul>
      <p>
        Willst du über schnelle Korrekturen hinaus? Vergleiche Picstea mit dem{" "}
        <Link href="/photoshop-alternative">vollen Photoshop</Link> oder starte mit der{" "}
        <Link href="/docs/getting-started">Einstiegsanleitung</Link> (auf Englisch).
      </p>
    </>
  ),
};

export default copy;
