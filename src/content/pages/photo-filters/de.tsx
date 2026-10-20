import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Kostenlose Fotofilter und Effekte online",
  description:
    "Über 60 Fotofilter im Browser mit Live-Vorschau: Weichzeichnen, Scharfzeichnen, Rauschen, Ölfarbe, Raster, Camera Raw, Verflüssigen. Kostenlos, ohne Upload.",
  lead: "Picstea hat mehr als 60 Fotofilter, angeordnet wie im Filter-Menü von Photoshop, jeweils mit Live-Vorschau auf deinem Foto: Weichzeichner, Scharfzeichner, Rauschreduzierung, Verzerrungen, künstlerische Effekte, Camera Raw und Verflüssigen. Sie sind kostenlos und laufen in deinem Browser, deine Fotos werden also nie hochgeladen.",
  faqs: [
    {
      q: "Kann ich einen Filter nach dem Anwenden noch ändern?",
      a: "Ja, wenn du ihn als Smartfilter anwendest: Wandle die Ebene mit Ebene → Smartobjekt → In Smartobjekt konvertieren um und wende dann den Filter an. Du kannst ihn jederzeit ändern oder entfernen.",
    },
    {
      q: "Kann ich einen Filter nur auf einen Teil des Fotos anwenden?",
      a: "Ja. Wähle zuerst einen Bereich aus; nur die Auswahl wird verändert, und weiche Kanten gehen sanft über.",
    },
    {
      q: "Sind das dieselben Filter wie in Photoshop?",
      a: "Das Filter-Menü orientiert sich an Photoshop und Photopea, die Filter sind also dort, wo du sie erwartest. Es sind Picsteas eigene Umsetzungen, daher können die Ergebnisse leicht abweichen.",
    },
    {
      q: "Gibt es Ein-Klick-Presets im Instagram-Stil?",
      a: "Nicht als Preset-Liste. Für einen schnellen Look nutze Camera Raw, die Einstellungsebenen Fotofilter oder Verlaufsumsetzung oder die künstlerischen Effekte in der Filtergalerie.",
    },
    {
      q: "Werden meine Fotos hochgeladen?",
      a: "Nein. Jeder Filter läuft in deinem Browser. Picstea hat keinen Server, der Bilder empfängt.",
    },
  ],
  body: () => (
    <>
      <h2>Einen Filter in vier Schritten anwenden</h2>
      <ol>
        <li>Öffne den Editor und zieh dein Foto auf die Seite.</li>
        <li>
          Optional: Klick mit der rechten Maustaste auf die Ebene und wandle sie in ein Smartobjekt
          um, damit der Filter bearbeitbar bleibt.
        </li>
        <li>
          Wähle einen Filter aus dem Menü Filter und passe ihn an, während du die Arbeitsfläche
          beobachtest.
        </li>
        <li>Klick auf OK und dann auf Datei → Exportieren als…, um das Ergebnis zu speichern.</li>
      </ol>
      <h2>Beliebte Filter</h2>
      <ul>
        <li>
          <strong>Camera Raw</strong> – Weißabgleich, Belichtung, Kontrast, Lichter, Tiefen,
          Klarheit, Dunst entfernen, Dynamik und Sättigung in einem Dialog.
        </li>
        <li>
          <strong>Weichzeichnen</strong> – Gaußscher Weichzeichner, Bewegungsunschärfe, Radialer
          Weichzeichner, Tiefenschärfe abmildern (Bokeh) und Matter machen, dazu Tilt-Shift,
          Iris-Weichzeichnung und Feld-Weichzeichnung aus der Weichzeichnergalerie für eine geringe
          Schärfentiefe.
        </li>
        <li>
          <strong>Scharfzeichnen</strong> – Unscharf maskieren und Selektiver Scharfzeichner für
          knackige Details.
        </li>
        <li>
          <strong>Rauschen</strong> – Rauschen reduzieren sowie Staub und Kratzer für Nachtaufnahmen
          und alte Scans, oder Rauschen hinzufügen für Filmkorn.
        </li>
        <li>
          <strong>Filtergalerie</strong> – künstlerische Looks wie Aquarell, Grobe Malerei,
          Farbpapier-Collage, Tontrennung &amp; Kantenbetonung und Körnung.
        </li>
        <li>
          <strong>Stilisierungs- und Vergröberungsfilter</strong> – Ölfarbe, Relief, Konturen
          finden, Farbraster, Mosaik und Kristallisieren.
        </li>
        <li>
          <strong>Verzerren</strong> – Strudel, Wölben, Kräuseln, Schwingungen und Polarkoordinaten.
        </li>
        <li>
          <strong>Verflüssigen</strong> – Pixel mit einem Pinsel schieben, drehen, zusammenziehen
          und aufblasen.
        </li>
        <li>
          <strong>Objektivkorrektur</strong> – Tonnenverzeichnung, Farbsäume und Vignettierung
          korrigieren.
        </li>
      </ul>
      <p>
        Die <Link href="/docs/filters">Filter-Anleitung</Link> (auf Englisch) listet jeden Filter im
        Menü auf.
      </p>
      <h2>Farblooks mit Einstellungsebenen</h2>
      <p>
        Für Color Grading statt Effekten nutze Einstellungsebenen: Fotofilter für warme oder kühle
        Töne, Verlaufsumsetzung für Duplex-Looks, Schwarzweiß, Farbton/Sättigung und
        Gradationskurven. Sie liegen auf einer eigenen Ebene, das Foto darunter ändert sich also
        nie.
      </p>
      <h2>Einschränkungen</h2>
      <p>
        Filter funktionieren auf Pixelebenen und Smartobjekten. Bilder können bis zu 12.000 Pixel
        pro Seite (36 Megapixel) groß sein, und es gibt keine KI-Filter wie Himmelsaustausch oder
        Stilübertragung.
      </p>
    </>
  ),
};

export default copy;
