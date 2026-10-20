import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Kostenlose Photoshop-Alternative im Browser",
  description:
    "Picstea ist eine kostenlose Photoshop-Alternative im Browser: Ebenen, Masken, Einstellungsebenen und PSD – ohne Installation, ohne Konto, ohne Upload.",
  lead: "Picstea bringt dir das Wichtigste eines Photoshop-Workflows – Ebenen, Masken, Einstellungsebenen, Auswahlen, Retusche und PSD-Dateien – in einen Browser-Tab. Nichts zu installieren, keine Anmeldung, und deine Bilder bleiben auf deinem Gerät.",
  faqs: [
    {
      q: "Ersetzt Picstea Photoshop?",
      a: "Für alltägliche Bildbearbeitung, Retusche und Design mit Ebenen oft ja. Für Druckvorstufe in CMYK, 16/32-Bit-Bilder, KI-Generierung oder anspruchsvolles 3D und Video ist Photoshop weiterhin das richtige Werkzeug.",
    },
    {
      q: "Funktionieren meine Photoshop-Gewohnheiten?",
      a: "Größtenteils. Werkzeuge, Bedienfelder und Tastaturbefehle folgen denselben Konventionen: V Verschieben, M Auswahlrechteck, L Lasso, B Pinsel, J Reparatur, Strg/Cmd+J Duplizieren, Strg/Cmd+E Auf eine Ebene reduzieren, X und D für Farben, Umschalt plus Werkzeugtaste, um innerhalb einer Gruppe zu wechseln.",
    },
    {
      q: "Kann ich meine PSD-Dateien öffnen?",
      a: "Ja, 8-Bit-RGB- und Graustufen-PSDs mit Ebenen, Gruppen, Masken, bearbeitbarem Text, Einstellungsebenen, Formen, Smartobjekten und gängigen Ebenenstilen. Du kannst auch wieder PSDs mit Ebenen speichern.",
    },
    {
      q: "Kostet es etwas?",
      a: "Nein. Picstea ist kostenlos, braucht kein Konto und setzt kein Wasserzeichen. Finanziert wird es durch Werbung auf der Website und im Blog sowie durch gekennzeichnete Sponsorings neben der Arbeitsfläche – niemals über deiner Arbeit.",
    },
  ],
  body: () => (
    <>
      <h2>Was dir vertraut vorkommt</h2>
      <ul>
        <li>
          Menüleiste, Werkzeugleiste mit gruppierten Werkzeugen, Optionsleiste sowie die
          Bedienfelder Eigenschaften, Protokoll und Ebenen.
        </li>
        <li>
          Pixel-, Form-, Text-, Füll- und Einstellungsebenen; Gruppen, 16 Füllmethoden,
          Ebenenmasken, Vektormasken und Schnittmasken.
        </li>
        <li>
          Der komplette Ebenenstil-Dialog: alle zehn Effekte mit Konturen, mehrere Kopien eines
          Effekts und gespeicherte Stile.
        </li>
        <li>
          Auswahlen mit Auswahlrechteck, Lasso, Zauberstab und Farbbereich; Reparatur,
          Kopierstempel, Abwedler und Nachbelichter.
        </li>
        <li>
          Zeichenstift und Pfade, Smartobjekte mit Smartfiltern, Aktionen und Stapelverarbeitung.
        </li>
      </ul>
      <h2>Die Unterschiede</h2>
      <table>
        <thead>
          <tr>
            <th scope="col"></th>
            <th scope="col">Picstea</th>
            <th scope="col">Adobe Photoshop</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Wo es läuft</th>
            <td>In jedem aktuellen Browser</td>
            <td>Desktop-App (installiert)</td>
          </tr>
          <tr>
            <th scope="row">Preis</th>
            <td>Kostenlos, ohne Konto</td>
            <td>Kostenpflichtiges Abo</td>
          </tr>
          <tr>
            <th scope="row">Deine Bilder</th>
            <td>Bleiben auf deinem Gerät</td>
            <td>Auf deinem Computer; Cloud-Dokumente optional</td>
          </tr>
          <tr>
            <th scope="row">Dateien</th>
            <td>
              Öffnen: PSD (8 Bit), PNG, JPEG, WebP, GIF, SVG; Export: PSD, PNG, JPEG, WebP, SVG, PDF
            </td>
            <td>Viele weitere Formate, auch CMYK und 16/32 Bit</td>
          </tr>
          <tr>
            <th scope="row">Umfang</th>
            <td>Grundlegende Bearbeitung und Retusche</td>
            <td>Deutlich mehr Funktionen, inklusive KI-Werkzeugen</td>
          </tr>
        </tbody>
      </table>
      <h2>Wann du besser bei Photoshop bleibst</h2>
      <p>
        Wenn du Dateien für den kommerziellen Druck in CMYK vorbereitest, täglich mit 16- oder
        32-Bit-Bildern oder RAW-Dateien arbeitest oder auf generative KI-Funktionen angewiesen bist,
        ist Photoshop weiterhin das bessere Werkzeug. Picstea ist ehrlich, was seine Grenzen angeht:
        Sieh dir an, was es <Link href="/docs/file-formats">öffnen und exportieren</Link> kann (auf
        Englisch), und lies die <Link href="/faq">häufig gestellten Fragen</Link>.
      </p>
    </>
  ),
};

export default copy;
