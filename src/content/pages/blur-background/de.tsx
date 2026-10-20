import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Fotohintergrund online unscharf machen",
  description:
    "Hintergrund im Browser unscharf machen: Motiv auswählen, Tiefenschärfe abmildern anwenden oder Tilt-Shift und Iris nutzen. Kostenlos, ohne Upload.",
  lead: "Um in Picstea den Hintergrund eines Fotos unscharf zu machen, wähle das Motiv aus, nimm Auswahl → Auswahl umkehren, damit der Hintergrund ausgewählt ist, und wende dann Filter → Weichzeichnen → Tiefenschärfe abmildern an. Das läuft in deinem Browser, ist kostenlos, und dein Foto wird nie hochgeladen.",
  faqs: [
    {
      q: "Kann Picstea die Person automatisch auswählen?",
      a: "Noch nicht – es gibt keine KI-Motivauswahl. Wähle das Motiv von Hand mit dem Lasso, Polygon-Lasso oder Zauberstab aus; Farbbereich hilft, wenn der Hintergrund einfarbig ist.",
    },
    {
      q: "Welche Unschärfe wirkt am ehesten wie eine echte Kamera?",
      a: "Tiefenschärfe abmildern: Es ahmt ein unscharf gestelltes Objektiv nach und kann helle Stellen wie Bokeh leuchten lassen. Gaußscher Weichzeichner ist glatter und gleichmäßiger.",
    },
    {
      q: "Kann ich die Unschärfe später ändern?",
      a: "Ja, wenn du eine Kopie weichzeichnest: Drück zuerst Cmd/Ctrl+J, um die Ebene zu duplizieren, zeichne die Kopie weich und blende sie aus oder lösche sie, um zurückzugehen. Jeder Filter ist außerdem ein Rückgängig-Schritt.",
    },
    {
      q: "Wird mein Foto hochgeladen?",
      a: "Nein. Die Unschärfe wird in deinem Browser berechnet. Picstea hat keinen Server, der Bilder empfängt.",
    },
  ],
  body: () => (
    <>
      <h2>Den Hintergrund in fünf Schritten unscharf machen</h2>
      <ol>
        <li>Öffne den Editor und zieh dein Foto auf die Seite.</li>
        <li>
          Wähle das Motiv aus: Umfahre es mit dem Lasso oder Polygon-Lasso, oder klick mit dem
          Zauberstab in den Hintergrund und tausche mit Auswahl → Auswahl umkehren.
        </li>
        <li>
          Wähle Auswahl → Weiche Kante… mit ein paar Pixeln, damit der Übergang zwischen scharf und
          unscharf weich ist.
        </li>
        <li>
          Wähle bei ausgewähltem Hintergrund Filter → Weichzeichnen → Tiefenschärfe abmildern… und
          erhöhe den Radius, während du das Foto beobachtest. Mit der Glanzlicht-Helligkeit leuchten
          helle Stellen wie Bokeh.
        </li>
        <li>Drück OK, heb die Auswahl auf und exportiere mit Datei → Exportieren als….</li>
      </ol>
      <h2>Ohne Auswahl: Weichzeichnergalerie</h2>
      <p>
        Für einen schnellen Tiefenschärfe-Look hält Filter → Weichzeichnergalerie einen Teil des
        Fotos scharf, ohne dass du etwas auswählen musst:
      </p>
      <ul>
        <li>
          <strong>Tilt-Shift</strong> hält einen waagerechten Streifen scharf und zeichnet darüber
          und darunter weich – der &quot;Miniatur&quot;-Look für Landschaften und Straßen.
        </li>
        <li>
          <strong>Iris-Weichzeichnung</strong> hält ein Oval rund um das Motiv scharf und zeichnet
          den Rest weich – gut für Porträts.
        </li>
        <li>
          <strong>Feld-Weichzeichnung</strong> zeichnet das ganze Bild gleichmäßig weich.
        </li>
      </ul>
      <p>
        Wo Photoshop Pins auf der Arbeitsfläche nutzt, stellt Picstea Mittelpunkt und Größe mit
        Reglern ein.
      </p>
      <h2>Tipps</h2>
      <ul>
        <li>
          Haare und unscharfe Kanten sind der schwierigste Teil. Gib etwas mehr weiche Kante und
          zoome hinein, um den Rand zu prüfen, bevor du weichzeichnest.
        </li>
        <li>
          Um das Original zu behalten, dupliziere die Ebene (Cmd/Ctrl+J) und zeichne die Kopie
          weich.
        </li>
        <li>
          Mehr zum Auswählen: <Link href="/docs/selections">Leitfaden zu Auswahlen</Link> (auf
          Englisch). Alle Weichzeichner findest du im{" "}
          <Link href="/docs/filters">Filter-Leitfaden</Link> (auf Englisch).
        </li>
      </ul>
      <h2>Einschränkungen</h2>
      <p>
        Es gibt noch keine automatische Motiv- oder Porträtmodus-Erkennung und keine Tiefenkarte:
        Die Unschärfe ist überall, wo sie wirkt, gleich stark, statt mit der Entfernung zuzunehmen.
      </p>
    </>
  ),
};

export default copy;
